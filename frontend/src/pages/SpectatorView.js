import { useState, useEffect, useRef } from "react";
import { WS_URL, MODE_INFO } from "../utils/constants";
import { GuessBoard, CircularTimer } from "../components/GameComponents";

export default function SpectatorView({ roomId, onLeave }) {
  const wsRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [roomInfo, setRoomInfo] = useState(null);
  const [players, setPlayers] = useState([]);
  const [mode, setMode] = useState(null);

  // Duel/BR state
  const [guesses, setGuesses] = useState({});   // playerId -> [guess rows]
  const [round, setRound] = useState(1);
  const [currentTurn, setCurrentTurn] = useState(null);
  const [scores, setScores] = useState({});
  const [notification, setNotification] = useState("");
  const [matchResult, setMatchResult] = useState(null);

  // Pictionary state
  const [drawer, setDrawer] = useState(null);
  const [timer, setTimer] = useState(0);
  const [timerPhase, setTimerPhase] = useState("drawing");
  const [revealWord, setRevealWord] = useState(null);

  const canvasRef = useRef(null);

  const showNotif = (text) => {
    setNotification(text);
    setTimeout(() => setNotification(""), 4000);
  };

  // Init canvas
  useEffect(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  }, [mode]);

  // Connect spectator WebSocket
  useEffect(() => {
    const ws = new WebSocket(`${WS_URL}/ws/spectate/${roomId}`);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        handleMessage(msg);
      } catch {}
    };

    return () => ws.close();
  }, [roomId]);

  const handleMessage = (msg) => {
    switch (msg.type) {
      case "spectator_joined":
        setRoomInfo(msg.room);
        setPlayers(msg.room?.players || []);
        setMode(msg.room?.mode);
        break;

      case "game_started":
        setMode(msg.mode);
        setPlayers(msg.players || []);
        setRound(1);
        setGuesses({});
        setMatchResult(null);
        if (msg.mode === "duel") setCurrentTurn(msg.current_turn);
        if (msg.mode === "pictionary") {
          setDrawer(msg.drawer);
          setTimer(msg.draw_time || 60);
          setTimerPhase("drawing");
        }
        break;

      case "duel_guess":
        setGuesses((prev) => ({
          ...prev,
          [msg.player]: [...(prev[msg.player] || []), msg.result],
        }));
        if (msg.next_turn) setCurrentTurn(msg.next_turn);
        if (msg.scores) setScores(msg.scores);
        if (msg.round_won) showNotif(`🎉 ${msg.round_winner_name} wins round! Word: ${msg.target_word}`);
        if (msg.match_won) setMatchResult({ winnerName: msg.match_winner_name });
        break;

      case "br_guess":
        if (msg.result) {
          setGuesses((prev) => ({
            ...prev,
            [msg.player]: [...(prev[msg.player] || []), msg.result],
          }));
        }
        if (msg.round_over && msg.eliminated_names?.length) {
          showNotif(`Eliminated: ${msg.eliminated_names.join(", ")}`);
        }
        if (msg.match_over) setMatchResult({ winnerName: msg.match_winner_name });
        break;

      case "new_round":
        setRound(msg.round);
        setGuesses({});
        if (msg.current_turn) setCurrentTurn(msg.current_turn);
        showNotif(`Round ${msg.round}!`);
        break;

      case "timer_tick":
        setTimer(msg.remaining);
        setTimerPhase(msg.phase || "drawing");
        break;

      case "turn_ending":
        setRevealWord(msg.word);
        setTimerPhase("reveal");
        setTimer(msg.countdown);
        if (msg.scores) setScores(msg.scores);
        break;

      case "reveal_countdown":
        setTimer(msg.seconds);
        setTimerPhase("reveal");
        break;

      case "pictionary_guess":
        if (msg.correct) {
          showNotif(`🎉 ${msg.guesser_name} guessed: ${msg.word}`);
          if (msg.scores) setScores(msg.scores);
          setRevealWord(msg.word);
        }
        break;

      case "pictionary_new_turn":
        setDrawer(msg.drawer);
        setRound(msg.round);
        setRevealWord(null);
        setTimerPhase("drawing");
        setTimer(msg.draw_time || 60);
        showNotif(`${msg.drawer_name}'s turn to draw!`);
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext("2d");
          ctx.fillStyle = "#1a1a2e";
          ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
        break;

      case "pictionary_game_over":
        setMatchResult({ winnerName: msg.winner_name, rankings: msg.rankings });
        break;

      case "draw_data":
        if (canvasRef.current && msg.data) {
          const c = canvasRef.current;
          const ctx = c.getContext("2d");
          ctx.strokeStyle = msg.data.color || "#fff";
          ctx.lineWidth = msg.data.size || 3;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.beginPath();
          ctx.moveTo(msg.data.from.x * c.width, msg.data.from.y * c.height);
          ctx.lineTo(msg.data.to.x * c.width, msg.data.to.y * c.height);
          ctx.stroke();
        }
        break;

      case "clear_canvas":
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext("2d");
          ctx.fillStyle = "#1a1a2e";
          ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
        break;

      case "player_left":
      case "player_disconnected":
        setPlayers(msg.players || []);
        showNotif(`${msg.player_name} left`);
        break;

      default:
        break;
    }
  };

  const modeLabel = mode ? (MODE_INFO[mode]?.icon + " " + MODE_INFO[mode]?.title) : "Game";

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={{
        padding: "12px 24px", display: "flex", justifyContent: "space-between",
        alignItems: "center", borderBottom: "1px solid #1a1a3a",
      }}>
        <button onClick={onLeave} style={backBtnStyle}>← Leave</button>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{
            padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700,
            background: "rgba(255,107,155,0.15)", color: "#ff6b9d", letterSpacing: 1,
            textTransform: "uppercase",
          }}>
            👁 Spectating
          </span>
          <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: 2 }}>
            {modeLabel} · Round {round}
          </span>
        </div>
        <div style={{ fontSize: 13, color: "#888" }}>
          {connected ? "🟢 Connected" : "🔴 Disconnected"}
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div style={{
          position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)",
          padding: "12px 24px", borderRadius: 12,
          background: "rgba(255, 107, 155, 0.15)", backdropFilter: "blur(10px)",
          border: "1px solid #ff6b9d", color: "#ff6b9d",
          fontWeight: 700, fontSize: 14, zIndex: 100,
        }}>
          {notification}
        </div>
      )}

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px" }}>
        {/* Duel / Battle Royale spectator view */}
        {(mode === "duel" || mode === "battle_royale") && (
          <div>
            <div style={{
              display: "grid",
              gridTemplateColumns: `repeat(${Math.min(players.length, 3)}, 1fr)`,
              gap: 24,
            }}>
              {players.map((p) => (
                <div key={p.id} style={{ textAlign: "center" }}>
                  <div style={{
                    fontSize: 14, fontWeight: 700, marginBottom: 10,
                    color: currentTurn === p.id ? "#64ffda" : "#888",
                  }}>
                    {p.name}
                    {currentTurn === p.id && " ✍️"}
                    {mode === "duel" && ` (${scores[p.id] || 0})`}
                  </div>
                  <GuessBoard guesses={guesses[p.id] || []} small={players.length > 2} />
                </div>
              ))}
            </div>

            {matchResult && (
              <div style={{
                textAlign: "center", marginTop: 32, padding: 28,
                background: "#12122a", borderRadius: 16, border: "1px solid #ff6b9d",
              }}>
                <div style={{ fontSize: 48, marginBottom: 8 }}>🏆</div>
                <h2 style={{ fontSize: 24, fontWeight: 900, color: "#ffd93d" }}>
                  {matchResult.winnerName} Wins!
                </h2>
                {matchResult.rankings?.map((r, i) => (
                  <div key={i} style={{ marginTop: 4, fontSize: 14, color: i === 0 ? "#ffd700" : "#ccc" }}>
                    #{i + 1} {r.name} — {r.score} pts
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pictionary spectator view */}
        {mode === "pictionary" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 24 }}>
            <div>
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                marginBottom: 16,
              }}>
                <div style={{ color: "#888", fontSize: 14 }}>
                  {players.find((p) => p.id === drawer)?.name || "?"} is drawing...
                  {revealWord && (
                    <span style={{ color: "#ffd93d", fontWeight: 700, marginLeft: 8 }}>
                      Word: {revealWord}
                    </span>
                  )}
                </div>
                <CircularTimer
                  remaining={timer}
                  total={timerPhase === "reveal" ? 5 : 60}
                  phase={timerPhase}
                />
              </div>

              <canvas
                ref={canvasRef}
                width={500} height={400}
                style={{
                  border: "2px solid #333", borderRadius: 12,
                  width: "100%", maxWidth: 500,
                  cursor: "default",
                }}
              />

              {matchResult && (
                <div style={{
                  textAlign: "center", marginTop: 24, padding: 24,
                  background: "#12122a", borderRadius: 16, border: "1px solid #ff6b9d",
                }}>
                  <div style={{ fontSize: 48 }}>🏆</div>
                  <h2 style={{ fontSize: 24, fontWeight: 900, color: "#ffd93d" }}>
                    {matchResult.winnerName} Wins!
                  </h2>
                  {matchResult.rankings?.map((r, i) => (
                    <div key={i} style={{ marginTop: 4, fontSize: 14, color: i === 0 ? "#ffd700" : "#ccc" }}>
                      #{i + 1} {r.name} — {r.score} pts
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sidebar scores */}
            <div style={{
              background: "#12122a", borderRadius: 12, padding: 16,
              border: "1px solid #2a2a4a", height: "fit-content",
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#ffd93d", marginBottom: 10, textTransform: "uppercase" }}>
                Players · Round {round}
              </div>
              {players.map((p) => (
                <div key={p.id} style={{
                  display: "flex", justifyContent: "space-between",
                  padding: "6px 0", fontSize: 14,
                  color: p.id === drawer ? "#64ffda" : "#ccc",
                }}>
                  <span>{p.name} {p.id === drawer ? "🎨" : ""}</span>
                  <span style={{ fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
                    {scores[p.id] || 0}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!mode && (
          <div style={{ textAlign: "center", padding: 60, color: "#888" }}>
            Waiting for game data...
          </div>
        )}
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
  background: "transparent", color: "#888", fontWeight: 600, cursor: "pointer", fontSize: 13,
};
