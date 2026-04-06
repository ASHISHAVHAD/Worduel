import { useState, useEffect, useCallback } from "react";
import { API, TIER_COLORS, TIER_ICONS } from "../utils/constants";

export default function FriendsPage({ user, onBack, onViewProfile }) {
  const [tab, setTab] = useState("friends"); // friends | requests | search
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [notification, setNotification] = useState("");

  const showNotif = (text) => {
    setNotification(text);
    setTimeout(() => setNotification(""), 3000);
  };

  const fetchFriends = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/friends/list?token=${user.token}`);
      setFriends(await res.json());
    } catch {}
  }, [user.token]);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/friends/requests?token=${user.token}`);
      setRequests(await res.json());
    } catch {}
  }, [user.token]);

  useEffect(() => {
    fetchFriends();
    fetchRequests();
  }, [fetchFriends, fetchRequests]);

  const searchPlayers = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`${API}/api/friends/search?q=${encodeURIComponent(searchQuery)}&token=${user.token}`);
      setSearchResults(await res.json());
    } catch {}
    setSearching(false);
  };

  const sendRequest = async (targetId) => {
    try {
      const res = await fetch(`${API}/api/friends/request/${targetId}?token=${user.token}`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        showNotif(data.status === "accepted" ? "Friend added!" : "Request sent!");
        fetchFriends();
        fetchRequests();
      } else {
        showNotif(data.detail || "Error");
      }
    } catch {}
  };

  const acceptRequest = async (requestId) => {
    try {
      const res = await fetch(`${API}/api/friends/accept/${requestId}?token=${user.token}`, { method: "POST" });
      if (res.ok) {
        showNotif("Friend request accepted!");
        fetchFriends();
        fetchRequests();
      }
    } catch {}
  };

  const declineRequest = async (requestId) => {
    try {
      await fetch(`${API}/api/friends/decline/${requestId}?token=${user.token}`, { method: "POST" });
      showNotif("Request declined");
      fetchRequests();
    } catch {}
  };

  const removeFriend = async (friendId) => {
    try {
      await fetch(`${API}/api/friends/remove/${friendId}?token=${user.token}`, { method: "DELETE" });
      showNotif("Friend removed");
      fetchFriends();
    } catch {}
  };

  const friendIds = new Set(friends.map((f) => f.id));

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={{
        padding: "16px 32px", display: "flex", justifyContent: "space-between",
        alignItems: "center", borderBottom: "1px solid #1a1a3a",
      }}>
        <button onClick={onBack} style={backBtnStyle}>← Back to Lobby</button>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#64ffda" }}>👥 Friends</h2>
        <div style={{ width: 120 }} />
      </div>

      {/* Notification */}
      {notification && (
        <div style={{
          position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)",
          padding: "10px 24px", borderRadius: 12,
          background: "rgba(100,255,218,0.15)", border: "1px solid #64ffda",
          color: "#64ffda", fontWeight: 700, fontSize: 14, zIndex: 100,
        }}>
          {notification}
        </div>
      )}

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "24px" }}>
        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, marginBottom: 24, borderRadius: 10, overflow: "hidden", border: "1px solid #333" }}>
          {[
            { key: "friends", label: `Friends (${friends.length})` },
            { key: "requests", label: `Requests${requests.length ? ` (${requests.length})` : ""}` },
            { key: "search", label: "Find Players" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                flex: 1, padding: "12px", border: "none",
                background: tab === key ? "#64ffda" : "#1a1a3a",
                color: tab === key ? "#000" : "#888",
                fontWeight: 700, cursor: "pointer", fontSize: 13,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Friends List ── */}
        {tab === "friends" && (
          <div>
            {friends.length === 0 ? (
              <EmptyState icon="👥" text='No friends yet. Use "Find Players" to search and add friends!' />
            ) : (
              friends.map((f) => (
                <PlayerCard
                  key={f.id}
                  player={f}
                  onClick={() => onViewProfile(f.id)}
                  action={
                    <button onClick={(e) => { e.stopPropagation(); removeFriend(f.id); }} style={dangerBtnStyle}>
                      Remove
                    </button>
                  }
                />
              ))
            )}
          </div>
        )}

        {/* ── Incoming Requests ── */}
        {tab === "requests" && (
          <div>
            {requests.length === 0 ? (
              <EmptyState icon="📬" text="No pending friend requests." />
            ) : (
              requests.map((r) => (
                <div key={r.request_id} style={cardStyle}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                    <div style={avatarStyle(r.tier)}>{r.username?.[0]?.toUpperCase()}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{r.username}</div>
                      <div style={{ fontSize: 12, color: TIER_COLORS[r.tier || "Iron"] }}>
                        {TIER_ICONS[r.tier || "Iron"]} {r.tier} · {r.elo} ELO
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => acceptRequest(r.request_id)} style={acceptBtnStyle}>Accept</button>
                    <button onClick={() => declineRequest(r.request_id)} style={dangerBtnStyle}>Decline</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── Search Players ── */}
        {tab === "search" && (
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchPlayers()}
                placeholder="Search by username..."
                style={inputStyle}
              />
              <button onClick={searchPlayers} disabled={searching} style={searchBtnStyle}>
                {searching ? "..." : "Search"}
              </button>
            </div>

            {searchResults.length > 0 ? (
              searchResults.map((p) => (
                <PlayerCard
                  key={p.id}
                  player={p}
                  onClick={() => onViewProfile(p.id)}
                  action={
                    friendIds.has(p.id) ? (
                      <span style={{ color: "#64ffda", fontSize: 13, fontWeight: 700 }}>✓ Friends</span>
                    ) : (
                      <button onClick={(e) => { e.stopPropagation(); sendRequest(p.id); }} style={acceptBtnStyle}>
                        Add Friend
                      </button>
                    )
                  }
                />
              ))
            ) : searchQuery && !searching ? (
              <EmptyState icon="🔍" text="No players found. Try a different username." />
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────
function PlayerCard({ player, onClick, action }) {
  const p = player;
  return (
    <div onClick={onClick} style={{ ...cardStyle, cursor: "pointer" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
        <div style={avatarStyle(p.tier)}>{p.username?.[0]?.toUpperCase()}</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{p.username}</div>
          <div style={{ fontSize: 12, color: TIER_COLORS[p.tier || "Iron"] }}>
            {TIER_ICONS[p.tier || "Iron"]} {p.tier || "Iron"} · {p.elo} ELO
          </div>
          <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>
            {p.wins}W / {p.losses}L · {p.games_played} games
          </div>
        </div>
      </div>
      {action}
    </div>
  );
}

function EmptyState({ icon, text }) {
  return (
    <div style={{
      textAlign: "center", padding: 40,
      background: "#12122a", borderRadius: 12, border: "1px solid #2a2a4a",
    }}>
      <div style={{ fontSize: 36, marginBottom: 8 }}>{icon}</div>
      <div style={{ color: "#666", fontSize: 14 }}>{text}</div>
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────
const containerStyle = {
  minHeight: "100vh",
  background: "linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 50%, #0a1a2e 100%)",
  color: "#fff", fontFamily: "'Space Grotesk', sans-serif",
};
const backBtnStyle = {
  padding: "8px 16px", borderRadius: 8, border: "1px solid #333",
  background: "transparent", color: "#888", fontWeight: 600, cursor: "pointer", fontSize: 13,
};
const cardStyle = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  padding: "14px 16px", marginBottom: 8,
  background: "#12122a", borderRadius: 12, border: "1px solid #2a2a4a",
  transition: "border-color 0.2s",
};
const avatarStyle = (tier) => ({
  width: 40, height: 40, borderRadius: "50%",
  background: `linear-gradient(135deg, ${TIER_COLORS[tier || "Iron"]}, ${TIER_COLORS[tier || "Iron"]}66)`,
  display: "flex", alignItems: "center", justifyContent: "center",
  fontSize: 18, fontWeight: 900, color: "#000",
  border: `2px solid ${TIER_COLORS[tier || "Iron"]}`,
  flexShrink: 0,
});
const acceptBtnStyle = {
  padding: "8px 16px", borderRadius: 8, border: "none",
  background: "#64ffda", color: "#000", fontWeight: 700,
  cursor: "pointer", fontSize: 13,
};
const dangerBtnStyle = {
  padding: "8px 16px", borderRadius: 8, border: "none",
  background: "#ff4444", color: "#fff", fontWeight: 700,
  cursor: "pointer", fontSize: 13,
};
const inputStyle = {
  flex: 1, padding: "12px 16px", borderRadius: 10,
  background: "#0a0a1a", border: "1px solid #333",
  color: "#fff", fontSize: 15, outline: "none",
};
const searchBtnStyle = {
  padding: "12px 24px", borderRadius: 10, border: "none",
  background: "#7c4dff", color: "#fff", fontWeight: 700,
  cursor: "pointer", fontSize: 14,
};
