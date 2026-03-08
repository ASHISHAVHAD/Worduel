import React from 'react';
import { getRankInfo, getNextRank, eloProgress } from '../utils/ranks';

export default function RankBadge({ elo, showProgress = false, size = 'md' }) {
  const rank = getRankInfo(elo);
  const next = getNextRank(elo);
  const progress = eloProgress(elo);

  return (
    <div className={`rank-badge-container rank-${size}`}>
      <span className="rank-icon">{rank.icon}</span>
      <span className="rank-name" style={{ color: rank.color }}>{rank.name}</span>
      <span className="elo-text">{elo} ELO</span>
      {showProgress && (
        <div className="rank-progress mt-1">
          <div className="progress" style={{ height: '6px' }}>
            <div
              className="progress-bar"
              style={{ width: `${progress}%`, backgroundColor: rank.color }}
            />
          </div>
          {next && (
            <small className="text-muted">
              {next.min - elo} ELO to {next.name}
            </small>
          )}
        </div>
      )}
    </div>
  );
}
