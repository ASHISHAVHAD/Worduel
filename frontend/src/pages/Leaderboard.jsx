import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getLeaderboard } from '../services/api';
import { getRankInfo } from '../utils/ranks';
import { useAuth } from '../context/AuthContext';

const MODES = [
  { id: 'elo', label: '⚡ ELO' },
  { id: 'wins', label: '🏆 Wins' },
  { id: 'winrate', label: '📈 Win Rate' },
  { id: 'streak', label: '🔥 Best Streak' },
];

export default function Leaderboard() {
  const { user } = useAuth();
  const [board, setBoard] = useState([]);
  const [mode, setMode] = useState('elo');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getLeaderboard(20, mode)
      .then(r => setBoard(r.data))
      .finally(() => setLoading(false));
  }, [mode]);

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="leaderboard-page container py-5">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-5"
      >
        <h1 className="page-title">🏆 Leaderboard</h1>
        <p className="text-muted">Top players across all game modes</p>
      </motion.div>

      {/* Mode tabs */}
      <div className="lb-tabs mb-4">
        {MODES.map(m => (
          <button
            key={m.id}
            className={`lb-tab ${mode === m.id ? 'active' : ''}`}
            onClick={() => setMode(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-warning" />
        </div>
      ) : board.length === 0 ? (
        <div className="text-center text-muted py-5">
          No players yet. Be the first to play!
        </div>
      ) : (
        <div className="lb-table">
          {/* Header */}
          <div className="lb-header">
            <span className="lb-col-rank">#</span>
            <span className="lb-col-player">Player</span>
            <span className="lb-col-stat">ELO</span>
            <span className="lb-col-stat">W/L</span>
            <span className="lb-col-stat">Win%</span>
            <span className="lb-col-stat">Streak</span>
            <span className="lb-col-stat">Avg ⌨️</span>
          </div>
          {board.map((p, i) => {
            const rankInfo = getRankInfo(p.elo);
            const isMe = p.username === user?.username;
            return (
              <motion.div
                key={p.username}
                className={`lb-row ${isMe ? 'lb-me' : ''}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <span className="lb-col-rank">
                  {medals[i] || <span className="rank-num">{i + 1}</span>}
                </span>
                <span className="lb-col-player">
                  <span className="rank-icon-sm">{rankInfo.icon}</span>
                  <span className="player-name">{p.username}</span>
                  <span className="rank-label" style={{ color: rankInfo.color }}>
                    {rankInfo.name}
                  </span>
                  {isMe && <span className="you-tag">YOU</span>}
                </span>
                <span className="lb-col-stat stat-elo">{p.elo}</span>
                <span className="lb-col-stat">
                  <span className="text-success">{p.wins}W</span> /
                  <span className="text-danger ms-1">{p.losses}L</span>
                </span>
                <span className="lb-col-stat">{p.win_rate}%</span>
                <span className="lb-col-stat">{p.best_streak} 🔥</span>
                <span className="lb-col-stat">{p.avg_guesses}</span>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
