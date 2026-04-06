"""Pydantic models for API requests and responses."""
from pydantic import BaseModel, Field
from typing import Optional


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=20)
    password: str = Field(min_length=4)


class LoginRequest(BaseModel):
    username: str
    password: str


class CreateRoomRequest(BaseModel):
    mode: str  # "duel", "battle_royale", "pictionary"
    max_players: int = 2
    is_private: bool = False


class UserProfile(BaseModel):
    user_id: str
    username: str
    elo: int
    tier: str
    wins: int
    losses: int
    draws: int
    games_played: int
    win_rate: float = 0.0
    recent_matches: list = []
