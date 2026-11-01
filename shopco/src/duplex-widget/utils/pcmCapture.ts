const GEMINI_INPUT_RATE = 16_000;

export function downsampleFloat32ToPcm16(
  input: Float32Array,
  inputSampleRate: number,
  outputSampleRate = GEMINI_INPUT_RATE,
): Int16Array {
  if (inputSampleRate === outputSampleRate) {
    return float32ToPcm16(input);
  }

  const ratio = inputSampleRate / outputSampleRate;
  const outputLength = Math.floor(input.length / ratio);
  const output = new Int16Array(outputLength);

  for (let index = 0; index < outputLength; index += 1) {
    const sourceStart = index * ratio;
    const sourceEnd = (index + 1) * ratio;
    const firstSourceIndex = Math.floor(sourceStart);
    const lastSourceIndex = Math.min(input.length, Math.ceil(sourceEnd));
    let weightedSum = 0;
    let totalWeight = 0;

    for (let sourceIndex = firstSourceIndex; sourceIndex < lastSourceIndex; sourceIndex += 1) {
      const overlap =
        Math.min(sourceEnd, sourceIndex + 1) - Math.max(sourceStart, sourceIndex);
      weightedSum += input[sourceIndex] * overlap;
      totalWeight += overlap;
    }

    output[index] = floatSampleToInt16(totalWeight > 0 ? weightedSum / totalWeight : 0);
  }

  return output;
}

export function pcm16ToBase64(pcm16: Int16Array): string {
  const bytes = new Uint8Array(pcm16.buffer, pcm16.byteOffset, pcm16.byteLength);
  let binary = '';

  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }

  return btoa(binary);
}

function float32ToPcm16(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);

  for (let index = 0; index < input.length; index += 1) {
    output[index] = floatSampleToInt16(input[index]);
  }

  return output;
}

function floatSampleToInt16(sample: number): number {
  const clamped = Math.max(-1, Math.min(1, sample));
  return clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
}

export { GEMINI_INPUT_RATE };
