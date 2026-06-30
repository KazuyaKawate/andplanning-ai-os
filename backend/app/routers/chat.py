"""
POST /api/chat/openai
POST /api/chat/claude
POST /api/chat/gemini

SSE streaming responses.  Each chunk: `data: {"content": "..."}\n\n`
Final chunk:              `data: [DONE]\n\n`
Error chunk:              `data: {"error": "..."}\n\n`  then `data: [DONE]\n\n`
"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import OsSettingsRow, Factory
from app.schemas import ChatRequest
from app.services.ai_router import resolve_model, provider_for, FACTORY_DEFAULT_MODELS
from app.services.openai_svc import stream_openai
from app.services.anthropic_svc import stream_anthropic
from app.services.gemini_svc import stream_gemini
from app.services.retry import stream_with_fallback

router = APIRouter(tags=["chat"])


async def _get_settings(db: AsyncSession) -> OsSettingsRow:
    from app.config import settings as env_cfg
    result = await db.execute(select(OsSettingsRow).where(OsSettingsRow.id == "global"))
    row = result.scalars().first() or OsSettingsRow(
        id="global", api_key_openai="", api_key_anthropic="", api_key_google="",
        default_model="claude-sonnet-4-6", fallback_model="gpt-4o-mini",
    )
    # .env keys are fallback when DB is empty
    row.api_key_openai    = row.api_key_openai    or env_cfg.openai_api_key
    row.api_key_anthropic = row.api_key_anthropic or env_cfg.anthropic_api_key
    row.api_key_google    = row.api_key_google    or env_cfg.google_api_key
    return row


async def _get_factory(db: AsyncSession, factory_id: str | None) -> Factory | None:
    if not factory_id:
        return None
    result = await db.execute(select(Factory).where(Factory.id == factory_id))
    return result.scalars().first()


def _sse_headers() -> dict:
    return {
        "Content-Type":  "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection":    "keep-alive",
        "X-Accel-Buffering": "no",   # disable nginx buffering
    }


# ---------------------------------------------------------------------------
# OpenAI
# ---------------------------------------------------------------------------

@router.post("/chat/openai")
async def chat_openai(req: ChatRequest, db: AsyncSession = Depends(get_db)):
    cfg     = await _get_settings(db)
    factory = await _get_factory(db, req.factory_id)

    model = resolve_model(
        factory_id=req.factory_id,
        factory_preferred_model=factory.preferred_model if factory else None,
        os_default_model=cfg.default_model,
        requested_model=req.model,
    )
    # Force OpenAI model if provider mismatch requested
    if provider_for(model) != "openai":
        model = cfg.default_model if provider_for(cfg.default_model) == "openai" else "gpt-4o"

    return StreamingResponse(
        stream_openai(req.messages, model, cfg.api_key_openai, req.temperature, req.max_tokens),
        headers=_sse_headers(),
    )


# ---------------------------------------------------------------------------
# Claude (Anthropic)
# ---------------------------------------------------------------------------

@router.post("/chat/claude")
async def chat_claude(req: ChatRequest, db: AsyncSession = Depends(get_db)):
    cfg     = await _get_settings(db)
    factory = await _get_factory(db, req.factory_id)

    model = resolve_model(
        factory_id=req.factory_id,
        factory_preferred_model=factory.preferred_model if factory else None,
        os_default_model=cfg.default_model,
        requested_model=req.model,
    )
    if provider_for(model) != "anthropic":
        model = "claude-sonnet-4-6"

    system_prompt = factory.system_prompt if factory else ""

    return StreamingResponse(
        stream_anthropic(
            req.messages, model, cfg.api_key_anthropic,
            req.temperature, req.max_tokens, system_prompt,
        ),
        headers=_sse_headers(),
    )


# ---------------------------------------------------------------------------
# Gemini (Google)
# ---------------------------------------------------------------------------

@router.post("/chat/gemini")
async def chat_gemini(req: ChatRequest, db: AsyncSession = Depends(get_db)):
    cfg     = await _get_settings(db)
    factory = await _get_factory(db, req.factory_id)

    model = resolve_model(
        factory_id=req.factory_id,
        factory_preferred_model=factory.preferred_model if factory else None,
        os_default_model=cfg.default_model,
        requested_model=req.model,
    )
    if provider_for(model) != "google":
        model = "gemini-2.5-flash"

    return StreamingResponse(
        stream_gemini(req.messages, model, cfg.api_key_google, req.temperature, req.max_tokens),
        headers=_sse_headers(),
    )


# ---------------------------------------------------------------------------
# Auto-route: picks provider based on factory / model resolution
# ---------------------------------------------------------------------------

@router.post("/chat")
async def chat_auto(req: ChatRequest, db: AsyncSession = Depends(get_db)):
    """Route to the appropriate provider automatically with fallback chain."""
    cfg     = await _get_settings(db)
    factory = await _get_factory(db, req.factory_id)

    model  = resolve_model(
        factory_id=req.factory_id,
        factory_preferred_model=factory.preferred_model if factory else None,
        os_default_model=cfg.default_model,
        requested_model=req.model,
    )
    system = factory.system_prompt if factory else ""

    _model_used, gen = await stream_with_fallback(req.messages, model, cfg, system)

    return StreamingResponse(gen, headers=_sse_headers())
