"""
Virtual Agent endpoints — Agent Builder API.

GET    /api/agents                  → list all agents (with stats)
GET    /api/agents/{id}             → get agent detail (includes systemPrompt)
POST   /api/agents                  → create new agent
PATCH  /api/agents/{id}             → update agent (any field)
DELETE /api/agents/{id}             → soft-delete (disable)
POST   /api/agents/{id}/enable      → enable agent
POST   /api/agents/{id}/disable     → disable agent
POST   /api/agents/{id}/test        → test agent with input (non-streaming)
POST   /api/agents/route            → RouterAgent selects best agent + SSE stream
POST   /api/agents/{id}/run         → run specific agent → SSE stream
GET    /api/agents/{id}/history     → execution log
"""
from __future__ import annotations

import json
import re
import time
import uuid

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models import ActivityItem, AgentExecution, AgentPromptHistory, MemoryEntry, OsSettingsRow, VirtualAgent
from app.schemas import (
    AgentRunRequest, AgentRunOut, AgentTestRequest, AgentTestResult,
    VirtualAgentCreate, VirtualAgentDetail, VirtualAgentOut, VirtualAgentUpdate,
)
from app.services.agent_executor import (
    build_memory_context, route_input_db, route_input_llm,
    run_agent_sync, select_model_for_agent, stream_agent,
)

router = APIRouter(tags=["agents"], dependencies=[Depends(get_current_user)])

_KEBAB_RE = re.compile(r'^[a-z0-9]+(?:-[a-z0-9]+)*$')


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _fetch_stats(
    db: AsyncSession,
    agent_ids: list[str],
) -> dict[str, tuple[int, float, str | None]]:
    """Batch-fetch (totalRuns, successRate, lastRunAt) for a list of agent IDs."""
    if not agent_ids:
        return {}

    total_res = await db.execute(
        select(
            AgentExecution.agent_id,
            func.count(AgentExecution.id).label("total"),
            func.max(AgentExecution.created_at).label("last_run"),
        ).group_by(AgentExecution.agent_id)
    )
    total_map: dict[str, tuple[int, object]] = {
        row.agent_id: (row.total, row.last_run)
        for row in total_res.all()
    }

    success_res = await db.execute(
        select(
            AgentExecution.agent_id,
            func.count(AgentExecution.id).label("success"),
        )
        .where(AgentExecution.output_text.isnot(None))
        .group_by(AgentExecution.agent_id)
    )
    success_map: dict[str, int] = {
        row.agent_id: row.success for row in success_res.all()
    }

    result: dict[str, tuple[int, float, str | None]] = {}
    for aid in agent_ids:
        total, last_run = total_map.get(aid, (0, None))
        success = success_map.get(aid, 0)
        rate = round(success / total * 100, 1) if total > 0 else 100.0
        last_str = last_run.isoformat() if last_run else None
        result[aid] = (total, rate, last_str)
    return result


def _agent_out(a: VirtualAgent, total: int = 0, success_rate: float = 100.0, last_run: str | None = None) -> VirtualAgentOut:
    return VirtualAgentOut(
        id=a.id,
        name=a.name,
        nameJa=a.name_ja,
        role=a.role,
        category=a.category,
        description=a.description,
        icon=a.icon,
        preferredProvider=a.preferred_provider,
        preferredModel=a.preferred_model,
        memoryScope=a.memory_scope,
        outputFormat=a.output_format,
        routingKeywords=a.routing_keywords or [],
        priority=a.priority,
        version=a.version,
        isEnabled=a.is_enabled,
        isBuiltin=a.is_builtin,
        createdAt=a.created_at.isoformat(),
        updatedAt=a.updated_at.isoformat(),
        totalRuns=total,
        successRate=success_rate,
        lastRunAt=last_run,
    )


def _agent_detail(a: VirtualAgent, total: int = 0, success_rate: float = 100.0, last_run: str | None = None) -> VirtualAgentDetail:
    return VirtualAgentDetail(
        id=a.id,
        name=a.name,
        nameJa=a.name_ja,
        role=a.role,
        category=a.category,
        description=a.description,
        icon=a.icon,
        systemPrompt=a.system_prompt,
        preferredProvider=a.preferred_provider,
        preferredModel=a.preferred_model,
        memoryScope=a.memory_scope,
        outputFormat=a.output_format,
        routingKeywords=a.routing_keywords or [],
        priority=a.priority,
        version=a.version,
        isEnabled=a.is_enabled,
        isBuiltin=a.is_builtin,
        createdAt=a.created_at.isoformat(),
        updatedAt=a.updated_at.isoformat(),
        totalRuns=total,
        successRate=success_rate,
        lastRunAt=last_run,
    )


async def _get_settings(db: AsyncSession) -> OsSettingsRow:
    from app.config import settings as env_cfg
    res = await db.execute(select(OsSettingsRow).where(OsSettingsRow.id == "global"))
    row = res.scalars().first() or OsSettingsRow(
        id="global", api_key_openai="", api_key_anthropic="",
        api_key_google="", default_model="gpt-4o-mini",
    )
    row.api_key_openai    = row.api_key_openai    or env_cfg.openai_api_key
    row.api_key_anthropic = row.api_key_anthropic or env_cfg.anthropic_api_key
    row.api_key_google    = row.api_key_google    or env_cfg.google_api_key
    return row


def _sse_headers() -> dict:
    return {
        "Content-Type":  "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection":    "keep-alive",
        "X-Accel-Buffering": "no",
    }


def _activity(type_: str, message: str, detail: str | None = None) -> ActivityItem:
    return ActivityItem(
        id=str(uuid.uuid4()),
        type=type_,
        factory_id="system",
        factory_name="Agent Builder",
        factory_icon="🤖",
        message=message,
        detail=detail,
    )


# ---------------------------------------------------------------------------
# GET /api/agents — list with stats
# ---------------------------------------------------------------------------

@router.get("/agents", response_model=list[VirtualAgentOut])
async def list_agents(db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(VirtualAgent)
        .order_by(VirtualAgent.is_builtin.desc(), VirtualAgent.priority.desc(), VirtualAgent.name)
    )
    agents = res.scalars().all()
    if not agents:
        return []

    stats = await _fetch_stats(db, [a.id for a in agents])
    return [_agent_out(a, *stats.get(a.id, (0, 100.0, None))) for a in agents]


# ---------------------------------------------------------------------------
# GET /api/agents/{id} — single agent with systemPrompt
# ---------------------------------------------------------------------------

@router.get("/agents/{agent_id}", response_model=VirtualAgentDetail)
async def get_agent(agent_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(VirtualAgent).where(VirtualAgent.id == agent_id))
    agent = res.scalars().first()
    if not agent:
        raise HTTPException(404, "Agent not found")
    stats = await _fetch_stats(db, [agent_id])
    total, rate, last_run = stats.get(agent_id, (0, 100.0, None))
    return _agent_detail(agent, total, rate, last_run)


# ---------------------------------------------------------------------------
# POST /api/agents — create agent
# ---------------------------------------------------------------------------

@router.post("/agents", response_model=VirtualAgentDetail, status_code=201)
async def create_agent(req: VirtualAgentCreate, db: AsyncSession = Depends(get_db)):
    # Validate ID format
    if not _KEBAB_RE.match(req.id):
        raise HTTPException(400, "Agent ID must be kebab-case (e.g. 'my-agent-01')")

    # Validate required content
    if not req.systemPrompt.strip():
        raise HTTPException(400, "systemPrompt cannot be empty")
    if not req.routingKeywords:
        raise HTTPException(400, "routingKeywords cannot be empty")

    # Check uniqueness
    dup = await db.execute(select(VirtualAgent.id).where(VirtualAgent.id == req.id))
    if dup.scalars().first():
        raise HTTPException(409, f"Agent ID '{req.id}' already exists")

    agent = VirtualAgent(
        id=req.id,
        name=req.name,
        name_ja=req.nameJa,
        role=req.role,
        category=req.category,
        description=req.description,
        icon=req.icon,
        system_prompt=req.systemPrompt,
        preferred_provider=req.preferredProvider,
        preferred_model=req.preferredModel,
        memory_scope=req.memoryScope,
        output_format=req.outputFormat,
        routing_keywords=req.routingKeywords,
        priority=req.priority,
        is_builtin=False,
        is_enabled=True,
        version=1,
    )
    db.add(agent)
    db.add(_activity(
        "agent_created",
        f"Agent created: {req.nameJa}",
        f"ID: {req.id}  Category: {req.category}  Keywords: {', '.join(req.routingKeywords[:5])}",
    ))
    await db.commit()
    await db.refresh(agent)
    return _agent_detail(agent)


# ---------------------------------------------------------------------------
# PATCH /api/agents/{id} — update any field
# ---------------------------------------------------------------------------

@router.patch("/agents/{agent_id}", response_model=VirtualAgentDetail)
async def patch_agent(agent_id: str, req: VirtualAgentUpdate, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(VirtualAgent).where(VirtualAgent.id == agent_id))
    agent = res.scalars().first()
    if not agent:
        raise HTTPException(404, "Agent not found")

    changes: list[str] = []

    if req.name              is not None: agent.name              = req.name;              changes.append("name")
    if req.nameJa            is not None: agent.name_ja           = req.nameJa;            changes.append("nameJa")
    if req.role              is not None: agent.role              = req.role;              changes.append("role")
    if req.category          is not None: agent.category          = req.category;          changes.append("category")
    if req.description       is not None: agent.description       = req.description;       changes.append("description")
    if req.icon              is not None: agent.icon              = req.icon;              changes.append("icon")
    if req.preferredProvider is not None: agent.preferred_provider = req.preferredProvider; changes.append("provider")
    if req.preferredModel    is not None: agent.preferred_model   = req.preferredModel;    changes.append("model")
    if req.memoryScope       is not None: agent.memory_scope      = req.memoryScope;       changes.append("memoryScope")
    if req.outputFormat      is not None: agent.output_format     = req.outputFormat;      changes.append("outputFormat")
    if req.priority          is not None: agent.priority          = req.priority;          changes.append("priority")
    if req.isEnabled         is not None: agent.is_enabled        = req.isEnabled;         changes.append("isEnabled")

    if req.routingKeywords is not None:
        if not req.routingKeywords:
            raise HTTPException(400, "routingKeywords cannot be empty")
        agent.routing_keywords = req.routingKeywords
        changes.append("routingKeywords")
        db.add(_activity(
            "routing_keywords_changed",
            f"Routing keywords updated: {agent.name_ja}",
            f"Keywords: {', '.join(req.routingKeywords[:10])}",
        ))

    if req.systemPrompt is not None:
        if not req.systemPrompt.strip():
            raise HTTPException(400, "systemPrompt cannot be empty")
        # Save prompt history
        db.add(AgentPromptHistory(
            agent_id=agent.id,
            old_prompt=agent.system_prompt,
            new_prompt=req.systemPrompt,
            changed_by="builder",
        ))
        agent.system_prompt = req.systemPrompt
        agent.version = agent.version + 1
        changes.append("systemPrompt")
        db.add(_activity(
            "system_prompt_updated",
            f"System prompt updated: {agent.name_ja}",
            f"Version: {agent.version}  Chars: {len(req.systemPrompt)}",
        ))

    if changes:
        db.add(_activity(
            "agent_updated",
            f"Agent updated: {agent.name_ja}",
            f"Changed: {', '.join(changes)}",
        ))

    await db.commit()
    await db.refresh(agent)
    stats = await _fetch_stats(db, [agent_id])
    total, rate, last_run = stats.get(agent_id, (0, 100.0, None))
    return _agent_detail(agent, total, rate, last_run)


# ---------------------------------------------------------------------------
# DELETE /api/agents/{id} — soft-delete (disable)
# ---------------------------------------------------------------------------

@router.delete("/agents/{agent_id}")
async def delete_agent(agent_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(VirtualAgent).where(VirtualAgent.id == agent_id))
    agent = res.scalars().first()
    if not agent:
        raise HTTPException(404, "Agent not found")
    if agent.is_builtin:
        raise HTTPException(403, "Built-in agents cannot be deleted")
    agent.is_enabled = False
    db.add(_activity("agent_disabled", f"Agent soft-deleted (disabled): {agent.name_ja}", f"ID: {agent_id}"))
    await db.commit()
    return {"ok": True, "message": f"Agent '{agent_id}' disabled (soft-delete)"}


# ---------------------------------------------------------------------------
# POST /api/agents/{id}/enable
# POST /api/agents/{id}/disable
# ---------------------------------------------------------------------------

@router.post("/agents/{agent_id}/enable", response_model=VirtualAgentDetail)
async def enable_agent(agent_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(VirtualAgent).where(VirtualAgent.id == agent_id))
    agent = res.scalars().first()
    if not agent:
        raise HTTPException(404, "Agent not found")
    agent.is_enabled = True
    db.add(_activity("agent_enabled", f"Agent enabled: {agent.name_ja}", f"ID: {agent_id}"))
    await db.commit()
    await db.refresh(agent)
    stats = await _fetch_stats(db, [agent_id])
    total, rate, last_run = stats.get(agent_id, (0, 100.0, None))
    return _agent_detail(agent, total, rate, last_run)


@router.post("/agents/{agent_id}/disable", response_model=VirtualAgentDetail)
async def disable_agent(agent_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(VirtualAgent).where(VirtualAgent.id == agent_id))
    agent = res.scalars().first()
    if not agent:
        raise HTTPException(404, "Agent not found")
    agent.is_enabled = False
    db.add(_activity("agent_disabled", f"Agent disabled: {agent.name_ja}", f"ID: {agent_id}"))
    await db.commit()
    await db.refresh(agent)
    stats = await _fetch_stats(db, [agent_id])
    total, rate, last_run = stats.get(agent_id, (0, 100.0, None))
    return _agent_detail(agent, total, rate, last_run)


# ---------------------------------------------------------------------------
# POST /api/agents/{id}/test — non-streaming test
# ---------------------------------------------------------------------------

@router.post("/agents/{agent_id}/test", response_model=AgentTestResult)
async def test_agent(agent_id: str, req: AgentTestRequest, db: AsyncSession = Depends(get_db)):
    if not req.input.strip():
        raise HTTPException(400, "Test input cannot be empty")

    res = await db.execute(select(VirtualAgent).where(VirtualAgent.id == agent_id))
    agent = res.scalars().first()
    if not agent:
        raise HTTPException(404, "Agent not found")

    cfg = await _get_settings(db)
    exec_id = str(uuid.uuid4())
    start = time.monotonic()

    try:
        output, model_used, is_real, tokens, cost = await run_agent_sync(
            agent, req.input, cfg, db, factory_id=None,
        )
        duration_ms = int((time.monotonic() - start) * 1000)
        success = True
    except Exception as exc:
        output = f"[ERROR] {exc}"
        model_used = ""
        is_real = False
        tokens = 0
        cost = 0.0
        duration_ms = int((time.monotonic() - start) * 1000)
        success = False

    # Save execution
    db.add(AgentExecution(
        id=exec_id,
        agent_id=agent.id,
        factory_id=None,
        session_id=None,
        input_text=req.input[:1000],
        output_text=output[:5000] if success else None,
        model_used=model_used,
        is_real_claude=is_real,
        tokens_used=tokens,
        cost_usd=cost,
        duration_ms=duration_ms,
        action_type="test",
    ))
    db.add(_activity(
        "agent_test_success" if success else "agent_test_failed",
        f"Agent test {'✓' if success else '✗'}: {agent.name_ja}",
        f"Input: {req.input[:80]}  Duration: {duration_ms}ms  Model: {model_used}",
    ))
    await db.commit()

    return AgentTestResult(
        agentId=agent.id,
        agentName=agent.name_ja,
        modelUsed=model_used,
        isRealClaude=is_real,
        output=output,
        tokensUsed=tokens,
        costUsd=cost,
        durationMs=duration_ms,
        success=success,
        executionId=exec_id,
    )


# ---------------------------------------------------------------------------
# POST /api/agents/route — router SSE
# ---------------------------------------------------------------------------

@router.post("/agents/route")
async def route_and_run(req: AgentRunRequest, db: AsyncSession = Depends(get_db)):
    """RouterAgent selects the best agent and streams the response."""
    cfg = await _get_settings(db)

    try:
        agent_id = await route_input_llm(req.input, cfg, db)
    except Exception:
        agent_id = await route_input_db(req.input, db)

    res = await db.execute(
        select(VirtualAgent).where(VirtualAgent.id == agent_id, VirtualAgent.is_enabled == True)
    )
    agent = res.scalars().first()
    if not agent:
        res2 = await db.execute(select(VirtualAgent).where(VirtualAgent.id == "virtual-claude"))
        agent = res2.scalars().first()
    if not agent:
        raise HTTPException(503, "No enabled agents available")

    return StreamingResponse(
        stream_agent(agent, req.input, cfg, db, req.factory_id, req.session_id),
        headers=_sse_headers(),
    )


# ---------------------------------------------------------------------------
# POST /api/agents/{id}/run — direct SSE run
# ---------------------------------------------------------------------------

@router.post("/agents/{agent_id}/run")
async def run_agent(agent_id: str, req: AgentRunRequest, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(VirtualAgent).where(VirtualAgent.id == agent_id))
    agent = res.scalars().first()
    if not agent:
        raise HTTPException(404, "Agent not found")
    if not agent.is_enabled:
        raise HTTPException(409, "Agent is disabled")

    cfg = await _get_settings(db)
    return StreamingResponse(
        stream_agent(agent, req.input, cfg, db, req.factory_id, req.session_id),
        headers=_sse_headers(),
    )


# ---------------------------------------------------------------------------
# GET /api/agents/{id}/history
# ---------------------------------------------------------------------------

@router.get("/agents/{agent_id}/history")
async def get_agent_history(agent_id: str, limit: int = 20, db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(AgentExecution)
        .where(AgentExecution.agent_id == agent_id)
        .order_by(desc(AgentExecution.created_at))
        .limit(limit)
    )
    execs = res.scalars().all()
    return [
        {
            "id":           e.id,
            "agentId":      e.agent_id,
            "factoryId":    e.factory_id,
            "actionType":   e.action_type,
            "inputText":    e.input_text[:200],
            "outputText":   e.output_text[:500] if e.output_text else None,
            "modelUsed":    e.model_used,
            "isRealClaude": e.is_real_claude,
            "tokensUsed":   e.tokens_used,
            "costUsd":      e.cost_usd,
            "durationMs":   e.duration_ms,
            "success":      e.output_text is not None,
            "createdAt":    e.created_at.isoformat(),
        }
        for e in execs
    ]
