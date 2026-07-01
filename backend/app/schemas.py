"""
Pydantic schemas — match TypeScript types in website/types/index.ts.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import Integer


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
    costUsd:       float | None = None
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

class AgentStatItem(BaseModel):
    agentId:   str
    agentName: str
    icon:      str
    runsToday: int


class DashboardOut(BaseModel):
    # Workflow stats
    totalRunsToday:         int
    tokensUsedToday:        int
    activeWorkflows:        int
    successRateToday:       float
    avgResponseMs:          int
    queueDepth:             int
    memoryUsedMb:           float
    costToday:              float
    memoryItems:            int
    activeFactories:        int
    errorsToday:            int
    # Agent stats
    agentRunsToday:         int
    virtualClaudeRunsToday: int
    realClaudeRunsToday:    int
    claudeMode:             str
    topAgents:              list[AgentStatItem]


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
    apiKeys:            dict[str, str]
    claudeMode:         str = "auto"

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
    claudeMode:         str | None = None


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


# ---------------------------------------------------------------------------
# Chat sessions
# ---------------------------------------------------------------------------

class ChatSessionCreate(BaseModel):
    factory_id: str | None = None
    title:      str = "新しいチャット"


class ChatSessionOut(BaseModel):
    id:          str
    factoryId:   str | None
    title:       str
    model:       str
    totalTokens: int
    totalCost:   float
    createdAt:   str
    updatedAt:   str
    messageCount: int = 0

    model_config = ConfigDict(from_attributes=True)


class ChatMessageCreate(BaseModel):
    role:    str
    content: str


class ChatMessageOut(BaseModel):
    id:        str
    sessionId: str
    role:      str
    content:   str
    model:     str | None
    tokens:    int | None
    costUsd:   float | None
    createdAt: str

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Virtual Agents
# ---------------------------------------------------------------------------

class VirtualAgentOut(BaseModel):
    """Returned by GET /api/agents (list) — no systemPrompt for security."""
    id:                str
    name:              str
    nameJa:            str
    role:              str
    category:          str | None
    description:       str
    icon:              str
    preferredProvider: str
    preferredModel:    str | None
    memoryScope:       str
    outputFormat:      str
    routingKeywords:   list[str]
    priority:          int
    version:           int
    isEnabled:         bool
    isBuiltin:         bool
    createdAt:         str
    updatedAt:         str
    totalRuns:         int = 0
    successRate:       float = 100.0
    lastRunAt:         str | None = None

    model_config = ConfigDict(from_attributes=True)


class VirtualAgentDetail(VirtualAgentOut):
    """Full detail — includes systemPrompt. Returned by GET/POST/PATCH single-agent endpoints."""
    systemPrompt: str


class VirtualAgentCreate(BaseModel):
    """POST /api/agents — create a new agent."""
    id:                str           # kebab-case, user-defined
    name:              str
    nameJa:            str
    role:              str
    category:          str | None = None
    description:       str = ""
    icon:              str = "🤖"
    systemPrompt:      str
    preferredProvider: str = "auto"
    preferredModel:    str | None = None
    memoryScope:       str = "global"
    outputFormat:      str = "markdown"
    routingKeywords:   list[str]
    priority:          int = 10


class VirtualAgentUpdate(BaseModel):
    """PATCH /api/agents/{id} — partial update."""
    name:              str | None = None
    nameJa:            str | None = None
    role:              str | None = None
    category:          str | None = None
    description:       str | None = None
    icon:              str | None = None
    systemPrompt:      str | None = None
    preferredProvider: str | None = None
    preferredModel:    str | None = None
    memoryScope:       str | None = None
    outputFormat:      str | None = None
    routingKeywords:   list[str] | None = None
    priority:          int | None = None
    isEnabled:         bool | None = None


class AgentTestRequest(BaseModel):
    input: str


class AgentTestResult(BaseModel):
    agentId:       str
    agentName:     str
    modelUsed:     str
    isRealClaude:  bool
    output:        str
    tokensUsed:    int
    costUsd:       float
    durationMs:    int
    success:       bool
    executionId:   str


class AgentRunRequest(BaseModel):
    input:      str
    factory_id: str | None = None
    session_id: str | None = None


class AgentRunOut(BaseModel):
    agentId:       str
    agentName:     str
    modelUsed:     str
    isRealClaude:  bool
    output:        str
    tokensUsed:    int
    costUsd:       float
    executionId:   str


# ---------------------------------------------------------------------------
# Virtual Claude Dev Agent
# ---------------------------------------------------------------------------

class DevFileNode(BaseModel):
    name:     str
    path:     str
    type:     Literal["file", "dir"]
    size:     int | None = None
    children: list["DevFileNode"] | None = None

DevFileNode.model_rebuild()


class DevInspectRequest(BaseModel):
    path: str


class DevInspectOut(BaseModel):
    path:    str
    content: str
    size:    int
    lines:   int


class DevChatRequest(BaseModel):
    messages: list[ChatMessage]
    model:    str | None = None


class DevPlanRequest(BaseModel):
    task:    str
    context: str = ""
    files:   list[str] = []
    model:   str | None = None


class DevPatchRequest(BaseModel):
    task:      str
    file_path: str
    context:   str = ""
    model:     str | None = None


class DevPatchOut(BaseModel):
    id:              str
    title:           str
    filePath:        str
    originalContent: str
    newContent:      str
    aiExplanation:   str
    riskLevel:       str
    status:          str
    createdAt:       str
    appliedAt:       str | None = None


class DevApplyRequest(BaseModel):
    patchId:   str
    confirmed: bool = False


class DevApplyOut(BaseModel):
    ok:      bool
    message: str
    patchId: str


class DevHistoryOut(BaseModel):
    id:        str
    action:    str
    summary:   str
    filePath:  str | None = None
    patchId:   str | None = None
    modelUsed: str | None = None
    tokens:    int | None = None
    createdAt: str


# ---------------------------------------------------------------------------
# Auto Debugger
# ---------------------------------------------------------------------------

class DebugStatusOut(BaseModel):
    uptime_ok:    bool
    db_ok:        bool
    error_rate:   float       # errors_today / max(runs_today, 1)
    errors_today: int
    runs_today:   int
    failed_runs:  list[dict[str, Any]]
    debug_sessions_total: int


class DebugLogEntry(BaseModel):
    id:        str
    timestamp: str
    level:     str     # ERROR | WARNING | INFO
    message:   str
    source:    str     # workflow | frontend | api | manual
    detail:    str | None = None


class DebugAnalyzeRequest(BaseModel):
    error_text: str
    context:    str = ""
    source:     str = "manual"    # manual|workflow|api|frontend
    severity:   str = "medium"    # low|medium|high|critical


class DebugPatchRequest(BaseModel):
    session_id: str
    file_path:  str
    context:    str = ""


class DebugSessionOut(BaseModel):
    id:           str
    errorText:    str
    errorType:    str | None
    severity:     str
    source:       str
    rootCause:    str | None
    suggestedFix: str | None
    fullAnalysis: str | None
    patchId:      str | None
    modelUsed:    str | None
    status:       str
    createdAt:    str


# ---------------------------------------------------------------------------
# Virtual Claude Team
# ---------------------------------------------------------------------------

class AgentTaskOut(BaseModel):
    id:          str
    sessionId:   str | None
    agentId:     str | None
    title:       str
    description: str
    status:      str
    priority:    int
    dependsOn:   list[str]
    filePath:    str | None
    patchId:     str | None
    output:      str | None
    errorMsg:    str | None
    tokensUsed:  int | None
    createdAt:   str
    startedAt:   str | None
    completedAt: str | None


class AgentTaskCreate(BaseModel):
    title:       str
    description: str = ""
    agent_id:    str | None = None
    session_id:  str | None = None
    file_path:   str | None = None
    priority:    int = 5
    depends_on:  list[str] = []


class AgentTaskUpdate(BaseModel):
    status:    str | None = None
    priority:  int | None = None
    agent_id:  str | None = None
    output:    str | None = None
    error_msg: str | None = None


class TeamSessionOut(BaseModel):
    id:             str
    goal:           str
    status:         str
    plan:           str | None
    agentsAssigned: list[str]
    taskCount:      int
    completedTasks: int
    modelUsed:      str | None
    tokens:         int | None
    createdAt:      str
    updatedAt:      str


class AgentMessageOut(BaseModel):
    id:          str
    sessionId:   str | None
    fromAgent:   str
    toAgent:     str | None
    messageType: str
    content:     str
    taskId:      str | None
    patchId:     str | None
    createdAt:   str


class TeamStatusOut(BaseModel):
    active_agents:      int
    idle_agents:        int
    total_agents:       int
    pending_tasks:      int
    in_progress_tasks:  int
    completed_tasks:    int
    failed_tasks:       int
    total_sessions:     int
    total_tokens:       int
    recent_activity:    list[str]


class ImproveRequest(BaseModel):
    goal:      str = "Inspect AI OS source code and generate an improvement roadmap"
    max_tasks: int = 8


class CollaborateRequest(BaseModel):
    goal:       str
    context:    str = ""
    max_phases: int = 5


# ---------------------------------------------------------------------------
# Organization — Business Engine Phase 1
# ---------------------------------------------------------------------------

class OrgCreate(BaseModel):
    name:        str
    description: str = ""


class OrgUpdate(BaseModel):
    name:        str | None = None
    description: str | None = None
    plan:        str | None = None
    avatar_url:  str | None = None
    website_url: str | None = None


class OrgOut(BaseModel):
    id:           str
    name:         str
    slug:         str
    description:  str
    plan:         str
    owner_id:     str
    max_members:  int
    is_active:    bool
    avatar_url:   str | None
    website_url:  str | None
    member_count: int = 0
    created_at:   str
    updated_at:   str


class OrgMemberOut(BaseModel):
    user_id:      str
    email:        str
    display_name: str
    role:         str
    joined_at:    str


class OrgMemberUpdate(BaseModel):
    role: str  # admin | developer | viewer


class OrgInviteCreate(BaseModel):
    email: str
    role:  str = "developer"


class OrgInviteOut(BaseModel):
    id:         str
    org_id:     str
    email:      str
    role:       str
    invited_by: str
    status:     str
    expires_at: str
    created_at: str


class OrgAcceptInvite(BaseModel):
    token: str


# ---------------------------------------------------------------------------
# AIOS Executor — Phase 1
# ---------------------------------------------------------------------------

class ExecutorTaskCreate(BaseModel):
    title:        str
    instruction:  str
    target_files: list[str] = []
    priority:     int = 5
    provider:     str = "auto"   # auto | anthropic | google | openai | ollama
    model:        str | None = None


class ExecutorTaskOut(BaseModel):
    id:             str
    title:          str
    instruction:    str
    status:         str
    priority:       int
    provider:       str
    model:          str | None
    created_by:     str | None
    assigned_agent: str
    target_files:   list[str]
    plan_content:   str | None
    patch_id:       str | None
    test_result:    dict | None
    report:         str | None
    error_msg:      str | None
    created_at:     str
    updated_at:     str


class ExecutorApplyRequest(BaseModel):
    confirmed: bool = False


class ExecutorTestRequest(BaseModel):
    run_import_check: bool = True
    run_ts_check:     bool = False   # reserved for future; tsc is slow


class ExecutorPlanRequest(BaseModel):
    extra_context: str = ""


class ExecutorPatchRequest(BaseModel):
    target_file:   str          # which file to patch
    extra_context: str = ""
class BusinessClientCreate(BaseModel):
    name: str
    company: str | None = None
    email: str | None = None
    phone: str | None = None


class BusinessClientOut(BaseModel):
    id: int
    uuid: str
    name: str
    company: str | None = None
    email: str | None = None
    phone: str | None = None
    status: str

    model_config = ConfigDict(from_attributes=True)
class BusinessClientUpdate(BaseModel):
    name: str | None = None
    company: str | None = None
    email: str | None = None
    phone: str | None = None
    status: str | None = None    
class BusinessDealCreate(BaseModel):
    client_id: int
    title: str
    status: str | None = "lead"
    amount: float |None = 0
    expected_close_date: datetime | None = None
    memo: str | None = None


class BusinessDealUpdate(BaseModel):
    title: str | None = None
    status: str | None = None
    amount: float | None = None
    expected_close_date: datetime | None = None
    memo: str | None = None


class BusinessDealOut(BaseModel):
    id: int
    uuid: str
    client_id: int
    title: str
    status: str
    amount: float | None = None
    expected_close_date: datetime | None = None
    memo: str | None = None

    model_config = ConfigDict(from_attributes=True)
class BusinessTaskCreate(BaseModel):
    deal_id: int
    title: str
    description: str | None = None
    status: str = "todo"
    due_date: datetime | None = None


class BusinessTaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None
    due_date: datetime | None = None


class BusinessTaskOut(BusinessTaskCreate):
    id: int
    result_text: str | None = None
    executed_at: datetime | None = None
    error_msg: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)  
class BusinessWorkflowRequest(BaseModel):
    deal_id: int
    workflow_type: str = "standard_sales"             