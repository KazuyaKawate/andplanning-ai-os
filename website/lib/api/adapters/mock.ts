/**
 * lib/api/adapters/mock.ts
 *
 * Mock implementation of OsApiAdapter.
 * Returns data from lib/mock/index.ts with simulated network delay.
 *
 * To connect a real backend, implement OsApiAdapter in a new file
 * (e.g. lib/api/adapters/rest.ts) and swap the export in lib/api/runtime.ts.
 */

import type { OsApiAdapter, ApiResult } from '../types'
import {
  mockDashboard,
  mockWorkflowRuns,
  mockWorkflows,
  mockWorkflowInputs,
  mockFactories,
  mockFactoryOutputs,
  mockFactoryKnowledge,
  mockFactorySettings,
  mockActivity,
  mockMemory,
  mockSettings,
  mockModels,
} from '@/lib/mock'

/* ── Simulation helpers ───────────────────────────────────────────── */

function delay(ms: number) { return new Promise<void>(r => setTimeout(r, ms)) }

function ok<T>(data: T): ApiResult<T> { return { ok: true, data } }

function err(message: string, status = 500): ApiResult<never> {
  return { ok: false, error: message, status }
}

let _pollCount = 0

/* ── Mock adapter ─────────────────────────────────────────────────── */

export const mockAdapter: OsApiAdapter = {

  /* Dashboard -------------------------------------------------------- */

  async getDashboard() {
    await delay(120)
    _pollCount++
    return ok({
      ...mockDashboard,
      totalRunsToday:  mockDashboard.totalRunsToday  + _pollCount,
      tokensUsedToday: mockDashboard.tokensUsedToday + _pollCount * 380,
      activeWorkflows: Math.max(0, _pollCount % 4),
    })
  },

  /* Workflow runs ---------------------------------------------------- */

  async getWorkflowRuns({ limit = 20, factoryId } = {}) {
    await delay(80)
    const filtered = factoryId
      ? mockWorkflowRuns.filter(r => r.factoryId === factoryId)
      : mockWorkflowRuns
    return ok(filtered.slice(0, limit))
  },

  async getWorkflowSchema(workflowId) {
    await delay(40)
    const fields = mockWorkflowInputs[workflowId]
    if (!fields) return err(`Workflow schema not found: ${workflowId}`, 404)
    return ok(fields)
  },

  async startRun(_workflowId, _req) {
    await delay(200)
    // Real: POST /api/workflows/:id/runs  body: _req
    return ok({ runId: `run-${Date.now()}`, status: 'running' as const })
  },

  async pauseRun(_runId) {
    await delay(80)
    return ok({ ok: true as const })
  },

  async resumeRun(_runId) {
    await delay(80)
    return ok({ ok: true as const })
  },

  async stopRun(_runId) {
    await delay(80)
    return ok({ ok: true as const })
  },

  async getRun(runId) {
    await delay(60)
    const run = mockWorkflowRuns.find(r => r.id === runId)
    if (!run) return err(`Run not found: ${runId}`, 404)
    return ok(run)
  },

  /* Workflows -------------------------------------------------------- */

  async getWorkflows({ factoryId } = {}) {
    await delay(70)
    const filtered = factoryId
      ? mockWorkflows.filter(w => w.factoryId === factoryId)
      : mockWorkflows
    return ok(filtered)
  },

  /* Factories -------------------------------------------------------- */

  async getFactories() {
    await delay(90)
    return ok(mockFactories)
  },

  async getFactoryOutputs(factoryId, { limit = 10 } = {}) {
    await delay(60)
    return ok(mockFactoryOutputs.filter(o => o.factoryId === factoryId).slice(0, limit))
  },

  async getFactoryKnowledge(factoryId) {
    await delay(50)
    return ok(mockFactoryKnowledge.filter(k => k.factoryId === factoryId))
  },

  async getFactorySettings(factoryId) {
    await delay(40)
    const settings = mockFactorySettings[factoryId]
    if (!settings) return err(`Settings not found: ${factoryId}`, 404)
    return ok(settings)
  },

  async patchFactorySettings(factoryId, req) {
    await delay(150)
    const current = mockFactorySettings[factoryId]
    if (!current) return err(`Factory not found: ${factoryId}`, 404)
    // In a real adapter: PATCH /api/factories/:id/settings  body: req
    return ok({ ...current, ...req })
  },

  /* Activity & Memory ------------------------------------------------ */

  async getActivity({ limit = 10 } = {}) {
    await delay(60)
    return ok(mockActivity.slice(0, limit))
  },

  async getMemory({ factoryId, search, limit = 20 } = {}) {
    await delay(70)
    let results = [...mockMemory]
    if (factoryId) results = results.filter(m => m.factoryId === factoryId)
    if (search)    results = results.filter(m => m.title.includes(search) || m.summary.includes(search))
    return ok(results.slice(0, limit))
  },

  /* OS Settings & Models -------------------------------------------- */

  async getSettings() {
    await delay(60)
    return ok({ ...mockSettings })
  },

  async patchSettings(req) {
    await delay(150)
    // Real: PATCH /api/settings  body: req
    return ok({ ...mockSettings, ...req })
  },

  async getModels() {
    await delay(50)
    return ok([...mockModels])
  },

  /* Chat Sessions ---------------------------------------------------- */

  getChatSessions: async () => ({ ok: true as const, data: [] }),

  createChatSession: async (req) => ({ ok: true as const, data: { id: Math.random().toString(36).slice(2), factoryId: req.factoryId, title: req.title ?? '新しいチャット', model: 'claude-sonnet-4-6', totalTokens: 0, totalCost: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), messageCount: 0 } }),

  getChatMessages: async () => ({ ok: true as const, data: [] }),

  deleteChatSession: async () => ({ ok: true as const, data: undefined }),

  getAgents: async () => ({ ok: true as const, data: [] }),

  getAgent: async () => ({ ok: false as const, error: 'mock: not implemented' }),

  createAgent: async () => ({ ok: false as const, error: 'mock: not implemented' }),

  patchAgent: async (_id, _req) => ({ ok: false as const, error: 'mock: not implemented' }),

  deleteAgent: async () => ({ ok: true as const, data: { ok: true as const } }),

  enableAgent: async () => ({ ok: false as const, error: 'mock: not implemented' }),

  disableAgent: async () => ({ ok: false as const, error: 'mock: not implemented' }),

  testAgent: async () => ({ ok: false as const, error: 'mock: use REST adapter for agent tests' }),

  /* ── Virtual Claude Dev ─────────────────────────────────────────────── */
  getDevFiles: async () => ({ ok: true as const, data: [
    { name: 'website', path: 'website', type: 'dir' as const, children: [
      { name: 'app', path: 'website/app', type: 'dir' as const, children: [] },
      { name: 'lib', path: 'website/lib', type: 'dir' as const, children: [] },
    ]},
    { name: 'backend', path: 'backend', type: 'dir' as const, children: [
      { name: 'app', path: 'backend/app', type: 'dir' as const, children: [] },
    ]},
  ]}),

  devInspect: async (path) => ({ ok: true as const, data: {
    path, content: `// Mock content for ${path}\n// Use REST adapter to inspect real files`,
    size: 64, lines: 2,
  }}),

  getDevPatches: async () => ({ ok: true as const, data: [] }),

  applyPatch: async (_patchId) => ({ ok: false as const, error: 'mock: use REST adapter to apply patches' }),

  rejectPatch: async (patchId) => ({ ok: true as const, data: { ok: true, message: 'Patch rejected (mock)', patchId } }),

  getDevHistory: async () => ({ ok: true as const, data: [] }),

  /* ── Auto Debugger ─────────────────────────────────────────────────── */
  getDebugStatus: async () => ({ ok: true as const, data: {
    uptime_ok: true, db_ok: true, error_rate: 0, errors_today: 0,
    runs_today: 0, failed_runs: [], debug_sessions_total: 0,
  }}),
  getDebugLogs: async () => ({ ok: true as const, data: [] }),
  getDebugHistory: async () => ({ ok: true as const, data: [] }),

  /* ── Virtual Claude Team ────────────────────────────────────────────── */
  getTeamStatus: async () => ({ ok: true as const, data: {
    active_agents: 0, idle_agents: 6, total_agents: 6,
    pending_tasks: 0, in_progress_tasks: 0, completed_tasks: 0, failed_tasks: 0,
    total_sessions: 0, total_tokens: 0, recent_activity: [],
  }}),
  getTeamTasks: async () => ({ ok: true as const, data: [] }),
  createTeamTask: async (req) => ({ ok: false as const, error: 'mock: use REST adapter' }),
  updateTeamTask: async () => ({ ok: false as const, error: 'mock: use REST adapter' }),
  getTeamMessages: async () => ({ ok: true as const, data: [] }),
  getTeamSessions: async () => ({ ok: true as const, data: [] }),
  getTeamSession: async () => ({ ok: false as const, error: 'mock: use REST adapter' }),

  /* ── Business Engine - Phase 4 ────────────────────────────────────── */
  getClients: async () => ({ ok: true as const, data: [] }),
  createClient: async () => ({ ok: false as const, error: 'mock: use REST adapter' }),
  updateClient: async () => ({ ok: false as const, error: 'mock: use REST adapter' }),
  deleteClient: async () => ({ ok: false as const, error: 'mock: use REST adapter' }),

  getDeals: async () => ({ ok: true as const, data: [] }),
  createDeal: async () => ({ ok: false as const, error: 'mock: use REST adapter' }),
  updateDeal: async () => ({ ok: false as const, error: 'mock: use REST adapter' }),
  deleteDeal: async () => ({ ok: false as const, error: 'mock: use REST adapter' }),

  getTasks: async () => ({ ok: true as const, data: [] }),
  createTask: async () => ({ ok: false as const, error: 'mock: use REST adapter' }),
  updateTask: async () => ({ ok: false as const, error: 'mock: use REST adapter' }),
  deleteTask: async () => ({ ok: false as const, error: 'mock: use REST adapter' }),

  startBusinessWorkflow: async () => ({ ok: false as const, error: 'mock: use REST adapter' }),
  cancelBusinessTask: async () => ({ ok: false as const, error: 'mock: use REST adapter' }),
}
