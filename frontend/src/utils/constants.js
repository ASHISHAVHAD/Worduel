// API and WebSocket base URLs
export const API = "http://localhost:8000";
export const WS_URL = "ws://localhost:8000";

// Tier visual config
export const TIER_COLORS = {
  Iron: "#7a7a7a",
  Bronze: "#cd7f32",
  Silver: "#c0c0c0",
  Gold: "#ffd700",
  Platinum: "#00d4aa",
  Diamond: "#b9f2ff",
  Master: "#ff6b6b",
  Grandmaster: "#ff4500",
};

export const TIER_ICONS = {
  Iron: "⚔️",
  Bronze: "🥉",
  Silver: "🥈",
  Gold: "🥇",
  Platinum: "💎",
  Diamond: "💠",
  Master: "🏆",
  Grandmaster: "👑",
};

export const MODE_INFO = {
  duel: { title: "Duel", icon: "⚔️", desc: "1v1 Best of 3", color: "#ff6b6b" },
  battle_royale: { title: "Battle Royale", icon: "👑", desc: "Up to 6 players, last standing", color: "#ffd93d" },
  pictionary: { title: "Pictionary", icon: "🎨", desc: "Draw & guess with friends", color: "#6bcb77" },
};
