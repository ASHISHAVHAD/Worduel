import { useState, useEffect } from "react";
import { API, TIER_COLORS, TIER_ICONS, MODE_INFO } from "../utils/constants";

// ── Visual Help Overlay ─────────────────────────────────────────────────
function HelpOverlay({ mode, onClose }) {
  if (!mode) return null;
  const Tile = ({ letter, status }) => {
    const c = { correct: "#538d4e", present: "#b59f3b", absent: "#3a3a3c" };
    return (<span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 4, margin: 2, background: c[status] || "transparent", border: `2px solid ${c[status] || "#555"}`, color: "#fff", fontWeight: 700, fontSize: 14, fontFamily: "'JetBrains Mono', monospace" }}>{letter}</span>);
  };
  const Sec = ({ title, children }) => (<div style={{ marginBottom: 20 }}><h4 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 700, color: "#64ffda" }}>{title}</h4>{children}</div>);
  const R = ({ children }) => (<div style={{ fontSize: 13, color: "#ccc", marginBottom: 6, paddingLeft: 12, borderLeft: "2px solid #333", lineHeight: 1.5 }}>{children}</div>);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#12122a", borderRadius: 20, border: "1px solid #2a2a5a", maxWidth: 560, width: "90%", maxHeight: "85vh", overflowY: "auto", padding: "32px 36px", boxShadow: "0 0 80px rgba(100,255,218,0.1)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#fff" }}>
            {mode === "duel" ? "⚔️ Duel Mode" : mode === "battle_royale" ? "👑 Battle Royale" : "🎨 Pictionary"}
          </h2>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid #555", background: "transparent", color: "#888", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>

        {mode === "duel" && (<>
          <Sec title="Objective"><R>Guess the hidden 5-letter word before your opponent. Best of 3 rounds — first to 2 wins takes the match.</R></Sec>
          <Sec title="How Guesses Work">
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>Example: The word is CRANE</div>
              <div><Tile letter="C" status="correct" /><Tile letter="L" status="absent" /><Tile letter="A" status="present" /><Tile letter="S" status="absent" /><Tile letter="H" status="absent" /></div>
              <div style={{ marginTop: 8, fontSize: 12, color: "#aaa" }}>
                <span style={{ color: "#538d4e", fontWeight: 700 }}>Green</span> — correct letter, correct spot · <span style={{ color: "#b59f3b", fontWeight: 700 }}>Yellow</span> — correct letter, wrong spot · <span style={{ color: "#3a3a3c", fontWeight: 700 }}>Gray</span> — not in the word
              </div>
            </div>
          </Sec>
          <Sec title="Rules">
            <R>Players take alternate turns. You and your opponent see each other's boards.</R>
            <R>Each turn has a 60-second time limit. If time runs out, your turn is skipped.</R>
            <R>When a round ends, a 5-second countdown starts before the next round begins automatically.</R>
            <R>Your ELO rating goes up with wins and down with losses.</R>
          </Sec>
          <Sec title="Scoring">
            <div style={{ display: "flex", gap: 16, padding: 12, background: "#0a0a1a", borderRadius: 10, fontSize: 13, color: "#ccc" }}>
              <div style={{ textAlign: "center", flex: 1 }}><div style={{ fontSize: 24, marginBottom: 4 }}>🏆</div><div style={{ fontWeight: 700, color: "#64ffda" }}>Win 2 Rounds</div><div style={{ fontSize: 11, color: "#888" }}>ELO +16 to +32</div></div>
              <div style={{ textAlign: "center", flex: 1 }}><div style={{ fontSize: 24, marginBottom: 4 }}>💔</div><div style={{ fontWeight: 700, color: "#ff6b6b" }}>Lose Match</div><div style={{ fontSize: 11, color: "#888" }}>ELO -16 to -32</div></div>
            </div>
          </Sec>
        </>)}

        {mode === "battle_royale" && (<>
          <Sec title="Objective"><R>3–6 players all guess the same hidden word simultaneously. The slowest guesser gets eliminated each round. Last one standing wins!</R></Sec>
          <Sec title="How It Works">
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              {["Round 1", "Round 2", "Round 3", "Winner!"].map((label, i) => (
                <div key={i} style={{ flex: 1, minWidth: 100, padding: "10px 8px", borderRadius: 10, background: i === 3 ? "rgba(100,255,218,0.1)" : "#0a0a1a", border: `1px solid ${i === 3 ? "#64ffda" : "#333"}`, textAlign: "center", fontSize: 12 }}>
                  <div style={{ fontSize: 18, marginBottom: 4 }}>{["👥", "⚔️", "🔥", "👑"][i]}</div>
                  <div style={{ fontWeight: 700, color: i === 3 ? "#64ffda" : "#ccc" }}>{label}</div>
                  <div style={{ fontSize: 10, color: "#888", marginTop: 2 }}>{["6 players", "Slowest out", "Keep going", "Last standing"][i]}</div>
                </div>
              ))}
            </div>
          </Sec>
          <Sec title="Rules">
            <R>Each round lasts 120 seconds. You get up to 6 guesses per round.</R>
            <R>After each round, the player who took the most guesses (or failed) is eliminated.</R>
            <R>If all remaining players tie, nobody is eliminated that round.</R>
            <R>If a player leaves mid-game, they are automatically eliminated.</R>
          </Sec>
          <Sec title="Letter Colors">
            <div><Tile letter="S" status="correct" /><Tile letter="T" status="absent" /><Tile letter="O" status="present" /><Tile letter="R" status="correct" /><Tile letter="M" status="absent" /></div>
            <div style={{ fontSize: 12, color: "#aaa", marginTop: 6 }}>Same color rules as Wordle — green, yellow, and gray.</div>
          </Sec>
        </>)}

        {mode === "pictionary" && (<>
          <Sec title="Objective"><R>Take turns drawing a secret word while other players try to guess it. Score the most points across 3 rounds to win!</R></Sec>
          <Sec title="How A Turn Works">
            <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
              <div style={{ flex: 1, padding: 12, borderRadius: 10, background: "#0a0a1a", border: "1px solid #333", textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 4 }}>🎨</div>
                <div style={{ fontWeight: 700, color: "#64ffda", fontSize: 13 }}>Drawer</div>
                <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>Gets a secret word. Draws on the canvas for 60 seconds. Earns +2 pts if someone guesses.</div>
              </div>
              <div style={{ flex: 1, padding: 12, borderRadius: 10, background: "#0a0a1a", border: "1px solid #333", textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 4 }}>💬</div>
                <div style={{ fontWeight: 700, color: "#ffd93d", fontSize: 13 }}>Guessers</div>
                <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>Watch the drawing and type guesses. First correct guess earns +3 pts.</div>
              </div>
            </div>
          </Sec>
          <Sec title="Points">
            <div style={{ display: "flex", gap: 12, padding: 12, background: "#0a0a1a", borderRadius: 10, textAlign: "center" }}>
              <div style={{ flex: 1 }}><div style={{ fontSize: 22, fontWeight: 900, color: "#ffd93d" }}>+3</div><div style={{ fontSize: 11, color: "#888" }}>First correct guesser</div></div>
              <div style={{ width: 1, background: "#333" }} />
              <div style={{ flex: 1 }}><div style={{ fontSize: 22, fontWeight: 900, color: "#64ffda" }}>+2</div><div style={{ fontSize: 11, color: "#888" }}>Drawer (if guessed)</div></div>
              <div style={{ width: 1, background: "#333" }} />
              <div style={{ flex: 1 }}><div style={{ fontSize: 22, fontWeight: 900, color: "#ff6b6b" }}>0</div><div style={{ fontSize: 11, color: "#888" }}>Nobody guesses</div></div>
            </div>
          </Sec>
          <Sec title="Rules">
            <R>Every player draws once per round. There are 3 rounds total.</R>
            <R>The drawer has 60 seconds. After time expires, the word is revealed for 5 seconds before the next turn.</R>
            <R>The host starts the game when at least 3 players have joined.</R>
            <R>If a player leaves and fewer than 3 remain, the game ends and remaining players win.</R>
            <R>At the end, the player with the most points wins and gains ELO.</R>
          </Sec>
        </>)}
      </div>
    </div>
  );
}

export default function Dashboard({ user, send, onJoinRoom, onNavigate, onSpectate }) {
  const [roomsList, setRoomsList] = useState([]);
  const [liveGames, setLiveGames] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [createMode, setCreateMode] = useState("duel");
  const [isPrivate, setIsPrivate] = useState(false);
  const [queuing, setQueuing] = useState(null);
  const [helpMode, setHelpMode] = useState(null); // which mode's help panel is open

  const fetchRooms = async () => {
    try { const res = await fetch(`${API}/api/rooms/list`); setRoomsList(await res.json()); } catch {}
    try { const res2 = await fetch(`${API}/api/rooms/live`); setLiveGames(await res2.json()); } catch {}
  };
  const fetchLeaderboard = async () => {
    try { const res = await fetch(`${API}/api/players/leaderboard`); setLeaderboard(await res.json()); } catch {}
  };

  useEffect(() => {
    fetchRooms(); fetchLeaderboard();
    const interval = setInterval(fetchRooms, 5000);
    return () => clearInterval(interval);
  }, []);

  const createRoom = async () => {
    const maxP = createMode === "duel" ? 2 : 6;
    try {
      const res = await fetch(`${API}/api/rooms/create?token=${user.token}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
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
      <div style={{ padding: "16px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #1a1a3a" }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, margin: 0, background: "linear-gradient(135deg, #64ffda, #7c4dff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>WORDUEL</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => onNavigate("friends")} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #333", background: "transparent", color: "#ff6b9d", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>👥 Friends</button>
          <button onClick={() => onNavigate("profile")} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #333", background: "transparent", color: "#64ffda", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>📊 My Stats</button>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{user.username}</div>
            <div style={{ fontSize: 13, color: TIER_COLORS[tier] }}>{TIER_ICONS[tier]} {tier} · {user.elo || 1000} ELO</div>
          </div>
          <div onClick={() => onNavigate("profile")} style={{ width: 44, height: 44, borderRadius: "50%", background: `linear-gradient(135deg, ${TIER_COLORS[tier]}, #333)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 900, border: `2px solid ${TIER_COLORS[tier]}`, cursor: "pointer" }}>
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
              <div key={mode} style={{
                background: "#12122a", borderRadius: 16, padding: 24,
                border: `1px solid ${queuing === mode ? color : "#2a2a4a"}`,
                transition: "all 0.3s", boxShadow: queuing === mode ? `0 0 30px ${color}33` : "none",
                position: "relative",
              }}>
                {/* Help ? button — opens full overlay */}
                <button
                  onClick={(e) => { e.stopPropagation(); setHelpMode(helpMode === mode ? null : mode); }}
                  style={{
                    position: "absolute", top: 12, right: 12,
                    width: 24, height: 24, borderRadius: "50%",
                    border: "1px solid #555", background: "transparent",
                    color: "#888", fontWeight: 900, fontSize: 13, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>?</button>

                <div style={{ fontSize: 36, marginBottom: 8 }}>{icon}</div>
                <h3 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700 }}>{title}</h3>
                <p style={{ color: "#888", fontSize: 13, margin: "0 0 12px" }}>{desc}</p>

                {queuing === mode ? (
                  <button onClick={leaveQueue} style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "#333", color: "#fff", fontWeight: 700, cursor: "pointer", width: "100%", fontSize: 13, animation: "pulse 2s infinite" }}>
                    ⏳ Searching... Cancel
                  </button>
                ) : (
                  <button onClick={() => joinQueue(mode)} style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: color, color: "#000", fontWeight: 700, cursor: "pointer", width: "100%", fontSize: 13 }}>
                    Find Match
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Live Games */}
        <div style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16, color: "#ff6b9d" }}>👁 Live Games — Watch Now</h2>
          {liveGames.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
              {liveGames.map((g) => (
                <div key={g.id} style={{ background: "#12122a", borderRadius: 12, padding: 16, border: "1px solid #2a2a4a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{MODE_INFO[g.mode]?.icon} {g.mode.replace("_", " ").toUpperCase()}</div>
                    <div style={{ color: "#888", fontSize: 12, marginTop: 2 }}>{g.player_names?.join(" vs ") || "?"} · Round {g.round}</div>
                    <div style={{ color: "#ff6b9d", fontSize: 11, marginTop: 2 }}>👁 {g.spectator_count} watching</div>
                  </div>
                  <button onClick={() => onSpectate(g.id)} style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "#ff6b9d", color: "#000", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>Watch</button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ background: "#12122a", borderRadius: 12, padding: 24, border: "1px solid #2a2a4a", textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🎮</div>
              <div style={{ color: "#555", fontSize: 14 }}>No live games right now.</div>
            </div>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {/* Rooms */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: "#7c4dff" }}>🏠 Rooms</h2>
              <button onClick={() => setShowCreate(!showCreate)} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#7c4dff", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>+ Create Room</button>
            </div>

            {showCreate && (
              <div style={{ background: "#12122a", borderRadius: 12, padding: 20, border: "1px solid #2a2a4a", marginBottom: 16 }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  {["duel", "battle_royale", "pictionary"].map((m) => (
                    <button key={m} onClick={() => setCreateMode(m)} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: createMode === m ? "#64ffda" : "#1a1a3a", color: createMode === m ? "#000" : "#888", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>
                      {m.replace("_", " ").toUpperCase()}
                    </button>
                  ))}
                </div>
                <label style={{ color: "#888", fontSize: 13, display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} /> Private Room
                </label>
                <button onClick={createRoom} style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: "#64ffda", color: "#000", fontWeight: 700, cursor: "pointer", fontSize: 14, width: "100%" }}>Create</button>
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <input placeholder="Enter room code..." value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === "Enter" && joinByCode()} style={{ flex: 1, padding: "10px 14px", borderRadius: 8, background: "#0a0a1a", border: "1px solid #333", color: "#fff", fontSize: 14, outline: "none" }} />
              <button onClick={joinByCode} style={{ padding: "10px 16px", borderRadius: 8, border: "none", background: "#7c4dff", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>Join</button>
            </div>

            {roomsList.map((r) => (
              <div key={r.id} onClick={() => onJoinRoom(r.id)} style={{ background: "#12122a", borderRadius: 12, padding: 16, border: "1px solid #2a2a4a", marginBottom: 8, cursor: "pointer" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{MODE_INFO[r.mode]?.icon} {r.mode.replace("_", " ").toUpperCase()}</span>
                    <div style={{ color: "#888", fontSize: 12, marginTop: 2 }}>{r.player_names?.join(", ") || "Empty"}</div>
                  </div>
                  <div style={{ padding: "4px 12px", borderRadius: 20, background: "#1a1a3a", fontSize: 12, fontWeight: 700, color: "#64ffda" }}>{r.players}/{r.max_players}</div>
                </div>
              </div>
            ))}
            {roomsList.length === 0 && <div style={{ color: "#555", fontSize: 14, fontStyle: "italic", textAlign: "center", padding: 24 }}>No public rooms available</div>}
          </div>

          {/* Leaderboard */}
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16, color: "#ffd93d" }}>🏆 Leaderboard</h2>
            <div style={{ background: "#12122a", borderRadius: 12, border: "1px solid #2a2a4a", overflow: "hidden" }}>
              {leaderboard.map((p, i) => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: i < leaderboard.length - 1 ? "1px solid #1a1a3a" : "none", background: p.id === user.user_id ? "rgba(100,255,218,0.05)" : "transparent" }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: i < 3 ? ["#ffd700", "#c0c0c0", "#cd7f32"][i] : "#333", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 13, color: i < 3 ? "#000" : "#888" }}>{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{p.username}</div>
                    <div style={{ fontSize: 11, color: TIER_COLORS[p.tier] }}>{TIER_ICONS[p.tier]} {p.tier}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "#64ffda" }}>{p.elo}</div>
                    <div style={{ fontSize: 11, color: "#666" }}>{p.wins}W / {p.losses}L</div>
                  </div>
                </div>
              ))}
              {leaderboard.length === 0 && <div style={{ padding: 24, textAlign: "center", color: "#555", fontSize: 14 }}>No players yet</div>}
            </div>
          </div>
        </div>
      </div>

      {/* Help Overlay */}
      {helpMode && <HelpOverlay mode={helpMode} onClose={() => setHelpMode(null)} />}
    </div>
  );
}

const containerStyle = { minHeight: "100vh", background: "linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 50%, #0a1a2e 100%)", color: "#fff", fontFamily: "'Space Grotesk', sans-serif" };
