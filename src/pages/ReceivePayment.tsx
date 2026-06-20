import { useState, useRef } from "react";
import { getAddress, broadcastTransaction, MONAD_CONFIG } from "../core/tx-builder";
import { startChunkedListening } from "../core/listener";
import { playLoop } from "../core/broadcaster";
import { ethers } from "ethers";

type Step = "setup" | "broadcasting" | "listening" | "verifying" | "submitting" | "done";

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

export function ReceivePayment() {
    const [privateKey, setPrivateKey] = useState("");
    const [amount, setAmount] = useState("0.01");
    const [step, setStep] = useState<Step>("setup");
    const [status, setStatus] = useState("");
    const [txHash, setTxHash] = useState("");
    const stopRef = useRef<(() => void) | null>(null);

    const walletAddress = tryGetAddress(privateKey);

    async function handleStartBroadcasting() {
        if (!privateKey || !amount || !walletAddress) {
            setStatus("❌ Enter your private key and amount");
            return;
        }

        try {
            setStep("broadcasting");

            const normalizedKey = normalizeKey(privateKey);
            const addr = getAddress(normalizedKey);
            const paymentRequest = `PAY|${addr}|${amount}|0`;
            setStatus(`📡 Broadcasting: "Send ${amount} MON to me"`);

            const { stop } = playLoop(paymentRequest, 3000);
            stopRef.current = stop;
        } catch (err: any) {
            setStatus(`❌ Error: ${err.message}`);
            setStep("setup");
        }
    }

    async function handleStartListening() {
        stopRef.current?.();
        stopRef.current = null;

        setStep("listening");
        setStatus("🎤 Listening for signed transaction from sender...");

        const { stop } = await startChunkedListening(
            async (data) => {
                if (!data.startsWith("0x")) return;

                stop();
                stopRef.current = null;

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

        stopRef.current = stop;
    }

    function handleCancel() {
        stopRef.current?.();
        stopRef.current = null;
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
                ✓ This device needs internet to submit the transaction to Monad.
            </p>

            {step === "setup" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <input
                        type="password"
                        placeholder="Your private key (to derive address)"
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
                        onClick={handleStartBroadcasting}
                        disabled={!walletAddress || !amount}
                        style={{ ...btnStyle, background: "#16a34a" }}
                    >
                        📡 Step 1: Broadcast Payment Request
                    </button>
                </div>
            )}

            {step === "broadcasting" && (
                <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 48, margin: "20px 0" }}>📡</div>
                    <p>Broadcasting payment request...</p>
                    <p style={{ fontSize: 12, color: "#888" }}>
                        Hold sender's phone near this device.
                        <br />Once the sender has received it, tap below.
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
                    <p style={{ fontSize: 12, color: "#888" }}>
                        Hold this device near the sender's phone.
                    </p>
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
