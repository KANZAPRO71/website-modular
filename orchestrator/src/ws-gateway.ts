import 'dotenv/config';

import { createServer } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';

import { GeminiLiveSession } from './gemini/gemini-live-session.js';
import type { ClientPacket, OutboundPacket } from './types.js';

const PORT = Number(process.env.ORCHESTRATOR_PORT ?? 8787);
const OUTPUT_SAMPLE_RATE = 24_000;

interface ClientRuntime {
  gemini: GeminiLiveSession;
  textMode: boolean;
}

const clients = new Map<WebSocket, ClientRuntime>();

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
  const productName = packet.context?.productName ?? 'Produk Butik DEVI';

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
      'Butik Full-Duplex Orchestrator (Gemini Live only)',
      `WebSocket: ws://localhost:${PORT}`,
      '',
      `Model: ${process.env.GEMINI_MODEL ?? 'gemini-3.1-flash-live-preview'}`,
      `Gemini API key: ${process.env.GEMINI_API_KEY ? 'configured' : 'missing'}`,
      '',
      'Protocol: SESSION_START | AUDIO_CHUNK (pcm16@16kHz) | INTERRUPT',
    ].join('\n'),
  );
});

const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (ws) => {
  const runtime: ClientRuntime = { gemini: new GeminiLiveSession(), textMode: false };
  clients.set(ws, runtime);

  console.log('[WS] client connected');

  ws.on('message', (raw) => {
    void (async () => {
      let packet: ClientPacket;

      try {
        packet = JSON.parse(String(raw)) as ClientPacket;
      } catch {
        return;
      }

      switch (packet.type) {
        case 'SESSION_START':
          await handleSessionStart(ws, runtime, packet);
          break;

        case 'AUDIO_CHUNK':
          if (packet.data) {
            runtime.gemini.sendPcm16(packet.data);
          }
          break;

        case 'TEXT_MESSAGE':
          if (packet.text) {
            runtime.gemini.sendText(packet.text);
          }
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
    })();
  });

  ws.on('close', () => {
    runtime.gemini.close();
    clients.delete(ws);
    console.log('[WS] client disconnected');
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
