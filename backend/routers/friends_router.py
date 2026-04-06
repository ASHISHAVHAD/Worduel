"""Friend system — search, request, accept, list."""
import uuid
from fastapi import APIRouter, HTTPException, Query
from core.auth import extract_user_from_token
from core.database import get_pool

router = APIRouter(prefix="/api/friends", tags=["friends"])


@router.get("/search")
async def search_players(q: str = Query(..., min_length=1), token: str = Query(...)):
    """Search for players by username (partial match)."""
    user_id = extract_user_from_token(token)
    if not user_id:
        raise HTTPException(401, "Invalid token")
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT id, username, elo, tier, wins, losses, games_played FROM users WHERE LOWER(username) LIKE LOWER($1) AND id != $2 LIMIT 10",
            f"%{q}%", user_id
        )
    return [dict(r) for r in rows]


@router.post("/request/{target_id}")
async def send_friend_request(target_id: str, token: str = Query(...)):
    user_id = extract_user_from_token(token)
    if not user_id:
        raise HTTPException(401, "Invalid token")
    if user_id == target_id:
        raise HTTPException(400, "Cannot friend yourself")

    pool = await get_pool()
    async with pool.acquire() as conn:
        # Check target exists
        target = await conn.fetchrow("SELECT id FROM users WHERE id=$1", target_id)
        if not target:
            raise HTTPException(404, "User not found")

        # Check already friends
        existing = await conn.fetchrow(
            "SELECT 1 FROM friends WHERE (user_a=$1 AND user_b=$2) OR (user_a=$2 AND user_b=$1)",
            user_id, target_id
        )
        if existing:
            raise HTTPException(400, "Already friends")

        # Check existing request in either direction
        existing_req = await conn.fetchrow(
            "SELECT id, from_user, status FROM friend_requests WHERE ((from_user=$1 AND to_user=$2) OR (from_user=$2 AND to_user=$1)) AND status='pending'",
            user_id, target_id
        )
        if existing_req:
            if existing_req["from_user"] == target_id:
                # They already sent us a request — auto-accept
                await conn.execute("UPDATE friend_requests SET status='accepted' WHERE id=$1", existing_req["id"])
                a, b = sorted([user_id, target_id])
                await conn.execute("INSERT INTO friends (user_a, user_b) VALUES ($1, $2) ON CONFLICT DO NOTHING", a, b)
                return {"status": "accepted", "message": "Friend request auto-accepted (they had already sent you one)"}
            else:
                raise HTTPException(400, "Request already sent")

        req_id = str(uuid.uuid4())[:12]
        await conn.execute(
            "INSERT INTO friend_requests (id, from_user, to_user) VALUES ($1, $2, $3)",
            req_id, user_id, target_id
        )
    return {"status": "sent"}


@router.post("/accept/{request_id}")
async def accept_request(request_id: str, token: str = Query(...)):
    user_id = extract_user_from_token(token)
    if not user_id:
        raise HTTPException(401, "Invalid token")

    pool = await get_pool()
    async with pool.acquire() as conn:
        req = await conn.fetchrow(
            "SELECT * FROM friend_requests WHERE id=$1 AND to_user=$2 AND status='pending'",
            request_id, user_id
        )
        if not req:
            raise HTTPException(404, "Request not found")

        await conn.execute("UPDATE friend_requests SET status='accepted' WHERE id=$1", request_id)
        a, b = sorted([req["from_user"], req["to_user"]])
        await conn.execute("INSERT INTO friends (user_a, user_b) VALUES ($1, $2) ON CONFLICT DO NOTHING", a, b)
    return {"status": "accepted"}


@router.post("/decline/{request_id}")
async def decline_request(request_id: str, token: str = Query(...)):
    user_id = extract_user_from_token(token)
    if not user_id:
        raise HTTPException(401, "Invalid token")

    pool = await get_pool()
    async with pool.acquire() as conn:
        req = await conn.fetchrow(
            "SELECT * FROM friend_requests WHERE id=$1 AND to_user=$2 AND status='pending'",
            request_id, user_id
        )
        if not req:
            raise HTTPException(404, "Request not found")
        await conn.execute("UPDATE friend_requests SET status='declined' WHERE id=$1", request_id)
    return {"status": "declined"}


@router.get("/requests")
async def get_pending_requests(token: str = Query(...)):
    """Get incoming pending friend requests."""
    user_id = extract_user_from_token(token)
    if not user_id:
        raise HTTPException(401, "Invalid token")

    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch("""
            SELECT fr.id as request_id, fr.from_user, fr.created_at,
                   u.username, u.elo, u.tier
            FROM friend_requests fr
            JOIN users u ON u.id = fr.from_user
            WHERE fr.to_user=$1 AND fr.status='pending'
            ORDER BY fr.created_at DESC
        """, user_id)
    return [dict(r) for r in rows]


@router.get("/list")
async def list_friends(token: str = Query(...)):
    """Get all friends with their profiles."""
    user_id = extract_user_from_token(token)
    if not user_id:
        raise HTTPException(401, "Invalid token")

    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch("""
            SELECT u.id, u.username, u.elo, u.tier, u.wins, u.losses, u.games_played
            FROM friends f
            JOIN users u ON (u.id = CASE WHEN f.user_a=$1 THEN f.user_b ELSE f.user_a END)
            WHERE f.user_a=$1 OR f.user_b=$1
            ORDER BY u.username
        """, user_id)
    return [dict(r) for r in rows]


@router.delete("/remove/{friend_id}")
async def remove_friend(friend_id: str, token: str = Query(...)):
    user_id = extract_user_from_token(token)
    if not user_id:
        raise HTTPException(401, "Invalid token")

    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            "DELETE FROM friends WHERE (user_a=$1 AND user_b=$2) OR (user_a=$2 AND user_b=$1)",
            user_id, friend_id
        )
    return {"status": "removed"}
