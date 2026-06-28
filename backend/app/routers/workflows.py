from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import Workflow, WorkflowRun
from app.schemas import WorkflowOut, WorkflowInputField

router = APIRouter(tags=["workflows"])


def _wf_out(w: Workflow) -> WorkflowOut:
    return WorkflowOut(
        id=w.id, factoryId=w.factory_id, name=w.name, nameJa=w.name_ja,
        description=w.description, status=w.status,
        stepCount=w.step_count, avgDurationMs=w.avg_duration_ms,
        totalRuns=w.total_runs, successRate=w.success_rate,
        lastRunAt=w.last_run_at.isoformat() if w.last_run_at else None,
        tags=w.tags or [],
    )


@router.get("/workflows", response_model=list[WorkflowOut])
async def get_workflows(factoryId: str | None = None, db: AsyncSession = Depends(get_db)):
    q = select(Workflow)
    if factoryId:
        q = q.where(Workflow.factory_id == factoryId)
    result = await db.execute(q)
    return [_wf_out(w) for w in result.scalars().all()]


@router.get("/workflows/{workflow_id}/schema", response_model=list[WorkflowInputField])
async def get_workflow_schema(workflow_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Workflow).where(Workflow.id == workflow_id))
    w = result.scalars().first()
    if not w:
        raise HTTPException(404, f"Workflow not found: {workflow_id}")
    schema = w.input_schema or []
    return [WorkflowInputField(**f) for f in schema]
