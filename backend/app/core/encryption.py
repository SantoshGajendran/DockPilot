import base64
import hashlib
from typing import Optional
from cryptography.fernet import Fernet

from app.core.config import get_settings


def _derive_fernet_key() -> bytes:
    settings = get_settings()
    custom_key = (settings.notification_encryption_key or "").strip()
    if custom_key:
        try:
            # Check if already a valid 32-byte urlsafe base64 key
            decoded = base64.urlsafe_b64decode(custom_key.encode("utf-8"))
            if len(decoded) == 32:
                return custom_key.encode("utf-8")
        except Exception:
            pass

    # Derive deterministic Fernet key from jwt_secret
    source = settings.jwt_secret.encode("utf-8")
    digest = hashlib.sha256(source).digest()
    return base64.urlsafe_b64encode(digest)


def get_fernet() -> Fernet:
    return Fernet(_derive_fernet_key())


def encrypt_secret(plaintext: Optional[str]) -> Optional[str]:
    if not plaintext:
        return None
    f = get_fernet()
    encrypted = f.encrypt(plaintext.encode("utf-8"))
    return encrypted.decode("utf-8")


def decrypt_secret(ciphertext: Optional[str]) -> Optional[str]:
    if not ciphertext:
        return None
    try:
        f = get_fernet()
        decrypted = f.decrypt(ciphertext.encode("utf-8"))
        return decrypted.decode("utf-8")
    except Exception:
        return None
