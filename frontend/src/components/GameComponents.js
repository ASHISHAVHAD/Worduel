import { useState, useEffect, useRef } from "react";

// ── Letter Tile ─────────────────────────────────────────────────────────
const STATUS_COLORS = {
  correct: "#538d4e",
  present: "#b59f3b",
  absent: "#3a3a3c",
};

export function LetterTile({ letter, status, small }) {
  const sz = small ? 34 : 48;
  return (
    <div
      style={{
        width: sz, height: sz,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        border: `2px solid ${status ? STATUS_COLORS[status] : "#565656"}`,
        backgroundColor: status ? STATUS_COLORS[status] : "transparent",
        color: "#fff", fontWeight: 700, fontSize: small ? 13 : 20,
        fontFamily: "'JetBrains Mono', monospace",
        borderRadius: 6, margin: 2,
        transition: "all 0.3s ease",
        transform: status === "correct" ? "scale(1.05)" : "scale(1)",
      }}
    >
      {letter || ""}
    </div>
  );
}

// ── Guess Row ───────────────────────────────────────────────────────────
export function GuessRow({ guess, small }) {
  const cells = [];
  for (let i = 0; i < 5; i++) {
    const g = guess?.[i];
    cells.push(
      <LetterTile key={i} letter={g?.letter || ""} status={g?.status} small={small} />
    );
  }
  return <div style={{ display: "flex", gap: 2, marginBottom: 4 }}>{cells}</div>;
}

// ── Guess Board ─────────────────────────────────────────────────────────
export function GuessBoard({ guesses, maxGuesses = 6, currentInput, small }) {
  const rows = [];
  for (let i = 0; i < maxGuesses; i++) {
    if (i < guesses.length) {
      rows.push(<GuessRow key={i} guess={guesses[i]} small={small} />);
    } else if (i === guesses.length && currentInput) {
      const cells = currentInput.split("").concat(Array(5 - currentInput.length).fill(""));
      rows.push(
        <GuessRow key={i} guess={cells.map((l) => ({ letter: l, status: null }))} small={small} />
      );
    } else {
      rows.push(<GuessRow key={i} guess={[]} small={small} />);
    }
  }
  return <div>{rows}</div>;
}

// ── Keyboard ────────────────────────────────────────────────────────────
export function Keyboard({ onKey, letterStates }) {
  const rows = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "⌫"],
  ];
  return (
    <div style={{ marginTop: 12 }}>
      {rows.map((row, ri) => (
        <div key={ri} style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: 4 }}>
          {row.map((key) => (
            <button
              key={key}
              onClick={() => onKey(key)}
              style={{
                padding: key.length > 1 ? "10px 12px" : "10px 14px",
                backgroundColor: STATUS_COLORS[letterStates[key]] || "#818384",
                color: "#fff", border: "none", borderRadius: 6,
                fontWeight: 600, fontSize: key.length > 1 ? 11 : 14,
                cursor: "pointer", fontFamily: "'JetBrains Mono', monospace",
                minWidth: key.length > 1 ? 56 : 36,
                transition: "all 0.15s ease",
              }}
            >
              {key}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Chat Panel ──────────────────────────────────────────────────────────
export function ChatPanel({ messages, onSend }) {
  const [input, setInput] = useState("");
  const chatRef = useRef(null);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  const handleSend = () => {
    if (input.trim()) {
      onSend(input.trim());
      setInput("");
    }
  };

  return (
    <div style={{
      background: "#1a1a2e", borderRadius: 12, padding: 12,
      display: "flex", flexDirection: "column", height: 260,
      border: "1px solid #2a2a4a",
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#8888aa", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>
        💬 Chat
      </div>
      <div ref={chatRef} style={{ flex: 1, overflow: "auto", marginBottom: 8 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 4, fontSize: 13 }}>
            <span style={{ color: "#64ffda", fontWeight: 600 }}>{m.player_name}:</span>{" "}
            <span style={{ color: "#ccc" }}>{m.message}</span>
          </div>
        ))}
        {messages.length === 0 && (
          <div style={{ color: "#555", fontSize: 13, fontStyle: "italic" }}>No messages yet...</div>
        )}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Type a message..."
          style={{
            flex: 1, padding: "8px 12px", borderRadius: 8,
            background: "#0d0d1a", border: "1px solid #333",
            color: "#fff", fontSize: 13, outline: "none",
          }}
        />
        <button onClick={handleSend} style={{
          padding: "8px 16px", borderRadius: 8,
          background: "#64ffda", color: "#000", border: "none",
          fontWeight: 700, cursor: "pointer", fontSize: 13,
        }}>
          Send
        </button>
      </div>
    </div>
  );
}

// ── Circular Timer ──────────────────────────────────────────────────────
export function CircularTimer({ remaining, total, phase, label }) {
  const radius = 36;
  const stroke = 5;
  const circumference = 2 * Math.PI * radius;
  const progress = remaining / total;
  const offset = circumference * (1 - progress);

  const isUrgent = remaining <= 10;
  const color = phase === "reveal"
    ? "#ffd93d"
    : isUrgent
    ? "#ff4444"
    : "#64ffda";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <svg width={86} height={86} style={{ transform: "rotate(-90deg)" }}>
        <circle cx="43" cy="43" r={radius} fill="none" stroke="#1a1a3a" strokeWidth={stroke} />
        <circle
          cx="43" cy="43" r={radius} fill="none"
          stroke={color} strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s" }}
        />
      </svg>
      <div style={{
        position: "relative", marginTop: -62,
        fontSize: 22, fontWeight: 900, color,
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        {remaining}
      </div>
      <div style={{ marginTop: 24, fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: 1 }}>
        {label || (phase === "reveal" ? "Next turn..." : "Time left")}
      </div>
    </div>
  );
}
