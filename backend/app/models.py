"""
SQLAlchemy ORM models (DB tables).
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean, Column, Float, ForeignKey, Integer, JSON, String, Text, DateTime,
)
from sqlalchemy.orm import relationship

from app.database import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _uuid() -> str:
    return str(uuid.uuid4())


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------

class Factory(Base):
    __tablename__ = "factories"

    id              = Column(String, primary_key=True, default=_uuid)
    name            = Column(String, nullable=False)
    name_ja         = Column(String, nullable=False)
    icon            = Column(String, nullable=False, default="🏭")
    accent_color    = Column(String, nullable=False, default="#2563EB")
    status          = Column(String, nullable=False, default="idle")  # active|idle|paused|disabled
    preferred_model = Column(String, nullable=True)   # None = use default from settings
    system_prompt   = Column(Text, nullable=False, default="")
    temperature     = Column(Float, nullable=False, default=0.7)
    max_tokens      = Column(Integer, nullable=False, default=4096)
    auto_save_memory    = Column(Boolean, nullable=False, default=True)
    notify_on_complete  = Column(Boolean, nullable=False, default=False)
    created_at      = Column(DateTime(timezone=True), default=_now)
    updated_at      = Column(DateTime(timezone=True), default=_now, onupdate=_now)

    workflows   = relationship("Workflow",     back_populates="factory", cascade="all, delete-orphan")
    runs        = relationship("WorkflowRun",  back_populates="factory", cascade="all, delete-orphan")
    memory_entries = relationship("MemoryEntry", back_populates="factory", cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# Workflow
# ---------------------------------------------------------------------------

class Workflow(Base):
    __tablename__ = "workflows"

    id              = Column(String, primary_key=True, default=_uuid)
    factory_id      = Column(String, ForeignKey("factories.id"), nullable=False)
    name            = Column(String, nullable=False)
    name_ja         = Column(String, nullable=False)
    description     = Column(Text, nullable=False, default="")
    status          = Column(String, nullable=False, default="idle")  # running|paused|idle|queued
    step_count      = Column(Integer, nullable=False, default=1)
    avg_duration_ms = Column(Integer, nullable=False, default=5000)
    total_runs      = Column(Integer, nullable=False, default=0)
    success_rate    = Column(Float, nullable=False, default=100.0)
    last_run_at     = Column(DateTime(timezone=True), nullable=True)
    tags            = Column(JSON, nullable=False, default=list)
    input_schema    = Column(JSON, nullable=False, default=list)   # list[WorkflowInputField]
    created_at      = Column(DateTime(timezone=True), default=_now)

    factory = relationship("Factory", back_populates="workflows")
    runs    = relationship("WorkflowRun", back_populates="workflow", cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# WorkflowRun
# ---------------------------------------------------------------------------

class WorkflowRun(Base):
    __tablename__ = "workflow_runs"

    id             = Column(String, primary_key=True, default=_uuid)
    workflow_id    = Column(String, ForeignKey("workflows.id"), nullable=False)
    factory_id     = Column(String, ForeignKey("factories.id"), nullable=False)
    workflow_name  = Column(String, nullable=False)
    status         = Column(String, nullable=False, default="running")
    model          = Column(String, nullable=False, default="")
    started_at     = Column(DateTime(timezone=True), default=_now)
    ended_at       = Column(DateTime(timezone=True), nullable=True)
    input_summary  = Column(Text, nullable=False, default="")
    output_summary = Column(Text, nullable=True)
    tokens_used    = Column(Integer, nullable=True)
    cost_usd       = Column(Float, nullable=True)
    steps          = Column(JSON, nullable=False, default=list)
    inputs         = Column(JSON, nullable=False, default=dict)

    workflow = relationship("Workflow", back_populates="runs")
    factory  = relationship("Factory",  back_populates="runs")


# ---------------------------------------------------------------------------
# ActivityItem
# ---------------------------------------------------------------------------

class ActivityItem(Base):
    __tablename__ = "activity"

    id           = Column(String, primary_key=True, default=_uuid)
    type         = Column(String, nullable=False)   # run_complete|run_error|run_start|memory_saved
    factory_id   = Column(String, nullable=False)
    factory_name = Column(String, nullable=False)
    factory_icon = Column(String, nullable=False)
    message      = Column(String, nullable=False)
    detail       = Column(String, nullable=True)
    timestamp    = Column(DateTime(timezone=True), default=_now)


# ---------------------------------------------------------------------------
# MemoryEntry
# ---------------------------------------------------------------------------

class MemoryEntry(Base):
    __tablename__ = "memory_entries"

    id         = Column(String, primary_key=True, default=_uuid)
    factory_id = Column(String, ForeignKey("factories.id"), nullable=False)
    workflow_id = Column(String, nullable=True)
    title      = Column(String, nullable=False)
    summary    = Column(Text, nullable=False)
    model      = Column(String, nullable=False)
    tags       = Column(JSON, nullable=False, default=list)
    size       = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), default=_now)

    factory = relationship("Factory", back_populates="memory_entries")


# ---------------------------------------------------------------------------
# OsSettings  (single row, id = "global")
# ---------------------------------------------------------------------------

class OsSettingsRow(Base):
    __tablename__ = "os_settings"

    id                   = Column(String, primary_key=True, default="global")
    default_model        = Column(String, nullable=False, default="claude-sonnet-4-6")
    fallback_model       = Column(String, nullable=False, default="gpt-4o-mini")
    max_concurrent_runs  = Column(Integer, nullable=False, default=3)
    memory_retention_days = Column(Integer, nullable=False, default=90)
    notify_on_complete   = Column(Boolean, nullable=False, default=True)
    notify_on_error      = Column(Boolean, nullable=False, default=True)
    theme                = Column(String, nullable=False, default="dark")
    language             = Column(String, nullable=False, default="ja")
    api_key_openai       = Column(String, nullable=False, default="")
    api_key_anthropic    = Column(String, nullable=False, default="")
    api_key_google       = Column(String, nullable=False, default="")
    claude_mode          = Column(String, nullable=False, default="auto")  # auto|real|virtual
    updated_at           = Column(DateTime(timezone=True), default=_now, onupdate=_now)


# ---------------------------------------------------------------------------
# ChatSession + ChatMessageRow
# ---------------------------------------------------------------------------

class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id           = Column(String, primary_key=True, default=_uuid)
    factory_id   = Column(String, nullable=True)
    title        = Column(String, nullable=False, default="新しいチャット")
    model        = Column(String, nullable=False, default="")
    total_tokens = Column(Integer, nullable=False, default=0)
    total_cost   = Column(Float, nullable=False, default=0.0)
    created_at   = Column(DateTime(timezone=True), default=_now)
    updated_at   = Column(DateTime(timezone=True), default=_now, onupdate=_now)

    messages = relationship("ChatMessageRow", back_populates="session",
                            cascade="all, delete-orphan",
                            order_by="ChatMessageRow.created_at")


class ChatMessageRow(Base):
    __tablename__ = "chat_messages"

    id         = Column(String, primary_key=True, default=_uuid)
    session_id = Column(String, ForeignKey("chat_sessions.id", ondelete="CASCADE"),
                        nullable=False)
    role       = Column(String, nullable=False)   # user | assistant | system
    content    = Column(Text, nullable=False)
    model      = Column(String, nullable=True)
    tokens     = Column(Integer, nullable=True)
    cost_usd   = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), default=_now)

    session = relationship("ChatSession", back_populates="messages")


# ---------------------------------------------------------------------------
# VirtualAgent + AgentExecution
# ---------------------------------------------------------------------------

class VirtualAgent(Base):
    """
    VirtualAgent — 拡張可能なAIエージェント定義。
    routing_keywords は JSON 配列で保存し、コード変更なしに
    新エージェント（1000体対応）のルーティングを追加できる。
    priority が高いほど同点時に優先される。
    """
    __tablename__ = "virtual_agents"

    id                  = Column(String, primary_key=True)
    name                = Column(String, nullable=False)
    name_ja             = Column(String, nullable=False)
    role                = Column(String, nullable=False)
    category            = Column(String, nullable=True)       # "coding"|"writing"|"analysis"|"management"|etc.
    description         = Column(Text, nullable=False, default="")
    icon                = Column(String, nullable=False, default="🤖")
    system_prompt       = Column(Text, nullable=False, default="")
    preferred_provider  = Column(String, nullable=False, default="auto")
    preferred_model     = Column(String, nullable=True)
    memory_scope        = Column(String, nullable=False, default="global")
    output_format       = Column(String, nullable=False, default="markdown")
    routing_keywords    = Column(JSON, nullable=False, default=list)  # DB-driven routing
    priority            = Column(Integer, nullable=False, default=10)  # higher = preferred on tie
    version             = Column(Integer, nullable=False, default=1)
    is_enabled          = Column(Boolean, nullable=False, default=True)
    is_builtin          = Column(Boolean, nullable=False, default=True)
    created_at          = Column(DateTime(timezone=True), default=_now)
    updated_at          = Column(DateTime(timezone=True), default=_now, onupdate=_now)

    executions = relationship("AgentExecution", back_populates="agent",
                              cascade="all, delete-orphan")


class AgentExecution(Base):
    __tablename__ = "agent_executions"

    id             = Column(String, primary_key=True, default=_uuid)
    agent_id       = Column(String, ForeignKey("virtual_agents.id", ondelete="CASCADE"),
                            nullable=False)
    factory_id     = Column(String, nullable=True)
    session_id     = Column(String, nullable=True)
    input_text     = Column(Text, nullable=False, default="")
    output_text    = Column(Text, nullable=True)
    model_used     = Column(String, nullable=True)
    is_real_claude = Column(Boolean, nullable=False, default=False)
    tokens_used    = Column(Integer, nullable=True)
    cost_usd       = Column(Float, nullable=True)
    duration_ms    = Column(Integer, nullable=True)
    action_type    = Column(String, nullable=True)   # chat|code|plan|review|test|research
    memory_saved   = Column(Boolean, nullable=False, default=False)
    created_at     = Column(DateTime(timezone=True), default=_now)

    agent = relationship("VirtualAgent", back_populates="executions")


# ---------------------------------------------------------------------------
# AgentPromptHistory
# ---------------------------------------------------------------------------

class AgentPromptHistory(Base):
    """Tracks system prompt changes for audit trail and rollback."""
    __tablename__ = "agent_prompt_history"

    id         = Column(String, primary_key=True, default=_uuid)
    agent_id   = Column(String, ForeignKey("virtual_agents.id", ondelete="CASCADE"),
                        nullable=False)
    old_prompt = Column(Text, nullable=False, default="")
    new_prompt = Column(Text, nullable=False, default="")
    changed_by = Column(String, nullable=True)   # "user" | "virtual-claude" | "builder"
    created_at = Column(DateTime(timezone=True), default=_now)


# ---------------------------------------------------------------------------
# Virtual Claude Dev Agent
# ---------------------------------------------------------------------------

class DevPatch(Base):
    """Patch proposals generated by Virtual Claude Dev — pending human approval."""
    __tablename__ = "dev_patches"

    id               = Column(String, primary_key=True, default=_uuid)
    title            = Column(String, nullable=False)
    file_path        = Column(String, nullable=False)        # relative from project root
    original_content = Column(Text, nullable=False, default="")
    new_content      = Column(Text, nullable=False, default="")
    ai_explanation   = Column(Text, nullable=False, default="")
    risk_level       = Column(String, nullable=False, default="low")   # low|medium|high
    status           = Column(String, nullable=False, default="pending")  # pending|applied|rejected
    created_at       = Column(DateTime(timezone=True), default=_now)
    applied_at       = Column(DateTime(timezone=True), nullable=True)


class DevHistory(Base):
    """Audit log of Virtual Claude Dev actions."""
    __tablename__ = "dev_history"

    id         = Column(String, primary_key=True, default=_uuid)
    action     = Column(String, nullable=False)   # chat|plan|patch|apply|reject|inspect
    summary    = Column(Text, nullable=False, default="")
    file_path  = Column(String, nullable=True)
    patch_id   = Column(String, nullable=True)
    model_used = Column(String, nullable=True)
    tokens     = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=_now)


# ---------------------------------------------------------------------------
# Auto Debugger
# ---------------------------------------------------------------------------

class DebugSession(Base):
    """Auto Debugger sessions — error analysis results and patch links."""
    __tablename__ = "debug_sessions"

    id             = Column(String, primary_key=True, default=_uuid)
    error_text     = Column(Text, nullable=False)
    error_type     = Column(String, nullable=True)
    severity       = Column(String, nullable=False, default="medium")
    source         = Column(String, nullable=False, default="manual")
    root_cause     = Column(Text, nullable=True)
    suggested_fix  = Column(Text, nullable=True)
    full_analysis  = Column(Text, nullable=True)
    patch_id       = Column(String, nullable=True)
    model_used     = Column(String, nullable=True)
    tokens         = Column(Integer, nullable=True)
    status         = Column(String, nullable=False, default="analyzed")
    created_at     = Column(DateTime(timezone=True), default=_now)


# ---------------------------------------------------------------------------
# Virtual Claude Team
# ---------------------------------------------------------------------------

class AgentTask(Base):
    """A task assigned to a virtual agent, with dependency tracking."""
    __tablename__ = "agent_tasks"

    id           = Column(String, primary_key=True, default=_uuid)
    session_id   = Column(String, nullable=True)
    agent_id     = Column(String, nullable=True)    # which virtual agent owns this
    title        = Column(String, nullable=False)
    description  = Column(Text, nullable=False, default="")
    status       = Column(String, nullable=False, default="pending")
    # pending | in_progress | review | blocked | completed | failed
    priority     = Column(Integer, nullable=False, default=5)   # 1-10
    depends_on   = Column(JSON, nullable=False, default=list)   # list[task_id]
    file_path    = Column(String, nullable=True)
    patch_id     = Column(String, nullable=True)
    output       = Column(Text, nullable=True)
    error_msg    = Column(Text, nullable=True)
    tokens_used  = Column(Integer, nullable=True)
    created_at   = Column(DateTime(timezone=True), default=_now)
    started_at   = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)


class TeamSession(Base):
    """A coordinated AI team session (e.g. 'Improve AI OS')."""
    __tablename__ = "team_sessions"

    id              = Column(String, primary_key=True, default=_uuid)
    goal            = Column(Text, nullable=False)
    status          = Column(String, nullable=False, default="planning")
    # planning | active | paused | completed | failed
    plan            = Column(Text, nullable=True)
    agents_assigned = Column(JSON, nullable=False, default=list)
    task_count      = Column(Integer, nullable=False, default=0)
    completed_tasks = Column(Integer, nullable=False, default=0)
    model_used      = Column(String, nullable=True)
    tokens          = Column(Integer, nullable=True)
    created_at      = Column(DateTime(timezone=True), default=_now)
    updated_at      = Column(DateTime(timezone=True), default=_now, onupdate=_now)


class AgentMessage(Base):
    """Collaboration messages between virtual agents in a team session."""
    __tablename__ = "agent_messages"

    id           = Column(String, primary_key=True, default=_uuid)
    session_id   = Column(String, nullable=True)
    from_agent   = Column(String, nullable=False)   # agent id or "orchestrator" or "human"
    to_agent     = Column(String, nullable=True)    # agent id or "all"
    message_type = Column(String, nullable=False, default="info")
    # task | review | approve | reject | info | error | plan
    content      = Column(Text, nullable=False)
    task_id      = Column(String, nullable=True)
    patch_id     = Column(String, nullable=True)
    created_at   = Column(DateTime(timezone=True), default=_now)


# ---------------------------------------------------------------------------
# Users + Authentication
# ---------------------------------------------------------------------------

class User(Base):
    """Application user — used for authentication and authorization."""
    __tablename__ = "users"

    id              = Column(String, primary_key=True, default=_uuid)
    email           = Column(String, nullable=False, unique=True, index=True)
    hashed_password = Column(String, nullable=False)
    display_name    = Column(String, nullable=False, default="")
    role            = Column(String, nullable=False, default="user")  # user | admin
    is_active       = Column(Boolean, nullable=False, default=True)
    org_id          = Column(String, nullable=True)  # soft ref → organizations.id (primary org)
    created_at      = Column(DateTime(timezone=True), default=_now)
    last_login_at   = Column(DateTime(timezone=True), nullable=True)


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------

class Notification(Base):
    """System notification for workflow events, patch status, errors, etc."""
    __tablename__ = "notifications"

    id         = Column(String, primary_key=True, default=_uuid)
    user_id    = Column(String, nullable=True)   # None = broadcast
    type       = Column(String, nullable=False)   # run_complete|patch_created|error|info
    title      = Column(String, nullable=False)
    body       = Column(Text, nullable=False, default="")
    link       = Column(String, nullable=True)    # relative URL to navigate to
    is_read    = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), default=_now)


# ---------------------------------------------------------------------------
# Self-Evolution Engine
# ---------------------------------------------------------------------------

class ProjectHealthSnapshot(Base):
    """Point-in-time snapshot of project health metrics."""
    __tablename__ = "project_health_snapshots"

    id                = Column(String, primary_key=True, default=_uuid)
    completion_pct    = Column(Float,   nullable=False, default=0.0)
    technical_debt    = Column(String,  nullable=False, default="low")  # low|medium|high|critical
    critical_bugs     = Column(Integer, nullable=False, default=0)
    estimated_release = Column(String,  nullable=True)   # ISO date string "YYYY-MM"
    file_count        = Column(Integer, nullable=False, default=0)
    line_count        = Column(Integer, nullable=False, default=0)
    open_patches      = Column(Integer, nullable=False, default=0)
    total_suggestions = Column(Integer, nullable=False, default=0)
    ts_errors         = Column(Integer, nullable=False, default=0)
    py_issues         = Column(Integer, nullable=False, default=0)
    summary           = Column(Text,    nullable=True)
    model_used        = Column(String,  nullable=True)
    created_at        = Column(DateTime(timezone=True), default=_now)


class LessonsLearned(Base):
    """AI-generated learnings after each workflow run or milestone."""
    __tablename__ = "lessons_learned"

    id               = Column(String, primary_key=True, default=_uuid)
    workflow_run_id  = Column(String, nullable=True)
    factory_id       = Column(String, nullable=True)
    what_improved    = Column(Text, nullable=False, default="")
    what_to_improve  = Column(Text, nullable=False, default="")
    arch_changes     = Column(Text, nullable=True)
    workflow_changes = Column(Text, nullable=True)
    model_used       = Column(String, nullable=True)
    created_at       = Column(DateTime(timezone=True), default=_now)


class ImprovementSuggestion(Base):
    """AI-generated improvement suggestions (features, refactors, security, perf)."""
    __tablename__ = "improvement_suggestions"

    id               = Column(String, primary_key=True, default=_uuid)
    title            = Column(String,  nullable=False)
    description      = Column(Text,    nullable=False, default="")
    category         = Column(String,  nullable=False, default="feature")  # feature|refactor|security|perf|ux
    reason           = Column(Text,    nullable=False, default="")
    expected_benefit = Column(Text,    nullable=False, default="")
    difficulty       = Column(String,  nullable=False, default="medium")   # easy|medium|hard
    priority         = Column(Integer, nullable=False, default=5)          # 1-10
    estimated_hours  = Column(Float,   nullable=True)
    roi_score        = Column(Float,   nullable=True)   # 0-100
    status           = Column(String,  nullable=False, default="pending")  # pending|in_progress|done|dismissed
    is_quick_win     = Column(Boolean, nullable=False, default=False)
    created_at       = Column(DateTime(timezone=True), default=_now)


class EvolutionReport(Base):
    """AI-generated executive / CEO report."""
    __tablename__ = "evolution_reports"

    id              = Column(String,  primary_key=True, default=_uuid)
    report_type     = Column(String,  nullable=False, default="daily")  # daily|weekly|milestone
    title           = Column(String,  nullable=False)
    content_md      = Column(Text,    nullable=False, default="")
    files_changed   = Column(JSON,    nullable=False, default=list)
    features_done   = Column(JSON,    nullable=False, default=list)
    risks           = Column(JSON,    nullable=False, default=list)
    remaining_work  = Column(Text,    nullable=True)
    est_launch_date = Column(String,  nullable=True)
    model_used      = Column(String,  nullable=True)
    created_at      = Column(DateTime(timezone=True), default=_now)


class QualitySnapshot(Base):
    """Periodic code quality metric snapshot for trend tracking."""
    __tablename__ = "quality_snapshots"

    id              = Column(String,  primary_key=True, default=_uuid)
    ts_errors       = Column(Integer, nullable=False, default=0)
    py_issues       = Column(Integer, nullable=False, default=0)
    build_ok        = Column(Boolean, nullable=False, default=True)
    total_files     = Column(Integer, nullable=False, default=0)
    total_lines     = Column(Integer, nullable=False, default=0)
    duplicate_score = Column(Float,   nullable=True)   # 0-100 (lower is better)
    complexity_avg  = Column(Float,   nullable=True)
    security_issues = Column(Integer, nullable=False, default=0)
    dep_issues      = Column(Integer, nullable=False, default=0)
    created_at      = Column(DateTime(timezone=True), default=_now)


class ArchitectureAnalysis(Base):
    """AI architecture review — scored and stored for historical comparison."""
    __tablename__ = "architecture_analyses"

    id              = Column(String, primary_key=True, default=_uuid)
    risk_score      = Column(Float,  nullable=False, default=0.0)   # 0-100
    maintainability = Column(Float,  nullable=False, default=0.0)   # 0-100
    performance     = Column(Float,  nullable=False, default=0.0)   # 0-100
    security_score  = Column(Float,  nullable=False, default=0.0)   # 0-100
    issues          = Column(JSON,   nullable=False, default=list)   # list[str]
    suggestions     = Column(JSON,   nullable=False, default=list)   # list[str]
    full_analysis   = Column(Text,   nullable=True)
    model_used      = Column(String, nullable=True)
    created_at      = Column(DateTime(timezone=True), default=_now)


# ---------------------------------------------------------------------------
# Organization — Business Engine Phase 1
# ---------------------------------------------------------------------------

class Organization(Base):
    """Multi-tenant organization — root of the Business Engine hierarchy."""
    __tablename__ = "organizations"

    id          = Column(String,  primary_key=True, default=_uuid)
    name        = Column(String,  nullable=False)
    slug        = Column(String,  nullable=False, unique=True, index=True)
    description = Column(Text,    nullable=False, default="")
    plan        = Column(String,  nullable=False, default="free")  # free | pro | enterprise
    owner_id    = Column(String,  ForeignKey("users.id"), nullable=False)
    max_members = Column(Integer, nullable=False, default=5)
    is_active   = Column(Boolean, nullable=False, default=True)
    avatar_url  = Column(String,  nullable=True)
    website_url = Column(String,  nullable=True)
    meta        = Column("metadata", JSON, nullable=False, default=dict)
    created_at  = Column(DateTime(timezone=True), default=_now)
    updated_at  = Column(DateTime(timezone=True), default=_now, onupdate=_now)

    members = relationship("OrganizationMember", back_populates="organization",
                           cascade="all, delete-orphan")
    invites = relationship("OrganizationInvite", back_populates="organization",
                           cascade="all, delete-orphan")


class OrganizationMember(Base):
    """Membership record — links a User to an Organization with a role."""
    __tablename__ = "organization_members"

    id        = Column(String,  primary_key=True, default=_uuid)
    org_id    = Column(String,  ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    user_id   = Column(String,  ForeignKey("users.id",         ondelete="CASCADE"), nullable=False)
    role      = Column(String,  nullable=False, default="developer")
    # owner | admin | developer | viewer
    joined_at = Column(DateTime(timezone=True), default=_now)

    organization = relationship("Organization", back_populates="members")
    user         = relationship("User")


class OrganizationInvite(Base):
    """Pending invite — accepted via one-time token link."""
    __tablename__ = "organization_invites"

    id          = Column(String,  primary_key=True, default=_uuid)
    org_id      = Column(String,  ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    email       = Column(String,  nullable=False)
    role        = Column(String,  nullable=False, default="developer")
    invited_by  = Column(String,  ForeignKey("users.id"), nullable=False)
    token       = Column(String,  nullable=False, unique=True)
    status      = Column(String,  nullable=False, default="pending")
    # pending | accepted | revoked | expired
    expires_at  = Column(DateTime(timezone=True), nullable=False)
    accepted_at = Column(DateTime(timezone=True), nullable=True)
    created_at  = Column(DateTime(timezone=True), default=_now)

    organization = relationship("Organization", back_populates="invites")


# ---------------------------------------------------------------------------
# AIOS Executor — Phase 1
# ---------------------------------------------------------------------------

class ExecutorTask(Base):
    """
    Full pipeline task: Instruction → Plan → Patch → Approval → Apply → Test → Report.
    Links to an existing DevPatch for the apply/rollback flow.
    """
    __tablename__ = "executor_tasks"

    id             = Column(String,  primary_key=True, default=_uuid)
    title          = Column(String,  nullable=False)
    instruction    = Column(Text,    nullable=False)
    status         = Column(String,  nullable=False, default="pending")
    # pending | planning | planned | patching | awaiting_approval
    # | applying | applied | testing | completed | cancelled | failed
    priority       = Column(Integer, nullable=False, default=5)   # 1–10
    provider       = Column(String,  nullable=False, default="auto")
    # auto | anthropic | google | openai | ollama
    model          = Column(String,  nullable=True)
    created_by     = Column(String,  nullable=True)               # user_id
    assigned_agent = Column(String,  nullable=False, default="virtual-claude-dev")
    target_files   = Column(JSON,    nullable=False, default=list) # suggested file paths
    plan_content   = Column(Text,    nullable=True)               # AI-generated plan markdown
    patch_id       = Column(String,  ForeignKey("dev_patches.id"), nullable=True)
    test_result    = Column(JSON,    nullable=True)               # {ok, checks, summary}
    report         = Column(Text,    nullable=True)               # final markdown report
    error_msg      = Column(Text,    nullable=True)
    created_at     = Column(DateTime(timezone=True), default=_now)
    updated_at     = Column(DateTime(timezone=True), default=_now, onupdate=_now)

    patch = relationship("DevPatch")
