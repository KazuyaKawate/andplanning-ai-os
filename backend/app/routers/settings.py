from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import OsSettingsRow, User
from app.auth import require_admin
from app.schemas import OsSettingsOut, OsSettingsPatch

router = APIRouter(tags=["settings"])


def _mask_key(key: str) -> str:
    """Return a masked version — show first 6 and last 4 chars separated by ***."""
    if not key:
        return ""
    if len(key) <= 12:
        return key[:2] + "***"
    return f"{key[:6]}***{key[-4:]}"


def _is_masked(value: str) -> bool:
    """Return True if the value looks like our masked format (contains ***)."""
    return "***" in value


def _row_to_out(r: OsSettingsRow, mask_keys: bool = True) -> OsSettingsOut:
    keys: dict[str, str]
    if mask_keys:
        keys = {
            "openai":    _mask_key(r.api_key_openai),
            "anthropic": _mask_key(r.api_key_anthropic),
            "google":    _mask_key(r.api_key_google),
        }
    else:
        keys = {
            "openai":    r.api_key_openai,
            "anthropic": r.api_key_anthropic,
            "google":    r.api_key_google,
        }
    return OsSettingsOut(
        defaultModel=r.default_model,
        fallbackModel=r.fallback_model,
        maxConcurrentRuns=r.max_concurrent_runs,
        memoryRetentionDays=r.memory_retention_days,
        notifyOnComplete=r.notify_on_complete,
        notifyOnError=r.notify_on_error,
        theme=r.theme,
        language=r.language,
        apiKeys=keys,
        claudeMode=getattr(r, "claude_mode", "auto"),
    )


@router.get("/settings", response_model=OsSettingsOut)
async def get_settings(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(OsSettingsRow).where(OsSettingsRow.id == "global"))
    row = result.scalars().first()
    if not row:
        raise HTTPException(404, "Settings not initialized")
    return _row_to_out(row)


@router.patch("/settings", response_model=OsSettingsOut)
async def patch_settings(req: OsSettingsPatch, db: AsyncSession = Depends(get_db),
                         _user: User = Depends(require_admin)):
    result = await db.execute(select(OsSettingsRow).where(OsSettingsRow.id == "global"))
    row = result.scalars().first()
    if not row:
        raise HTTPException(404, "Settings not initialized")

    if req.defaultModel       is not None: row.default_model         = req.defaultModel
    if req.fallbackModel      is not None: row.fallback_model        = req.fallbackModel
    if req.maxConcurrentRuns  is not None: row.max_concurrent_runs   = req.maxConcurrentRuns
    if req.memoryRetentionDays is not None: row.memory_retention_days = req.memoryRetentionDays
    if req.notifyOnComplete   is not None: row.notify_on_complete    = req.notifyOnComplete
    if req.notifyOnError      is not None: row.notify_on_error       = req.notifyOnError
    if req.theme              is not None: row.theme                 = req.theme
    if req.language           is not None: row.language              = req.language
    if req.apiKeys:
        # Skip values that look like our own masked output (user didn't change them)
        if "openai"    in req.apiKeys and not _is_masked(req.apiKeys["openai"]):
            row.api_key_openai    = req.apiKeys["openai"]
        if "anthropic" in req.apiKeys and not _is_masked(req.apiKeys["anthropic"]):
            row.api_key_anthropic = req.apiKeys["anthropic"]
        if "google"    in req.apiKeys and not _is_masked(req.apiKeys["google"]):
            row.api_key_google    = req.apiKeys["google"]
    if req.claudeMode is not None:
        row.claude_mode = req.claudeMode

    await db.commit()
    await db.refresh(row)
    return _row_to_out(row)
