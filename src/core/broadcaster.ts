import { encode, initGGWave, SAMPLE_RATE } from "./ggwave";

// Reuse a single AudioContext to avoid mobile browser limits
let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
    sharedAudioCtx = new AudioContext({ sampleRate: SAMPLE_RATE });
  }
  return sharedAudioCtx;
}

/**
 * Play a payload as ggwave audio through the device speaker.
 * Reuses a single AudioContext and resumes it (required on mobile after user gesture).
 */
export async function playPayload(
  payload: string,
  protocolName?: string,
): Promise<void> {
  await initGGWave();
  const samples = encode(payload, protocolName);
  const audioCtx = getAudioContext();

  // Mobile browsers start AudioContext in "suspended" state — must resume on user gesture
  if (audioCtx.state === "suspended") {
    await audioCtx.resume();
  }

  const buffer = audioCtx.createBuffer(1, samples.length, SAMPLE_RATE);
  buffer.getChannelData(0).set(samples);

  const source = audioCtx.createBufferSource();
  source.buffer = buffer;

  // Add gain node to boost volume on phone speakers
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
