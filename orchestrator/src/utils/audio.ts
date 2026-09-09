const MOCK_SAMPLE_RATE = 24_000;

export function generateMockSpeechPcm16(text: string, durationSec = 1.8): Buffer {
  const sampleCount = Math.floor(MOCK_SAMPLE_RATE * durationSec);
  const bytes = Buffer.alloc(sampleCount * 2);

  for (let i = 0; i < sampleCount; i += 1) {
    const t = i / MOCK_SAMPLE_RATE;
    const charCode = text.charCodeAt(i % Math.max(text.length, 1));
    const freq = 180 + (charCode % 120);
    const envelope =
      Math.min(1, i / (MOCK_SAMPLE_RATE * 0.05)) *
      Math.min(1, (sampleCount - i) / (MOCK_SAMPLE_RATE * 0.08));
    const sample = Math.sin(2 * Math.PI * freq * t) * 0.28 * envelope;
    const int16 = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
    bytes.writeInt16LE(int16, i * 2);
  }

  return bytes;
}

export function splitPcm16(buffer: Buffer, chunkDurationMs = 120, sampleRate = MOCK_SAMPLE_RATE): Buffer[] {
  const bytesPerChunk = Math.floor((sampleRate * chunkDurationMs) / 1000) * 2;
  const chunks: Buffer[] = [];

  for (let offset = 0; offset < buffer.length; offset += bytesPerChunk) {
    chunks.push(buffer.subarray(offset, offset + bytesPerChunk));
  }

  return chunks;
}

export function pcm16ToBase64(buffer: Buffer): string {
  return buffer.toString('base64');
}

export function f32leToPcm16(buffer: Buffer): Buffer {
  const floatCount = Math.floor(buffer.length / 4);
  const pcm16 = Buffer.alloc(floatCount * 2);

  for (let i = 0; i < floatCount; i += 1) {
    const sample = buffer.readFloatLE(i * 4);
    const clamped = Math.max(-1, Math.min(1, sample));
    pcm16.writeInt16LE(Math.floor(clamped * 32767), i * 2);
  }

  return pcm16;
}
