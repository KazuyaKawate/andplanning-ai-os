"""
Workflow run lifecycle endpoints.

POST /api/workflows/{id}/runs           → start
GET  /api/workflow-runs                 → list
GET  /api/runs/{run_id}                 → detail / poll
POST /api/runs/{run_id}/pause
POST /api/runs/{run_id}/resume
POST /api/runs/{run_id}/stop

Also aliases for the user-facing paths:
POST /api/workflows/{id}/run    (alias for /runs)
POST /api/workflows/{id}/pause  (alias by workflowId)
POST /api/workflows/{id}/resume
POST /api/workflows/{id}/stop
"""
from __future__ import annotations

import asyncio
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db, AsyncSessionLocal
from app.models import Workflow, WorkflowRun, Factory, ActivityItem, OsSettingsRow
from app.schemas import (
    StartRunRequest, StartRunResponse, RunControlResponse, WorkflowRunOut, WorkflowStep,
)
from app.services.ai_router import resolve_model, provider_for
from app.services.openai_svc import stream_openai
from app.services.anthropic_svc import stream_anthropic
from app.services.gemini_svc import stream_gemini

router = APIRouter(tags=["runs"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _run_out(r: WorkflowRun) -> WorkflowRunOut:
    steps = [WorkflowStep(**s) for s in (r.steps or [])]
    return WorkflowRunOut(
        id=r.id, workflowId=r.workflow_id, factoryId=r.factory_id,
        workflowName=r.workflow_name, status=r.status, model=r.model,
        startedAt=r.started_at.isoformat(),
        endedAt=r.ended_at.isoformat() if r.ended_at else None,
        inputSummary=r.input_summary,
        outputSummary=r.output_summary,
        tokensUsed=r.tokens_used,
        steps=steps,
    )


async def _get_settings_row(db: AsyncSession) -> OsSettingsRow:
    res = await db.execute(select(OsSettingsRow).where(OsSettingsRow.id == "global"))
    row = res.scalars().first()
    return row or OsSettingsRow(id="global", default_model="gpt-4o-mini", api_key_openai="", api_key_anthropic="", api_key_google="")


# ---------------------------------------------------------------------------
# Background: run a workflow by calling the AI provider
# ---------------------------------------------------------------------------

async def _execute_run(run_id: str) -> None:
    """Call the appropriate AI provider and update the run record."""
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(WorkflowRun).where(WorkflowRun.id == run_id))
        run = res.scalars().first()
        if not run:
            return

        # Check still running (not paused/stopped)
        if run.status != "running":
            return

        wf_res = await db.execute(select(Workflow).where(Workflow.id == run.workflow_id))
        wf = wf_res.scalars().first()

        fac_res = await db.execute(select(Factory).where(Factory.id == run.factory_id))
        fac = fac_res.scalars().first()

        cfg = await _get_settings_row(db)

        model = resolve_model(
            factory_id=run.factory_id,
            factory_preferred_model=fac.preferred_model if fac else None,
            os_default_model=cfg.default_model,
        )
        provider = provider_for(model)

        # Build a single prompt from the workflow description + inputs
        system = fac.system_prompt if fac else ""
        user_content = f"ワークフロー: {run.workflow_name}\n\n入力:\n"
        for k, v in (run.inputs or {}).items():
            user_content += f"- {k}: {v}\n"
        if wf:
            user_content += f"\n{wf.description}"

        from app.schemas import ChatMessage
        messages = [ChatMessage(role="user", content=user_content)]

        # Collect streamed output
        output_parts: list[str] = []
        total_tokens = 0

        try:
            if provider == "anthropic":
                gen = stream_anthropic(messages, model, cfg.api_key_anthropic, system_prompt=system)
            elif provider == "google":
                gen = stream_gemini(messages, model, cfg.api_key_google)
            else:
                gen = stream_openai(messages, model, cfg.api_key_openai)

            import json as _json
            async for chunk in gen:
                if chunk.startswith("data: "):
                    raw = chunk[6:].strip()
                    if raw == "[DONE]":
                        break
                    try:
                        parsed = _json.loads(raw)
                        if "content" in parsed:
                            output_parts.append(parsed["content"])
                        elif "error" in parsed:
                            run.status = "failed"
                            await db.commit()
                            return
                    except Exception:
                        pass

            output = "".join(output_parts)
            total_tokens = max(100, len(output) // 4)

            # Mark steps done
            steps = run.steps or []
            for s in steps:
                s["status"] = "done"

            run.status        = "completed"
            run.ended_at      = datetime.now(timezone.utc)
            run.output_summary = output[:500] if output else "(出力なし)"
            run.tokens_used   = total_tokens
            run.steps         = steps
            run.model         = model

            # Update workflow stats
            if wf:
                wf.total_runs  += 1
                wf.last_run_at  = datetime.now(timezone.utc)
                completed_res   = await db.execute(
                    select(WorkflowRun)
                    .where(WorkflowRun.workflow_id == wf.id, WorkflowRun.status == "completed")
                )
                completed = completed_res.scalars().all()
                wf.success_rate = round(len(completed) / max(1, wf.total_runs) * 100, 1)

            # Log activity
            db.add(ActivityItem(
                id=str(uuid.uuid4()),
                type="run_complete",
                factory_id=run.factory_id,
                factory_name=fac.name_ja if fac else run.factory_id,
                factory_icon=fac.icon if fac else "🏭",
                message=f"{run.workflow_name} 完了",
                detail=f"{total_tokens:,} tokens",
            ))

            await db.commit()

        except Exception:  # noqa: BLE001
            run.status = "failed"
            run.ended_at = datetime.now(timezone.utc)
            await db.commit()


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/workflow-runs", response_model=list[WorkflowRunOut])
async def list_runs(
    limit:     int       = 20,
    factoryId: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    q = select(WorkflowRun).order_by(WorkflowRun.started_at.desc())
    if factoryId:
        q = q.where(WorkflowRun.factory_id == factoryId)
    result = await db.execute(q.limit(limit))
    return [_run_out(r) for r in result.scalars().all()]


@router.post("/workflows/{workflow_id}/runs", response_model=StartRunResponse)
async def start_run(
    workflow_id: str,
    req:         StartRunRequest,
    background:  BackgroundTasks,
    db:          AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Workflow).where(Workflow.id == workflow_id))
    wf = res.scalars().first()
    if not wf:
        raise HTTPException(404, f"Workflow not found: {workflow_id}")

    # Build initial steps from workflow step_count
    steps = [
        {"id": f"s{i+1}", "name": f"Step {i+1}", "status": "pending", "durationMs": None}
        for i in range(wf.step_count)
    ]
    if steps:
        steps[0]["status"] = "running"

    # Summarize inputs
    input_summary = " / ".join(f"{k}: {v}" for k, v in req.inputs.items()) or "—"

    run = WorkflowRun(
        id=str(uuid.uuid4()),
        workflow_id=workflow_id,
        factory_id=wf.factory_id,
        workflow_name=wf.name_ja,
        status="running",
        model="",  # filled by _execute_run
        input_summary=input_summary,
        inputs=req.inputs,
        steps=steps,
    )
    db.add(run)
    await db.commit()
    await db.refresh(run)

    background.add_task(_execute_run, run.id)
    return StartRunResponse(runId=run.id, status="running")


# Alias: POST /api/workflows/{id}/run
@router.post("/workflows/{workflow_id}/run", response_model=StartRunResponse)
async def start_run_alias(
    workflow_id: str, req: StartRunRequest,
    background: BackgroundTasks, db: AsyncSession = Depends(get_db),
):
    return await start_run(workflow_id, req, background, db)


@router.get("/runs/{run_id}", response_model=WorkflowRunOut)
async def get_run(run_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(WorkflowRun).where(WorkflowRun.id == run_id))
    r = result.scalars().first()
    if not r:
        raise HTTPException(404, f"Run not found: {run_id}")
    return _run_out(r)


@router.post("/runs/{run_id}/pause", response_model=RunControlResponse)
async def pause_run(run_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(WorkflowRun).where(WorkflowRun.id == run_id))
    r = result.scalars().first()
    if not r:
        raise HTTPException(404, f"Run not found: {run_id}")
    if r.status == "running":
        r.status = "paused"
        await db.commit()
    return RunControlResponse()


@router.post("/runs/{run_id}/resume", response_model=RunControlResponse)
async def resume_run(run_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(WorkflowRun).where(WorkflowRun.id == run_id))
    r = result.scalars().first()
    if not r:
        raise HTTPException(404, f"Run not found: {run_id}")
    if r.status == "paused":
        r.status = "running"
        await db.commit()
    return RunControlResponse()


@router.post("/runs/{run_id}/stop", response_model=RunControlResponse)
async def stop_run(run_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(WorkflowRun).where(WorkflowRun.id == run_id))
    r = result.scalars().first()
    if not r:
        raise HTTPException(404, f"Run not found: {run_id}")
    if r.status in ("running", "paused"):
        r.status   = "failed"
        r.ended_at = datetime.now(timezone.utc)
        await db.commit()
    return RunControlResponse()


# Aliases: /api/workflows/{id}/pause|resume|stop
@router.post("/workflows/{workflow_id}/pause", response_model=RunControlResponse)
async def pause_by_workflow(workflow_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(WorkflowRun)
        .where(WorkflowRun.workflow_id == workflow_id, WorkflowRun.status == "running")
        .order_by(WorkflowRun.started_at.desc()).limit(1)
    )
    r = res.scalars().first()
    if r:
        r.status = "paused"
        await db.commit()
    return RunControlResponse()


@router.post("/workflows/{workflow_id}/resume", response_model=RunControlResponse)
async def resume_by_workflow(workflow_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(WorkflowRun)
        .where(WorkflowRun.workflow_id == workflow_id, WorkflowRun.status == "paused")
        .order_by(WorkflowRun.started_at.desc()).limit(1)
    )
    r = res.scalars().first()
    if r:
        r.status = "running"
        await db.commit()
    return RunControlResponse()


@router.post("/workflows/{workflow_id}/stop", response_model=RunControlResponse)
async def stop_by_workflow(workflow_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(WorkflowRun)
        .where(WorkflowRun.workflow_id == workflow_id, WorkflowRun.status.in_(["running", "paused"]))
        .order_by(WorkflowRun.started_at.desc()).limit(1)
    )
    r = res.scalars().first()
    if r:
        r.status   = "failed"
        r.ended_at = datetime.now(timezone.utc)
        await db.commit()
    return RunControlResponse()
