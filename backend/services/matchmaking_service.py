"""Matchmaking service — ELO-based pairing with background loop."""
import asyncio
import time
from services.game_service import create_room
from services.connection_manager import manager

queues: dict = {"duel": [], "battle_royale": [], "pictionary": []}
queued_users: set = set()


def add_to_queue(mode: str, user_id: str, username: str, elo: int):
    remove_from_all_queues(user_id)
    if mode not in queues:
        return
    queues[mode].append({
        "user_id": user_id, "username": username,
        "elo": elo, "joined_at": time.time(),
    })
    queued_users.add(user_id)


def remove_from_queue(mode: str, user_id: str):
    if mode in queues:
        queues[mode] = [q for q in queues[mode] if q["user_id"] != user_id]
    queued_users.discard(user_id)


def remove_from_all_queues(user_id: str):
    for mode in queues:
        queues[mode] = [q for q in queues[mode] if q["user_id"] != user_id]
    queued_users.discard(user_id)


def is_queued(user_id: str) -> bool:
    return user_id in queued_users


def _find_closest_pair(queue: list) -> tuple:
    if len(queue) < 2:
        return None, None
    queue.sort(key=lambda x: x["elo"])
    best_diff = float("inf")
    best_i = 0
    for i in range(len(queue) - 1):
        diff = abs(queue[i]["elo"] - queue[i + 1]["elo"])
        if diff < best_diff:
            best_diff = diff
            best_i = i
    return best_i, best_i + 1


async def _match_duel():
    q = queues["duel"]
    q = [p for p in q if manager.is_connected(p["user_id"])]
    queues["duel"] = q
    if len(q) < 2:
        return

    i1, i2 = _find_closest_pair(q)
    if i1 is None:
        return

    p1 = q.pop(max(i1, i2))
    p2 = q.pop(min(i1, i2))
    queued_users.discard(p1["user_id"])
    queued_users.discard(p2["user_id"])

    room = create_room("duel", 2, False, p1["user_id"], is_matchmade=True)
    for p in [p1, p2]:
        room["players"].append(p["user_id"])
        room["player_names"][p["user_id"]] = p["username"]
        manager.user_rooms[p["user_id"]] = room["id"]

    for p in [p1, p2]:
        await manager.send_to_user(p["user_id"], {
            "type": "match_found",
            "room_id": room["id"],
            "mode": "duel",
            "is_matchmade": True,
            "auto_start": 10,
            "players": [{"id": px["user_id"], "name": px["username"]} for px in [p1, p2]],
        })

    # Schedule auto-start — waits for players to actually join, then counts down
    asyncio.create_task(_auto_start_duel(room["id"]))


async def _auto_start_duel(room_id: str):
    """Wait for both players to connect to the room, then 10s countdown, then start."""
    from services.game_service import get_room, init_duel
    from core.config import DUEL_TURN_TIME

    # Phase 1: Wait up to 15 seconds for both players to join_room
    for _ in range(30):  # 30 * 0.5s = 15s
        room = get_room(room_id)
        if not room or room["status"] != "waiting":
            return
        # Check both players have their WS mapped to this room
        joined = sum(1 for p in room["players"] if manager.user_rooms.get(p) == room_id)
        if joined >= 2:
            break
        await asyncio.sleep(0.5)

    room = get_room(room_id)
    if not room or room["status"] != "waiting" or len(room["players"]) < 2:
        return

    # Phase 2: 10 second countdown
    for i in range(10, 0, -1):
        room = get_room(room_id)
        if not room or room["status"] != "waiting":
            return
        await manager.broadcast_to_room(room_id, {
            "type": "auto_start_countdown", "seconds": i,
        })
        await asyncio.sleep(1)

    room = get_room(room_id)
    if not room or room["status"] != "waiting" or len(room["players"]) < 2:
        return

    # Phase 3: Start the game
    room["status"] = "playing"
    init_duel(room)
    gs = room["game_state"]
    await manager.broadcast_to_room(room_id, {
        "type": "game_started", "mode": "duel",
        "round": 1, "current_turn": gs["current_turn"],
        "current_turn_name": room["player_names"].get(gs["current_turn"], "?"),
        "players": [{"id": p, "name": room["player_names"][p]} for p in room["players"]],
        "turn_time": DUEL_TURN_TIME,
    })

    from routers.ws_router import start_duel_timer
    start_duel_timer(room_id)


async def _match_multiplayer(mode: str, min_players: int, max_players: int):
    q = queues[mode]
    q = [p for p in q if manager.is_connected(p["user_id"])]
    queues[mode] = q
    if len(q) < min_players:
        return

    oldest = min(p["joined_at"] for p in q) if q else time.time()
    wait_time = time.time() - oldest
    take_count = len(q)
    if take_count > max_players:
        take_count = max_players
    elif take_count < min_players:
        return
    elif take_count < max_players and wait_time < 8:
        return

    players = q[:take_count]
    queues[mode] = q[take_count:]
    for p in players:
        queued_users.discard(p["user_id"])

    room = create_room(mode, max_players, False, players[0]["user_id"], is_matchmade=True)
    for p in players:
        room["players"].append(p["user_id"])
        room["player_names"][p["user_id"]] = p["username"]
        manager.user_rooms[p["user_id"]] = room["id"]

    for p in players:
        await manager.send_to_user(p["user_id"], {
            "type": "match_found",
            "room_id": room["id"],
            "mode": mode,
            "is_matchmade": True,
            "players": [{"id": px["user_id"], "name": px["username"]} for px in players],
        })


async def matchmaking_loop():
    while True:
        try:
            await _match_duel()
            await _match_multiplayer("battle_royale", 3, 6)
            await _match_multiplayer("pictionary", 3, 6)
        except Exception as e:
            print(f"Matchmaking error: {e}")
        await asyncio.sleep(2)
