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
            if (!data.startsWith("0x")) {
                setStatus(`Heard something but not a valid tx: ${data.slice(0, 20)}...`);
                return;
            }

            setStatus("📡 Received signed tx! Broadcasting to Monad...");
            try {
                const hash = await broadcastTransaction(data);
                setTxHash(hash);
                setStatus("✅ Transaction confirmed!");
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
        <div style={{ padding: 20, fontFamily: "system-ui", maxWidth: 400, margin: "0 auto" }}>
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
                <div style={{ marginTop: 16, padding: 12, background: "#111", borderRadius: 8 }}>
                    <p style={{ fontSize: 12, color: "#888" }}>Transaction Hash:</p>
                    <p style={{ fontSize: 11, wordBreak: "break-all" }}>{txHash}</p>
                    <a
                        href={`${MONAD_CONFIG.explorerUrl}/tx/${txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
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
