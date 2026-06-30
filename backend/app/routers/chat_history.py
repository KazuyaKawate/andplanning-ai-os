"""
Chat session & message management.

GET    /api/chat-sessions              → list sessions
POST   /api/chat-sessions              → create session
GET    /api/chat-sessions/{id}         → get session
DELETE /api/chat-sessions/{id}         → delete session
GET    /api/chat-sessions/{id}/messages → list messages
POST   /api/chat-sessions/{id}/chat    → send message + stream AI reply
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.database import get_db
from app.models import ChatSession, ChatMessageRow, OsSettingsRow, Factory
from app.schemas import (
    ChatSessionCreate, ChatSessionOut, ChatMessageCreate, ChatMessageOut,
    ChatRequest,
)
from app.services.ai_router import (
    resolve_model, provider_for, calculate_cost_usd, FACTORY_DEFAULT_MODELS,
)
from app.services.retry import stream_with_fallback

router = APIRouter(tags=["chat-history"])


def _session_out(s: ChatSession, msg_count: int = 0) -> ChatSessionOut:
    return ChatSessionOut(
        id=s.id,
        factoryId=s.factory_id,
        title=s.title,
        model=s.model,
        totalTokens=s.total_tokens,
        totalCost=s.total_cost,
        createdAt=s.created_at.isoformat(),
        updatedAt=s.updated_at.isoformat(),
        messageCount=msg_count,
    )


def _msg_out(m: ChatMessageRow) -> ChatMessageOut:
    return ChatMessageOut(
        id=m.id,
        sessionId=m.session_id,
        role=m.role,
        content=m.content,
        model=m.model,
        tokens=m.tokens,
        costUsd=m.cost_usd,
        createdAt=m.created_at.isoformat(),
    )


async def _get_settings(db: AsyncSession) -> OsSettingsRow:
    from app.config import settings as env_cfg
    res = await db.execute(select(OsSettingsRow).where(OsSettingsRow.id == "global"))
    row = res.scalars().first() or OsSettingsRow(
        id="global", api_key_openai="", api_key_anthropic="", api_key_google="",
        default_model="claude-sonnet-4-6", fallback_model="gpt-4o-mini",
    )
    row.api_key_openai    = row.api_key_openai    or env_cfg.openai_api_key
    row.api_key_anthropic = row.api_key_anthropic or env_cfg.anthropic_api_key
    row.api_key_google    = row.api_key_google    or env_cfg.google_api_key
    return row


# ── Sessions ──────────────────────────────────────────────────────────────────

@router.get("/chat-sessions", response_model=list[ChatSessionOut])
async def list_sessions(limit: int = 20, db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(ChatSession).order_by(desc(ChatSession.updated_at)).limit(limit)
    )
    sessions = res.scalars().all()
    out = []
    for s in sessions:
        msg_res = await db.execute(
            select(ChatMessageRow).where(ChatMessageRow.session_id == s.id)
        )
        out.append(_session_out(s, len(msg_res.scalars().all())))
    return out


@router.post("/chat-sessions", response_model=ChatSessionOut, status_code=201)
async def create_session(req: ChatSessionCreate, db: AsyncSession = Depends(get_db)):
    cfg = await _get_settings(db)
    factory = None
    if req.factory_id:
        res = await db.execute(select(Factory).where(Factory.id == req.factory_id))
        factory = res.scalars().first()

    model = resolve_model(
        factory_id=req.factory_id,
        factory_preferred_model=factory.preferred_model if factory else None,
        os_default_model=cfg.default_model,
    )
    session = ChatSession(
        id=str(uuid.uuid4()),
        factory_id=req.factory_id,
        title=req.title,
        model=model,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return _session_out(session, 0)


@router.get("/chat-sessions/{session_id}", response_model=ChatSessionOut)
async def get_session(session_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(ChatSession).where(ChatSession.id == session_id))
    session = res.scalars().first()
    if not session:
        raise HTTPException(404, "Session not found")
    msg_res = await db.execute(
        select(ChatMessageRow).where(ChatMessageRow.session_id == session_id)
    )
    return _session_out(session, len(msg_res.scalars().all()))


@router.delete("/chat-sessions/{session_id}", status_code=204)
async def delete_session(session_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(ChatSession).where(ChatSession.id == session_id))
    session = res.scalars().first()
    if not session:
        raise HTTPException(404, "Session not found")
    await db.delete(session)
    await db.commit()


# ── Messages ──────────────────────────────────────────────────────────────────

@router.get("/chat-sessions/{session_id}/messages", response_model=list[ChatMessageOut])
async def list_messages(session_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(ChatMessageRow)
        .where(ChatMessageRow.session_id == session_id)
        .order_by(ChatMessageRow.created_at)
    )
    return [_msg_out(m) for m in res.scalars().all()]


@router.post("/chat-sessions/{session_id}/chat")
async def session_chat(session_id: str, req: ChatMessageCreate, db: AsyncSession = Depends(get_db)):
    """Append user message, stream AI reply, persist both."""
    res = await db.execute(select(ChatSession).where(ChatSession.id == session_id))
    session = res.scalars().first()
    if not session:
        raise HTTPException(404, "Session not found")

    cfg = await _get_settings(db)

    # Persist user message
    user_msg = ChatMessageRow(
        id=str(uuid.uuid4()),
        session_id=session_id,
        role="user",
        content=req.content,
    )
    db.add(user_msg)
    await db.commit()

    # Load full history for context
    history_res = await db.execute(
        select(ChatMessageRow)
        .where(ChatMessageRow.session_id == session_id)
        .order_by(ChatMessageRow.created_at)
    )
    from app.schemas import ChatMessage
    messages = [
        ChatMessage(role=m.role, content=m.content)
        for m in history_res.scalars().all()
    ]

    # Get factory system prompt
    system_prompt = ""
    if session.factory_id:
        fac_res = await db.execute(select(Factory).where(Factory.id == session.factory_id))
        fac = fac_res.scalars().first()
        if fac:
            system_prompt = fac.system_prompt

    async def _stream_and_persist():
        import json as _json
        model_used, gen = await stream_with_fallback(
            messages, session.model, cfg, system_prompt
        )
        reply_parts: list[str] = []

        async for chunk in gen:
            yield chunk
            for part in chunk.split("\n\n"):
                part = part.strip()
                if part.startswith("data: "):
                    raw = part[6:].strip()
                    if raw == "[DONE]":
                        break
                    try:
                        parsed = _json.loads(raw)
                        if "content" in parsed:
                            reply_parts.append(parsed["content"])
                    except Exception:
                        pass

        # Persist assistant reply
        reply_content = "".join(reply_parts)
        tokens = max(10, len(reply_content) // 4)
        cost = calculate_cost_usd(model_used, tokens)

        from app.database import AsyncSessionLocal
        async with AsyncSessionLocal() as save_db:
            asst_msg = ChatMessageRow(
                id=str(uuid.uuid4()),
                session_id=session_id,
                role="assistant",
                content=reply_content,
                model=model_used,
                tokens=tokens,
                cost_usd=cost,
            )
            save_db.add(asst_msg)

            # Update session stats
            sess_res = await save_db.execute(
                select(ChatSession).where(ChatSession.id == session_id)
            )
            sess = sess_res.scalars().first()
            if sess:
                sess.total_tokens += tokens
                sess.total_cost   += cost
                sess.updated_at    = datetime.now(timezone.utc)
            await save_db.commit()

    return StreamingResponse(
        _stream_and_persist(),
        headers={
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
