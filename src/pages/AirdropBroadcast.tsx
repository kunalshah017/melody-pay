import { useState, useRef } from "react";
import { playLoop } from "../core/broadcaster";
import { signTransaction } from "../core/tx-builder";

export function AirdropBroadcast() {
    const [funderKey, setFunderKey] = useState("");
    const [recipients, setRecipients] = useState("");
    const [amount, setAmount] = useState("0.01");
    const [broadcasting, setBroadcasting] = useState(false);
    const stopRef = useRef<(() => void) | null>(null);

    async function startBroadcast() {
        const addresses = recipients.split("\n").map((a) => a.trim()).filter(Boolean);
        if (addresses.length === 0) return;

        setBroadcasting(true);

        const signedTx = await signTransaction(
            { to: addresses[0], value: amount, nonce: 0 },
            funderKey
        );

        const { stop } = playLoop(signedTx, 4000);
        stopRef.current = stop;
    }

    function stopBroadcast() {
        stopRef.current?.();
        setBroadcasting(false);
    }

    return (
        <div style={{ padding: 20, fontFamily: "system-ui", maxWidth: 400, margin: "0 auto" }}>
            <h2>📡 Airdrop Broadcaster</h2>
            <p style={{ fontSize: 13, color: "#888" }}>
                Plays signed transactions via speakers on loop. Phones nearby can relay them.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input
                    type="password"
                    placeholder="Funder private key"
                    value={funderKey}
                    onChange={(e) => setFunderKey(e.target.value)}
                    style={inputStyle}
                />
                <textarea
                    placeholder="Recipient addresses (one per line)"
                    value={recipients}
                    onChange={(e) => setRecipients(e.target.value)}
                    style={{ ...inputStyle, height: 80 }}
                />
                <input
                    placeholder="Amount per recipient (MON)"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    style={inputStyle}
                />
                <button
                    onClick={broadcasting ? stopBroadcast : startBroadcast}
                    style={{ ...btnStyle, background: broadcasting ? "#666" : "#7c3aed" }}
                >
                    {broadcasting ? "⏹ Stop" : "▶️ Start Broadcasting"}
                </button>
            </div>

            {broadcasting && <p style={{ marginTop: 12 }}>♪ Broadcasting airdrop...</p>}
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
