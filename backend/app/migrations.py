"""
Lightweight startup migrations — adds missing indexes to the SQLite DB.
Uses CREATE INDEX IF NOT EXISTS so it is safe to run on every startup.
Column additions use try/except because SQLite lacks ALTER TABLE ADD COLUMN IF NOT EXISTS.
"""
from __future__ import annotations

import logging
from sqlalchemy.ext.asyncio import AsyncEngine

logger = logging.getLogger("aios.migrations")

# ALTER TABLE migrations: run once, safe to retry (error on duplicate = ignored)
_ALTER_COLUMNS = [
    # Business Engine Phase 1 — org_id on existing users table
    "ALTER TABLE users ADD COLUMN org_id TEXT",
]


_INDEXES = [
    # workflow_runs: the most-queried table (dashboard, activity, runs list)
    "CREATE INDEX IF NOT EXISTS ix_workflow_runs_factory_id ON workflow_runs(factory_id)",
    "CREATE INDEX IF NOT EXISTS ix_workflow_runs_workflow_id ON workflow_runs(workflow_id)",
    "CREATE INDEX IF NOT EXISTS ix_workflow_runs_status ON workflow_runs(status)",
    "CREATE INDEX IF NOT EXISTS ix_workflow_runs_started_at ON workflow_runs(started_at)",
    # workflows
    "CREATE INDEX IF NOT EXISTS ix_workflows_factory_id ON workflows(factory_id)",
    "CREATE INDEX IF NOT EXISTS ix_workflows_status ON workflows(status)",
    # memory_entries
    "CREATE INDEX IF NOT EXISTS ix_memory_entries_factory_id ON memory_entries(factory_id)",
    "CREATE INDEX IF NOT EXISTS ix_memory_entries_created_at ON memory_entries(created_at)",
    # activity
    "CREATE INDEX IF NOT EXISTS ix_activity_timestamp ON activity(timestamp)",
    "CREATE INDEX IF NOT EXISTS ix_activity_factory_id ON activity(factory_id)",
    # virtual_agents + executions
    "CREATE INDEX IF NOT EXISTS ix_agent_executions_agent_id ON agent_executions(agent_id)",
    "CREATE INDEX IF NOT EXISTS ix_agent_executions_created_at ON agent_executions(created_at)",
    # dev patches
    "CREATE INDEX IF NOT EXISTS ix_dev_patches_status ON dev_patches(status)",
    "CREATE INDEX IF NOT EXISTS ix_dev_patches_created_at ON dev_patches(created_at)",
    # debug sessions
    "CREATE INDEX IF NOT EXISTS ix_debug_sessions_created_at ON debug_sessions(created_at)",
    "CREATE INDEX IF NOT EXISTS ix_debug_sessions_status ON debug_sessions(status)",
    # team
    "CREATE INDEX IF NOT EXISTS ix_agent_tasks_session_id ON agent_tasks(session_id)",
    "CREATE INDEX IF NOT EXISTS ix_agent_tasks_status ON agent_tasks(status)",
    "CREATE INDEX IF NOT EXISTS ix_agent_messages_session_id ON agent_messages(session_id)",
    "CREATE INDEX IF NOT EXISTS ix_team_sessions_status ON team_sessions(status)",
    "CREATE INDEX IF NOT EXISTS ix_team_sessions_created_at ON team_sessions(created_at)",
    # chat
    "CREATE INDEX IF NOT EXISTS ix_chat_messages_session_id ON chat_messages(session_id)",
    "CREATE INDEX IF NOT EXISTS ix_chat_sessions_created_at ON chat_sessions(created_at)",
    # evolution engine
    "CREATE INDEX IF NOT EXISTS ix_project_health_created_at ON project_health_snapshots(created_at)",
    "CREATE INDEX IF NOT EXISTS ix_lessons_learned_created_at ON lessons_learned(created_at)",
    "CREATE INDEX IF NOT EXISTS ix_lessons_learned_factory_id ON lessons_learned(factory_id)",
    "CREATE INDEX IF NOT EXISTS ix_improvement_suggestions_status ON improvement_suggestions(status)",
    "CREATE INDEX IF NOT EXISTS ix_improvement_suggestions_roi ON improvement_suggestions(roi_score)",
    "CREATE INDEX IF NOT EXISTS ix_improvement_suggestions_category ON improvement_suggestions(category)",
    "CREATE INDEX IF NOT EXISTS ix_evolution_reports_type ON evolution_reports(report_type)",
    "CREATE INDEX IF NOT EXISTS ix_evolution_reports_created_at ON evolution_reports(created_at)",
    "CREATE INDEX IF NOT EXISTS ix_quality_snapshots_created_at ON quality_snapshots(created_at)",
    "CREATE INDEX IF NOT EXISTS ix_arch_analyses_created_at ON architecture_analyses(created_at)",
    # Organization — Business Engine Phase 1
    "CREATE INDEX IF NOT EXISTS ix_organizations_owner_id   ON organizations(owner_id)",
    "CREATE INDEX IF NOT EXISTS ix_organizations_plan       ON organizations(plan)",
    "CREATE INDEX IF NOT EXISTS ix_organizations_is_active  ON organizations(is_active)",
    "CREATE INDEX IF NOT EXISTS ix_org_members_org_id       ON organization_members(org_id)",
    "CREATE INDEX IF NOT EXISTS ix_org_members_user_id      ON organization_members(user_id)",
    "CREATE INDEX IF NOT EXISTS ix_org_invites_org_id       ON organization_invites(org_id)",
    "CREATE INDEX IF NOT EXISTS ix_org_invites_email        ON organization_invites(email)",
    "CREATE INDEX IF NOT EXISTS ix_org_invites_token        ON organization_invites(token)",
    "CREATE INDEX IF NOT EXISTS ix_org_invites_status       ON organization_invites(status)",
    "CREATE INDEX IF NOT EXISTS ix_users_org_id             ON users(org_id)",
    # Executor — Phase 1
    "CREATE INDEX IF NOT EXISTS ix_executor_tasks_status     ON executor_tasks(status)",
    "CREATE INDEX IF NOT EXISTS ix_executor_tasks_created_by ON executor_tasks(created_by)",
    "CREATE INDEX IF NOT EXISTS ix_executor_tasks_created_at ON executor_tasks(created_at)",
    "CREATE INDEX IF NOT EXISTS ix_executor_tasks_patch_id   ON executor_tasks(patch_id)",
]


async def run_migrations(engine: AsyncEngine) -> None:
    """Run column additions (idempotent) then index creations."""
    sa = __import__("sqlalchemy")
    async with engine.begin() as conn:
        # Column additions — SQLite errors on duplicate; silently ignore
        for sql in _ALTER_COLUMNS:
            try:
                await conn.execute(sa.text(sql))
            except Exception:
                pass  # column already exists
        # Indexes — all use IF NOT EXISTS
        for sql in _INDEXES:
            await conn.execute(sa.text(sql))
