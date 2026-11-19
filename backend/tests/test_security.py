import pytest
import uuid
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)

def test_password_hashing():
    password = "SuperSecretPassword123!"
    hashed = hash_password(password)
    assert hashed.startswith("$argon2id$")
    assert verify_password(password, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False

def test_jwt_token_lifecycle():
    user_id = uuid.uuid4()
    token = create_access_token(user_id=user_id, username="testuser", role="admin")
    payload = decode_token(token)
    assert payload["sub"] == str(user_id)
    assert payload["username"] == "testuser"
    assert payload["role"] == "admin"
    assert payload["type"] == "access"

    refresh_token = create_refresh_token(user_id=user_id)
    refresh_payload = decode_token(refresh_token)
    assert refresh_payload["sub"] == str(user_id)
    assert refresh_payload["type"] == "refresh"
