import axios from 'axios';

const BASE = 'http://localhost:8000/api';

const api = axios.create({ baseURL: BASE });

// Attach token to every request
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.params = { ...cfg.params, token };
  return cfg;
});

// ── Auth ─────────────────────────────────────────────────────────────────────
export const register = (username, password) =>
  api.post('/auth/register', { username, password });

export const login = (username, password) =>
  api.post('/auth/login', { username, password });

export const getMe = (token) =>
  api.get('/auth/me', { params: { token } });

// ── Game ─────────────────────────────────────────────────────────────────────
export const createRoom = (host_id, mode, rounds = 3, time_limit = 30) =>
  api.post('/game/create-room', { host_id, mode, rounds, time_limit });

export const joinRoom = (room_id, player_id) =>
  api.post('/game/join-room', { room_id, player_id });

export const getRoom = (room_id) =>
  api.get(`/game/room/${room_id}`);

export const startGame = (room_id) =>
  api.post(`/game/start-game/${room_id}`);

export const submitGuess = (game_id, player_id, guess) =>
  api.post('/game/guess', { game_id, player_id, guess });

export const getGame = (game_id, player_id) =>
  api.get(`/game/game/${game_id}`, { params: { player_id } });

export const nextRound = (room_id) =>
  api.post(`/game/next-round/${room_id}`);

// ── Leaderboard ───────────────────────────────────────────────────────────────
export const getLeaderboard = (limit = 20, mode = 'elo') =>
  api.get('/leaderboard/top', { params: { limit, mode } });

export const getPlayerStats = (username) =>
  api.get(`/leaderboard/player/${username}`);
