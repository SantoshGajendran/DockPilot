import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
import jwt
from app.core.config import get_settings

hasher = PasswordHasher(
    time_cost=2,
    memory_cost=65536,
    parallelism=1,
    hash_len=32,
)

def hash_password(password: str) -> str:
    return hasher.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return hasher.verify(hashed_password, plain_password)
    except (VerifyMismatchError, Exception):
        return False

def create_access_token(user_id: uuid.UUID, username: str, role: str) -> str:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.jwt_access_expire_minutes)
    payload = {
        "sub": str(user_id),
        "username": username,
        "role": role,
        "type": "access",
        "iat": now,
        "exp": expire,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")

def create_refresh_token(user_id: uuid.UUID) -> str:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    expire = now + timedelta(days=settings.jwt_refresh_expire_days)
    payload = {
        "sub": str(user_id),
        "token_id": str(uuid.uuid4()),
        "type": "refresh",
        "iat": now,
        "exp": expire,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")

def decode_token(token: str) -> Dict[str, Any]:
    settings = get_settings()
    return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
