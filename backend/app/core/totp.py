import base64
import hmac
import hashlib
import struct
import time
import secrets
from typing import Optional


def generate_totp_secret() -> str:
    """Generate a 160-bit (20 bytes) base32 encoded TOTP secret (32 chars)."""
    return base64.b32encode(secrets.token_bytes(20)).decode("utf-8").rstrip("=")


def get_totp_uri(secret: str, username: str, issuer: str = "DockPilot") -> str:
    """Generate standard RFC 6238 otpauth URI for QR codes and authenticator apps."""
    return f"otpauth://totp/{issuer}:{username}?secret={secret}&issuer={issuer}&algorithm=SHA1&digits=6&period=30"


def generate_totp_code(secret: str, for_time: Optional[int] = None) -> str:
    """Generate a 6-digit TOTP code for a given timestamp (defaults to current time)."""
    if for_time is None:
        for_time = int(time.time())
    counter = for_time // 30
    padding = "=" * ((8 - len(secret) % 8) % 8)
    key = base64.b32decode(secret + padding, casefold=True)
    msg = struct.pack(">Q", counter)
    digest = hmac.new(key, msg, hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    code = struct.unpack(">I", digest[offset : offset + 4])[0] & 0x7FFFFFFF
    return f"{code % 1000000:06d}"


def verify_totp_code(secret: Optional[str], code: Optional[str], window: int = 1) -> bool:
    """
    Verify a 6-digit TOTP code against a secret within +/- window time steps (30s each).
    Default window of 1 allows for +/- 30 seconds of clock drift.
    """
    if not secret or not code:
        return False
    code = code.strip()
    if len(code) != 6 or not code.isdigit():
        return False

    now = int(time.time())
    for offset in range(-window, window + 1):
        if generate_totp_code(secret, now + offset * 30) == code:
            return True
    return False
