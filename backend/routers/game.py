from fastapi import APIRouter, HTTPException
from models.schemas import (
    CreateRoom, JoinRoom, GuessSubmit,
    rooms_db, games_db, users_db, sessions_db,
    get_rank, calc_elo_change
)
from game.engine import pick_word, evaluate_guess, is_valid_word
import uuid, random
from datetime import datetime, timezone

router = APIRouter()

# ── helpers ──────────────────────────────────────────────────────────────────

def _user_from_token(token: str) -> dict:
    username = sessions_db.get(token)
    if not username:
        raise HTTPException(401, "Invalid token")
    return users_db[username]

def _update_stats(username: str, won: bool, guesses_used: int):
    u = users_db[username]
    u["total_games"] += 1
    if won:
        u["wins"] += 1
        u["win_streak"] += 1
        u["best_streak"] = max(u["best_streak"], u["win_streak"])
    else:
        u["losses"] += 1
        u["win_streak"] = 0
    u["total_guesses"] += guesses_used
    u["avg_guesses"] = round(u["total_guesses"] / max(u["total_games"], 1), 2)

def _apply_elo(winner: str, loser: str):
    wu, lu = users_db[winner], users_db[loser]
    wd, ld = calc_elo_change(wu["elo"], lu["elo"])
    wu["elo"] = max(0, wu["elo"] + wd)
    lu["elo"] = max(0, lu["elo"] + ld)
    wu["rank"] = get_rank(wu["elo"])
    lu["rank"] = get_rank(lu["elo"])

# ── room management ───────────────────────────────────────────────────────────

@router.post("/create-room")
def create_room(data: CreateRoom):
    room_id = str(uuid.uuid4())[:8].upper()
    rooms_db[room_id] = {
        "room_id": room_id,
        "host": data.host_id,
        "mode": data.mode,
        "rounds": data.rounds,
        "time_limit": data.time_limit,
        "players": [data.host_id],
        "status": "waiting",  # waiting | in_progress | finished
        "current_round": 0,
        "scores": {},         # player_id -> round wins
        "round_history": [],
        "current_game_id": None,
        "max_players": 2 if data.mode == "duel" else 8,
    }
    return rooms_db[room_id]

@router.post("/join-room")
def join_room(data: JoinRoom):
    room = rooms_db.get(data.room_id)
    if not room:
        raise HTTPException(404, "Room not found")
    if room["status"] != "waiting":
        raise HTTPException(400, "Game already started")
    if data.player_id in room["players"]:
        return room  # already in
    if len(room["players"]) >= room["max_players"]:
        raise HTTPException(400, "Room is full")
    room["players"].append(data.player_id)
    room["scores"][data.player_id] = 0
    return room

@router.get("/room/{room_id}")
def get_room(room_id: str):
    room = rooms_db.get(room_id)
    if not room:
        raise HTTPException(404, "Room not found")
    return room

@router.post("/start-game/{room_id}")
def start_game(room_id: str):
    room = rooms_db.get(room_id)
    if not room:
        raise HTTPException(404, "Room not found")
    if len(room["players"]) < 2:
        raise HTTPException(400, "Need at least 2 players")
    room["status"] = "in_progress"
    for pid in room["players"]:
        room["scores"][pid] = 0
    return _start_round(room)

def _start_round(room: dict) -> dict:
    room["current_round"] += 1
    word = pick_word()
    game_id = str(uuid.uuid4())

    # Duel: determine first guesser
    if room["mode"] == "duel":
        players = room["players"]
        if room["current_round"] == 1:
            first = random.choice(players)
        else:
            # alternate
            prev_first = room["round_history"][-1]["first_guesser"] if room["round_history"] else players[0]
            first = players[1] if prev_first == players[0] else players[0]
        current_turn = first
    else:
        current_turn = None  # BR: everyone guesses simultaneously

    games_db[game_id] = {
        "game_id": game_id,
        "room_id": room["room_id"],
        "mode": room["mode"],
        "word": word,
        "round": room["current_round"],
        "status": "active",
        "guesses": {},       # player_id -> list of guess records
        "winner": None,
        "current_turn": current_turn,   # duel only
        "first_guesser": current_turn,
        "turn_deadline": None,
        "started_at": datetime.now(timezone.utc).isoformat(),
        "time_limit": room["time_limit"],
        "max_guesses": 6,
        "players": room["players"],
        "eliminated": [],
    }
    for pid in room["players"]:
        games_db[game_id]["guesses"][pid] = []

    room["current_game_id"] = game_id
    return {"room": room, "game": _safe_game(games_db[game_id])}

def _safe_game(g: dict) -> dict:
    """Return game without the secret word."""
    safe = {k: v for k, v in g.items() if k != "word"}
    return safe

# ── guessing ─────────────────────────────────────────────────────────────────

@router.post("/guess")
def submit_guess(data: GuessSubmit):
    game = games_db.get(data.game_id)
    if not game:
        raise HTTPException(404, "Game not found")
    if game["status"] != "active":
        raise HTTPException(400, "Round is over")
    if data.player_id not in game["players"]:
        raise HTTPException(403, "Not in this game")
    if data.player_id in game["eliminated"]:
        raise HTTPException(400, "You are eliminated")

    word = data.guess.upper().strip()
    if not is_valid_word(word):
        raise HTTPException(400, "Invalid guess")

    # Duel turn check
    if game["mode"] == "duel" and game["current_turn"] != data.player_id:
        raise HTTPException(400, "Not your turn")

    player_guesses = game["guesses"][data.player_id]
    if len(player_guesses) >= game["max_guesses"]:
        raise HTTPException(400, "No guesses remaining")

    result = evaluate_guess(word, game["word"])
    guess_record = {
        "guess": word,
        "result": result,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    player_guesses.append(guess_record)

    solved = all(r["status"] == "correct" for r in result)
    response_payload = {"guess_record": guess_record, "solved": solved}

    if solved:
        game["winner"] = data.player_id
        game["status"] = "round_over"
        response_payload["word"] = game["word"]
        _finish_round(game)
    elif len(player_guesses) >= game["max_guesses"]:
        # BR: eliminate this player; Duel: they lose their turn advantage
        if game["mode"] == "battle_royale":
            game["eliminated"].append(data.player_id)
            # Check if only one active player left
            active = [p for p in game["players"] if p not in game["eliminated"]]
            if len(active) == 1:
                game["winner"] = active[0]
                game["status"] = "round_over"
                response_payload["word"] = game["word"]
                _finish_round(game)
            elif len(active) == 0:
                game["status"] = "round_over"
                response_payload["word"] = game["word"]
        else:
            # Duel: player used all guesses, opponent wins by default if also out
            other = [p for p in game["players"] if p != data.player_id][0]
            other_guesses = game["guesses"][other]
            if len(other_guesses) >= game["max_guesses"]:
                game["status"] = "round_over"
                response_payload["word"] = game["word"]
            else:
                _advance_duel_turn(game, data.player_id)
    else:
        if game["mode"] == "duel":
            _advance_duel_turn(game, data.player_id)

    response_payload["game"] = _safe_game(game)
    return response_payload

def _advance_duel_turn(game: dict, current_player: str):
    players = game["players"]
    game["current_turn"] = players[1] if current_player == players[0] else players[0]

def _finish_round(game: dict):
    room = rooms_db.get(game["room_id"])
    if not room:
        return
    winner = game["winner"]
    if winner:
        room["scores"][winner] = room["scores"].get(winner, 0) + 1
    room["round_history"].append({
        "round": game["round"],
        "word": game["word"],
        "winner": winner,
        "first_guesser": game.get("first_guesser"),
    })
    # Check if match is over
    needed = (room["rounds"] // 2) + 1  # majority of rounds
    match_winner = None
    for pid, score in room["scores"].items():
        if score >= needed:
            match_winner = pid
            break
    if match_winner or room["current_round"] >= room["rounds"]:
        room["status"] = "finished"
        # Determine overall match winner by highest score
        if not match_winner:
            match_winner = max(room["scores"], key=lambda p: room["scores"][p])
        room["match_winner"] = match_winner
        # Update ELO (duel only meaningful 1v1; BR simplified)
        players = room["players"]
        if len(players) == 2:
            loser = players[1] if match_winner == players[0] else players[0]
            _apply_elo(match_winner, loser)
            _update_stats(match_winner, True, _avg_guesses_for(game, match_winner))
            _update_stats(loser, False, _avg_guesses_for(game, loser))
        elif game["mode"] == "battle_royale":
            for i, pid in enumerate(players):
                is_winner = pid == match_winner
                _update_stats(pid, is_winner, _avg_guesses_for(game, pid))
            # BR elo: winner beats everyone
            for pid in players:
                if pid != match_winner:
                    _apply_elo(match_winner, pid)

def _avg_guesses_for(game: dict, player_id: str) -> int:
    return len(game["guesses"].get(player_id, []))

@router.get("/game/{game_id}")
def get_game(game_id: str, player_id: str = ""):
    game = games_db.get(game_id)
    if not game:
        raise HTTPException(404, "Game not found")
    safe = _safe_game(game)
    if game["status"] == "round_over":
        safe["word"] = game["word"]
    return safe

@router.post("/next-round/{room_id}")
def next_round(room_id: str):
    room = rooms_db.get(room_id)
    if not room:
        raise HTTPException(404, "Room not found")
    if room["status"] == "finished":
        raise HTTPException(400, "Match is over")
    return _start_round(room)
