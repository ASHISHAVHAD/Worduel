# ⚔️ WORDUEL

**Real-time multiplayer word game platform with competitive ranking.**

Duel friends in 1v1 word battles, survive a Battle Royale elimination gauntlet, or draw your way to victory in Pictionary — all with ELO-based matchmaking, live spectating, and an eight-tier ranking system from Iron to Grandmaster.

---

## ✨ Features

### 🎮 Three Game Modes

| Mode | Players | How It Works |
|------|---------|-------------|
| **⚔️ Duel** | 2 | Alternate turns guessing a 5-letter word. 60s per turn. Best of 3 rounds with auto-transition. |
| **👑 Battle Royale** | 3–6 | All guess the same word simultaneously. 120s per round. Slowest eliminated each round. Last standing wins. |
| **🎨 Pictionary** | 3–6 | Take turns drawing a secret word. Others type guesses. +3 pts guesser, +2 pts drawer. 3 rounds. |

### 🏆 Competitive System

| Feature | Details |
|---------|---------|
| **ELO Rating** | K=32 standard formula. Rating adjusts after every match. |
| **8-Tier Ranking** | Iron (0) → Bronze → Silver → Gold → Platinum → Diamond → Master → Grandmaster (2600+) |
| **Matchmaking** | Pairs players by closest ELO. Duel auto-starts with 10s countdown. |
| **Leaderboard** | Global top 20 players ranked by ELO. |

### 🌐 Multiplayer Features

| Feature | Details |
|---------|---------|
| **Private Rooms** | Create rooms with 6-character codes. Share with friends to join. |
| **Spectator Mode** | Watch live games in real time. Full state catchup on mid-game join (guess boards, canvas strokes). |
| **In-Game Chat** | Real-time messaging during matches. Independent of guess input. |
| **Friend System** | Search players, send/accept requests, view friend profiles. |
| **Player Dashboard** | Stats, win rate, tier progress bar, and match history with ELO changes. |
| **How-to-Play Guides** | Visual overlays with example boards, color explanations, and rules per mode. |

### 🛡️ Server-Authoritative Design

All game logic runs on the server. Clients send actions, the server validates and broadcasts results. Timers are server-driven `asyncio` tasks — the frontend timer display is cosmetic only. Pictionary words are never leaked to non-drawers or spectators. Leaving mid-game triggers automatic ELO penalty and game termination if below minimum players.

---

## 🛠️ Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | **React 18** | Component architecture, hooks for state management |
| Backend | **FastAPI** (Python) | Async-first, native WebSocket support, auto-generated API docs |
| Database | **PostgreSQL** (asyncpg) | Concurrent writes, indexed queries, production-ready |
| Real-Time | **WebSockets** | Persistent bidirectional connections for instant game updates |
| Auth | **Token-based** (SHA-256) | Lightweight, stateless sessions |

---

## 📦 Prerequisites

- **Python 3.10+**
- **Node.js 18+** and **npm**
- **PostgreSQL 14+**

---

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/worduel.git
cd worduel
```

### 2. Set Up PostgreSQL

```sql
-- Connect to PostgreSQL
sudo -u postgres psql

-- Create database and user
CREATE USER worduel_user WITH PASSWORD 'worduel_pass';
CREATE DATABASE worduel_db OWNER worduel_user;
GRANT ALL PRIVILEGES ON DATABASE worduel_db TO worduel_user;
\q
```

To use different credentials, update `backend/core/config.py`:
```python
DATABASE_URL = "postgresql://YOUR_USER:YOUR_PASS@localhost:5432/YOUR_DB"
```

### 3. Start the Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Tables are created automatically on first startup.  
API docs available at: **http://localhost:8000/docs**

### 4. Start the Frontend

Open a **second terminal**:

```bash
cd frontend
npm install
npm start
```

App opens at: **http://localhost:3000**

> ⚠️ Both servers must be running simultaneously.

---

## 🧪 Testing Locally

1. Open **http://localhost:3000** in **multiple browser tabs**
2. Register a different account in each tab
3. **Duel:** Create a room in tab 1 → join from tab 2 → host clicks Start Game
4. **Battle Royale / Pictionary:** Need 3+ tabs. Host starts when enough players join.
5. **Matchmaking:** Click "Find Match" in 2+ tabs (duel needs 2, others need 3)
6. **Spectating:** Start a game in 2 tabs, open a 3rd tab → Live Games section → click Watch

---

## 📁 Project Structure

```
worduel/
├── backend/
│   ├── main.py                       # App factory, router registration
│   ├── requirements.txt
│   ├── core/
│   │   ├── config.py                 # Timer durations, DB URL, ELO K-factor
│   │   ├── database.py               # asyncpg pool, table creation, indexes
│   │   └── auth.py                   # Password hashing, token generation
│   ├── models/
│   │   └── schemas.py                # Pydantic request/response models
│   ├── services/
│   │   ├── game_service.py           # Room CRUD + Duel/BR/Pictionary engines
│   │   ├── elo_service.py            # ELO calculation + match history
│   │   ├── matchmaking_service.py    # Queue management + ELO pairing
│   │   ├── word_service.py           # Load words from .txt, guess evaluation
│   │   └── connection_manager.py     # WebSocket tracking, broadcast/private
│   ├── routers/
│   │   ├── ws_router.py              # Game WebSocket hub + spectator + timers
│   │   ├── auth_router.py            # Register, login
│   │   ├── player_router.py          # Profile, leaderboard
│   │   ├── room_router.py            # Room CRUD, live games
│   │   ├── matchmaking_router.py     # Join/leave queue
│   │   └── friends_router.py         # Search, request, accept, list, remove
│   └── data/
│       ├── wordle_words.txt          # 5-letter words (one per line)
│       └── pictionary_words.txt      # Drawable nouns (one per line)
│
├── frontend/
│   ├── package.json
│   ├── public/index.html
│   └── src/
│       ├── App.js                    # Page router
│       ├── index.js                  # React entry point
│       ├── pages/
│       │   ├── AuthPage.js           # Login / Register
│       │   ├── Dashboard.js          # Lobby, matchmaking, rooms, leaderboard
│       │   ├── GameRoom.js           # All 3 game modes
│       │   ├── SpectatorView.js      # Read-only game mirror
│       │   ├── PlayerDashboard.js    # Stats, tier progress, match history
│       │   └── FriendsPage.js        # Friends, requests, search
│       ├── components/
│       │   ├── GameComponents.js     # Tile, Board, Keyboard, Chat, Timer
│       │   └── DrawCanvas.js         # HTML5 canvas with drawing tools
│       ├── hooks/
│       │   └── useGameSocket.js      # WebSocket with auto-reconnect
│       └── utils/
│           └── constants.js          # API URLs, tier config
│
├── .gitignore
└── README.md
```

---

## 📡 API Reference

### REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Create account → returns token |
| `POST` | `/api/auth/login` | Authenticate → returns token + stats |
| `GET` | `/api/players/profile/{id}` | Player stats + last 10 matches |
| `GET` | `/api/players/me?token=` | Own profile |
| `GET` | `/api/players/leaderboard` | Top 20 by ELO |
| `POST` | `/api/rooms/create?token=` | Create room → returns room ID + code |
| `GET` | `/api/rooms/list` | Public waiting rooms |
| `GET` | `/api/rooms/live` | In-progress games (for spectating) |
| `POST` | `/api/rooms/join/{code}?token=` | Join room by 6-char code |
| `POST` | `/api/matchmaking/join?mode=&token=` | Enter matchmaking queue |
| `POST` | `/api/matchmaking/leave?mode=&token=` | Leave matchmaking queue |
| `GET` | `/api/friends/search?q=&token=` | Search players by username |
| `POST` | `/api/friends/request/{id}?token=` | Send friend request |
| `POST` | `/api/friends/accept/{id}?token=` | Accept friend request |
| `POST` | `/api/friends/decline/{id}?token=` | Decline friend request |
| `GET` | `/api/friends/list?token=` | List all friends |
| `DELETE` | `/api/friends/remove/{id}?token=` | Remove friend |

### WebSocket Endpoints

| Endpoint | Purpose |
|----------|---------|
| `ws://host/ws/{user_id}` | Main game hub — all player actions |
| `ws://host/ws/spectate/{room_id}` | Read-only spectator feed |

### WebSocket Protocol

**Client → Server** (JSON with `action` field):

```
join_room, start_game, duel_guess, br_guess, pictionary_guess,
draw, clear_canvas, chat, leave_room
```

**Server → Client** (JSON with `type` field):

```
player_joined, game_started, duel_guess, br_guess, timer_tick,
reveal_countdown, turn_timeout, br_timeout, new_round,
pictionary_guess, pictionary_new_turn, drawer_word, turn_ending,
pictionary_game_over, draw_data, clear_canvas, chat, match_found,
auto_start_countdown, game_terminated, player_left,
player_disconnected, error
```

---

## 🏅 ELO Tier System

| Tier | ELO Range | Icon |
|------|-----------|------|
| Iron | 0 – 799 | ⚔️ |
| Bronze | 800 – 1099 | 🥉 |
| Silver | 1100 – 1399 | 🥈 |
| Gold | 1400 – 1699 | 🥇 |
| Platinum | 1700 – 1999 | 💎 |
| Diamond | 2000 – 2299 | 💠 |
| Master | 2300 – 2599 | 🏆 |
| Grandmaster | 2600+ | 👑 |

---

## ⚙️ Configuration

All tunable settings are in `backend/core/config.py`:

| Setting | Default | Description |
|---------|---------|-------------|
| `DATABASE_URL` | `postgresql://worduel_user:worduel_pass@localhost:5432/worduel_db` | PostgreSQL connection string |
| `DUEL_TURN_TIME` | `60` | Seconds per turn in Duel |
| `BR_ROUND_TIME` | `120` | Seconds per round in Battle Royale |
| `PICTIONARY_DRAW_TIME` | `60` | Seconds for drawing in Pictionary |
| `PICTIONARY_REVEAL_TIME` | `5` | Seconds for word reveal countdown |
| `ROUND_REVEAL_TIME` | `5` | Seconds between rounds (Duel/BR) |
| `ELO_K_FACTOR` | `32` | ELO rating adjustment magnitude |

To modify the word pool, edit `backend/data/wordle_words.txt` or `backend/data/pictionary_words.txt` — one word per line, uppercase.

---

## 🌐 Deployment (Render)

### Services to Create

| Service | Type | Root Dir | Start Command |
|---------|------|----------|---------------|
| `worduel-db` | PostgreSQL | — | — |
| `worduel-api` | Web Service | `backend` | `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| `worduel-app` | Static Site | `frontend` | Build: `npm install && npm run build` · Publish: `build` |

### Environment Variables

**Backend (`worduel-api`):**
- `DATABASE_URL` → Internal Database URL from Render PostgreSQL

**Frontend (`worduel-app`):**
- `REACT_APP_API_URL` → `https://worduel-api.onrender.com`
- `REACT_APP_WS_URL` → `wss://worduel-api.onrender.com`

Update `frontend/src/utils/constants.js` to read from env vars:
```javascript
export const API = process.env.REACT_APP_API_URL || "http://localhost:8000";
export const WS_URL = process.env.REACT_APP_WS_URL || "ws://localhost:8000";
```

Add `.python-version` file in `backend/` with `3.12.3` to avoid build issues on Render.

> Note: Use `wss://` (not `ws://`) for WebSockets in production. Render's free tier spins down after inactivity.

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| `connection refused` on backend | Ensure PostgreSQL is running. Verify credentials in `config.py`. |
| Frontend blank page | Check browser console (F12). Ensure backend is running on port 8000. |
| WebSocket won't connect | Both servers must be running. Check CORS errors in console. |
| Matchmaking not finding matches | Players must be logged in (WebSocket connected) before clicking Find Match. |
| Pictionary timer not starting | Game must be started by the host with 3+ players. |
| `pydantic-core` build error on Render | Add `.python-version` file with `3.12.3` in the backend directory. |

---

## 📄 License

This project was built as an academic project. Feel free to fork and extend.
