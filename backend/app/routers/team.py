"""
Virtual Claude Team Orchestration endpoints.

GET  /api/team/status          — active agents, task metrics
GET  /api/team/tasks           — task queue (filterable)
POST /api/team/tasks           — create a task
PATCH /api/team/tasks/{id}     — update task status / priority
GET  /api/team/messages        — collaboration timeline
POST /api/team/improve         — "Improve AI OS" — SSE analysis + task generation
GET  /api/team/sessions        — list team sessions
GET  /api/team/sessions/{id}   — session detail with tasks + messages
"""
from __future__ import annotations

import json
import os
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models import (
    AgentTask, TeamSession, AgentMessage,
    VirtualAgent, OsSettingsRow, DevPatch, User,
)
from app.schemas import (
    AgentTaskOut, AgentTaskCreate, AgentTaskUpdate,
    TeamSessionOut, AgentMessageOut, TeamStatusOut, ImproveRequest,
    CollaborateRequest,
)
from app.auth import get_current_user
from app.services.ai_router import resolve_model
from app.services.retry import stream_with_fallback
from app.services.knowledge_loader import build_agent_context

router = APIRouter(tags=["team"])

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent

# ---------------------------------------------------------------------------
# System prompts
# ---------------------------------------------------------------------------

ARCHITECT_SYSTEM_PROMPT = """You are Architect Claude — the lead AI architect of AI OS.

## Project
AI OS is a self-developing AI platform:
- Frontend: Next.js 16 App Router, TypeScript, Tailwind CSS, motion/react
- Backend: FastAPI + SQLAlchemy async + SQLite
- AI routing: Claude → OpenAI → Gemini fallback
- Pages: /os/dashboard /os/workflows /os/factories /os/agents /os/memory /os/dev /os/debug /os/workspace /os/team
- Key patterns: OsApiAdapter interface, DevPatch approval flow, SSE streaming

## Team
- architect-claude: Plans, coordinates, assigns tasks
- backend-claude: Python/FastAPI specialist
- frontend-claude: TypeScript/Next.js specialist
- reviewer-claude: Code quality, security review
- debug-claude: Error analysis and fixes
- research-claude: Technology research

## Safety Rules
1. NEVER suggest deleting files
2. NEVER suggest destructive git operations
3. NEVER modify Kernel files: database.py, config.py, ai_router.py, retry.py, models.py
4. Always propose patches, require human approval before applying

## Task Output Format (REQUIRED when generating tasks)

After your analysis narrative, output:

---TASKS---
TASK:
title: Concise title (max 60 chars)
agent: [architect-claude|backend-claude|frontend-claude|reviewer-claude|debug-claude|research-claude]
file: relative/path/to/file.ext
priority: [1-10]
description: What to change and why (2-3 sentences)
depends: []
---END TASKS---

Respond in the user's language (Japanese or English)."""

TEAM_AGENT_PROMPTS: dict[str, str] = {
    "backend-claude": "You are Backend Claude — a FastAPI/Python specialist. "
        "Analyze backend code, identify issues, and propose safe patches to Python files. "
        "Follow SOLID principles, use async/await correctly, validate schemas, handle DB errors.",
    "frontend-claude": "You are Frontend Claude — a Next.js 16 / TypeScript specialist. "
        "Analyze frontend code, identify issues, and propose safe patches. "
        "Use proper TypeScript types, follow the OsApiAdapter pattern, avoid any-casting.",
    "reviewer-claude": "You are Reviewer Claude — a code quality and security specialist. "
        "Review patches for bugs, security issues, breaking changes, and missing tests. "
        "Be specific and actionable in your feedback.",
    "debug-claude": "You are Debug Claude — an error analysis specialist. "
        "Identify root causes, explain why errors occur, and propose minimal safe fixes.",
    "research-claude": "You are Research Claude — a technology research specialist. "
        "Research best practices, compare approaches, and provide actionable recommendations.",
}

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


def _get_project_summary() -> str:
    """Build a concise project structure summary for AI prompts."""
    parts: list[str] = []
    key_paths = [
        ("website/app/os",   ("page.tsx",)),
        ("website/lib/api",  (".ts",)),
        ("website/hooks",    (".ts",)),
        ("website/components/os", (".tsx",)),
        ("backend/app/routers", (".py",)),
        ("backend/app",      ("models.py", "schemas.py", "seed.py")),
    ]
    for rel, exts in key_paths:
        p = PROJECT_ROOT / rel.replace("/", os.sep)
        if p.is_dir():
            files = [f.name for f in sorted(p.iterdir()) if f.suffix in exts or f.name in exts]
            if files:
                parts.append(f"{rel}/: {', '.join(files[:12])}")
        elif p.is_file():
            parts.append(f"{rel} ({p.stat().st_size // 1024}KB)")
    return "\n".join(parts)


def _parse_tasks(text: str) -> list[dict]:
    """Extract structured tasks from AI response."""
    tasks: list[dict] = []
    section = re.search(r"---TASKS---(.*?)---END TASKS---", text, re.DOTALL)
    if not section:
        return []

    valid_agents = {
        "architect-claude", "backend-claude", "frontend-claude",
        "reviewer-claude", "debug-claude", "research-claude",
    }

    for block in re.split(r"\nTASK:", "\nTASK:" + section.group(1)):
        block = block.strip()
        if not block:
            continue

        def _field(name: str) -> str:
            m = re.search(rf"^{name}:\s*(.+?)(?=\n\w|$)", block, re.MULTILINE | re.DOTALL)
            return m.group(1).strip() if m else ""

        title = _field("title")
        if not title:
            continue

        agent  = _field("agent").lower()
        if agent not in valid_agents:
            agent = "architect-claude"

        fpath = _field("file").strip()
        if fpath in ("none", "None", "N/A", ""):
            fpath = None

        try:
            priority = max(1, min(10, int(_field("priority") or "5")))
        except ValueError:
            priority = 5

        tasks.append({
            "title":       title[:60],
            "agent_id":    agent,
            "file_path":   fpath,
            "priority":    priority,
            "description": _field("description"),
            "depends_on":  [],
        })

    return tasks[:10]  # cap at 10 tasks


def _auto_assign_agent(file_path: str | None, description: str) -> str:
    """Auto-assign an agent based on file type or description keywords."""
    if file_path:
        if file_path.endswith(".py"):
            return "backend-claude"
        if file_path.endswith((".ts", ".tsx", ".js", ".jsx")):
            return "frontend-claude"

    desc = (description or "").lower()
    if any(w in desc for w in ["review", "check", "validate", "quality", "security"]):
        return "reviewer-claude"
    if any(w in desc for w in ["error", "bug", "debug", "crash", "exception", "fix"]):
        return "debug-claude"
    if any(w in desc for w in ["research", "investigate", "best practice", "compare"]):
        return "research-claude"
    return "architect-claude"


def _task_out(t: AgentTask) -> AgentTaskOut:
    return AgentTaskOut(
        id=t.id,
        sessionId=t.session_id,
        agentId=t.agent_id,
        title=t.title,
        description=t.description,
        status=t.status,
        priority=t.priority,
        dependsOn=t.depends_on or [],
        filePath=t.file_path,
        patchId=t.patch_id,
        output=t.output,
        errorMsg=t.error_msg,
        tokensUsed=t.tokens_used,
        createdAt=t.created_at.isoformat(),
        startedAt=t.started_at.isoformat() if t.started_at else None,
        completedAt=t.completed_at.isoformat() if t.completed_at else None,
    )


def _session_out(s: TeamSession) -> TeamSessionOut:
    return TeamSessionOut(
        id=s.id,
        goal=s.goal,
        status=s.status,
        plan=s.plan,
        agentsAssigned=s.agents_assigned or [],
        taskCount=s.task_count,
        completedTasks=s.completed_tasks,
        modelUsed=s.model_used,
        tokens=s.tokens,
        createdAt=s.created_at.isoformat(),
        updatedAt=s.updated_at.isoformat(),
    )


def _msg_out(m: AgentMessage) -> AgentMessageOut:
    return AgentMessageOut(
        id=m.id,
        sessionId=m.session_id,
        fromAgent=m.from_agent,
        toAgent=m.to_agent,
        messageType=m.message_type,
        content=m.content,
        taskId=m.task_id,
        patchId=m.patch_id,
        createdAt=m.created_at.isoformat(),
    )


def _add_msg(db: AsyncSession, session_id: str | None, from_agent: str,
             content: str, to_agent: str | None = None,
             message_type: str = "info", task_id: str | None = None) -> None:
    db.add(AgentMessage(
        id=str(uuid.uuid4()), session_id=session_id,
        from_agent=from_agent, to_agent=to_agent,
        message_type=message_type, content=content, task_id=task_id,
    ))


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/team/status", response_model=TeamStatusOut)
async def get_team_status(db: AsyncSession = Depends(get_db)):
    """Return active agent count, task queue metrics, and recent activity."""
    # Agent counts
    agents_res = await db.execute(
        select(VirtualAgent).where(VirtualAgent.is_enabled == True)
    )
    all_agents = agents_res.scalars().all()
    total_agents = len(all_agents)

    # Task metrics
    def _task_count(status: str) -> "AsyncSession":
        return db.execute(
            select(func.count()).select_from(AgentTask).where(AgentTask.status == status)
        )

    pending_res    = await _task_count("pending")
    in_prog_res    = await _task_count("in_progress")
    completed_res  = await _task_count("completed")
    failed_res     = await _task_count("failed")

    pending_n    = pending_res.scalar()   or 0
    in_progress_n = in_prog_res.scalar()  or 0
    completed_n  = completed_res.scalar() or 0
    failed_n     = failed_res.scalar()    or 0
    active_n     = in_progress_n

    # Sessions
    sess_res = await db.execute(select(func.count()).select_from(TeamSession))
    total_sessions = sess_res.scalar() or 0

    # Tokens from team sessions
    tok_res = await db.execute(
        select(func.coalesce(func.sum(TeamSession.tokens), 0))
    )
    total_tokens = int(tok_res.scalar() or 0)

    # Recent activity from messages
    recent_res = await db.execute(
        select(AgentMessage).order_by(AgentMessage.created_at.desc()).limit(5)
    )
    recent_msgs = recent_res.scalars().all()
    recent_activity = [f"[{m.from_agent}] {m.content[:60]}" for m in recent_msgs]

    return TeamStatusOut(
        active_agents=active_n,
        idle_agents=max(0, total_agents - active_n),
        total_agents=total_agents,
        pending_tasks=pending_n,
        in_progress_tasks=in_progress_n,
        completed_tasks=completed_n,
        failed_tasks=failed_n,
        total_sessions=total_sessions,
        total_tokens=total_tokens,
        recent_activity=recent_activity,
    )


@router.get("/team/tasks", response_model=list[AgentTaskOut])
async def get_tasks(
    status: str | None = None,
    agent_id: str | None = None,
    session_id: str | None = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    q = select(AgentTask).order_by(AgentTask.priority.desc(), AgentTask.created_at.desc()).limit(limit)
    if status:
        q = q.where(AgentTask.status == status)
    if agent_id:
        q = q.where(AgentTask.agent_id == agent_id)
    if session_id:
        q = q.where(AgentTask.session_id == session_id)
    result = await db.execute(q)
    return [_task_out(t) for t in result.scalars().all()]


@router.post("/team/tasks", response_model=AgentTaskOut, status_code=201)
async def create_task(req: AgentTaskCreate, db: AsyncSession = Depends(get_db)):
    agent = req.agent_id or _auto_assign_agent(req.file_path, req.description)
    task = AgentTask(
        id=str(uuid.uuid4()),
        session_id=req.session_id,
        agent_id=agent,
        title=req.title,
        description=req.description,
        status="pending",
        priority=req.priority,
        depends_on=req.depends_on,
        file_path=req.file_path,
    )
    db.add(task)
    _add_msg(db, req.session_id, "orchestrator",
             f"Task created: {req.title} → assigned to {agent}",
             to_agent=agent, message_type="task", task_id=task.id)
    await db.commit()
    return _task_out(task)


@router.patch("/team/tasks/{task_id}", response_model=AgentTaskOut)
async def update_task(task_id: str, req: AgentTaskUpdate, db: AsyncSession = Depends(get_db)):
    res  = await db.execute(select(AgentTask).where(AgentTask.id == task_id))
    task = res.scalars().first()
    if not task:
        raise HTTPException(404, f"Task not found: {task_id}")

    now = datetime.now(timezone.utc)
    if req.status is not None:
        old_status = task.status
        task.status = req.status
        if req.status == "in_progress" and old_status == "pending":
            task.started_at = now
        elif req.status in ("completed", "failed") and not task.completed_at:
            task.completed_at = now
    if req.priority  is not None: task.priority  = req.priority
    if req.agent_id  is not None: task.agent_id  = req.agent_id
    if req.output    is not None: task.output    = req.output
    if req.error_msg is not None: task.error_msg = req.error_msg

    await db.commit()
    return _task_out(task)


@router.get("/team/messages", response_model=list[AgentMessageOut])
async def get_messages(
    session_id: str | None = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    q = select(AgentMessage).order_by(AgentMessage.created_at.desc()).limit(limit)
    if session_id:
        q = q.where(AgentMessage.session_id == session_id)
    result = await db.execute(q)
    return [_msg_out(m) for m in result.scalars().all()]


@router.get("/team/sessions", response_model=list[TeamSessionOut])
async def list_sessions(limit: int = 20, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(TeamSession).order_by(TeamSession.created_at.desc()).limit(limit)
    )
    return [_session_out(s) for s in result.scalars().all()]


@router.get("/team/sessions/{session_id}")
async def get_session(session_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(TeamSession).where(TeamSession.id == session_id))
    s   = res.scalars().first()
    if not s:
        raise HTTPException(404, f"Session not found: {session_id}")

    tasks_res = await db.execute(
        select(AgentTask).where(AgentTask.session_id == session_id)
        .order_by(AgentTask.priority.desc())
    )
    msgs_res = await db.execute(
        select(AgentMessage).where(AgentMessage.session_id == session_id)
        .order_by(AgentMessage.created_at.desc()).limit(30)
    )
    return {
        "session": _session_out(s),
        "tasks":   [_task_out(t) for t in tasks_res.scalars().all()],
        "messages": [_msg_out(m) for m in msgs_res.scalars().all()],
    }


@router.post("/team/improve")
async def improve_ai_os(req: ImproveRequest, db: AsyncSession = Depends(get_db),
                        _user: User = Depends(get_current_user)):
    """
    'Improve AI OS' — inspects source code, generates improvement roadmap,
    creates AgentTask records, and streams the AI analysis as SSE. Requires login.

    Final SSE event: {"session_id": "...", "task_count": N}
    """
    cfg = await _get_cfg(db)

    # Create a TeamSession upfront
    session = TeamSession(
        id=str(uuid.uuid4()),
        goal=req.goal,
        status="planning",
    )
    db.add(session)
    _add_msg(db, session.id, "orchestrator",
             f"Session started: {req.goal}", message_type="plan")
    await db.commit()

    project_summary = _get_project_summary()

    from app.schemas import ChatMessage as CM
    messages = [
        CM(role="user", content=(
            f"Goal: {req.goal}\n\n"
            f"## Current Project Structure\n{project_summary}\n\n"
            f"Please analyze the AI OS project and generate a concrete improvement roadmap. "
            f"Generate {req.max_tasks} high-impact tasks. "
            f"Each task must reference a specific file and be assigned to the most appropriate team agent. "
            f"Output tasks in the required ---TASKS--- format."
        ))
    ]

    async def generate():
        output_parts: list[str] = []
        model_used_ref: list[str] = ["unknown"]

        resolved = resolve_model("dev", None, cfg.default_model)
        knowledge_ctx = build_agent_context(["project", "architecture", "rules", "roadmap"])
        arch_prompt = f"{knowledge_ctx}\n\n{ARCHITECT_SYSTEM_PROMPT}"
        _model, gen = await stream_with_fallback(messages, resolved, cfg, arch_prompt)
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
        parsed_tasks = _parse_tasks(full_output)

        # Create AgentTask records
        agents_seen: set[str] = set()
        task_ids: list[str] = []
        for tdata in parsed_tasks:
            agent = tdata.get("agent_id") or _auto_assign_agent(
                tdata.get("file_path"), tdata.get("description", "")
            )
            agents_seen.add(agent)
            task = AgentTask(
                id=str(uuid.uuid4()),
                session_id=session.id,
                agent_id=agent,
                title=tdata["title"],
                description=tdata.get("description", ""),
                status="pending",
                priority=tdata.get("priority", 5),
                depends_on=tdata.get("depends_on", []),
                file_path=tdata.get("file_path"),
            )
            db.add(task)
            task_ids.append(task.id)
            _add_msg(db, session.id, "architect-claude",
                     f"Task assigned to {agent}: {tdata['title']}",
                     to_agent=agent, message_type="task", task_id=task.id)

        # Update session
        session.status          = "active"
        session.plan            = full_output[:4000]
        session.agents_assigned = list(agents_seen)
        session.task_count      = len(parsed_tasks)
        session.model_used      = model_used_ref[0]

        await db.commit()

        yield f"data: {json.dumps({'session_id': session.id, 'task_count': len(parsed_tasks)})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(), media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ===========================================================================
# Phase 4 — AI Team Collaboration
# ===========================================================================

_PROTECTED_COLLAB = frozenset({
    "database.py", "config.py", "ai_router.py", "retry.py", "models.py"
})

_AGENT_META = {
    "architect-claude":  {"name": "Architect Claude",  "icon": "🏛️", "desc": "AI OS lead architect, designs roadmaps and assigns tasks"},
    "backend-claude":    {"name": "Backend Claude",    "icon": "⚙️", "desc": "FastAPI/Python specialist, implements APIs and DB models"},
    "frontend-claude":   {"name": "Frontend Claude",   "icon": "🎨", "desc": "Next.js/TypeScript specialist, builds UI components and pages"},
    "reviewer-claude":   {"name": "Reviewer Claude",   "icon": "🔍", "desc": "Code quality and security specialist, reviews all patches"},
    "debug-claude":      {"name": "Debug Claude",      "icon": "🐛", "desc": "Error analysis and debugging specialist"},
    "research-claude":   {"name": "Research Claude",   "icon": "🔬", "desc": "Technology research and best practices specialist"},
}

_COLLAB_ARCH_PROMPT = """\
You are Architect Claude — the lead architect of AI OS, a self-developing AI platform.

## Platform Stack
- Frontend: Next.js 16 App Router, TypeScript, Tailwind CSS  — files under website/
- Backend:  FastAPI + SQLAlchemy async + SQLite             — files under backend/
- AI routing: Claude → OpenAI → Gemini fallback chain
- Key patterns: OsApiAdapter interface, DevPatch approval flow, SSE streaming

## Team Roster
- backend-claude  → Python/FastAPI  → MUST specify a .py file path under backend/app/
- frontend-claude → TypeScript/React → MUST specify a .ts or .tsx file path under website/
- reviewer-claude → Reviews patches  → set file: null
- debug-claude    → Tests for issues → set file: null

## Your Job
1. Analyze the goal
2. Break it into 2–4 concrete phases
3. Assign the right specialist with an EXACT file path
4. End with reviewer-claude

## Safety Rules
- NEVER modify: database.py, config.py, ai_router.py, retry.py, models.py
- All patches require human approval

## CRITICAL: You MUST output the plan block at the very end of your response.

Example (for goal "Add a ping endpoint"):

---PLAN---
PHASE:
agent: backend-claude
task: Add /api/ping endpoint with uptime info
file: backend/app/routers/ping.py
new: true
description: Create a new router with GET /ping endpoint that returns status and server uptime in seconds.

PHASE:
agent: reviewer-claude
task: Review ping endpoint implementation
file: null
new: false
description: Check the implementation for correctness and FastAPI best practices.
---END PLAN---

Now write your analysis, then output the ---PLAN--- block for the actual goal:
"""

_COLLAB_IMPL_TEMPLATE = """\
You are {agent_name} — {agent_desc}.

## Task
Title: {task_title}
Description: {task_description}

## Target File
Path: {file_path}
Status: {file_status}
{file_content_block}

## Instructions
1. Implement the task completely and correctly
2. Output the COMPLETE file content (not a partial diff)
3. Follow existing patterns exactly — do not introduce new patterns without good reason
4. TypeScript: use strict types, follow OsApiAdapter patterns, no unsafe `any`
5. Python: use async/await, validate with Pydantic, handle errors gracefully
6. Do NOT modify protected files: database.py, config.py, ai_router.py, retry.py, models.py

## Required Output Format

Write your explanation first, then output the patch block at the very end:

---PATCH---
title: [Brief, descriptive patch title]
file: {file_path}
---CODE---
```{language}
[COMPLETE FILE CONTENT HERE — do not truncate]
```
---END PATCH---
"""

_COLLAB_REVIEWER_PROMPT = """\
You are Reviewer Claude — code quality and security specialist for AI OS.

Review all patches generated by the Virtual Claude Team. For each patch:

**Check:**
- Correctness: implements what was requested?
- Security: injection, auth bypass, data exposure, prototype pollution?
- TypeScript: proper types, no `any` abuse, correct async patterns?
- Python: proper error handling, SQL injection safety, async correctness?
- AI OS patterns: follows OsApiAdapter, SSE format, DevPatch approval gate?
- Safety: no protected files modified (database.py, config.py, ai_router.py, retry.py, models.py)?

## Required Output Format

## Review Summary
[2-3 sentence overall assessment]

## Per-Patch Review

### [patch title] (`file_path`)
- **Status**: ✅ Approved | ⚠️ Needs Changes | ❌ Rejected
- **Issues**: [list issues or "None found"]
- **Suggestions**: [list suggestions or "None"]

## Verdict
[APPROVED|NEEDS_REVISION]: [brief reason]
"""


def _collab_safe(path: str | None) -> bool:
    return not path or Path(path).name not in _PROTECTED_COLLAB


def _read_file_safe(rel: str | None) -> tuple[str, str]:
    """(content[:6000], 'existing N chars' | 'new file')"""
    if not rel:
        return "", "new file"
    p = PROJECT_ROOT / rel.replace("/", os.sep)
    if not p.is_file():
        return "", "new file (will be created)"
    try:
        txt = p.read_text("utf-8")
        return txt[:6000], f"existing ({len(txt):,} chars)"
    except Exception:
        return "", "unreadable"


def _parse_collab_plan(text: str) -> list[dict]:
    """Parse ---PLAN---...---END PLAN--- into list of phase dicts."""
    m = re.search(r"---PLAN---(.*?)---END PLAN---", text, re.DOTALL)
    if not m:
        return []
    valid = {"backend-claude", "frontend-claude", "reviewer-claude",
             "debug-claude", "research-claude", "architect-claude"}
    out: list[dict] = []
    for block in re.split(r"\nPHASE:", "\nPHASE:" + m.group(1)):
        block = block.strip()
        if not block:
            continue

        def _f(name: str) -> str:
            x = re.search(rf"^{name}:\s*(.+?)(?=\n\w+:|$)", block, re.M | re.S)
            return x.group(1).strip() if x else ""

        agent = _f("agent").lower()
        if agent not in valid:
            continue
        fp = _f("file")
        fp = None if fp in ("null", "None", "N/A", "", "none") else fp
        out.append({
            "agent_id":    agent,
            "title":       _f("task")[:60] or f"Task for {agent}",
            "file_path":   fp,
            "is_new":      _f("new").lower() in ("true", "yes"),
            "description": _f("description"),
        })
    return out[:6]


def _extract_patch(text: str) -> dict | None:
    """Extract ---PATCH---...---END PATCH--- → {title, file_path, new_content}."""
    m = re.search(r"---PATCH---(.*?)---END PATCH---", text, re.DOTALL)
    if not m:
        # Fallback: grab largest fenced code block
        blocks = re.findall(r"```(?:\w+)?\n([\s\S]*?)```", text)
        if not blocks:
            return None
        code = max(blocks, key=len)
        if len(code.strip()) < 20:
            return None
        return {"title": "Generated patch", "file_path": None, "new_content": code.strip()}

    block = m.group(1)

    def _f(name: str) -> str:
        x = re.search(rf"^{name}:\s*(.+?)(?=\n\w+:|$)", block, re.M)
        return x.group(1).strip() if x else ""

    code_m = (
        re.search(r"---CODE---\s*```\w*\n([\s\S]*?)```", block)
        or re.search(r"```\w*\n([\s\S]*?)```", block)
    )
    if not code_m:
        return None

    return {
        "title":       _f("title") or "Generated patch",
        "file_path":   _f("file") or None,
        "new_content": code_m.group(1).strip(),
    }


def _sse(data: dict) -> str:
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"


@router.post("/team/collaborate")
async def collaborate(req: CollaborateRequest, db: AsyncSession = Depends(get_db),
                      _user: User = Depends(get_current_user)):
    """
    Full multi-agent collaboration pipeline. SSE streaming. Requires login.

    Flow:
      Architect (plan) → Implementers (backend/frontend) → Reviewer
      Each phase streams live. Patches saved to DB, require human approval.

    SSE event types: session_start | agent_start | content | agent_done |
                     task_created | patch_created | review_result | error | done
    """
    cfg = await _get_cfg(db)
    resolved = resolve_model("team", None, cfg.default_model)
    from app.schemas import ChatMessage as CM

    async def generate():
        ts = datetime.now(timezone.utc)

        # ── Create session ────────────────────────────────────────────────
        session = TeamSession(
            id=str(uuid.uuid4()), goal=req.goal,
            status="planning", created_at=ts, updated_at=ts,
        )
        db.add(session)
        _add_msg(db, session.id, "orchestrator",
                 f"Collaboration started: {req.goal}", message_type="plan")
        await db.commit()

        yield _sse({"type": "session_start", "sessionId": session.id,
                    "goal": req.goal, "timestamp": ts.isoformat()})

        # ── Phase 1: Architect planning ───────────────────────────────────
        yield _sse({"type": "agent_start", "agent": "architect-claude",
                    "icon": "🏛️", "phase": "Planning & Roadmap",
                    "timestamp": datetime.now(timezone.utc).isoformat()})

        ctx = f"\n\nAdditional context: {req.context}" if req.context.strip() else ""
        arch_msgs = [CM(role="user", content=f"Goal: {req.goal}{ctx}")]
        arch_parts: list[str] = []

        try:
            _m, arch_gen = await stream_with_fallback(
                arch_msgs, resolved, cfg, _COLLAB_ARCH_PROMPT
            )
            async for chunk in arch_gen:
                for part in chunk.split("\n\n"):
                    part = part.strip()
                    if not part.startswith("data: "):
                        continue
                    raw = part[6:].strip()
                    if raw == "[DONE]":
                        break
                    try:
                        p = json.loads(raw)
                        if "content" in p:
                            arch_parts.append(p["content"])
                            yield _sse({"type": "content", "agent": "architect-claude",
                                        "text": p["content"],
                                        "timestamp": datetime.now(timezone.utc).isoformat()})
                    except Exception:
                        pass
        except Exception as e:
            yield _sse({"type": "error", "agent": "architect-claude", "message": str(e)})

        arch_output = "".join(arch_parts)
        phases = _parse_collab_plan(arch_output)

        # Fallback phases if parsing fails
        if not phases:
            lang_guess = "backend-claude" if "api" in req.goal.lower() or "backend" in req.goal.lower() else "frontend-claude"
            phases = [
                {"agent_id": lang_guess, "title": req.goal[:55],
                 "file_path": None, "is_new": True, "description": req.goal},
                {"agent_id": "reviewer-claude", "title": "Review implementation",
                 "file_path": None, "is_new": False, "description": "Review all generated patches for quality and safety"},
            ]

        yield _sse({"type": "agent_done", "agent": "architect-claude",
                    "summary": f"{len(phases)} phases planned",
                    "modelUsed": resolved,
                    "timestamp": datetime.now(timezone.utc).isoformat()})

        # Create AgentTask records
        db_tasks: list[AgentTask] = []
        for ph in phases:
            t = AgentTask(
                id=str(uuid.uuid4()), session_id=session.id,
                agent_id=ph["agent_id"], title=ph["title"],
                description=ph.get("description", ""), status="pending",
                priority=8, depends_on=[], file_path=ph["file_path"],
            )
            db.add(t)
            db_tasks.append(t)
            _add_msg(db, session.id, "architect-claude",
                     f"Assigned to {ph['agent_id']}: {ph['title']}",
                     to_agent=ph["agent_id"], message_type="task", task_id=t.id)
            yield _sse({"type": "task_created", "taskId": t.id,
                        "title": t.title, "agent": t.agent_id,
                        "filePath": ph["file_path"],
                        "timestamp": datetime.now(timezone.utc).isoformat()})

        await db.commit()

        # ── Phase 2+: Implementers ────────────────────────────────────────
        patch_ids:       list[str] = []
        patch_summaries: list[str] = []
        reviewer_task:   AgentTask | None = None

        for task in db_tasks:
            if task.agent_id in ("reviewer-claude", "debug-claude"):
                if task.agent_id == "reviewer-claude":
                    reviewer_task = task
                continue

            meta = _AGENT_META.get(task.agent_id, {"name": task.agent_id, "icon": "🤖", "desc": ""})
            lang = "python" if (task.file_path or "").endswith(".py") else "typescript"
            if not task.file_path and task.agent_id == "backend-claude":
                lang = "python"

            file_content, file_status = _read_file_safe(task.file_path)
            file_content_block = (
                f"## Current Content\n```{lang}\n{file_content}\n```"
                if file_content else ""
            )

            system_prompt = _COLLAB_IMPL_TEMPLATE.format(
                agent_name=meta["name"], agent_desc=meta["desc"],
                task_title=task.title,
                task_description=task.description or task.title,
                file_path=task.file_path or "new file",
                file_status=file_status,
                file_content_block=file_content_block,
                language=lang,
            )

            task.status = "in_progress"
            task.started_at = datetime.now(timezone.utc)
            await db.commit()

            yield _sse({"type": "agent_start", "agent": task.agent_id,
                        "icon": meta["icon"], "phase": task.title,
                        "timestamp": datetime.now(timezone.utc).isoformat()})

            impl_parts: list[str] = []
            impl_model = resolved

            try:
                fpath_msg = task.file_path or (
                    f"backend/app/routers/feature_{session.id[:8]}.py"
                    if task.agent_id == "backend-claude"
                    else f"website/app/os/feature_{session.id[:8]}/page.tsx"
                )
                impl_msgs = [CM(role="user", content=(
                    f"Implement the following for AI OS:\n\n"
                    f"Task: {task.title}\n"
                    f"File to create/modify: {fpath_msg}\n"
                    f"Description: {task.description or task.title}\n"
                    f"Goal context: {req.goal}\n\n"
                    f"You MUST end your response with this EXACT format "
                    f"(fill in the code block):\n\n"
                    f"---PATCH---\n"
                    f"title: {task.title[:50]}\n"
                    f"file: {fpath_msg}\n"
                    f"---CODE---\n"
                    f"```{lang}\n"
                    f"[YOUR COMPLETE IMPLEMENTATION]\n"
                    f"```\n"
                    f"---END PATCH---"
                ))]
                _m2, impl_gen = await stream_with_fallback(
                    impl_msgs, resolved, cfg, system_prompt
                )
                impl_model = _m2
                async for chunk in impl_gen:
                    for part in chunk.split("\n\n"):
                        part = part.strip()
                        if not part.startswith("data: "):
                            continue
                        raw = part[6:].strip()
                        if raw == "[DONE]":
                            break
                        try:
                            p = json.loads(raw)
                            if "content" in p:
                                impl_parts.append(p["content"])
                                yield _sse({"type": "content", "agent": task.agent_id,
                                            "text": p["content"],
                                            "timestamp": datetime.now(timezone.utc).isoformat()})
                        except Exception:
                            pass
            except Exception as e:
                task.status = "failed"
                task.error_msg = str(e)
                await db.commit()
                yield _sse({"type": "error", "agent": task.agent_id, "message": str(e)})
                continue

            impl_output = "".join(impl_parts)
            patch_data  = _extract_patch(impl_output)

            if patch_data:
                final_path = patch_data["file_path"] or task.file_path
                # Derive a sensible fallback path from agent type when none specified
                if not final_path:
                    sid_short = session.id[:8]
                    if task.agent_id == "backend-claude":
                        final_path = f"backend/app/routers/feature_{sid_short}.py"
                    elif task.agent_id == "frontend-claude":
                        final_path = f"website/app/os/feature_{sid_short}/page.tsx"
                    else:
                        final_path = f"output_{sid_short}.txt"
                # Use the path we already determined for the user message as fallback
                if not final_path:
                    final_path = fpath_msg
                if final_path and _collab_safe(final_path):
                    try:
                        orig, _ = _read_file_safe(final_path)
                        patch = DevPatch(
                            id=str(uuid.uuid4()),
                            title=patch_data["title"],
                            file_path=final_path,
                            original_content=orig,
                            new_content=patch_data["new_content"],
                            ai_explanation=impl_output[:600],
                            risk_level="low",
                            status="pending",
                        )
                        db.add(patch)
                        task.patch_id = patch.id
                        patch_ids.append(patch.id)
                        patch_summaries.append(f"{patch_data['title']} ({final_path})")
                        _add_msg(db, session.id, task.agent_id,
                                 f"Patch generated: {patch_data['title']}", message_type="info",
                                 task_id=task.id)
                        await db.commit()
                        yield _sse({"type": "patch_created", "patchId": patch.id,
                                    "filePath": final_path, "title": patch_data["title"],
                                    "agent": task.agent_id, "isNew": not orig,
                                    "timestamp": datetime.now(timezone.utc).isoformat()})
                    except Exception as patch_err:
                        await db.rollback()
                        yield _sse({"type": "error", "agent": task.agent_id,
                                    "message": f"Patch save failed: {patch_err}"})

            task.status       = "completed"
            task.completed_at = datetime.now(timezone.utc)
            await db.commit()

            yield _sse({"type": "agent_done", "agent": task.agent_id,
                        "summary": (f"Patch created: {patch_data['title']}"
                                    if patch_data else "Analysis complete"),
                        "modelUsed": impl_model,
                        "timestamp": datetime.now(timezone.utc).isoformat()})

        # ── Reviewer ──────────────────────────────────────────────────────
        if patch_summaries:
            if reviewer_task:
                reviewer_task.status     = "in_progress"
                reviewer_task.started_at = datetime.now(timezone.utc)
                await db.commit()

            yield _sse({"type": "agent_start", "agent": "reviewer-claude",
                        "icon": "🔍", "phase": "Code Review",
                        "timestamp": datetime.now(timezone.utc).isoformat()})

            review_content = "\n".join(f"• {s}" for s in patch_summaries)
            reviewer_msgs = [CM(role="user", content=(
                f"## Feature Request\nGoal: {req.goal}\n\n"
                f"## Generated Patches\n{review_content}\n\n"
                f"Review these patches for quality, security, and correctness. "
                f"They are pending human approval before being applied."
            ))]

            review_parts: list[str] = []
            try:
                _mr, review_gen = await stream_with_fallback(
                    reviewer_msgs, resolved, cfg, _COLLAB_REVIEWER_PROMPT
                )
                async for chunk in review_gen:
                    for part in chunk.split("\n\n"):
                        part = part.strip()
                        if not part.startswith("data: "):
                            continue
                        raw = part[6:].strip()
                        if raw == "[DONE]":
                            break
                        try:
                            p = json.loads(raw)
                            if "content" in p:
                                review_parts.append(p["content"])
                                yield _sse({"type": "content", "agent": "reviewer-claude",
                                            "text": p["content"],
                                            "timestamp": datetime.now(timezone.utc).isoformat()})
                        except Exception:
                            pass
            except Exception as e:
                yield _sse({"type": "error", "agent": "reviewer-claude", "message": str(e)})

            review_output = "".join(review_parts)
            verdict_m     = re.search(r"## Verdict\s*\n(.+?)(?:\n|$)", review_output)
            verdict       = verdict_m.group(1).strip() if verdict_m else "Review complete"

            _add_msg(db, session.id, "reviewer-claude", verdict[:200],
                     message_type="approve" if "APPROVED" in verdict.upper() else "review")

            if reviewer_task:
                reviewer_task.status       = "completed"
                reviewer_task.output       = review_output[:1000]
                reviewer_task.completed_at = datetime.now(timezone.utc)
                await db.commit()

            yield _sse({"type": "agent_done", "agent": "reviewer-claude",
                        "summary": verdict[:80], "modelUsed": resolved,
                        "timestamp": datetime.now(timezone.utc).isoformat()})
            yield _sse({"type": "review_result", "verdict": verdict,
                        "timestamp": datetime.now(timezone.utc).isoformat()})

        # ── Finalize session ──────────────────────────────────────────────
        session.status          = "active" if patch_ids else "completed"
        session.task_count      = len(db_tasks)
        session.completed_tasks = sum(1 for t in db_tasks if t.status == "completed")
        session.model_used      = resolved
        session.agents_assigned = list({t.agent_id for t in db_tasks})
        session.updated_at      = datetime.now(timezone.utc)
        _add_msg(db, session.id, "orchestrator",
                 f"Done. {len(patch_ids)} patch(es) pending approval.", message_type="info")
        await db.commit()

        yield _sse({"type": "done", "sessionId": session.id,
                    "taskCount": len(db_tasks), "patchCount": len(patch_ids),
                    "patchIds": patch_ids,
                    "timestamp": datetime.now(timezone.utc).isoformat()})
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(), media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
