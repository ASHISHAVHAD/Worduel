"""WebSocket endpoints — main game hub + spectator."""
import asyncio
from datetime import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from core.database import get_pool
from core.config import (
    PICTIONARY_DRAW_TIME, PICTIONARY_REVEAL_TIME,
    DUEL_TURN_TIME, BR_ROUND_TIME, ROUND_REVEAL_TIME, MAX_CHAT_HISTORY,
)
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
online_users: dict = {}


# ── Helper: start a game (shared by host-start and ready-up) ───────────
async def do_start_game(room):
    room_id = room["id"]
    room["status"] = "playing"

    if room["mode"] == "duel":
        init_duel(room)
        gs = room["game_state"]
        await manager.broadcast_to_room(room_id, {
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
        # Broadcast base info to everyone including spectators
        await manager.broadcast_to_room(room_id, {
            "type": "game_started", "mode": "pictionary",
            "round": 1,
            "drawer": gs["current_drawer"],
            "drawer_name": room["player_names"].get(gs["current_drawer"], "?"),
            "players": [{"id": p, "name": room["player_names"][p]} for p in room["players"]],
            "draw_time": PICTIONARY_DRAW_TIME,
        })
        # Send word privately to drawer only
        await manager.send_to_user(gs["current_drawer"], {
            "type": "drawer_word", "word": gs["current_word"],
        })
        start_pictionary_timer(room_id)


# ── Helper: handle premature leave ─────────────────────────────────────
async def handle_player_leave_during_game(room, left_user_id, left_username):
    room_id = room["id"]
    mode = room["mode"]
    gs = room.get("game_state")
    if room["status"] != "playing" or not gs:
        return

    remaining = list(room["players"])

    if mode == "duel":
        cancel_room_timer(room_id)
        if remaining:
            winner = remaining[0]
            await update_elo_after_match(winner, left_user_id, "duel")
            room["status"] = "finished"
            await manager.broadcast_to_room(room_id, {
                "type": "game_terminated",
                "reason": f"{left_username} left the game",
                "winner": winner,
                "winner_name": room["player_names"].get(winner, "?"),
            })

    elif mode == "battle_royale":
        if left_user_id in gs.get("alive_players", []):
            gs["alive_players"].remove(left_user_id)
            gs["eliminated"].append(left_user_id)
        if gs.get("alive_players"):
            await update_elo_after_match(gs["alive_players"][0], left_user_id, "battle_royale")
        if len(gs.get("alive_players", [])) < 2:
            cancel_room_timer(room_id)
            room["status"] = "finished"
            winner = gs["alive_players"][0] if gs["alive_players"] else None
            await manager.broadcast_to_room(room_id, {
                "type": "game_terminated",
                "reason": "Not enough players to continue",
                "winner": winner,
                "winner_name": room["player_names"].get(winner, "?") if winner else None,
            })

    elif mode == "pictionary":
        scored = sorted(gs.get("scores", {}).items(), key=lambda x: x[1], reverse=True)
        # Leaver gets ELO loss against top scorer
        if scored and scored[0][0] != left_user_id:
            await update_elo_after_match(scored[0][0], left_user_id, "pictionary")
        # Remove leaver from scores
        gs.get("scores", {}).pop(left_user_id, None)
        gs["total_turns_per_round"] = len(room["players"])

        # Pictionary needs minimum 3 — terminate if fewer remain
        if len(room["players"]) < 3:
            cancel_room_timer(room_id)
            room["status"] = "finished"
            # All remaining players are winners
            remaining_scored = sorted(
                [(p, gs.get("scores", {}).get(p, 0)) for p in room["players"]],
                key=lambda x: x[1], reverse=True
            )
            winner = remaining_scored[0][0] if remaining_scored else None
            # Give ELO win to all remaining players against the leaver
            for pid in room["players"]:
                if pid != left_user_id:
                    await update_elo_after_match(pid, left_user_id, "pictionary")
            await manager.broadcast_to_room(room_id, {
                "type": "game_terminated",
                "reason": "Not enough players to continue — remaining players win!",
                "winner": winner,
                "winner_name": room["player_names"].get(winner, "?") if winner else None,
                "scores": gs.get("scores", {}),
                "winners": [{"id": p, "name": room["player_names"].get(p, "?")} for p in room["players"]],
            })


# ── Timers ──────────────────────────────────────────────────────────────
async def pictionary_turn_timer(room_id: str):
    room = get_room(room_id)
    if not room:
        return
    gs = room["game_state"]
    gs["timer_running"] = True
    for remaining in range(PICTIONARY_DRAW_TIME, 0, -1):
        if not gs["timer_running"]:
            break
        if not get_room(room_id) or get_room(room_id)["status"] != "playing":
            return
        await manager.broadcast_to_room(room_id, {"type": "timer_tick", "remaining": remaining, "phase": "drawing"})
        await asyncio.sleep(1)

    room = get_room(room_id)
    if not room or room["status"] != "playing":
        return
    gs = room["game_state"]
    await manager.broadcast_to_room(room_id, {
        "type": "turn_ending", "word": gs["current_word"],
        "scores": gs["scores"], "countdown": PICTIONARY_REVEAL_TIME,
    })
    for i in range(PICTIONARY_REVEAL_TIME, 0, -1):
        if not get_room(room_id) or get_room(room_id)["status"] != "playing":
            return
        await manager.broadcast_to_room(room_id, {"type": "reveal_countdown", "seconds": i})
        await asyncio.sleep(1)

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
        # Broadcast new turn to everyone including spectators
        await manager.broadcast_to_room(room_id, result)
        # Send word privately to drawer only
        await manager.send_to_user(room["game_state"]["current_drawer"], {
            "type": "drawer_word", "word": room["game_state"]["current_word"],
        })
        start_pictionary_timer(room_id)


def start_pictionary_timer(room_id):
    cancel_room_timer(room_id)
    room_timers[room_id] = asyncio.create_task(pictionary_turn_timer(room_id))

async def stop_pictionary_timer_early(room_id):
    room = get_room(room_id)
    if room and room.get("game_state"):
        room["game_state"]["timer_running"] = False


async def duel_turn_timer(room_id: str):
    room = get_room(room_id)
    if not room or not room.get("game_state"):
        return
    gs = room["game_state"]
    gs["timer_running"] = True
    for remaining in range(DUEL_TURN_TIME, 0, -1):
        if not gs.get("timer_running") or gs.get("round_over"):
            return
        if not get_room(room_id) or get_room(room_id)["status"] != "playing":
            return
        await manager.broadcast_to_room(room_id, {"type": "timer_tick", "remaining": remaining, "phase": "duel_turn"})
        await asyncio.sleep(1)
    room = get_room(room_id)
    if not room or room["status"] != "playing" or gs.get("round_over"):
        return
    current = gs["current_turn"]
    others = [p for p in room["players"] if p != current]
    if not others:
        return
    other = others[0]
    gs["current_turn"] = other
    await manager.broadcast_to_room(room_id, {
        "type": "turn_timeout", "player": current,
        "player_name": room["player_names"].get(current, "?"),
        "next_turn": other, "next_turn_name": room["player_names"].get(other, "?"),
    })
    start_duel_timer(room_id)

def start_duel_timer(room_id):
    cancel_room_timer(room_id)
    room_timers[room_id] = asyncio.create_task(duel_turn_timer(room_id))

def stop_duel_timer(room_id):
    room = get_room(room_id)
    if room and room.get("game_state"):
        room["game_state"]["timer_running"] = False
    cancel_room_timer(room_id)


async def _duel_round_transition(room_id: str):
    """5-second countdown between duel rounds, then auto-advance."""
    for i in range(ROUND_REVEAL_TIME, 0, -1):
        room = get_room(room_id)
        if not room or room["status"] != "playing":
            return
        gs = room.get("game_state")
        if not gs or gs.get("match_winner"):
            return
        await manager.broadcast_to_room(room_id, {
            "type": "reveal_countdown", "seconds": i,
        })
        await asyncio.sleep(1)

    room = get_room(room_id)
    if not room or room["status"] != "playing":
        return
    gs = room.get("game_state")
    if not gs or gs.get("match_winner") or not gs.get("round_over"):
        return

    start_next_duel_round(room)
    await manager.broadcast_to_room(room_id, {
        "type": "new_round", "round": gs["round"],
        "current_turn": gs["current_turn"],
        "current_turn_name": room["player_names"].get(gs["current_turn"], "?"),
        "turn_time": DUEL_TURN_TIME,
    })
    start_duel_timer(room_id)


async def _br_round_transition(room_id: str):
    """5-second countdown between BR rounds, then auto-advance."""
    for i in range(ROUND_REVEAL_TIME, 0, -1):
        room = get_room(room_id)
        if not room or room["status"] != "playing":
            return
        gs = room.get("game_state")
        if not gs or gs.get("match_winner"):
            return
        await manager.broadcast_to_room(room_id, {
            "type": "reveal_countdown", "seconds": i,
        })
        await asyncio.sleep(1)

    room = get_room(room_id)
    if not room or room["status"] != "playing":
        return
    gs = room.get("game_state")
    if not gs or gs.get("match_winner") or not gs.get("round_over"):
        return

    start_next_br_round(room)
    await manager.broadcast_to_room(room_id, {
        "type": "new_round", "round": gs["round"],
        "alive_players": gs["alive_players"], "timer": BR_ROUND_TIME,
    })
    start_br_timer(room_id)


async def br_round_timer(room_id: str):
    room = get_room(room_id)
    if not room or not room.get("game_state"):
        return
    gs = room["game_state"]
    gs["timer_running"] = True
    for remaining in range(BR_ROUND_TIME, 0, -1):
        if not gs.get("timer_running") or gs.get("round_over"):
            return
        if not get_room(room_id) or get_room(room_id)["status"] != "playing":
            return
        await manager.broadcast_to_room(room_id, {"type": "timer_tick", "remaining": remaining, "phase": "br_round"})
        await asyncio.sleep(1)
    room = get_room(room_id)
    if not room or room["status"] != "playing" or gs.get("round_over"):
        return
    finished_ids = [f[0] for f in gs["finished_players"]]
    for pid in gs["alive_players"]:
        if pid not in finished_ids:
            gs["finished_players"].append((pid, 999))
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
        for i in range(ROUND_REVEAL_TIME, 0, -1):
            if not get_room(room_id) or get_room(room_id)["status"] != "playing":
                return
            await manager.broadcast_to_room(room_id, {"type": "reveal_countdown", "seconds": i})
            await asyncio.sleep(1)
        room = get_room(room_id)
        if not room or room["status"] != "playing":
            return
        start_next_br_round(room)
        await manager.broadcast_to_room(room_id, {
            "type": "new_round", "round": room["game_state"]["round"],
            "alive_players": room["game_state"]["alive_players"], "timer": BR_ROUND_TIME,
        })
        start_br_timer(room_id)

def start_br_timer(room_id):
    cancel_room_timer(room_id)
    room_timers[room_id] = asyncio.create_task(br_round_timer(room_id))

def stop_br_timer(room_id):
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
                remove_from_all_queues(user_id)

                await manager.broadcast_to_room(room_id, {
                    "type": "player_joined",
                    "player_id": user_id,
                    "player_name": username,
                    "players": [{"id": p, "name": room["player_names"][p]} for p in room["players"]],
                    "host": room["host"],
                    "is_matchmade": room.get("is_matchmade", False),
                    "ready_players": list(room["ready_players"]),
                    "room": {
                        "id": room["id"], "mode": room["mode"],
                        "max_players": room["max_players"], "status": room["status"],
                        "code": None if room.get("is_matchmade") else room.get("code"),
                    },
                })

            # ── Start Game (host only) ──
            elif action == "start_game":
                room_id = manager.user_rooms.get(user_id)
                room = get_room(room_id)
                if not room or room["status"] != "waiting":
                    continue
                if room["host"] != user_id:
                    await websocket.send_json({"type": "error", "message": "Only the host can start the game"})
                    continue
                min_p = 2 if room["mode"] == "duel" else 3
                if len(room["players"]) < min_p:
                    await websocket.send_json({"type": "error", "message": f"Need at least {min_p} players"})
                    continue
                await do_start_game(room)

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
                        # Auto-advance after 5s countdown
                        asyncio.create_task(_duel_round_transition(room_id))
                    elif result.get("next_turn"):
                        start_duel_timer(room_id)

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
                    if result.get("match_over"):
                        stop_br_timer(room_id)
                        gs = room["game_state"]
                        if gs.get("match_winner"):
                            for pid in gs["eliminated"]:
                                await update_elo_after_match(gs["match_winner"], pid, "battle_royale")
                        room["status"] = "finished"
                    elif result.get("round_over"):
                        stop_br_timer(room_id)
                        # Auto-advance after 5s countdown
                        asyncio.create_task(_br_round_transition(room_id))

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
                        await stop_pictionary_timer_early(room_id)

            elif action == "draw":
                room_id = manager.user_rooms.get(user_id)
                room = get_room(room_id)
                if not room or room["mode"] != "pictionary":
                    continue
                gs = room["game_state"]
                if gs["current_drawer"] != user_id:
                    continue
                draw_data = data.get("data", {})
                gs["drawing_history"].append(draw_data)
                if len(gs["drawing_history"]) > 5000:
                    gs["drawing_history"] = gs["drawing_history"][-5000:]
                await manager.broadcast_to_room(room_id, {"type": "draw_data", "data": draw_data}, exclude=user_id)

            elif action == "clear_canvas":
                room_id = manager.user_rooms.get(user_id)
                room = get_room(room_id)
                if room and room["mode"] == "pictionary":
                    gs = room["game_state"]
                    if gs["current_drawer"] == user_id:
                        gs["drawing_history"] = []
                        await manager.broadcast_to_room(room_id, {"type": "clear_canvas"}, exclude=user_id)

            elif action == "chat":
                room_id = manager.user_rooms.get(user_id)
                room = get_room(room_id)
                if room:
                    msg = {
                        "type": "chat", "player_id": user_id, "player_name": username,
                        "message": data.get("message", "")[:200],
                        "timestamp": datetime.now().isoformat(),
                    }
                    room["chat_messages"].append(msg)
                    if len(room["chat_messages"]) > MAX_CHAT_HISTORY:
                        room["chat_messages"] = room["chat_messages"][-50:]
                    await manager.broadcast_to_room(room_id, msg)

            elif action == "leave_room":
                room_id = manager.user_rooms.get(user_id)
                room = get_room(room_id)
                if room and user_id in room["players"]:
                    was_playing = room["status"] == "playing"
                    room["players"].remove(user_id)
                    room["player_names"].pop(user_id, None)
                    room["ready_players"].discard(user_id)
                    manager.user_rooms.pop(user_id, None)
                    if room["host"] == user_id and room["players"]:
                        room["host"] = room["players"][0]
                    if was_playing:
                        await handle_player_leave_during_game(room, user_id, username)
                    await manager.broadcast_to_room(room_id, {
                        "type": "player_left", "player_id": user_id, "player_name": username,
                        "players": [{"id": p, "name": room["player_names"][p]} for p in room["players"]],
                        "host": room.get("host"),
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
                was_playing = room["status"] == "playing"
                if user_id in room["players"]:
                    room["players"].remove(user_id)
                    room["player_names"].pop(user_id, None)
                room["ready_players"].discard(user_id)
                if room.get("host") == user_id and room["players"]:
                    room["host"] = room["players"][0]
                if was_playing:
                    await handle_player_leave_during_game(room, user_id, username)
                await manager.broadcast_to_room(room_id, {
                    "type": "player_disconnected", "player_id": user_id, "player_name": username,
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

    gs = room.get("game_state")
    spectator_msg = {
        "type": "spectator_joined",
        "room": {
            "id": room["id"], "mode": room["mode"], "status": room["status"],
            "players": [{"id": p, "name": room["player_names"][p]} for p in room["players"]],
            "spectator_count": room["spectator_count"],
        },
    }

    # Send current game state for mid-game catchup
    if gs:
        spectator_msg["round"] = gs.get("round", 1)
        spectator_msg["scores"] = gs.get("scores", {})

        if room["mode"] == "duel":
            spectator_msg["current_turn"] = gs.get("current_turn")
            # Send all guesses so far
            spectator_msg["guesses"] = {
                pid: [g["result"] for g in gs["guesses"].get(pid, [])]
                for pid in room["players"]
            }

        elif room["mode"] == "battle_royale":
            spectator_msg["alive_players"] = gs.get("alive_players", [])
            spectator_msg["guesses"] = {
                pid: [g["result"] for g in gs["guesses"].get(pid, [])]
                for pid in gs.get("alive_players", [])
            }

        elif room["mode"] == "pictionary":
            spectator_msg["drawer"] = gs.get("current_drawer")
            spectator_msg["drawer_name"] = room["player_names"].get(gs.get("current_drawer", ""), "?")

    await websocket.send_json(spectator_msg)

    # Send drawing history for pictionary
    if room["mode"] == "pictionary" and gs and gs.get("drawing_history"):
        for stroke in gs["drawing_history"]:
            try:
                await websocket.send_json({"type": "draw_data", "data": stroke})
            except:
                break

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.remove_spectator(room_id, websocket)
        room["spectator_count"] = max(0, room["spectator_count"] - 1)


@router.get("/api/online")
async def online_count():
    return {"count": len(online_users), "users": list(online_users.values())[:20]}
