from fastapi import APIRouter, HTTPException
from models.schemas import users_db, rooms_db, get_rank
from routers.game import _start_round
import uuid

router = APIRouter()

# Simple in-memory queues per mode
_queues: dict = {"duel": [], "battle_royale": []}

ELO_RANGE = 200  # acceptable elo difference for matching

@router.post("/queue")
def join_queue(player_id: str, mode: str):
    user = users_db.get(player_id)
    if not user:
        raise HTTPException(404, "User not found")
    queue = _queues[mode]
    # Remove if already queued
    _queues[mode] = [e for e in queue if e["player_id"] != player_id]
    _queues[mode].append({"player_id": player_id, "elo": user["elo"]})

    # Try to match
    if mode == "duel":
        return _try_match_duel(player_id, user["elo"])
    else:
        return _try_match_br(player_id, user["elo"])

@router.delete("/queue")
def leave_queue(player_id: str, mode: str):
    _queues[mode] = [e for e in _queues[mode] if e["player_id"] != player_id]
    return {"status": "left queue"}

def _try_match_duel(player_id: str, elo: int):
    queue = _queues["duel"]
    for entry in queue:
        if entry["player_id"] == player_id:
            continue
        if abs(entry["elo"] - elo) <= ELO_RANGE:
            # Match found
            opponent_id = entry["player_id"]
            _queues["duel"] = [e for e in queue if e["player_id"] not in [player_id, opponent_id]]
            # Create room
            room_id = str(uuid.uuid4())[:8].upper()
            rooms_db[room_id] = {
                "room_id": room_id,
                "host": player_id,
                "mode": "duel",
                "rounds": 3,
                "time_limit": 30,
                "players": [player_id, opponent_id],
                "status": "waiting",
                "current_round": 0,
                "scores": {player_id: 0, opponent_id: 0},
                "round_history": [],
                "current_game_id": None,
                "max_players": 2,
            }
            result = _start_round(rooms_db[room_id])
            rooms_db[room_id]["status"] = "in_progress"
            return {"matched": True, "room_id": room_id, "game": result}
    return {"matched": False, "queue_size": len(queue)}

def _try_match_br(player_id: str, elo: int):
    queue = _queues["battle_royale"]
    if len(queue) >= 4:
        players = [e["player_id"] for e in queue[:4]]
        _queues["battle_royale"] = queue[4:]
        room_id = str(uuid.uuid4())[:8].upper()
        rooms_db[room_id] = {
            "room_id": room_id,
            "host": players[0],
            "mode": "battle_royale",
            "rounds": 3,
            "time_limit": 0,
            "players": players,
            "status": "waiting",
            "current_round": 0,
            "scores": {p: 0 for p in players},
            "round_history": [],
            "current_game_id": None,
            "max_players": 8,
        }
        result = _start_round(rooms_db[room_id])
        rooms_db[room_id]["status"] = "in_progress"
        return {"matched": True, "room_id": room_id, "game": result}
    return {"matched": False, "queue_size": len(queue)}
