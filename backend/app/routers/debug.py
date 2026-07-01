"""
Auto Debugger endpoints.

GET  /api/debug/status   — system health + error metrics
GET  /api/debug/logs     — recent failed runs and error entries
POST /api/debug/analyze  — AI error analysis (SSE streaming)
POST /api/debug/patch    — generate patch from debug session (SSE + stores DevPatch)
GET  /api/debug/history  — past debug sessions
"""
from __future__ import annotations

import json
import re
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any, AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models import DebugSession, DevPatch, WorkflowRun, OsSettingsRow, User
from app.schemas import (
    DebugStatusOut, DebugLogEntry, DebugAnalyzeRequest,
    DebugPatchRequest, DebugSessionOut,
)
from app.auth import get_current_user
from app.services.ai_router import resolve_model
from app.services.retry import stream_with_fallback

router = APIRouter(tags=["debug"], dependencies=[Depends(get_current_user)])

# Project root — debug.py is 4 levels deep from project root
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent

PROTECTED_FILES = {
    "backend/app/database.py",
    "backend/app/config.py",
    "backend/app/services/ai_router.py",
    "backend/app/services/retry.py",
    "backend/app/models.py",
}

TEXT_EXTENSIONS = {
    ".py", ".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".txt",
    ".toml", ".yaml", ".yml", ".css", ".html", ".sh", ".sql",
}

MAX_FILE_SIZE = 150_000

# ---------------------------------------------------------------------------
# Auto Debugger system prompt
# ---------------------------------------------------------------------------

AUTO_DEBUGGER_SYSTEM_PROMPT = """You are the AIOS Auto Debugger — an AI-powered error analysis system embedded in AI OS.

## Tech Stack
- Frontend: Next.js 16 App Router, TypeScript, Tailwind CSS, motion/react
- Backend: FastAPI + SQLAlchemy async + SQLite
- AI routing: Claude → OpenAI → Gemini fallback chain

## Analysis Format (ALWAYS use this exact structure)

**Error Classification**
- Type: [TypeError | NetworkError | DatabaseError | ImportError | ValidationError | RuntimeError | AuthError | ConfigError | Other]
- Severity: [low | medium | high | critical]

**Root Cause**
Concise 2–3 sentence explanation of WHY this error occurred.

**Immediate Fix**
1. First step
2. Second step
3. Third step

**Code Change Needed**
Yes/No — specify which file to edit if yes.

**Prevention**
How to prevent this class of error in the future.

## Safety Rules — NEVER VIOLATE
1. NEVER suggest deleting files
2. NEVER suggest: git reset, git clean, git checkout --, git rebase, git push --force
3. NEVER propose changes to Kernel files: database.py, config.py, ai_router.py, retry.py, models.py
4. Only propose patches — human approval required before writing to disk
5. Always explain the risk level of any suggested code change

Respond in the same language as the user (Japanese or English). Be concise and actionable."""

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _get_cfg(db: AsyncSession) -> OsSettingsRow:
    from app.config import settings as env_cfg
    res = await db.execute(select(OsSettingsRow).where(OsSettingsRow.id == "global"))
    row = res.scalars().first() or OsSettingsRow(
        id="global", default_model="claude-sonnet-4-6",
        api_key_openai="", api_key_anthropic="", api_key_google="",
    )
    row.api_key_openai    = row.api_key_openai    or env_cfg.openai_api_key
    row.api_key_anthropic = row.api_key_anthropic or env_cfg.anthropic_api_key
    row.api_key_google    = row.api_key_google    or env_cfg.google_api_key
    return row


def _resolve_safe(rel_path: str) -> Path:
    norm     = rel_path.replace("\\", "/").lstrip("/")
    abs_path = (PROJECT_ROOT / norm).resolve()
    try:
        abs_path.relative_to(PROJECT_ROOT)
    except ValueError:
        raise HTTPException(403, "Path outside project root")
    return abs_path


def _is_protected(rel_path: str) -> bool:
    return rel_path.replace("\\", "/").lstrip("/") in PROTECTED_FILES


def _parse_patch(text: str, file_path: str) -> dict | None:
    match = re.search(r"<patch>(.*?)</patch>", text, re.DOTALL)
    if not match:
        return None
    block = match.group(1)

    def _tag(tag: str) -> str:
        m = re.search(rf"<{tag}>(.*?)</{tag}>", block, re.DOTALL)
        return m.group(1).strip() if m else ""

    title       = _tag("title") or "Debug patch"
    fpath       = _tag("file")  or file_path
    risk        = _tag("risk")  or "medium"
    explanation = _tag("explanation")
    new_content = _tag("new_content")
    if not new_content:
        return None
    return {
        "title":       title,
        "file_path":   fpath.replace("\\", "/").lstrip("/"),
        "risk_level":  risk if risk in ("low", "medium", "high") else "medium",
        "explanation": explanation,
        "new_content": new_content,
    }


def _parse_analysis_meta(text: str) -> tuple[str, str, str, str]:
    """
    Extract (error_type, severity, root_cause, suggested_fix) from AI output.
    Returns best-effort defaults if parsing fails.
    """
    # Error type
    type_match = re.search(
        r"type:\s*(TypeError|NetworkError|DatabaseError|ImportError|"
        r"ValidationError|RuntimeError|AuthError|ConfigError|Other)",
        text, re.IGNORECASE,
    )
    error_type = type_match.group(1) if type_match else "Other"

    # Severity
    sev_match  = re.search(r"severity:\s*(low|medium|high|critical)", text, re.IGNORECASE)
    severity   = sev_match.group(1).lower() if sev_match else "medium"

    # Root cause: text after "Root Cause" heading up to next heading
    rc_match   = re.search(r"\*\*Root Cause\*\*\s*\n+(.*?)(?=\n\s*\*\*|\Z)", text, re.DOTALL)
    root_cause = rc_match.group(1).strip()[:500] if rc_match else None

    # Suggested fix: numbered list after "Immediate Fix"
    fix_match  = re.search(r"\*\*Immediate Fix\*\*\s*\n+(.*?)(?=\n\s*\*\*|\Z)", text, re.DOTALL)
    suggested_fix = fix_match.group(1).strip()[:500] if fix_match else None

    return error_type, severity, root_cause or "", suggested_fix or ""


async def _sse_debug_stream(
    messages: list,
    cfg: OsSettingsRow,
    model: str | None = None,
) -> AsyncGenerator[str, None]:
    from app.schemas import ChatMessage as CM
    typed    = [CM(**m) if isinstance(m, dict) else m for m in messages]
    resolved = resolve_model(
        factory_id="debug",
        factory_preferred_model=None,
        os_default_model=cfg.default_model,
        requested_model=model,
    )
    _model, gen = await stream_with_fallback(typed, resolved, cfg, AUTO_DEBUGGER_SYSTEM_PROMPT)
    async for chunk in gen:
        yield chunk


def _today_range() -> tuple[datetime, datetime]:
    now   = datetime.now(timezone.utc)
    start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    return start, now


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/debug/status", response_model=DebugStatusOut)
async def get_status(db: AsyncSession = Depends(get_db)):
    """System health + error metrics derived from DB."""
    today_start, _ = _today_range()

    # Total runs today
    runs_res = await db.execute(
        select(func.count()).select_from(WorkflowRun)
        .where(WorkflowRun.started_at >= today_start)
    )
    runs_today = runs_res.scalar() or 0

    # Failed runs today
    err_res = await db.execute(
        select(func.count()).select_from(WorkflowRun)
        .where(WorkflowRun.started_at >= today_start, WorkflowRun.status == "failed")
    )
    errors_today = err_res.scalar() or 0

    # Recent failed runs (last 5)
    recent_res = await db.execute(
        select(WorkflowRun)
        .where(WorkflowRun.status == "failed")
        .order_by(WorkflowRun.started_at.desc())
        .limit(5)
    )
    failed_rows = recent_res.scalars().all()
    failed_runs = [
        {
            "id":          r.id,
            "workflowName": r.workflow_name,
            "factoryId":   r.factory_id,
            "startedAt":   r.started_at.isoformat(),
            "inputSummary": r.input_summary[:80] if r.input_summary else "",
        }
        for r in failed_rows
    ]

    # Total debug sessions ever
    dsess_res = await db.execute(select(func.count()).select_from(DebugSession))
    debug_total = dsess_res.scalar() or 0

    error_rate = round(errors_today / max(runs_today, 1), 4)

    return DebugStatusOut(
        uptime_ok=True,
        db_ok=True,
        error_rate=error_rate,
        errors_today=errors_today,
        runs_today=runs_today,
        failed_runs=failed_runs,
        debug_sessions_total=debug_total,
    )


@router.get("/debug/logs", response_model=list[DebugLogEntry])
async def get_logs(limit: int = 30, db: AsyncSession = Depends(get_db)):
    """Return recent error log entries (failed runs + past debug sessions)."""
    entries: list[DebugLogEntry] = []

    # Failed workflow runs → ERROR entries
    runs_res = await db.execute(
        select(WorkflowRun)
        .where(WorkflowRun.status == "failed")
        .order_by(WorkflowRun.started_at.desc())
        .limit(limit // 2)
    )
    for r in runs_res.scalars().all():
        entries.append(DebugLogEntry(
            id=r.id,
            timestamp=r.started_at.isoformat(),
            level="ERROR",
            message=f"[{r.factory_id}] {r.workflow_name} failed",
            source="workflow",
            detail=r.input_summary[:200] if r.input_summary else None,
        ))

    # Past debug sessions → analyzed entries
    sess_res = await db.execute(
        select(DebugSession)
        .order_by(DebugSession.created_at.desc())
        .limit(limit // 2)
    )
    for s in sess_res.scalars().all():
        entries.append(DebugLogEntry(
            id=s.id,
            timestamp=s.created_at.isoformat(),
            level="WARNING" if s.severity in ("low", "medium") else "ERROR",
            message=s.error_text[:120],
            source=s.source,
            detail=s.root_cause[:200] if s.root_cause else None,
        ))

    # Sort combined by timestamp descending
    entries.sort(key=lambda e: e.timestamp, reverse=True)
    return entries[:limit]


@router.post("/debug/analyze")
async def analyze_error(req: DebugAnalyzeRequest, db: AsyncSession = Depends(get_db),
                        _user: User = Depends(get_current_user)):
    """
    Stream AI analysis of the given error. Requires login.
    Stores a DebugSession when streaming completes.
    Emits session_id as final SSE event so the frontend can reference it.
    """
    cfg = await _get_cfg(db)

    context_block = f"\n\nAdditional context:\n{req.context}" if req.context else ""
    severity_hint = f"\nUser-reported severity: {req.severity}" if req.severity else ""

    from app.schemas import ChatMessage as CM
    messages = [
        CM(role="user", content=(
            f"Please analyze this error and provide a structured debug report:"
            f"\n\n```\n{req.error_text}\n```"
            f"{severity_hint}"
            f"{context_block}"
            f"\n\nSource: {req.source}"
        ))
    ]

    async def generate():
        output_parts: list[str] = []
        model_used_ref: list[str] = ["unknown"]

        resolved = resolve_model("debug", None, cfg.default_model)
        _model, gen = await stream_with_fallback(messages, resolved, cfg, AUTO_DEBUGGER_SYSTEM_PROMPT)
        model_used_ref[0] = _model

        async for chunk in gen:
            yield chunk
            for part in chunk.split("\n\n"):
                part = part.strip()
                if part.startswith("data: "):
                    raw = part[6:].strip()
                    if raw != "[DONE]":
                        try:
                            parsed = json.loads(raw)
                            if "content" in parsed:
                                output_parts.append(parsed["content"])
                        except Exception:
                            pass

        full_output = "".join(output_parts)
        error_type, severity, root_cause, suggested_fix = _parse_analysis_meta(full_output)

        # Override severity with user-provided if AI didn't detect one
        final_severity = severity or req.severity or "medium"

        session = DebugSession(
            id=str(uuid.uuid4()),
            error_text=req.error_text[:2000],
            error_type=error_type,
            severity=final_severity,
            source=req.source,
            root_cause=root_cause or None,
            suggested_fix=suggested_fix or None,
            full_analysis=full_output[:8000],
            model_used=model_used_ref[0],
            status="analyzed",
        )
        db.add(session)
        await db.commit()

        yield f"data: {json.dumps({'session_id': session.id, 'error_type': error_type, 'severity': final_severity})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(), media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/debug/patch")
async def debug_patch(req: DebugPatchRequest, db: AsyncSession = Depends(get_db),
                      _user: User = Depends(get_current_user)):
    """
    Generate a patch proposal for an analyzed error. Requires login.
    Reuses the DevPatch storage system. Human approval still required to apply.
    """
    if _is_protected(req.file_path):
        raise HTTPException(403, f"File {req.file_path!r} is protected and cannot be patched")

    # Load debug session for context
    sess_res = await db.execute(select(DebugSession).where(DebugSession.id == req.session_id))
    session  = sess_res.scalars().first()
    if not session:
        raise HTTPException(404, f"Debug session not found: {req.session_id}")

    cfg = await _get_cfg(db)

    # Read current file content
    try:
        abs_path = _resolve_safe(req.file_path)
        original = abs_path.read_text(encoding="utf-8", errors="replace") if abs_path.exists() else "(new file)"
    except HTTPException:
        original = "(cannot read)"

    from app.schemas import ChatMessage as CM
    error_context = f"**Original error:**\n```\n{session.error_text[:500]}\n```\n"
    if session.root_cause:
        error_context += f"\n**Root cause:** {session.root_cause}\n"
    if session.suggested_fix:
        error_context += f"\n**Suggested fix:** {session.suggested_fix}\n"
    extra_context = f"\n\nAdditional context:\n{req.context}" if req.context else ""

    messages = [
        CM(role="user", content=(
            f"Generate a patch to fix the following error:\n\n"
            f"{error_context}"
            f"\n**File to patch:** `{req.file_path}`"
            f"{extra_context}"
            f"\n\n**Current file content:**\n```\n{original[:8000]}\n```"
            f"\n\nPlease:\n"
            f"1. Explain the fix and why it resolves the root cause\n"
            f"2. List risks and breaking changes\n"
            f"3. Recommend verification tests\n"
            f"4. Generate the complete patch block at the end"
        ))
    ]

    async def generate():
        output_parts: list[str] = []
        model_used_ref: list[str] = ["unknown"]

        resolved = resolve_model("debug", None, cfg.default_model)
        _model, gen = await stream_with_fallback(messages, resolved, cfg, AUTO_DEBUGGER_SYSTEM_PROMPT)
        model_used_ref[0] = _model

        async for chunk in gen:
            yield chunk
            for part in chunk.split("\n\n"):
                part = part.strip()
                if part.startswith("data: "):
                    raw = part[6:].strip()
                    if raw != "[DONE]":
                        try:
                            parsed = json.loads(raw)
                            if "content" in parsed:
                                output_parts.append(parsed["content"])
                        except Exception:
                            pass

        full_output = "".join(output_parts)
        patch_data  = _parse_patch(full_output, req.file_path)

        patch_id: str | None = None
        if patch_data:
            patch = DevPatch(
                id=str(uuid.uuid4()),
                title=patch_data["title"],
                file_path=patch_data["file_path"],
                original_content=original,
                new_content=patch_data["new_content"],
                ai_explanation=patch_data["explanation"],
                risk_level=patch_data["risk_level"],
                status="pending",
            )
            db.add(patch)
            # Link patch to debug session
            session.patch_id = patch.id
            session.status   = "patched"
            await db.commit()
            patch_id = patch.id

        if patch_id:
            yield f"data: {json.dumps({'patch_id': patch_id})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(), media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/debug/history", response_model=list[DebugSessionOut])
async def get_history(limit: int = 30, db: AsyncSession = Depends(get_db)):
    """Return recent Auto Debugger sessions."""
    result = await db.execute(
        select(DebugSession).order_by(DebugSession.created_at.desc()).limit(limit)
    )
    rows = result.scalars().all()
    return [
        DebugSessionOut(
            id=r.id,
            errorText=r.error_text,
            errorType=r.error_type,
            severity=r.severity,
            source=r.source,
            rootCause=r.root_cause,
            suggestedFix=r.suggested_fix,
            fullAnalysis=r.full_analysis,
            patchId=r.patch_id,
            modelUsed=r.model_used,
            status=r.status,
            createdAt=r.created_at.isoformat(),
        )
        for r in rows
    ]
