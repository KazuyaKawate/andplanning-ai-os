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
    updated_at           = Column(DateTime(timezone=True), default=_now, onupdate=_now)
