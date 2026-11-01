type AudioFormat = 'pcm16' | 'webm' | 'wav';

interface EnqueuedChunk {
  data: string;
  format: AudioFormat;
  sampleRate: number;
  channels: number;
}

export class AudioQueueManager {
  private context: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private queue: EnqueuedChunk[] = [];
  private scheduledSources: AudioBufferSourceNode[] = [];
  private nextPlayTime = 0;
  private isProcessing = false;
  private interrupted = false;
  private defaultSampleRate: number;

  constructor(defaultSampleRate = 24_000) {
    this.defaultSampleRate = defaultSampleRate;
  }

  get audioContext(): AudioContext | null {
    return this.context;
  }

  get analyserNode(): AnalyserNode | null {
    return this.analyser;
  }

  get isPlaying(): boolean {
    return this.scheduledSources.length > 0 || this.queue.length > 0 || this.isProcessing;
  }

  async ensureContext(): Promise<AudioContext> {
    if (!this.context) {
      this.context = new AudioContext();
      this.gainNode = this.context.createGain();
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.75;
      this.gainNode.connect(this.analyser);
      this.analyser.connect(this.context.destination);
    }

    if (this.context.state === 'suspended') {
      await this.context.resume();
    }

    return this.context;
  }

  async enqueue(
    base64Data: string,
    format: AudioFormat = 'pcm16',
    sampleRate = this.defaultSampleRate,
    channels = 1,
  ): Promise<void> {
    this.interrupted = false;
    this.queue.push({ data: base64Data, format, sampleRate, channels });

    if (!this.isProcessing) {
      await this.processQueue();
    }
  }

  interrupt(): void {
    this.interrupted = true;
    this.queue = [];
    this.nextPlayTime = 0;

    for (const source of this.scheduledSources) {
      try {
        source.stop();
        source.disconnect();
      } catch {
        // Source may already have ended.
      }
    }

    this.scheduledSources = [];
  }

  async destroy(): Promise<void> {
    this.interrupt();

    if (this.context) {
      await this.context.close();
      this.context = null;
      this.analyser = null;
      this.gainNode = null;
    }
  }

  private async processQueue(): Promise<void> {
    this.isProcessing = true;
    const context = await this.ensureContext();

    while (this.queue.length > 0 && !this.interrupted) {
      const chunk = this.queue.shift();
      if (!chunk || !this.gainNode) {
        continue;
      }

      const audioBuffer = await this.decodeChunk(context, chunk);
      if (!audioBuffer || this.interrupted) {
        continue;
      }

      const source = context.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.gainNode);

      const startAt = Math.max(context.currentTime, this.nextPlayTime);
      source.start(startAt);
      this.nextPlayTime = startAt + audioBuffer.duration;

      this.scheduledSources.push(source);
      source.onended = () => {
        this.scheduledSources = this.scheduledSources.filter((node) => node !== source);
      };
    }

    this.isProcessing = false;
  }

  private async decodeChunk(
    context: AudioContext,
    chunk: EnqueuedChunk,
  ): Promise<AudioBuffer | null> {
    const bytes = base64ToUint8Array(chunk.data);

    if (chunk.format === 'pcm16') {
      return this.pcm16ToAudioBuffer(context, bytes, chunk.sampleRate, chunk.channels);
    }

    try {
      const copy = bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      ) as ArrayBuffer;
      return await context.decodeAudioData(copy);
    } catch {
      return null;
    }
  }

  private pcm16ToAudioBuffer(
    context: AudioContext,
    bytes: Uint8Array,
    sampleRate: number,
    channels: number,
  ): AudioBuffer {
    const sampleCount = Math.floor(bytes.length / 2);
    const frameCount = Math.floor(sampleCount / channels);
    const audioBuffer = context.createBuffer(channels, frameCount, sampleRate);

    for (let channel = 0; channel < channels; channel += 1) {
      const channelData = audioBuffer.getChannelData(channel);

      for (let frame = 0; frame < frameCount; frame += 1) {
        const index = frame * channels + channel;
        const lo = bytes[index * 2];
        const hi = bytes[index * 2 + 1];
        const int16 = (hi << 8) | lo;
        const signed = int16 >= 0x8000 ? int16 - 0x10000 : int16;
        channelData[frame] = signed / 0x8000;
      }
    }

    return audioBuffer;
  }
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}
