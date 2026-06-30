"""
JWT authentication helpers.

Usage in router:
    from app.auth import get_current_user, optional_user, require_admin

    @router.get("/protected")
    async def protected(user = Depends(get_current_user)):
        ...

    @router.get("/soft-protected")
    async def soft(user = Depends(optional_user)):
        # user is None if unauthenticated
        ...
"""
from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import User

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

_SECRET = os.getenv("JWT_SECRET_KEY", "change-me-in-production-please-use-long-random-string")
_ALGO   = "HS256"
_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

_bearer = HTTPBearer(auto_error=False)


# ---------------------------------------------------------------------------
# Token helpers
# ---------------------------------------------------------------------------

def create_access_token(user_id: str, email: str, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=_EXPIRE_MINUTES)
    return jwt.encode(
        {"sub": user_id, "email": email, "role": role, "exp": expire},
        _SECRET, algorithm=_ALGO,
    )


def _decode(token: str) -> dict:
    return jwt.decode(token, _SECRET, algorithms=[_ALGO])


# ---------------------------------------------------------------------------
# FastAPI dependencies
# ---------------------------------------------------------------------------

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Require a valid JWT. Raises 401 if missing/invalid."""
    if not credentials:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Authentication required",
                            headers={"WWW-Authenticate": "Bearer"})
    try:
        payload = _decode(credentials.credentials)
        user_id: str = payload["sub"]
    except (JWTError, KeyError):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token",
                            headers={"WWW-Authenticate": "Bearer"})

    result = await db.execute(select(User).where(User.id == user_id))
    user   = result.scalars().first()
    if not user or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found or disabled")
    return user


async def optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """Return the authenticated user, or None if unauthenticated."""
    if not credentials:
        return None
    try:
        payload  = _decode(credentials.credentials)
        user_id: str = payload["sub"]
        result   = await db.execute(select(User).where(User.id == user_id))
        user     = result.scalars().first()
        return user if user and user.is_active else None
    except Exception:
        return None


def require_admin(user: User = Depends(get_current_user)) -> User:
    """Require admin role. Raises 403 if not admin."""
    if user.role != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin role required")
    return user
