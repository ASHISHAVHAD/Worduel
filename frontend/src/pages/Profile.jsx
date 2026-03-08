import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import RankBadge from '../components/RankBadge';
import { getRankInfo, RANKS } from '../utils/ranks';

export default function Profile() {
  const { user } = useAuth();
  if (!user) return null;

  const winRate = user.total_games > 0
    ? Math.round((user.wins / user.total_games) * 100)
    : 0;

  const stats = [
    { label: 'ELO', value: user.elo, icon: '⚡' },
    { label: 'Wins', value: user.wins, icon: '🏆' },
    { label: 'Losses', value: user.losses, icon: '💀' },
    { label: 'Win Rate', value: `${winRate}%`, icon: '📈' },
    { label: 'Win Streak', value: user.win_streak, icon: '🔥' },
    { label: 'Best Streak', value: user.best_streak, icon: '⭐' },
    { label: 'Games Played', value: user.total_games, icon: '🎮' },
    { label: 'Avg Guesses', value: user.avg_guesses, icon: '⌨️' },
  ];

  const rankInfo = getRankInfo(user.elo);

  return (
    <div className="profile-page container py-5">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="profile-header text-center mb-5"
      >
        <div className="profile-avatar">{user.username[0].toUpperCase()}</div>
        <h2 className="text-light mt-3 mb-1">{user.username}</h2>
        <RankBadge elo={user.elo} showProgress size="lg" />
      </motion.div>

      {/* Stats Grid */}
      <div className="row g-3 justify-content-center mb-5">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            className="col-6 col-md-3"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
          >
            <div className="stat-card">
              <div className="stat-icon">{s.icon}</div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Rank Journey */}
      <div className="rank-journey">
        <h4 className="text-light mb-4 text-center">Rank Progression</h4>
        <div className="ranks-row">
          {RANKS.map(r => {
            const unlocked = user.elo >= r.min;
            const current = getRankInfo(user.elo).name === r.name;
            return (
              <motion.div
                key={r.name}
                className={`rank-step ${unlocked ? 'unlocked' : 'locked'} ${current ? 'current' : ''}`}
                whileHover={{ scale: 1.1 }}
              >
                <div className="rank-step-icon">{r.icon}</div>
                <div className="rank-step-name" style={{ color: unlocked ? r.color : '#555' }}>
                  {r.name}
                </div>
                <div className="rank-step-elo">{r.min}+</div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Win rate bar */}
      <div className="winrate-bar-card mt-4">
        <h5 className="text-light mb-3">Win / Loss Record</h5>
        <div className="progress" style={{ height: 24, borderRadius: 12, overflow: 'hidden' }}>
          <div
            className="progress-bar bg-success"
            style={{ width: `${winRate}%` }}
          >
            {winRate > 10 && `${winRate}%`}
          </div>
          <div
            className="progress-bar bg-danger"
            style={{ width: `${100 - winRate}%` }}
          >
            {100 - winRate > 10 && `${100 - winRate}%`}
          </div>
        </div>
        <div className="d-flex justify-content-between mt-1 text-muted small">
          <span>🟢 {user.wins} Wins</span>
          <span>🔴 {user.losses} Losses</span>
        </div>
      </div>
    </div>
  );
}
