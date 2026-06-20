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

## How it Works

```
Offline Device                    Online Device
┌────────────┐   ♪ sound ♪   ┌────────────┐     ┌───────────┐
│  Sign tx   │ ────────────▶ │   Decode   │ ──▶ │   Monad   │
│ Play audio │               │  Broadcast │     │   Chain   │
└────────────┘               └────────────┘     └───────────┘
```

## Tech Stack

- **ggwave** — data-over-sound via WebAssembly
- **ethers.js v6** — offline tx signing + broadcast
- **React + Vite** — PWA frontend
- **Monad testnet** — 400ms blocks, 800ms finality, near-zero gas

## Run Locally

```bash
npm install
npm run dev
```

Open on two devices (or two browser tabs). One as Signer, one as Relay.

## Why Monad?

- **Sub-second finality (800ms)** — hear the sound, see the confirmation almost instantly
- **Near-zero gas** — micro-transactions via sound are practical
- **10,000 TPS** — handles many simultaneous claims (sonic airdrop at scale)
- **Charges on gas_limit** — we hardcode 21000 for transfers, keeping costs minimal

## Built for Monad Blitz Mumbai V3 — The Agent Economy
