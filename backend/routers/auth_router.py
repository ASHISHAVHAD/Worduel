"""Auth endpoints — register, login."""
import uuid
from fastapi import APIRouter, HTTPException
from models.schemas import RegisterRequest, LoginRequest
from core.auth import hash_password, verify_password, generate_token
from core.database import get_pool
from services.elo_service import get_tier

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register")
async def register(req: RegisterRequest):
    pool = await get_pool()
    async with pool.acquire() as conn:
        existing = await conn.fetchrow("SELECT id FROM users WHERE username=$1", req.username)
        if existing:
            raise HTTPException(400, "Username taken")
        user_id = str(uuid.uuid4())[:12]
        await conn.execute(
            "INSERT INTO users (id, username, password_hash) VALUES ($1, $2, $3)",
            user_id, req.username, hash_password(req.password)
        )
    token = generate_token(user_id)
    return {"token": token, "user_id": user_id, "username": req.username, "elo": 1000, "tier": "Iron"}


@router.post("/login")
async def login(req: LoginRequest):
    pool = await get_pool()
    async with pool.acquire() as conn:
        user = await conn.fetchrow("SELECT * FROM users WHERE username=$1", req.username)
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(401, "Invalid credentials")
    token = generate_token(user["id"])
    return {
        "token": token, "user_id": user["id"], "username": user["username"],
        "elo": user["elo"], "tier": user["tier"],
        "wins": user["wins"], "losses": user["losses"],
        "draws": user["draws"], "games_played": user["games_played"],
    }
