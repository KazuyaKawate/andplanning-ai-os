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
}
