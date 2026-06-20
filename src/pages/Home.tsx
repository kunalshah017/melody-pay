import { Link } from "react-router-dom";

export function Home() {
    return (
        <div style={{ padding: 20, fontFamily: "system-ui", maxWidth: 400, margin: "0 auto" }}>
            <h1 style={{ fontSize: 28 }}>🎵 MelodyPay</h1>
            <p style={{ color: "#888" }}>Sound-based transactions on Monad</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 24 }}>
                <Link to="/send" style={cardStyle("#dc2626")}>
                    <h3 style={{ margin: 0 }}>🔒 Send Payment (Air-Gapped)</h3>
                    <p style={{ margin: "4px 0 0", fontSize: 13 }}>Listen for request → sign offline → transmit via sound</p>
                </Link>

                <Link to="/receive" style={cardStyle("#16a34a")}>
                    <h3 style={{ margin: 0 }}>🌐 Receive Payment (Online)</h3>
                    <p style={{ margin: "4px 0 0", fontSize: 13 }}>Broadcast request → hear signed tx → submit to Monad</p>
                </Link>
            </div>

            <div style={{ marginTop: 32, padding: 16, background: "#1a1a1a", borderRadius: 12, border: "1px solid #333" }}>
                <h4 style={{ margin: "0 0 8px", fontSize: 14 }}>How it works</h4>
                <ol style={{ margin: 0, paddingLeft: 20, fontSize: 12, color: "#aaa", lineHeight: 1.8 }}>
                    <li>Receiver enters amount & broadcasts payment request via sound</li>
                    <li>Sender (air-gapped) hears request, reviews & signs offline</li>
                    <li>Sender broadcasts signed transaction via sound</li>
                    <li>Receiver hears signed tx, verifies & submits to Monad</li>
                </ol>
            </div>

            <p style={{ marginTop: 24, fontSize: 12, color: "#666" }}>
                Built for Monad Blitz Mumbai V3
            </p>
        </div>
    );
}

const cardStyle = (borderColor: string): React.CSSProperties => ({
    display: "block",
    padding: 16,
    border: `2px solid ${borderColor}`,
    borderRadius: 12,
    textDecoration: "none",
    color: "white",
    background: "#1a1a1a",
});
