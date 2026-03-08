from fastapi import APIRouter, HTTPException
from models.schemas import UserCreate, UserLogin, users_db, sessions_db, get_rank
import uuid, hashlib
from datetime import datetime

router = APIRouter()

def hash_pw(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()

@router.post("/register")
def register(data: UserCreate):
    if data.username in users_db:
        raise HTTPException(400, "Username already taken")
    if len(data.username) < 3:
        raise HTTPException(400, "Username too short")
    uid = str(uuid.uuid4())
    users_db[data.username] = {
        "id": uid,
        "username": data.username,
        "password": hash_pw(data.password),
        "elo": 1000,
        "rank": "Iron",
        "wins": 0,
        "losses": 0,
        "total_games": 0,
        "win_streak": 0,
        "best_streak": 0,
        "avg_guesses": 0.0,
        "total_guesses": 0,
        "created_at": datetime.utcnow().isoformat(),
    }
    token = str(uuid.uuid4())
    sessions_db[token] = data.username
    return {"token": token, "user": _safe(users_db[data.username])}

@router.post("/login")
def login(data: UserLogin):
    user = users_db.get(data.username)
    if not user or user["password"] != hash_pw(data.password):
        raise HTTPException(401, "Invalid credentials")
    token = str(uuid.uuid4())
    sessions_db[token] = data.username
    return {"token": token, "user": _safe(user)}

@router.get("/me")
def me(token: str):
    username = sessions_db.get(token)
    if not username:
        raise HTTPException(401, "Invalid token")
    user = users_db.get(username)
    if not user:
        raise HTTPException(404, "User not found")
    return _safe(user)

def _safe(u: dict) -> dict:
    return {k: v for k, v in u.items() if k != "password"}
