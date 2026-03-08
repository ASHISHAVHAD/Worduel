export const RANKS = [
  { name: 'Iron',        min: 0,    color: '#8B8B8B', icon: '⚙️' },
  { name: 'Bronze',      min: 1100, color: '#CD7F32', icon: '🥉' },
  { name: 'Silver',      min: 1250, color: '#C0C0C0', icon: '🥈' },
  { name: 'Gold',        min: 1400, color: '#FFD700', icon: '🥇' },
  { name: 'Platinum',    min: 1600, color: '#00E5FF', icon: '💎' },
  { name: 'Diamond',     min: 1800, color: '#B9F2FF', icon: '💠' },
  { name: 'Master',      min: 2000, color: '#FF6B9D', icon: '👑' },
  { name: 'Grandmaster', min: 2200, color: '#FF0040', icon: '🔱' },
];

export function getRankInfo(elo) {
  let rank = RANKS[0];
  for (const r of RANKS) {
    if (elo >= r.min) rank = r;
  }
  return rank;
}

export function getNextRank(elo) {
  for (const r of RANKS) {
    if (elo < r.min) return r;
  }
  return null;
}

export function eloProgress(elo) {
  const current = getRankInfo(elo);
  const next = getNextRank(elo);
  if (!next) return 100;
  return Math.round(((elo - current.min) / (next.min - current.min)) * 100);
}
