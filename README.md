# WORDUEL — Multiplayer Word Game Platform

A real-time multiplayer word game platform with three game modes, ELO ranking, matchmaking, spectator mode, in-game chat, and private rooms.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 (modular components) |
| **Backend** | FastAPI (modular routers + services) |
| **Database** | PostgreSQL (via asyncpg) |
| **Real-time** | WebSockets (native FastAPI) |
| **Auth** | Token-based (SHA256) |

---

## Prerequisites

- **Python 3.10+**
- **Node.js 18+** and **npm**
- **PostgreSQL 14+** (running locally or remote)

---

## Setup & Run

### Step 1: Set up PostgreSQL

```bash
# Create the database and user
sudo -u postgres psql

CREATE USER worduel_user WITH PASSWORD 'worduel_pass';
CREATE DATABASE worduel_db OWNER worduel_user;
GRANT ALL PRIVILEGES ON DATABASE worduel_db TO worduel_user;
\q
```

Or update the connection string in `backend/core/config.py`:
```python
DATABASE_URL = "postgresql://YOUR_USER:YOUR_PASS@localhost:5432/YOUR_DB"
```

### Step 2: Start the Backend

```bash
cd worduel-project/backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Tables are created automatically on first startup. API docs at `http://localhost:8000/docs`.

### Step 3: Start the Frontend

Open a **second terminal**:

```bash
cd worduel-project/frontend
npm install
npm start
```

Opens at `http://localhost:3000`.

### Both servers must be running simultaneously.

---

## Project Structure

```
worduel-project/
├── README.md
├── backend/
│   ├── main.py                      # FastAPI app, ties all routers
│   ├── requirements.txt
│   ├── core/
│   │   ├── config.py                # DB URL, app settings, timer config
│   │   ├── database.py              # asyncpg connection pool + table init
│   │   └── auth.py                  # Password hashing, token generation
│   ├── models/
│   │   └── schemas.py               # Pydantic request/response models
│   ├── services/
│   │   ├── game_service.py          # Duel, Battle Royale, Pictionary engines
│   │   ├── elo_service.py           # ELO calculation + DB updates
│   │   ├── word_service.py          # Word lists + guess evaluation
│   │   ├── matchmaking_service.py   # Queue management + matching loop
│   │   └── connection_manager.py    # WebSocket connection tracking
│   └── routers/
│       ├── auth_router.py           # POST /api/auth/register, /login
│       ├── player_router.py         # GET /api/players/profile, /leaderboard
│       ├── room_router.py           # POST /api/rooms/create, GET /list
│       ├── matchmaking_router.py    # POST /api/matchmaking/join, /leave
│       └── ws_router.py             # WebSocket /ws/{user_id}, /ws/spectate
└── frontend/
    ├── package.json
    ├── public/
    │   └── index.html
    └── src/
        ├── App.js                   # Top-level router between pages
        ├── index.js                 # React entry point
        ├── utils/
        │   └── constants.js         # API URLs, tier colors/icons
        ├── hooks/
        │   └── useGameSocket.js     # WebSocket hook with auto-reconnect
        ├── components/
        │   ├── GameComponents.js    # LetterTile, GuessBoard, Keyboard, Chat, Timer
        │   └── DrawCanvas.js        # Pictionary drawing canvas
        └── pages/
            ├── AuthPage.js          # Login / Register
            ├── Dashboard.js         # Lobby, rooms, matchmaking, leaderboard
            ├── PlayerDashboard.js   # Player stats, match history, tier progress
            └── GameRoom.js          # All 3 game modes in one page
```

---

## What Changed (v2)

| Issue | Fix |
|-------|-----|
| Monolithic backend | Split into `core/`, `models/`, `services/`, `routers/` |
| Monolithic frontend | Split into `pages/`, `components/`, `hooks/`, `utils/` |
| SQLite database | Replaced with PostgreSQL via asyncpg |
| Matchmaking broken | Fixed: cleans disconnected players from queue, proper ELO-pairing |
| Anyone could start game | Only the room host can start now; host transfers on disconnect |
| Pictionary needed manual "Next Turn" | Server-side 60s draw timer + 5s reveal countdown, fully automatic |
| No player profile | Added PlayerDashboard with stats, win rate, match history, tier progress bar |
| No timer UI | Added CircularTimer component with color changes for urgency |

---

## Game Modes

### ⚔️ Duel Mode
- 2 players, alternating turns guessing a 5-letter word
- Best of 3 rounds
- ELO adjusted after match

### 👑 Battle Royale
- 3–6 players, all guess simultaneously
- Slowest guesser eliminated each round
- Last player standing wins

### 🎨 Pictionary
- 3–6 players take turns drawing
- **60-second draw timer** (server-controlled)
- When time runs out or word is guessed: **5-second reveal countdown**
- Auto-advances to next turn — no manual clicks needed
- +3 pts guesser, +2 pts drawer
- 3 rounds, highest score wins

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login |
| GET | `/api/players/profile/{id}` | Player stats + match history |
| GET | `/api/players/me?token=` | Own profile |
| GET | `/api/players/leaderboard` | Top players |
| POST | `/api/rooms/create?token=` | Create room |
| GET | `/api/rooms/list` | Public rooms |
| POST | `/api/rooms/join/{code}?token=` | Join by code |
| POST | `/api/matchmaking/join?mode=&token=` | Enter queue |
| POST | `/api/matchmaking/leave?mode=&token=` | Leave queue |
| WS | `/ws/{user_id}` | Main game WebSocket |
| WS | `/ws/spectate/{room_id}` | Spectator WebSocket |

---

## ELO Tier System

| Tier | ELO Range | Icon |
|------|-----------|------|
| Iron | 0–799 | ⚔️ |
| Bronze | 800–1099 | 🥉 |
| Silver | 1100–1399 | 🥈 |
| Gold | 1400–1699 | 🥇 |
| Platinum | 1700–1999 | 💎 |
| Diamond | 2000–2299 | 💠 |
| Master | 2300–2599 | 🏆 |
| Grandmaster | 2600+ | 👑 |

---

## How to Test Locally

1. Open `http://localhost:3000` in **multiple browser tabs**
2. Register different accounts in each tab
3. Create a room in one tab, join from another
4. Host clicks **Start Game**

For matchmaking: click "Find Match" in 2+ tabs (duel needs 2, others need 3).

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `connection refused` on backend | Make sure PostgreSQL is running and credentials in `config.py` are correct |
| Frontend shows blank page | Check browser console for errors; make sure backend is on port 8000 |
| WebSocket won't connect | Both servers must be running; check CORS in browser console |
| Matchmaking not finding matches | Both players must have WebSocket connected (be logged in) before clicking Find Match |
| Pictionary timer not showing | Timer is server-driven; make sure game was started by the host |
