import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';

const PORT = Number(process.env.DUPLEX_MOCK_PORT ?? 8787);
const SAMPLE_RATE = 24_000;
const CHUNK_MS = 120;

/** @type {Record<string, { name: string; stock: number; sizes: string[] }>} */
const INVENTORY = {
  '1': { name: 'Gradient Graphic T-shirt', stock: 18, sizes: ['S', 'M', 'L', 'XL'] },
  '2': { name: 'Polo with Tipping Details', stock: 6, sizes: ['M', 'L', 'XL'] },
  '3': { name: 'Black Striped T-shirt', stock: 0, sizes: ['S', 'M'] },
  '4': { name: 'Skinny Fit Jeans', stock: 11, sizes: ['30', '32', '34'] },
  '5': { name: 'Checkered Shirt', stock: 22, sizes: ['S', 'M', 'L'] },
  'SKU-9921': { name: 'Demo Oversized Tee', stock: 9, sizes: ['S', 'M', 'L', 'XL'] },
};

/** @type {Map<WebSocket, SessionState>} */
const sessions = new Map();

/**
 * @typedef {Object} SessionState
 * @property {string | null} productId
 * @property {string | null} productName
 * @property {number} userChunkCount
 * @property {boolean} interrupted
 * @property {NodeJS.Timeout[]} timers
 */

/** @returns {SessionState} */
function createSession() {
  return {
    productId: null,
    productName: null,
    userChunkCount: 0,
    interrupted: false,
    timers: [],
  };
}

function clearSessionTimers(session) {
  for (const timer of session.timers) {
    clearTimeout(timer);
  }
  session.timers = [];
}

function pcm16ToBase64(buffer) {
  return Buffer.from(buffer).toString('base64');
}

function generateSpeechPcm16(text, durationSec = 1.4) {
  const sampleCount = Math.floor(SAMPLE_RATE * durationSec);
  const bytes = Buffer.alloc(sampleCount * 2);

  for (let i = 0; i < sampleCount; i += 1) {
    const t = i / SAMPLE_RATE;
    const charCode = text.charCodeAt(i % Math.max(text.length, 1));
    const baseFreq = 180 + (charCode % 120);
    const vibrato = Math.sin(t * 6) * 18;
    const freq = baseFreq + vibrato;
    const envelope = Math.min(1, i / (SAMPLE_RATE * 0.05)) * Math.min(1, (sampleCount - i) / (SAMPLE_RATE * 0.08));
    const sample = Math.sin(2 * Math.PI * freq * t) * 0.28 * envelope;
    const int16 = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
    bytes.writeInt16LE(int16, i * 2);
  }

  return bytes;
}

function splitPcm16Chunks(pcmBuffer, chunkDurationMs = CHUNK_MS) {
  const samplesPerChunk = Math.floor((SAMPLE_RATE * chunkDurationMs) / 1000);
  const bytesPerChunk = samplesPerChunk * 2;
  /** @type {string[]} */
  const chunks = [];

  for (let offset = 0; offset < pcmBuffer.length; offset += bytesPerChunk) {
    chunks.push(pcm16ToBase64(pcmBuffer.subarray(offset, offset + bytesPerChunk)));
  }

  return chunks;
}

function sendJson(socket, payload) {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

function streamAudioChunks(socket, session, chunks, onComplete) {
  session.interrupted = false;

  chunks.forEach((chunk, index) => {
    const timer = setTimeout(() => {
      if (session.interrupted || socket.readyState !== socket.OPEN) {
        return;
      }

      sendJson(socket, {
        type: 'AUDIO_CHUNK',
        data: chunk,
        format: 'pcm16',
        sampleRate: SAMPLE_RATE,
        channels: 1,
      });

      if (index === chunks.length - 1) {
        onComplete?.();
      }
    }, index * CHUNK_MS);

    session.timers.push(timer);
  });
}

function lookupStock(productId) {
  const item = INVENTORY[String(productId)] ?? {
    name: 'Unknown Product',
    stock: 3,
    sizes: ['M', 'L'],
  };

  return item;
}

function speak(socket, session, text, durationSec = 1.6) {
  const pcm = generateSpeechPcm16(text, durationSec);
  const chunks = splitPcm16Chunks(pcm);
  streamAudioChunks(socket, session, chunks);
}

function handleSessionStart(socket, session, message) {
  const context = message.context ?? {};
  session.productId = context.productId ? String(context.productId) : null;
  session.productName = context.productName ?? null;
  session.userChunkCount = 0;
  session.interrupted = false;

  const stock = lookupStock(session.productId ?? 'SKU-9921');
  const greeting = session.productName
    ? `Halo kak, ${session.productName} masih tersedia ${stock.stock} pcs di gudang.`
    : 'Halo kak, asisten butik siap membantu kamu jelajahi koleksi.';

  console.log(`[SESSION_START] product=${session.productId ?? '-'} stock=${stock.stock}`);

  speak(socket, session, greeting, 2.2);
}

function handleUserAudio(socket, session) {
  session.userChunkCount += 1;
  console.log(`[AUDIO_CHUNK] user chunks=${session.userChunkCount}`);

  if (session.userChunkCount === 2) {
    const stock = lookupStock(session.productId ?? 'SKU-9921');
    speak(
      socket,
      session,
      stock.stock > 0
        ? `Stok ${stock.name} tersisa ${stock.stock}. Ukuran ${stock.sizes.join(', ')} masih ada ya kak.`
        : `Maaf kak, ${stock.name} sedang habis. Mau saya rekomendasikan alternatif?`,
      2.8,
    );
    return;
  }

  if (session.userChunkCount === 4) {
    speak(
      socket,
      session,
      'Baik kak, saya bantu masukkan ke keranjang ya. Kamu bisa interrupt kapan saja kalau mau ganti pilihan.',
      3.6,
    );
    return;
  }

  if (session.userChunkCount >= 6) {
    const productId = session.productId ?? '1';
    sendJson(socket, {
      type: 'SYSTEM_ACTION',
      action: 'ADD_TO_CART',
      payload: {
        productId,
        size: 'XL',
        quantity: 1,
      },
    });

    speak(socket, session, 'Siap kak, produk sudah ditambahkan ke keranjang belanja.', 1.8);
    console.log(`[SYSTEM_ACTION] ADD_TO_CART productId=${productId}`);
  }
}

function handleInterrupt(_socket, session) {
  session.interrupted = true;
  clearSessionTimers(session);
  console.log('[INTERRUPT] playback cancelled — ready for barge-in test');
}

const httpServer = createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(
    [
      'Modular Full-Duplex Mock Server',
      `WebSocket endpoint: ws://localhost:${PORT}`,
      '',
      'Test flow:',
      '1) SESSION_START -> greeting + stock',
      '2) Send mic AUDIO_CHUNK x2 -> stock details',
      '3) Send AUDIO_CHUNK x4 -> long response (try INTERRUPT)',
      '4) Send AUDIO_CHUNK x6 -> ADD_TO_CART SYSTEM_ACTION',
    ].join('\n'),
  );
});

const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (socket) => {
  const session = createSession();
  sessions.set(socket, session);
  console.log('[WS] client connected');

  sendJson(socket, { type: 'PONG' });

  socket.on('message', (raw) => {
    let message;

    try {
      message = JSON.parse(String(raw));
    } catch {
      sendJson(socket, { type: 'ERROR', message: 'Invalid JSON payload' });
      return;
    }

    switch (message.type) {
      case 'SESSION_START':
        handleSessionStart(socket, session, message);
        break;
      case 'AUDIO_CHUNK':
        handleUserAudio(socket, session);
        break;
      case 'INTERRUPT':
        handleInterrupt(socket, session);
        break;
      default:
        sendJson(socket, {
          type: 'ERROR',
          message: `Unsupported message type: ${message.type ?? 'unknown'}`,
        });
    }
  });

  socket.on('close', () => {
    clearSessionTimers(session);
    sessions.delete(socket);
    console.log('[WS] client disconnected');
  });
});

httpServer.listen(PORT, () => {
  console.log(`Mock duplex server running on ws://localhost:${PORT}`);
  console.log(`Health/info page: http://localhost:${PORT}`);
});
