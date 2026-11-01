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
  /\b(yes|yeah|yup|ok|okay|sure|go|add|cart|buy|deal|agree|continue|checkout|take|place|save)\b/i;

const CART_ADJUST_RE =
  /\b(remove|decrease|reduce|delete|cancel|one|single|duplicate|over|update|replace)\b/i;

const addToCartTool: FunctionDeclaration = {
  name: 'add_to_cart',
  description:
    'Adds a product to the cart. REQUIRED: (1) customer has stated their size, (2) you asked for verbal confirmation, (3) customer confirmed with yes/ok/sure. Do NOT call if customer only mentioned a size without agreeing to buy.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      productId: { type: Type.STRING, description: 'Product ID from the catalog' },
      size: { type: Type.STRING, description: 'Clothing size, e.g. S/M/L/XL' },
      quantity: { type: Type.NUMBER, description: 'Number of items' },
    },
    required: ['productId', 'size'],
  },
};

const setCartQuantityTool: FunctionDeclaration = {
  name: 'set_cart_quantity',
  description:
    'Sets the exact quantity of a cart item (e.g. change to 1). Use when customer asks to reduce, says just one, why are there two, or to fix duplicates. Do NOT use to add new items — use add_to_cart instead.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      productId: { type: Type.STRING, description: 'Product ID from the catalog' },
      size: { type: Type.STRING, description: 'Size of the item in cart' },
      quantity: { type: Type.NUMBER, description: 'Final quantity desired (0 = remove from cart)' },
    },
    required: ['productId', 'size', 'quantity'],
  },
};

const removeFromCartTool: FunctionDeclaration = {
  name: 'remove_from_cart',
  description:
    'Completely removes a product from the cart. Use when customer asks to remove or cancel an item.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      productId: { type: Type.STRING, description: 'Product ID from the catalog' },
      size: { type: Type.STRING, description: 'Size of the item in cart' },
    },
    required: ['productId', 'size'],
  },
};

const navigateToProductTool: FunctionDeclaration = {
  name: 'navigate_to_product',
  description:
    'Displays a product on the customer screen by shifting UI focus. MUST be called when customer asks to see a photo, show a product, switch items, or mentions a product name they want to view.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      productId: {
        type: Type.STRING,
        description: 'Product ID from catalog (e.g. "6" for hoodie/graphic tee)',
      },
      productName: {
        type: Type.STRING,
        description: 'Product name for verbal confirmation to customer',
      },
      view: {
        type: Type.STRING,
        description: 'catalog = scroll to card in grid, detail = open product detail page',
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

function buildUiInterfacePrompt(context: ProductContext): string {
  const page = context.pageLabel ?? 'Shop page';
  const path = context.pagePath ?? '/';

  return [
    '**SHOP.CO INTERFACE MAP**',
    'Store name: SHOP.CO. Always refer to it as SHOP.CO.',
    '',
    '**Global elements (all pages):**',
    '- Navbar: SHOP.CO logo | Shop, On Sale, New Arrivals, Brands | search | cart | account',
    '- Top banner: 20% off sign-up promo',
    '- Start Voice button on product card = customer speaking directly to you',
    '- Blue glow on photo = product highlighted after navigate',
    '- Prices in USD ($)',
    '',
    '**Home (/):** hero, New Arrivals, Top Selling, Browse by Style (Casual/Formal/Party/Gym), reviews',
    '**Shop (/shop):** grid catalog, filters for size/color/price/style, sort by price',
    '**Product (/shop/product/...):** large photo, rating, price, Choose Size, Choose Color, Add to Cart, tabs Details/Reviews/FAQ',
    '**Cart (/cart):** item list, Order Summary, subtotal, discount, free shipping, Go to Checkout',
    '**Checkout (/checkout):** demo-only order preview; no payment or shipping is arranged.',
    '**Order confirmation (/order-confirmation):** browser-local demo summary only; no shared order record.',
    '**Wishlist (/wishlist):** products saved in this browser.',
    '',
    `**Customer current page: ${page} (${path})**`,
    context.storeName ? `Store: ${context.storeName}` : 'Store: SHOP.CO',
  ].join('\n');
}
function buildSystemInstruction(context: ProductContext): string {
  const label = spokenProductLabel(context);

  return [
    '**PERSONA**',
    'You are the expert fashion consultant for **SHOP.CO**. You directly assist shoppers right on the storefront — not an automated robot or phone support.',
    'Character: consultative, knowledgeable about fabrics & fit, warm, concise, and never pushy.',
    'Wait silently when a session starts or resumes. Do not greet, narrate, or speak until the customer sends a clear message.',
    '',
    '**LANGUAGE**',
    'Always respond in clear, natural English, even when the customer speaks another language.',
    'Strictly maximum 1-2 short sentences per turn. Stop after 2 sentences — never monologue.',
    'Quote product names naturally and mention prices clearly.',
    'You understand the SHOP.CO website layout — assist with navigation, cart, filters, sizes, etc.',
    context.productId
      ? `Current product context: ${label}.`
      : 'No product is currently selected. Ask which item the customer means before giving product-specific details.',
    '',
    '**CONSULTATIVE STYLE (MANDATORY)**',
    'Priority #1: answer customer questions with useful info — fabric, color, size, price, fit, care instructions.',
    'For recommendations or comparisons, use only the catalog facts below; compare relevant price, material, fit, colors, sizes, and stock, and never invent product details.',
    'Help the customer feel confident before buying.',
    'DO NOT push add-to-cart on every turn. Only offer to save to cart when the customer explicitly expresses intent to buy.',
    'If the customer asks to reduce/remove items from cart, use set_cart_quantity or remove_from_cart.',
    'Understand the customer’s intent even when they speak another language, but keep every spoken and written response in English.',
    'The storefront demo has no fulfillment, order tracking, returns, customer notification, or live restock system. Never claim to check an order, process a return, reserve inventory, or send an alert; clearly explain this limitation when asked.',
    'Do not promise shipping, payment processing, refunds, discounts, or customer-support follow-up. For checkout questions, explain that the order preview is saved only in the current browser and does not place a real order.',
    'Never repeat the entire conversation history in every answer — answer only the current question.',
    '',
    '**VOICE RULES**',
    'Do not repeat greetings on subsequent turns. Every response is fresh and directly answers what was asked.',
    'After navigate_to_product: screen automatically updates — remain silent unless asked.',
    '',
    '**TOOLS (internal)**',
    'navigate_to_product: view=catalog or view=detail.',
    'add_to_cart: only when item and size are clear and customer verbally confirmed.',
    'set_cart_quantity: adjust exact quantity in cart.',
    'remove_from_cart: remove item completely.',
    '',
    '**CATALOG:**',
    ...buildCatalogPromptLines(),
  ].join('\n');
}


export class GeminiLiveSession {
  private session: Session | null = null;
  private ai: GoogleGenAI | null = null;
  private context: ProductContext = {};
  private callbacks: GeminiLiveCallbacks | null = null;
  private resumeHandle: string | undefined;
  private connectionGeneration = 0;
  private reconnecting = false;
  private closed = false;
  private pendingInputs: Array<{ type: 'audio' | 'text'; data: string }> = [];
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

    this.ai = new GoogleGenAI({ apiKey: this.apiKey });
    this.context = context;
    this.callbacks = callbacks;
    this.closed = false;
    this.forwardAudio = true;
    this.userTranscript = '';
    this.modelTranscript = '';
    this.lastSentTranscript = { user: '', model: '' };
    this.lastFinalUserText = '';
    this.committedUserTranscript = '';
    this.committedModelTranscript = '';

    await this.openSession();
  }

  private async openSession(): Promise<void> {
    const ai = this.ai;
    const callbacks = this.callbacks;
    if (!ai || !callbacks || this.closed) {
      return;
    }

    const generation = ++this.connectionGeneration;
    const resumed = Boolean(this.resumeHandle);
    const session = await ai.live.connect({
      model: this.model,
      config: {
        responseModalities: [Modality.AUDIO],
        systemInstruction: buildSystemInstruction(this.context),
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
        sessionResumption: { handle: this.resumeHandle },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      },
      callbacks: {
        onmessage: (message) => {
          if (generation === this.connectionGeneration) {
            this.handleMessage(message, callbacks);
          }
        },
        onerror: (event) => {
          if (generation === this.connectionGeneration) {
            this.beginReconnect(event.message ?? 'Gemini Live error');
          }
        },
        onclose: () => {
          if (generation === this.connectionGeneration) {
            this.beginReconnect('Gemini Live connection closed');
          }
        },
      },
    });

    if (this.closed || generation !== this.connectionGeneration) {
      session.close();
      return;
    }

    this.session = session;

    this.flushPendingInputs();
  }

  private beginReconnect(reason: string): void {
    if (this.closed || this.reconnecting || !this.ai) {
      return;
    }

    console.warn(`[GeminiLive] reconnecting: ${reason}`);
    this.reconnecting = true;
    this.connectionGeneration += 1;
    const previousSession = this.session;
    this.session = null;
    previousSession?.close();
    void this.reconnect();
  }

  private async reconnect(): Promise<void> {
    const delays = [250, 500, 1_000, 2_000, 4_000];

    for (const delay of delays) {
      if (this.closed) {
        this.reconnecting = false;
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, delay));

      try {
        await this.openSession();
        if (this.session) {
          this.reconnecting = false;
          return;
        }
      } catch (error) {
        console.warn('[GeminiLive] reconnect attempt failed:', error);
      }
    }

    this.reconnecting = false;
    this.pendingInputs = [];
    this.callbacks?.onError?.(new Error('Gemini Live could not reconnect after five attempts'));
  }

  private queueInput(type: 'audio' | 'text', data: string): void {
    const maxPendingInputs = 180;
    if (this.pendingInputs.length >= maxPendingInputs) {
      this.pendingInputs.shift();
    }
    this.pendingInputs.push({ type, data });
  }

  private flushPendingInputs(): void {
    const pending = this.pendingInputs.splice(0);
    for (const input of pending) {
      if (input.type === 'audio') {
        this.sendPcm16(input.data);
      } else {
        this.sendText(input.data);
      }
    }
  }

  sendPcm16(base64Pcm: string): void {
    if (!this.session) {
      if (this.reconnecting) {
        this.queueInput('audio', base64Pcm);
      }
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
    if (!text.trim()) {
      return;
    }

    if (!this.session) {
      if (this.reconnecting) {
        this.queueInput('text', text.trim());
      }
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
    const prompt = `[SHOP.CO storefront navigation] The customer is now on ${page}, viewing "${context.productName ?? inv.name}" (ID: ${context.productId ?? 'unknown'}${inv.price ? `, $${inv.price.toLocaleString('en-US')}` : ''}). The product image is visible and highlighted. Do not acknowledge the navigation; wait for the customer's question.`;

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
    this.closed = true;
    this.reconnecting = false;
    this.connectionGeneration += 1;
    this.session?.close();
    this.session = null;
    this.ai = null;
    this.callbacks = null;
    this.resumeHandle = undefined;
    this.pendingInputs = [];
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
    if (message.sessionResumptionUpdate) {
      const update = message.sessionResumptionUpdate;
      this.resumeHandle = update.resumable ? update.newHandle : undefined;
    }

    if (message.goAway) {
      this.beginReconnect('Gemini Live announced an impending disconnect');
    }

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
        const inventory = lookupInventory(productId);
        const normalizedSize = size.trim().toUpperCase();
        const availableSizes = inventory.sizes.map((entry) => entry.toUpperCase());

        if (
          inventory.stock <= 0 ||
          !availableSizes.includes(normalizedSize) ||
          !Number.isInteger(quantity) ||
          quantity <= 0 ||
          quantity > inventory.stock
        ) {
          return {
            id: call.id,
            name: call.name,
            response: {
              result: 'blocked',
              reason:
                'This product, size, or quantity is not available in the catalog inventory. Explain the limitation and suggest an available alternative.',
            },
          };
        }

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
                'The customer has not explicitly confirmed. Ask once and wait for confirmation; do not pressure the customer.',
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
            message: 'Product added. Confirm briefly without making another sales pitch.',
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
              reason: 'Wait until the customer asks to change the cart quantity.',
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
            message: `Cart quantity set to ${quantity}. Confirm the change briefly.`,
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
              reason: 'Wait until the customer asks to remove an item from the cart.',
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
            message: 'Item removed from the cart. Confirm briefly.',
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
          const productName = String(args.productName ?? catalogItem?.name ?? 'Product');
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
