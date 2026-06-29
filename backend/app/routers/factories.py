from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models import Factory, Workflow, WorkflowRun, MemoryEntry
from app.schemas import (
    FactoryOut, FactorySettingsOut, FactorySettingsPatch,
    FactoryOutputOut, FactoryKnowledgeOut,
)

router = APIRouter(tags=["factories"])


def _factory_out(
    f: Factory,
    wf_count: int,
    run_count: int,
    queued_count: int,
    error_count: int,
    mem_count: int,
) -> FactoryOut:
    from datetime import datetime, timezone
    last = f.updated_at or datetime.now(timezone.utc)
    return FactoryOut(
        id=f.id, name=f.name, nameJa=f.name_ja, icon=f.icon,
        accentColor=f.accent_color, status=f.status,
        activeWorkflows=wf_count, completedToday=run_count,
        queuedTasks=queued_count, errorCount=error_count,
        memoryItems=mem_count,
        lastActivity=last.isoformat(),
    )


@router.get("/factories", response_model=list[FactoryOut])
async def get_factories(db: AsyncSession = Depends(get_db)):
    result    = await db.execute(select(Factory))
    factories = result.scalars().all()

    out = []
    for f in factories:
        wf_res      = await db.execute(select(func.count()).select_from(Workflow).where(Workflow.factory_id == f.id))
        run_res     = await db.execute(select(func.count()).select_from(WorkflowRun).where(WorkflowRun.factory_id == f.id, WorkflowRun.status == "completed"))
        queued_res  = await db.execute(select(func.count()).select_from(WorkflowRun).where(WorkflowRun.factory_id == f.id, WorkflowRun.status.in_(["running", "queued"])))
        error_res   = await db.execute(select(func.count()).select_from(WorkflowRun).where(WorkflowRun.factory_id == f.id, WorkflowRun.status == "failed"))
        mem_res     = await db.execute(select(func.count()).select_from(MemoryEntry).where(MemoryEntry.factory_id == f.id))
        out.append(_factory_out(
            f,
            wf_count=wf_res.scalar() or 0,
            run_count=run_res.scalar() or 0,
            queued_count=queued_res.scalar() or 0,
            error_count=error_res.scalar() or 0,
            mem_count=mem_res.scalar() or 0,
        ))
    return out


@router.get("/factories/{factory_id}/settings", response_model=FactorySettingsOut)
async def get_factory_settings(factory_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Factory).where(Factory.id == factory_id))
    f = result.scalars().first()
    if not f:
        raise HTTPException(404, f"Factory not found: {factory_id}")
    return FactorySettingsOut(
        factoryId=f.id, model=f.preferred_model or "",
        temperature=f.temperature, maxTokens=f.max_tokens,
        systemPrompt=f.system_prompt,
        autoSaveMemory=f.auto_save_memory, notifyOnComplete=f.notify_on_complete,
    )


@router.patch("/factories/{factory_id}/settings", response_model=FactorySettingsOut)
async def patch_factory_settings(
    factory_id: str, req: FactorySettingsPatch, db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Factory).where(Factory.id == factory_id))
    f = result.scalars().first()
    if not f:
        raise HTTPException(404, f"Factory not found: {factory_id}")

    if req.model            is not None: f.preferred_model   = req.model
    if req.temperature      is not None: f.temperature        = req.temperature
    if req.maxTokens        is not None: f.max_tokens         = req.maxTokens
    if req.systemPrompt     is not None: f.system_prompt      = req.systemPrompt
    if req.autoSaveMemory   is not None: f.auto_save_memory   = req.autoSaveMemory
    if req.notifyOnComplete is not None: f.notify_on_complete = req.notifyOnComplete

    await db.commit()
    await db.refresh(f)
    return FactorySettingsOut(
        factoryId=f.id, model=f.preferred_model or "",
        temperature=f.temperature, maxTokens=f.max_tokens,
        systemPrompt=f.system_prompt,
        autoSaveMemory=f.auto_save_memory, notifyOnComplete=f.notify_on_complete,
    )


@router.get("/factories/{factory_id}/outputs", response_model=list[FactoryOutputOut])
async def get_factory_outputs(factory_id: str, limit: int = 10, db: AsyncSession = Depends(get_db)):
    # Return recent completed runs as "outputs"
    result = await db.execute(
        select(WorkflowRun)
        .where(WorkflowRun.factory_id == factory_id, WorkflowRun.status == "completed")
        .order_by(WorkflowRun.ended_at.desc())
        .limit(limit)
    )
    runs = result.scalars().all()
    return [
        FactoryOutputOut(
            id=r.id, factoryId=r.factory_id, workflowId=r.workflow_id,
            title=r.workflow_name,
            content=r.output_summary or "",
            format="text", size=len(r.output_summary or ""),
            createdAt=r.ended_at.isoformat() if r.ended_at else r.started_at.isoformat(),
            tags=[],
        )
        for r in runs
    ]


@router.get("/factories/{factory_id}/knowledge", response_model=list[FactoryKnowledgeOut])
async def get_factory_knowledge(factory_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Factory).where(Factory.id == factory_id))
    f = result.scalars().first()
    if not f:
        raise HTTPException(404, f"Factory not found: {factory_id}")
    # Return system prompt as a knowledge item
    if not f.system_prompt:
        return []
    from datetime import datetime, timezone
    return [FactoryKnowledgeOut(
        id=f"{factory_id}-system",
        factoryId=factory_id,
        title="System Prompt",
        description=f.system_prompt[:200],
        type="system_prompt",
        size=len(f.system_prompt),
        updatedAt=(f.updated_at or datetime.now(timezone.utc)).isoformat(),
    )]
