"""Game logic engines for Duel, Battle Royale, and Pictionary."""
import asyncio
import random
import string
import uuid
import time
from datetime import datetime
from typing import Optional

from services.word_service import random_wordle_word, random_pictionary_word, evaluate_guess
from services.elo_service import update_elo_after_match
from core.config import PICTIONARY_DRAW_TIME, PICTIONARY_REVEAL_TIME

# ── In-memory game state ────────────────────────────────────────────────
rooms: dict = {}           # room_id -> room state
room_timers: dict = {}     # room_id -> asyncio.Task for pictionary timer


def generate_room_code() -> str:
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))


def create_room(mode: str, max_players: int, is_private: bool, creator_id: str) -> dict:
    room_id = str(uuid.uuid4())[:8]
    room_code = generate_room_code()
    room = {
        "id": room_id,
        "code": room_code,
        "mode": mode,
        "max_players": max_players,
        "is_private": is_private,
        "creator": creator_id,
        "host": creator_id,       # host can start game
        "players": [],
        "player_names": {},
        "status": "waiting",      # waiting | playing | finished
        "game_state": None,
        "chat_messages": [],
        "spectator_count": 0,
        "created_at": datetime.now().isoformat(),
    }
    rooms[room_id] = room
    return room


def get_room(room_id: str) -> Optional[dict]:
    return rooms.get(room_id)


def remove_room(room_id: str):
    rooms.pop(room_id, None)
    cancel_room_timer(room_id)


def list_public_rooms() -> list:
    result = []
    for r in rooms.values():
        if not r["is_private"] and r["status"] == "waiting":
            result.append({
                "id": r["id"], "mode": r["mode"],
                "players": len(r["players"]), "max_players": r["max_players"],
                "player_names": list(r["player_names"].values()),
                "host": r["host"],
            })
    return result


def list_live_games() -> list:
    """List all rooms currently in progress (available for spectating)."""
    result = []
    for r in rooms.values():
        if r["status"] == "playing":
            result.append({
                "id": r["id"],
                "mode": r["mode"],
                "is_private": r["is_private"],
                "players": len(r["players"]),
                "player_names": list(r["player_names"].values()),
                "spectator_count": r.get("spectator_count", 0),
                "round": r["game_state"]["round"] if r.get("game_state") else 1,
            })
    return result


# ── Timer management ────────────────────────────────────────────────────
def cancel_room_timer(room_id: str):
    task = room_timers.pop(room_id, None)
    if task and not task.done():
        task.cancel()


# ── DUEL ────────────────────────────────────────────────────────────────
def init_duel(room: dict):
    word = random_wordle_word()
    room["game_state"] = {
        "type": "duel",
        "target_word": word,
        "round": 1,
        "max_rounds": 3,
        "scores": {pid: 0 for pid in room["players"]},
        "current_turn": room["players"][0],
        "guesses": {pid: [] for pid in room["players"]},
        "max_guesses": 6,
        "round_over": False,
        "round_winner": None,
        "match_winner": None,
    }


def process_duel_guess(room: dict, player_id: str, guess: str) -> dict:
    gs = room["game_state"]
    if gs["current_turn"] != player_id:
        return {"error": "Not your turn"}
    if gs["round_over"]:
        return {"error": "Round is over"}

    guess = guess.upper().strip()
    if len(guess) != 5 or not guess.isalpha():
        return {"error": "Guess must be 5 letters"}

    target = gs["target_word"]
    result = evaluate_guess(guess, target)
    gs["guesses"][player_id].append({"word": guess, "result": result})

    response = {
        "type": "duel_guess",
        "player": player_id,
        "player_name": room["player_names"].get(player_id, "Unknown"),
        "guess": guess,
        "result": result,
        "round": gs["round"],
    }

    if guess == target:
        gs["round_over"] = True
        gs["round_winner"] = player_id
        gs["scores"][player_id] += 1
        response["round_won"] = True
        response["round_winner"] = player_id
        response["round_winner_name"] = room["player_names"].get(player_id, "Unknown")
        response["target_word"] = target
        response["scores"] = gs["scores"]
        if gs["scores"][player_id] >= 2:
            gs["match_winner"] = player_id
            response["match_won"] = True
            response["match_winner"] = player_id
            response["match_winner_name"] = room["player_names"].get(player_id, "Unknown")
    else:
        total_guesses = sum(len(g) for g in gs["guesses"].values())
        if total_guesses >= gs["max_guesses"] * 2:
            gs["round_over"] = True
            response["round_draw"] = True
            response["target_word"] = target
        else:
            other = [p for p in room["players"] if p != player_id][0]
            gs["current_turn"] = other
            response["next_turn"] = other

    return response


def start_next_duel_round(room: dict):
    gs = room["game_state"]
    gs["round"] += 1
    gs["target_word"] = random_wordle_word()
    gs["guesses"] = {pid: [] for pid in room["players"]}
    gs["round_over"] = False
    gs["round_winner"] = None
    gs["current_turn"] = room["players"][(gs["round"] - 1) % 2]


# ── BATTLE ROYALE ───────────────────────────────────────────────────────
def init_battle_royale(room: dict):
    word = random_wordle_word()
    room["game_state"] = {
        "type": "battle_royale",
        "target_word": word,
        "round": 1,
        "alive_players": list(room["players"]),
        "guesses": {pid: [] for pid in room["players"]},
        "max_guesses": 6,
        "finished_players": [],
        "eliminated": [],
        "round_over": False,
        "match_winner": None,
    }


def process_br_guess(room: dict, player_id: str, guess: str) -> dict:
    gs = room["game_state"]
    if player_id not in gs["alive_players"]:
        return {"error": "You are eliminated"}
    if player_id in [f[0] for f in gs["finished_players"]]:
        return {"error": "Already guessed correctly this round"}
    if gs["round_over"]:
        return {"error": "Round is over"}

    guess = guess.upper().strip()
    if len(guess) != 5 or not guess.isalpha():
        return {"error": "Guess must be 5 letters"}

    target = gs["target_word"]
    result = evaluate_guess(guess, target)
    gs["guesses"][player_id].append({"word": guess, "result": result})

    response = {
        "type": "br_guess",
        "player": player_id,
        "player_name": room["player_names"].get(player_id, "Unknown"),
        "guess_count": len(gs["guesses"][player_id]),
        "result": result,
        "round": gs["round"],
    }

    if guess == target:
        gs["finished_players"].append((player_id, len(gs["guesses"][player_id])))
        response["correct"] = True
        response["guesses_used"] = len(gs["guesses"][player_id])
    elif len(gs["guesses"][player_id]) >= gs["max_guesses"]:
        gs["finished_players"].append((player_id, 999))
        response["out_of_guesses"] = True

    alive_not_done = [p for p in gs["alive_players"] if p not in [f[0] for f in gs["finished_players"]]]
    if not alive_not_done:
        response.update(resolve_br_round(room))

    return response


def resolve_br_round(room: dict) -> dict:
    gs = room["game_state"]
    gs["round_over"] = True

    finished = gs["finished_players"]
    failed = [f for f in finished if f[1] == 999]
    succeeded = sorted([f for f in finished if f[1] != 999], key=lambda x: x[1])

    eliminated = []
    if failed:
        eliminated = [f[0] for f in failed]
    elif len(succeeded) > 1:
        worst_score = succeeded[-1][1]
        eliminated = [f[0] for f in succeeded if f[1] == worst_score]
        if len(eliminated) == len(succeeded):
            eliminated = []

    for pid in eliminated:
        if pid in gs["alive_players"]:
            gs["alive_players"].remove(pid)
            gs["eliminated"].append(pid)

    result = {
        "round_over": True,
        "eliminated": eliminated,
        "eliminated_names": [room["player_names"].get(p, "?") for p in eliminated],
        "target_word": gs["target_word"],
        "alive_count": len(gs["alive_players"]),
    }

    if len(gs["alive_players"]) <= 1:
        if gs["alive_players"]:
            gs["match_winner"] = gs["alive_players"][0]
            result["match_winner"] = gs["match_winner"]
            result["match_winner_name"] = room["player_names"].get(gs["match_winner"], "?")
        result["match_over"] = True

    return result


def start_next_br_round(room: dict):
    gs = room["game_state"]
    gs["round"] += 1
    gs["target_word"] = random_wordle_word()
    gs["guesses"] = {pid: [] for pid in gs["alive_players"]}
    gs["finished_players"] = []
    gs["round_over"] = False


# ── PICTIONARY ──────────────────────────────────────────────────────────
def init_pictionary(room: dict):
    room["game_state"] = {
        "type": "pictionary",
        "round": 1,
        "max_rounds": 3,
        "current_drawer": room["players"][0],
        "drawer_index": 0,
        "current_word": random_pictionary_word(),
        "scores": {pid: 0 for pid in room["players"]},
        "round_guessed": False,
        "timer_running": False,
        "timer_end": 0,
        "turn_in_round": 0,
        "total_turns_per_round": len(room["players"]),
    }


def process_pictionary_guess(room: dict, player_id: str, guess: str) -> dict:
    gs = room["game_state"]
    if player_id == gs["current_drawer"]:
        return {"error": "Drawer cannot guess"}
    if gs["round_guessed"]:
        return {"error": "Word already guessed"}

    guess = guess.upper().strip()
    target = gs["current_word"].upper()

    response = {
        "type": "pictionary_guess",
        "player": player_id,
        "player_name": room["player_names"].get(player_id, "Unknown"),
        "guess": guess,
    }

    if guess == target:
        gs["round_guessed"] = True
        gs["scores"][player_id] = gs["scores"].get(player_id, 0) + 3
        gs["scores"][gs["current_drawer"]] = gs["scores"].get(gs["current_drawer"], 0) + 2
        response["correct"] = True
        response["word"] = gs["current_word"]
        response["scores"] = gs["scores"]
        response["guesser_name"] = room["player_names"].get(player_id, "Unknown")
        response["drawer_name"] = room["player_names"].get(gs["current_drawer"], "Unknown")
    else:
        response["correct"] = False

    return response


def advance_pictionary_turn(room: dict) -> dict:
    gs = room["game_state"]
    gs["turn_in_round"] += 1
    gs["round_guessed"] = False
    gs["timer_running"] = False

    if gs["turn_in_round"] >= gs["total_turns_per_round"]:
        gs["turn_in_round"] = 0
        gs["round"] += 1
        if gs["round"] > gs["max_rounds"]:
            ranked = sorted(gs["scores"].items(), key=lambda x: x[1], reverse=True)
            gs["match_winner"] = ranked[0][0] if ranked else None
            return {
                "type": "pictionary_game_over",
                "scores": gs["scores"],
                "winner": gs["match_winner"],
                "winner_name": room["player_names"].get(gs["match_winner"], "?"),
                "rankings": [
                    {"player": p, "name": room["player_names"].get(p, "?"), "score": s}
                    for p, s in ranked
                ],
            }

    gs["drawer_index"] = (gs["drawer_index"] + 1) % len(room["players"])
    gs["current_drawer"] = room["players"][gs["drawer_index"]]
    gs["current_word"] = random_pictionary_word()

    return {
        "type": "pictionary_new_turn",
        "drawer": gs["current_drawer"],
        "drawer_name": room["player_names"].get(gs["current_drawer"], "Unknown"),
        "round": gs["round"],
        "turn": gs["turn_in_round"] + 1,
        "draw_time": PICTIONARY_DRAW_TIME,
    }
