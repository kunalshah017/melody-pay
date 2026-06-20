# MelodyPay

> Sound-based crypto payments on the Monad testnet. Sign transactions completely offline and broadcast them over audio.

MelodyPay is a web application that enables air-gapped cryptocurrency transactions on the **Monad testnet** using [ggwave](https://github.com/ggerganov/ggwave) — an open-source data-over-sound library. The sender keeps their private key completely offline while the receiver (with internet access) handles broadcasting the final signed transaction to the chain.

---

## How It Works

MelodyPay splits the transaction flow across two roles — a **Sender** and a **Receiver**:

```
Receiver                           Sender
   │                                  │
   │  1. Enter amount + wallet addr   │
   │  2. Broadcast PAY|...|... audio  │
   │─────────────────────────────────▶│
   │                                  │  3. Mic picks up the request
   │                                  │  4. Signs tx OFFLINE (no network)
   │                                  │  5. Plays signed tx as audio
   │◀─────────────────────────────────│
   │  6. Mic picks up signed tx       │
   │  7. Verifies + submits to Monad  │
   │  8. Displays tx hash             │
```

**Key properties:**
- The private key **never touches the internet**. All signing is done in-browser using only `ethers.js`.
- Any device with a speaker can send; any device with a microphone + internet can receive and relay.
- Built on Monad's testnet (Chain ID `10143`), targeting ~400ms block time and sub-second finality.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build Tool | Vite 5 |
| Routing | React Router v6 |
| Animation | Framer Motion 12, GSAP 3 |
| Smooth Scroll | Lenis |
| Styling | Tailwind CSS v3 |
| Icons | Lucide React |
| Audio Protocol | ggwave (WASM, loaded via `<script>` tag) |
| Blockchain | ethers.js v6 |
| Network | Monad Testnet (Chain ID 10143) |
| PWA | vite-plugin-pwa |

---

## Project Structure

```
melody-pay/
├── index.html               # Entry point — loads ggwave.js globally
├── vite.config.ts           # Vite + PWA config
├── tailwind.config.js       # Tailwind theme (custom colors, fonts)
├── public/
│   ├── ggwave.js            # ggwave WASM library
│   └── manifest.webmanifest # PWA manifest
└── src/
    ├── main.tsx             # React app bootstrap
    ├── index.css            # Global styles and Tailwind base
    ├── App.tsx              # Router, Navbar, ProtectedRoute, page transitions
    ├── components/          # Reusable animation components
    │   ├── Copy.tsx         # Animated text reveal (block highlight effect)
    │   ├── GsapColorCycle.tsx # GSAP color-cycling text animation
    │   └── TextSwap.tsx     # Animated word swap component
    ├── core/                # Core protocol logic (framework-independent)
    │   ├── ggwave.ts        # ggwave WASM wrapper — encode/decode audio
    │   ├── broadcaster.ts   # Play encoded payloads via Web Audio API
    │   ├── listener.ts      # Mic listener — captures and decodes ggwave audio
    │   └── tx-builder.ts   # Transaction signing, broadcasting, balance queries
    └── pages/
        ├── Home.tsx         # Landing page with animated sections
        ├── Onboarding.tsx   # Private key import (wallet setup)
        ├── Dashboard.tsx    # Main app hub with Send/Receive actions
        ├── SendPayment.tsx  # Sender flow: listen → sign offline → broadcast audio
        ├── ReceivePayment.tsx # Receiver flow: broadcast request → listen → submit
        ├── Relay.tsx        # Minimal relay page (listen for signed tx → submit)
        ├── Signer.tsx       # Offline signing utility page
        ├── AirdropBroadcast.tsx # Airdrop sender utility
        └── AirdropClaim.tsx    # Airdrop receiver utility
```

---

## Core Module: `src/core/`

### `ggwave.ts`
Wraps the ggwave WebAssembly module. Exposes:
- `initGGWave()` — initializes the WASM instance (idempotent)
- `encode(payload, protocol?, volume?)` — encodes a string into a `Float32Array` of PCM audio
- `decode(samples)` — feeds mic samples and returns decoded string or `null`
- `Protocol` enum — audible and ultrasound protocol variants

Supported protocols:
| ID | Name |
|---|---|
| 0 | `AUDIBLE_NORMAL` |
| 1 | `AUDIBLE_FAST` (default) |
| 2 | `AUDIBLE_FASTEST` |
| 3 | `ULTRASOUND_NORMAL` |
| 4 | `ULTRASOUND_FAST` |
| 5 | `ULTRASOUND_FASTEST` |

### `broadcaster.ts`
Plays encoded payloads through the speaker using the Web Audio API:
- `playPayload(payload, protocol?)` — plays once
- `playLoop(payload, intervalMs, protocol?)` — plays on repeat; returns a `stop()` handle

### `listener.ts`
Opens the microphone and feeds samples to ggwave for decoding:
- `startListening(onDecode)` — starts mic capture; calls `onDecode(data)` when a packet is received. Returns a `stop()` handle.

### `tx-builder.ts`
Handles all Monad transaction logic via ethers.js:
- `signTransaction(params, privateKey)` — signs a tx **offline** (no network call)
- `broadcastTransaction(signedTx)` — submits a signed tx to Monad testnet RPC
- `getNonce(address)` — fetches nonce from the network
- `getAddress(privateKey)` — derives address from private key (offline)
- `getBalance(address)` — fetches MON balance

**Monad Testnet Config:**
```ts
chainId: 10143
rpcUrl: "https://testnet-rpc.monad.xyz"
explorerUrl: "https://testnet.monadscan.com"
```

> ⚠️ Monad charges on `gas_limit`, not gas used. Native transfers hardcode `gasLimit: 21000` to minimize cost.

---

## Audio Payload Format

```
PAY|<to_address>|<amount_in_MON>|<nonce>
```

Example:
```
PAY|0xAbCd...1234|0.01|42
```

The signed transaction response is the raw hex serialization from ethers.js (`0x...`), which the receiver decodes and submits directly to the RPC.

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm

### Install & Run

```bash
git clone https://github.com/kunalshah017/melody-pay.git
cd melody-pay
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

> **Important:** The `ggwave.js` WASM file must be present in the `public/` directory. This is loaded globally via a `<script>` tag in `index.html` before the React app mounts.

### Build for Production

```bash
npm run build
npm run preview
```

---

## App Routes

| Path | Page | Auth Required |
|---|---|---|
| `/` | Landing page | No |
| `/onboarding` | Import wallet (private key) | No |
| `/app` | Dashboard | Yes |
| `/send` | Send payment (Sender flow) | Yes |
| `/receive` | Receive payment (Receiver flow) | Yes |

Auth is enforced via a `ProtectedRoute` component that checks for `melodypay_pk` in `localStorage`. If missing, users are redirected to `/onboarding`.

---

## Wallet Security

- Private keys are stored in **browser `localStorage`** under the key `melodypay_pk`.
- Keys are **never transmitted** to any server. All signing happens locally using ethers.js.
- This is a **testnet demo**. Never use a mainnet private key.
- Use a dedicated testnet wallet. You can get testnet MON from the [Monad faucet](https://faucet.monad.xyz).

---

## PWA Support

MelodyPay is configured as a Progressive Web App via `vite-plugin-pwa`:
- Auto-updates via `registerType: "autoUpdate"`
- Caches all `.js`, `.css`, `.html`, and `.wasm` assets via Workbox
- Installable on desktop and mobile
- Works offline for signing (only broadcasting requires internet)

---

## Browser Requirements

- **Microphone access** is required for listening/receiving.
- **Speaker output** is required for sending.
- The Web Audio API (`AudioContext`, `ScriptProcessorNode`) must be supported.
- Tested on Chromium-based browsers (Chrome, Edge). Firefox support may vary due to AudioContext constraints.

---

## Development Notes

- `Math.random()` is used inside animation `transition` durations for the equalizer bars — this is intentional for a natural, non-synchronized feel. It is non-deterministic on re-render.
- The `ScriptProcessorNode` used in `listener.ts` is deprecated but remains the most compatible option for real-time audio processing in browsers.
- Page transitions use Framer Motion's `AnimatePresence` with `mode="wait"` for clean sequential animations.

---

## License

MIT
