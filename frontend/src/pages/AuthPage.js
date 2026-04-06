import { useState } from "react";
import { API } from "../utils/constants";

export default function AuthPage({ onAuth }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
      const res = await fetch(`${API}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error");
      onAuth(data);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 50%, #0a1a2e 100%)",
      fontFamily: "'Space Grotesk', 'JetBrains Mono', sans-serif",
    }}>
      <div style={{
        background: "#12122a", borderRadius: 20, padding: 48,
        border: "1px solid #2a2a5a", maxWidth: 420, width: "90%",
        boxShadow: "0 0 80px rgba(100, 255, 218, 0.05)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <h1 style={{
            fontSize: 48, fontWeight: 900, margin: 0,
            background: "linear-gradient(135deg, #64ffda, #7c4dff, #ff6b9d)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            letterSpacing: -2,
          }}>
            WORDUEL
          </h1>
          <p style={{ color: "#666", fontSize: 14, marginTop: 8, letterSpacing: 2, textTransform: "uppercase" }}>
            Multiplayer Word Battles
          </p>
        </div>

        <div style={{ display: "flex", marginBottom: 24, borderRadius: 10, overflow: "hidden", border: "1px solid #333" }}>
          {["Login", "Register"].map((t, i) => (
            <button
              key={t}
              onClick={() => { setIsLogin(i === 0); setError(""); }}
              style={{
                flex: 1, padding: "12px", border: "none",
                background: (i === 0 ? isLogin : !isLogin) ? "#64ffda" : "#1a1a3a",
                color: (i === 0 ? isLogin : !isLogin) ? "#000" : "#888",
                fontWeight: 700, cursor: "pointer", fontSize: 14,
              }}
            >
              {t}
            </button>
          ))}
        </div>

        <input
          placeholder="Username" value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          style={{
            width: "100%", padding: "14px 16px", borderRadius: 10,
            background: "#0a0a1a", border: "1px solid #333",
            color: "#fff", fontSize: 15, outline: "none",
            marginBottom: 12, boxSizing: "border-box",
          }}
        />
        <input
          placeholder="Password" type="password" value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          style={{
            width: "100%", padding: "14px 16px", borderRadius: 10,
            background: "#0a0a1a", border: "1px solid #333",
            color: "#fff", fontSize: 15, outline: "none",
            marginBottom: 16, boxSizing: "border-box",
          }}
        />

        {error && (
          <div style={{
            color: "#ff4444", fontSize: 13, marginBottom: 12,
            padding: "8px 12px", background: "rgba(255,68,68,0.1)", borderRadius: 8,
          }}>
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit} disabled={loading}
          style={{
            width: "100%", padding: "14px", borderRadius: 10,
            background: loading ? "#333" : "linear-gradient(135deg, #64ffda, #7c4dff)",
            color: "#000", border: "none", fontWeight: 800,
            fontSize: 16, cursor: loading ? "wait" : "pointer", letterSpacing: 1,
          }}
        >
          {loading ? "..." : isLogin ? "ENTER THE ARENA" : "CREATE ACCOUNT"}
        </button>
      </div>
    </div>
  );
}
