import { decode, initGGWave, SAMPLE_RATE } from "./ggwave";

export type OnDecodeCallback = (data: string) => void;

/**
 * Start listening on the microphone for ggwave-encoded data.
 */
export async function startListening(
  onDecode: OnDecodeCallback,
): Promise<{ stop: () => void }> {
  await initGGWave();

  const audioCtx = new AudioContext({ sampleRate: SAMPLE_RATE });
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    },
  });

  const source = audioCtx.createMediaStreamSource(stream);
  const processor = audioCtx.createScriptProcessor(4096, 1, 1);

  processor.onaudioprocess = (event) => {
    const samples = event.inputBuffer.getChannelData(0);
    const result = decode(new Float32Array(samples));
    if (result) {
      onDecode(result);
    }
  };

  source.connect(processor);
  processor.connect(audioCtx.destination);

  return {
    stop: () => {
      processor.disconnect();
      source.disconnect();
      stream.getTracks().forEach((t) => t.stop());
      audioCtx.close();
    },
  };
}
