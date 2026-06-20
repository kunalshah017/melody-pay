import { Link } from "react-router-dom";

export function Home() {
  return (
    <div style={{ padding: 20, fontFamily: "system-ui", maxWidth: 400, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28 }}>🎵 MelodyPay</h1>
      <p style={{ color: "#888" }}>Sound-based transactions on Monad</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 24 }}>
        <Link to="/sign" style={cardStyle("#dc2626")}>
          <h3 style={{ margin: 0 }}>🔒 Sign &amp; Send (Offline)</h3>
          <p style={{ margin: "4px 0 0", fontSize: 13 }}>Sign a transaction offline, transmit via sound</p>
        </Link>

        <Link to="/relay" style={cardStyle("#16a34a")}>
          <h3 style={{ margin: 0 }}>🌐 Relay (Online)</h3>
          <p style={{ margin: "4px 0 0", fontSize: 13 }}>Listen for sound, broadcast to Monad</p>
        </Link>

        <Link to="/airdrop/broadcast" style={cardStyle("#7c3aed")}>
          <h3 style={{ margin: 0 }}>📡 Airdrop: Broadcast</h3>
          <p style={{ margin: "4px 0 0", fontSize: 13 }}>Play claim sounds on speakers</p>
        </Link>

        <Link to="/airdrop/claim" style={cardStyle("#ea580c")}>
          <h3 style={{ margin: 0 }}>📱 Airdrop: Claim</h3>
          <p style={{ margin: "4px 0 0", fontSize: 13 }}>Listen &amp; claim tokens from the air</p>
        </Link>
      </div>

      <p style={{ marginTop: 32, fontSize: 12, color: "#666" }}>
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
