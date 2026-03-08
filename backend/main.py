from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, game, matchmaking, leaderboard
import uvicorn

app = FastAPI(title="Worduel API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(game.router, prefix="/api/game", tags=["game"])
app.include_router(matchmaking.router, prefix="/api/matchmaking", tags=["matchmaking"])
app.include_router(leaderboard.router, prefix="/api/leaderboard", tags=["leaderboard"])

@app.get("/")
def root():
    return {"message": "Worduel API running"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
