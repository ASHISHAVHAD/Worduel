from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime
import uuid

# ── Pydantic schemas ──────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    username: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class User(BaseModel):
    id: str
    username: str
    elo: int = 1000
    rank: str = "Iron"
    wins: int = 0
    losses: int = 0
    total_games: int = 0
    win_streak: int = 0
    best_streak: int = 0
    avg_guesses: float = 0.0
    created_at: str = ""

class GuessResult(BaseModel):
    letter: str
    status: str  # "correct", "present", "absent"

class GuessSubmit(BaseModel):
    game_id: str
    player_id: str
    guess: str

class CreateRoom(BaseModel):
    host_id: str
    mode: str  # "battle_royale" | "duel"
    rounds: int = 3  # for duel: 3 or 5
    time_limit: int = 30  # seconds per turn (duel only)

class JoinRoom(BaseModel):
    room_id: str
    player_id: str

# ── In-memory "database" ─────────────────────────────────────────────────────

users_db: Dict[str, dict] = {}          # username -> user_dict
sessions_db: Dict[str, dict] = {}       # token -> username
rooms_db: Dict[str, dict] = {}          # room_id -> room_dict
games_db: Dict[str, dict] = {}          # game_id -> game_dict

# ── Rank thresholds ───────────────────────────────────────────────────────────

RANK_THRESHOLDS = [
    (0,    "Iron"),
    (1100, "Bronze"),
    (1250, "Silver"),
    (1400, "Gold"),
    (1600, "Platinum"),
    (1800, "Diamond"),
    (2000, "Master"),
    (2200, "Grandmaster"),
]

def get_rank(elo: int) -> str:
    rank = "Iron"
    for threshold, name in RANK_THRESHOLDS:
        if elo >= threshold:
            rank = name
    return rank

def calc_elo_change(winner_elo: int, loser_elo: int, k: int = 32) -> tuple[int, int]:
    expected_w = 1 / (1 + 10 ** ((loser_elo - winner_elo) / 400))
    expected_l = 1 - expected_w
    winner_delta = round(k * (1 - expected_w))
    loser_delta  = round(k * (0 - expected_l))
    return winner_delta, loser_delta
