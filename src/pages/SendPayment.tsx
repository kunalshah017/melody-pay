import { useState, useRef } from "react";
import { signTransaction, getAddress } from "../core/tx-builder";
import { startListening } from "../core/listener";
import { playPayload, playChunkedPayload } from "../core/broadcaster";

type Step = "setup" | "announcing" | "listening" | "received" | "signing" | "broadcasting" | "done";

interface PaymentRequest {
    to: string;
    amount: string;
    nonce: number;
}

function normalizeKey(key: string): string {
    const trimmed = key.trim();
    return trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
}

function tryGetAddress(key: string): string {
    try {
        const normalized = normalizeKey(key);
        if (normalized.length === 66) return getAddress(normalized);
    } catch { /* invalid key */ }
    return "";
}

export function SendPayment() {
    const [privateKey, setPrivateKey] = useState("");
    const [step, setStep] = useState<Step>("setup");
    const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
    const [status, setStatus] = useState("");
    const stopRef = useRef<(() => void) | null>(null);
    const cancelledRef = useRef(false);

    const walletAddress = tryGetAddress(privateKey);

    async function handleStart() {
        if (!walletAddress) {
            setStatus("❌ Enter a valid private key");
            return;
        }

        cancelledRef.current = false;

        // Phase 1: Broadcast address 3 times with gaps
        setStep("announcing");
        const addrMsg = `ADDR|${walletAddress}`;

        for (let i = 1; i <= 3; i++) {
            if (cancelledRef.current) return;
            setStatus(`📡 Broadcasting your address (${i}/3)...`);
            await playPayload(addrMsg);
            if (cancelledRef.current) return;
            await new Promise((r) => setTimeout(r, i < 3 ? 1000 : 1500));
        }

        if (cancelledRef.current) return;

        // Phase 2: Listen for payment request
        setStep("listening");
        setStatus("🎤 Listening for payment request from receiver...");

        const { stop } = await startListening(async (data) => {
            if (cancelledRef.current) return;
            if (!data.startsWith("PAY|")) return;

            const parts = data.split("|");
            if (parts.length !== 4) return;

            const request: PaymentRequest = {
                to: parts[1],
                amount: parts[2],
                nonce: parseInt(parts[3]),
            };

            stop();
            stopRef.current = null;
            if (cancelledRef.current) return;

            setPaymentRequest(request);
            setStep("received");
            setStatus(`💰 Received: Send ${request.amount} MON → ${request.to.slice(0, 10)}...`);

            // Auto-sign
            try {
                if (cancelledRef.current) return;
                setStep("signing");
                setStatus("✍️ Auto-signing transaction...");

                const signedTx = await signTransaction(
                    { to: request.to, value: request.amount, nonce: request.nonce },
                    normalizeKey(privateKey)
                );

                if (cancelledRef.current) return;
                setStatus("⏳ Waiting for receiver to be ready...");
                await new Promise((r) => setTimeout(r, 2000));

                if (cancelledRef.current) return;
                setStep("broadcasting");
                const numChunks = Math.ceil(signedTx.length / 134);
                setStatus(`🔊 Broadcasting signed tx (${numChunks} chunks)...`);

                await playChunkedPayload(signedTx);

                if (cancelledRef.current) return;
                setStep("done");
                setStatus("✅ Done! Signed tx sent via sound.");
            } catch (err: any) {
                if (cancelledRef.current) return;
                setStatus(`❌ Error: ${err.message}`);
                setStep("setup");
            }
        });

        stopRef.current = stop;
    }

    function handleCancel() {
        cancelledRef.current = true;
        stopRef.current?.();
        stopRef.current = null;
        setStep("setup");
        setPaymentRequest(null);
        setStatus("");
    }

    function handleReset() {
        cancelledRef.current = true;
        setStep("setup");
        setPaymentRequest(null);
        setStatus("");
    }

    return (
        <div style={{ padding: 20, fontFamily: "system-ui", maxWidth: 400, margin: "0 auto" }}>
            <h2>🔒 Send Payment (Air-Gapped)</h2>
            <p style={{ color: "#dc2626", fontSize: 12, marginBottom: 16 }}>
                ⚠️ This device does NOT need internet. Fully automatic after start.
            </p>

            {step === "setup" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <input
                        type="password"
                        placeholder="Private key (0x...)"
                        value={privateKey}
                        onChange={(e) => setPrivateKey(e.target.value)}
                        style={inputStyle}
                    />
                    {walletAddress && (
                        <p style={{ fontSize: 12, color: "#888", margin: 0 }}>
                            Your address: {walletAddress}
                        </p>
                    )}
                    <button
                        onClick={handleStart}
                        disabled={!walletAddress}
                        style={{ ...btnStyle, background: "#dc2626" }}
                    >
                        🔊 Start (fully automatic)
                    </button>
                </div>
            )}

            {step !== "setup" && step !== "done" && (
                <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 48, margin: "20px 0" }}>
                        {step === "announcing" && "📡"}
                        {step === "listening" && "🎤"}
                        {step === "received" && "💰"}
                        {step === "signing" && "✍️"}
                        {step === "broadcasting" && "🔊"}
                    </div>
                    <div style={{ background: "#1a1a1a", padding: 12, borderRadius: 8, margin: "12px 0" }}>
                        <p style={{ fontSize: 11, color: "#888", margin: 0 }}>
                            {step === "announcing" && "Phase 1: Sending address to receiver"}
                            {step === "listening" && "Phase 2: Waiting for payment request"}
                            {step === "received" && "Payment request received"}
                            {step === "signing" && "Phase 3: Signing transaction"}
                            {step === "broadcasting" && "Phase 4: Sending signed tx to receiver"}
                        </p>
                    </div>
                    <button onClick={handleCancel} style={{ ...btnStyle, background: "#666" }}>
                        Cancel
                    </button>
                </div>
            )}

            {step === "done" && (
                <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 48, margin: "20px 0" }}>✅</div>
                    <button onClick={handleReset} style={{ ...btnStyle, background: "#7c3aed" }}>
                        Send Another Payment
                    </button>
                </div>
            )}

            {status && <p style={{ marginTop: 12, fontSize: 14 }}>{status}</p>}
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
    color: "white",
    fontSize: 16,
    cursor: "pointer",
    width: "100%",
};
