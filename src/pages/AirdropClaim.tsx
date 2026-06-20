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
                setStatus("✅ Claimed! Listening for more...");
            } catch (err: any) {
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
        <div style={{ padding: 20, fontFamily: "system-ui", maxWidth: 400, margin: "0 auto" }}>
            <h2>📱 Airdrop Claimer</h2>
            <p style={{ fontSize: 13, color: "#888" }}>
                Hold your phone near the speakers to claim tokens from the air.
            </p>

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
                            rel="noopener noreferrer"
                            style={{ display: "block", color: "#7c3aed", fontSize: 12, marginTop: 4 }}
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
