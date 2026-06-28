from __future__ import annotations

from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models import WorkflowRun, Factory
from app.schemas import DashboardOut

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard", response_model=DashboardOut)
async def get_dashboard(db: AsyncSession = Depends(get_db)):
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    # Runs today
    runs_res = await db.execute(
        select(func.count())
        .select_from(WorkflowRun)
        .where(WorkflowRun.started_at >= today_start)
    )
    total_runs_today = runs_res.scalar() or 0

    # Tokens today
    tokens_res = await db.execute(
        select(func.sum(WorkflowRun.tokens_used))
        .where(WorkflowRun.started_at >= today_start)
    )
    tokens_today = int(tokens_res.scalar() or 0)

    # Active workflows
    active_res = await db.execute(
        select(func.count())
        .select_from(WorkflowRun)
        .where(WorkflowRun.status == "running")
    )
    active_wf = active_res.scalar() or 0

    # Success rate (last 100 runs)
    recent_res = await db.execute(
        select(WorkflowRun.status)
        .order_by(WorkflowRun.started_at.desc())
        .limit(100)
    )
    statuses = [r for r in recent_res.scalars().all()]
    success_rate = (
        round(sum(1 for s in statuses if s == "completed") / len(statuses) * 100, 1)
        if statuses else 100.0
    )

    # Memory used (rough estimate: DB size)
    import os
    try:
        db_path = "./data/aios.db"
        mem_mb = round(os.path.getsize(db_path) / 1_048_576, 2) if os.path.exists(db_path) else 0.0
    except OSError:
        mem_mb = 0.0

    return DashboardOut(
        totalRunsToday=total_runs_today,
        tokensUsedToday=tokens_today,
        activeWorkflows=active_wf,
        successRate=success_rate,
        avgResponseMs=3200,
        queueDepth=0,
        memoryUsedMb=mem_mb,
        costToday=round(tokens_today * 0.000003, 4),
    )
