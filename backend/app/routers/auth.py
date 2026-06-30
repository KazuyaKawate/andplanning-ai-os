"""
Authentication endpoints.

POST /api/auth/register   — create account (first user becomes admin)
POST /api/auth/login      — email + password → JWT
GET  /api/auth/me         — return current user profile
POST /api/auth/logout     — client-side only (clears token); kept for symmetry
"""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import create_access_token, get_current_user
from app.database import get_db
from app.models import User

def _make_pwd_ctx():
    # Try bcrypt as primary with sha256_crypt as legacy fallback (verifies old hashes).
    # bcrypt 5.x + passlib 1.7.4 incompatibility: probe first, fall through on error.
    try:
        from passlib.context import CryptContext
        ctx = CryptContext(schemes=["bcrypt", "sha256_crypt"], deprecated="auto")
        ctx.hash("probe")
        return ctx
    except Exception:
        pass
    try:
        from passlib.context import CryptContext
        return CryptContext(schemes=["sha256_crypt"], deprecated="auto")
    except Exception:
        pass
    import hashlib
    class _FallbackCtx:
        def hash(self, pw: str) -> str:
            return "sha256$" + hashlib.sha256(pw.encode()).hexdigest()
        def verify(self, pw: str, h: str) -> bool:
            return self.hash(pw) == h
    return _FallbackCtx()

_pwd_ctx = _make_pwd_ctx()


router = APIRouter(prefix="/auth", tags=["auth"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class RegisterRequest(BaseModel):
    email:        str
    password:     str
    display_name: str = ""


class LoginRequest(BaseModel):
    email:    str
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    user: dict


class UserOut(BaseModel):
    id:           str
    email:        str
    display_name: str
    role:         str
    is_active:    bool
    created_at:   str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _user_out(u: User) -> dict:
    return {
        "id":           u.id,
        "email":        u.email,
        "display_name": u.display_name,
        "role":         u.role,
        "is_active":    u.is_active,
        "created_at":   u.created_at.isoformat() if u.created_at else "",
    }


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/register", response_model=AuthResponse, status_code=201)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    # Check if email already used
    existing = await db.execute(select(User).where(User.email == req.email.lower()))
    if existing.scalars().first():
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")

    # Count users — first user becomes admin
    count_res = await db.execute(select(func.count()).select_from(User))
    user_count = count_res.scalar() or 0

    user = User(
        email           = req.email.lower().strip(),
        hashed_password = _pwd_ctx.hash(req.password),
        display_name    = req.display_name or req.email.split("@")[0],
        role            = "admin" if user_count == 0 else "user",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token(user.id, user.email, user.role)
    return AuthResponse(access_token=token, user=_user_out(user))


@router.post("/login", response_model=AuthResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == req.email.lower()))
    user   = result.scalars().first()
    if not user or not _pwd_ctx.verify(req.password, user.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account disabled")

    user.last_login_at = datetime.now(timezone.utc)
    await db.commit()

    token = create_access_token(user.id, user.email, user.role)
    return AuthResponse(access_token=token, user=_user_out(user))


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)):
    return _user_out(user)


@router.post("/logout")
async def logout():
    # JWT is stateless — actual logout happens client-side by deleting the token
    return {"ok": True}
