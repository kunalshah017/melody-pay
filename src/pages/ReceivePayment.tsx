import { useState, useRef } from "react";
import { getAddress, getNonce, broadcastTransaction, MONAD_CONFIG } from "../core/tx-builder";
import { startListening } from "../core/listener";
import { startChunkedListening } from "../core/listener";
import { playLoop } from "../core/broadcaster";
import { ethers } from "ethers";

type Step = "setup" | "waiting-sender" | "broadcasting" | "listening" | "verifying" | "submitting" | "done";

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
    const stopRef2 = useRef<(() => void) | null>(null);

    const walletAddress = tryGetAddress(privateKey);

    async function handleStart() {
        if (!walletAddress || !amount) {
            setStatus("❌ Enter your address and amount");
            return;
        }

        try {
            setStep("waiting-sender");
            setStatus("🎤 Waiting for sender to identify themselves...");

            // Step 1: Listen for sender's address (ADDR|0x...)
            const { stop } = await startListening(async (data) => {
                if (!data.startsWith("ADDR|")) return;

                const senderAddr = data.split("|")[1];
                if (!senderAddr || senderAddr.length !== 42) return;

                stop();
                stopRef.current = null;

                setStatus(`📡 Sender: ${senderAddr.slice(0, 10)}... — fetching nonce...`);

                // Fetch sender's nonce from chain
                try {
                    const senderNonce = await getNonce(senderAddr);
                    setStatus(`📡 Broadcasting payment request (nonce: ${senderNonce})...`);
                    setStep("broadcasting");

                    // Broadcast payment request WITH the correct nonce
                    const paymentRequest = `PAY|${walletAddress}|${amount}|${senderNonce}`;
                    const loop = playLoop(paymentRequest, 3000);
                    stopRef.current = loop.stop;
                } catch (err: any) {
                    setStatus(`❌ Failed to fetch nonce: ${err.message}`);
                    setStep("setup");
                }
            });

            stopRef.current = stop;
        } catch (err: any) {
            setStatus(`❌ Error: ${err.message}`);
            setStep("setup");
        }
    }

    async function handleStartListening() {
        // Stop broadcasting
        stopRef.current?.();
        stopRef.current = null;

        setStep("listening");
        setStatus("🎤 Listening for signed transaction from sender...");

        const { stop } = await startChunkedListening(
            async (data) => {
                if (!data.startsWith("0x")) return;

                stop();
                stopRef2.current = null;

                setStep("verifying");
                setStatus("🔍 Received signed transaction, verifying...");

                try {
                    const parsedTx = ethers.Transaction.from(data);
                    const expectedTo = walletAddress.toLowerCase();
                    const actualTo = parsedTx.to?.toLowerCase();
                    const actualValue = ethers.formatEther(parsedTx.value);

                    if (actualTo !== expectedTo) {
                        setStatus(`❌ Tx recipient mismatch! Expected ${expectedTo.slice(0, 10)}... got ${actualTo?.slice(0, 10)}...`);
                        setStep("setup");
                        return;
                    }

                    if (parseFloat(actualValue) < parseFloat(amount) * 0.99) {
                        setStatus(`❌ Amount too low! Expected ${amount} MON, got ${actualValue} MON`);
                        setStep("setup");
                        return;
                    }

                    setStep("submitting");
                    setStatus(`✅ Verified! Submitting ${actualValue} MON to Monad...`);

                    const hash = await broadcastTransaction(data);
                    setTxHash(hash);
                    setStep("done");
                    setStatus(`✅ Payment received! ${actualValue} MON confirmed.`);
                } catch (err: any) {
                    setStatus(`❌ Error: ${err.message}`);
                    setStep("setup");
                }
            },
            (statusMsg) => setStatus(statusMsg),
        );

        stopRef2.current = stop;
    }

    function handleCancel() {
        stopRef.current?.();
        stopRef.current = null;
        stopRef2.current?.();
        stopRef2.current = null;
        setStep("setup");
        setStatus("");
        setTxHash("");
    }

    function handleReset() {
        setStep("setup");
        setStatus("");
        setTxHash("");
    }

    return (
        <div style={{ padding: 20, fontFamily: "system-ui", maxWidth: 400, margin: "0 auto" }}>
            <h2>🌐 Receive Payment (Online)</h2>
            <p style={{ color: "#16a34a", fontSize: 12, marginBottom: 16 }}>
                ✓ This device needs internet to fetch nonce & submit tx to Monad.
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
                        📡 Step 1: Start (listen for sender)
                    </button>
                </div>
            )}

            {step === "waiting-sender" && (
                <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 48, margin: "20px 0" }}>🎤</div>
                    <p>Waiting for sender to broadcast their address...</p>
                    <p style={{ fontSize: 12, color: "#888" }}>
                        Tell the sender to tap "Send Payment" on their device.
                    </p>
                    <button onClick={handleCancel} style={{ ...btnStyle, background: "#666" }}>
                        Cancel
                    </button>
                </div>
            )}

            {step === "broadcasting" && (
                <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 48, margin: "20px 0" }}>📡</div>
                    <p>Broadcasting payment request with nonce...</p>
                    <p style={{ fontSize: 12, color: "#888" }}>
                        Sender should hear this. Once they've received it, tap below.
                    </p>
                    <button
                        onClick={handleStartListening}
                        style={{ ...btnStyle, background: "#7c3aed", marginBottom: 8 }}
                    >
                        🎤 Step 2: Listen for Signed Tx
                    </button>
                    <button onClick={handleCancel} style={{ ...btnStyle, background: "#666" }}>
                        Cancel
                    </button>
                </div>
            )}

            {step === "listening" && (
                <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 48, margin: "20px 0" }}>🎤</div>
                    <p>Listening for signed transaction from sender...</p>
                    <button onClick={handleCancel} style={{ ...btnStyle, background: "#666" }}>
                        Cancel
                    </button>
                </div>
            )}

            {step === "verifying" && (
                <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 48, margin: "20px 0" }}>🔍</div>
                    <p>Verifying transaction...</p>
                </div>
            )}

            {step === "submitting" && (
                <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 48, margin: "20px 0" }}>⛓️</div>
                    <p>Submitting to Monad...</p>
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
