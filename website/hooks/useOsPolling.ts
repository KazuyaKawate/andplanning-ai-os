'use client'

/**
 * useOsPolling — Polls OS runtime data at a configurable interval.
 *
 * API CONTRACT — replace each adapter body when connecting real APIs:
 *   dashboard()   → GET /api/dashboard
 *   workflowRuns()→ GET /api/workflow-runs?limit=20
 *   factories()   → GET /api/factories
 *   activity()    → GET /api/activity?limit=10
 *   memory()      → GET /api/memory?limit=20
 *
 * Convention: create lib/api/{resource}.ts, implement the same async signature,
 * then swap the adapter reference below.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  mockDashboard, mockWorkflowRuns, mockFactories, mockActivity, mockMemory,
} from '@/lib/mock'
import type {
  DashboardMetrics, WorkflowRun, FactoryRuntime, ActivityItem, MemoryEntry,
} from '@/types'

/* ======================================================================
   Types
   ====================================================================== */

export type OsPollingData = {
  dashboard:   DashboardMetrics
  runs:        WorkflowRun[]
  factories:   FactoryRuntime[]
  activity:    ActivityItem[]
  memory:      MemoryEntry[]
}

export type OsPollingState = OsPollingData & {
  isLoading:   boolean
  isPolling:   boolean
  lastUpdated: string | null
  error:       string | null
}

export type OsPollingControls = {
  refresh: () => void
  start:   () => void
  stop:    () => void
}

/* ======================================================================
   Mock variation helpers — make each poll return slightly different data
   so the dashboard visibly updates. Delete this section when connecting
   a real API (real data changes naturally).
   ====================================================================== */

let _fetchCount = 0

// Simulated live activity pool — rotates on each poll
const LIVE_ACTIVITY: Array<Omit<ActivityItem, 'id' | 'timestamp'>> = [
  { type: 'run_complete', message: 'Trend Research Report が完了しました（4,200字）',     factoryId: 'research', meta: { tokens: 8400  } },
  { type: 'run_start',    message: 'YouTube Script Generator を開始しました',             factoryId: 'video'                           },
  { type: 'memory_save',  message: 'コンテンツ企画案をメモリに保存しました',               factoryId: 'creator',  meta: { size: 1600   } },
  { type: 'run_complete', message: 'SNS Post Generator が完了しました（3投稿生成）',       factoryId: 'marketing',meta: { tokens: 2100 } },
  { type: 'run_error',    message: 'Content Concept Generator でエラーが発生しました',    factoryId: 'creator'                         },
  { type: 'run_start',    message: 'Note Article 9-Step を開始しました',                  factoryId: 'writing'                         },
  { type: 'run_complete', message: 'Blog Article Generator が完了しました（1,800字）',    factoryId: 'writing',  meta: { tokens: 10200 } },
  { type: 'memory_save',  message: 'SEOキーワード分析結果をメモリに保存しました',         factoryId: 'writing',  meta: { size: 1840   } },
]

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)) }

/* ======================================================================
   Adapters
   Replace each function body with a real fetch call.
   ====================================================================== */

async function adapterDashboard(): Promise<DashboardMetrics> {
  // Real: const r = await fetch('/api/dashboard'); return r.json()
  await delay(120)
  return {
    ...mockDashboard,
    totalRunsToday:  mockDashboard.totalRunsToday  + _fetchCount,
    tokensUsedToday: mockDashboard.tokensUsedToday + _fetchCount * 380,
    activeWorkflows: Math.max(0, (_fetchCount % 4)),
    queueDepth:      Math.max(0, mockDashboard.queueDepth - Math.floor(_fetchCount / 3)),
  }
}

async function adapterWorkflowRuns(): Promise<WorkflowRun[]> {
  // Real: const r = await fetch('/api/workflow-runs?limit=20'); return r.json()
  await delay(80)
  return mockWorkflowRuns
}

async function adapterFactories(): Promise<FactoryRuntime[]> {
  // Real: const r = await fetch('/api/factories'); return r.json()
  await delay(90)
  return mockFactories.map(f => ({
    ...f,
    completedToday: f.completedToday + _fetchCount,
  }))
}

async function adapterActivity(): Promise<ActivityItem[]> {
  // Real: const r = await fetch('/api/activity?limit=10'); return r.json()
  await delay(60)
  const idx     = _fetchCount % LIVE_ACTIVITY.length
  const newItem: ActivityItem = {
    id:        `act-live-${Date.now()}`,
    timestamp: new Date().toISOString(),
    ...LIVE_ACTIVITY[idx],
  }
  // Prepend new item and cap at 10 entries
  return [newItem, ...mockActivity].slice(0, 10)
}

async function adapterMemory(): Promise<MemoryEntry[]> {
  // Real: const r = await fetch('/api/memory?limit=20'); return r.json()
  await delay(50)
  return mockMemory
}

/* Adapter map — swap values to replace mock with real API */
const adapters = {
  dashboard:    adapterDashboard,
  workflowRuns: adapterWorkflowRuns,
  factories:    adapterFactories,
  activity:     adapterActivity,
  memory:       adapterMemory,
}

/* ======================================================================
   Hook
   ====================================================================== */

const DEFAULT_INTERVAL_MS = 30_000

export function useOsPolling({
  autoStart   = true,
  intervalMs  = DEFAULT_INTERVAL_MS,
}: {
  autoStart?:  boolean
  intervalMs?: number
} = {}): OsPollingState & OsPollingControls {

  // Initialise with static mock so first render has data immediately
  const [dashboard,   setDashboard]   = useState<DashboardMetrics>(mockDashboard)
  const [runs,        setRuns]        = useState<WorkflowRun[]>(mockWorkflowRuns)
  const [factories,   setFactories]   = useState<FactoryRuntime[]>(mockFactories)
  const [activity,    setActivity]    = useState<ActivityItem[]>(mockActivity)
  const [memory,      setMemory]      = useState<MemoryEntry[]>(mockMemory)
  const [isLoading,   setIsLoading]   = useState(false)
  const [isPolling,   setIsPolling]   = useState(autoStart)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [error,       setError]       = useState<string | null>(null)

  // Single fetch of all resources in parallel
  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    _fetchCount++
    try {
      const [d, r, f, a, m] = await Promise.all([
        adapters.dashboard(),
        adapters.workflowRuns(),
        adapters.factories(),
        adapters.activity(),
        adapters.memory(),
      ])
      setDashboard(d)
      setRuns(r)
      setFactories(f)
      setActivity(a)
      setMemory(m)
      setLastUpdated(new Date().toISOString())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Start/stop polling via isPolling flag.
  // Initial fetch is deferred via setTimeout(0) so setState is not called
  // synchronously in the effect body (satisfies react-hooks/set-state-in-effect).
  useEffect(() => {
    if (!isPolling) return
    const firstId  = setTimeout(() => { void refresh() }, 0)
    const intervalId = setInterval(() => { void refresh() }, intervalMs)
    return () => {
      clearTimeout(firstId)
      clearInterval(intervalId)
    }
  }, [isPolling, intervalMs, refresh])

  return {
    // Data
    dashboard,
    runs,
    factories,
    activity,
    memory,
    // Status
    isLoading,
    isPolling,
    lastUpdated,
    error,
    // Controls
    refresh,
    start:  () => setIsPolling(true),
    stop:   () => setIsPolling(false),
  }
}
