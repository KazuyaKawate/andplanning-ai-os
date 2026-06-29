'use client'

/**
 * useWorkflowEngine — Workflow execution engine connected to the real backend.
 *
 * Architecture:
 *   run()    → api.startRun()     → backend creates run, returns runId
 *   poll     → api.getRun(runId)  → syncs step states + output from backend
 *   pause()  → api.pauseRun()     → backend pauses, local state follows
 *   resume() → api.resumeRun()    → backend resumes, local state follows
 *   stop()   → api.stopRun()      → backend stops, local state follows
 */

import { useReducer, useEffect, useRef } from 'react'
import { api } from '@/lib/api/runtime'
import type { WorkflowStep, WorkflowStatus } from '@/types'

/* ======================================================================
   Public types
   ====================================================================== */

export type LogLevel = 'info' | 'success' | 'warn' | 'error'

export type LogEntry = {
  ts:      string
  level:   LogLevel
  message: string
}

export type EngineState = {
  status:     WorkflowStatus
  steps:      WorkflowStep[]
  progress:   number
  logs:       LogEntry[]
  startedAt:  string | null
  endedAt:    string | null
  tokensUsed: number
  inputs:     Record<string, string>
  output:     string | null
  runId:      string | null
}

/* ======================================================================
   Internal action types
   ====================================================================== */

type Action =
  | { type: 'RUN';    steps: WorkflowStep[]; inputs: Record<string, string>; runId: string; startedAt: string }
  | { type: 'SYNC';   status: WorkflowStatus; steps: WorkflowStep[]; tokensUsed: number; output: string | null; endedAt: string | null }
  | { type: 'PAUSE'  }
  | { type: 'RESUME' }
  | { type: 'STOP';   endedAt: string }
  | { type: 'RESET'  }
  | { type: 'LOG';    entry: LogEntry }

/* ======================================================================
   Helpers
   ====================================================================== */

function ts(): string { return new Date().toISOString() }

function mkLog(level: LogLevel, message: string): LogEntry {
  return { ts: ts(), level, message }
}

function stepsToProgress(steps: WorkflowStep[]): number {
  if (steps.length === 0) return 0
  const done = steps.filter(s => s.status === 'done').length
  return Math.round((done / steps.length) * 100)
}

/* ======================================================================
   Reducer
   ====================================================================== */

const INITIAL_STATE: EngineState = {
  status:     'idle',
  steps:      [],
  progress:   0,
  logs:       [],
  startedAt:  null,
  endedAt:    null,
  tokensUsed: 0,
  inputs:     {},
  output:     null,
  runId:      null,
}

function reducer(state: EngineState, action: Action): EngineState {
  switch (action.type) {

    case 'RUN': {
      const steps = action.steps.map((s, i) => ({
        ...s,
        status: (i === 0 ? 'running' : 'pending') as WorkflowStep['status'],
      }))
      return {
        ...state,
        status:     'running',
        steps,
        progress:   0,
        inputs:     action.inputs,
        startedAt:  action.startedAt,
        endedAt:    null,
        tokensUsed: 0,
        output:     null,
        runId:      action.runId,
        logs: [
          mkLog('info', `▶ Workflow run started [${action.runId}]`),
          mkLog('info', `Executing ${steps.length} steps via backend…`),
        ],
      }
    }

    case 'SYNC': {
      const prev = state.steps
      const next = action.steps

      // Build log entries for newly-completed steps
      const newLogs: LogEntry[] = []
      for (let i = 0; i < next.length; i++) {
        const prevStep = prev[i]
        const nextStep = next[i]
        if (prevStep && prevStep.status !== 'done' && nextStep.status === 'done') {
          newLogs.push(mkLog('success', `✓ [${i + 1}/${next.length}] ${nextStep.name}`))
          if (i + 1 < next.length && next[i + 1].status === 'running') {
            newLogs.push(mkLog('info', `[${i + 2}/${next.length}] ${next[i + 1].name}`))
          }
        } else if (prevStep && prevStep.status !== 'error' && nextStep.status === 'error') {
          newLogs.push(mkLog('error', `✕ [${i + 1}/${next.length}] ${nextStep.name} failed`))
        }
      }

      if (action.status === 'completed' && state.status !== 'completed') {
        newLogs.push(mkLog('success', '✅ Workflow completed successfully'))
      }
      if (action.status === 'failed' && state.status !== 'failed') {
        newLogs.push(mkLog('error', '✕ Workflow failed'))
      }

      return {
        ...state,
        status:     action.status,
        steps:      action.steps,
        progress:   stepsToProgress(action.steps),
        tokensUsed: action.tokensUsed,
        output:     action.output,
        endedAt:    action.endedAt,
        logs:       [...state.logs, ...newLogs],
      }
    }

    case 'PAUSE':
      return {
        ...state,
        status: 'paused',
        logs:   [...state.logs, mkLog('warn', '⏸ Execution paused by user')],
      }

    case 'RESUME':
      return {
        ...state,
        status: 'running',
        logs:   [...state.logs, mkLog('info', '▶ Execution resumed')],
      }

    case 'STOP':
      return {
        ...state,
        status:  'failed',
        endedAt: action.endedAt,
        steps:   state.steps.map(s =>
          s.status === 'running' ? { ...s, status: 'error' as const } : s
        ),
        logs: [...state.logs, mkLog('error', '■ Workflow stopped by user')],
      }

    case 'RESET':
      return INITIAL_STATE

    case 'LOG':
      return { ...state, logs: [...state.logs, action.entry] }

    default:
      return state
  }
}

/* ======================================================================
   Hook
   ====================================================================== */

const POLL_INTERVAL_MS = 2000

export function useWorkflowEngine(workflowId: string) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE)

  // Keep refs for polling cleanup
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const runIdRef     = useRef<string | null>(null)

  function stopPolling() {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }

  // Poll the backend for run state while a run is active
  useEffect(() => {
    if (state.status !== 'running' && state.status !== 'paused') {
      stopPolling()
      return
    }
    if (!state.runId) return
    runIdRef.current = state.runId

    // Already polling — nothing to do
    if (pollTimerRef.current) return

    pollTimerRef.current = setInterval(async () => {
      const rid = runIdRef.current
      if (!rid) return
      const res = await api.getRun(rid)
      if (!res.ok) return

      const r = res.data
      dispatch({
        type:       'SYNC',
        status:     r.status as WorkflowStatus,
        steps:      r.steps,
        tokensUsed: r.tokensUsed ?? 0,
        output:     r.outputSummary ?? null,
        endedAt:    r.endedAt ?? null,
      })

      // Stop polling once terminal
      if (r.status === 'completed' || r.status === 'failed') {
        stopPolling()
      }
    }, POLL_INTERVAL_MS)

    return stopPolling
  }, [state.status, state.runId])

  // Cleanup on unmount
  useEffect(() => stopPolling, [])

  /* ------------------------------------------------------------------
     Public API
  ------------------------------------------------------------------ */

  async function run(inputs: Record<string, string>) {
    stopPolling()

    const res = await api.startRun(workflowId, { inputs })
    if (!res.ok) {
      dispatch({ type: 'LOG', entry: mkLog('error', `Failed to start run: ${res.error}`) })
      return
    }

    const runId = res.data.runId

    // Fetch initial run state to get step list
    const runRes = await api.getRun(runId)
    const initialSteps: WorkflowStep[] = runRes.ok ? runRes.data.steps : [
      { id: 's1', name: 'Executing…', status: 'running' }
    ]

    dispatch({ type: 'RUN', steps: initialSteps, inputs, runId, startedAt: new Date().toISOString() })
  }

  async function pause() {
    if (state.runId) {
      await api.pauseRun(state.runId)
    }
    stopPolling()
    dispatch({ type: 'PAUSE' })
  }

  async function resume() {
    if (state.runId) {
      await api.resumeRun(state.runId)
    }
    dispatch({ type: 'RESUME' })
  }

  async function stop() {
    if (state.runId) {
      await api.stopRun(state.runId)
    }
    stopPolling()
    dispatch({ type: 'STOP', endedAt: new Date().toISOString() })
  }

  function reset() {
    stopPolling()
    runIdRef.current = null
    dispatch({ type: 'RESET' })
  }

  return { state, run, pause, resume, stop, reset }
}
