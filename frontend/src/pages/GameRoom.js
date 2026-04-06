import { useState, useEffect, useCallback } from "react";
import { GuessBoard, Keyboard, ChatPanel, CircularTimer } from "../components/GameComponents";
import DrawCanvas from "../components/DrawCanvas";

export default function GameRoom({ user, roomId, send, gameMessages, onLeave }) {
  const [mode, setMode] = useState(null);
  const [status, setStatus] = useState("waiting");
  const [players, setPlayers] = useState([]);
  const [host, setHost] = useState(null);
  const [roomInfo, setRoomInfo] = useState(null);
  const [input, setInput] = useState("");
  const [myGuesses, setMyGuesses] = useState([]);
  const [opponentGuesses, setOpponentGuesses] = useState({});
  const [letterStates, setLetterStates] = useState({});
  const [chatMessages, setChatMessages] = useState([]);
  const [notification, setNotification] = useState("");
  const [scores, setScores] = useState({});
  const [round, setRound] = useState(1);
  const [currentTurn, setCurrentTurn] = useState(null);
  const [matchResult, setMatchResult] = useState(null);
  const [roundResults, setRoundResults] = useState(null);

  // Timer state (shared across modes)
  const [timer, setTimer] = useState(0);
  const [timerTotal, setTimerTotal] = useState(60);
  const [timerPhase, setTimerPhase] = useState("active"); // active | reveal

  // Pictionary state
  const [drawer, setDrawer] = useState(null);
  const [word, setWord] = useState(null);
  const [pictionaryInput, setPictionaryInput] = useState("");
  const [revealWord, setRevealWord] = useState(null);

  useEffect(() => {
    send({ action: "join_room", room_id: roomId });
  }, [roomId, send]);

  const showNotif = (text) => {
    setNotification(text);
    setTimeout(() => setNotification(""), 4000);
  };

  const updateLetterStates = (result) => {
    result.forEach((r) => {
      setLetterStates((prev) => {
        if (r.status === "correct") return { ...prev, [r.letter]: "correct" };
        if (r.status === "present" && prev[r.letter] !== "correct") return { ...prev, [r.letter]: "present" };
        if (r.status === "absent" && !prev[r.letter]) return { ...prev, [r.letter]: "absent" };
        return prev;
      });
    });
  };

  // ── Message handler ──────────────────────────────────────────────────
  useEffect(() => {
    if (!gameMessages.length) return;
    const msg = gameMessages[gameMessages.length - 1];

    switch (msg.type) {
      case "player_joined":
        setPlayers(msg.players || []);
        setHost(msg.host);
        setRoomInfo(msg.room);
        setMode(msg.room?.mode);
        break;

      case "game_started":
        setStatus("playing");
        setMode(msg.mode);
        setPlayers(msg.players || []);
        setRound(1);
        setMyGuesses([]);
        setOpponentGuesses({});
        setLetterStates({});
        setMatchResult(null);
        setRoundResults(null);
        setTimerPhase("active");
        if (msg.mode === "duel") {
          setCurrentTurn(msg.current_turn);
          setTimerTotal(msg.turn_time || 60);
          setTimer(msg.turn_time || 60);
        } else if (msg.mode === "battle_royale") {
          setTimerTotal(msg.round_time || 120);
          setTimer(msg.round_time || 120);
        } else if (msg.mode === "pictionary") {
          setDrawer(msg.drawer);
          setWord(msg.word || null);
          setTimerTotal(msg.draw_time || 60);
          setTimer(msg.draw_time || 60);
          setRevealWord(null);
        }
        break;

      // ── Timer (all modes) ──
      case "timer_tick":
        setTimer(msg.remaining);
        setTimerPhase("active");
        break;

      case "reveal_countdown":
        setTimer(msg.seconds);
        setTimerPhase("reveal");
        break;

      // ── Duel messages ──
      case "duel_guess": {
        const guessData = msg.result;
        if (msg.player === user.user_id) {
          setMyGuesses((prev) => [...prev, guessData]);
          updateLetterStates(msg.result);
        } else {
          setOpponentGuesses((prev) => ({
            ...prev,
            [msg.player]: [...(prev[msg.player] || []), guessData],
          }));
        }
        if (msg.next_turn) setCurrentTurn(msg.next_turn);
        if (msg.scores) setScores(msg.scores);
        if (msg.round_won) {
          setRoundResults({ winner: msg.round_winner_name, word: msg.target_word });
          showNotif(`🎉 ${msg.round_winner_name} wins the round! Word: ${msg.target_word}`);
        }
        if (msg.round_draw) {
          setRoundResults({ draw: true, word: msg.target_word });
          showNotif(`Draw! Word was: ${msg.target_word}`);
        }
        if (msg.match_won) {
          setMatchResult({ winner: msg.match_winner, winnerName: msg.match_winner_name });
        }
        break;
      }

      case "turn_timeout":
        setCurrentTurn(msg.next_turn);
        showNotif(`⏰ ${msg.player_name} ran out of time! ${msg.next_turn_name}'s turn.`);
        break;

      // ── Battle Royale messages ──
      case "br_guess":
        if (msg.player === user.user_id && msg.result) {
          setMyGuesses((prev) => [...prev, msg.result]);
          updateLetterStates(msg.result);
          if (msg.correct) showNotif(`✅ Correct in ${msg.guesses_used} guesses!`);
          if (msg.out_of_guesses) showNotif("❌ Out of guesses!");
        }
        if (msg.round_over) {
          setRoundResults({ eliminated: msg.eliminated_names, word: msg.target_word, alive: msg.alive_count });
          if (msg.eliminated_names?.length) showNotif(`Eliminated: ${msg.eliminated_names.join(", ")}`);
        }
        if (msg.match_over) {
          setMatchResult({ winner: msg.match_winner, winnerName: msg.match_winner_name });
        }
        break;

      case "br_timeout":
        setRoundResults({ eliminated: msg.eliminated_names, word: msg.target_word, alive: msg.alive_count });
        if (msg.eliminated_names?.length) showNotif(`⏰ Time's up! Eliminated: ${msg.eliminated_names.join(", ")}`);
        if (msg.match_over) {
          setMatchResult({ winner: msg.match_winner, winnerName: msg.match_winner_name });
        }
        break;

      // ── Round transitions ──
      case "new_round":
        setRound(msg.round);
        setMyGuesses([]);
        setOpponentGuesses({});
        setLetterStates({});
        setRoundResults(null);
        setInput("");
        setTimerPhase("active");
        if (msg.current_turn) setCurrentTurn(msg.current_turn);
        if (msg.turn_time) { setTimerTotal(msg.turn_time); setTimer(msg.turn_time); }
        if (msg.timer) { setTimerTotal(msg.timer); setTimer(msg.timer); }
        showNotif(`Round ${msg.round} starting!`);
        break;

      // ── Pictionary messages ──
      case "turn_ending":
        setRevealWord(msg.word);
        setTimerPhase("reveal");
        setTimer(msg.countdown);
        if (msg.scores) setScores(msg.scores);
        showNotif(`⏰ Time's up! Word was: ${msg.word}`);
        break;

      case "pictionary_guess":
        if (msg.correct) {
          showNotif(`🎉 ${msg.guesser_name} guessed it! Word: ${msg.word}`);
          if (msg.scores) setScores(msg.scores);
          setRevealWord(msg.word);
        }
        break;

      case "pictionary_new_turn":
        setDrawer(msg.drawer);
        setWord(msg.word || null);
        setRound(msg.round);
        setRevealWord(null);
        setTimerPhase("active");
        setTimerTotal(msg.draw_time || 60);
        setTimer(msg.draw_time || 60);
        showNotif(`${msg.drawer_name}'s turn to draw!`);
        const canvas = window.__drawCanvas;
        if (canvas) {
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#1a1a2e";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        break;

      case "pictionary_game_over":
        setMatchResult({ winner: msg.winner, winnerName: msg.winner_name, rankings: msg.rankings });
        break;

      case "draw_data": {
        const c = window.__drawCanvas;
        if (c && msg.data) {
          const ctx = c.getContext("2d");
          ctx.strokeStyle = msg.data.color || "#fff";
          ctx.lineWidth = msg.data.size || 3;
          ctx.lineCap = "round"; ctx.lineJoin = "round";
          ctx.beginPath();
          ctx.moveTo(msg.data.from.x * c.width, msg.data.from.y * c.height);
          ctx.lineTo(msg.data.to.x * c.width, msg.data.to.y * c.height);
          ctx.stroke();
        }
        break;
      }

      case "clear_canvas": {
        const cv = window.__drawCanvas;
        if (cv) {
          const ctx = cv.getContext("2d");
          ctx.fillStyle = "#1a1a2e";
          ctx.fillRect(0, 0, cv.width, cv.height);
        }
        break;
      }

      case "chat":
        setChatMessages((prev) => [...prev, msg]);
        break;

      case "player_left":
      case "player_disconnected":
        setPlayers(msg.players || []);
        if (msg.host) setHost(msg.host);
        showNotif(`${msg.player_name} left`);
        break;

      case "error":
        showNotif(`⚠️ ${msg.message}`);
        break;

      default:
        break;
    }
  }, [gameMessages, user.user_id]);

  // ── Keyboard handler ─────────────────────────────────────────────────
  const handleKey = useCallback((key) => {
    if (matchResult) return;
    if (mode === "duel" && currentTurn !== user.user_id) return;

    if (key === "ENTER") {
      if (input.length === 5) {
        send({ action: mode === "duel" ? "duel_guess" : "br_guess", guess: input });
        setInput("");
      }
    } else if (key === "⌫") {
      setInput((prev) => prev.slice(0, -1));
    } else if (input.length < 5 && key.length === 1) {
      setInput((prev) => prev + key);
    }
  }, [input, mode, currentTurn, matchResult, user.user_id, send]);

  useEffect(() => {
    const handler = (e) => {
      if (mode === "pictionary") return;
      if (e.key === "Enter") handleKey("ENTER");
      else if (e.key === "Backspace") handleKey("⌫");
      else if (/^[a-zA-Z]$/.test(e.key)) handleKey(e.key.toUpperCase());
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleKey, mode]);

  const isMyTurn = mode === "duel" ? currentTurn === user.user_id : true;
  const isDrawer = mode === "pictionary" && drawer === user.user_id;
  const isHost = host === user.user_id;

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={{
        padding: "12px 24px", display: "flex", justifyContent: "space-between",
        alignItems: "center", borderBottom: "1px solid #1a1a3a",
      }}>
        <button onClick={onLeave} style={backBtnStyle}>← Leave</button>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontWeight: 700, fontSize: 16, textTransform: "uppercase", letterSpacing: 2 }}>
            {mode === "duel" ? "⚔️ Duel" : mode === "battle_royale" ? "👑 Battle Royale" : "🎨 Pictionary"}
            {status === "playing" && ` · Round ${round}`}
          </span>
          {/* Show timer in header for duel/BR */}
          {status === "playing" && (mode === "duel" || mode === "battle_royale") && !matchResult && !roundResults && (
            <CircularTimer remaining={timer} total={timerTotal} phase={timerPhase === "reveal" ? "reveal" : "active"}
              label={mode === "duel" ? "Turn" : "Round"} />
          )}
        </div>
        <div style={{ fontSize: 13, color: "#64ffda" }}>{players.length} players</div>
      </div>

      {/* Notification */}
      {notification && (
        <div style={{
          position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)",
          padding: "12px 24px", borderRadius: 12,
          background: "rgba(100, 255, 218, 0.15)", backdropFilter: "blur(10px)",
          border: "1px solid #64ffda", color: "#64ffda",
          fontWeight: 700, fontSize: 14, zIndex: 100,
        }}>
          {notification}
        </div>
      )}

      {/* ═══ WAITING ═══ */}
      {status === "waiting" && (
        <div style={{ textAlign: "center", padding: 48 }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 16 }}>Waiting for Players</h2>
          <div style={{ marginBottom: 24 }}>
            {players.map((p) => (
              <span key={p.id} style={{
                display: "inline-block", padding: "8px 16px", borderRadius: 20,
                background: "#12122a", border: `1px solid ${p.id === host ? "#64ffda" : "#333"}`,
                margin: 4, fontWeight: 600, fontSize: 14,
              }}>
                {p.name} {p.id === user.user_id ? "(you)" : ""} {p.id === host ? "👑" : ""}
              </span>
            ))}
          </div>
          {roomInfo?.code && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ color: "#888", fontSize: 13, marginBottom: 4 }}>Room Code:</div>
              <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: 8, color: "#64ffda", fontFamily: "monospace" }}>
                {roomInfo.code}
              </div>
            </div>
          )}
          {isHost ? (
            <button onClick={() => send({ action: "start_game" })} style={startBtnStyle}>
              START GAME
            </button>
          ) : (
            <div style={{ color: "#888", fontSize: 14, fontStyle: "italic" }}>
              Waiting for host to start the game...
            </div>
          )}
        </div>
      )}

      {/* ═══ DUEL / BATTLE ROYALE ═══ */}
      {status === "playing" && (mode === "duel" || mode === "battle_royale") && (
        <div style={{ padding: "24px", maxWidth: 900, margin: "0 auto" }}>
          {/* Timer bar */}
          {timerPhase === "active" && !matchResult && !roundResults && (
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
              <CircularTimer
                remaining={timer}
                total={timerTotal}
                phase={timerPhase}
                label={mode === "duel" ? "Turn" : "Round"}
              />
            </div>
          )}

          {/* Reveal countdown overlay */}
          {timerPhase === "reveal" && (
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <CircularTimer remaining={timer} total={5} phase="reveal" label="Next round in..." />
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: mode === "duel" ? "1fr 1fr" : "1fr", gap: 32 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{
                fontSize: 14, fontWeight: 700, marginBottom: 12,
                color: isMyTurn ? "#64ffda" : "#666",
              }}>
                {user.username} {isMyTurn && mode === "duel" ? "• YOUR TURN" : ""}
                {mode === "duel" && ` (${scores[user.user_id] || 0} wins)`}
              </div>
              <GuessBoard guesses={myGuesses} currentInput={isMyTurn ? input : ""} />
            </div>

            {mode === "duel" && players.filter((p) => p.id !== user.user_id).map((opp) => (
              <div key={opp.id} style={{ textAlign: "center" }}>
                <div style={{
                  fontSize: 14, fontWeight: 700, marginBottom: 12,
                  color: currentTurn === opp.id ? "#ff6b6b" : "#666",
                }}>
                  {opp.name} {currentTurn === opp.id ? "• THEIR TURN" : ""}
                  {` (${scores[opp.id] || 0} wins)`}
                </div>
                <GuessBoard guesses={opponentGuesses[opp.id] || []} small />
              </div>
            ))}
          </div>

          {!matchResult && !roundResults && <Keyboard onKey={handleKey} letterStates={letterStates} />}

          {roundResults && !matchResult && (
            <div style={{ textAlign: "center", marginTop: 24 }}>
              <div style={{ color: "#888", fontSize: 14, marginBottom: 12 }}>
                {roundResults.word && `Word was: ${roundResults.word}`}
                {roundResults.eliminated?.length > 0 && ` · Eliminated: ${roundResults.eliminated.join(", ")}`}
              </div>
              <button onClick={() => send({ action: "next_round" })} style={actionBtnStyle}>
                Next Round →
              </button>
            </div>
          )}

          {matchResult && <MatchResultCard result={matchResult} user={user} onLeave={onLeave} />}
        </div>
      )}

      {/* ═══ PICTIONARY ═══ */}
      {status === "playing" && mode === "pictionary" && (
        <div style={{ padding: "24px", maxWidth: 960, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 24 }}>
            <div>
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                marginBottom: 16, padding: "0 8px",
              }}>
                <div>
                  {isDrawer && word && (
                    <div style={{
                      padding: "10px 20px", background: "rgba(100,255,218,0.1)",
                      borderRadius: 10, border: "1px solid #64ffda",
                    }}>
                      <div style={{ fontSize: 11, color: "#64ffda", fontWeight: 700 }}>YOUR WORD</div>
                      <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: 4 }}>{word}</div>
                    </div>
                  )}
                  {!isDrawer && !revealWord && (
                    <div style={{ color: "#888", fontSize: 14 }}>
                      {players.find((p) => p.id === drawer)?.name || "?"} is drawing...
                    </div>
                  )}
                  {revealWord && (
                    <div style={{
                      padding: "10px 20px", background: "rgba(255,217,61,0.1)",
                      borderRadius: 10, border: "1px solid #ffd93d",
                    }}>
                      <div style={{ fontSize: 11, color: "#ffd93d", fontWeight: 700 }}>THE WORD WAS</div>
                      <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: 4, color: "#ffd93d" }}>
                        {revealWord}
                      </div>
                    </div>
                  )}
                </div>
                <CircularTimer
                  remaining={timer}
                  total={timerPhase === "reveal" ? 5 : 60}
                  phase={timerPhase === "reveal" ? "reveal" : "active"}
                />
              </div>

              <DrawCanvas isDrawer={isDrawer && timerPhase !== "reveal" && !revealWord} send={send} />

              {!isDrawer && timerPhase !== "reveal" && !revealWord && !matchResult && (
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <input
                    value={pictionaryInput}
                    onChange={(e) => setPictionaryInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && pictionaryInput.trim()) {
                        send({ action: "pictionary_guess", guess: pictionaryInput.trim() });
                        setPictionaryInput("");
                      }
                    }}
                    placeholder="Type your guess..."
                    style={guessInputStyle}
                  />
                  <button onClick={() => {
                    if (pictionaryInput.trim()) {
                      send({ action: "pictionary_guess", guess: pictionaryInput.trim() });
                      setPictionaryInput("");
                    }
                  }} style={actionBtnStyle}>
                    Guess
                  </button>
                </div>
              )}

              {matchResult && <MatchResultCard result={matchResult} user={user} onLeave={onLeave} />}
            </div>

            {/* Sidebar */}
            <div>
              <div style={{
                background: "#12122a", borderRadius: 12, padding: 16,
                border: "1px solid #2a2a4a", marginBottom: 16,
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#ffd93d", marginBottom: 8, textTransform: "uppercase" }}>
                  Scores · Round {round}
                </div>
                {players.map((p) => (
                  <div key={p.id} style={{
                    display: "flex", justifyContent: "space-between",
                    padding: "6px 0", fontSize: 14,
                    color: p.id === drawer ? "#64ffda" : "#ccc",
                  }}>
                    <span>{p.name} {p.id === drawer ? "🎨" : ""} {p.id === host ? "👑" : ""}</span>
                    <span style={{ fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
                      {scores[p.id] || 0}
                    </span>
                  </div>
                ))}
              </div>
              <ChatPanel messages={chatMessages} onSend={(msg) => send({ action: "chat", message: msg })} />
            </div>
          </div>
        </div>
      )}

      {/* Chat for non-pictionary */}
      {status === "playing" && mode !== "pictionary" && (
        <div style={{ maxWidth: 400, margin: "24px auto 0" }}>
          <ChatPanel messages={chatMessages} onSend={(msg) => send({ action: "chat", message: msg })} />
        </div>
      )}
    </div>
  );
}

// ── Match Result ────────────────────────────────────────────────────────
function MatchResultCard({ result, user, onLeave }) {
  return (
    <div style={{
      textAlign: "center", marginTop: 32, padding: 32,
      background: "#12122a", borderRadius: 16, border: "1px solid #64ffda",
    }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>
        {result.winner === user.user_id ? "🏆" : "😔"}
      </div>
      <h2 style={{
        fontSize: 28, fontWeight: 900, marginBottom: 8,
        color: result.winner === user.user_id ? "#64ffda" : "#ff6b6b",
      }}>
        {result.winner === user.user_id ? "Victory!" : `${result.winnerName} Wins!`}
      </h2>
      {result.rankings && (
        <div style={{ marginTop: 16 }}>
          {result.rankings.map((r, i) => (
            <div key={r.player} style={{ fontSize: 15, marginBottom: 4, color: i === 0 ? "#ffd700" : "#ccc" }}>
              #{i + 1} {r.name} — {r.score} pts
            </div>
          ))}
        </div>
      )}
      <button onClick={onLeave} style={{
        marginTop: 20, padding: "12px 32px", borderRadius: 10,
        border: "none", background: "#7c4dff", color: "#fff",
        fontWeight: 700, cursor: "pointer", fontSize: 15,
      }}>
        Back to Lobby
      </button>
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
const startBtnStyle = {
  padding: "14px 40px", borderRadius: 12, border: "none",
  background: "linear-gradient(135deg, #64ffda, #7c4dff)",
  color: "#000", fontWeight: 800, fontSize: 16, cursor: "pointer", letterSpacing: 1,
};
const actionBtnStyle = {
  padding: "12px 24px", borderRadius: 10, border: "none",
  background: "#64ffda", color: "#000", fontWeight: 800, fontSize: 15, cursor: "pointer",
};
const guessInputStyle = {
  flex: 1, padding: "12px 16px", borderRadius: 10,
  background: "#0a0a1a", border: "1px solid #333",
  color: "#fff", fontSize: 15, outline: "none",
};
