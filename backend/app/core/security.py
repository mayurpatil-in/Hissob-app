"""
Password hashing using bcrypt directly (bypasses passlib's strict 72-byte limit
and avoids the __about__ version detection warning on newer bcrypt versions).
"""
import bcrypt
from datetime import datetime, timezone


def hash_password(password: str) -> str:
    """Hash a plain-text password with bcrypt."""
    password_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain-text password against a bcrypt hash."""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )
    except Exception:
        return False


def utcnow() -> datetime:
    return datetime.now(timezone.utc)
