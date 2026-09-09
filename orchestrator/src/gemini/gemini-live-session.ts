import {
  FunctionDeclaration,
  GoogleGenAI,
  Modality,
  Type,
  type LiveServerMessage,
  type Session,
} from '@google/genai';

import {
  buildCatalogPromptLines,
  buildProductDetailLines,
  lookupCatalog,
  productPath,
} from '../catalog.js';
import { lookupInventory } from '../inventory.js';
import type { ProductContext } from '../types.js';

const DEFAULT_MODEL = 'gemini-3.1-flash-live-preview';
const INPUT_SAMPLE_RATE = 16_000;
const OUTPUT_SAMPLE_RATE = 24_000;

const CART_CONFIRM_RE =
  /\b(iya|ya|yup|ok|oke|boleh|sip|gas|gaskeun|masukin|keranjang|beli|deal|setuju|lanjut|checkout|ambil|taruh|simpan)\b/i;

const CART_ADJUST_RE =
  /\b(hapus|kurangi|kurangin|buang|batal|cancel|satu aja|cuma satu|kok ada dua|jangan dua|berlebihan|over|remove|delete|update|ganti jadi)\b/i;

const addToCartTool: FunctionDeclaration = {
  name: 'add_to_cart',
  description:
    'Menambahkan produk ke keranjang. WAJIB: (1) pelanggan sudah sebut ukuran, (2) kamu sudah tanya konfirmasi verbal, (3) pelanggan jawab iya/boleh/oke/masukin. Jangan panggil jika pelanggan cuma sebut ukuran tanpa setuju beli.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      productId: { type: Type.STRING, description: 'ID produk butik' },
      size: { type: Type.STRING, description: 'Ukuran pakaian, misal S/M/L/XL' },
      quantity: { type: Type.NUMBER, description: 'Jumlah item' },
    },
    required: ['productId', 'size'],
  },
};

const setCartQuantityTool: FunctionDeclaration = {
  name: 'set_cart_quantity',
  description:
    'Mengatur jumlah exact item di keranjang (misal jadi 1 saja). Pakai saat pelanggan minta kurangi, "satu aja", "kok ada dua", atau perbaiki duplikat. Jangan dipakai untuk menambah item baru — pakai add_to_cart.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      productId: { type: Type.STRING, description: 'ID produk butik' },
      size: { type: Type.STRING, description: 'Ukuran item di keranjang' },
      quantity: { type: Type.NUMBER, description: 'Jumlah final yang diinginkan (0 = hapus)' },
    },
    required: ['productId', 'size', 'quantity'],
  },
};

const removeFromCartTool: FunctionDeclaration = {
  name: 'remove_from_cart',
  description:
    'Menghapus produk sepenuhnya dari keranjang. Pakai saat pelanggan minta hapus/buang/batal item tersebut.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      productId: { type: Type.STRING, description: 'ID produk butik' },
      size: { type: Type.STRING, description: 'Ukuran item di keranjang' },
    },
    required: ['productId', 'size'],
  },
};

const navigateToProductTool: FunctionDeclaration = {
  name: 'navigate_to_product',
  description:
    'Menampilkan gambar produk di layar pelanggan dengan mengalihkan fokus UI ke produk tersebut. WAJIB dipanggil jika pelanggan minta lihat gambar, tunjukkan produk, pindah ke item lain, atau sebut nama produk yang ingin dilihat.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      productId: {
        type: Type.STRING,
        description: 'ID produk dari katalog (contoh: "6" untuk hoodie/graphic tee)',
      },
      productName: {
        type: Type.STRING,
        description: 'Nama produk untuk konfirmasi verbal ke pelanggan',
      },
      view: {
        type: Type.STRING,
        description: 'catalog = scroll ke kartu di etalase, detail = buka halaman detail produk',
      },
    },
    required: ['productId'],
  },
};

export interface GeminiLiveCallbacks {
  onAudioChunk: (base64Pcm16: string, sampleRate?: number) => void;
  onSystemAction: (action: string, payload: Record<string, unknown>) => void;
  onInterrupted: () => void;
  onTranscript?: (role: 'user' | 'model', text: string, final?: boolean) => void;
  onError?: (error: Error) => void;
}

function mergeTranscriptChunk(current: string, chunk: string): string {
  const next = chunk.trim();

  if (!next) {
    return current;
  }

  if (!current) {
    return next;
  }

  if (next === current) {
    return current;
  }

  if (next.startsWith(current)) {
    return next;
  }

  if (current.startsWith(next)) {
    return current;
  }

  const needsSpace =
    !/[\s\-—]$/.test(current) && !/^[\s.,!?;:'"]/.test(next);

  return `${current}${needsSpace ? ' ' : ''}${next}`;
}

function spokenProductLabel(context: ProductContext): string {
  const catalogItem = lookupCatalog(context.productId);

  if (catalogItem?.spokenName) {
    return catalogItem.spokenName;
  }

  return context.productName ?? catalogItem?.name ?? lookupInventory(context.productId).name;
}

function userConfirmedPurchase(text: string): boolean {
  return CART_CONFIRM_RE.test(text.trim());
}

function userRequestedCartAdjust(text: string): boolean {
  return CART_ADJUST_RE.test(text.trim());
}

function buildFewShotExamples(): string[] {
  return [
    '**Contoh dialog konsultatif (ikuti nada ini):**',
    'Pelanggan klik kaos tape → "Halo kak, lagi lihat kaos tape ya? Bahan katun combed-nya adem — mau tanya ukuran atau warna?"',
    'Pelanggan: "XL ada?" → "Ada kak, M L XL ready. Katun combed, jahitan rapi, cocok daily."',
    'Pelanggan: "Ada warna apa?" → "Off-white dengan detail tape di bahu — satu varian aja kak."',
    'Pelanggan: "Bahannya panas gak?" → "Enggak kak, katun combed breathable, adem dipakai siang hari."',
    'Pelanggan: "Oke ambil XL deh" → "Siap, mau saya simpanin di keranjang size XL?" → pelanggan: "Iya" → [add_to_cart]',
    'Pelanggan: "Kok ada dua?" / "Satu aja" → [set_cart_quantity quantity=1] → "Oke kak, sudah saya jadiin satu aja di keranjang."',
    'Pelanggan: "Hapus aja deh" → [remove_from_cart] → "Siap, sudah saya keluarin dari keranjang."',
    'Pelanggan: "Tunjukin kemeja flanel" → [navigate_to_product, diam]',
    '',
    '**SALAH (jangan):**',
    '- Ulang "welcome di Butik DEVI" di setiap jawaban',
    '- Setiap giliran tanya "masukin keranjang?" / "mau diproses?" / "langsung masukin?"',
    '- Jawab pertanyaan bahan/warna tapi diakhiri push beli',
    '- Sebut "butik mimin" — pakai "Butik DEVI"',
  ];
}

function buildUiInterfacePrompt(context: ProductContext): string {
  const page = context.pageLabel ?? 'Halaman toko online';
  const path = context.pagePath ?? '/';

  return [
    '**PETA INTERFACE BUTIK DEVI (baca & pahami layar pelanggan)**',
    'Nama toko resmi: **Butik DEVI** (logo "DEVI" di navbar). JANGAN sebut "butik mimin", "Shop.co", atau nama lain.',
    '',
    '**Elemen global (semua halaman):**',
    '- Navbar: logo DEVI | menu Toko, Diskon, Koleksi Baru, Brand | cari produk | ikon keranjang | akun',
    '- Banner atas: promo daftar diskon 20%',
    '- Tombol **Mulai suara** di foto produk = pelanggan bicara langsung dengan kamu (Rina)',
    '- **Glow biru** di foto = produk sedang difokuskan/ditampilkan setelah navigate',
    '- Harga selalu format **Rupiah** (contoh: Rp 145.000)',
    '',
    '**Beranda (/):** hero "Temukan gaya yang pas untuk kamu", Koleksi Terbaru, Terlaris, gaya busana (Kasual/Formal/Pesta/Olahraga), ulasan pelanggan',
    '**Toko (/shop):** katalog grid, filter ukuran/warna/harga/gaya, urutkan harga',
    '**Detail produk (/shop/product/...):** foto besar, rating, harga Rp, Pilih Ukuran, Pilih Warna, Tambah ke Keranjang, tab Detail/Ulasan/FAQ',
    '**Keranjang (/cart):** daftar item, Ringkasan Pesanan, subtotal, diskon, ongkir gratis, Lanjut Checkout',
    '',
    '**Halaman aktif pelanggan sekarang:**',
    `- ${page} (${path})`,
    context.storeName ? `- Toko: ${context.storeName}` : '- Toko: Butik DEVI',
  ].join('\n');
}

function buildOpeningPrompt(context: ProductContext): string {
  const stock = lookupInventory(context.productId);
  const label = spokenProductLabel(context);

  return [
    `[Pembukaan sesi] Pelanggan menekan Start Voice di gambar "${label}" — mereka sudah tertarik produk ini.`,
    'Sapa sebagai Rina dari Butik DEVI: hangat, informatif, TEPAT 1-2 kalimat pendek. Sekali saja sebut Butik DEVI — jangan diulang tiap turn.',
    `Contoh: "Halo kak, lagi lihat ${label} ya? Kalau mau tanya bahan, ukuran, atau warna, tanya aja." — JANGAN langsung push keranjang di sapaan.`,
    stock.stock > 0
      ? `[Info internal saja, jangan dibaca ke pelanggan] Stok ${stock.stock}, ukuran ${stock.sizes.join(', ')}.`
      : 'Stok habis — bilang jujur singkat, tawarkan alternatif serupa jika cocok.',
  ].join(' ');
}

function buildSystemInstruction(context: ProductContext): string {
  const stock = lookupInventory(context.productId);
  const label = spokenProductLabel(context);

  return [
    '**PERSONA**',
    'Kamu Rina, pemilik **Butik DEVI** — butik fashion di Jakarta. Kamu langsung melayani pelanggan di etalase — bukan chatbot, bukan CS call center.',
    'Karakter: konsultatif seperti penjaga butik yang jago bahan & fit — bukan sales agresif. Sapaan: "kak".',
    'NAMA TOKO: selalu **Butik DEVI** atau **DEVI**. JANGAN PERNAH sebut toko sebagai "butik mimin", "toko mimin", atau "Shop.co".',
    'Untuk diri sendiri pakai "saya" (boleh gaya "mimin" hanya sebagai kata ganti diri, BUKAN nama toko). JANGAN pakai "gue".',
    '',
    '**BAHASA**',
    'RESPOND UNMISTAKABLY IN INDONESIAN. Kamu WAJIB menjawab dalam Bahasa Indonesia sehari-hari.',
    'TEPAT maksimal 2 kalimat pendek per giliran. Stop setelah 2 kalimat — jangan monolog panjang.',
    'Jangan formal: hindari "Silakan", "Apakah ada yang bisa saya bantu". Pakai: "Oke kak", "Boleh", "Siap".',
    'Sebut produk pakai nama natural (spokenName di katalog), jangan baca judul Inggris. Sebut harga dalam Rupiah (Rp).',
    'Kamu paham layout website Butik DEVI — jawab pertanyaan tentang menu, keranjang, filter, ukuran di layar, dll.',
    '',
    '**GAYA KONSULTASI (WAJIB — bukan hard sell)**',
    'Prioritas #1: jawab pertanyaan pelanggan dengan info berguna — bahan, warna, ukuran, harga, fit, perawatan, cocok untuk apa.',
    'Bantu pelanggan YAKIN sebelum beli. Sebut detail bahan secara natural ("katun combed adem", "denim stretch nyaman gerak").',
    'JANGAN push keranjang di setiap giliran. DILARANG mengulang: "masukin keranjang?", "mau diproses?", "langsung masukin?", "gimana mau saya masukin?".',
    'Tawarkan simpan ke keranjang MAKSIMAL sekali per sesi — HANYA setelah pelanggan sendiri bilang mau beli/ambil/order/deal.',
    'Kalau pelanggan masih eksplorasi (tanya ukuran, warna, bahan), cukup jawab info — tanpa CTA beli.',
    'Pelanggan bisa minta KURANGI/HAPUS dari keranjang — gunakan set_cart_quantity atau remove_from_cart, lalu konfirmasi singkat.',
    'Kalau pelanggan bilang "kok ada dua" / "satu aja": panggil set_cart_quantity quantity=1 — jangan add_to_cart lagi.',
    'Abaikan transkrip noise (bahasa asing/Hindi/Spanish gibberish) — fokus intent Indonesia. Jika tidak jelas, minta ulang singkat.',
    'JANGAN ulang seluruh riwayat chat di setiap jawaban — hanya respons untuk pertanyaan terakhir.',
    '',
    '**ATURAN SUARA**',
    'JANGAN ulang sapaan pembuka atau kumulatif menambah kalimat lama — setiap respons fresh, hanya jawab yang ditanya sekarang.',
    'Pelanggan klik Start Voice = sudah tertarik produk itu. Jangan tanya "lagi cari apa".',
    'Setelah navigate_to_product: layar otomatis tampilkan gambar — JANGAN ucapkan navigasi. Diam atau jawab singkat hanya jika ditanya.',
    'Sebut ukuran/warna/harga hanya jika relevan dengan pertanyaan pelanggan.',
    '',
    '**ALUR PERCAKAPAN**',
    '1. Sapa singkat → akui produk → undang tanya (bahan/ukuran/warna) — bukan push beli.',
    '2. Loop konsultasi: jawab info produk, pairing 1x jika natural, navigate jika minta lihat produk lain.',
    '3. Beli: hanya jika pelanggan eksplisit mau ambil/beli → konfirmasi sekali ("Mau saya simpanin di keranjang?") → tunggu iya/boleh → add_to_cart.',
    '',
    ...buildFewShotExamples(),
    '',
    '**GUARDRAILS**',
    'Jika pelanggan minta ukuran yang tidak ada di produk aktif, cek katalog — navigate ke produk lain yang punya ukuran itu (view=catalog). Jangan asal navigate.',
    'Jangan navigate ke produk acak. Tidak ada rok di toko.',
    'Jangan panggil add_to_cart sebelum pelanggan konfirmasi eksplisit (iya/boleh/oke/masukin/beli).',
    'Jangan bilang tidak bisa menampilkan gambar — selalu pakai navigate_to_product.',
    '',
    buildUiInterfacePrompt(context),
    '',
    '**KONTEKS PRODUK AKTIF**',
    `- productId: ${context.productId ?? 'unknown'}`,
    `- nama natural: ${label}`,
    `- stok: ${stock.stock}`,
    `- ukuran tersedia: ${stock.sizes.join(', ')}`,
    stock.price ? `- harga: Rp ${stock.price.toLocaleString('id-ID')}` : '',
    ...buildProductDetailLines(context.productId),
    '',
    '**TOOLS (internal — jangan sebut ke pelanggan)**',
    'navigate_to_product: minta lihat/tunjukkan produk lain. view=catalog (default), view=detail jika minta halaman detail.',
    'Mapping: celana pendek=7, celana panjang/jeans=2|8, kemeja=3|5, kaos/hoodie=6.',
    'add_to_cart: hanya setelah ukuran jelas + konfirmasi verbal pelanggan.',
    'set_cart_quantity: atur jumlah exact (perbaiki duplikat, "satu aja", kurangi). quantity=0 hapus item.',
    'remove_from_cart: hapus item sepenuhnya dari keranjang.',
    '',
    '**Katalog:**',
    ...buildCatalogPromptLines(),
  ].join('\n');
}

export class GeminiLiveSession {
  private session: Session | null = null;
  private forwardAudio = true;
  private userTranscript = '';
  private modelTranscript = '';
  private lastSentTranscript = { user: '', model: '' };
  private lastNavigate = { productId: '', at: 0 };
  private pendingContext: ProductContext | null = null;
  private lastFinalUserText = '';
  private committedUserTranscript = '';
  private committedModelTranscript = '';
  private readonly apiKey: string;
  private readonly model: string;
  private readonly voice: string;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY ?? '';
    this.model = process.env.GEMINI_MODEL ?? DEFAULT_MODEL;
    this.voice = process.env.GEMINI_VOICE ?? 'Aoede';
  }

  get isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async connect(context: ProductContext, callbacks: GeminiLiveCallbacks): Promise<void> {
    if (!this.isConfigured) {
      throw new Error('GEMINI_API_KEY is missing');
    }

    const ai = new GoogleGenAI({ apiKey: this.apiKey });

    this.session = await ai.live.connect({
      model: this.model,
      config: {
        responseModalities: [Modality.AUDIO],
        systemInstruction: buildSystemInstruction(context),
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: this.voice },
          },
        },
        tools: [
          {
            functionDeclarations: [
              addToCartTool,
              setCartQuantityTool,
              removeFromCartTool,
              navigateToProductTool,
            ],
          },
        ],
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      },
      callbacks: {
        onmessage: (message) => this.handleMessage(message, callbacks),
        onerror: (event) => {
          callbacks.onError?.(new Error(event.message ?? 'Gemini Live error'));
        },
      },
    });

    this.forwardAudio = true;
    this.userTranscript = '';
    this.modelTranscript = '';
    this.lastSentTranscript = { user: '', model: '' };
    this.lastFinalUserText = '';

    this.session.sendClientContent({
      turns: [
        {
          role: 'user',
          parts: [
            {
              text: buildOpeningPrompt(context),
            },
          ],
        },
      ],
      turnComplete: true,
    });
  }

  sendPcm16(base64Pcm: string): void {
    if (!this.session) {
      return;
    }

    this.forwardAudio = true;

    this.session.sendRealtimeInput({
      audio: {
        data: base64Pcm,
        mimeType: `audio/pcm;rate=${INPUT_SAMPLE_RATE}`,
      },
    });
  }

  sendText(text: string): void {
    if (!this.session || !text.trim()) {
      return;
    }

    this.forwardAudio = true;

    this.session.sendRealtimeInput({
      text: text.trim(),
    });
  }

  interrupt(): void {
    this.forwardAudio = false;
  }

  updateProductContext(context: ProductContext): void {
    if (!this.session) {
      return;
    }

    this.pendingContext = context;
  }

  private flushPendingContext(): void {
    if (!this.session || !this.pendingContext) {
      return;
    }

    const context = this.pendingContext;
    this.pendingContext = null;

    const inv = lookupInventory(context.productId);
    const page = context.pageLabel ?? 'halaman toko';
    const prompt = `[Navigasi UI Butik DEVI] Pelanggan sekarang di ${page}, melihat produk "${context.productName ?? inv.name}" (ID: ${context.productId ?? 'unknown'}${inv.price ? `, ${inv.price.toLocaleString('id-ID')} rupiah` : ''}). Gambar sudah tampil — glow biru aktif. Jangan ucapkan pengakuan navigasi. Tunggu pertanyaan pelanggan.`;

    this.session.sendClientContent({
      turns: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      turnComplete: false,
    });
  }

  close(): void {
    this.session?.close();
    this.session = null;
    this.userTranscript = '';
    this.modelTranscript = '';
    this.lastSentTranscript = { user: '', model: '' };
    this.committedUserTranscript = '';
    this.committedModelTranscript = '';
  }

  private turnTranscript(role: 'user' | 'model', buffer: string): string {
    const committed =
      role === 'user' ? this.committedUserTranscript : this.committedModelTranscript;

    if (committed && buffer.startsWith(committed)) {
      return buffer.slice(committed.length).trimStart();
    }

    return buffer.trim();
  }

  private emitTranscript(
    role: 'user' | 'model',
    chunk: string,
    finished: boolean,
    callbacks: GeminiLiveCallbacks,
  ): void {
    const bufferKey = role;
    const buffer =
      role === 'user'
        ? mergeTranscriptChunk(this.userTranscript, chunk)
        : mergeTranscriptChunk(this.modelTranscript, chunk);

    if (role === 'user') {
      this.userTranscript = buffer;
    } else {
      this.modelTranscript = buffer;
    }

    const turnText = this.turnTranscript(role, buffer);

    if (!turnText) {
      if (finished) {
        if (role === 'user') {
          this.committedUserTranscript = buffer;
          this.userTranscript = '';
        } else {
          this.committedModelTranscript = buffer;
          this.modelTranscript = '';
        }
        this.lastSentTranscript[bufferKey] = '';
      }
      return;
    }

    const alreadySent = this.lastSentTranscript[bufferKey] === turnText;

    if (alreadySent && !finished) {
      return;
    }

    callbacks.onTranscript?.(role, turnText, finished);
    this.lastSentTranscript[bufferKey] = turnText;

    if (finished) {
      if (role === 'user') {
        this.lastFinalUserText = turnText;
        this.committedUserTranscript = buffer;
        this.userTranscript = '';
      } else {
        this.committedModelTranscript = buffer;
        this.modelTranscript = '';
      }

      this.lastSentTranscript[bufferKey] = '';
    }
  }

  private finalizeTranscripts(callbacks: GeminiLiveCallbacks): void {
    if (this.userTranscript) {
      const turnText = this.turnTranscript('user', this.userTranscript);
      if (turnText && this.lastSentTranscript.user !== turnText) {
        this.lastFinalUserText = turnText;
        callbacks.onTranscript?.('user', turnText, true);
        this.committedUserTranscript = this.userTranscript;
      }
      this.userTranscript = '';
      this.lastSentTranscript.user = '';
    }

    if (this.modelTranscript) {
      const turnText = this.turnTranscript('model', this.modelTranscript);
      if (turnText && this.lastSentTranscript.model !== turnText) {
        callbacks.onTranscript?.('model', turnText, true);
        this.committedModelTranscript = this.modelTranscript;
      }
      this.modelTranscript = '';
      this.lastSentTranscript.model = '';
    }
  }

  private handleMessage(message: LiveServerMessage, callbacks: GeminiLiveCallbacks): void {
    const content = message.serverContent;

    if (content?.interrupted) {
      this.forwardAudio = false;
      this.finalizeTranscripts(callbacks);
      callbacks.onInterrupted();
      this.userTranscript = '';
      this.modelTranscript = '';
      this.lastSentTranscript = { user: '', model: '' };
    }

    if (content?.inputTranscription?.text) {
      this.emitTranscript(
        'user',
        content.inputTranscription.text,
        content.inputTranscription.finished ?? false,
        callbacks,
      );
    }

    if (content?.outputTranscription?.text) {
      this.emitTranscript(
        'model',
        content.outputTranscription.text,
        content.outputTranscription.finished ?? false,
        callbacks,
      );
    }

    if (content?.turnComplete) {
      this.finalizeTranscripts(callbacks);
      this.flushPendingContext();
    }

    const parts = content?.modelTurn?.parts ?? [];

    for (const part of parts) {
      const inlineData = part.inlineData;

      if (inlineData?.data && this.forwardAudio) {
        callbacks.onAudioChunk(inlineData.data, OUTPUT_SAMPLE_RATE);
      }
    }

    const functionCalls = message.toolCall?.functionCalls ?? [];

    if (functionCalls.length === 0 || !this.session) {
      return;
    }

    if (this.modelTranscript) {
      callbacks.onTranscript?.('model', this.modelTranscript, true);
      this.modelTranscript = '';
      this.lastSentTranscript.model = '';
    }

    const functionResponses = functionCalls.map((call) => {
      const args = (call.args ?? {}) as Record<string, unknown>;

      if (call.name === 'add_to_cart') {
        const productId = String(args.productId ?? '');
        const size = String(args.size ?? 'M');
        const quantity = Number(args.quantity ?? 1);

        if (!userConfirmedPurchase(this.lastFinalUserText)) {
          console.log(
            `[GeminiLive] add_to_cart blocked — no verbal confirm. lastUser="${this.lastFinalUserText}"`,
          );

          return {
            id: call.id,
            name: call.name,
            response: {
              result: 'blocked',
              reason:
                'Pelanggan belum konfirmasi eksplisit. Tanya dulu sekali, tunggu iya/boleh/oke — jangan ulang push.',
            },
          };
        }

        callbacks.onSystemAction('ADD_TO_CART', {
          productId,
          size,
          quantity,
        });

        console.log(`[GeminiLive] tool add_to_cart productId=${productId} size=${size}`);

        return {
          id: call.id,
          name: call.name,
          response: {
            result: 'ok',
            message: 'Produk ditambahkan. Konfirmasi singkat tanpa push lagi.',
          },
        };
      }

      if (call.name === 'set_cart_quantity') {
        const productId = String(args.productId ?? '');
        const size = String(args.size ?? 'M');
        const quantity = Number(args.quantity ?? 1);

        if (!userRequestedCartAdjust(this.lastFinalUserText) && !userConfirmedPurchase(this.lastFinalUserText)) {
          return {
            id: call.id,
            name: call.name,
            response: {
              result: 'blocked',
              reason: 'Tunggu pelanggan minta ubah jumlah keranjang (kurangi/hapus/satu aja).',
            },
          };
        }

        callbacks.onSystemAction('SET_CART_QUANTITY', {
          productId,
          size,
          quantity,
        });

        console.log(
          `[GeminiLive] tool set_cart_quantity productId=${productId} size=${size} qty=${quantity}`,
        );

        return {
          id: call.id,
          name: call.name,
          response: {
            result: 'ok',
            message: `Jumlah di keranjang diatur jadi ${quantity}. Konfirmasi singkat ke pelanggan.`,
          },
        };
      }

      if (call.name === 'remove_from_cart') {
        const productId = String(args.productId ?? '');
        const size = String(args.size ?? 'M');

        if (!userRequestedCartAdjust(this.lastFinalUserText)) {
          return {
            id: call.id,
            name: call.name,
            response: {
              result: 'blocked',
              reason: 'Tunggu pelanggan minta hapus item dari keranjang.',
            },
          };
        }

        callbacks.onSystemAction('REMOVE_FROM_CART', {
          productId,
          size,
        });

        console.log(`[GeminiLive] tool remove_from_cart productId=${productId} size=${size}`);

        return {
          id: call.id,
          name: call.name,
          response: {
            result: 'ok',
            message: 'Item dihapus dari keranjang. Konfirmasi singkat.',
          },
        };
      }

      if (call.name === 'navigate_to_product') {
        const productId = String(args.productId ?? '');
        const now = Date.now();

        if (productId === this.lastNavigate.productId && now - this.lastNavigate.at < 2500) {
          console.log(`[GeminiLive] navigate_to_product skipped duplicate productId=${productId}`);
        } else {
          this.lastNavigate = { productId, at: now };
          const catalogItem = lookupCatalog(productId);
          const productName = String(args.productName ?? catalogItem?.name ?? 'Produk');
          const view = args.view === 'detail' ? 'detail' : 'catalog';
          const slug = catalogItem
            ? productPath(catalogItem.id, catalogItem.slug)
            : `/shop/product/${productId}`;

          callbacks.onSystemAction('NAVIGATE_TO_PRODUCT', {
            productId,
            productName,
            slug,
            view,
          });

          this.pendingContext = {
            productId,
            productName,
            stockStatus: 'Available',
          };

          console.log(`[GeminiLive] tool navigate_to_product productId=${productId} view=${view}`);
        }
      }

      return {
        id: call.id,
        name: call.name,
        response: {
          result: 'ok',
          ui_updated: call.name === 'navigate_to_product',
          note:
            call.name === 'navigate_to_product'
              ? 'UI updated silently. Do not mention screen, layar, spill, or navigation.'
              : undefined,
        },
      };
    });

    this.session.sendToolResponse({ functionResponses });
  }
}
