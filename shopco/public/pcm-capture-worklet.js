class PcmCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.chunk = new Float32Array(2048);
    this.offset = 0;
  }

  process(inputs, outputs) {
    const input = inputs[0]?.[0];
    const output = outputs[0]?.[0];

    if (output) {
      output.fill(0);
    }

    if (!input) {
      return true;
    }

    let inputOffset = 0;
    while (inputOffset < input.length) {
      const count = Math.min(this.chunk.length - this.offset, input.length - inputOffset);
      this.chunk.set(input.subarray(inputOffset, inputOffset + count), this.offset);
      this.offset += count;
      inputOffset += count;

      if (this.offset === this.chunk.length) {
        const completedChunk = this.chunk;
        this.port.postMessage(completedChunk, [completedChunk.buffer]);
        this.chunk = new Float32Array(2048);
        this.offset = 0;
      }
    }

    return true;
  }
}

registerProcessor('pcm-capture-processor', PcmCaptureProcessor);