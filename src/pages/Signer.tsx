import { useState } from "react";
import { signTransaction, getAddress } from "../core/tx-builder";
import { playPayload } from "../core/broadcaster";

export function Signer() {
    const [privateKey, setPrivateKey] = useState("");
    const [to, setTo] = useState("");
    const [amount, setAmount] = useState("0.01");
    const [nonce, setNonce] = useState("0");
    const [status, setStatus] = useState("");
    const [playing, setPlaying] = useState(false);

    const walletAddress = privateKey.length === 66 ? getAddress(privateKey) : "";

    async function handleSign() {
        try {
            setStatus("Signing...");
            const signedTx = await signTransaction(
                { to, value: amount, nonce: parseInt(nonce) },
                privateKey
            );
            setStatus(`Signed! (${signedTx.length} chars). Playing sound...`);
            setPlaying(true);
            await playPayload(signedTx);
            setPlaying(false);
            setStatus("✅ Sound transmitted! The relay device should pick it up.");
        } catch (err: any) {
            setStatus(`❌ Error: ${err.message}`);
            setPlaying(false);
        }
    }

    return (
        <div style={{ padding: 20, fontFamily: "system-ui", maxWidth: 400, margin: "0 auto" }}>
            <h2>🔒 Offline Signer</h2>
            <p style={{ color: "#dc2626", fontSize: 12 }}>
                ⚠️ This device does NOT need internet. Keys stay here.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input
                    type="password"
                    placeholder="Private key (0x...)"
                    value={privateKey}
                    onChange={(e) => setPrivateKey(e.target.value)}
                    style={inputStyle}
                />
                {walletAddress && (
                    <p style={{ fontSize: 12, color: "#888" }}>From: {walletAddress}</p>
                )}
                <input
                    placeholder="To address (0x...)"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    style={inputStyle}
                />
                <input
                    placeholder="Amount (MON)"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    style={inputStyle}
                />
                <input
                    placeholder="Nonce (ask relay device)"
                    value={nonce}
                    onChange={(e) => setNonce(e.target.value)}
                    style={inputStyle}
                />
                <button onClick={handleSign} disabled={playing || !to || !privateKey} style={btnStyle}>
                    {playing ? "♪ Playing..." : "🔊 Sign & Send via Sound"}
                </button>
            </div>

            {status && <p style={{ marginTop: 12 }}>{status}</p>}
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
    background: "#dc2626",
    color: "white",
    fontSize: 16,
    cursor: "pointer",
};
