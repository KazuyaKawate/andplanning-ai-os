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
  WorkflowInputField,
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
}
