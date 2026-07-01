/**
 * lib/api/adapters/rest.ts
 *
 * REST implementation of OsApiAdapter.
 * All requests go to the backend defined by NEXT_PUBLIC_API_BASE_URL.
 *
 * Architecture:
 *   Browser → REST Adapter → Your Backend → OpenAI / Anthropic / Google
 *
 * The backend holds provider API keys securely.
 * The frontend never touches them directly.
 *
 * Required env vars (set in .env.local):
 *   NEXT_PUBLIC_API_BASE_URL   — backend origin, e.g. http://localhost:8000
 *
 * Optional env vars:
 *   NEXT_PUBLIC_API_KEY        — Bearer token for your backend (if auth enabled)
 *   NEXT_PUBLIC_API_ADAPTER    — set to "mock" to use mockAdapter during dev
 */

import { getToken } from '@/lib/auth'
import type { OsApiAdapter, ApiResult } from '../types'

/* ======================================================================
   Config
   ====================================================================== */

const BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'
).replace(/\/$/, '')

/* ======================================================================
   Core fetch helper
   ====================================================================== */

async function request<T>(
  method:  'GET' | 'POST' | 'PATCH' | 'DELETE',
  path:    string,
  body?:   unknown,
): Promise<ApiResult<T>> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept:         'application/json',
    }
    const token = getToken()
    const apiKey = process.env.NEXT_PUBLIC_API_KEY
    if (token) {
      headers.Authorization = `Bearer ${token}`
    } else if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`
    }

    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })

    if (!res.ok) {
      // Try to parse a JSON error body { message: string } or fall back to status text
      let errorMsg: string
      try {
        const json = await res.json() as { message?: string; error?: string }
        errorMsg = json.message ?? json.error ?? `HTTP ${res.status}`
      } catch {
        errorMsg = res.statusText || `HTTP ${res.status}`
      }
      return { ok: false, error: errorMsg, status: res.status }
    }

    // 204 No Content — return empty object cast to T
    if (res.status === 204) return { ok: true, data: {} as T }

    const data = await res.json() as T
    return { ok: true, data }
  } catch (e) {
    // Network errors, CORS, etc.
    return {
      ok:    false,
      error: e instanceof Error ? e.message : String(e),
    }
  }
}

/* ======================================================================
   Query-string builder
   ====================================================================== */

function qs(params: Record<string, string | number | undefined>): string {
  const pairs = Object.entries(params)
    .filter((entry): entry is [string, string | number] => entry[1] !== undefined)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
  return pairs.length > 0 ? `?${pairs.join('&')}` : ''
}

/* ======================================================================
   REST adapter — 19 methods
   ====================================================================== */

export const restAdapter: OsApiAdapter = {

  /* ── Dashboard ────────────────────────────────────────────────────── */

  /** GET /api/dashboard */
  getDashboard: () =>
    request('GET', '/api/dashboard'),

  /* ── Workflow runs ────────────────────────────────────────────────── */

  /** GET /api/workflow-runs?limit=N&factoryId=X */
  getWorkflowRuns: ({ limit, factoryId } = {}) =>
    request('GET', `/api/workflow-runs${qs({ limit, factoryId })}`),

  /** GET /api/workflows/:id/schema */
  getWorkflowSchema: (workflowId) =>
    request('GET', `/api/workflows/${encodeURIComponent(workflowId)}/schema`),

  /** POST /api/workflows/:id/runs  body: { inputs } */
  startRun: (workflowId, req) =>
    request('POST', `/api/workflows/${encodeURIComponent(workflowId)}/runs`, req),

  /** POST /api/runs/:runId/pause */
  pauseRun: (runId) =>
    request('POST', `/api/runs/${encodeURIComponent(runId)}/pause`),

  /** POST /api/runs/:runId/resume */
  resumeRun: (runId) =>
    request('POST', `/api/runs/${encodeURIComponent(runId)}/resume`),

  /** POST /api/runs/:runId/stop */
  stopRun: (runId) =>
    request('POST', `/api/runs/${encodeURIComponent(runId)}/stop`),

  /** GET /api/runs/:runId */
  getRun: (runId) =>
    request('GET', `/api/runs/${encodeURIComponent(runId)}`),

  /* ── Workflows ────────────────────────────────────────────────────── */

  /** GET /api/workflows?factoryId=X */
  getWorkflows: ({ factoryId } = {}) =>
    request('GET', `/api/workflows${qs({ factoryId })}`),

  /* ── Factories ────────────────────────────────────────────────────── */

  /** GET /api/factories */
  getFactories: () =>
    request('GET', '/api/factories'),

  /** GET /api/factories/:id/outputs?limit=N */
  getFactoryOutputs: (factoryId, { limit } = {}) =>
    request('GET', `/api/factories/${encodeURIComponent(factoryId)}/outputs${qs({ limit })}`),

  /** GET /api/factories/:id/knowledge */
  getFactoryKnowledge: (factoryId) =>
    request('GET', `/api/factories/${encodeURIComponent(factoryId)}/knowledge`),

  /** GET /api/factories/:id/settings */
  getFactorySettings: (factoryId) =>
    request('GET', `/api/factories/${encodeURIComponent(factoryId)}/settings`),

  /** PATCH /api/factories/:id/settings  body: Partial<FactorySettings> */
  patchFactorySettings: (factoryId, req) =>
    request('PATCH', `/api/factories/${encodeURIComponent(factoryId)}/settings`, req),

  /* ── Activity & Memory ────────────────────────────────────────────── */

  /** GET /api/activity?limit=N */
  getActivity: ({ limit } = {}) =>
    request('GET', `/api/activity${qs({ limit })}`),

  /** GET /api/memory?factoryId=X&search=S&limit=N */
  getMemory: ({ factoryId, search, limit } = {}) =>
    request('GET', `/api/memory${qs({ factoryId, search, limit })}`),

  /* ── OS Settings & Models ─────────────────────────────────────────── */

  /** GET /api/settings */
  getSettings: () =>
    request('GET', '/api/settings'),

  /** PATCH /api/settings  body: Partial<OsSettings> */
  patchSettings: (req) =>
    request('PATCH', '/api/settings', req),

  /** GET /api/models */
  getModels: () =>
    request('GET', '/api/models'),

  /* ── Chat Sessions ────────────────────────────────────────────────── */

  /** GET /api/chat-sessions?limit=N */
  getChatSessions: ({ limit } = {}) =>
    request('GET', `/api/chat-sessions${qs({ limit })}`),

  /** POST /api/chat-sessions  body: { factoryId?, title? } */
  createChatSession: (req) =>
    request('POST', '/api/chat-sessions', req),

  /** GET /api/chat-sessions/:id/messages */
  getChatMessages: (sessionId) =>
    request('GET', `/api/chat-sessions/${encodeURIComponent(sessionId)}/messages`),

  /** DELETE /api/chat-sessions/:id */
  deleteChatSession: (sessionId) =>
    request('DELETE', `/api/chat-sessions/${encodeURIComponent(sessionId)}`),

  /** GET /api/agents */
  getAgents: () => request('GET', '/api/agents'),

  /** GET /api/agents/:id */
  getAgent: (agentId) =>
    request('GET', `/api/agents/${encodeURIComponent(agentId)}`),

  /** POST /api/agents */
  createAgent: (req) =>
    request('POST', '/api/agents', req),

  /** PATCH /api/agents/:id */
  patchAgent: (agentId, req) =>
    request('PATCH', `/api/agents/${encodeURIComponent(agentId)}`, req),

  /** DELETE /api/agents/:id (soft-delete) */
  deleteAgent: (agentId) =>
    request('DELETE', `/api/agents/${encodeURIComponent(agentId)}`),

  /** POST /api/agents/:id/enable */
  enableAgent: (agentId) =>
    request('POST', `/api/agents/${encodeURIComponent(agentId)}/enable`),

  /** POST /api/agents/:id/disable */
  disableAgent: (agentId) =>
    request('POST', `/api/agents/${encodeURIComponent(agentId)}/disable`),

  /** POST /api/agents/:id/test */
  testAgent: (agentId, input) =>
    request('POST', `/api/agents/${encodeURIComponent(agentId)}/test`, { input }),

  /* ── Virtual Claude Dev ───────────────────────────────────────────── */

  /** GET /api/dev/files */
  getDevFiles: () => request('GET', '/api/dev/files'),

  /** POST /api/dev/inspect */
  devInspect: (path) => request('POST', '/api/dev/inspect', { path }),

  /** GET /api/dev/patches?status=X */
  getDevPatches: (status) =>
    request('GET', `/api/dev/patches${status ? `?status=${encodeURIComponent(status)}` : ''}`),

  /** POST /api/dev/apply */
  applyPatch: (patchId) =>
    request('POST', '/api/dev/apply', { patchId, confirmed: true }),

  /** POST /api/dev/reject */
  rejectPatch: (patchId) =>
    request('POST', '/api/dev/reject', { patchId, confirmed: true }),

  /** GET /api/dev/history */
  getDevHistory: (limit) =>
    request('GET', `/api/dev/history${limit ? `?limit=${limit}` : ''}`),

  /* ── Auto Debugger ────────────────────────────────────────────────── */

  /** GET /api/debug/status */
  getDebugStatus: () => request('GET', '/api/debug/status'),

  /** GET /api/debug/logs?limit=N */
  getDebugLogs: (limit) =>
    request('GET', `/api/debug/logs${limit ? `?limit=${limit}` : ''}`),

  /** GET /api/debug/history?limit=N */
  getDebugHistory: (limit) =>
    request('GET', `/api/debug/history${limit ? `?limit=${limit}` : ''}`),

  /* ── Virtual Claude Team ──────────────────────────────────────────── */

  getTeamStatus: () => request('GET', '/api/team/status'),

  getTeamTasks: ({ status, agentId, sessionId, limit } = {}) =>
    request('GET', `/api/team/tasks${qs({ status, agent_id: agentId, session_id: sessionId, limit })}`),

  createTeamTask: (req) =>
    request('POST', '/api/team/tasks', {
      title: req.title, description: req.description ?? '',
      agent_id: req.agentId, session_id: req.sessionId,
      file_path: req.filePath, priority: req.priority ?? 5,
    }),

  updateTeamTask: (taskId, req) =>
    request('PATCH', `/api/team/tasks/${encodeURIComponent(taskId)}`, req),

  getTeamMessages: ({ sessionId, limit } = {}) =>
    request('GET', `/api/team/messages${qs({ session_id: sessionId, limit })}`),

  getTeamSessions: (limit) =>
    request('GET', `/api/team/sessions${limit ? `?limit=${limit}` : ''}`),

  getTeamSession: (sessionId) =>
    request('GET', `/api/team/sessions/${encodeURIComponent(sessionId)}`),

  /* ── Business Engine - Phase 4 ───────────────────────────────────── */

  getClients: () =>
    request('GET', '/api/clients'),

  createClient: (req) =>
    request('POST', '/api/clients', req),

  updateClient: (clientId, req) =>
    request('PATCH', `/api/clients/${clientId}`, req),

  deleteClient: (clientId) =>
    request('DELETE', `/api/clients/${clientId}`),

  getDeals: ({ client_id } = {}) =>
    request('GET', `/api/deals${qs({ client_id })}`),

  createDeal: (req) =>
    request('POST', '/api/deals', req),

  updateDeal: (dealId, req) =>
    request('PATCH', `/api/deals/${dealId}`, req),

  deleteDeal: (dealId) =>
    request('DELETE', `/api/deals/${dealId}`),

  getTasks: ({ deal_id, status } = {}) =>
    request('GET', `/api/tasks${qs({ deal_id, status })}`),

  createTask: (req) =>
    request('POST', '/api/tasks', req),

  updateTask: (taskId, req) =>
    request('PATCH', `/api/tasks/${taskId}/status`, req),

  deleteTask: (taskId) =>
    request('DELETE', `/api/tasks/${taskId}`),

  startBusinessWorkflow: (req) =>
    request('POST', '/api/workflows/start', req),

  cancelBusinessTask: (taskId) =>
    request('POST', `/api/business-tasks/${taskId}/cancel`),
}
