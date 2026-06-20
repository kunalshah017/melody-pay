import { encode, initGGWave, SAMPLE_RATE } from "./ggwave";

// Reuse a single AudioContext to avoid mobile browser limits
let sharedAudioCtx: AudioContext | null = null;

const CHUNK_OVERHEAD = 6; // "TX1/2|" = 6 chars
const MAX_PAYLOAD = 140;
const CHUNK_DATA_SIZE = MAX_PAYLOAD - CHUNK_OVERHEAD; // 134 chars per chunk

function getAudioContext(): AudioContext {
  if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
    sharedAudioCtx = new AudioContext({ sampleRate: SAMPLE_RATE });
  }
  return sharedAudioCtx;
}

/**
 * Play a payload as ggwave audio through the device speaker.
 */
export async function playPayload(
  payload: string,
  protocolName?: string,
): Promise<void> {
  await initGGWave();
  const samples = encode(payload, protocolName);
  const audioCtx = getAudioContext();

  if (audioCtx.state === "suspended") {
    await audioCtx.resume();
  }

  const buffer = audioCtx.createBuffer(1, samples.length, SAMPLE_RATE);
  buffer.getChannelData(0).set(samples);

  const source = audioCtx.createBufferSource();
  source.buffer = buffer;

  const gainNode = audioCtx.createGain();
  gainNode.gain.value = 1.5;
  source.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  return new Promise((resolve) => {
    source.onended = () => {
      resolve();
    };
    source.start();
  });
}

/**
 * Play a large payload by splitting into numbered chunks.
 * Format: "TX1/N|<data>" "TX2/N|<data>" ...
 * Each chunk is played sequentially with a gap between.
 * For payloads <= 140 bytes, sends as single chunk "TX1/1|<data>".
 */
export async function playChunkedPayload(
  payload: string,
  gapMs: number = 1500,
  protocolName?: string,
): Promise<void> {
  const totalChunks = Math.ceil(payload.length / CHUNK_DATA_SIZE);

  for (let i = 0; i < totalChunks; i++) {
    const chunkData = payload.slice(i * CHUNK_DATA_SIZE, (i + 1) * CHUNK_DATA_SIZE);
    const chunk = `TX${i + 1}/${totalChunks}|${chunkData}`;
    await playPayload(chunk, protocolName);
    if (i < totalChunks - 1) {
      await new Promise((r) => setTimeout(r, gapMs));
    }
  }
}

/**
 * Play a payload on loop with gap between plays. Returns stop function.
 */
export function playLoop(
  payload: string,
  intervalMs: number = 5000,
  protocolName?: string,
): { stop: () => void } {
  let running = true;
  const loop = async () => {
    while (running) {
      await playPayload(payload, protocolName);
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  };
  loop();
  return {
    stop: () => {
      running = false;
    },
  };
}
