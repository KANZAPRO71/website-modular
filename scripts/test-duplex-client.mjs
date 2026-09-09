import { WebSocket } from 'ws';

const WS_URL = process.env.DUPLEX_WS_URL ?? 'ws://localhost:8787';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runMilestoneTest() {
  return new Promise((resolve, reject) => {
    const metrics = {
      connectMs: 0,
      firstAudioChunkMs: 0,
      audioChunkCount: 0,
      systemActions: [],
      interrupted: false,
    };

    const startedAt = Date.now();
    let sessionStartedAt = 0;
    let firstAudioAt = 0;

    const ws = new WebSocket(WS_URL);

    ws.on('open', async () => {
      metrics.connectMs = Date.now() - startedAt;
      sessionStartedAt = Date.now();

      ws.send(
        JSON.stringify({
          type: 'SESSION_START',
          context: {
            productId: '1',
            productName: 'Gradient Graphic T-shirt',
            stockStatus: 'Available',
          },
        }),
      );

      await sleep(400);

      for (let i = 1; i <= 6; i += 1) {
        ws.send(
          JSON.stringify({
            type: 'AUDIO_CHUNK',
            data: 'dGVzdA==',
            format: 'webm',
            context: { productId: '1' },
          }),
        );

        if (i === 4) {
          await sleep(180);
          ws.send(JSON.stringify({ type: 'INTERRUPT' }));
          metrics.interrupted = true;
          await sleep(120);
        }

        await sleep(150);
      }

      await sleep(1200);
      ws.close();
    });

    ws.on('message', (raw) => {
      const message = JSON.parse(String(raw));

      if (message.type === 'AUDIO_CHUNK') {
        metrics.audioChunkCount += 1;
        if (!firstAudioAt) {
          firstAudioAt = Date.now();
          metrics.firstAudioChunkMs = firstAudioAt - sessionStartedAt;
        }
      }

      if (message.type === 'SYSTEM_ACTION') {
        metrics.systemActions.push(message);
      }
    });

    ws.on('close', () => resolve(metrics));
    ws.on('error', reject);

    setTimeout(() => {
      ws.close();
      resolve(metrics);
    }, 8000);
  });
}

const metrics = await runMilestoneTest();

console.log('=== Duplex Milestone Test (headless) ===');
console.log(`WebSocket connect: ${metrics.connectMs}ms`);
console.log(`SESSION_START -> first AUDIO_CHUNK: ${metrics.firstAudioChunkMs}ms`);
console.log(`AUDIO_CHUNK received: ${metrics.audioChunkCount}`);
console.log(`INTERRUPT sent at chunk 4: ${metrics.interrupted ? 'yes' : 'no'}`);
console.log(
  `SYSTEM_ACTION count: ${metrics.systemActions.length}`,
  metrics.systemActions.map((item) => item.action),
);

if (metrics.firstAudioChunkMs > 0 && metrics.firstAudioChunkMs < 1000) {
  console.log('PASS: greeting latency under 1 second');
} else if (metrics.firstAudioChunkMs > 0) {
  console.log('WARN: greeting latency above 1 second');
} else {
  console.log('FAIL: no AUDIO_CHUNK received');
}

if (metrics.systemActions.some((item) => item.action === 'ADD_TO_CART')) {
  console.log('PASS: ADD_TO_CART system action emitted');
} else {
  console.log('FAIL: ADD_TO_CART not emitted');
}
