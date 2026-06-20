import { useState, useRef } from "react";
import { getNonce, getAddress, broadcastTransaction, MONAD_CONFIG } from "../core/tx-builder";
import { startListening } from "../core/listener";
import { playPayload, playLoop } from "../core/broadcaster";
import { ethers } from "ethers";

type Step = "setup" | "broadcasting" | "listening" | "verifying" | "submitting" | "done";

export function ReceivePayment() {
    const [privateKey, setPrivateKey] = useState("");
    const [amount, setAmount] = useState("0.01");
    const [step, setStep] = useState<Step>("setup");
    const [status, setStatus] = useState("");
    const [txHash, setTxHash] = useState("");
    const stopRef = useRef<(() => void) | null>(null);

    const walletAddress = privateKey.length === 66 ? getAddress(privateKey) : "";

    async function handleRequestPayment() {
        if (!privateKey || !amount || !walletAddress) {
            setStatus("❌ Enter your private key and amount");
            return;
        }

        try {
            setStep("broadcasting");
            setStatus("📡 Fetching nonce & broadcasting payment request...");

            // Get current nonce for the sender to use
            // We need the sender's nonce, but we don't know the sender's address yet.
            // Strategy: We broadcast our address + amount. The sender will use their own nonce.
            // Actually, we need to provide the nonce for the SENDER.
            // Since we're the receiver, we don't know sender's nonce.
            // But we DO need it for the signed tx to be valid.
            // Solution: we ask sender to use nonce=0 or we broadcast without nonce
            // and let sender fill in their own nonce.
            // For the demo: broadcast "PAY|<receiverAddress>|<amount>|0"
            // The sender's device knows their own nonce (they can hardcode or use 0 for demo)

            // Better: We'll fetch nothing here. Just broadcast the request.
            // The sender (air-gapped) will need their nonce pre-known or we include a "use your nonce" signal.
            // For hackathon simplicity: include nonce=0 as placeholder, sender will use it.
            // In production, there'd be a nonce exchange step.

            const paymentRequest = `PAY|${walletAddress}|${amount}|0`;
            setStatus(`📡 Broadcasting: "Send ${amount} MON to me" — hold sender's phone near...`);

            // Play on loop so sender has time to start listening
            const { stop } = playLoop(paymentRequest, 3000);
            stopRef.current = stop;

            // After broadcasting, we need to also start listening for the response
            // Give 2 seconds for at least one broadcast, then start listening too
            setTimeout(() => {
                startListeningForSignedTx();
            }, 6000);
        } catch (err: any) {
            setStatus(`❌ Error: ${err.message}`);
            setStep("setup");
        }
    }

    async function startListeningForSignedTx() {
        // Stop broadcasting
        stopRef.current?.();
        stopRef.current = null;

        setStep("listening");
        setStatus("🎤 Payment request sent! Now listening for signed transaction...");

        const { stop } = await startListening(async (data) => {
            // Signed tx starts with 0x
            if (!data.startsWith("0x")) return;

            stop();
            stopRef.current = null;

            setStep("verifying");
            setStatus("🔍 Received signed transaction, verifying...");

            try {
                // Parse the signed transaction to verify it matches our request
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

                // Verification passed — submit to Monad
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
        });

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
                        onClick={handleRequestPayment}
                        disabled={!privateKey || !amount}
                        style={{ ...btnStyle, background: "#16a34a" }}
                    >
                        📡 Request Payment via Sound
                    </button>
                </div>
            )}

            {step === "broadcasting" && (
                <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 48, margin: "20px 0" }}>📡</div>
                    <p>Broadcasting payment request...</p>
                    <p style={{ fontSize: 12, color: "#888" }}>
                        Hold sender's phone near this device
                    </p>
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
