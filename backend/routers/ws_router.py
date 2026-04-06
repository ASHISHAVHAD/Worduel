"""WebSocket endpoints — main game hub + spectator."""
import asyncio
from datetime import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from core.database import get_pool
from core.config import PICTIONARY_DRAW_TIME, PICTIONARY_REVEAL_TIME, DUEL_TURN_TIME, BR_ROUND_TIME, ROUND_REVEAL_TIME, MAX_CHAT_HISTORY
from services.connection_manager import manager
from services.game_service import (
    get_room, remove_room, rooms, room_timers, cancel_room_timer,
    init_duel, process_duel_guess, start_next_duel_round,
    init_battle_royale, process_br_guess, start_next_br_round,
    init_pictionary, process_pictionary_guess, advance_pictionary_turn,
)
from services.elo_service import update_elo_after_match
from services.matchmaking_service import remove_from_all_queues

router = APIRouter()

online_users: dict = {}  # user_id -> username


# ── Pictionary server-side timer ────────────────────────────────────────
async def pictionary_turn_timer(room_id: str):
    """
    Runs for each Pictionary turn:
    1. Count down DRAW_TIME seconds, broadcasting ticks every second.
    2. When time expires (or word guessed early), broadcast reveal countdown.
    3. Auto-advance to next turn.
    """
    room = get_room(room_id)
    if not room:
        return

    gs = room["game_state"]
    gs["timer_running"] = True

    # Phase 1: Drawing countdown
    for remaining in range(PICTIONARY_DRAW_TIME, 0, -1):
        if not gs["timer_running"]:
            break  # cancelled (word guessed)
        room_check = get_room(room_id)
        if not room_check or room_check["status"] != "playing":
            return

        await manager.broadcast_to_room(room_id, {
            "type": "timer_tick",
            "remaining": remaining,
            "phase": "drawing",
        })
        await asyncio.sleep(1)

    # Phase 2: Time's up — reveal word + 5s countdown
    room = get_room(room_id)
    if not room or room["status"] != "playing":
        return
    gs = room["game_state"]

    await manager.broadcast_to_room(room_id, {
        "type": "turn_ending",
        "word": gs["current_word"],
        "scores": gs["scores"],
        "countdown": PICTIONARY_REVEAL_TIME,
    })

    for i in range(PICTIONARY_REVEAL_TIME, 0, -1):
        room_check = get_room(room_id)
        if not room_check or room_check["status"] != "playing":
            return
        await manager.broadcast_to_room(room_id, {
            "type": "reveal_countdown",
            "seconds": i,
        })
        await asyncio.sleep(1)

    # Phase 3: Auto-advance
    room = get_room(room_id)
    if not room or room["status"] != "playing":
        return

    result = advance_pictionary_turn(room)
    if result.get("type") == "pictionary_game_over":
        await manager.broadcast_to_room(room_id, result)
        gs = room["game_state"]
        if gs.get("match_winner"):
            for pid in room["players"]:
                if pid != gs["match_winner"]:
                    await update_elo_after_match(gs["match_winner"], pid, "pictionary")
        room["status"] = "finished"
    else:
        # Send new turn info, with word only to drawer
        for pid in room["players"]:
            msg = dict(result)
            if pid == room["game_state"]["current_drawer"]:
                msg["word"] = room["game_state"]["current_word"]
            await manager.send_to_user(pid, msg)
        # Start timer for new turn
        start_pictionary_timer(room_id)


def start_pictionary_timer(room_id: str):
    cancel_room_timer(room_id)
    task = asyncio.create_task(pictionary_turn_timer(room_id))
    room_timers[room_id] = task


async def stop_pictionary_timer_early(room_id: str):
    """Called when word is guessed — skip to reveal phase."""
    room = get_room(room_id)
    if room and room["game_state"]:
        room["game_state"]["timer_running"] = False
    # The timer task will detect timer_running=False and proceed to reveal


# ── Duel turn timer ─────────────────────────────────────────────────────
async def duel_turn_timer(room_id: str):
    """60s per turn. If time runs out, the current player loses their turn (skip)."""
    room = get_room(room_id)
    if not room or not room.get("game_state"):
        return
    gs = room["game_state"]
    gs["timer_running"] = True

    for remaining in range(DUEL_TURN_TIME, 0, -1):
        if not gs.get("timer_running"):
            return  # turn ended by a guess
        room_check = get_room(room_id)
        if not room_check or room_check["status"] != "playing":
            return
        if gs.get("round_over"):
            return

        await manager.broadcast_to_room(room_id, {
            "type": "timer_tick", "remaining": remaining, "phase": "duel_turn",
        })
        await asyncio.sleep(1)

    # Time ran out — skip turn
    room = get_room(room_id)
    if not room or room["status"] != "playing":
        return
    gs = room["game_state"]
    if gs.get("round_over"):
        return

    current = gs["current_turn"]
    other = [p for p in room["players"] if p != current][0]
    gs["current_turn"] = other

    await manager.broadcast_to_room(room_id, {
        "type": "turn_timeout",
        "player": current,
        "player_name": room["player_names"].get(current, "?"),
        "next_turn": other,
        "next_turn_name": room["player_names"].get(other, "?"),
    })
    # Start timer for the other player
    start_duel_timer(room_id)


def start_duel_timer(room_id: str):
    cancel_room_timer(room_id)
    task = asyncio.create_task(duel_turn_timer(room_id))
    room_timers[room_id] = task


def stop_duel_timer(room_id: str):
    room = get_room(room_id)
    if room and room.get("game_state"):
        room["game_state"]["timer_running"] = False
    cancel_room_timer(room_id)


# ── Battle Royale round timer ───────────────────────────────────────────
async def br_round_timer(room_id: str):
    """120s per round. When time runs out, anyone who hasn't guessed is marked as failed."""
    room = get_room(room_id)
    if not room or not room.get("game_state"):
        return
    gs = room["game_state"]
    gs["timer_running"] = True

    for remaining in range(BR_ROUND_TIME, 0, -1):
        if not gs.get("timer_running"):
            return  # round ended because all players finished
        room_check = get_room(room_id)
        if not room_check or room_check["status"] != "playing":
            return
        if gs.get("round_over"):
            return

        await manager.broadcast_to_room(room_id, {
            "type": "timer_tick", "remaining": remaining, "phase": "br_round",
        })
        await asyncio.sleep(1)

    # Time ran out — mark unfinished players as failed
    room = get_room(room_id)
    if not room or room["status"] != "playing":
        return
    gs = room["game_state"]
    if gs.get("round_over"):
        return

    finished_ids = [f[0] for f in gs["finished_players"]]
    for pid in gs["alive_players"]:
        if pid not in finished_ids:
            gs["finished_players"].append((pid, 999))  # failed

    from services.game_service import resolve_br_round
    result = resolve_br_round(room)
    result["type"] = "br_timeout"
    result["target_word"] = gs["target_word"]
    await manager.broadcast_to_room(room_id, result)

    if result.get("match_over"):
        if gs.get("match_winner"):
            for pid in gs["eliminated"]:
                await update_elo_after_match(gs["match_winner"], pid, "battle_royale")
        room["status"] = "finished"
    else:
        # Wait 5s reveal then auto-advance
        for i in range(ROUND_REVEAL_TIME, 0, -1):
            room_check = get_room(room_id)
            if not room_check or room_check["status"] != "playing":
                return
            await manager.broadcast_to_room(room_id, {
                "type": "reveal_countdown", "seconds": i,
            })
            await asyncio.sleep(1)

        room = get_room(room_id)
        if not room or room["status"] != "playing":
            return
        start_next_br_round(room)
        await manager.broadcast_to_room(room_id, {
            "type": "new_round", "round": room["game_state"]["round"],
            "alive_players": room["game_state"]["alive_players"],
            "timer": BR_ROUND_TIME,
        })
        start_br_timer(room_id)


def start_br_timer(room_id: str):
    cancel_room_timer(room_id)
    task = asyncio.create_task(br_round_timer(room_id))
    room_timers[room_id] = task


def stop_br_timer(room_id: str):
    room = get_room(room_id)
    if room and room.get("game_state"):
        room["game_state"]["timer_running"] = False
    cancel_room_timer(room_id)


# ── Main WebSocket ──────────────────────────────────────────────────────
@router.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(websocket, user_id)

    pool = await get_pool()
    async with pool.acquire() as conn:
        user = await conn.fetchrow("SELECT username FROM users WHERE id=$1", user_id)
    username = user["username"] if user else "Unknown"
    online_users[user_id] = username

    try:
        while True:
            data = await websocket.receive_json()
            action = data.get("action")

            # ── Join Room ──
            if action == "join_room":
                room_id = data.get("room_id")
                room = get_room(room_id)
                if not room:
                    await websocket.send_json({"type": "error", "message": "Room not found"})
                    continue
                if room["status"] != "waiting" and user_id not in room["players"]:
                    await websocket.send_json({"type": "error", "message": "Game already started"})
                    continue
                if user_id not in room["players"]:
                    if len(room["players"]) >= room["max_players"]:
                        await websocket.send_json({"type": "error", "message": "Room full"})
                        continue
                    room["players"].append(user_id)
                    room["player_names"][user_id] = username
                manager.user_rooms[user_id] = room_id
                # Remove from matchmaking if they were queued
                remove_from_all_queues(user_id)

                await manager.broadcast_to_room(room_id, {
                    "type": "player_joined",
                    "player_id": user_id,
                    "player_name": username,
                    "players": [{"id": p, "name": room["player_names"][p]} for p in room["players"]],
                    "host": room["host"],
                    "room": {
                        "id": room["id"], "mode": room["mode"],
                        "max_players": room["max_players"], "status": room["status"],
                        "code": room.get("code"),
                    },
                })

            # ── Start Game (host only) ──
            elif action == "start_game":
                room_id = manager.user_rooms.get(user_id)
                room = get_room(room_id)
                if not room:
                    continue
                if room["host"] != user_id:
                    await websocket.send_json({"type": "error", "message": "Only the host can start the game"})
                    continue
                if room["status"] != "waiting":
                    continue
                min_players = 2 if room["mode"] == "duel" else 3
                if len(room["players"]) < min_players:
                    await websocket.send_json({"type": "error", "message": f"Need at least {min_players} players"})
                    continue

                room["status"] = "playing"

                if room["mode"] == "duel":
                    init_duel(room)
                    gs = room["game_state"]
                    for pid in room["players"]:
                        await manager.send_to_user(pid, {
                            "type": "game_started", "mode": "duel",
                            "round": 1, "current_turn": gs["current_turn"],
                            "current_turn_name": room["player_names"].get(gs["current_turn"], "?"),
                            "players": [{"id": p, "name": room["player_names"][p]} for p in room["players"]],
                            "turn_time": DUEL_TURN_TIME,
                        })
                    start_duel_timer(room_id)

                elif room["mode"] == "battle_royale":
                    init_battle_royale(room)
                    await manager.broadcast_to_room(room_id, {
                        "type": "game_started", "mode": "battle_royale",
                        "round": 1,
                        "players": [{"id": p, "name": room["player_names"][p]} for p in room["players"]],
                        "round_time": BR_ROUND_TIME,
                    })
                    start_br_timer(room_id)

                elif room["mode"] == "pictionary":
                    init_pictionary(room)
                    gs = room["game_state"]
                    for pid in room["players"]:
                        msg = {
                            "type": "game_started", "mode": "pictionary",
                            "round": 1,
                            "drawer": gs["current_drawer"],
                            "drawer_name": room["player_names"].get(gs["current_drawer"], "?"),
                            "players": [{"id": p, "name": room["player_names"][p]} for p in room["players"]],
                            "draw_time": PICTIONARY_DRAW_TIME,
                        }
                        if pid == gs["current_drawer"]:
                            msg["word"] = gs["current_word"]
                        await manager.send_to_user(pid, msg)
                    # Start server timer
                    start_pictionary_timer(room_id)

            # ── Duel Guess ──
            elif action == "duel_guess":
                room_id = manager.user_rooms.get(user_id)
                room = get_room(room_id)
                if not room or room["mode"] != "duel":
                    continue
                result = process_duel_guess(room, user_id, data.get("guess", ""))
                if "error" in result:
                    await websocket.send_json({"type": "error", "message": result["error"]})
                else:
                    await manager.broadcast_to_room(room_id, result)
                    if result.get("match_won"):
                        stop_duel_timer(room_id)
                        winner = result["match_winner"]
                        loser = [p for p in room["players"] if p != winner][0]
                        await update_elo_after_match(winner, loser, "duel")
                        room["status"] = "finished"
                    elif result.get("round_won") or result.get("round_draw"):
                        stop_duel_timer(room_id)
                    elif result.get("next_turn"):
                        # Turn switched — restart timer for new player
                        start_duel_timer(room_id)

            # ── Next Round (duel / battle_royale) ──
            elif action == "next_round":
                room_id = manager.user_rooms.get(user_id)
                room = get_room(room_id)
                if not room:
                    continue
                gs = room["game_state"]

                if room["mode"] == "duel" and gs["round_over"] and not gs.get("match_winner"):
                    start_next_duel_round(room)
                    for pid in room["players"]:
                        await manager.send_to_user(pid, {
                            "type": "new_round", "round": gs["round"],
                            "current_turn": gs["current_turn"],
                            "current_turn_name": room["player_names"].get(gs["current_turn"], "?"),
                            "turn_time": DUEL_TURN_TIME,
                        })
                    start_duel_timer(room_id)

                elif room["mode"] == "battle_royale" and gs["round_over"] and not gs.get("match_winner"):
                    start_next_br_round(room)
                    await manager.broadcast_to_room(room_id, {
                        "type": "new_round", "round": gs["round"],
                        "alive_players": gs["alive_players"],
                        "timer": BR_ROUND_TIME,
                    })
                    start_br_timer(room_id)

            # ── Battle Royale Guess ──
            elif action == "br_guess":
                room_id = manager.user_rooms.get(user_id)
                room = get_room(room_id)
                if not room or room["mode"] != "battle_royale":
                    continue
                result = process_br_guess(room, user_id, data.get("guess", ""))
                if "error" in result:
                    await websocket.send_json({"type": "error", "message": result["error"]})
                else:
                    await manager.broadcast_to_room(room_id, result)
                    if result.get("round_over"):
                        stop_br_timer(room_id)
                    if result.get("match_over"):
                        stop_br_timer(room_id)
                        gs = room["game_state"]
                        if gs.get("match_winner"):
                            for pid in gs["eliminated"]:
                                await update_elo_after_match(gs["match_winner"], pid, "battle_royale")
                        room["status"] = "finished"

            # ── Pictionary Guess ──
            elif action == "pictionary_guess":
                room_id = manager.user_rooms.get(user_id)
                room = get_room(room_id)
                if not room or room["mode"] != "pictionary":
                    continue
                result = process_pictionary_guess(room, user_id, data.get("guess", ""))
                if "error" in result:
                    await websocket.send_json({"type": "error", "message": result["error"]})
                else:
                    await manager.broadcast_to_room(room_id, result)
                    if result.get("correct"):
                        # Word guessed — stop drawing timer early
                        await stop_pictionary_timer_early(room_id)

            # ── Drawing Data ──
            elif action == "draw":
                room_id = manager.user_rooms.get(user_id)
                room = get_room(room_id)
                if not room or room["mode"] != "pictionary":
                    continue
                gs = room["game_state"]
                if gs["current_drawer"] != user_id:
                    continue
                await manager.broadcast_to_room(room_id, {
                    "type": "draw_data", "data": data.get("data", {}),
                }, exclude=user_id)

            # ── Clear Canvas ──
            elif action == "clear_canvas":
                room_id = manager.user_rooms.get(user_id)
                room = get_room(room_id)
                if room and room["mode"] == "pictionary":
                    gs = room["game_state"]
                    if gs["current_drawer"] == user_id:
                        await manager.broadcast_to_room(room_id, {"type": "clear_canvas"}, exclude=user_id)

            # ── Chat ──
            elif action == "chat":
                room_id = manager.user_rooms.get(user_id)
                room = get_room(room_id)
                if room:
                    msg = {
                        "type": "chat",
                        "player_id": user_id,
                        "player_name": username,
                        "message": data.get("message", "")[:200],
                        "timestamp": datetime.now().isoformat(),
                    }
                    room["chat_messages"].append(msg)
                    if len(room["chat_messages"]) > MAX_CHAT_HISTORY:
                        room["chat_messages"] = room["chat_messages"][-50:]
                    await manager.broadcast_to_room(room_id, msg)

            # ── Leave Room ──
            elif action == "leave_room":
                room_id = manager.user_rooms.get(user_id)
                room = get_room(room_id)
                if room and user_id in room["players"]:
                    room["players"].remove(user_id)
                    room["player_names"].pop(user_id, None)
                    manager.user_rooms.pop(user_id, None)
                    # Transfer host if host left
                    if room["host"] == user_id and room["players"]:
                        room["host"] = room["players"][0]
                    await manager.broadcast_to_room(room_id, {
                        "type": "player_left",
                        "player_id": user_id,
                        "player_name": username,
                        "players": [{"id": p, "name": room["player_names"][p]} for p in room["players"]],
                        "host": room["host"],
                    })
                    if not room["players"]:
                        remove_room(room_id)

    except WebSocketDisconnect:
        room_id = manager.disconnect(user_id)
        online_users.pop(user_id, None)
        remove_from_all_queues(user_id)
        if room_id:
            room = get_room(room_id)
            if room:
                if user_id in room["players"]:
                    room["players"].remove(user_id)
                    room["player_names"].pop(user_id, None)
                if room["host"] == user_id and room["players"]:
                    room["host"] = room["players"][0]
                await manager.broadcast_to_room(room_id, {
                    "type": "player_disconnected",
                    "player_id": user_id,
                    "player_name": username,
                    "players": [{"id": p, "name": room["player_names"][p]} for p in room["players"]],
                    "host": room.get("host"),
                })
                if not room["players"]:
                    remove_room(room_id)


# ── Spectator WebSocket ─────────────────────────────────────────────────
@router.websocket("/ws/spectate/{room_id}")
async def spectator_ws(websocket: WebSocket, room_id: str):
    room = get_room(room_id)
    if not room:
        await websocket.close(code=4004)
        return
    await manager.add_spectator(room_id, websocket)
    room["spectator_count"] += 1

    await websocket.send_json({
        "type": "spectator_joined",
        "room": {
            "id": room["id"], "mode": room["mode"], "status": room["status"],
            "players": [{"id": p, "name": room["player_names"][p]} for p in room["players"]],
            "spectator_count": room["spectator_count"],
        },
    })

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.remove_spectator(room_id, websocket)
        room["spectator_count"] = max(0, room["spectator_count"] - 1)


@router.get("/api/online")
async def online_count():
    return {"count": len(online_users), "users": list(online_users.values())[:20]}
