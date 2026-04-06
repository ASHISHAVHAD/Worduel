import { useState, useCallback } from "react";
import useGameSocket from "./hooks/useGameSocket";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import PlayerDashboard from "./pages/PlayerDashboard";
import GameRoom from "./pages/GameRoom";
import SpectatorView from "./pages/SpectatorView";
import FriendsPage from "./pages/FriendsPage";

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [currentRoom, setCurrentRoom] = useState(null);
  const [spectateRoom, setSpectateRoom] = useState(null);
  const [viewProfileId, setViewProfileId] = useState(null); // for viewing any player's profile
  const [gameMessages, setGameMessages] = useState([]);

  const handleWsMessage = useCallback((data) => {
    if (data.type === "match_found") {
      setCurrentRoom(data.room_id);
      setPage("game");
      setGameMessages([]);
    }
    setGameMessages((prev) => [...prev, data]);
  }, []);

  const { send } = useGameSocket(user?.user_id, handleWsMessage);

  const handleJoinRoom = (roomId) => {
    setCurrentRoom(roomId);
    setPage("game");
    setGameMessages([]);
  };

  const handleLeaveRoom = () => {
    if (currentRoom) send({ action: "leave_room" });
    setCurrentRoom(null);
    setPage("dashboard");
    setGameMessages([]);
  };

  const handleSpectate = (roomId) => {
    setSpectateRoom(roomId);
    setPage("spectate");
  };

  const handleViewProfile = (userId) => {
    setViewProfileId(userId || user?.user_id);
    setPage("profile");
  };

  const prevPage = useCallback(() => {
    setPage("dashboard");
    setViewProfileId(null);
  }, []);

  if (!user) return <AuthPage onAuth={setUser} />;

  if (page === "spectate" && spectateRoom) {
    return <SpectatorView roomId={spectateRoom} onLeave={() => { setSpectateRoom(null); setPage("dashboard"); }} />;
  }

  if (page === "profile") {
    return (
      <PlayerDashboard
        user={{ ...user, user_id: viewProfileId || user.user_id }}
        onBack={prevPage}
      />
    );
  }

  if (page === "friends") {
    return (
      <FriendsPage
        user={user}
        onBack={prevPage}
        onViewProfile={(id) => handleViewProfile(id)}
      />
    );
  }

  if (page === "game" && currentRoom) {
    return (
      <GameRoom
        user={user}
        roomId={currentRoom}
        send={send}
        gameMessages={gameMessages}
        onLeave={handleLeaveRoom}
      />
    );
  }

  return (
    <Dashboard
      user={user}
      send={send}
      onJoinRoom={handleJoinRoom}
      onNavigate={setPage}
      onSpectate={handleSpectate}
    />
  );
}
