from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models import (
    AgentExecution, Factory, MemoryEntry, OsSettingsRow,
    VirtualAgent, WorkflowRun,
)
from app.schemas import AgentStatItem, DashboardOut

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard", response_model=DashboardOut)
async def get_dashboard(db: AsyncSession = Depends(get_db)):
    today_start = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    )

    # ── Workflow stats ────────────────────────────────────────────────────────

    total_runs = (await db.execute(
        select(func.count())
        .select_from(WorkflowRun)
        .where(WorkflowRun.started_at >= today_start)
    )).scalar() or 0

    tokens_today = int((await db.execute(
        select(func.sum(WorkflowRun.tokens_used))
        .where(WorkflowRun.started_at >= today_start)
    )).scalar() or 0)

    cost_today = float((await db.execute(
        select(func.sum(WorkflowRun.cost_usd))
        .where(WorkflowRun.started_at >= today_start)
    )).scalar() or 0.0)

    active_wf = (await db.execute(
        select(func.count())
        .select_from(WorkflowRun)
        .where(WorkflowRun.status == "running")
    )).scalar() or 0

    errors_today = (await db.execute(
        select(func.count())
        .select_from(WorkflowRun)
        .where(WorkflowRun.started_at >= today_start)
        .where(WorkflowRun.status == "failed")
    )).scalar() or 0

    # Success rate (last 100 completed or failed)
    recent_statuses = (await db.execute(
        select(WorkflowRun.status)
        .where(WorkflowRun.status.in_(["completed", "failed"]))
        .order_by(WorkflowRun.started_at.desc())
        .limit(100)
    )).scalars().all()
    success_rate = (
        round(sum(1 for s in recent_statuses if s == "completed")
              / len(recent_statuses) * 100, 1)
        if recent_statuses else 100.0
    )

    # Active factories (factories with at least 1 active/idle run today)
    active_factories = (await db.execute(
        select(func.count())
        .select_from(Factory)
        .where(Factory.status == "active")
    )).scalar() or 0

    # Memory item count
    memory_items = (await db.execute(
        select(func.count()).select_from(MemoryEntry)
    )).scalar() or 0

    # DB size for memoryUsedMb
    import os
    try:
        db_path = "./data/aios.db"
        mem_mb = round(os.path.getsize(db_path) / 1_048_576, 2) if os.path.exists(db_path) else 0.0
    except OSError:
        mem_mb = 0.0

    # ── Agent stats ───────────────────────────────────────────────────────────

    agent_runs_today = (await db.execute(
        select(func.count())
        .select_from(AgentExecution)
        .where(AgentExecution.created_at >= today_start)
    )).scalar() or 0

    virtual_claude_runs = (await db.execute(
        select(func.count())
        .select_from(AgentExecution)
        .where(AgentExecution.created_at >= today_start)
        .where(AgentExecution.is_real_claude == False)
    )).scalar() or 0

    real_claude_runs = (await db.execute(
        select(func.count())
        .select_from(AgentExecution)
        .where(AgentExecution.created_at >= today_start)
        .where(AgentExecution.is_real_claude == True)
    )).scalar() or 0

    # Top 5 agents today by run count
    top_agents_raw = (await db.execute(
        select(AgentExecution.agent_id, func.count().label("cnt"))
        .where(AgentExecution.created_at >= today_start)
        .group_by(AgentExecution.agent_id)
        .order_by(func.count().desc())
        .limit(5)
    )).all()

    # Load agent icons / names
    top_agents: list[AgentStatItem] = []
    for agent_id, cnt in top_agents_raw:
        agent_row = (await db.execute(
            select(VirtualAgent).where(VirtualAgent.id == agent_id)
        )).scalars().first()
        top_agents.append(AgentStatItem(
            agentId=agent_id,
            agentName=agent_row.name_ja if agent_row else agent_id,
            icon=agent_row.icon if agent_row else "🤖",
            runsToday=cnt,
        ))

    # claude_mode from settings
    settings_row = (await db.execute(
        select(OsSettingsRow).where(OsSettingsRow.id == "global")
    )).scalars().first()
    claude_mode = getattr(settings_row, "claude_mode", "auto") if settings_row else "auto"

    return DashboardOut(
        totalRunsToday=total_runs,
        tokensUsedToday=tokens_today,
        activeWorkflows=active_wf,
        successRateToday=success_rate,
        avgResponseMs=3200,
        queueDepth=0,
        memoryUsedMb=mem_mb,
        costToday=round(cost_today, 6),
        memoryItems=memory_items,
        activeFactories=active_factories,
        errorsToday=errors_today,
        agentRunsToday=agent_runs_today,
        virtualClaudeRunsToday=virtual_claude_runs,
        realClaudeRunsToday=real_claude_runs,
        claudeMode=claude_mode,
        topAgents=top_agents,
    )
