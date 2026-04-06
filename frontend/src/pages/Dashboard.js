import { useState, useEffect } from "react";
import { API, TIER_COLORS, TIER_ICONS, MODE_INFO } from "../utils/constants";

export default function Dashboard({ user, send, onJoinRoom, onNavigate, onSpectate }) {
  const [roomsList, setRoomsList] = useState([]);
  const [liveGames, setLiveGames] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [createMode, setCreateMode] = useState("duel");
  const [isPrivate, setIsPrivate] = useState(false);
  const [queuing, setQueuing] = useState(null);

  const fetchRooms = async () => {
    try {
      const res = await fetch(`${API}/api/rooms/list`);
      setRoomsList(await res.json());
    } catch {}
    try {
      const res2 = await fetch(`${API}/api/rooms/live`);
      const live = await res2.json();
      console.log("[Worduel] Live games:", live);
      setLiveGames(live);
    } catch (err) {
      console.error("[Worduel] Failed to fetch live games:", err);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch(`${API}/api/players/leaderboard`);
      setLeaderboard(await res.json());
    } catch {}
  };

  useEffect(() => {
    fetchRooms();
    fetchLeaderboard();
    const interval = setInterval(fetchRooms, 5000);
    return () => clearInterval(interval);
  }, []);

  const createRoom = async () => {
    const maxP = createMode === "duel" ? 2 : 6;
    try {
      const res = await fetch(`${API}/api/rooms/create?token=${user.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: createMode, max_players: maxP, is_private: isPrivate }),
      });
      const data = await res.json();
      onJoinRoom(data.room_id, data.room_code);
      setShowCreate(false);
    } catch {}
  };

  const joinByCode = async () => {
    if (!joinCode.trim()) return;
    try {
      const res = await fetch(`${API}/api/rooms/join/${joinCode}?token=${user.token}`, { method: "POST" });
      const data = await res.json();
      if (data.room_id) onJoinRoom(data.room_id);
    } catch {}
  };

  const joinQueue = async (mode) => {
    setQueuing(mode);
    await fetch(`${API}/api/matchmaking/join?mode=${mode}&token=${user.token}`, { method: "POST" });
  };

  const leaveQueue = async () => {
    if (queuing) {
      await fetch(`${API}/api/matchmaking/leave?mode=${queuing}&token=${user.token}`, { method: "POST" });
      setQueuing(null);
    }
  };

  const tier = user.tier || "Iron";

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={{
        padding: "16px 32px", display: "flex", justifyContent: "space-between",
        alignItems: "center", borderBottom: "1px solid #1a1a3a",
      }}>
        <h1 style={{
          fontSize: 32, fontWeight: 900, margin: 0,
          background: "linear-gradient(135deg, #64ffda, #7c4dff)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          WORDUEL
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => onNavigate("friends")}
            style={{
              padding: "8px 16px", borderRadius: 8, border: "1px solid #333",
              background: "transparent", color: "#ff6b9d", fontWeight: 600,
              cursor: "pointer", fontSize: 13,
            }}
          >
            👥 Friends
          </button>
          <button
            onClick={() => onNavigate("profile")}
            style={{
              padding: "8px 16px", borderRadius: 8, border: "1px solid #333",
              background: "transparent", color: "#64ffda", fontWeight: 600,
              cursor: "pointer", fontSize: 13,
            }}
          >
            📊 My Stats
          </button>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{user.username}</div>
            <div style={{ fontSize: 13, color: TIER_COLORS[tier] }}>
              {TIER_ICONS[tier]} {tier} · {user.elo || 1000} ELO
            </div>
          </div>
          <div
            onClick={() => onNavigate("profile")}
            style={{
              width: 44, height: 44, borderRadius: "50%",
              background: `linear-gradient(135deg, ${TIER_COLORS[tier]}, #333)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, fontWeight: 900, border: `2px solid ${TIER_COLORS[tier]}`,
              cursor: "pointer",
            }}
          >
            {user.username?.[0]?.toUpperCase()}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
        {/* Quick Play */}
        <div style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16, color: "#64ffda" }}>⚡ Quick Play</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
            {Object.entries(MODE_INFO).map(([mode, { title, icon, desc, color }]) => (
              <div
                key={mode}
                style={{
                  background: "#12122a", borderRadius: 16, padding: 24,
                  border: `1px solid ${queuing === mode ? color : "#2a2a4a"}`,
                  transition: "all 0.3s",
                  boxShadow: queuing === mode ? `0 0 30px ${color}33` : "none",
                }}
              >
                <div style={{ fontSize: 36, marginBottom: 8 }}>{icon}</div>
                <h3 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700 }}>{title}</h3>
                <p style={{ color: "#888", fontSize: 13, margin: "0 0 16px" }}>{desc}</p>
                {queuing === mode ? (
                  <button onClick={leaveQueue} style={{
                    padding: "10px 20px", borderRadius: 8, border: "none",
                    background: "#333", color: "#fff", fontWeight: 700,
                    cursor: "pointer", width: "100%", fontSize: 13,
                    animation: "pulse 2s infinite",
                  }}>
                    ⏳ Searching... Cancel
                  </button>
                ) : (
                  <button onClick={() => joinQueue(mode)} style={{
                    padding: "10px 20px", borderRadius: 8, border: "none",
                    background: color, color: "#000", fontWeight: 700,
                    cursor: "pointer", width: "100%", fontSize: 13,
                  }}>
                    Find Match
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Live Games — Spectate */}
        <div style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16, color: "#ff6b9d" }}>
            👁 Live Games — Watch Now
          </h2>
          {liveGames.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
              {liveGames.map((g) => (
                <div key={g.id} style={{
                  background: "#12122a", borderRadius: 12, padding: 16,
                  border: "1px solid #2a2a4a", display: "flex",
                  justifyContent: "space-between", alignItems: "center",
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>
                      {MODE_INFO[g.mode]?.icon} {g.mode.replace("_", " ").toUpperCase()}
                    </div>
                    <div style={{ color: "#888", fontSize: 12, marginTop: 2 }}>
                      {g.player_names?.join(" vs ") || "?"} · Round {g.round}
                    </div>
                    <div style={{ color: "#ff6b9d", fontSize: 11, marginTop: 2 }}>
                      👁 {g.spectator_count} watching
                    </div>
                  </div>
                  <button
                    onClick={() => onSpectate(g.id)}
                    style={{
                      padding: "8px 18px", borderRadius: 8, border: "none",
                      background: "#ff6b9d", color: "#000", fontWeight: 700,
                      cursor: "pointer", fontSize: 13,
                    }}
                  >
                    Watch
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              background: "#12122a", borderRadius: 12, padding: 24,
              border: "1px solid #2a2a4a", textAlign: "center",
            }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🎮</div>
              <div style={{ color: "#555", fontSize: 14 }}>
                No live games right now. Start a game in another tab to spectate it here!
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {/* Rooms */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: "#7c4dff" }}>🏠 Rooms</h2>
              <button
                onClick={() => setShowCreate(!showCreate)}
                style={{
                  padding: "8px 16px", borderRadius: 8, border: "none",
                  background: "#7c4dff", color: "#fff", fontWeight: 700,
                  cursor: "pointer", fontSize: 13,
                }}
              >
                + Create Room
              </button>
            </div>

            {showCreate && (
              <div style={{
                background: "#12122a", borderRadius: 12, padding: 20,
                border: "1px solid #2a2a4a", marginBottom: 16,
              }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  {["duel", "battle_royale", "pictionary"].map((m) => (
                    <button
                      key={m} onClick={() => setCreateMode(m)}
                      style={{
                        padding: "8px 14px", borderRadius: 8, border: "none",
                        background: createMode === m ? "#64ffda" : "#1a1a3a",
                        color: createMode === m ? "#000" : "#888",
                        fontWeight: 700, cursor: "pointer", fontSize: 12,
                      }}
                    >
                      {m.replace("_", " ").toUpperCase()}
                    </button>
                  ))}
                </div>
                <label style={{ color: "#888", fontSize: 13, display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
                  Private Room (invite only)
                </label>
                <button onClick={createRoom} style={{
                  padding: "10px 24px", borderRadius: 8, border: "none",
                  background: "#64ffda", color: "#000", fontWeight: 700,
                  cursor: "pointer", fontSize: 14, width: "100%",
                }}>
                  Create
                </button>
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <input
                placeholder="Enter room code..."
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && joinByCode()}
                style={{
                  flex: 1, padding: "10px 14px", borderRadius: 8,
                  background: "#0a0a1a", border: "1px solid #333",
                  color: "#fff", fontSize: 14, outline: "none",
                }}
              />
              <button onClick={joinByCode} style={{
                padding: "10px 16px", borderRadius: 8, border: "none",
                background: "#7c4dff", color: "#fff", fontWeight: 700,
                cursor: "pointer", fontSize: 13,
              }}>
                Join
              </button>
            </div>

            {roomsList.map((r) => (
              <div
                key={r.id} onClick={() => onJoinRoom(r.id)}
                style={{
                  background: "#12122a", borderRadius: 12, padding: 16,
                  border: "1px solid #2a2a4a", marginBottom: 8, cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>
                      {MODE_INFO[r.mode]?.icon} {r.mode.replace("_", " ").toUpperCase()}
                    </span>
                    <div style={{ color: "#888", fontSize: 12, marginTop: 2 }}>
                      {r.player_names?.join(", ") || "Empty"}
                    </div>
                  </div>
                  <div style={{
                    padding: "4px 12px", borderRadius: 20,
                    background: "#1a1a3a", fontSize: 12, fontWeight: 700, color: "#64ffda",
                  }}>
                    {r.players}/{r.max_players}
                  </div>
                </div>
              </div>
            ))}
            {roomsList.length === 0 && (
              <div style={{ color: "#555", fontSize: 14, fontStyle: "italic", textAlign: "center", padding: 24 }}>
                No public rooms available
              </div>
            )}
          </div>

          {/* Leaderboard */}
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16, color: "#ffd93d" }}>🏆 Leaderboard</h2>
            <div style={{ background: "#12122a", borderRadius: 12, border: "1px solid #2a2a4a", overflow: "hidden" }}>
              {leaderboard.map((p, i) => (
                <div
                  key={p.id}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 16px",
                    borderBottom: i < leaderboard.length - 1 ? "1px solid #1a1a3a" : "none",
                    background: p.id === user.user_id ? "rgba(100,255,218,0.05)" : "transparent",
                  }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: i < 3 ? ["#ffd700", "#c0c0c0", "#cd7f32"][i] : "#333",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 900, fontSize: 13, color: i < 3 ? "#000" : "#888",
                  }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{p.username}</div>
                    <div style={{ fontSize: 11, color: TIER_COLORS[p.tier] }}>
                      {TIER_ICONS[p.tier]} {p.tier}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "#64ffda" }}>{p.elo}</div>
                    <div style={{ fontSize: 11, color: "#666" }}>{p.wins}W / {p.losses}L</div>
                  </div>
                </div>
              ))}
              {leaderboard.length === 0 && (
                <div style={{ padding: 24, textAlign: "center", color: "#555", fontSize: 14 }}>No players yet</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const containerStyle = {
  minHeight: "100vh",
  background: "linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 50%, #0a1a2e 100%)",
  color: "#fff", fontFamily: "'Space Grotesk', sans-serif",
};
