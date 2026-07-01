"""
Virtual Claude Developer Agent endpoints.

GET  /api/dev/files     — project directory tree
POST /api/dev/inspect   — read a file
POST /api/dev/chat      — chat with Virtual Claude Dev (SSE)
POST /api/dev/plan      — generate implementation plan (SSE)
POST /api/dev/patch     — generate patch proposal (SSE + stores)
POST /api/dev/apply     — apply a stored patch (requires confirmed=True)
GET  /api/dev/history   — dev action history
GET  /api/dev/patches   — list stored patches
"""
from __future__ import annotations

import json
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import DevPatch, DevHistory, OsSettingsRow, User
from app.schemas import (
    DevFileNode, DevInspectRequest, DevInspectOut,
    DevChatRequest, DevPlanRequest, DevPatchRequest,
    DevPatchOut, DevApplyRequest, DevApplyOut, DevHistoryOut,
)
from app.auth import get_current_user, require_admin
from app.services.ai_router import resolve_model, provider_for
from app.services.retry import stream_with_fallback
from app.services.knowledge_loader import build_agent_context

router = APIRouter(tags=["dev"], dependencies=[Depends(get_current_user)])

# ---------------------------------------------------------------------------
# Project root & safety
# ---------------------------------------------------------------------------

# dev.py → routers/ → app/ → backend/ → project_root/
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent

# Directories to list (relative to PROJECT_ROOT)
ALLOWED_ROOTS = {"website", "backend", "docs"}

# Skip entirely (dirs and files)
SKIP_NAMES = {
    ".git", ".next", ".venv", "node_modules", "__pycache__",
    ".mypy_cache", ".pytest_cache", "dist", "build", "coverage",
}

# Block file patterns (name-based)
BLOCKED_PATTERNS = {
    ".env", ".env.local", ".env.production", ".env.development",
    "*.key", "*.pem", "*.secret", "*.pfx", "*.p12",
}

# Protected files (Virtual Claude cannot patch these)
PROTECTED_FILES = {
    "backend/app/database.py",
    "backend/app/config.py",
    "backend/app/services/ai_router.py",
    "backend/app/services/retry.py",
    "backend/app/models.py",
}

# Extensions safe to read as text
TEXT_EXTENSIONS = {
    ".py", ".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".txt",
    ".toml", ".yaml", ".yml", ".css", ".html", ".sh", ".sql",
    ".env.example", ".gitignore", ".prettierrc", ".eslintrc",
}

MAX_FILE_SIZE = 150_000   # 150 KB
MAX_TREE_FILES = 800

# ---------------------------------------------------------------------------
# Virtual Claude Dev system prompt
# ---------------------------------------------------------------------------

VIRTUAL_CLAUDE_DEV_PROMPT = """You are Virtual Claude Dev — an AI development assistant embedded in the AI OS dashboard.

## Tech Stack
- Frontend: Next.js 16 App Router, TypeScript, Tailwind CSS, Framer Motion
- Backend: FastAPI + SQLAlchemy async + SQLite
- AI routing: Claude (primary) → OpenAI → Gemini fallback
- Pattern: OsApiAdapter interface (lib/api/types.ts), useWorkflowEngine, useOsPolling hooks
- State: React useReducer in hooks, no Redux

## Safety Rules — NEVER VIOLATE
1. NEVER suggest deleting files or directories
2. NEVER suggest: git reset, git clean, git checkout --, git rebase, git push --force
3. NEVER propose changes to protected files:
   - backend/app/database.py  (Kernel)
   - backend/app/config.py    (Kernel)
   - backend/app/models.py    (Kernel — only append, never modify existing)
   - backend/app/services/ai_router.py   (Router)
   - backend/app/services/retry.py       (Router)
   - Any *.env, *.key, *.pem, *.secret file
4. ALWAYS propose a patch first — never apply without human approval
5. ALWAYS explain risks (security, breaking changes, performance) alongside patches
6. ALWAYS recommend 2-3 tests to verify the change

## Patch Format
When the user asks for a code change, append a patch block at the END of your response:

<patch>
<title>Short title (max 80 chars)</title>
<file>relative/path/from/project/root.ext</file>
<risk>low|medium|high</risk>
<explanation>Why this change is needed and what it does</explanation>
<new_content>
COMPLETE_FILE_CONTENT_HERE
</new_content>
</patch>

Only include a <patch> block when explicitly asked to generate a code change.
For analysis, plans, and reviews: respond in prose only (no <patch> block).

Respond in the same language as the user (Japanese or English)."""

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _is_blocked(p: Path) -> bool:
    name = p.name.lower()
    for pattern in BLOCKED_PATTERNS:
        if pattern.startswith("*"):
            if name.endswith(pattern[1:]):
                return True
        elif name == pattern.lower():
            return True
    return False


def _build_tree(root: Path, rel_base: str = "", depth: int = 0, count: list[int] = None) -> list[DevFileNode]:
    if count is None:
        count = [0]
    if depth > 6 or count[0] >= MAX_TREE_FILES:
        return []

    nodes: list[DevFileNode] = []
    try:
        entries = sorted(root.iterdir(), key=lambda p: (p.is_file(), p.name.lower()))
    except PermissionError:
        return []

    for entry in entries:
        if entry.name in SKIP_NAMES or entry.name.startswith("."):
            if entry.name not in {".gitignore", ".eslintrc", ".prettierrc", ".env.example"}:
                continue
        if _is_blocked(entry):
            continue
        rel = f"{rel_base}/{entry.name}" if rel_base else entry.name
        count[0] += 1
        if entry.is_dir():
            children = _build_tree(entry, rel, depth + 1, count)
            nodes.append(DevFileNode(name=entry.name, path=rel, type="dir", children=children))
        else:
            try:
                size = entry.stat().st_size
            except OSError:
                size = 0
            nodes.append(DevFileNode(name=entry.name, path=rel, type="file", size=size))
    return nodes


def _resolve_safe(rel_path: str) -> Path:
    """Resolve a relative path to an absolute path within PROJECT_ROOT. Raises 403 if outside."""
    # Normalize separators
    norm = rel_path.replace("\\", "/").lstrip("/")
    abs_path = (PROJECT_ROOT / norm).resolve()
    # Must be inside project root
    try:
        abs_path.relative_to(PROJECT_ROOT)
    except ValueError:
        raise HTTPException(403, "Path outside project root")
    return abs_path


def _is_allowed_for_listing(rel_path: str) -> bool:
    root_part = rel_path.replace("\\", "/").lstrip("/").split("/")[0]
    return root_part in ALLOWED_ROOTS


def _is_protected(rel_path: str) -> bool:
    norm = rel_path.replace("\\", "/").lstrip("/")
    return norm in PROTECTED_FILES


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


def _parse_patch(text: str, file_path: str) -> dict | None:
    """Extract <patch>...</patch> block from AI response."""
    match = re.search(r"<patch>(.*?)</patch>", text, re.DOTALL)
    if not match:
        return None
    block = match.group(1)

    def _tag(tag: str) -> str:
        m = re.search(rf"<{tag}>(.*?)</{tag}>", block, re.DOTALL)
        return m.group(1).strip() if m else ""

    title       = _tag("title") or "Patch proposal"
    fpath       = _tag("file")  or file_path
    risk        = _tag("risk")  or "low"
    explanation = _tag("explanation")
    new_content = _tag("new_content")

    if not new_content:
        return None
    return {
        "title":       title,
        "file_path":   fpath.replace("\\", "/").lstrip("/"),
        "risk_level":  risk if risk in ("low", "medium", "high") else "low",
        "explanation": explanation,
        "new_content": new_content,
    }


async def _sse_stream(
    messages: list,
    cfg: OsSettingsRow,
    model: str | None,
) -> AsyncGenerator[str, None]:
    """Yield raw SSE chunks from stream_with_fallback."""
    from app.schemas import ChatMessage as CM
    typed = [CM(**m) if isinstance(m, dict) else m for m in messages]
    resolved = resolve_model(
        factory_id="dev",
        factory_preferred_model=None,
        os_default_model=cfg.default_model,
        requested_model=model,
    )
    knowledge_ctx = build_agent_context(["project", "architecture", "rules", "lessons"])
    system_prompt = f"{knowledge_ctx}\n\n{VIRTUAL_CLAUDE_DEV_PROMPT}"
    _model, gen = await stream_with_fallback(
        typed, resolved, cfg, system_prompt
    )
    async for chunk in gen:
        yield chunk


def _log(db: AsyncSession, action: str, summary: str,
         file_path: str | None = None, patch_id: str | None = None,
         model_used: str | None = None, tokens: int | None = None) -> None:
    """Queue a DevHistory row (caller must commit)."""
    db.add(DevHistory(
        id=str(uuid.uuid4()), action=action, summary=summary,
        file_path=file_path, patch_id=patch_id,
        model_used=model_used, tokens=tokens,
    ))


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/dev/files", response_model=list[DevFileNode])
async def get_files():
    """Return the project directory tree (safe subset)."""
    nodes: list[DevFileNode] = []
    for root_name in sorted(ALLOWED_ROOTS):
        root_path = PROJECT_ROOT / root_name
        if root_path.exists():
            children = _build_tree(root_path, root_name)
            nodes.append(DevFileNode(name=root_name, path=root_name, type="dir", children=children))
    return nodes


@router.post("/dev/inspect", response_model=DevInspectOut)
async def inspect_file(req: DevInspectRequest, db: AsyncSession = Depends(get_db)):
    """Read a project file and return its content."""
    if not _is_allowed_for_listing(req.path):
        raise HTTPException(403, "Path not in allowed roots (website/, backend/, docs/)")

    abs_path = _resolve_safe(req.path)

    if not abs_path.exists():
        raise HTTPException(404, f"File not found: {req.path}")
    if abs_path.is_dir():
        raise HTTPException(400, "Path is a directory")
    if _is_blocked(abs_path):
        raise HTTPException(403, "File is blocked for security reasons")

    if abs_path.suffix not in TEXT_EXTENSIONS:
        raise HTTPException(400, "File type not supported for inspection")

    size = abs_path.stat().st_size
    if size > MAX_FILE_SIZE:
        raise HTTPException(400, f"File too large ({size // 1024} KB). Max is {MAX_FILE_SIZE // 1024} KB")

    try:
        content = abs_path.read_text(encoding="utf-8", errors="replace")
    except OSError as e:
        raise HTTPException(500, f"Cannot read file: {e}")

    rel = req.path.replace("\\", "/").lstrip("/")
    _log(db, "inspect", f"Inspected {rel}", file_path=rel)
    await db.commit()

    return DevInspectOut(path=rel, content=content, size=size, lines=content.count("\n") + 1)


@router.post("/dev/chat")
async def dev_chat(req: DevChatRequest, db: AsyncSession = Depends(get_db),
                   _user: User = Depends(get_current_user)):
    """Chat with Virtual Claude Dev — streaming SSE. Requires login."""
    cfg = await _get_cfg(db)

    async def generate():
        output_parts: list[str] = []
        async for chunk in _sse_stream(req.messages, cfg, req.model):
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

        # Log the interaction
        summary = "".join(output_parts)[:200]
        _log(db, "chat", summary, model_used=cfg.default_model)
        await db.commit()

    return StreamingResponse(generate(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@router.post("/dev/plan")
async def dev_plan(req: DevPlanRequest, db: AsyncSession = Depends(get_db),
                   _user: User = Depends(get_current_user)):
    """Generate an implementation plan — streaming SSE. Requires login."""
    cfg = await _get_cfg(db)

    # Build a plan-specific prompt
    file_context = ""
    if req.files:
        file_context = "\n\nRelevant files:\n" + "\n".join(f"- {f}" for f in req.files[:10])
    context_block = f"\n\nAdditional context:\n{req.context}" if req.context else ""

    from app.schemas import ChatMessage as CM
    messages = [
        CM(role="user", content=(
            f"Please generate a detailed implementation plan for the following task:"
            f"\n\n**Task:** {req.task}"
            f"{file_context}"
            f"{context_block}"
            f"\n\nStructure the plan with:\n"
            f"1. Overview of changes\n"
            f"2. Files to modify (with specific changes)\n"
            f"3. Files to create (if any)\n"
            f"4. Implementation steps in order\n"
            f"5. Potential risks and breaking changes\n"
            f"6. Recommended tests"
        ))
    ]

    async def generate():
        output_parts: list[str] = []
        resolved = resolve_model("dev", None, cfg.default_model, req.model)
        _model, gen = await stream_with_fallback(messages, resolved, cfg, VIRTUAL_CLAUDE_DEV_PROMPT)
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

        summary = f"Plan: {req.task[:80]}"
        _log(db, "plan", summary, model_used=_model)
        await db.commit()

    return StreamingResponse(generate(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@router.post("/dev/patch")
async def dev_patch(req: DevPatchRequest, db: AsyncSession = Depends(get_db),
                    _user: User = Depends(get_current_user)):
    """Generate a patch proposal — streams AI response then stores the patch. Requires login."""
    if _is_protected(req.file_path):
        raise HTTPException(403, f"File {req.file_path!r} is protected and cannot be patched")

    cfg = await _get_cfg(db)

    # Read current file content to include in prompt
    try:
        abs_path = _resolve_safe(req.file_path)
        original = abs_path.read_text(encoding="utf-8", errors="replace") if abs_path.exists() else "(new file)"
    except HTTPException:
        original = "(cannot read)"

    from app.schemas import ChatMessage as CM
    context_block = f"\n\nAdditional context:\n{req.context}" if req.context else ""
    messages = [
        CM(role="user", content=(
            f"Please analyze the following file and generate a patch for this task:"
            f"\n\n**Task:** {req.task}"
            f"\n**File:** `{req.file_path}`"
            f"{context_block}"
            f"\n\n**Current file content:**\n```\n{original[:8000]}\n```"
            f"\n\nPlease:\n"
            f"1. Explain the proposed change and why\n"
            f"2. List any risks\n"
            f"3. Recommend tests\n"
            f"4. At the END of your response, output the patch using EXACTLY this XML format:\n\n"
            f"<patch>\n"
            f"<title>Short title (max 80 chars)</title>\n"
            f"<file>{req.file_path}</file>\n"
            f"<risk>low|medium|high</risk>\n"
            f"<explanation>Why this change is needed</explanation>\n"
            f"<new_content>\n"
            f"COMPLETE_FILE_CONTENT_WITH_YOUR_CHANGES\n"
            f"</new_content>\n"
            f"</patch>"
        ))
    ]

    async def generate():
        output_parts: list[str] = []
        resolved = resolve_model("dev", None, cfg.default_model, req.model)
        _model, gen = await stream_with_fallback(messages, resolved, cfg, VIRTUAL_CLAUDE_DEV_PROMPT)
        async for chunk in gen:
            # Suppress intermediate [DONE] — we emit our own at the very end
            # so the patch_id event arrives before the client closes the stream.
            if "data: [DONE]" in chunk:
                continue
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
        patch_data = _parse_patch(full_output, req.file_path)

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
            _log(db, "patch", f"Patch: {patch_data['title'][:80]}",
                 file_path=patch_data["file_path"], patch_id=patch.id, model_used=_model)
            await db.commit()
            patch_id = patch.id

        # patch_id BEFORE [DONE] so the frontend receives it before closing the stream
        if patch_id:
            yield f"data: {json.dumps({'patch_id': patch_id})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@router.post("/dev/apply", response_model=DevApplyOut)
async def apply_patch(
    req: DevApplyRequest,
    db:  AsyncSession = Depends(get_db),
    _user: User = Depends(require_admin),
):
    """Apply a stored patch. Requires confirmed=True + admin role."""
    if not req.confirmed:
        raise HTTPException(400, "confirmed=True is required to apply a patch")

    res = await db.execute(select(DevPatch).where(DevPatch.id == req.patchId))
    patch = res.scalars().first()
    if not patch:
        raise HTTPException(404, f"Patch not found: {req.patchId}")
    if patch.status != "pending":
        raise HTTPException(409, f"Patch is already {patch.status}")

    # Safety: block protected files
    if _is_protected(patch.file_path):
        raise HTTPException(403, f"Cannot apply: {patch.file_path!r} is a protected file")

    abs_path = _resolve_safe(patch.file_path)

    # Verify file hasn't changed since proposal
    if abs_path.exists():
        current = abs_path.read_text(encoding="utf-8", errors="replace")
        if current != patch.original_content:
            raise HTTPException(
                409,
                "File has changed since the patch was generated. "
                "Please regenerate the patch with the current file content."
            )

    # Write the new content
    try:
        abs_path.parent.mkdir(parents=True, exist_ok=True)
        abs_path.write_text(patch.new_content, encoding="utf-8")
    except OSError as e:
        raise HTTPException(500, f"Failed to write file: {e}")

    patch.status     = "applied"
    patch.applied_at = datetime.now(timezone.utc)
    _log(db, "apply", f"Applied patch: {patch.title}", file_path=patch.file_path, patch_id=patch.id)

    from app.notify import push_notification
    await push_notification(db, "patch_applied", f"Patch applied: {patch.title}",
                            body=patch.file_path, link="/os/dev")
    await db.commit()

    return DevApplyOut(ok=True, message=f"Patch applied to {patch.file_path}", patchId=patch.id)


@router.post("/dev/reject", response_model=DevApplyOut)
async def reject_patch(
    req: DevApplyRequest,
    db:  AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Reject a pending patch. Requires login."""
    res = await db.execute(select(DevPatch).where(DevPatch.id == req.patchId))
    patch = res.scalars().first()
    if not patch:
        raise HTTPException(404, f"Patch not found: {req.patchId}")
    if patch.status != "pending":
        raise HTTPException(409, f"Patch is already {patch.status}")

    patch.status = "rejected"
    _log(db, "reject", f"Rejected patch: {patch.title}", file_path=patch.file_path, patch_id=patch.id)
    await db.commit()

    return DevApplyOut(ok=True, message=f"Patch rejected", patchId=patch.id)


@router.get("/dev/history", response_model=list[DevHistoryOut])
async def get_history(limit: int = 50, db: AsyncSession = Depends(get_db)):
    """Return recent Virtual Claude Dev actions."""
    result = await db.execute(
        select(DevHistory).order_by(DevHistory.created_at.desc()).limit(limit)
    )
    rows = result.scalars().all()
    return [
        DevHistoryOut(
            id=r.id, action=r.action, summary=r.summary,
            filePath=r.file_path, patchId=r.patch_id,
            modelUsed=r.model_used, tokens=r.tokens,
            createdAt=r.created_at.isoformat(),
        )
        for r in rows
    ]


@router.get("/dev/patches", response_model=list[DevPatchOut])
async def get_patches(status: str | None = None, limit: int = 30, db: AsyncSession = Depends(get_db)):
    """Return stored patch proposals."""
    q = select(DevPatch).order_by(DevPatch.created_at.desc()).limit(limit)
    if status:
        q = q.where(DevPatch.status == status)
    result = await db.execute(q)
    rows = result.scalars().all()
    return [
        DevPatchOut(
            id=r.id, title=r.title, filePath=r.file_path,
            originalContent=r.original_content, newContent=r.new_content,
            aiExplanation=r.ai_explanation, riskLevel=r.risk_level,
            status=r.status, createdAt=r.created_at.isoformat(),
            appliedAt=r.applied_at.isoformat() if r.applied_at else None,
        )
        for r in rows
    ]
