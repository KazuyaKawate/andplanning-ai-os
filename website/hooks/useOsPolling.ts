'use client'

/**
 * useOsPolling — Polls OS runtime data at a configurable interval.
 *
 * All async fetches go through `api` from lib/api/runtime.ts.
 * To switch from mock to a real backend, change the adapter in
 * lib/api/runtime.ts — nothing here needs to change.
 *
 * lib/mock is still imported for the initial useState values only,
 * so the first render has data without a loading flash. Once the
 * first poll fires (setTimeout 0), those values are replaced by
 * api responses.
 */

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api/runtime'
import type {
  DashboardMetrics, WorkflowRun, FactoryRuntime, ActivityItem, MemoryEntry,
} from '@/types'

const EMPTY_DASHBOARD: DashboardMetrics = {
  totalRunsToday: 0, activeWorkflows: 0, queueDepth: 0, memoryItems: 0,
  successRateToday: 100, tokensUsedToday: 0, activeFactories: 0, errorsToday: 0,
  costToday: 0, agentRunsToday: 0, virtualClaudeRunsToday: 0, realClaudeRunsToday: 0,
  claudeMode: 'auto', topAgents: [],
}

/* ======================================================================
   Public types (unchanged — Dashboard and other consumers rely on these)
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
   Hook
   ====================================================================== */

const DEFAULT_INTERVAL_MS = 30_000

export function useOsPolling({
  autoStart  = true,
  intervalMs = DEFAULT_INTERVAL_MS,
}: {
  autoStart?:  boolean
  intervalMs?: number
} = {}): OsPollingState & OsPollingControls {

  const [dashboard,   setDashboard]   = useState<DashboardMetrics>(EMPTY_DASHBOARD)
  const [runs,        setRuns]        = useState<WorkflowRun[]>([])
  const [factories,   setFactories]   = useState<FactoryRuntime[]>([])
  const [activity,    setActivity]    = useState<ActivityItem[]>([])
  const [memory,      setMemory]      = useState<MemoryEntry[]>([])
  const [isLoading,   setIsLoading]   = useState(false)
  const [isPolling,   setIsPolling]   = useState(autoStart)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [error,       setError]       = useState<string | null>(null)

  /**
   * refresh — fetch all 5 resources in parallel via the api runtime.
   *
   * ADAPTER BOUNDARY:
   *   Swap lib/api/runtime.ts to point at a different adapter and
   *   these calls automatically hit the real backend.
   *
   *   api.getDashboard()          → GET /api/dashboard
   *   api.getWorkflowRuns()       → GET /api/workflow-runs?limit=20
   *   api.getFactories()          → GET /api/factories
   *   api.getActivity()           → GET /api/activity?limit=10
   *   api.getMemory()             → GET /api/memory?limit=20
   */
  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [dRes, rRes, fRes, aRes, mRes] = await Promise.all([
        api.getDashboard(),
        api.getWorkflowRuns({ limit: 20 }),
        api.getFactories(),
        api.getActivity({ limit: 10 }),
        api.getMemory({ limit: 20 }),
      ])

      // Apply successful responses; skip failed ones (stale data stays)
      if (dRes.ok) {
        // Normalize backend field names to DashboardMetrics shape
        const raw = dRes.data as Record<string, unknown>
        setDashboard({
          totalRunsToday:         (raw.totalRunsToday         as number) ?? 0,
          activeWorkflows:        (raw.activeWorkflows         as number) ?? 0,
          queueDepth:             (raw.queueDepth              as number) ?? 0,
          memoryItems:            (raw.memoryItems             as number) ?? 0,
          successRateToday:       ((raw.successRateToday ?? raw.successRate) as number) ?? 100,
          tokensUsedToday:        (raw.tokensUsedToday         as number) ?? 0,
          activeFactories:        (raw.activeFactories         as number) ?? 0,
          errorsToday:            (raw.errorsToday             as number) ?? 0,
          costToday:              (raw.costToday               as number) ?? 0,
          agentRunsToday:         (raw.agentRunsToday          as number) ?? 0,
          virtualClaudeRunsToday: (raw.virtualClaudeRunsToday  as number) ?? 0,
          realClaudeRunsToday:    (raw.realClaudeRunsToday     as number) ?? 0,
          claudeMode:             ((raw.claudeMode as string) ?? 'auto') as 'auto' | 'real' | 'virtual',
          topAgents:              (raw.topAgents               as DashboardMetrics['topAgents']) ?? [],
        })
      }
      if (rRes.ok) setRuns(rRes.data)
      if (fRes.ok) setFactories(fRes.data)
      if (aRes.ok) setActivity(aRes.data)
      if (mRes.ok) setMemory(mRes.data)

      // Surface the first error (if any), otherwise mark as updated
      const firstError = [dRes, rRes, fRes, aRes, mRes].find(r => !r.ok)
      if (firstError && !firstError.ok) {
        setError(firstError.error)
      } else {
        setLastUpdated(new Date().toISOString())
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Start/stop polling.
  // Initial fetch is deferred via setTimeout(0) so setState is not called
  // synchronously in the effect body (satisfies react-hooks/set-state-in-effect).
  useEffect(() => {
    if (!isPolling) return
    const firstId    = setTimeout(() => { void refresh() }, 0)
    const intervalId = setInterval(() => { void refresh() }, intervalMs)
    return () => {
      clearTimeout(firstId)
      clearInterval(intervalId)
    }
  }, [isPolling, intervalMs, refresh])

  return {
    dashboard,
    runs,
    factories,
    activity,
    memory,
    isLoading,
    isPolling,
    lastUpdated,
    error,
    refresh,
    start: () => setIsPolling(true),
    stop:  () => setIsPolling(false),
  }
}
