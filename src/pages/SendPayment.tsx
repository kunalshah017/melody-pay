import { useState, useRef } from "react";
import { signTransaction, getAddress } from "../core/tx-builder";
import { startListening } from "../core/listener";
import { playChunkedPayload } from "../core/broadcaster";

type Step = "setup" | "listening" | "received" | "signing" | "signed" | "broadcasting" | "done";

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
    const [nonce, setNonce] = useState("0");
    const [step, setStep] = useState<Step>("setup");
    const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
    const [signedTx, setSignedTx] = useState("");
    const [status, setStatus] = useState("");
    const stopRef = useRef<(() => void) | null>(null);

    const walletAddress = tryGetAddress(privateKey);

    async function handleStartListening() {
        if (!walletAddress) {
            setStatus("❌ Enter a valid private key");
            return;
        }

        setStep("listening");
        setStatus("🎤 Listening for payment request...");

        const { stop } = await startListening((data) => {
            if (!data.startsWith("PAY|")) return;

            const parts = data.split("|");
            if (parts.length < 3) return;

            const request: PaymentRequest = {
                to: parts[1],
                amount: parts[2],
                nonce: parseInt(nonce), // Use sender's own nonce, not from request
            };

            setPaymentRequest(request);
            setStep("received");
            setStatus(`💰 Payment request: ${request.amount} MON → ${request.to.slice(0, 10)}...`);
            stop();
            stopRef.current = null;
        });

        stopRef.current = stop;
    }

    async function handleConfirmAndSign() {
        if (!paymentRequest) return;

        try {
            setStep("signing");
            setStatus("✍️ Signing transaction...");

            const tx = await signTransaction(
                {
                    to: paymentRequest.to,
                    value: paymentRequest.amount,
                    nonce: paymentRequest.nonce,
                },
                normalizeKey(privateKey)
            );

            setSignedTx(tx);
            setStep("signed");
            setStatus(`✅ Signed! (${tx.length} chars). Ready to broadcast.`);
        } catch (err: any) {
            setStatus(`❌ Error: ${err.message}`);
            setStep("received");
        }
    }

    async function handleBroadcast() {
        if (!signedTx) return;

        try {
            setStep("broadcasting");
            const numChunks = Math.ceil(signedTx.length / 134);
            setStatus(`🔊 Broadcasting signed tx in ${numChunks} chunk(s)...`);

            await playChunkedPayload(signedTx);

            setStep("done");
            setStatus("✅ Signed transaction sent via sound! Receiver should pick it up.");
        } catch (err: any) {
            setStatus(`❌ Error: ${err.message}`);
            setStep("signed");
        }
    }

    function handleCancel() {
        stopRef.current?.();
        stopRef.current = null;
        setStep("setup");
        setPaymentRequest(null);
        setSignedTx("");
        setStatus("");
    }

    function handleReset() {
        setStep("setup");
        setPaymentRequest(null);
        setSignedTx("");
        setStatus("");
    }

    return (
        <div style={{ padding: 20, fontFamily: "system-ui", maxWidth: 400, margin: "0 auto" }}>
            <h2>🔒 Send Payment (Air-Gapped)</h2>
            <p style={{ color: "#dc2626", fontSize: 12, marginBottom: 16 }}>
                ⚠️ This device does NOT need internet. Keys never leave this device.
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
                    <input
                        placeholder="Your nonce (check explorer before going offline)"
                        value={nonce}
                        onChange={(e) => setNonce(e.target.value)}
                        style={inputStyle}
                    />
                    <button
                        onClick={handleStartListening}
                        disabled={!walletAddress}
                        style={{ ...btnStyle, background: "#dc2626" }}
                    >
                        🎤 Step 1: Listen for Payment Request
                    </button>
                </div>
            )}

            {step === "listening" && (
                <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 48, margin: "20px 0" }}>🎤</div>
                    <p>Waiting for receiver to broadcast payment details...</p>
                    <p style={{ fontSize: 12, color: "#888" }}>
                        Hold this device near the receiver's phone.
                    </p>
                    <button onClick={handleCancel} style={{ ...btnStyle, background: "#666" }}>
                        Cancel
                    </button>
                </div>
            )}

            {step === "received" && paymentRequest && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ background: "#1a1a1a", padding: 16, borderRadius: 12, border: "1px solid #333" }}>
                        <h3 style={{ margin: "0 0 8px", fontSize: 14, color: "#888" }}>Payment Request</h3>
                        <p style={{ margin: 4, fontSize: 13 }}>
                            <strong>To:</strong> {paymentRequest.to.slice(0, 10)}...{paymentRequest.to.slice(-8)}
                        </p>
                        <p style={{ margin: 4, fontSize: 13 }}>
                            <strong>Amount:</strong> {paymentRequest.amount} MON
                        </p>
                        <p style={{ margin: 4, fontSize: 13 }}>
                            <strong>Your Nonce:</strong> {paymentRequest.nonce}
                        </p>
                    </div>
                    <button onClick={handleConfirmAndSign} style={{ ...btnStyle, background: "#16a34a" }}>
                        ✅ Step 2: Confirm & Sign
                    </button>
                    <button onClick={handleCancel} style={{ ...btnStyle, background: "#666" }}>
                        ❌ Reject
                    </button>
                </div>
            )}

            {step === "signing" && (
                <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 48, margin: "20px 0" }}>✍️</div>
                    <p>Signing transaction...</p>
                </div>
            )}

            {step === "signed" && (
                <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 48, margin: "20px 0" }}>✅</div>
                    <p>Transaction signed!</p>
                    <p style={{ fontSize: 12, color: "#888" }}>
                        Hold this device near the receiver's phone, then tap below.
                    </p>
                    <button
                        onClick={handleBroadcast}
                        style={{ ...btnStyle, background: "#7c3aed", marginBottom: 8 }}
                    >
                        🔊 Step 3: Broadcast Signed Tx
                    </button>
                    <button onClick={handleCancel} style={{ ...btnStyle, background: "#666" }}>
                        Cancel
                    </button>
                </div>
            )}

            {step === "broadcasting" && (
                <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 48, margin: "20px 0" }}>🔊</div>
                    <p>Playing signed transaction via sound...</p>
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
