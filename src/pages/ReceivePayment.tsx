import { useState, useRef } from "react";
import { getAddress, getNonce, broadcastTransaction, MONAD_CONFIG } from "../core/tx-builder";
import { startListening, startChunkedListening } from "../core/listener";
import { playPayload } from "../core/broadcaster";
import { ethers } from "ethers";

type Step = "setup" | "waiting-sender" | "fetching-nonce" | "broadcasting" | "listening" | "verifying" | "submitting" | "done";

function normalizeKey(key: string): string {
    const trimmed = key.trim();
    return trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
}

function tryGetAddress(key: string): string {
    const trimmed = key.trim();
    if (/^0x[0-9a-fA-F]{40}$/.test(trimmed)) return trimmed;
    try {
        const normalized = normalizeKey(trimmed);
        if (normalized.length === 66) return getAddress(normalized);
    } catch { /* invalid key */ }
    return "";
}

export function ReceivePayment() {
    const [privateKey, setPrivateKey] = useState("");
    const [amount, setAmount] = useState("0.01");
    const [step, setStep] = useState<Step>("setup");
    const [status, setStatus] = useState("");
    const [txHash, setTxHash] = useState("");
    const stopRef = useRef<(() => void) | null>(null);
    const cancelledRef = useRef(false);

    const walletAddress = tryGetAddress(privateKey);

    async function handleStart() {
        if (!walletAddress || !amount) {
            setStatus("❌ Enter your address and amount");
            return;
        }

        cancelledRef.current = false;

        try {
            setStep("waiting-sender");
            setStatus("🎤 Waiting for sender's address...");

            // Phase 1: Listen for sender's address
            const { stop } = await startListening(async (data) => {
                if (cancelledRef.current) return;
                if (!data.startsWith("ADDR|")) return;

                const senderAddr = data.split("|")[1];
                if (!senderAddr || senderAddr.length !== 42) return;

                stop();
                stopRef.current = null;
                if (cancelledRef.current) return;

                // Phase 2: Fetch nonce
                setStep("fetching-nonce");
                setStatus(`Got sender: ${senderAddr.slice(0, 10)}... Fetching nonce...`);

                try {
                    const senderNonce = await getNonce(senderAddr);
                    if (cancelledRef.current) return;

                    // Phase 3: Broadcast payment request 3 times with gaps
                    setStep("broadcasting");
                    const paymentRequest = `PAY|${walletAddress}|${amount}|${senderNonce}`;

                    for (let i = 1; i <= 3; i++) {
                        if (cancelledRef.current) return;
                        setStatus(`📡 Broadcasting payment request (${i}/3)...`);
                        await playPayload(paymentRequest);
                        if (cancelledRef.current) return;
                        await new Promise((r) => setTimeout(r, i < 3 ? 1000 : 1500));
                    }

                    if (cancelledRef.current) return;

                    // Phase 4: Auto-switch to listening for signed tx
                    setStep("listening");
                    setStatus("🎤 Listening for signed transaction...");

                    const { stop: stopChunked } = await startChunkedListening(
                        async (txData) => {
                            if (cancelledRef.current) return;
                            if (!txData.startsWith("0x")) return;

                            stopChunked();
                            if (cancelledRef.current) return;

                            setStep("verifying");
                            setStatus("🔍 Verifying transaction...");

                            try {
                                const parsedTx = ethers.Transaction.from(txData);
                                const expectedTo = walletAddress.toLowerCase();
                                const actualTo = parsedTx.to?.toLowerCase();
                                const actualValue = ethers.formatEther(parsedTx.value);

                                if (actualTo !== expectedTo) {
                                    setStatus(`❌ Recipient mismatch!`);
                                    setStep("setup");
                                    return;
                                }

                                if (parseFloat(actualValue) < parseFloat(amount) * 0.99) {
                                    setStatus(`❌ Amount too low! Expected ${amount}, got ${actualValue}`);
                                    setStep("setup");
                                    return;
                                }

                                if (cancelledRef.current) return;
                                setStep("submitting");
                                setStatus(`✅ Verified! Submitting to Monad...`);

                                const hash = await broadcastTransaction(txData);
                                if (cancelledRef.current) return;
                                setTxHash(hash);
                                setStep("done");
                                setStatus(`✅ Payment received! ${actualValue} MON`);
                            } catch (err: any) {
                                if (cancelledRef.current) return;
                                setStatus(`❌ Error: ${err.message}`);
                                setStep("setup");
                            }
                        },
                        (msg) => {
                            if (!cancelledRef.current) setStatus(msg);
                        },
                    );

                    stopRef.current = stopChunked;
                } catch (err: any) {
                    if (cancelledRef.current) return;
                    setStatus(`❌ Failed to fetch nonce: ${err.message}`);
                    setStep("setup");
                }
            });

            stopRef.current = stop;
        } catch (err: any) {
            if (cancelledRef.current) return;
            setStatus(`❌ Error: ${err.message}`);
            setStep("setup");
        }
    }

    function handleCancel() {
        cancelledRef.current = true;
        stopRef.current?.();
        stopRef.current = null;
        setStep("setup");
        setStatus("");
        setTxHash("");
    }

    function handleReset() {
        cancelledRef.current = true;
        setStep("setup");
        setStatus("");
        setTxHash("");
    }

    return (
        <div style={{ padding: 20, fontFamily: "system-ui", maxWidth: 400, margin: "0 auto" }}>
            <h2>🌐 Receive Payment (Online)</h2>
            <p style={{ color: "#16a34a", fontSize: 12, marginBottom: 16 }}>
                ✓ This device needs internet. Fully automatic after start.
            </p>

            {step === "setup" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <input
                        placeholder="Your address (0x...) or private key"
                        value={privateKey}
                        onChange={(e) => setPrivateKey(e.target.value)}
                        style={inputStyle}
                    />
                    {walletAddress && (
                        <p style={{ fontSize: 12, color: "#888", margin: 0 }}>
                            Receive to: {walletAddress}
                        </p>
                    )}
                    <input
                        placeholder="Amount to receive (MON)"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        style={inputStyle}
                    />
                    <button
                        onClick={handleStart}
                        disabled={!walletAddress || !amount}
                        style={{ ...btnStyle, background: "#16a34a" }}
                    >
                        🎤 Start (fully automatic)
                    </button>
                </div>
            )}

            {step !== "setup" && step !== "done" && (
                <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 48, margin: "20px 0" }}>
                        {step === "waiting-sender" && "🎤"}
                        {step === "fetching-nonce" && "⏳"}
                        {step === "broadcasting" && "📡"}
                        {step === "listening" && "🎤"}
                        {step === "verifying" && "🔍"}
                        {step === "submitting" && "⛓️"}
                    </div>
                    <div style={{ background: "#1a1a1a", padding: 12, borderRadius: 8, margin: "12px 0" }}>
                        <p style={{ fontSize: 11, color: "#888", margin: 0 }}>
                            {step === "waiting-sender" && "Phase 1: Listening for sender's address"}
                            {step === "fetching-nonce" && "Phase 2: Fetching sender's nonce from chain"}
                            {step === "broadcasting" && "Phase 3: Broadcasting payment request to sender"}
                            {step === "listening" && "Phase 4: Listening for signed transaction"}
                            {step === "verifying" && "Phase 5: Verifying transaction"}
                            {step === "submitting" && "Phase 6: Submitting to Monad"}
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
                    {txHash && (
                        <div style={{ background: "#1a1a1a", padding: 12, borderRadius: 8, marginTop: 12 }}>
                            <p style={{ fontSize: 12, color: "#888", margin: 0 }}>Tx Hash:</p>
                            <p style={{ fontSize: 11, wordBreak: "break-all", margin: "4px 0" }}>{txHash}</p>
                            <a
                                href={`${MONAD_CONFIG.explorerUrl}/tx/${txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: "#7c3aed", fontSize: 13 }}
                            >
                                View on Monad Explorer →
                            </a>
                        </div>
                    )}
                    <button onClick={handleReset} style={{ ...btnStyle, background: "#7c3aed", marginTop: 12 }}>
                        Receive Another Payment
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
