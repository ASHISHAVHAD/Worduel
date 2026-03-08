import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { getRoom, startGame } from '../services/api';
import { getRankInfo } from '../utils/ranks';

export default function Lobby() {
  const { roomId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchRoom = async () => {
    try {
      const res = await getRoom(roomId);
      setRoom(res.data);
      if (res.data.status === 'in_progress' && res.data.current_game_id) {
        navigate(`/game/${roomId}`);
      }
    } catch (err) {
      toast.error('Room not found');
      navigate('/play');
    }
  };

  useEffect(() => {
    fetchRoom();
    const interval = setInterval(fetchRoom, 2000);
    return () => clearInterval(interval);
  }, [roomId]);

  const handleStart = async () => {
    setLoading(true);
    try {
      await startGame(roomId);
      navigate(`/game/${roomId}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Cannot start yet');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(roomId);
    toast.success('Room code copied!');
  };

  if (!room) return <div className="loading-screen">Loading lobby...</div>;

  const isHost = room.host === user?.username;
  const canStart = room.players.length >= 2;

  return (
    <div className="lobby-page container py-5">
      <motion.div
        className="lobby-room-card mx-auto"
        style={{ maxWidth: 600 }}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        {/* Header */}
        <div className="text-center mb-4">
          <div className="room-mode-badge mb-2">
            {room.mode === 'duel' ? '⚔️ DUEL' : '💥 BATTLE ROYALE'}
          </div>
          <h2 className="text-light mb-1">Waiting Room</h2>
          <div className="room-code-display" onClick={copyCode} title="Click to copy">
            {roomId} <span className="copy-hint">📋</span>
          </div>
          <small className="text-muted">Share this code with friends</small>
        </div>

        {/* Room info */}
        <div className="room-info-row mb-4">
          <span>🔄 {room.rounds} Rounds</span>
          {room.mode === 'duel' && <span>⏱️ {room.time_limit}s/turn</span>}
          <span>👥 {room.players.length}/{room.max_players} Players</span>
        </div>

        {/* Players */}
        <div className="players-list mb-4">
          {room.players.map((pid, i) => {
            const isCurrentUser = pid === user?.username;
            return (
              <motion.div
                key={pid}
                className={`player-slot ${isCurrentUser ? 'you' : ''}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="player-slot-avatar">{pid[0].toUpperCase()}</div>
                <div className="player-slot-name">
                  {pid} {isCurrentUser && <span className="you-badge">YOU</span>}
                  {pid === room.host && <span className="host-badge">HOST</span>}
                </div>
              </motion.div>
            );
          })}
          {/* Empty slots */}
          {Array(room.max_players - room.players.length).fill(0).map((_, i) => (
            <div key={`empty-${i}`} className="player-slot empty">
              <div className="player-slot-avatar">?</div>
              <div className="player-slot-name text-muted">Waiting for player...</div>
            </div>
          ))}
        </div>

        {/* Actions */}
        {isHost ? (
          <button
            className="btn btn-warning btn-lg fw-bold w-100"
            onClick={handleStart}
            disabled={!canStart || loading}
          >
            {loading ? 'Starting...' : canStart ? '🚀 Start Game' : `Need ${2 - room.players.length} more player(s)`}
          </button>
        ) : (
          <div className="waiting-msg">
            <div className="spinner-border spinner-border-sm text-warning me-2" />
            Waiting for host to start...
          </div>
        )}
      </motion.div>
    </div>
  );
}
