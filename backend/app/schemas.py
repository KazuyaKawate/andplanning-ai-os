"""
Pydantic schemas — match TypeScript types in website/types/index.ts.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Shared
# ---------------------------------------------------------------------------

class WorkflowStep(BaseModel):
    id:         str
    name:       str
    status:     Literal["pending", "running", "done", "error"]
    duration_ms: int | None = Field(None, alias="durationMs")

    model_config = ConfigDict(populate_by_name=True)


class WorkflowInputField(BaseModel):
    id:          str
    label:       str
    type:        Literal["text", "textarea", "select"]
    placeholder: str = ""
    required:    bool = False
    options:     list[str] = []


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------

class FactoryOut(BaseModel):
    id:              str
    name:            str
    nameJa:          str
    icon:            str
    accentColor:     str
    status:          str
    activeWorkflows: int = 0
    completedToday:  int = 0
    queuedTasks:     int = 0
    errorCount:      int = 0
    memoryItems:     int = 0
    lastActivity:    str

    model_config = ConfigDict(from_attributes=True)


class FactorySettingsOut(BaseModel):
    factoryId:        str
    model:            str
    temperature:      float
    maxTokens:        int
    systemPrompt:     str
    autoSaveMemory:   bool
    notifyOnComplete: bool

    model_config = ConfigDict(from_attributes=True)


class FactorySettingsPatch(BaseModel):
    model:            str | None = None
    temperature:      float | None = None
    maxTokens:        int | None = None
    systemPrompt:     str | None = None
    autoSaveMemory:   bool | None = None
    notifyOnComplete: bool | None = None


# ---------------------------------------------------------------------------
# Workflow
# ---------------------------------------------------------------------------

class WorkflowOut(BaseModel):
    id:           str
    factoryId:    str
    name:         str
    nameJa:       str
    description:  str
    status:       str
    stepCount:    int
    avgDurationMs: int
    totalRuns:    int
    successRate:  float
    lastRunAt:    str | None
    tags:         list[str]

    model_config = ConfigDict(from_attributes=True)


class WorkflowSchemaOut(BaseModel):
    fields: list[WorkflowInputField]


# ---------------------------------------------------------------------------
# WorkflowRun
# ---------------------------------------------------------------------------

class WorkflowRunOut(BaseModel):
    id:            str
    workflowId:    str
    factoryId:     str
    workflowName:  str
    status:        str
    model:         str
    startedAt:     str
    endedAt:       str | None
    inputSummary:  str
    outputSummary: str | None
    tokensUsed:    int | None
    steps:         list[WorkflowStep]

    model_config = ConfigDict(from_attributes=True)


class StartRunRequest(BaseModel):
    inputs: dict[str, str] = {}


class StartRunResponse(BaseModel):
    runId:  str
    status: str = "running"


class RunControlResponse(BaseModel):
    ok: bool = True


# ---------------------------------------------------------------------------
# Activity
# ---------------------------------------------------------------------------

class ActivityItemOut(BaseModel):
    id:          str
    type:        str
    factoryId:   str
    factoryName: str
    factoryIcon: str
    message:     str
    detail:      str | None
    timestamp:   str

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Memory
# ---------------------------------------------------------------------------

class MemoryEntryOut(BaseModel):
    id:         str
    factoryId:  str
    workflowId: str | None
    title:      str
    summary:    str
    model:      str
    tags:       list[str]
    size:       int
    createdAt:  str

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

class DashboardOut(BaseModel):
    totalRunsToday:   int
    tokensUsedToday:  int
    activeWorkflows:  int
    successRate:      float
    avgResponseMs:    int
    queueDepth:       int
    memoryUsedMb:     float
    costToday:        float


# ---------------------------------------------------------------------------
# OS Settings
# ---------------------------------------------------------------------------

class OsSettingsOut(BaseModel):
    defaultModel:       str
    fallbackModel:      str
    maxConcurrentRuns:  int
    memoryRetentionDays: int
    notifyOnComplete:   bool
    notifyOnError:      bool
    theme:              str
    language:           str
    apiKeys: dict[str, str]

    model_config = ConfigDict(from_attributes=True)


class OsSettingsPatch(BaseModel):
    defaultModel:       str | None = None
    fallbackModel:      str | None = None
    maxConcurrentRuns:  int | None = None
    memoryRetentionDays: int | None = None
    notifyOnComplete:   bool | None = None
    notifyOnError:      bool | None = None
    theme:              str | None = None
    language:           str | None = None
    apiKeys:            dict[str, str] | None = None


# ---------------------------------------------------------------------------
# Models list
# ---------------------------------------------------------------------------

class ModelOptionOut(BaseModel):
    id:            str
    name:          str
    provider:      Literal["openai", "anthropic", "google"]
    maxTokens:     int
    contextWindow: int


# ---------------------------------------------------------------------------
# Chat  (SSE streaming)
# ---------------------------------------------------------------------------

class ChatMessage(BaseModel):
    role:    Literal["system", "user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    messages:    list[ChatMessage]
    model:       str | None = None
    temperature: float = 0.7
    max_tokens:  int = 4096
    factory_id:  str | None = None    # if set, uses factory's preferred model + system prompt

    # Output metadata written to memory after completion
    save_memory: bool = False
    memory_title: str | None = None


# ---------------------------------------------------------------------------
# Factory outputs / knowledge  (simplified)
# ---------------------------------------------------------------------------

class FactoryOutputOut(BaseModel):
    id:         str
    factoryId:  str
    workflowId: str
    title:      str
    content:    str
    format:     str
    size:       int
    createdAt:  str
    tags:       list[str]


class FactoryKnowledgeOut(BaseModel):
    id:          str
    factoryId:   str
    title:       str
    description: str
    type:        str
    size:        int
    updatedAt:   str
