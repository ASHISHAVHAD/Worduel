# ⚔️ Worduel – Competitive Multiplayer Wordle

> Strategic Wordle with Battle Royale & Duels, ELO ranking, and skill-based matchmaking.

---

## 🗂️ Project Structure

```
worduel/
├── backend/               # FastAPI Python backend
│   ├── main.py            # App entry point
│   ├── requirements.txt
│   ├── models/
│   │   └── schemas.py     # Pydantic models, in-memory DB, ELO utils
│   ├── routers/
│   │   ├── auth.py        # Register, login, session
│   │   ├── game.py        # Rooms, guessing, round logic
│   │   ├── matchmaking.py # Queue-based skill matchmaking
│   │   └── leaderboard.py # Rankings and stats
│   └── game/
│       └── engine.py      # Word list + guess evaluator
│
└── frontend/              # React frontend
    ├── package.json
    └── src/
        ├── App.js / App.css
        ├── pages/         # Home, Auth, Play, Lobby, Game, Leaderboard, Profile
        ├── components/    # Navbar, WordleBoard, Keyboard, RankBadge
        ├── context/       # AuthContext
        ├── services/      # API layer (axios)
        └── utils/         # Rank thresholds & helpers
```

---

## 🚀 Local Setup

### Prerequisites
- Python 3.10+
- Node.js 18+
- npm 8+

---

### 1. Backend

```bash
cd worduel/backend

# Create virtual environment
python -m venv venv

# Activate it
# macOS/Linux:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the server
python main.py
```

Backend will be running at: **http://localhost:8000**

Swagger UI (API docs): **http://localhost:8000/docs**

---

### 2. Frontend

```bash
cd worduel/frontend

# Install dependencies
npm install

# Start dev server
npm start
```

Frontend will be running at: **http://localhost:3000**

---

## 🎮 Game Modes

### ⚔️ Duel (1v1)
- Two players guess the **same word** on the **same shared board**
- **Alternating turns** — coin toss decides who goes first in Round 1; players alternate in subsequent rounds
- Each turn is **time-bound** (20s / 30s / 45s / 60s configurable)
- Best of 3, 5, or 7 rounds
- Opponent's colored grid hints (not letters) visible in sidebar
- ELO adjusted using chess-style formula

### 💥 Battle Royale (1 vs All)
- Up to 8 players simultaneously guess the same word
- Everyone types independently — **first to solve wins the round**
- Players who use all 6 guesses without solving are eliminated
- Multi-round format — scores tracked across rounds
- ELO updated for all participants

---

## 🏆 Ranking System

| Rank        | ELO Threshold | Icon |
|-------------|--------------|------|
| Iron        | 0+           | ⚙️   |
| Bronze      | 1100+        | 🥉   |
| Silver      | 1250+        | 🥈   |
| Gold        | 1400+        | 🥇   |
| Platinum    | 1600+        | 💎   |
| Diamond     | 1800+        | 💠   |
| Master      | 2000+        | 👑   |
| Grandmaster | 2200+        | 🔱   |

ELO uses the standard chess formula with K=32:
- Winner gain = K × (1 − expected_score)
- Loser loss = K × (0 − expected_score)

---

## 📊 Features

- **User accounts** — register/login with session tokens
- **ELO / ranked system** — 8 tiers from Iron to Grandmaster  
- **Skill-based matchmaking** — queue system matches players within ±200 ELO
- **Leaderboards** — sortable by ELO, wins, win rate, best streak
- **Player profiles** — win rate bar, streak history, rank progress
- **Coin toss** — animated overlay decides first guesser in Duel Round 1
- **Round results** — word reveal, score summary, host controls next round
- **Match results** — victory/defeat screen with final scores
- **Keyboard + click input** — physical keyboard or on-screen
- **Letter color hints** — green/yellow/gray per standard Wordle rules
- **Opponent mini-board** — see opponent's guess count & color patterns (Duel)
- **Turn timer** — countdown ring visible during your turn (Duel)
- **Room codes** — share 8-char codes to invite friends
- **Responsive UI** — works on mobile

---

## 🔌 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me?token=` | Get current user |
| POST | `/api/game/create-room` | Create a game room |
| POST | `/api/game/join-room` | Join existing room |
| GET | `/api/game/room/{id}` | Get room state |
| POST | `/api/game/start-game/{id}` | Host starts the game |
| POST | `/api/game/guess` | Submit a guess |
| GET | `/api/game/game/{id}` | Get game state |
| POST | `/api/game/next-round/{id}` | Advance to next round |
| POST | `/api/matchmaking/queue` | Join matchmaking queue |
| DELETE | `/api/matchmaking/queue` | Leave queue |
| GET | `/api/leaderboard/top` | Top players |
| GET | `/api/leaderboard/player/{name}` | Individual stats |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router v6 |
| Styling | Bootstrap 5, Framer Motion |
| HTTP Client | Axios |
| Backend | FastAPI (Python) |
| Storage | In-memory (dict-based, resets on restart) |
| Validation | Pydantic v2 |
| Server | Uvicorn |

> **Note:** Data is stored in-memory and resets when the backend restarts. For persistence, replace the `*_db` dicts in `models/schemas.py` with a real database (SQLite/PostgreSQL with SQLAlchemy).

---

## 🔮 Future Improvements

- [ ] WebSocket for real-time push (replace polling)
- [ ] Persistent database (PostgreSQL + SQLAlchemy)
- [ ] JWT authentication
- [ ] Season-based ranked resets
- [ ] Spectator mode
- [ ] Chat during games
- [ ] Custom word lists / categories
- [ ] Daily challenge (same word for everyone each day)
- [ ] Mobile app (React Native)
