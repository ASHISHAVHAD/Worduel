"""Room creation, listing, joining by code, live games."""
from fastapi import APIRouter, HTTPException, Query
from models.schemas import CreateRoomRequest
from core.auth import extract_user_from_token
from services.game_service import create_room, list_public_rooms, list_live_games, rooms

router = APIRouter(prefix="/api/rooms", tags=["rooms"])


@router.post("/create")
async def create(req: CreateRoomRequest, token: str = Query(...)):
    user_id = extract_user_from_token(token)
    if not user_id:
        raise HTTPException(401, "Invalid token")
    max_p = 2 if req.mode == "duel" else req.max_players
    room = create_room(req.mode, max_p, req.is_private, user_id)
    return {"room_id": room["id"], "room_code": room.get("code")}


@router.get("/list")
async def list_rooms():
    return list_public_rooms()


@router.get("/live")
async def live_games():
    """List games currently in progress — available for spectating."""
    return list_live_games()


@router.get("/debug")
async def debug_rooms():
    """Debug: show all rooms and their status."""
    return [
        {
            "id": r["id"],
            "mode": r["mode"],
            "status": r["status"],
            "is_private": r["is_private"],
            "players": len(r["players"]),
            "player_names": list(r["player_names"].values()),
        }
        for r in rooms.values()
    ]


@router.post("/join/{room_code}")
async def join_by_code(room_code: str, token: str = Query(...)):
    user_id = extract_user_from_token(token)
    if not user_id:
        raise HTTPException(401, "Invalid token")
    for r in rooms.values():
        if r.get("code") == room_code and r["status"] == "waiting":
            return {"room_id": r["id"]}
    raise HTTPException(404, "Room not found")
