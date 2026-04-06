"""Worduel — Main FastAPI application."""
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import APP_TITLE, CORS_ORIGINS
from core.database import init_db, close_db
from routers.auth_router import router as auth_router
from routers.player_router import router as player_router
from routers.room_router import router as room_router
from routers.matchmaking_router import router as matchmaking_router
from routers.friends_router import router as friends_router
from routers.ws_router import router as ws_router
from services.matchmaking_service import matchmaking_loop


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    task = asyncio.create_task(matchmaking_loop())
    yield
    task.cancel()
    await close_db()


app = FastAPI(title=APP_TITLE, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# REST routers
app.include_router(auth_router)
app.include_router(player_router)
app.include_router(room_router)
app.include_router(matchmaking_router)
app.include_router(friends_router)

# WebSocket router
app.include_router(ws_router)


@app.get("/")
async def root():
    return {"app": "Worduel", "status": "running"}
