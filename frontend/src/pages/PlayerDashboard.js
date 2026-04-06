import { useState, useEffect } from "react";
import { API, TIER_COLORS, TIER_ICONS } from "../utils/constants";

export default function PlayerDashboard({ user, onBack }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/api/players/profile/${user.user_id}`);
        setProfile(await res.json());
      } catch {}
      setLoading(false);
    })();
  }, [user.user_id]);

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={{ textAlign: "center", padding: 80, color: "#888" }}>Loading profile...</div>
      </div>
    );
  }

  const p = profile || user;
  const tier = p.tier || "Iron";
  const tierColor = TIER_COLORS[tier];
  const winRate = p.win_rate ?? (p.games_played > 0 ? Math.round(p.wins / p.games_played * 100) : 0);

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={{ padding: "20px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #1a1a3a" }}>
        <button onClick={onBack} style={backBtnStyle}>← Back to Lobby</button>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#64ffda" }}>Player Profile</h2>
        <div style={{ width: 120 }} />
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>
        {/* Profile Card */}
        <div style={{
          background: "#12122a", borderRadius: 20, padding: 32,
          border: `1px solid ${tierColor}40`, marginBottom: 32,
          boxShadow: `0 0 40px ${tierColor}15`,
          display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 32, alignItems: "center",
        }}>
          {/* Avatar */}
          <div style={{
            width: 90, height: 90, borderRadius: "50%",
            background: `linear-gradient(135deg, ${tierColor}, ${tierColor}66)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 40, fontWeight: 900, border: `3px solid ${tierColor}`,
            color: "#000",
          }}>
            {p.username?.[0]?.toUpperCase()}
          </div>

          {/* Info */}
          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, color: "#fff" }}>{p.username}</h1>
            <div style={{ fontSize: 18, color: tierColor, fontWeight: 700, marginTop: 4 }}>
              {TIER_ICONS[tier]} {tier}
            </div>
            <div style={{ fontSize: 14, color: "#888", marginTop: 4 }}>
              Member since joining
            </div>
          </div>

          {/* ELO Badge */}
          <div style={{ textAlign: "center" }}>
            <div style={{
              fontSize: 42, fontWeight: 900, color: tierColor,
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {p.elo}
            </div>
            <div style={{ fontSize: 12, color: "#888", textTransform: "uppercase", letterSpacing: 1 }}>ELO Rating</div>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
          {[
            { label: "Games Played", value: p.games_played, color: "#7c4dff", icon: "🎮" },
            { label: "Wins", value: p.wins, color: "#64ffda", icon: "🏆" },
            { label: "Losses", value: p.losses, color: "#ff6b6b", icon: "💔" },
            { label: "Win Rate", value: `${winRate}%`, color: "#ffd93d", icon: "📊" },
          ].map(({ label, value, color, icon }) => (
            <div key={label} style={{
              background: "#12122a", borderRadius: 16, padding: 20,
              border: "1px solid #2a2a4a", textAlign: "center",
            }}>
              <div style={{ fontSize: 28, marginBottom: 4 }}>{icon}</div>
              <div style={{ fontSize: 28, fontWeight: 900, color, fontFamily: "'JetBrains Mono', monospace" }}>
                {value}
              </div>
              <div style={{ fontSize: 12, color: "#888", marginTop: 4, textTransform: "uppercase", letterSpacing: 1 }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* ELO Progress Bar */}
        <div style={{
          background: "#12122a", borderRadius: 16, padding: 24,
          border: "1px solid #2a2a4a", marginBottom: 32,
        }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: "#fff" }}>Rank Progress</h3>
          <TierProgressBar elo={p.elo} tier={tier} />
        </div>

        {/* Recent Matches */}
        <div style={{
          background: "#12122a", borderRadius: 16, padding: 24,
          border: "1px solid #2a2a4a",
        }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: "#fff" }}>Recent Matches</h3>
          {(p.recent_matches && p.recent_matches.length > 0) ? (
            p.recent_matches.map((m, i) => (
              <div key={m.id || i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "12px 0",
                borderBottom: i < p.recent_matches.length - 1 ? "1px solid #1a1a3a" : "none",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: m.won ? "#64ffda" : "#ff6b6b",
                  }} />
                  <span style={{ fontWeight: 600, fontSize: 14, color: "#ccc" }}>
                    {m.mode?.replace("_", " ").toUpperCase()}
                  </span>
                  <span style={{
                    padding: "2px 10px", borderRadius: 12, fontSize: 12, fontWeight: 700,
                    background: m.won ? "rgba(100,255,218,0.1)" : "rgba(255,107,107,0.1)",
                    color: m.won ? "#64ffda" : "#ff6b6b",
                  }}>
                    {m.won ? "WIN" : "LOSS"}
                  </span>
                </div>
                <div style={{
                  fontWeight: 700, fontSize: 14,
                  fontFamily: "'JetBrains Mono', monospace",
                  color: m.elo_change > 0 ? "#64ffda" : m.elo_change < 0 ? "#ff6b6b" : "#888",
                }}>
                  {m.elo_change > 0 ? "+" : ""}{m.elo_change}
                </div>
              </div>
            ))
          ) : (
            <div style={{ color: "#555", fontSize: 14, fontStyle: "italic", textAlign: "center", padding: 24 }}>
              No matches played yet — jump into a game!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Tier Progress Bar ───────────────────────────────────────────────────
function TierProgressBar({ elo, tier }) {
  const tiers = [
    { name: "Iron", min: 0, max: 799 },
    { name: "Bronze", min: 800, max: 1099 },
    { name: "Silver", min: 1100, max: 1399 },
    { name: "Gold", min: 1400, max: 1699 },
    { name: "Platinum", min: 1700, max: 1999 },
    { name: "Diamond", min: 2000, max: 2299 },
    { name: "Master", min: 2300, max: 2599 },
    { name: "Grandmaster", min: 2600, max: 3000 },
  ];

  const currentTier = tiers.find((t) => t.name === tier) || tiers[0];
  const range = currentTier.max - currentTier.min + 1;
  const progress = Math.min(100, Math.max(0, ((elo - currentTier.min) / range) * 100));
  const tierColor = TIER_COLORS[tier];
  const tierIdx = tiers.findIndex((t) => t.name === tier);
  const nextTier = tierIdx < tiers.length - 1 ? tiers[tierIdx + 1] : null;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
        <span style={{ color: tierColor, fontWeight: 700 }}>{TIER_ICONS[tier]} {tier}</span>
        {nextTier && (
          <span style={{ color: TIER_COLORS[nextTier.name], fontWeight: 700 }}>
            {TIER_ICONS[nextTier.name]} {nextTier.name} ({nextTier.min})
          </span>
        )}
      </div>
      <div style={{ height: 10, background: "#0a0a1a", borderRadius: 5, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${progress}%`,
          background: `linear-gradient(90deg, ${tierColor}, ${tierColor}cc)`,
          borderRadius: 5, transition: "width 0.5s ease",
        }} />
      </div>
      <div style={{ fontSize: 12, color: "#666", marginTop: 6, textAlign: "center" }}>
        {elo} / {currentTier.max + 1} to next tier
        {nextTier && ` (${currentTier.max + 1 - elo} ELO needed)`}
      </div>
    </div>
  );
}

const containerStyle = {
  minHeight: "100vh",
  background: "linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 50%, #0a1a2e 100%)",
  color: "#fff", fontFamily: "'Space Grotesk', sans-serif",
};

const backBtnStyle = {
  padding: "8px 16px", borderRadius: 8, border: "1px solid #333",
  background: "transparent", color: "#888", fontWeight: 600,
  cursor: "pointer", fontSize: 13,
};
