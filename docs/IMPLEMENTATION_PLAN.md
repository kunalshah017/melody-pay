# MelodyPay — Sound-Based Monad Transactions via ggwave

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build MelodyPay — a PWA (Progressive Web App) that enables sound-based transactions on Monad using ggwave. Signed transactions travel over audio waves between devices. Works on Android phones, iPhones, and laptops — any device with a browser, speaker, and microphone.

**Architecture:** A single PWA with multiple modes (Signer, Relay, Airdrop Broadcaster, Airdrop Claimer, Agent). The core primitive: sign Monad tx offline → encode as ggwave audio → play via speaker → receiving device decodes via mic → broadcasts to Monad. PWA ensures installability on mobile home screens and access to Web Audio API + microphone.

**Tech Stack:** TypeScript, React 18, Vite, ggwave (WebAssembly), ethers.js v6, Web Audio API, PWA (service worker + manifest), Monad testnet

**Hackathon:** Monad Blitz Mumbai V3 — June 20, 2026 (6-hour build sprint)

**Repo:** `/Users/kunal/melody-pay` (forked from monad-developers/monad-blitz-mumbai)

---

## Full Context (Knowledge Transfer)

### What is MelodyPay?

MelodyPay uses [ggwave](https://github.com/ggerganov/ggwave) (by Georgi Gerganov, creator of whisper.cpp/llama.cpp) to transmit signed Monad transactions over sound waves. No internet needed on the signing device. No QR codes. No NFC. Just sound.

### What is ggwave?

- Open-source C/C++ library with WASM build for browsers
- Transmits small data payloads (up to ~140 bytes per burst at audible frequencies) via audio
- Works at audible frequencies (you can hear it — sounds like modem/fax noise) or ultrasonic (inaudible)
- NPM package: `ggwave` (provides the WASM module)
- Used by [GibberLink](https://github.com/AISt-Innovations/gibberlink) — viral project where AI agents on phone calls detect each other and switch to ggwave for efficient communication

### What is Monad?

- High-performance EVM-compatible L1 blockchain
- 10,000 TPS, sub-second finality (~500ms blocks)
- Full EVM compatibility (standard Solidity, ethers.js, Foundry all work)
- Testnet RPC: `https://testnet-rpc.monad.xyz` (verify at hackathon)
- Chain ID: 10143 (verify at hackathon)
- Native token: MON
- Near-zero gas fees

### Why PWA?

- Works on **any device** with a modern browser (Android Chrome, iOS Safari, Desktop Chrome/Firefox)
- Can be "installed" to home screen on mobile — feels like a native app
- Has access to Web Audio API (speaker output) and `getUserMedia` (microphone input)
- Works offline (service worker caches the app shell)
- No app store deployment needed — just open a URL
- Perfect for hackathon: one codebase, all platforms

### Key Technical Constraint: ggwave payload size

- ggwave transmits ~140 bytes per burst at audible frequencies
- A signed EVM transaction (type 2, EIP-1559) is approximately 110-200 bytes in raw RLP encoding
- A simple MON transfer (no calldata) is on the smaller end (~110 bytes raw)
- **Strategy:** Transmit the raw signed tx bytes (not hex string) to fit in one burst. If too large, split into 2 chunks with a sequence header byte.

### Design Decisions

1. **PWA over native app** — one codebase for all devices, no app store
2. **Single app, multiple modes** — user picks their role (Signer, Relay, Broadcaster, Claimer)
3. **ggwave audible protocol** — use audible mode for the hackathon demo (dramatic, visible, theatrical). Can switch to ultrasonic for production.
4. **ethers.js v6** — for transaction construction and signing (works in browser)
5. **No smart contract required for core demo** — just native MON transfers. Optional: SonicDrop contract for airdrop claims.
6. **Offline-first for Signer mode** — the Signer page works with zero network access. It only needs a private key and tx params.

---

## Project Structure

```
melody-pay/
├── src/
│   ├── main.tsx                    -- React entry point
│   ├── App.tsx                     -- Router between modes
│   ├── core/
│   │   ├── ggwave.ts              -- ggwave WASM init + encode/decode helpers
│   │   ├── tx-builder.ts          -- build + sign Monad transactions (offline)
│   │   ├── broadcaster.ts         -- encode signed tx → play audio via Web Audio API
│   │   └── listener.ts            -- mic input → decode ggwave → extract signed tx
│   ├── pages/
│   │   ├── Home.tsx               -- mode selection (Signer / Relay / Airdrop / Agent)
│   │   ├── Signer.tsx             -- offline: sign tx, play as sound
│   │   ├── Relay.tsx              -- online: listen for sound, broadcast to Monad
│   │   ├── AirdropBroadcast.tsx   -- plays airdrop claims on loop via speakers
│   │   ├── AirdropClaim.tsx       -- listens for claims, submits to chain
│   │   └── AgentMode.tsx          -- agent-to-agent demo (stretch goal)
│   ├── components/
│   │   ├── WaveVisualizer.tsx     -- audio waveform animation (visual feedback)
│   │   └── TxStatus.tsx           -- shows tx hash + explorer link
│   └── pwa/
│       ├── manifest.json          -- PWA manifest (name, icons, theme)
│       └── sw.ts                  -- service worker (offline caching)
├── public/
│   ├── icons/                     -- PWA icons (192x192, 512x512)
│   └── favicon.ico
├── index.html                     -- Vite entry HTML
├── vite.config.ts                 -- Vite config with PWA plugin
├── package.json
├── tsconfig.json
└── README.md                      -- project README (for hackathon submission)
```

---

## Task 1: Project Setup (PWA + Vite + React)

**Files:**

- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/pwa/manifest.json`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "melody-pay",
  "version": "0.1.0",
  "private": true,
  "description": "Sound-based Monad transactions via ggwave. PWA.",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "ethers": "^6.13.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.3.0",
    "vite": "^5.4.0",
    "vite-plugin-pwa": "^0.20.0"
  }
}
```

- [ ] **Step 2: Create vite.config.ts**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "MelodyPay",
        short_name: "MelodyPay",
        description: "Sound-based Monad transactions",
        theme_color: "#7c3aed",
        background_color: "#0f0f0f",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,wasm}"],
      },
    }),
  ],
});
```

- [ ] **Step 3: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#7c3aed" />
    <title>MelodyPay</title>
    <link rel="manifest" href="/manifest.webmanifest" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

- [ ] **Step 5: Create main.tsx and App.tsx (router shell)**

Create `src/main.tsx`:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

Create `src/App.tsx`:

```tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Home } from "./pages/Home";
import { Signer } from "./pages/Signer";
import { Relay } from "./pages/Relay";
import { AirdropBroadcast } from "./pages/AirdropBroadcast";
import { AirdropClaim } from "./pages/AirdropClaim";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/sign" element={<Signer />} />
        <Route path="/relay" element={<Relay />} />
        <Route path="/airdrop/broadcast" element={<AirdropBroadcast />} />
        <Route path="/airdrop/claim" element={<AirdropClaim />} />
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 6: Install dependencies and verify dev server starts**

```bash
cd /Users/kunal/melody-pay
npm install
npm run dev
```

Expected: Vite dev server starts at http://localhost:5173

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold MelodyPay PWA with Vite + React + Router"
```

---

## Task 2: Core — ggwave Integration

**Files:**

- Create: `src/core/ggwave.ts`

**Important note on ggwave in browser:**
The `ggwave` npm package provides a WASM module. In the browser, you need to:

1. Load the WASM binary
2. Initialize the ggwave instance
3. Use it to encode (data → audio samples) and decode (audio samples → data)

The ggwave npm package API (check their docs, but roughly):

```
import ggwave from 'ggwave';
const instance = await ggwave(); // loads WASM
instance.encode(data, protocol, volume) → waveform
instance.decode(samples) → data or null
```

If the npm package doesn't work cleanly in Vite/browser, alternative approach:

- Download ggwave.js + ggwave.wasm from the ggwave GitHub releases
- Place in `public/` folder
- Load via a script tag or dynamic import

- [ ] **Step 1: Create ggwave wrapper**

Create `src/core/ggwave.ts`:

```typescript
/**
 * ggwave wrapper for browser.
 *
 * ggwave encodes/decodes small data payloads as audio.
 * We use it to transmit signed Monad transactions via sound.
 *
 * Protocol options:
 *   0 = GGWAVE_TX_PROTOCOL_AUDIBLE_NORMAL (audible, ~8.5 bytes/sec)
 *   1 = GGWAVE_TX_PROTOCOL_AUDIBLE_FAST (audible, ~16 bytes/sec)
 *   2 = GGWAVE_TX_PROTOCOL_AUDIBLE_FASTEST (audible, ~32 bytes/sec)
 *   3 = GGWAVE_TX_PROTOCOL_ULTRASOUND_NORMAL (inaudible)
 *   4 = GGWAVE_TX_PROTOCOL_ULTRASOUND_FAST
 *   5 = GGWAVE_TX_PROTOCOL_ULTRASOUND_FASTEST
 *
 * For demo: use protocol 2 (audible fastest) — dramatic sound + fast transfer.
 * For production: use protocol 5 (ultrasound fastest) — inaudible.
 *
 * PAYLOAD LIMIT: ~140 bytes per transmission at audible, up to ~256 at ultrasonic.
 * A signed Monad transfer tx (no calldata) is ~110 bytes raw RLP.
 * Strategy: transmit hex-encoded signed tx. If >140 chars, chunk into parts.
 */

let ggwaveModule: any = null;
let ggwaveInstance: any = null;

const SAMPLE_RATE = 48000;

export async function initGGWave(): Promise<void> {
  if (ggwaveInstance) return;

  // The ggwave npm package exports a factory function
  // If npm package doesn't work, fall back to loading from public/ggwave.js
  try {
    const ggwaveFactory = (await import("ggwave")).default;
    ggwaveModule = await ggwaveFactory();
    const params = ggwaveModule.getDefaultParameters();
    params.sampleRateInp = SAMPLE_RATE;
    params.sampleRateOut = SAMPLE_RATE;
    ggwaveInstance = ggwaveModule.init(params);
  } catch (e) {
    console.error("Failed to init ggwave:", e);
    throw new Error(
      "ggwave WASM failed to load. Check that the package is installed.",
    );
  }
}

export function isInitialized(): boolean {
  return ggwaveInstance !== null;
}

/**
 * Encode a string payload into PCM audio samples (Float32Array).
 * The audio can be played via Web Audio API.
 */
export function encode(payload: string, protocol: number = 2): Float32Array {
  if (!ggwaveInstance) throw new Error("Call initGGWave() first");
  const waveform = ggwaveModule.encode(
    ggwaveInstance,
    payload,
    protocol,
    10, // volume
  );
  return new Float32Array(waveform);
}

/**
 * Feed audio samples from the microphone and attempt to decode.
 * Returns the decoded string if ggwave data is found, null otherwise.
 * Call this continuously with chunks from the mic.
 */
export function decode(samples: Float32Array): string | null {
  if (!ggwaveInstance) throw new Error("Call initGGWave() first");
  const result = ggwaveModule.decode(ggwaveInstance, samples);
  if (result && result.length > 0) {
    return new TextDecoder().decode(new Uint8Array(result));
  }
  return null;
}

export { SAMPLE_RATE };
```

- [ ] **Step 2: Commit**

```bash
git add src/core/ggwave.ts
git commit -m "feat: ggwave WASM wrapper for browser audio encode/decode"
```

---

## Task 3: Core — Transaction Builder

**Files:**

- Create: `src/core/tx-builder.ts`

- [ ] **Step 1: Create tx-builder**

Create `src/core/tx-builder.ts`:

```typescript
import { ethers, Wallet } from "ethers";

/**
 * Monad testnet configuration.
 * Verify these values at the hackathon!
 */
export const MONAD_CONFIG = {
  chainId: 10143,
  rpcUrl: "https://testnet-rpc.monad.xyz",
  explorerUrl: "https://explorer.monad.xyz",
};

export interface TxParams {
  to: string;
  value: string; // in MON (e.g., "0.01")
  nonce: number;
  gasLimit?: number;
  maxFeePerGas?: string; // in gwei
  maxPriorityFeePerGas?: string; // in gwei
}

/**
 * Sign a Monad transaction offline.
 * This function needs NO internet. Just a private key and tx params.
 * Returns the serialized signed transaction (hex string starting with 0x).
 */
export async function signTransaction(
  params: TxParams,
  privateKey: string,
): Promise<string> {
  const wallet = new Wallet(privateKey);

  const tx = {
    to: params.to,
    value: ethers.parseEther(params.value),
    chainId: MONAD_CONFIG.chainId,
    nonce: params.nonce,
    gasLimit: params.gasLimit || 21000,
    maxFeePerGas: ethers.parseUnits(params.maxFeePerGas || "1", "gwei"),
    maxPriorityFeePerGas: ethers.parseUnits(
      params.maxPriorityFeePerGas || "1",
      "gwei",
    ),
    type: 2,
  };

  return await wallet.signTransaction(tx);
}

/**
 * Broadcast a signed transaction to Monad.
 * Requires internet. Used by the Relay device.
 */
export async function broadcastTransaction(signedTx: string): Promise<string> {
  const provider = new ethers.JsonRpcProvider(MONAD_CONFIG.rpcUrl);
  const response = await provider.broadcastTransaction(signedTx);
  return response.hash;
}

/**
 * Get the current nonce for an address.
 * Requires internet. The Relay can display this for the Signer to input manually.
 */
export async function getNonce(address: string): Promise<number> {
  const provider = new ethers.JsonRpcProvider(MONAD_CONFIG.rpcUrl);
  return await provider.getTransactionCount(address);
}

/**
 * Get wallet address from a private key (no internet needed).
 */
export function getAddress(privateKey: string): string {
  return new Wallet(privateKey).address;
}

/**
 * Get balance of an address (requires internet).
 */
export async function getBalance(address: string): Promise<string> {
  const provider = new ethers.JsonRpcProvider(MONAD_CONFIG.rpcUrl);
  const balance = await provider.getBalance(address);
  return ethers.formatEther(balance);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/core/tx-builder.ts
git commit -m "feat: Monad transaction builder (offline signing + broadcast)"
```

---

## Task 4: Core — Audio Broadcaster & Listener

**Files:**

- Create: `src/core/broadcaster.ts`
- Create: `src/core/listener.ts`

- [ ] **Step 1: Create broadcaster (plays encoded audio)**

Create `src/core/broadcaster.ts`:

```typescript
import { encode, initGGWave, SAMPLE_RATE } from "./ggwave";

/**
 * Play a payload as ggwave audio through the device speaker.
 * Returns a promise that resolves when playback finishes.
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
 * Play a payload repeatedly on a loop with a gap between plays.
 * Returns a stop function.
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
```

- [ ] **Step 2: Create listener (decodes from microphone)**

Create `src/core/listener.ts`:

```typescript
import { decode, initGGWave, SAMPLE_RATE } from "./ggwave";

export type OnDecodeCallback = (data: string) => void;

/**
 * Start listening on the microphone for ggwave-encoded data.
 * Calls `onDecode` whenever a valid payload is received.
 * Returns a stop function.
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
      sampleRate: SAMPLE_RATE,
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

  const stop = () => {
    processor.disconnect();
    source.disconnect();
    stream.getTracks().forEach((t) => t.stop());
    audioCtx.close();
  };

  return { stop };
}
```

- [ ] **Step 3: Commit**

```bash
git add src/core/broadcaster.ts src/core/listener.ts
git commit -m "feat: audio broadcaster (speaker) and listener (mic) using Web Audio API"
```

---

## Task 5: Page — Home (Mode Selection)

**Files:**

- Create: `src/pages/Home.tsx`

- [ ] **Step 1: Create Home page**

Create `src/pages/Home.tsx`:

```tsx
import { Link } from "react-router-dom";

export function Home() {
  return (
    <div
      style={{
        padding: 20,
        fontFamily: "system-ui",
        maxWidth: 400,
        margin: "0 auto",
      }}
    >
      <h1 style={{ fontSize: 28 }}>🎵 MelodyPay</h1>
      <p style={{ color: "#888" }}>Sound-based transactions on Monad</p>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          marginTop: 24,
        }}
      >
        <Link to="/sign" style={cardStyle("#dc2626")}>
          <h3>🔒 Sign & Send (Offline)</h3>
          <p>Sign a transaction offline, transmit via sound</p>
        </Link>

        <Link to="/relay" style={cardStyle("#16a34a")}>
          <h3>🌐 Relay (Online)</h3>
          <p>Listen for sound, broadcast to Monad</p>
        </Link>

        <Link to="/airdrop/broadcast" style={cardStyle("#7c3aed")}>
          <h3>📡 Airdrop: Broadcast</h3>
          <p>Play claim sounds on speakers</p>
        </Link>

        <Link to="/airdrop/claim" style={cardStyle("#ea580c")}>
          <h3>📱 Airdrop: Claim</h3>
          <p>Listen & claim tokens from the air</p>
        </Link>
      </div>

      <p style={{ marginTop: 32, fontSize: 12, color: "#666" }}>
        Built for Monad Blitz Mumbai V3
      </p>
    </div>
  );
}

const cardStyle = (borderColor: string): React.CSSProperties => ({
  display: "block",
  padding: 16,
  border: `2px solid ${borderColor}`,
  borderRadius: 12,
  textDecoration: "none",
  color: "white",
  background: "#1a1a1a",
});
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/Home.tsx
git commit -m "feat: home page with mode selection"
```

---

## Task 6: Page — Signer (Offline / Air-Gapped)

**Files:**

- Create: `src/pages/Signer.tsx`

- [ ] **Step 1: Create Signer page**

Create `src/pages/Signer.tsx`:

```tsx
import { useState } from "react";
import { signTransaction, getAddress } from "../core/tx-builder";
import { playPayload } from "../core/broadcaster";

export function Signer() {
  const [privateKey, setPrivateKey] = useState("");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("0.01");
  const [nonce, setNonce] = useState("0");
  const [status, setStatus] = useState("");
  const [playing, setPlaying] = useState(false);

  const walletAddress = privateKey.length === 66 ? getAddress(privateKey) : "";

  async function handleSign() {
    try {
      setStatus("Signing...");
      const signedTx = await signTransaction(
        { to, value: amount, nonce: parseInt(nonce) },
        privateKey,
      );
      setStatus(`Signed! (${signedTx.length} chars). Playing sound...`);
      setPlaying(true);

      // Transmit signed tx via sound
      await playPayload(signedTx);

      setPlaying(false);
      setStatus("✅ Sound transmitted! The relay device should pick it up.");
    } catch (err: any) {
      setStatus(`❌ Error: ${err.message}`);
      setPlaying(false);
    }
  }

  return (
    <div
      style={{
        padding: 20,
        fontFamily: "system-ui",
        maxWidth: 400,
        margin: "0 auto",
      }}
    >
      <h2>🔒 Offline Signer</h2>
      <p style={{ color: "#dc2626", fontSize: 12 }}>
        ⚠️ This device does NOT need internet. Keys stay here.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <input
          type="password"
          placeholder="Private key (0x...)"
          value={privateKey}
          onChange={(e) => setPrivateKey(e.target.value)}
          style={inputStyle}
        />
        {walletAddress && (
          <p style={{ fontSize: 12, color: "#888" }}>From: {walletAddress}</p>
        )}
        <input
          placeholder="To address (0x...)"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          style={inputStyle}
        />
        <input
          placeholder="Amount (MON)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={inputStyle}
        />
        <input
          placeholder="Nonce (ask relay device)"
          value={nonce}
          onChange={(e) => setNonce(e.target.value)}
          style={inputStyle}
        />
        <button
          onClick={handleSign}
          disabled={playing || !to || !privateKey}
          style={btnStyle}
        >
          {playing ? "♪ Playing..." : "🔊 Sign & Send via Sound"}
        </button>
      </div>

      {status && <p style={{ marginTop: 12 }}>{status}</p>}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: 10,
  borderRadius: 8,
  border: "1px solid #333",
  background: "#111",
  color: "white",
  fontSize: 14,
};
const btnStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 8,
  border: "none",
  background: "#dc2626",
  color: "white",
  fontSize: 16,
  cursor: "pointer",
};
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/Signer.tsx
git commit -m "feat: signer page - sign offline + play signed tx as sound"
```

---

## Task 7: Page — Relay (Online / Broadcasts to Monad)

**Files:**

- Create: `src/pages/Relay.tsx`

- [ ] **Step 1: Create Relay page**

Create `src/pages/Relay.tsx`:

```tsx
import { useState } from "react";
import { startListening } from "../core/listener";
import { broadcastTransaction, MONAD_CONFIG } from "../core/tx-builder";

export function Relay() {
  const [status, setStatus] = useState("Tap to start listening");
  const [listening, setListening] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [stopFn, setStopFn] = useState<(() => void) | null>(null);

  async function handleListen() {
    setStatus("🎤 Listening for sound...");
    setListening(true);

    const { stop } = await startListening(async (data) => {
      // data should be a signed tx (0x...)
      if (!data.startsWith("0x")) {
        setStatus(
          `Heard something but not a valid tx: ${data.slice(0, 20)}...`,
        );
        return;
      }

      setStatus("📡 Received signed tx! Broadcasting to Monad...");
      try {
        const hash = await broadcastTransaction(data);
        setTxHash(hash);
        setStatus(`✅ Transaction confirmed!`);
        stop();
        setListening(false);
      } catch (err: any) {
        setStatus(`❌ Broadcast failed: ${err.message}`);
      }
    });

    setStopFn(() => stop);
  }

  function handleStop() {
    stopFn?.();
    setListening(false);
    setStatus("Stopped");
  }

  return (
    <div
      style={{
        padding: 20,
        fontFamily: "system-ui",
        maxWidth: 400,
        margin: "0 auto",
      }}
    >
      <h2>🌐 Online Relay</h2>
      <p style={{ color: "#16a34a", fontSize: 12 }}>
        ✓ This device has internet. It broadcasts received txs to Monad.
      </p>

      <button
        onClick={listening ? handleStop : handleListen}
        style={{ ...btnStyle, background: listening ? "#666" : "#16a34a" }}
      >
        {listening ? "⏹ Stop Listening" : "🎤 Start Listening"}
      </button>

      <p style={{ marginTop: 12 }}>{status}</p>

      {txHash && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            background: "#111",
            borderRadius: 8,
          }}
        >
          <p style={{ fontSize: 12, color: "#888" }}>Transaction Hash:</p>
          <p style={{ fontSize: 11, wordBreak: "break-all" }}>{txHash}</p>
          <a
            href={`${MONAD_CONFIG.explorerUrl}/tx/${txHash}`}
            target="_blank"
            style={{ color: "#7c3aed" }}
          >
            View on Monad Explorer →
          </a>
        </div>
      )}
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 8,
  border: "none",
  color: "white",
  fontSize: 16,
  cursor: "pointer",
  width: "100%",
};
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/Relay.tsx
git commit -m "feat: relay page - listen for sound + broadcast to Monad"
```

---

## Task 8: Page — Airdrop Broadcaster & Claimer

**Files:**

- Create: `src/pages/AirdropBroadcast.tsx`
- Create: `src/pages/AirdropClaim.tsx`

- [ ] **Step 1: Create AirdropBroadcast page**

Create `src/pages/AirdropBroadcast.tsx`:

```tsx
import { useState, useRef } from "react";
import { playLoop } from "../core/broadcaster";
import { signTransaction } from "../core/tx-builder";

export function AirdropBroadcast() {
  const [funderKey, setFunderKey] = useState("");
  const [recipients, setRecipients] = useState("");
  const [amount, setAmount] = useState("0.01");
  const [broadcasting, setBroadcasting] = useState(false);
  const [count, setCount] = useState(0);
  const stopRef = useRef<(() => void) | null>(null);

  async function startBroadcast() {
    // For the demo: broadcast pre-signed transactions to each recipient
    // In production: would use a claim contract
    const addresses = recipients
      .split("\n")
      .map((a) => a.trim())
      .filter(Boolean);
    if (addresses.length === 0) return;

    setBroadcasting(true);
    let nonce = 0; // would fetch from chain in real usage

    // Sign a tx for the first recipient and broadcast on loop
    const signedTx = await signTransaction(
      { to: addresses[0], value: amount, nonce },
      funderKey,
    );

    const { stop } = playLoop(signedTx, 4000);
    stopRef.current = stop;
    setCount((c) => c + 1);
  }

  function stopBroadcast() {
    stopRef.current?.();
    setBroadcasting(false);
  }

  return (
    <div
      style={{
        padding: 20,
        fontFamily: "system-ui",
        maxWidth: 400,
        margin: "0 auto",
      }}
    >
      <h2>📡 Airdrop Broadcaster</h2>
      <p>
        Plays signed transactions via speakers on loop. Phones nearby can relay
        them.
      </p>

      <input
        type="password"
        placeholder="Funder private key"
        value={funderKey}
        onChange={(e) => setFunderKey(e.target.value)}
        style={inputStyle}
      />
      <textarea
        placeholder="Recipient addresses (one per line)"
        value={recipients}
        onChange={(e) => setRecipients(e.target.value)}
        style={{ ...inputStyle, height: 80, marginTop: 8 }}
      />
      <input
        placeholder="Amount per recipient (MON)"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        style={{ ...inputStyle, marginTop: 8 }}
      />

      <button
        onClick={broadcasting ? stopBroadcast : startBroadcast}
        style={{
          ...btnStyle,
          marginTop: 12,
          background: broadcasting ? "#666" : "#7c3aed",
        }}
      >
        {broadcasting ? "⏹ Stop" : "▶️ Start Broadcasting"}
      </button>

      {broadcasting && (
        <p style={{ marginTop: 12 }}>♪ Broadcasting... ({count} sent)</p>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: 10,
  borderRadius: 8,
  border: "1px solid #333",
  width: "100%",
  background: "#111",
  color: "white",
  fontSize: 14,
  boxSizing: "border-box",
};
const btnStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 8,
  border: "none",
  color: "white",
  fontSize: 16,
  cursor: "pointer",
  width: "100%",
};
```

- [ ] **Step 2: Create AirdropClaim page**

Create `src/pages/AirdropClaim.tsx`:

```tsx
import { useState } from "react";
import { startListening } from "../core/listener";
import { broadcastTransaction, MONAD_CONFIG } from "../core/tx-builder";

export function AirdropClaim() {
  const [status, setStatus] = useState("Tap to listen for airdrops");
  const [listening, setListening] = useState(false);
  const [claims, setClaims] = useState<string[]>([]);
  const [stopFn, setStopFn] = useState<(() => void) | null>(null);

  async function handleListen() {
    setStatus("🎤 Listening for airdrop sounds...");
    setListening(true);

    const { stop } = await startListening(async (data) => {
      if (!data.startsWith("0x")) return;

      setStatus("📡 Received airdrop tx! Broadcasting...");
      try {
        const hash = await broadcastTransaction(data);
        setClaims((prev) => [...prev, hash]);
        setStatus(`✅ Claimed! Listening for more...`);
      } catch (err: any) {
        // Might fail if already claimed or nonce issue
        setStatus(`⚠️ ${err.message}. Still listening...`);
      }
    });

    setStopFn(() => stop);
  }

  function handleStop() {
    stopFn?.();
    setListening(false);
    setStatus("Stopped");
  }

  return (
    <div
      style={{
        padding: 20,
        fontFamily: "system-ui",
        maxWidth: 400,
        margin: "0 auto",
      }}
    >
      <h2>📱 Airdrop Claimer</h2>
      <p>Hold your phone near the speakers to claim tokens from the air.</p>

      <button
        onClick={listening ? handleStop : handleListen}
        style={{ ...btnStyle, background: listening ? "#666" : "#ea580c" }}
      >
        {listening ? "⏹ Stop" : "🎤 Listen for Airdrops"}
      </button>

      <p style={{ marginTop: 12 }}>{status}</p>

      {claims.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h3>Claims ({claims.length}):</h3>
          {claims.map((hash, i) => (
            <a
              key={i}
              href={`${MONAD_CONFIG.explorerUrl}/tx/${hash}`}
              target="_blank"
              style={{
                display: "block",
                color: "#7c3aed",
                fontSize: 12,
                marginTop: 4,
              }}
            >
              {hash.slice(0, 20)}...
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 8,
  border: "none",
  color: "white",
  fontSize: 16,
  cursor: "pointer",
  width: "100%",
};
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/AirdropBroadcast.tsx src/pages/AirdropClaim.tsx
git commit -m "feat: airdrop broadcaster + claimer pages"
```

---

## Task 9: Final Polish — Styling + PWA Icons + README

**Files:**

- Update: `README.md`
- Create: `public/icons/` (placeholder icons)

- [ ] **Step 1: Write hackathon README**

Replace `README.md` with:

```markdown
# 🎵 MelodyPay

> Sign transactions offline. Transmit via sound. Broadcast to Monad.

## What is MelodyPay?

A PWA that uses [ggwave](https://github.com/ggerganov/ggwave) to transmit signed Monad transactions over sound waves. Works on any device with a browser — phones, laptops, tablets.

**No internet on the signing device. No QR codes. No NFC. Just sound.**

## Demos

### 🔒 Air-Gapped Wallet

Sign a Monad transaction on an offline device → play via speaker → online device hears it → broadcasts to Monad in <1 second.

### 📡 Sonic Airdrop

Speakers at an event play signed transactions on loop. Phones nearby decode them and broadcast to claim tokens. Proof of physical presence.

### 🤖 Agent Whispering (stretch)

Two AI agents transact over sound waves — no internet between them.

## How it Works
```

Offline Device Online Device
┌────────────┐ ♪ sound ♪ ┌────────────┐ ┌───────────┐
│ Sign tx │ ─────────────▶ │ Decode │ ───▶ │ Monad │
│ Play audio │ │ Broadcast │ │ Chain │
└────────────┘ └────────────┘ └───────────┘

````

## Tech Stack

- **ggwave** — data-over-sound via WebAssembly
- **ethers.js v6** — offline tx signing + broadcast
- **React + Vite** — PWA frontend
- **Monad testnet** — sub-second finality, near-zero gas

## Run Locally

```bash
npm install
npm run dev
````

Open on two devices (or two browser tabs). One as Signer, one as Relay.

## Why Monad?

- **Sub-second finality** — hear the sound, see the confirmation almost instantly
- **Near-zero gas** — micro-transactions via sound are practical
- **10,000 TPS** — handles many simultaneous claims (sonic airdrop at scale)

## Built for Monad Blitz Mumbai V3 — The Agent Economy

````

- [ ] **Step 2: Create placeholder PWA icons**

```bash
mkdir -p public/icons
# Create simple placeholder icons (can replace with real ones)
# For hackathon: any 192x192 and 512x512 PNG works
````

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "docs: README + PWA setup for MelodyPay"
```

---

## Demo Script (Hackathon Pitch — 2 minutes)

1. **Hook (10s):** "What if your crypto wallet didn't need internet to transact? What if you could pay someone just by playing a sound?"

2. **Demo: Air-Gapped Payment (45s):**
   - Open MelodyPay on Phone A (airplane mode ON — no internet)
   - Open MelodyPay on Phone B (has internet)
   - Phone A: sign 0.01 MON → tap "Send via Sound" → _melodic ggwave plays_
   - Phone B: listening → "Received! Broadcasting..." → tx hash appears
   - Show Monad explorer: confirmed in <1 second
   - "Phone A never touched the internet. The sound WAS the transaction."

3. **Demo: Sonic Airdrop (30s):**
   - Laptop speakers: broadcasting on loop
   - Hold up 3 phones → they all claim simultaneously
   - "Every phone in this room could receive tokens right now. No QR codes. No links. Just be here."

4. **Why Monad (15s):** "Sub-second finality makes sound-based payments feel instant. Near-zero gas makes every micro-payment viable. You can't do this on Ethereum — by the time the tx confirms, the moment is gone."

5. **Close (10s):** "MelodyPay. Your keys never touch the internet. The melody is the transaction."

---

## Critical Pre-Hackathon Verification

- [ ] **Test ggwave in browser:** `npm install ggwave`, verify WASM loads in Vite, encode "hello" → play → decode on another tab
- [ ] **Test signed tx payload size:** Sign a simple MON transfer, check byte length. Must be ≤140 bytes for single-burst or plan chunking strategy.
- [ ] **Test mic permissions on mobile Chrome/Safari:** PWA must prompt for mic access
- [ ] **Monad testnet connectivity:** verify RPC URL and chain ID at the hackathon
- [ ] **Fund test wallets:** 2+ wallets with testnet MON
- [ ] **Test device-to-device:** Play ggwave on one phone speaker, decode on another phone's mic. Verify it works in a noisy room.
