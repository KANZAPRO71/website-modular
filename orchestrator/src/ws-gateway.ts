import 'dotenv/config';

import { createServer } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';

import { GeminiLiveSession } from './gemini/gemini-live-session.js';
import type { ClientPacket, OutboundPacket } from './types.js';

const PORT = Number(process.env.PORT ?? process.env.ORCHESTRATOR_PORT ?? 8787);
const OUTPUT_SAMPLE_RATE = 24_000;
const MAX_CLIENTS = 20;
const MAX_MESSAGE_BYTES = 128 * 1024;
const allowedOrigins = new Set(
  (
    process.env.ORCHESTRATOR_ALLOWED_ORIGINS ??
    'http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001,https://kanzapro71.github.io,null'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
);

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) {
    return true;
  }

  if (allowedOrigins.has(origin)) {
    return true;
  }

  try {
    const parsedOrigin = new URL(origin);
    return (
      ['localhost', '127.0.0.1', '[::1]'].includes(parsedOrigin.hostname) ||
      parsedOrigin.hostname.endsWith('.github.io') ||
      parsedOrigin.hostname.endsWith('.trycloudflare.com')
    );
  } catch {
    return false;
  }
}

interface ClientRuntime {
  gemini: GeminiLiveSession;
  textMode: boolean;
  startingSession: boolean;
  recentMessages: number[];
  recentAudioMessages: number[];
  recentTextMessages: number[];
  sessionStarts: number[];
}

const clients = new Map<WebSocket, ClientRuntime>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isOptionalBoundedString(
  value: unknown,
  maxLength: number,
): value is string | undefined {
  return value === undefined || (typeof value === 'string' && value.length <= maxLength);
}

function isProductContext(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isOptionalBoundedString(value.productId, 64) &&
    isOptionalBoundedString(value.productName, 200) &&
    isOptionalBoundedString(value.stockStatus, 100) &&
    isOptionalBoundedString(value.storeName, 100) &&
    isOptionalBoundedString(value.pagePath, 500) &&
    isOptionalBoundedString(value.pageLabel, 100)
  );
}

function isClientPacket(value: unknown): value is ClientPacket {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return false;
  }

  switch (value.type) {
    case 'SESSION_START':
      return (
        (value.context === undefined || isProductContext(value.context)) &&
        (value.mode === undefined || value.mode === 'voice' || value.mode === 'text')
      );
    case 'AUDIO_CHUNK':
      return (
        typeof value.data === 'string' &&
        value.data.length > 0 &&
        value.data.length <= 64 * 1024 &&
        value.data.length % 4 === 0 &&
        /^[A-Za-z0-9+/]+={0,2}$/.test(value.data)
      );
    case 'TEXT_MESSAGE':
      return (
        typeof value.text === 'string' &&
        value.text.trim().length > 0 &&
        value.text.length <= 2_000
      );
    case 'INTERRUPT':
      return true;
    case 'UPDATE_PRODUCT_CONTEXT':
      return isProductContext(value.context);
    default:
      return false;
  }
}

function packetRateLimit(runtime: ClientRuntime, type: ClientPacket['type']): string | null {
  const now = Date.now();
  runtime.recentMessages = runtime.recentMessages.filter((time) => now - time < 60_000);
  if (runtime.recentMessages.length >= 600) {
    return 'Message rate limit exceeded';
  }
  runtime.recentMessages.push(now);

  if (type === 'AUDIO_CHUNK') {
    runtime.recentAudioMessages = runtime.recentAudioMessages.filter(
      (time) => now - time < 1_000,
    );
    if (runtime.recentAudioMessages.length >= 30) {
      return 'Audio message rate limit exceeded';
    }
    runtime.recentAudioMessages.push(now);
  }

  if (type === 'TEXT_MESSAGE') {
    runtime.recentTextMessages = runtime.recentTextMessages.filter(
      (time) => now - time < 60_000,
    );
    if (runtime.recentTextMessages.length >= 15) {
      return 'Text message rate limit exceeded';
    }
    runtime.recentTextMessages.push(now);
  }

  if (type === 'SESSION_START') {
    runtime.sessionStarts = runtime.sessionStarts.filter((time) => now - time < 10 * 60_000);
    if (runtime.sessionStarts.length >= 4) {
      return 'Session start rate limit exceeded';
    }
    runtime.sessionStarts.push(now);
  }

  return null;
}

function sendPacket(ws: WebSocket, packet: OutboundPacket): void {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(packet));
  }
}

function sendAudioChunk(ws: WebSocket, base64Pcm16: string, sampleRate = OUTPUT_SAMPLE_RATE): void {
  sendPacket(ws, {
    type: 'AUDIO_CHUNK',
    data: base64Pcm16,
    format: 'pcm16',
    sampleRate,
    channels: 1,
  });
}

async function handleSessionStart(
  ws: WebSocket,
  runtime: ClientRuntime,
  packet: ClientPacket,
): Promise<void> {
  const productId = packet.context?.productId ?? 'unknown';
  const productName = packet.context?.productName ?? 'SHOP.CO product';

  console.log(`[SESSION_START] product=${productId} (${productName})`);

  runtime.textMode = packet.mode === 'text';
  runtime.gemini.close();
  runtime.gemini = new GeminiLiveSession();

  await runtime.gemini.connect(packet.context ?? {}, {
    onAudioChunk: (base64Chunk, sampleRate) => {
      if (!runtime.textMode) {
        sendAudioChunk(ws, base64Chunk, sampleRate ?? OUTPUT_SAMPLE_RATE);
      }
    },
    onSystemAction: (action, payload) => {
      sendPacket(ws, { type: 'SYSTEM_ACTION', action, payload });
      console.log(`[SYSTEM_ACTION] ${action}`, payload);
    },
    onInterrupted: () => {
      console.log('[GeminiLive] generation interrupted');
    },
    onTranscript: (role, text, final) => {
      sendPacket(ws, {
        type: 'TRANSCRIPT',
        role: role === 'user' ? 'user' : 'assistant',
        text,
        final,
      });
      console.log(`[${role}${final ? ' ✓' : ''}] ${text}`);
    },
    onError: (error) => {
      sendPacket(ws, { type: 'ERROR', message: error.message });
      console.error('[GeminiLive]', error);
    },
  });
}

function handleInterrupt(runtime: ClientRuntime): void {
  runtime.gemini.interrupt();
  console.log('[INTERRUPT] forward-audio paused');
}

const httpServer = createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(
    [
      'SHOP.CO Full-Duplex Orchestrator (Gemini Live only)',
      `WebSocket: ws://localhost:${PORT}`,
      '',
      `Model: ${process.env.GEMINI_MODEL ?? 'gemini-3.1-flash-live-preview'}`,
      `Gemini API key: ${process.env.GEMINI_API_KEY ? 'configured' : 'missing'}`,
      '',
      'Protocol: SESSION_START | AUDIO_CHUNK (pcm16@16kHz) | INTERRUPT',
    ].join('\n'),
  );
});

const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_MESSAGE_BYTES });

httpServer.on('upgrade', (request, socket, head) => {
  const origin = request.headers.origin;
  if (!isAllowedOrigin(origin)) {
    console.warn(`[WS] rejected connection origin=${origin ?? '(missing)'}`);
    socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
    socket.destroy();
    return;
  }

  if (clients.size >= MAX_CLIENTS) {
    socket.write('HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n');
    socket.destroy();
    return;
  }

  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

wss.on('connection', (ws) => {
  const runtime: ClientRuntime = {
    gemini: new GeminiLiveSession(),
    textMode: false,
    startingSession: false,
    recentMessages: [],
    recentAudioMessages: [],
    recentTextMessages: [],
    sessionStarts: [],
  };
  clients.set(ws, runtime);

  console.log('[WS] client connected');

  ws.on('message', (raw) => {
    void (async () => {
      let value: unknown;

      try {
        value = JSON.parse(String(raw));
      } catch (error) {
        console.warn('[WS] rejected malformed JSON packet:', error);
        sendPacket(ws, { type: 'ERROR', message: 'Invalid JSON packet' });
        return;
      }

      if (!isClientPacket(value)) {
        sendPacket(ws, { type: 'ERROR', message: 'Invalid or unsupported packet' });
        return;
      }

      const rateLimitError = packetRateLimit(runtime, value.type);
      if (rateLimitError) {
        sendPacket(ws, { type: 'ERROR', message: rateLimitError });
        return;
      }

      const packet = value;

      switch (packet.type) {
        case 'SESSION_START':
          if (runtime.startingSession) {
            sendPacket(ws, { type: 'ERROR', message: 'Session start already in progress' });
            break;
          }
          runtime.startingSession = true;
          try {
            await handleSessionStart(ws, runtime, packet);
          } finally {
            runtime.startingSession = false;
          }
          break;

        case 'AUDIO_CHUNK':
          runtime.gemini.sendPcm16(packet.data ?? '');
          break;

        case 'TEXT_MESSAGE':
          runtime.gemini.sendText(packet.text ?? '');
          break;

        case 'INTERRUPT':
          handleInterrupt(runtime);
          break;

        case 'UPDATE_PRODUCT_CONTEXT':
          if (packet.context) {
            runtime.gemini.updateProductContext(packet.context);
            console.log(
              `[UPDATE_PRODUCT_CONTEXT] product=${packet.context.productId ?? 'unknown'}`,
            );
          }
          break;

        default:
          sendPacket(ws, {
            type: 'ERROR',
            message: `Unsupported packet type: ${(packet as ClientPacket).type}`,
          });
      }
    })().catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unexpected orchestrator error';
      console.error('[WS] packet handling failed:', error);
      sendPacket(ws, { type: 'ERROR', message });
    });
  });

  ws.on('close', () => {
    runtime.gemini.close();
    clients.delete(ws);
    console.log('[WS] client disconnected');
  });

  ws.on('error', (error) => {
    console.error('[WS] client connection error:', error);
  });
});

function shutdown(signal: string): void {
  console.log(`[shutdown] ${signal} — closing orchestrator`);

  for (const [ws, runtime] of clients) {
    runtime.gemini.close();
    ws.close();
  }
  clients.clear();

  wss.close(() => {
    httpServer.close(() => {
      process.exit(0);
    });
  });

  setTimeout(() => process.exit(0), 2000).unref();
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => shutdown(signal));
}

httpServer.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(
      `[orchestrator] Port ${PORT} already in use. Stop the other process first:\n` +
        `  PowerShell: Get-NetTCPConnection -LocalPort ${PORT} | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }`,
    );
    process.exit(1);
  }

  console.error('[orchestrator] HTTP server error:', error);
  process.exit(1);
});

httpServer.listen(PORT, () => {
  const model = process.env.GEMINI_MODEL ?? 'gemini-3.1-flash-live-preview';
  console.log(`Gemini Live orchestrator on ws://localhost:${PORT}`);
  console.log(`Model: ${model}`);
  console.log(`Health/info: http://localhost:${PORT}`);

  if (!process.env.GEMINI_API_KEY) {
    console.warn('GEMINI_API_KEY missing — set orchestrator/.env before connecting clients');
  }
});
