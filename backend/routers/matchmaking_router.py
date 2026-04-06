"""Matchmaking queue endpoints."""
from fastapi import APIRouter, HTTPException, Query
from core.auth import extract_user_from_token
from core.database import get_pool
from services.matchmaking_service import add_to_queue, remove_from_queue

router = APIRouter(prefix="/api/matchmaking", tags=["matchmaking"])


@router.post("/join")
async def join_queue(mode: str = Query(...), token: str = Query(...)):
    user_id = extract_user_from_token(token)
    if not user_id:
        raise HTTPException(401, "Invalid token")
    pool = await get_pool()
    async with pool.acquire() as conn:
        user = await conn.fetchrow("SELECT username, elo FROM users WHERE id=$1", user_id)
    if not user:
        raise HTTPException(404, "User not found")
    add_to_queue(mode, user_id, user["username"], user["elo"])
    return {"status": "queued"}


@router.post("/leave")
async def leave_queue(mode: str = Query(...), token: str = Query(...)):
    user_id = extract_user_from_token(token)
    if user_id:
        remove_from_queue(mode, user_id)
    return {"status": "left"}
