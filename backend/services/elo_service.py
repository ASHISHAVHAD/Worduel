"""ELO rating and tier system."""
import json
import uuid
from core.config import ELO_K_FACTOR
from core.database import get_pool

TIERS = [
    ("Iron", 0, 799),
    ("Bronze", 800, 1099),
    ("Silver", 1100, 1399),
    ("Gold", 1400, 1699),
    ("Platinum", 1700, 1999),
    ("Diamond", 2000, 2299),
    ("Master", 2300, 2599),
    ("Grandmaster", 2600, 99999),
]


def get_tier(elo: int) -> str:
    for name, low, high in TIERS:
        if low <= elo <= high:
            return name
    return "Iron"


def calculate_elo(winner_elo: int, loser_elo: int, k: int = ELO_K_FACTOR) -> tuple:
    expected_w = 1 / (1 + 10 ** ((loser_elo - winner_elo) / 400))
    expected_l = 1 - expected_w
    new_winner = round(winner_elo + k * (1 - expected_w))
    new_loser = round(loser_elo + k * (0 - expected_l))
    return new_winner, max(0, new_loser)


async def update_elo_after_match(winner_id: str, loser_id: str, mode: str):
    pool = await get_pool()
    async with pool.acquire() as conn:
        winner = await conn.fetchrow("SELECT elo FROM users WHERE id=$1", winner_id)
        loser = await conn.fetchrow("SELECT elo FROM users WHERE id=$1", loser_id)
        if not winner or not loser:
            return
        new_w, new_l = calculate_elo(winner["elo"], loser["elo"])
        w_tier = get_tier(new_w)
        l_tier = get_tier(new_l)
        await conn.execute(
            "UPDATE users SET elo=$1, tier=$2, wins=wins+1, games_played=games_played+1 WHERE id=$3",
            new_w, w_tier, winner_id
        )
        await conn.execute(
            "UPDATE users SET elo=$1, tier=$2, losses=losses+1, games_played=games_played+1 WHERE id=$3",
            new_l, l_tier, loser_id
        )
        match_id = str(uuid.uuid4())[:12]
        elo_changes = json.dumps({winner_id: new_w - winner["elo"], loser_id: new_l - loser["elo"]})
        await conn.execute(
            "INSERT INTO match_history (id, mode, players, winner, elo_changes) VALUES ($1,$2,$3,$4,$5)",
            match_id, mode, json.dumps([winner_id, loser_id]), winner_id, elo_changes
        )
        return {winner_id: new_w - winner["elo"], loser_id: new_l - loser["elo"]}
