from fastapi import APIRouter
from models.schemas import users_db

router = APIRouter()

@router.get("/top")
def leaderboard(limit: int = 20, mode: str = "elo"):
    players = [v for v in users_db.values() if v.get("total_games", 0) > 0]
    if mode == "wins":
        players.sort(key=lambda u: u["wins"], reverse=True)
    elif mode == "winrate":
        players.sort(key=lambda u: (u["wins"] / max(u["total_games"], 1)), reverse=True)
    elif mode == "streak":
        players.sort(key=lambda u: u["best_streak"], reverse=True)
    else:
        players.sort(key=lambda u: u["elo"], reverse=True)

    board = []
    for i, p in enumerate(players[:limit]):
        board.append({
            "rank_position": i + 1,
            "username": p["username"],
            "elo": p["elo"],
            "rank": p["rank"],
            "wins": p["wins"],
            "losses": p["losses"],
            "total_games": p["total_games"],
            "win_rate": round(p["wins"] / max(p["total_games"], 1) * 100, 1),
            "best_streak": p["best_streak"],
            "avg_guesses": p["avg_guesses"],
        })
    return board

@router.get("/player/{username}")
def player_stats(username: str):
    u = users_db.get(username)
    if not u:
        return {"error": "not found"}
    return {k: v for k, v in u.items() if k != "password"}
