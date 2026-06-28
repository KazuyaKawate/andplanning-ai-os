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
    const apiKey = process.env.NEXT_PUBLIC_API_KEY
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`

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
}
