"""Database and app configuration."""
import os

# PostgreSQL connection
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://wordueldb:ZBFslDpWcmKBg5WoCB8OqQIj0N0eCLW2@dpg-d7af1hshg0os73ehs4s0-a/wordueldb"
)

# App settings
APP_TITLE = "Worduel API"
CORS_ORIGINS = ["https://worduel-app.onrender.com", "http://localhost:3000",]
ELO_K_FACTOR = 32
PICTIONARY_DRAW_TIME = 60   # seconds to draw
PICTIONARY_REVEAL_TIME = 5  # seconds countdown before next turn
DUEL_TURN_TIME = 60         # seconds per turn in duel
BR_ROUND_TIME = 120         # seconds per round in battle royale
ROUND_REVEAL_TIME = 5       # countdown between rounds
MAX_CHAT_HISTORY = 100
