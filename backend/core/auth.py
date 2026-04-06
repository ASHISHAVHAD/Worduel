"""Authentication utilities."""
import hashlib
import secrets
import time
from typing import Optional


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    h = hashlib.sha256((salt + password).encode()).hexdigest()
    return f"{salt}:{h}"


def verify_password(password: str, stored: str) -> bool:
    parts = stored.split(":")
    if len(parts) != 2:
        return False
    salt, h = parts
    return hashlib.sha256((salt + password).encode()).hexdigest() == h


def generate_token(user_id: str) -> str:
    payload = f"{user_id}:{secrets.token_hex(16)}:{time.time()}"
    return hashlib.sha256(payload.encode()).hexdigest()[:48] + f":{user_id}"


def extract_user_from_token(token: str) -> Optional[str]:
    if token and ":" in token:
        return token.split(":")[-1]
    return None
