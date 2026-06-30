"""
AIOS Executor — Plan → Patch → Approval → Apply → Test → Report pipeline.

GET    /api/executor/tasks                      — list tasks
POST   /api/executor/tasks                      — create task
GET    /api/executor/tasks/{task_id}            — get task detail
POST   /api/executor/tasks/{task_id}/plan       — generate plan (SSE)
POST   /api/executor/tasks/{task_id}/patch      — generate patch (SSE)
POST   /api/executor/tasks/{task_id}/apply      — apply patch (admin + confirmed)
POST   /api/executor/tasks/{task_id}/test       — run tests
POST   /api/executor/tasks/{task_id}/rollback   — restore original (admin)
POST   /api/executor/tasks/{task_id}/cancel     — cancel task
"""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user, require_admin
from app.database import get_db
from app.models import DevPatch, DevHistory, ExecutorTask, OsSettingsRow, User
from app.schemas import (
    ExecutorTaskCreate, ExecutorTaskOut,
    ExecutorApplyRequest, ExecutorTestRequest,
    ExecutorPlanRequest, ExecutorPatchRequest,
    ChatMessage as CM,
)
from app.services.ai_router import resolve_model
from app.services.retry import stream_with_fallback
from app.services.knowledge_loader import build_agent_context, append_changelog_entry, append_lesson_entry
from app.services.executor_engine import (
    EXECUTOR_SYSTEM_PROMPT, PROTECTED_FILES,
    parse_patch, is_protected, resolve_safe, read_file_safe,
    run_file_tests, generate_report,
)

router = APIRouter(tags=["executor"])

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _now() -> datetime:
    return datetime.now(timezone.utc)


def _fmt(dt: datetime | None) -> str:
    return dt.isoformat() if dt else ""


def _task_out(t: ExecutorTask) -> ExecutorTaskOut:
    return ExecutorTaskOut(
        id=t.id, title=t.title, instruction=t.instruction,
        status=t.status, priority=t.priority, provider=t.provider,
        model=t.model, created_by=t.created_by,
        assigned_agent=t.assigned_agent, target_files=t.target_files or [],
        plan_content=t.plan_content, patch_id=t.patch_id,
        test_result=t.test_result, report=t.report, error_msg=t.error_msg,
        created_at=_fmt(t.created_at), updated_at=_fmt(t.updated_at),
    )


async def _get_task_or_404(db: AsyncSession, task_id: str) -> ExecutorTask:
    row = (await db.execute(
        select(ExecutorTask).where(ExecutorTask.id == task_id)
    )).scalars().first()
    if not row:
        raise HTTPException(404, f"ExecutorTask '{task_id}' not found")
    return row


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


def _log(db: AsyncSession, action: str, summary: str,
         file_path: str | None = None, patch_id: str | None = None,
         model_used: str | None = None) -> None:
    db.add(DevHistory(
        id=str(uuid.uuid4()), action=action, summary=f"[Executor] {summary}",
        file_path=file_path, patch_id=patch_id, model_used=model_used,
    ))


def _resolve_model_for_task(task: ExecutorTask, cfg: OsSettingsRow) -> str:
    """Pick model based on task.provider and task.model preferences."""
    if task.model:
        return task.model
    if task.provider == "anthropic":
        return "claude-sonnet-4-6"
    if task.provider == "google":
        return "gemini-2.5-flash-lite"
    if task.provider == "openai":
        return "gpt-4o-mini"
    if task.provider == "ollama":
        return "ollama/llama3.2"
    # auto: use resolve_model with executor factory key → claude
    return resolve_model("dev", None, cfg.default_model, None)


def _build_system_prompt() -> str:
    knowledge_ctx = build_agent_context(["project", "architecture", "rules", "changelog", "roadmap"])
    return f"{knowledge_ctx}\n\n{EXECUTOR_SYSTEM_PROMPT}"


# ---------------------------------------------------------------------------
# Task CRUD
# ---------------------------------------------------------------------------

@router.get("/executor/tasks", response_model=list[ExecutorTaskOut])
async def list_tasks(
    status: str | None = Query(None),
    limit:  int        = Query(50, ge=1, le=200),
    skip:   int        = Query(0, ge=0),
    db:     AsyncSession = Depends(get_db),
    _user:  User         = Depends(get_current_user),
):
    q = select(ExecutorTask).order_by(ExecutorTask.created_at.desc()).offset(skip).limit(limit)
    if status:
        q = q.where(ExecutorTask.status == status)
    rows = (await db.execute(q)).scalars().all()
    return [_task_out(r) for r in rows]


@router.post("/executor/tasks", response_model=ExecutorTaskOut, status_code=201)
async def create_task(
    body:  ExecutorTaskCreate,
    db:    AsyncSession = Depends(get_db),
    user:  User         = Depends(get_current_user),
):
    task = ExecutorTask(
        id=str(uuid.uuid4()),
        title=body.title.strip(),
        instruction=body.instruction.strip(),
        status="pending",
        priority=body.priority,
        provider=body.provider,
        model=body.model,
        created_by=user.id,
        assigned_agent="virtual-claude-dev",
        target_files=body.target_files,
    )
    db.add(task)
    _log(db, "executor_create", f"Created task: {body.title[:60]}")
    await db.commit()
    await db.refresh(task)
    return _task_out(task)


@router.get("/executor/tasks/{task_id}", response_model=ExecutorTaskOut)
async def get_task(
    task_id: str,
    db:      AsyncSession = Depends(get_db),
    _user:   User         = Depends(get_current_user),
):
    return _task_out(await _get_task_or_404(db, task_id))


# ---------------------------------------------------------------------------
# Plan — SSE
# ---------------------------------------------------------------------------

@router.post("/executor/tasks/{task_id}/plan")
async def generate_plan(
    task_id: str,
    body:    ExecutorPlanRequest,
    db:      AsyncSession = Depends(get_db),
    _user:   User         = Depends(get_current_user),
):
    """Generate implementation plan via SSE. Collects AI output first, then updates DB, then streams."""
    task = await _get_task_or_404(db, task_id)
    if task.status not in ("pending", "planned", "failed"):
        raise HTTPException(409, f"Cannot plan a task in '{task.status}' status")

    cfg = await _get_cfg(db)
    model = _resolve_model_for_task(task, cfg)

    # Build file context from target_files
    file_snippets = ""
    for fp in (task.target_files or [])[:5]:
        content = read_file_safe(fp)
        file_snippets += f"\n\n**File: `{fp}`**\n```\n{content[:3000]}\n```"

    extra = f"\n\nAdditional context:\n{body.extra_context}" if body.extra_context else ""
    messages = [CM(role="user", content=(
        f"次の開発タスクの実装プランを作成してください:\n\n"
        f"**指示:** {task.instruction}"
        f"{file_snippets}"
        f"{extra}\n\n"
        f"以下の構造でプランを作成してください:\n"
        f"1. **概要** — 変更の目的と効果\n"
        f"2. **変更ファイル** — 変更が必要なファイルと具体的な変更内容\n"
        f"3. **実装手順** — 実装の順序\n"
        f"4. **リスク** — 破壊的変更・セキュリティへの影響\n"
        f"5. **テスト方法** — 動作確認の手順\n\n"
        f"注意: patchブロックは含めないでください（プランのみ）。"
    ))]

    task.status = "planning"
    task.updated_at = _now()
    await db.commit()

    # --- Collect AI output BEFORE streaming to client ---
    # stream_with_fallback already uses collect-then-replay internally.
    # By collecting here we guarantee DB is updated even if client disconnects mid-stream.
    sse_chunks: list[str] = []
    plan_text = ""
    error_msg = ""
    model_used = model

    try:
        system = _build_system_prompt()
        model_used, gen = await stream_with_fallback(messages, model, cfg, system)
        async for chunk in gen:
            sse_chunks.append(chunk)
            for part in chunk.split("\n\n"):
                part = part.strip()
                if part.startswith("data: "):
                    raw = part[6:].strip()
                    if raw != "[DONE]":
                        try:
                            parsed = json.loads(raw)
                            if "content" in parsed:
                                plan_text += parsed["content"]
                            elif "error" in parsed:
                                error_msg = parsed["error"]
                        except Exception:
                            pass
    except Exception as e:
        error_msg = str(e)
        sse_chunks = [
            f"data: {json.dumps({'error': error_msg})}\n\n",
            "data: [DONE]\n\n",
        ]

    # --- Always update DB before touching the client connection ---
    if plan_text.strip():
        task.plan_content = plan_text
        task.status = "planned"
        _log(db, "executor_plan", f"Plan: {task.title[:60]}", model_used=model_used)
    else:
        task.status = "failed"
        task.error_msg = error_msg or "AI生成に失敗しました。Settings でAPIキーを確認してください。"
    task.updated_at = _now()
    await db.commit()

    async def replay():
        for chunk in sse_chunks:
            yield chunk

    return StreamingResponse(replay(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


# ---------------------------------------------------------------------------
# Patch — SSE
# ---------------------------------------------------------------------------

@router.post("/executor/tasks/{task_id}/patch")
async def generate_patch(
    task_id: str,
    body:    ExecutorPatchRequest,
    db:      AsyncSession = Depends(get_db),
    _user:   User         = Depends(get_current_user),
):
    """Generate a patch for a specific file via SSE. Stores DevPatch + links to task."""
    task = await _get_task_or_404(db, task_id)
    if task.status not in ("planned", "awaiting_approval", "failed"):
        raise HTTPException(409, f"Cannot patch a task in '{task.status}' status")

    if is_protected(body.target_file):
        raise HTTPException(403, f"'{body.target_file}' is a protected file and cannot be patched")

    cfg = await _get_cfg(db)
    model = _resolve_model_for_task(task, cfg)

    original = read_file_safe(body.target_file)
    plan_ctx = f"\n\n**実装プラン（参考）:**\n{task.plan_content[:2000]}" if task.plan_content else ""
    extra = f"\n\n追加コンテキスト:\n{body.extra_context}" if body.extra_context else ""

    messages = [CM(role="user", content=(
        f"以下のファイルに対してパッチを生成してください:\n\n"
        f"**タスク指示:** {task.instruction}\n"
        f"**対象ファイル:** `{body.target_file}`"
        f"{plan_ctx}"
        f"{extra}\n\n"
        f"**現在のファイル内容:**\n```\n{original[:8000]}\n```\n\n"
        f"1. 変更の説明とリスク\n"
        f"2. テスト方法\n"
        f"3. 最後に正確なXML形式でpatchブロックを出力:\n\n"
        f"<patch>\n"
        f"<title>Short title (max 80 chars)</title>\n"
        f"<file>{body.target_file}</file>\n"
        f"<risk>low|medium|high</risk>\n"
        f"<explanation>変更の説明</explanation>\n"
        f"<new_content>\n"
        f"COMPLETE_FILE_CONTENT_HERE\n"
        f"</new_content>\n"
        f"</patch>"
    ))]

    task.status = "patching"
    task.updated_at = _now()
    if body.target_file not in (task.target_files or []):
        task.target_files = list(task.target_files or []) + [body.target_file]
    await db.commit()

    # --- Collect AI output BEFORE streaming to client ---
    sse_chunks: list[str] = []
    full_output = ""
    error_msg = ""
    model_used = model
    patch_id_out: str | None = None

    try:
        system = _build_system_prompt()
        model_used, gen = await stream_with_fallback(messages, model, cfg, system)
        async for chunk in gen:
            if "data: [DONE]" not in chunk:
                sse_chunks.append(chunk)
            for part in chunk.split("\n\n"):
                part = part.strip()
                if part.startswith("data: "):
                    raw = part[6:].strip()
                    if raw != "[DONE]":
                        try:
                            parsed = json.loads(raw)
                            if "content" in parsed:
                                full_output += parsed["content"]
                            elif "error" in parsed:
                                error_msg = parsed["error"]
                        except Exception:
                            pass
    except Exception as e:
        error_msg = str(e)
        sse_chunks = [f"data: {json.dumps({'error': error_msg})}\n\n"]

    # --- Parse patch and update DB ---
    if full_output:
        patch_data = parse_patch(full_output, body.target_file)
        if patch_data:
            patch = DevPatch(
                id=str(uuid.uuid4()),
                title=patch_data["title"],
                file_path=patch_data["file_path"],
                original_content=original if original not in ("(file does not exist yet)", "(cannot read)") else "",
                new_content=patch_data["new_content"],
                ai_explanation=patch_data["explanation"],
                risk_level=patch_data["risk_level"],
                status="pending",
            )
            db.add(patch)
            await db.flush()
            patch_id_out = patch.id

            task.patch_id = patch.id
            task.status = "awaiting_approval"
            _log(db, "executor_patch", f"Patch: {patch_data['title'][:60]}",
                 file_path=patch_data["file_path"], patch_id=patch.id, model_used=model_used)
        else:
            task.status = "failed"
            task.error_msg = "AI did not generate a valid <patch> block"
    else:
        task.status = "failed"
        task.error_msg = error_msg or "AI生成に失敗しました。Settings でAPIキーを確認してください。"
    task.updated_at = _now()
    await db.commit()

    async def replay():
        for chunk in sse_chunks:
            yield chunk
        if patch_id_out:
            yield f"data: {json.dumps({'patch_id': patch_id_out})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(replay(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


# ---------------------------------------------------------------------------
# Apply — requires admin + confirmed=True
# ---------------------------------------------------------------------------

@router.post("/executor/tasks/{task_id}/apply", response_model=ExecutorTaskOut)
async def apply_patch(
    task_id: str,
    body:    ExecutorApplyRequest,
    db:      AsyncSession = Depends(get_db),
    user:    User         = Depends(require_admin),
):
    """Apply the stored patch to disk. Requires admin role + confirmed=True."""
    if not body.confirmed:
        raise HTTPException(400, "confirmed=True is required to apply a patch")

    task = await _get_task_or_404(db, task_id)
    if task.status != "awaiting_approval":
        raise HTTPException(409, f"Task must be in 'awaiting_approval' status (current: {task.status})")
    if not task.patch_id:
        raise HTTPException(400, "No patch linked to this task")

    patch = (await db.execute(
        select(DevPatch).where(DevPatch.id == task.patch_id)
    )).scalars().first()
    if not patch:
        raise HTTPException(404, f"DevPatch '{task.patch_id}' not found")
    if patch.status != "pending":
        raise HTTPException(409, f"Patch is already '{patch.status}'")

    # Safety checks
    if is_protected(patch.file_path):
        raise HTTPException(403, f"'{patch.file_path}' is a protected file")

    try:
        abs_path = resolve_safe(patch.file_path)
    except ValueError as e:
        raise HTTPException(403, str(e))

    # Verify no drift since patch generation
    if abs_path.exists() and patch.original_content:
        current = abs_path.read_text(encoding="utf-8", errors="replace")
        if current != patch.original_content:
            raise HTTPException(
                409,
                "ファイルはパッチ生成後に変更されています。パッチを再生成してください。"
            )

    # Write file
    try:
        abs_path.parent.mkdir(parents=True, exist_ok=True)
        abs_path.write_text(patch.new_content, encoding="utf-8")
    except OSError as e:
        raise HTTPException(500, f"ファイル書き込みエラー: {e}")

    # Update records
    patch.status     = "applied"
    patch.applied_at = _now()
    task.status      = "applied"
    task.updated_at  = _now()
    _log(db, "executor_apply", f"Applied: {patch.title[:60]}",
         file_path=patch.file_path, patch_id=patch.id)

    from app.notify import push_notification
    await push_notification(db, "patch_applied",
                            f"[Executor] Patch applied: {patch.title}",
                            body=patch.file_path, link="/os/executor")
    await db.commit()
    await db.refresh(task)
    return _task_out(task)


# ---------------------------------------------------------------------------
# Test
# ---------------------------------------------------------------------------

@router.post("/executor/tasks/{task_id}/test", response_model=ExecutorTaskOut)
async def run_tests(
    task_id: str,
    body:    ExecutorTestRequest,
    db:      AsyncSession = Depends(get_db),
    _user:   User         = Depends(get_current_user),
):
    """Run lightweight sanity tests and generate the report."""
    task = await _get_task_or_404(db, task_id)
    if task.status not in ("applied", "testing"):
        raise HTTPException(409, f"Task must be 'applied' to run tests (current: {task.status})")
    if not task.patch_id:
        raise HTTPException(400, "No patch linked to this task")

    patch = (await db.execute(
        select(DevPatch).where(DevPatch.id == task.patch_id)
    )).scalars().first()
    if not patch:
        raise HTTPException(404, "Linked DevPatch not found")

    task.status = "testing"
    task.updated_at = _now()
    await db.commit()

    # Run tests (in-process, non-blocking)
    test_result = run_file_tests(patch.file_path, patch.new_content)

    # Generate report
    cfg = await _get_cfg(db)
    model = _resolve_model_for_task(task, cfg)
    report = generate_report(
        task_id=task.id, title=task.title,
        instruction=task.instruction, plan_content=task.plan_content,
        patch_info={
            "file_path":  patch.file_path,
            "risk_level": patch.risk_level,
            "explanation": patch.ai_explanation,
            "patch_id":   patch.id,
        },
        test_result=test_result, model_used=model,
    )

    # Update changelog and lessons in AIOS_MEMORY
    append_changelog_entry(f"Executor applied: {task.title}\n- File: {patch.file_path}\n- Status: {'✅' if test_result['ok'] else '⚠️'}")
    if not test_result["ok"]:
        append_lesson_entry(f"Executor test failed for '{task.title}'. Checks: {test_result['summary']}")

    task.test_result = test_result
    task.report      = report
    task.status      = "completed"
    task.updated_at  = _now()
    _log(db, "executor_test", f"Tests: {test_result['summary']}", patch_id=task.patch_id)
    await db.commit()
    await db.refresh(task)
    return _task_out(task)


# ---------------------------------------------------------------------------
# Rollback — admin only
# ---------------------------------------------------------------------------

@router.post("/executor/tasks/{task_id}/rollback", response_model=ExecutorTaskOut)
async def rollback_task(
    task_id: str,
    db:      AsyncSession = Depends(get_db),
    user:    User         = Depends(require_admin),
):
    """Restore the original file content. Admin only."""
    task = await _get_task_or_404(db, task_id)
    if task.status not in ("applied", "testing", "completed"):
        raise HTTPException(409, f"Can only rollback after apply (current: {task.status})")
    if not task.patch_id:
        raise HTTPException(400, "No patch to rollback")

    patch = (await db.execute(
        select(DevPatch).where(DevPatch.id == task.patch_id)
    )).scalars().first()
    if not patch:
        raise HTTPException(404, "DevPatch not found")

    if not patch.original_content:
        raise HTTPException(400, "No original content saved — cannot rollback a new-file patch")

    try:
        abs_path = resolve_safe(patch.file_path)
        abs_path.write_text(patch.original_content, encoding="utf-8")
    except Exception as e:
        raise HTTPException(500, f"Rollback failed: {e}")

    patch.status = "rejected"
    task.status  = "cancelled"
    task.error_msg = "Rolled back by admin"
    task.updated_at = _now()
    _log(db, "executor_rollback", f"Rollback: {patch.file_path}", patch_id=patch.id)
    await db.commit()
    await db.refresh(task)
    return _task_out(task)


# ---------------------------------------------------------------------------
# Cancel
# ---------------------------------------------------------------------------

@router.post("/executor/tasks/{task_id}/cancel", response_model=ExecutorTaskOut)
async def cancel_task(
    task_id: str,
    db:      AsyncSession = Depends(get_db),
    _user:   User         = Depends(get_current_user),
):
    task = await _get_task_or_404(db, task_id)
    if task.status in ("completed", "cancelled"):
        raise HTTPException(409, f"Task is already '{task.status}'")
    # If a patch exists and is pending, reject it
    if task.patch_id:
        patch = (await db.execute(
            select(DevPatch).where(DevPatch.id == task.patch_id)
        )).scalars().first()
        if patch and patch.status == "pending":
            patch.status = "rejected"
    task.status = "cancelled"
    task.updated_at = _now()
    await db.commit()
    await db.refresh(task)
    return _task_out(task)
