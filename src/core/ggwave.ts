/**
 * ggwave wrapper for browser.
 * Uses ggwave WASM to encode/decode data as audio.
 *
 * Protocol IDs:
 *   GGWAVE_PROTOCOL_AUDIBLE_NORMAL = 0
 *   GGWAVE_PROTOCOL_AUDIBLE_FAST = 1
 *   GGWAVE_PROTOCOL_AUDIBLE_FASTEST = 2
 *   GGWAVE_PROTOCOL_ULTRASOUND_NORMAL = 3
 *   GGWAVE_PROTOCOL_ULTRASOUND_FAST = 4
 *   GGWAVE_PROTOCOL_ULTRASOUND_FASTEST = 5
 *   (+ DT and MT variants at higher IDs)
 */

let ggwaveModule: any = null;
let ggwaveInstance: any = null;

const SAMPLE_RATE = 48000;

// Protocol IDs
export const Protocol = {
  AUDIBLE_NORMAL: 0,
  AUDIBLE_FAST: 1,
  AUDIBLE_FASTEST: 2,
  ULTRASOUND_NORMAL: 3,
  ULTRASOUND_FAST: 4,
  ULTRASOUND_FASTEST: 5,
} as const;

export async function initGGWave(): Promise<void> {
  if (ggwaveInstance) return;

  // Load ggwave factory from the global (loaded via script tag in index.html)
  // The npm package 'ggwave' exports the factory function
  const ggwaveFactory = (window as any).ggwave_factory;
  if (!ggwaveFactory) {
    throw new Error(
      "ggwave not loaded. Make sure ggwave.js is included in index.html",
    );
  }

  ggwaveModule = await ggwaveFactory();
  const parameters = ggwaveModule.getDefaultParameters();
  parameters.sampleRateInp = SAMPLE_RATE;
  parameters.sampleRateOut = SAMPLE_RATE;
  ggwaveInstance = ggwaveModule.init(parameters);
}

export function isInitialized(): boolean {
  return ggwaveInstance !== null;
}

/**
 * Encode a string payload into PCM audio samples (Float32Array).
 * Default protocol: AUDIBLE_FAST (good balance of speed and reliability)
 */
export function encode(
  payload: string,
  protocol: number = Protocol.AUDIBLE_FAST,
  volume: number = 10,
): Float32Array {
  if (!ggwaveInstance) throw new Error("Call initGGWave() first");
  const waveform = ggwaveModule.encode(
    ggwaveInstance,
    payload,
    protocol,
    volume,
  );
  // Convert to Float32Array for Web Audio API
  return convertToFloat32(waveform);
}

/**
 * Feed audio samples from the microphone and attempt to decode.
 * IMPORTANT: ggwave.decode expects Int8Array input.
 * Returns the decoded string if data found, null otherwise.
 */
export function decode(samples: Float32Array): string | null {
  if (!ggwaveInstance) throw new Error("Call initGGWave() first");
  // Convert Float32Array to Int8Array for ggwave
  const int8 = convertToInt8(samples);
  const result = ggwaveModule.decode(ggwaveInstance, int8);
  if (result && result.length > 0) {
    return new TextDecoder("utf-8").decode(new Uint8Array(result));
  }
  return null;
}

function convertToFloat32(src: any): Float32Array {
  const buffer = new ArrayBuffer(src.byteLength);
  new src.constructor(buffer).set(src);
  return new Float32Array(buffer);
}

function convertToInt8(src: Float32Array): Int8Array {
  const buffer = new ArrayBuffer(src.byteLength);
  new Float32Array(buffer).set(src);
  return new Int8Array(buffer);
}

export { SAMPLE_RATE };
