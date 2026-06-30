/**
 * lib/api/types.ts
 *
 * API boundary types — define the contract between UI and backend.
 *
 * Rules:
 *   - These types describe what the runtime receives/sends, NOT internal UI state.
 *   - Domain types (Workflow, Factory, …) live in /types/index.ts and are re-used here.
 *   - Provider-specific fields belong in the adapter, not here.
 */

import type {
  DashboardMetrics, WorkflowRun, FactoryRuntime, ActivityItem, MemoryEntry,
  Workflow, FactoryOutput, FactoryKnowledge, FactorySettings,
  WorkflowInputField, OsSettings, ModelOption, ChatSession, ChatMessage,
  VirtualAgent, VirtualAgentDetail, AgentCreateRequest, AgentUpdateRequest, AgentTestResult,
  DevFileNode, DevPatch, DevHistoryEntry,
  DebugStatus, DebugLogEntry, DebugSession,
  AgentTask, TeamSession, AgentMessage, TeamStatus,
} from '@/types'

/* ======================================================================
   Generic response envelope
   All adapter functions return ApiResult<T>.
   ====================================================================== */

export type ApiResult<T> =
  | { ok: true;  data:  T }
  | { ok: false; error: string; status?: number }

/* ======================================================================
   Request / response shapes per resource
   ====================================================================== */

/** GET /api/dashboard */
export type GetDashboardResponse   = DashboardMetrics

/** GET /api/workflow-runs?limit=N&factoryId=X */
export type GetWorkflowRunsRequest = { limit?: number; factoryId?: string }
export type GetWorkflowRunsResponse = WorkflowRun[]

/** GET /api/workflows?factoryId=X */
export type GetWorkflowsRequest    = { factoryId?: string }
export type GetWorkflowsResponse   = Workflow[]

/** GET /api/workflows/:id/schema — input fields for the execution form */
export type GetWorkflowSchemaResponse = WorkflowInputField[]

/** POST /api/workflows/:id/runs — start a run */
export type StartRunRequest  = { inputs: Record<string, string> }
export type StartRunResponse = { runId: string; status: 'running' }

/** POST /api/runs/:runId/pause  → { ok } */
/** POST /api/runs/:runId/resume → { ok } */
/** POST /api/runs/:runId/stop   → { ok } */
export type RunControlResponse = { ok: true }

/** GET /api/runs/:runId — poll run state */
export type GetRunResponse = WorkflowRun

/** GET /api/factories */
export type GetFactoriesResponse   = FactoryRuntime[]

/** GET /api/factories/:id/outputs?limit=N */
export type GetFactoryOutputsRequest  = { limit?: number }
export type GetFactoryOutputsResponse = FactoryOutput[]

/** GET /api/factories/:id/knowledge */
export type GetFactoryKnowledgeResponse = FactoryKnowledge[]

/** GET /api/factories/:id/settings */
export type GetFactorySettingsResponse = FactorySettings

/** PATCH /api/factories/:id/settings */
export type PatchFactorySettingsRequest  = Partial<Omit<FactorySettings, 'factoryId'>>
export type PatchFactorySettingsResponse = FactorySettings

/** GET /api/activity?limit=N */
export type GetActivityRequest  = { limit?: number }
export type GetActivityResponse = ActivityItem[]

/** GET /api/memory?factoryId=X&search=S&limit=N */
export type GetMemoryRequest  = { factoryId?: string; search?: string; limit?: number }
export type GetMemoryResponse = MemoryEntry[]

/** GET /api/settings */
export type GetSettingsResponse = OsSettings

/** PATCH /api/settings */
export type PatchSettingsRequest  = Partial<OsSettings>
export type PatchSettingsResponse = OsSettings

/** GET /api/models */
export type GetModelsResponse = ModelOption[]

/* ======================================================================
   Adapter interface — implement this to connect any backend
   ====================================================================== */

export interface OsApiAdapter {
  /* Dashboard */
  getDashboard(): Promise<ApiResult<GetDashboardResponse>>

  /* Workflow runs */
  getWorkflowRuns(req?: GetWorkflowRunsRequest): Promise<ApiResult<GetWorkflowRunsResponse>>
  getWorkflowSchema(workflowId: string): Promise<ApiResult<GetWorkflowSchemaResponse>>
  startRun(workflowId: string, req: StartRunRequest): Promise<ApiResult<StartRunResponse>>
  pauseRun(runId: string): Promise<ApiResult<RunControlResponse>>
  resumeRun(runId: string): Promise<ApiResult<RunControlResponse>>
  stopRun(runId: string): Promise<ApiResult<RunControlResponse>>
  getRun(runId: string): Promise<ApiResult<GetRunResponse>>

  /* Workflows */
  getWorkflows(req?: GetWorkflowsRequest): Promise<ApiResult<GetWorkflowsResponse>>

  /* Factories */
  getFactories(): Promise<ApiResult<GetFactoriesResponse>>
  getFactoryOutputs(factoryId: string, req?: GetFactoryOutputsRequest): Promise<ApiResult<GetFactoryOutputsResponse>>
  getFactoryKnowledge(factoryId: string): Promise<ApiResult<GetFactoryKnowledgeResponse>>
  getFactorySettings(factoryId: string): Promise<ApiResult<GetFactorySettingsResponse>>
  patchFactorySettings(factoryId: string, req: PatchFactorySettingsRequest): Promise<ApiResult<PatchFactorySettingsResponse>>

  /* Activity & Memory */
  getActivity(req?: GetActivityRequest): Promise<ApiResult<GetActivityResponse>>
  getMemory(req?: GetMemoryRequest): Promise<ApiResult<GetMemoryResponse>>

  /* OS Settings & Models */
  getSettings(): Promise<ApiResult<GetSettingsResponse>>
  patchSettings(req: PatchSettingsRequest): Promise<ApiResult<PatchSettingsResponse>>
  getModels(): Promise<ApiResult<GetModelsResponse>>

  /* Chat Sessions */
  getChatSessions(params?: { limit?: number }): Promise<ApiResult<ChatSession[]>>
  createChatSession(req: { factoryId?: string; title?: string }): Promise<ApiResult<ChatSession>>
  getChatMessages(sessionId: string): Promise<ApiResult<ChatMessage[]>>
  deleteChatSession(sessionId: string): Promise<ApiResult<void>>

  /* Virtual Agents */
  getAgents(): Promise<ApiResult<VirtualAgent[]>>
  getAgent(agentId: string): Promise<ApiResult<VirtualAgentDetail>>
  createAgent(req: AgentCreateRequest): Promise<ApiResult<VirtualAgentDetail>>
  patchAgent(agentId: string, req: AgentUpdateRequest): Promise<ApiResult<VirtualAgentDetail>>
  deleteAgent(agentId: string): Promise<ApiResult<{ ok: boolean }>>
  enableAgent(agentId: string): Promise<ApiResult<VirtualAgentDetail>>
  disableAgent(agentId: string): Promise<ApiResult<VirtualAgentDetail>>
  testAgent(agentId: string, input: string): Promise<ApiResult<AgentTestResult>>

  /* Virtual Claude Dev */
  getDevFiles(): Promise<ApiResult<DevFileNode[]>>
  devInspect(path: string): Promise<ApiResult<{ path: string; content: string; size: number; lines: number }>>
  getDevPatches(status?: string): Promise<ApiResult<DevPatch[]>>
  applyPatch(patchId: string): Promise<ApiResult<{ ok: boolean; message: string; patchId: string }>>
  rejectPatch(patchId: string): Promise<ApiResult<{ ok: boolean; message: string; patchId: string }>>
  getDevHistory(limit?: number): Promise<ApiResult<DevHistoryEntry[]>>

  /* Auto Debugger */
  getDebugStatus(): Promise<ApiResult<DebugStatus>>
  getDebugLogs(limit?: number): Promise<ApiResult<DebugLogEntry[]>>
  getDebugHistory(limit?: number): Promise<ApiResult<DebugSession[]>>

  /* Virtual Claude Team */
  getTeamStatus(): Promise<ApiResult<TeamStatus>>
  getTeamTasks(params?: { status?: string; agentId?: string; sessionId?: string; limit?: number }): Promise<ApiResult<AgentTask[]>>
  createTeamTask(req: { title: string; description?: string; agentId?: string; sessionId?: string; filePath?: string; priority?: number }): Promise<ApiResult<AgentTask>>
  updateTeamTask(taskId: string, req: { status?: string; priority?: number; output?: string }): Promise<ApiResult<AgentTask>>
  getTeamMessages(params?: { sessionId?: string; limit?: number }): Promise<ApiResult<AgentMessage[]>>
  getTeamSessions(limit?: number): Promise<ApiResult<TeamSession[]>>
  getTeamSession(sessionId: string): Promise<ApiResult<{ session: TeamSession; tasks: AgentTask[]; messages: AgentMessage[] }>>
}
