"""Matchmaking service — ELO-based pairing with background loop."""
import asyncio
import time
from services.game_service import create_room, rooms
from services.connection_manager import manager

# Queues: mode -> list of {user_id, username, elo, joined_at}
queues: dict = {"duel": [], "battle_royale": [], "pictionary": []}

# Track which users are actively queuing
queued_users: set = set()


def add_to_queue(mode: str, user_id: str, username: str, elo: int):
    """Add player to matchmaking queue."""
    # Remove from any existing queue first
    remove_from_all_queues(user_id)

    if mode not in queues:
        return
    queues[mode].append({
        "user_id": user_id,
        "username": username,
        "elo": elo,
        "joined_at": time.time(),
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
    """Find the two players with closest ELO in the queue."""
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
    """Try to create a duel match from queue."""
    q = queues["duel"]
    # Only match players who are still connected
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

    room = create_room("duel", 2, False, p1["user_id"])
    for p in [p1, p2]:
        room["players"].append(p["user_id"])
        room["player_names"][p["user_id"]] = p["username"]
        manager.user_rooms[p["user_id"]] = room["id"]

    for p in [p1, p2]:
        await manager.send_to_user(p["user_id"], {
            "type": "match_found",
            "room_id": room["id"],
            "mode": "duel",
            "players": [{"id": px["user_id"], "name": px["username"]} for px in [p1, p2]],
        })


async def _match_multiplayer(mode: str, min_players: int, max_players: int):
    """Try to create a battle_royale or pictionary match."""
    q = queues[mode]
    # Only match connected players
    q = [p for p in q if manager.is_connected(p["user_id"])]
    queues[mode] = q

    if len(q) < min_players:
        return

    # Wait a bit for more players if under max, but proceed after 8 seconds
    oldest = min(p["joined_at"] for p in q) if q else time.time()
    wait_time = time.time() - oldest

    take_count = len(q)
    if take_count > max_players:
        take_count = max_players
    elif take_count < min_players:
        return
    elif take_count < max_players and wait_time < 8:
        # Wait for more players
        return

    players = q[:take_count]
    queues[mode] = q[take_count:]
    for p in players:
        queued_users.discard(p["user_id"])

    room = create_room(mode, max_players, False, players[0]["user_id"])
    for p in players:
        room["players"].append(p["user_id"])
        room["player_names"][p["user_id"]] = p["username"]
        manager.user_rooms[p["user_id"]] = room["id"]

    for p in players:
        await manager.send_to_user(p["user_id"], {
            "type": "match_found",
            "room_id": room["id"],
            "mode": mode,
            "players": [{"id": px["user_id"], "name": px["username"]} for px in players],
        })


async def matchmaking_loop():
    """Background task that runs every 2 seconds to create matches."""
    while True:
        try:
            await _match_duel()
            await _match_multiplayer("battle_royale", 3, 6)
            await _match_multiplayer("pictionary", 3, 6)
        except Exception as e:
            print(f"Matchmaking error: {e}")
        await asyncio.sleep(2)
