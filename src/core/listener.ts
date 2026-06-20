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
  if (audioCtx.state === "suspended") {
    await audioCtx.resume();
  }

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

/**
 * Listen for chunked transmissions (TX1/N|data, TX2/N|data, ...).
 * Reassembles all chunks and calls onComplete with the full payload.
 * Also passes through non-chunked messages via onDecode.
 */
export async function startChunkedListening(
  onComplete: (fullPayload: string) => void,
  onStatus?: (msg: string) => void,
): Promise<{ stop: () => void }> {
  const chunks = new Map<number, string>();
  let expectedTotal = 0;

  return startListening((data) => {
    // Check if this is a chunked message: TX<n>/<total>|<data>
    const match = data.match(/^TX(\d+)\/(\d+)\|(.*)$/);
    if (!match) {
      // Not a chunk — pass through directly (e.g. PAY| messages)
      onComplete(data);
      return;
    }

    const chunkNum = parseInt(match[1]);
    const total = parseInt(match[2]);
    const chunkData = match[3];

    expectedTotal = total;
    chunks.set(chunkNum, chunkData);

    onStatus?.(`Received chunk ${chunks.size}/${total}`);

    // Check if we have all chunks
    if (chunks.size === total) {
      // Reassemble in order
      let fullPayload = "";
      for (let i = 1; i <= total; i++) {
        fullPayload += chunks.get(i) || "";
      }
      chunks.clear();
      onComplete(fullPayload);
    }
  });
}
