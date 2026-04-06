"""PostgreSQL database layer using asyncpg."""
import asyncpg
from core.config import DATABASE_URL

pool: asyncpg.Pool = None


async def init_db():
    """Create connection pool and initialize tables."""
    global pool
    pool = await asyncpg.create_pool(DATABASE_URL, min_size=2, max_size=10)
    async with pool.acquire() as conn:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                elo INTEGER DEFAULT 1000,
                tier TEXT DEFAULT 'Iron',
                wins INTEGER DEFAULT 0,
                losses INTEGER DEFAULT 0,
                draws INTEGER DEFAULT 0,
                games_played INTEGER DEFAULT 0,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS match_history (
                id TEXT PRIMARY KEY,
                mode TEXT NOT NULL,
                players TEXT NOT NULL,
                winner TEXT,
                elo_changes TEXT,
                duration_seconds INTEGER DEFAULT 0,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        """)
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_users_elo ON users(elo DESC);
        """)
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
        """)
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_match_history_created
            ON match_history(created_at DESC);
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS friend_requests (
                id TEXT PRIMARY KEY,
                from_user TEXT NOT NULL REFERENCES users(id),
                to_user TEXT NOT NULL REFERENCES users(id),
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(from_user, to_user)
            );
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS friends (
                user_a TEXT NOT NULL REFERENCES users(id),
                user_b TEXT NOT NULL REFERENCES users(id),
                created_at TIMESTAMPTZ DEFAULT NOW(),
                PRIMARY KEY(user_a, user_b)
            );
        """)
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_fr_to ON friend_requests(to_user) WHERE status='pending';
        """)
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_friends_a ON friends(user_a);
        """)
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_friends_b ON friends(user_b);
        """)


async def close_db():
    global pool
    if pool:
        await pool.close()


async def get_pool() -> asyncpg.Pool:
    return pool
