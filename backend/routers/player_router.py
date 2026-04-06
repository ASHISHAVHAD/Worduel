"""Player profile, stats, leaderboard, match history."""
import json
from fastapi import APIRouter, HTTPException, Query
from core.database import get_pool
from core.auth import extract_user_from_token

router = APIRouter(prefix="/api/players", tags=["players"])


@router.get("/profile/{user_id}")
async def get_profile(user_id: str):
    pool = await get_pool()
    async with pool.acquire() as conn:
        user = await conn.fetchrow("SELECT * FROM users WHERE id=$1", user_id)
        if not user:
            raise HTTPException(404, "User not found")

        recent = await conn.fetch(
            "SELECT * FROM match_history WHERE players LIKE $1 ORDER BY created_at DESC LIMIT 10",
            f"%{user_id}%"
        )

    gp = user["games_played"]
    win_rate = round((user["wins"] / gp * 100), 1) if gp > 0 else 0.0

    matches = []
    for m in recent:
        elo_changes = json.loads(m["elo_changes"]) if m["elo_changes"] else {}
        players_list = json.loads(m["players"]) if m["players"] else []
        matches.append({
            "id": m["id"],
            "mode": m["mode"],
            "winner": m["winner"],
            "won": m["winner"] == user_id,
            "elo_change": elo_changes.get(user_id, 0),
            "created_at": str(m["created_at"]),
        })

    return {
        "user_id": user["id"],
        "username": user["username"],
        "elo": user["elo"],
        "tier": user["tier"],
        "wins": user["wins"],
        "losses": user["losses"],
        "draws": user["draws"],
        "games_played": gp,
        "win_rate": win_rate,
        "recent_matches": matches,
    }


@router.get("/me")
async def get_my_profile(token: str = Query(...)):
    user_id = extract_user_from_token(token)
    if not user_id:
        raise HTTPException(401, "Invalid token")
    # Reuse the profile endpoint
    return await get_profile(user_id)


@router.get("/leaderboard")
async def leaderboard(limit: int = 20):
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT id, username, elo, tier, wins, losses, games_played FROM users ORDER BY elo DESC LIMIT $1",
            limit
        )
    return [dict(r) for r in rows]
