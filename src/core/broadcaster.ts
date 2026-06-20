import { encode, initGGWave, SAMPLE_RATE } from "./ggwave";

/**
 * Play a payload as ggwave audio through the device speaker.
 */
export async function playPayload(
  payload: string,
  protocol?: number,
): Promise<void> {
  await initGGWave();
  const samples = encode(payload, protocol);
  const audioCtx = new AudioContext({ sampleRate: SAMPLE_RATE });
  const buffer = audioCtx.createBuffer(1, samples.length, SAMPLE_RATE);
  buffer.getChannelData(0).set(samples);

  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(audioCtx.destination);

  return new Promise((resolve) => {
    source.onended = () => {
      audioCtx.close();
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
  protocol?: number,
): { stop: () => void } {
  let running = true;
  const loop = async () => {
    while (running) {
      await playPayload(payload, protocol);
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
