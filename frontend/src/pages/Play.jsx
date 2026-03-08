import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { createRoom, joinRoom, startGame } from '../services/api';
import RankBadge from '../components/RankBadge';

export default function Play() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('create'); // create | join
  const [mode, setMode] = useState('duel');
  const [rounds, setRounds] = useState(3);
  const [timeLimit, setTimeLimit] = useState(30);
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const res = await createRoom(user.username, mode, rounds, timeLimit);
      const room = res.data;
      toast.success(`Room created: ${room.room_id}`);
      navigate(`/lobby/${room.room_id}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!roomCode.trim()) { toast.error('Enter a room code'); return; }
    setLoading(true);
    try {
      await joinRoom(roomCode.trim().toUpperCase(), user.username);
      navigate(`/lobby/${roomCode.trim().toUpperCase()}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to join room');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="play-page container py-5">
      {/* Player Info */}
      <motion.div
        className="player-info-card mb-5"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="d-flex align-items-center gap-3">
          <div className="player-avatar">{user?.username?.[0]?.toUpperCase()}</div>
          <div>
            <h4 className="mb-0 text-light">{user?.username}</h4>
            <RankBadge elo={user?.elo || 1000} showProgress />
          </div>
          <div className="ms-auto stats-mini">
            <span className="stat-chip">🏆 {user?.wins}W</span>
            <span className="stat-chip">💀 {user?.losses}L</span>
            <span className="stat-chip">🔥 {user?.win_streak} streak</span>
          </div>
        </div>
      </motion.div>

      <div className="row justify-content-center g-4">
        {/* Tabs */}
        <div className="col-12 col-md-8">
          <div className="lobby-tabs mb-4">
            <button
              className={`lobby-tab ${tab === 'create' ? 'active' : ''}`}
              onClick={() => setTab('create')}
            >
              🎮 Create Room
            </button>
            <button
              className={`lobby-tab ${tab === 'join' ? 'active' : ''}`}
              onClick={() => setTab('join')}
            >
              🔗 Join Room
            </button>
          </div>

          {tab === 'create' ? (
            <motion.div
              className="lobby-card"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <h4 className="mb-4 text-light">Configure Your Match</h4>

              {/* Mode */}
              <div className="mb-4">
                <label className="form-label text-muted">Game Mode</label>
                <div className="mode-selector">
                  {[
                    { id: 'duel', label: '⚔️ Duel', sub: '1v1 alternating turns' },
                    { id: 'battle_royale', label: '💥 Battle Royale', sub: 'Up to 8 players' },
                  ].map(m => (
                    <div
                      key={m.id}
                      className={`mode-option ${mode === m.id ? 'selected' : ''}`}
                      onClick={() => setMode(m.id)}
                    >
                      <div className="mode-label">{m.label}</div>
                      <div className="mode-sub">{m.sub}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rounds */}
              <div className="mb-4">
                <label className="form-label text-muted">Number of Rounds</label>
                <div className="d-flex gap-2">
                  {[3, 5, 7].map(r => (
                    <button
                      key={r}
                      className={`btn ${rounds === r ? 'btn-warning' : 'btn-outline-secondary'}`}
                      onClick={() => setRounds(r)}
                    >
                      {r} rounds
                    </button>
                  ))}
                </div>
              </div>

              {/* Time limit (duel only) */}
              {mode === 'duel' && (
                <div className="mb-4">
                  <label className="form-label text-muted">Time per Turn (seconds)</label>
                  <div className="d-flex gap-2">
                    {[20, 30, 45, 60].map(t => (
                      <button
                        key={t}
                        className={`btn ${timeLimit === t ? 'btn-warning' : 'btn-outline-secondary'}`}
                        onClick={() => setTimeLimit(t)}
                      >
                        {t}s
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                className="btn btn-warning btn-lg fw-bold w-100 mt-2"
                onClick={handleCreate}
                disabled={loading}
              >
                {loading ? 'Creating...' : '🎮 Create Room'}
              </button>
            </motion.div>
          ) : (
            <motion.div
              className="lobby-card"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <h4 className="mb-4 text-light">Join a Room</h4>
              <label className="form-label text-muted">Room Code</label>
              <input
                className="form-control auth-input mb-3 text-center fs-4 tracking-wide"
                style={{ letterSpacing: '0.3em', textTransform: 'uppercase' }}
                value={roomCode}
                onChange={e => setRoomCode(e.target.value.toUpperCase())}
                placeholder="ENTER CODE"
                maxLength={8}
              />
              <button
                className="btn btn-warning btn-lg fw-bold w-100"
                onClick={handleJoin}
                disabled={loading}
              >
                {loading ? 'Joining...' : '🔗 Join Room'}
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
