"""
VirtualAgent execution engine.

Design for 1000+ agents:
  - Routing keywords stored in DB per agent (not hardcoded)
  - route_input_db()  — DB-driven keyword routing (O(n) but cached)
  - route_input_llm() — LLM routing with dynamic agent list
  - stream_agent()    — SSE generator
  - run_agent_sync()  — blocking variant for background tasks
  - build_memory_context() — MemoryEntry loader
"""
from __future__ import annotations

import json
import uuid
from collections import defaultdict
from datetime import datetime, timezone

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AgentExecution, MemoryEntry, OsSettingsRow, VirtualAgent
from app.schemas import ChatMessage
from app.services.ai_router import calculate_cost_usd
from app.services.retry import stream_with_fallback


# ---------------------------------------------------------------------------
# DB-driven routing (1000-agent scalable)
# ---------------------------------------------------------------------------

async def route_input_db(
    text: str,
    db: AsyncSession,
    exclude_roles: tuple[str, ...] = ("router",),
) -> str:
    """
    Score all enabled agents by their DB-stored routing_keywords.
    Returns the agent_id with the highest score (priority breaks ties).
    Falls back to "virtual-claude".
    """
    res = await db.execute(
        select(VirtualAgent.id, VirtualAgent.routing_keywords, VirtualAgent.priority)
        .where(VirtualAgent.is_enabled == True)
        .where(VirtualAgent.role.not_in(list(exclude_roles)))
    )
    rows = res.all()

    text_lower = text.lower()
    scores: dict[str, tuple[int, int]] = {}  # id → (score, priority)

    for agent_id, keywords, priority in rows:
        if not keywords:
            continue
        score = sum(1 for kw in keywords if kw.lower() in text_lower)
        if score > 0:
            scores[agent_id] = (score, priority)

    if scores:
        # Sort: score desc, priority desc
        best = max(scores, key=lambda k: (scores[k][0], scores[k][1]))
        return best

    return "virtual-claude"


async def route_input_llm(
    text: str,
    cfg: OsSettingsRow,
    db: AsyncSession,
) -> str:
    """Use LLM to route to best agent. Falls back to DB keyword routing."""
    # Build agent list dynamically from DB
    res = await db.execute(
        select(VirtualAgent.id, VirtualAgent.description)
        .where(VirtualAgent.is_enabled == True)
        .where(VirtualAgent.role != "router")
    )
    agents = res.all()
    agent_list = "\n".join(f"- {aid}: {desc[:80]}" for aid, desc in agents)

    router_system = (
        "あなたはAI OSのRouterAgentです。入力内容から最適なエージェントIDを1つだけ返してください。\n"
        f"選択肢:\n{agent_list}\n\n"
        "エージェントIDのみ返し、説明は不要です。"
    )
    messages = [ChatMessage(role="user", content=f"入力: {text[:300]}")]
    valid_ids = {aid for aid, _ in agents}

    try:
        if cfg.api_key_openai:
            model = "gpt-4o-mini"
        elif cfg.api_key_google:
            model = "gemini-2.5-flash"
        else:
            return await route_input_db(text, db)

        _model, gen = await stream_with_fallback(messages, model, cfg, router_system)
        parts: list[str] = []
        async for chunk in gen:
            for part in chunk.split("\n\n"):
                if part.startswith("data: "):
                    raw = part[6:].strip()
                    if raw == "[DONE]":
                        break
                    try:
                        parsed = json.loads(raw)
                        if "content" in parsed:
                            parts.append(parsed["content"])
                    except Exception:
                        pass
        result = "".join(parts).strip().lower().split()[0] if parts else ""
        return result if result in valid_ids else await route_input_db(text, db)
    except Exception:
        return await route_input_db(text, db)


# ---------------------------------------------------------------------------
# Memory context
# ---------------------------------------------------------------------------

async def build_memory_context(
    db: AsyncSession,
    factory_id: str | None = None,
    limit: int = 5,
) -> str:
    """Load recent MemoryEntries and format as context block."""
    query = select(MemoryEntry).order_by(desc(MemoryEntry.created_at)).limit(limit)
    if factory_id:
        query = query.where(MemoryEntry.factory_id == factory_id)
    res = await db.execute(query)
    entries = res.scalars().all()
    if not entries:
        return "（過去の記録なし）"
    lines = [f"- [{e.title}] {e.summary[:200]}" for e in entries]
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Model selection
# ---------------------------------------------------------------------------

def select_model_for_agent(
    agent: VirtualAgent,
    cfg: OsSettingsRow,
) -> tuple[str, bool]:
    """
    Returns (model_id, is_real_claude).
    For claude/claude-code role agents, respects claude_mode from OsSettingsRow.
    """
    claude_mode = getattr(cfg, "claude_mode", "auto")
    is_claude_role = agent.role in ("claude", "claude-code")

    if is_claude_role:
        has_real = bool(
            cfg.api_key_anthropic
            and not cfg.api_key_anthropic.startswith("sk-ant-dummy")
            and len(cfg.api_key_anthropic) > 20
        )
        if claude_mode == "real":
            return ("claude-sonnet-4-6", True) if has_real else ("gpt-4o", False)
        elif claude_mode == "auto":
            if has_real:
                return "claude-sonnet-4-6", True
            return ("gpt-4o" if cfg.api_key_openai else "gemini-2.5-flash"), False
        else:  # virtual
            return ("gpt-4o" if cfg.api_key_openai else "gemini-2.5-flash"), False

    # Non-claude agents
    if agent.preferred_model:
        return agent.preferred_model, False

    if agent.preferred_provider == "openai"    and cfg.api_key_openai:    return "gpt-4o-mini", False
    if agent.preferred_provider == "google"    and cfg.api_key_google:    return "gemini-2.5-flash", False
    if agent.preferred_provider == "anthropic" and cfg.api_key_anthropic: return "claude-haiku-4-5-20251001", False

    if cfg.api_key_openai:  return "gpt-4o-mini", False
    if cfg.api_key_google:  return "gemini-2.5-flash", False
    return "gpt-4o-mini", False


# ---------------------------------------------------------------------------
# System prompt builder
# ---------------------------------------------------------------------------

def _build_system_prompt(agent: VirtualAgent, memory_ctx: str, model_used: str) -> str:
    prompt = agent.system_prompt
    prompt = prompt.replace("{memory_context}", memory_ctx)
    prompt = prompt.replace("{current_date}", datetime.now(timezone.utc).strftime("%Y-%m-%d"))
    prompt = prompt.replace("{actual_model}", model_used)
    return prompt


# ---------------------------------------------------------------------------
# Stream agent (SSE)
# ---------------------------------------------------------------------------

async def stream_agent(
    agent: VirtualAgent,
    user_input: str,
    cfg: OsSettingsRow,
    db: AsyncSession,
    factory_id: str | None = None,
    session_id: str | None = None,
):
    """
    Async SSE generator. Yields:
      1. agent_meta event (first)
      2. content events from AI stream
      3. [DONE]
    Also persists AgentExecution and optionally MemoryEntry.
    """
    model, is_real = select_model_for_agent(agent, cfg)
    memory_ctx = await build_memory_context(db, factory_id)
    system = _build_system_prompt(agent, memory_ctx, model)

    # Metadata event
    meta = {
        "agentId":      agent.id,
        "agentName":    agent.name_ja,
        "modelUsed":    model,
        "isRealClaude": is_real,
        "claudeMode":   getattr(cfg, "claude_mode", "auto"),
    }
    yield f"data: {json.dumps({'agent_meta': meta}, ensure_ascii=False)}\n\n"

    messages = [ChatMessage(role="user", content=user_input)]
    model_used, gen = await stream_with_fallback(messages, model, cfg, system)

    output_parts: list[str] = []
    async for chunk in gen:
        yield chunk
        for part in chunk.split("\n\n"):
            if part.startswith("data: "):
                raw = part[6:].strip()
                if raw == "[DONE]":
                    break
                try:
                    parsed = json.loads(raw)
                    if "content" in parsed:
                        output_parts.append(parsed["content"])
                except Exception:
                    pass

    # Persist execution log
    output = "".join(output_parts)
    tokens = max(10, len(output) // 4)
    cost = calculate_cost_usd(model_used or model, tokens)

    from app.database import AsyncSessionLocal
    async with AsyncSessionLocal() as save_db:
        exec_id = str(uuid.uuid4())
        save_db.add(AgentExecution(
            id=exec_id,
            agent_id=agent.id,
            factory_id=factory_id,
            session_id=session_id,
            input_text=user_input[:1000],
            output_text=output[:5000],
            model_used=model_used or model,
            is_real_claude=is_real,
            tokens_used=tokens,
            cost_usd=cost,
        ))

        # Auto-save to Memory if output is substantial
        if len(output) > 150 and factory_id:
            save_db.add(MemoryEntry(
                id=str(uuid.uuid4()),
                factory_id=factory_id,
                workflow_id=None,
                title=f"[{agent.name_ja}] {user_input[:60]}",
                summary=output[:400],
                model=model_used or model,
                tags=[agent.role, agent.category or "agent", "agent_exec"],
                size=len(output),
            ))

        await save_db.commit()


# ---------------------------------------------------------------------------
# Sync variant (for background workflow steps)
# ---------------------------------------------------------------------------

async def run_agent_sync(
    agent: VirtualAgent,
    user_input: str,
    cfg: OsSettingsRow,
    db: AsyncSession,
    factory_id: str | None = None,
) -> tuple[str, str, bool, int, float]:
    """
    Collect full output (no streaming).
    Returns (output, model_used, is_real_claude, tokens, cost_usd).
    """
    model, is_real = select_model_for_agent(agent, cfg)
    memory_ctx = await build_memory_context(db, factory_id)
    system = _build_system_prompt(agent, memory_ctx, model)

    messages = [ChatMessage(role="user", content=user_input)]
    model_used, gen = await stream_with_fallback(messages, model, cfg, system)

    parts: list[str] = []
    async for chunk in gen:
        for part in chunk.split("\n\n"):
            if part.startswith("data: "):
                raw = part[6:].strip()
                if raw == "[DONE]":
                    break
                try:
                    parsed = json.loads(raw)
                    if "content" in parsed:
                        parts.append(parsed["content"])
                except Exception:
                    pass

    output = "".join(parts)
    tokens = max(10, len(output) // 4)
    cost = calculate_cost_usd(model_used, tokens)
    return output, model_used, is_real, tokens, cost
