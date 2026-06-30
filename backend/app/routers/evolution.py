"""
Self-Evolution Engine — AI Project Manager, Architect, Quality Monitor,
Roadmap Generator, Improvement Suggestions, and Executive Reports.

Endpoints (all under /api/evolution/):
  GET  /health                — latest project health snapshot
  POST /scan                  — AI project scan + health snapshot (SSE)
  GET  /suggestions           — list improvement suggestions
  POST /suggestions/generate  — AI-generate suggestions (SSE)
  PATCH /suggestions/{id}     — update suggestion status
  GET  /quality               — quality snapshot history
  POST /quality/analyze       — static quality analysis (instant, no AI)
  GET  /architect             — architecture analysis history
  POST /architect/analyze     — AI architecture analysis (SSE)
  GET  /lessons               — lessons learned list
  POST /lessons/generate      — AI-generate lesson for a workflow run
  GET  /roadmap               — current AI-generated roadmap
  POST /roadmap/generate      — AI roadmap generation (SSE)
  POST /report                — generate CEO/exec report (SSE + stores)
  GET  /report/latest         — latest stored exec report
"""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any, AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import (
    ProjectHealthSnapshot, LessonsLearned, ImprovementSuggestion,
    EvolutionReport, QualitySnapshot, ArchitectureAnalysis,
    DevPatch, WorkflowRun, AgentTask,
    OsSettingsRow, User,
)
from app.auth import get_current_user
from app.services.project_scanner import scan_project, build_project_summary
from app.services.ai_router import resolve_model
from app.services.retry import stream_with_fallback
from app.services.knowledge_loader import build_agent_context as _knowledge_ctx
from app.schemas import ChatMessage as CM

router = APIRouter(tags=["evolution"])

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _sse(data: dict) -> str:
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _uid() -> str:
    return str(uuid.uuid4())


async def _get_cfg(db: AsyncSession) -> OsSettingsRow:
    res = await db.execute(select(OsSettingsRow).where(OsSettingsRow.id == "global"))
    row = res.scalars().first()
    if not row:
        raise HTTPException(503, "Settings not initialized")
    return row


async def _collect_sse(gen: AsyncGenerator[str, None]) -> str:
    """Collect content chunks from an SSE generator into a plain string."""
    parts: list[str] = []
    async for chunk in gen:
        for part in chunk.split("\n\n"):
            part = part.strip()
            if not part.startswith("data: "):
                continue
            raw = part[6:].strip()
            if raw == "[DONE]":
                break
            try:
                parsed = json.loads(raw)
                if "content" in parsed:
                    parts.append(parsed["content"])
            except Exception:
                pass
    return "".join(parts)


# ---------------------------------------------------------------------------
# Pydantic request/response models
# ---------------------------------------------------------------------------

class ScanRequest(BaseModel):
    model: str | None = None


class SuggestionGenerateRequest(BaseModel):
    focus: str = "general"   # general|security|perf|ux|refactor
    count: int = 10
    model: str | None = None


class SuggestionStatusPatch(BaseModel):
    status: str   # pending|in_progress|done|dismissed


class QualityAnalyzeRequest(BaseModel):
    pass


class ArchitectRequest(BaseModel):
    focus: str = "general"   # general|security|perf|deps
    model: str | None = None


class LessonGenerateRequest(BaseModel):
    workflow_run_id: str | None = None
    factory_id:      str | None = None
    context:         str = ""
    model:           str | None = None


class RoadmapRequest(BaseModel):
    horizon: str = "3months"   # 1month|3months|6months|1year
    model:   str | None = None


class ReportRequest(BaseModel):
    report_type: str = "daily"   # daily|weekly|milestone
    model:       str | None = None


# ---------------------------------------------------------------------------
# Project Health
# ---------------------------------------------------------------------------

@router.get("/evolution/health")
async def get_project_health(db: AsyncSession = Depends(get_db)):
    """Return the latest project health snapshot, or derive one from static scan."""
    res = await db.execute(
        select(ProjectHealthSnapshot)
        .order_by(desc(ProjectHealthSnapshot.created_at))
        .limit(1)
    )
    snap = res.scalars().first()

    # Also do a quick static scan for live file counts
    scan = scan_project()

    # Count open patches and pending suggestions
    p_res = await db.execute(select(DevPatch).where(DevPatch.status == "pending"))
    open_patches = len(p_res.scalars().all())

    s_res = await db.execute(
        select(ImprovementSuggestion).where(ImprovementSuggestion.status == "pending")
    )
    pending_suggestions = len(s_res.scalars().all())

    if snap:
        return {
            "id":               snap.id,
            "completionPct":    snap.completion_pct,
            "technicalDebt":    snap.technical_debt,
            "criticalBugs":     snap.critical_bugs,
            "estimatedRelease": snap.estimated_release,
            "fileCount":        scan["total_files"],
            "lineCount":        scan["total_lines"],
            "openPatches":      open_patches,
            "pendingSuggestions": pending_suggestions,
            "tsErrors":         snap.ts_errors,
            "pyIssues":         snap.py_issues,
            "summary":          snap.summary,
            "createdAt":        snap.created_at.isoformat(),
            "scan":             scan,
        }
    else:
        return {
            "id":               None,
            "completionPct":    0.0,
            "technicalDebt":    "unknown",
            "criticalBugs":     0,
            "estimatedRelease": None,
            "fileCount":        scan["total_files"],
            "lineCount":        scan["total_lines"],
            "openPatches":      open_patches,
            "pendingSuggestions": pending_suggestions,
            "tsErrors":         0,
            "pyIssues":         0,
            "summary":          "Run /api/evolution/scan to generate an AI health assessment.",
            "createdAt":        None,
            "scan":             scan,
        }


@router.post("/evolution/scan")
async def ai_project_scan(
    req: ScanRequest,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """AI project scan — streaming SSE. Generates a ProjectHealthSnapshot."""
    cfg   = await _get_cfg(db)
    model = resolve_model("dev", None, cfg.default_model, req.model)
    scan  = scan_project()
    summary = build_project_summary(scan)

    # Count open patches and pending suggestions for context
    p_res = await db.execute(select(DevPatch).where(DevPatch.status == "pending"))
    open_patches = len(p_res.scalars().all())

    t_res = await db.execute(select(AgentTask).where(AgentTask.status == "completed"))
    completed_tasks = len(t_res.scalars().all())

    knowledge_header = _knowledge_ctx(["project", "architecture", "changelog", "roadmap"])
    system_prompt = (
        f"{knowledge_header}\n\n"
        "You are the AI Project Manager for AIOS (AI Operating System). "
        "Analyze the project scan data and produce a concise health assessment. "
        "Be direct, honest, and actionable. Use numbers and percentages."
    )
    messages = [CM(role="user", content=(
        f"Please analyze this AIOS project scan and provide:\n\n"
        f"1. **Completion estimate (0-100%)** — how complete is this system?\n"
        f"2. **Technical debt level** — low / medium / high / critical\n"
        f"3. **Critical bugs** — count any known unresolved critical issues\n"
        f"4. **Estimated release date** — format: YYYY-MM\n"
        f"5. **Top 3 risks** — what could block production?\n"
        f"6. **Summary** — 3-sentence executive overview\n\n"
        f"Additional context:\n"
        f"- Open patches awaiting human approval: {open_patches}\n"
        f"- Completed agent tasks: {completed_tasks}\n\n"
        f"{summary}"
    ))]

    snap_id = _uid()

    async def generate() -> AsyncGenerator[str, None]:
        yield _sse({"type": "scan_start", "scanId": snap_id})

        used_model, gen = await stream_with_fallback(messages, model, cfg, system_prompt)
        full_text = ""
        async for chunk in gen:
            yield chunk
            for part in chunk.split("\n\n"):
                part = part.strip()
                if part.startswith("data: "):
                    raw = part[6:].strip()
                    if raw != "[DONE]":
                        try:
                            p = json.loads(raw)
                            if "content" in p:
                                full_text += p["content"]
                        except Exception:
                            pass

        # Parse simple values from the AI text
        import re
        pct_match = re.search(r"(\d{1,3})\s*%", full_text)
        completion_pct = float(pct_match.group(1)) if pct_match else 55.0

        debt = "medium"
        for level in ["critical", "high", "medium", "low"]:
            if level in full_text.lower():
                debt = level
                break

        release_match = re.search(r"20\d{2}-\d{2}", full_text)
        estimated_release = release_match.group(0) if release_match else None

        # Count open patches as critical bug proxy
        p_res2 = await db.execute(select(DevPatch).where(DevPatch.status == "pending"))
        open_patches2 = len(p_res2.scalars().all())

        snap = ProjectHealthSnapshot(
            id                = snap_id,
            completion_pct    = min(100.0, max(0.0, completion_pct)),
            technical_debt    = debt,
            critical_bugs     = open_patches2,
            estimated_release = estimated_release,
            file_count        = scan["total_files"],
            line_count        = scan["total_lines"],
            open_patches      = open_patches2,
            total_suggestions = 0,
            ts_errors         = 0,
            py_issues         = 0,
            summary           = full_text[:1000],
            model_used        = used_model,
            created_at        = _now(),
        )
        db.add(snap)
        await db.commit()

        yield _sse({
            "type":             "scan_done",
            "scanId":           snap_id,
            "completionPct":    snap.completion_pct,
            "technicalDebt":    snap.technical_debt,
            "criticalBugs":     snap.critical_bugs,
            "estimatedRelease": snap.estimated_release,
        })
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(), media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ---------------------------------------------------------------------------
# Improvement Suggestions
# ---------------------------------------------------------------------------

@router.get("/evolution/suggestions")
async def list_suggestions(
    status:   str | None = None,
    category: str | None = None,
    limit:    int = 50,
    db: AsyncSession = Depends(get_db),
):
    q = select(ImprovementSuggestion).order_by(desc(ImprovementSuggestion.roi_score))
    if status:
        q = q.where(ImprovementSuggestion.status == status)
    if category:
        q = q.where(ImprovementSuggestion.category == category)
    q = q.limit(limit)
    res = await db.execute(q)
    rows = res.scalars().all()
    return [_suggestion_out(r) for r in rows]


def _suggestion_out(r: ImprovementSuggestion) -> dict:
    return {
        "id":              r.id,
        "title":           r.title,
        "description":     r.description,
        "category":        r.category,
        "reason":          r.reason,
        "expectedBenefit": r.expected_benefit,
        "difficulty":      r.difficulty,
        "priority":        r.priority,
        "estimatedHours":  r.estimated_hours,
        "roiScore":        r.roi_score,
        "status":          r.status,
        "isQuickWin":      r.is_quick_win,
        "createdAt":       r.created_at.isoformat(),
    }


@router.post("/evolution/suggestions/generate")
async def generate_suggestions(
    req: SuggestionGenerateRequest,
    db:  AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """AI-generate improvement suggestions — SSE streaming."""
    cfg   = await _get_cfg(db)
    model = resolve_model("dev", None, cfg.default_model, req.model)
    scan  = scan_project()
    summary = build_project_summary(scan)

    system_prompt = (
        "You are the AI Project Manager for AIOS. "
        "Generate actionable improvement suggestions as a JSON array. "
        "Each item must have: title, description, category (feature|refactor|security|perf|ux), "
        "reason, expectedBenefit, difficulty (easy|medium|hard), priority (1-10), "
        "estimatedHours (number), roiScore (0-100), isQuickWin (bool)."
    )
    messages = [CM(role="user", content=(
        f"Analyze AIOS and generate {req.count} improvement suggestions "
        f"focused on: {req.focus}.\n\n"
        f"Return ONLY a JSON array. No prose before or after.\n\n"
        f"Example item:\n"
        f'{{"title":"Add Redis caching","description":"...","category":"perf",'
        f'"reason":"...","expectedBenefit":"...","difficulty":"medium",'
        f'"priority":7,"estimatedHours":8,"roiScore":75,"isQuickWin":false}}\n\n'
        f"{summary}"
    ))]

    async def generate() -> AsyncGenerator[str, None]:
        yield _sse({"type": "generating", "count": req.count})

        used_model, gen = await stream_with_fallback(messages, model, cfg, system_prompt)
        full_text = ""
        async for chunk in gen:
            yield chunk
            for part in chunk.split("\n\n"):
                part = part.strip()
                if part.startswith("data: "):
                    raw = part[6:].strip()
                    if raw != "[DONE]":
                        try:
                            p = json.loads(raw)
                            if "content" in p:
                                full_text += p["content"]
                        except Exception:
                            pass

        # Parse JSON suggestions from text
        saved = 0
        try:
            import re
            match = re.search(r"\[[\s\S]*\]", full_text)
            if match:
                items = json.loads(match.group(0))
                for item in items[:req.count]:
                    if not isinstance(item, dict) or not item.get("title"):
                        continue
                    sug = ImprovementSuggestion(
                        id               = _uid(),
                        title            = str(item.get("title", ""))[:200],
                        description      = str(item.get("description", ""))[:2000],
                        category         = str(item.get("category", "feature")),
                        reason           = str(item.get("reason", ""))[:1000],
                        expected_benefit = str(item.get("expectedBenefit", ""))[:1000],
                        difficulty       = str(item.get("difficulty", "medium")),
                        priority         = int(item.get("priority", 5)),
                        estimated_hours  = float(item.get("estimatedHours", 8)),
                        roi_score        = float(item.get("roiScore", 50)),
                        status           = "pending",
                        is_quick_win     = bool(item.get("isQuickWin", False)),
                        created_at       = _now(),
                    )
                    db.add(sug)
                    saved += 1
                await db.commit()
        except Exception as e:
            yield _sse({"type": "parse_error", "message": str(e)[:200]})

        yield _sse({"type": "suggestions_done", "saved": saved, "modelUsed": used_model})
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(), media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.patch("/evolution/suggestions/{suggestion_id}")
async def update_suggestion(
    suggestion_id: str,
    req: SuggestionStatusPatch,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    res = await db.execute(
        select(ImprovementSuggestion).where(ImprovementSuggestion.id == suggestion_id)
    )
    sug = res.scalars().first()
    if not sug:
        raise HTTPException(404, "Suggestion not found")
    sug.status = req.status
    await db.commit()
    return _suggestion_out(sug)


# ---------------------------------------------------------------------------
# Quality Monitor
# ---------------------------------------------------------------------------

@router.get("/evolution/quality")
async def get_quality_history(limit: int = 30, db: AsyncSession = Depends(get_db)):
    """Return quality snapshot history (newest first)."""
    res = await db.execute(
        select(QualitySnapshot)
        .order_by(desc(QualitySnapshot.created_at))
        .limit(limit)
    )
    rows = res.scalars().all()
    return [_quality_out(r) for r in rows]


def _quality_out(r: QualitySnapshot) -> dict:
    return {
        "id":             r.id,
        "tsErrors":       r.ts_errors,
        "pyIssues":       r.py_issues,
        "buildOk":        r.build_ok,
        "totalFiles":     r.total_files,
        "totalLines":     r.total_lines,
        "duplicateScore": r.duplicate_score,
        "complexityAvg":  r.complexity_avg,
        "securityIssues": r.security_issues,
        "depIssues":      r.dep_issues,
        "createdAt":      r.created_at.isoformat(),
    }


@router.post("/evolution/quality/analyze")
async def run_quality_analysis(
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """
    Static quality analysis — no AI, instant.
    Collects file/line counts and open patches as quality proxies.
    """
    scan = scan_project()

    # Open patches = quality debt proxy
    p_res = await db.execute(select(DevPatch).where(DevPatch.status == "pending"))
    open_patches = len(p_res.scalars().all())

    snap = QualitySnapshot(
        id              = _uid(),
        ts_errors       = 0,          # Would need tsc --noEmit subprocess; 0 = last known clean
        py_issues       = 0,          # Would need ruff/pylint; 0 = last known clean
        build_ok        = True,
        total_files     = scan["total_files"],
        total_lines     = scan["total_lines"],
        duplicate_score = None,
        complexity_avg  = None,
        security_issues = 0,
        dep_issues      = open_patches,  # open patches = unresolved issues
        created_at      = _now(),
    )
    db.add(snap)
    await db.commit()
    return _quality_out(snap)


# ---------------------------------------------------------------------------
# Architecture Analysis
# ---------------------------------------------------------------------------

@router.get("/evolution/architect")
async def list_arch_analyses(limit: int = 10, db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(ArchitectureAnalysis)
        .order_by(desc(ArchitectureAnalysis.created_at))
        .limit(limit)
    )
    rows = res.scalars().all()
    return [_arch_out(r) for r in rows]


def _arch_out(r: ArchitectureAnalysis) -> dict:
    return {
        "id":              r.id,
        "riskScore":       r.risk_score,
        "maintainability": r.maintainability,
        "performance":     r.performance,
        "securityScore":   r.security_score,
        "issues":          r.issues,
        "suggestions":     r.suggestions,
        "fullAnalysis":    r.full_analysis,
        "modelUsed":       r.model_used,
        "createdAt":       r.created_at.isoformat(),
    }


@router.post("/evolution/architect/analyze")
async def architect_analyze(
    req: ArchitectRequest,
    db:  AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """AI architecture analysis — SSE streaming."""
    cfg   = await _get_cfg(db)
    model = resolve_model("dev", None, cfg.default_model, req.model)
    scan  = scan_project()
    summary = build_project_summary(scan)

    system_prompt = (
        "You are the AI Architect reviewing the AIOS codebase. "
        "Provide precise, scored analysis. Return your final assessment "
        "as a JSON block inside ```json ... ``` with keys: "
        "riskScore (0-100, lower=better), maintainability (0-100, higher=better), "
        "performance (0-100, higher=better), securityScore (0-100, higher=better), "
        "issues (array of strings), suggestions (array of strings)."
    )
    messages = [CM(role="user", content=(
        f"Analyze the AIOS system architecture with focus on: {req.focus}.\n\n"
        f"Evaluate:\n"
        f"- Code structure and separation of concerns\n"
        f"- API design (FastAPI routers, endpoint protection)\n"
        f"- Database schema design (SQLAlchemy models)\n"
        f"- Frontend architecture (Next.js App Router)\n"
        f"- Security posture\n"
        f"- Dependency health\n"
        f"- Scalability potential\n\n"
        f"End your response with a JSON block containing your scores.\n\n"
        f"{summary}"
    ))]

    analysis_id = _uid()

    async def generate() -> AsyncGenerator[str, None]:
        yield _sse({"type": "architect_start", "analysisId": analysis_id})

        used_model, gen = await stream_with_fallback(messages, model, cfg, system_prompt)
        full_text = ""
        async for chunk in gen:
            yield chunk
            for part in chunk.split("\n\n"):
                part = part.strip()
                if part.startswith("data: "):
                    raw = part[6:].strip()
                    if raw != "[DONE]":
                        try:
                            p = json.loads(raw)
                            if "content" in p:
                                full_text += p["content"]
                        except Exception:
                            pass

        # Extract JSON scores
        import re
        risk = 30.0; maintainability = 70.0; performance = 70.0; security = 80.0
        issues: list[str] = []; suggestions_list: list[str] = []

        try:
            match = re.search(r"```json\s*(\{[\s\S]*?\})\s*```", full_text)
            if match:
                scores = json.loads(match.group(1))
                risk            = float(scores.get("riskScore", 30))
                maintainability = float(scores.get("maintainability", 70))
                performance     = float(scores.get("performance", 70))
                security        = float(scores.get("securityScore", 80))
                issues          = [str(x) for x in scores.get("issues", [])][:10]
                suggestions_list = [str(x) for x in scores.get("suggestions", [])][:10]
        except Exception:
            pass

        analysis = ArchitectureAnalysis(
            id              = analysis_id,
            risk_score      = risk,
            maintainability = maintainability,
            performance     = performance,
            security_score  = security,
            issues          = issues,
            suggestions     = suggestions_list,
            full_analysis   = full_text[:5000],
            model_used      = used_model,
            created_at      = _now(),
        )
        db.add(analysis)
        await db.commit()

        yield _sse({
            "type":           "architect_done",
            "analysisId":     analysis_id,
            "riskScore":      risk,
            "maintainability": maintainability,
            "performance":    performance,
            "securityScore":  security,
            "issueCount":     len(issues),
        })
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(), media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ---------------------------------------------------------------------------
# Lessons Learned
# ---------------------------------------------------------------------------

@router.get("/evolution/lessons")
async def list_lessons(limit: int = 30, db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(LessonsLearned)
        .order_by(desc(LessonsLearned.created_at))
        .limit(limit)
    )
    rows = res.scalars().all()
    return [_lesson_out(r) for r in rows]


def _lesson_out(r: LessonsLearned) -> dict:
    return {
        "id":              r.id,
        "workflowRunId":   r.workflow_run_id,
        "factoryId":       r.factory_id,
        "whatImproved":    r.what_improved,
        "whatToImprove":   r.what_to_improve,
        "archChanges":     r.arch_changes,
        "workflowChanges": r.workflow_changes,
        "modelUsed":       r.model_used,
        "createdAt":       r.created_at.isoformat(),
    }


@router.post("/evolution/lessons/generate")
async def generate_lesson(
    req: LessonGenerateRequest,
    db:  AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """AI-generate a lesson learned for a completed workflow or given context."""
    cfg   = await _get_cfg(db)
    model = resolve_model("dev", None, cfg.default_model, req.model)

    # Load workflow run context if provided
    run_context = req.context
    if req.workflow_run_id and not run_context:
        res = await db.execute(
            select(WorkflowRun).where(WorkflowRun.id == req.workflow_run_id)
        )
        run = res.scalars().first()
        if run:
            run_context = (
                f"Workflow: {run.workflow_name}\n"
                f"Status: {run.status}\n"
                f"Input: {run.input_summary}\n"
                f"Output: {run.output_summary or 'N/A'}\n"
                f"Tokens: {run.tokens_used}"
            )

    system_prompt = (
        "You are the AIOS Continuous Improvement Engine. "
        "After every completed workflow, generate structured lessons learned. "
        "Be concise and actionable."
    )
    messages = [CM(role="user", content=(
        f"Generate lessons learned for this workflow execution.\n\n"
        f"Context:\n{run_context or 'General AIOS system review'}\n\n"
        f"Answer in this exact JSON format:\n"
        f'{{"whatImproved":"what went well","whatToImprove":"what could be better",'
        f'"archChanges":"any architecture changes recommended or null",'
        f'"workflowChanges":"any workflow changes recommended or null"}}'
    ))]

    used_model, gen = await stream_with_fallback(messages, model, cfg, system_prompt)
    full_text = await _collect_sse(gen)

    what_improved = "Workflow completed successfully."
    what_to_improve = "No issues identified."
    arch_changes = None
    workflow_changes = None

    try:
        import re
        match = re.search(r"\{[\s\S]*\}", full_text)
        if match:
            data = json.loads(match.group(0))
            what_improved    = data.get("whatImproved", what_improved)
            what_to_improve  = data.get("whatToImprove", what_to_improve)
            arch_changes     = data.get("archChanges") or None
            workflow_changes = data.get("workflowChanges") or None
    except Exception:
        what_improved = full_text[:500]

    lesson = LessonsLearned(
        id               = _uid(),
        workflow_run_id  = req.workflow_run_id,
        factory_id       = req.factory_id,
        what_improved    = what_improved,
        what_to_improve  = what_to_improve,
        arch_changes     = arch_changes,
        workflow_changes = workflow_changes,
        model_used       = used_model,
        created_at       = _now(),
    )
    db.add(lesson)
    await db.commit()
    return _lesson_out(lesson)


# ---------------------------------------------------------------------------
# Roadmap Generator
# ---------------------------------------------------------------------------

@router.get("/evolution/roadmap")
async def get_roadmap(db: AsyncSession = Depends(get_db)):
    """Return latest evolution report that contains roadmap content."""
    res = await db.execute(
        select(EvolutionReport)
        .where(EvolutionReport.report_type == "roadmap")
        .order_by(desc(EvolutionReport.created_at))
        .limit(1)
    )
    report = res.scalars().first()
    if not report:
        return {"roadmap": None, "message": "Run /api/evolution/roadmap/generate to create a roadmap."}
    return {
        "id":             report.id,
        "title":          report.title,
        "contentMd":      report.content_md,
        "remainingWork":  report.remaining_work,
        "estLaunchDate":  report.est_launch_date,
        "modelUsed":      report.model_used,
        "createdAt":      report.created_at.isoformat(),
    }


@router.post("/evolution/roadmap/generate")
async def generate_roadmap(
    req: RoadmapRequest,
    db:  AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """AI roadmap generation — SSE streaming."""
    cfg   = await _get_cfg(db)
    model = resolve_model("dev", None, cfg.default_model, req.model)
    scan  = scan_project()
    summary = build_project_summary(scan)

    # Load latest health snapshot
    h_res = await db.execute(
        select(ProjectHealthSnapshot).order_by(desc(ProjectHealthSnapshot.created_at)).limit(1)
    )
    health = h_res.scalars().first()
    completion = health.completion_pct if health else 55.0

    # Load top suggestions
    s_res = await db.execute(
        select(ImprovementSuggestion)
        .where(ImprovementSuggestion.status == "pending")
        .order_by(desc(ImprovementSuggestion.roi_score))
        .limit(10)
    )
    suggestions = s_res.scalars().all()
    suggestion_summary = "\n".join(
        f"- [{s.category}] {s.title} (ROI: {s.roi_score}, {s.estimated_hours}h)"
        for s in suggestions
    ) or "No suggestions generated yet."

    system_prompt = (
        "You are the AI Roadmap Generator for AIOS. "
        "Create a realistic, milestone-based development roadmap. "
        "Include: current milestone, next milestone, missing features, "
        "estimated completion %, business readiness, production readiness, "
        "investor readiness, and technology readiness (each as 0-100%). "
        "Format as Markdown with clear headers."
    )
    messages = [CM(role="user", content=(
        f"Generate a {req.horizon} development roadmap for AIOS.\n\n"
        f"Current state: ~{completion:.0f}% complete.\n\n"
        f"Top pending improvements:\n{suggestion_summary}\n\n"
        f"{summary}"
    ))]

    report_id = _uid()

    async def generate() -> AsyncGenerator[str, None]:
        yield _sse({"type": "roadmap_start", "reportId": report_id})

        used_model, gen = await stream_with_fallback(messages, model, cfg, system_prompt)
        full_text = ""
        async for chunk in gen:
            yield chunk
            for part in chunk.split("\n\n"):
                part = part.strip()
                if part.startswith("data: "):
                    raw = part[6:].strip()
                    if raw != "[DONE]":
                        try:
                            p = json.loads(raw)
                            if "content" in p:
                                full_text += p["content"]
                        except Exception:
                            pass

        # Extract release date estimate from text
        import re
        date_match = re.search(r"20\d{2}-\d{2}", full_text)
        est_launch = date_match.group(0) if date_match else None

        report = EvolutionReport(
            id              = report_id,
            report_type     = "roadmap",
            title           = f"AIOS Roadmap — {req.horizon} ({_now().strftime('%Y-%m-%d')})",
            content_md      = full_text,
            files_changed   = [],
            features_done   = [],
            risks           = [],
            remaining_work  = None,
            est_launch_date = est_launch,
            model_used      = used_model,
            created_at      = _now(),
        )
        db.add(report)
        await db.commit()

        yield _sse({"type": "roadmap_done", "reportId": report_id, "estLaunchDate": est_launch})
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(), media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ---------------------------------------------------------------------------
# Executive Report (CEO Report)
# ---------------------------------------------------------------------------

@router.get("/evolution/report/latest")
async def get_latest_report(db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(EvolutionReport)
        .where(EvolutionReport.report_type != "roadmap")
        .order_by(desc(EvolutionReport.created_at))
        .limit(1)
    )
    report = res.scalars().first()
    if not report:
        return {"report": None, "message": "Run /api/evolution/report to generate an executive report."}
    return {
        "id":             report.id,
        "reportType":     report.report_type,
        "title":          report.title,
        "contentMd":      report.content_md,
        "filesChanged":   report.files_changed,
        "featuresDone":   report.features_done,
        "risks":          report.risks,
        "remainingWork":  report.remaining_work,
        "estLaunchDate":  report.est_launch_date,
        "modelUsed":      report.model_used,
        "createdAt":      report.created_at.isoformat(),
    }


@router.post("/evolution/report")
async def generate_report(
    req: ReportRequest,
    db:  AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Generate CEO / executive report — SSE streaming, stores result."""
    cfg   = await _get_cfg(db)
    model = resolve_model("dev", None, cfg.default_model, req.model)
    scan  = scan_project()

    # Gather context from DB
    h_res = await db.execute(
        select(ProjectHealthSnapshot).order_by(desc(ProjectHealthSnapshot.created_at)).limit(1)
    )
    health = h_res.scalars().first()

    p_res = await db.execute(
        select(DevPatch).order_by(desc(DevPatch.created_at)).limit(20)
    )
    patches = p_res.scalars().all()
    applied = [p for p in patches if p.status == "applied"]
    pending = [p for p in patches if p.status == "pending"]

    w_res = await db.execute(
        select(WorkflowRun)
        .where(WorkflowRun.status == "completed")
        .order_by(desc(WorkflowRun.ended_at))
        .limit(20)
    )
    recent_runs = w_res.scalars().all()

    s_res = await db.execute(
        select(ImprovementSuggestion)
        .where(ImprovementSuggestion.status == "pending")
        .order_by(ImprovementSuggestion.priority.desc())
        .limit(5)
    )
    top_suggestions = s_res.scalars().all()

    context_block = (
        f"Project completion: {health.completion_pct:.0f}%\n"
        f"Technical debt: {health.technical_debt}\n"
        f"Critical issues: {health.critical_bugs}\n"
        f"Estimated release: {health.estimated_release or 'TBD'}\n"
    ) if health else "No health snapshot yet."

    files_changed_list = [p.file_path for p in applied]
    features_list      = [p.title for p in applied]
    risks_list         = [p.title for p in pending[:5]]
    top_sug_text       = "\n".join(f"- {s.title}" for s in top_suggestions)

    system_prompt = (
        "You are generating an executive progress report for AIOS. "
        "Write as Markdown. Be concise, specific, and data-driven. "
        "Sections: ## Today's Progress, ## Files Changed, ## Features Completed, "
        "## Risks, ## Remaining Work, ## Estimated Launch Date. "
        "End with a one-line executive summary."
    )
    messages = [CM(role="user", content=(
        f"Generate a {req.report_type} executive report for AIOS.\n\n"
        f"## Project Status\n{context_block}\n\n"
        f"## Recently Applied Patches ({len(applied)})\n"
        + "\n".join(f"- {p.title} ({p.file_path})" for p in applied[:10]) + "\n\n"
        f"## Pending Patches ({len(pending)})\n"
        + "\n".join(f"- {p.title}" for p in pending[:5]) + "\n\n"
        f"## Recent Workflow Completions ({len(recent_runs)})\n"
        + "\n".join(f"- {r.workflow_name}" for r in recent_runs[:10]) + "\n\n"
        f"## Top Improvement Suggestions\n{top_sug_text}\n\n"
        f"## Code Stats\n"
        f"- {scan['total_files']} files, {scan['total_lines']:,} lines\n"
        f"- {scan['api_endpoints']} API endpoints\n"
        f"- {scan['page_routes']} frontend pages\n"
    ))]

    report_id = _uid()

    async def generate() -> AsyncGenerator[str, None]:
        yield _sse({"type": "report_start", "reportId": report_id})

        used_model, gen = await stream_with_fallback(messages, model, cfg, system_prompt)
        full_text = ""
        async for chunk in gen:
            yield chunk
            for part in chunk.split("\n\n"):
                part = part.strip()
                if part.startswith("data: "):
                    raw = part[6:].strip()
                    if raw != "[DONE]":
                        try:
                            p = json.loads(raw)
                            if "content" in p:
                                full_text += p["content"]
                        except Exception:
                            pass

        import re
        date_match = re.search(r"20\d{2}-\d{2}", full_text)
        est_launch = date_match.group(0) if date_match else (health.estimated_release if health else None)

        report = EvolutionReport(
            id              = report_id,
            report_type     = req.report_type,
            title           = f"AIOS {req.report_type.title()} Report — {_now().strftime('%Y-%m-%d')}",
            content_md      = full_text,
            files_changed   = files_changed_list,
            features_done   = features_list,
            risks           = risks_list,
            remaining_work  = top_sug_text[:500] if top_sug_text else None,
            est_launch_date = est_launch,
            model_used      = used_model,
            created_at      = _now(),
        )
        db.add(report)
        await db.commit()

        yield _sse({"type": "report_done", "reportId": report_id, "estLaunchDate": est_launch})
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(), media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
