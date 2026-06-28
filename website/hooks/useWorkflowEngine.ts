'use client'

/**
 * useWorkflowEngine — Workflow execution engine with runtime API boundary.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  RUNTIME LAYER  — routes through api (lib/api/runtime.ts)               │
 * │    run()     → api.startRun(workflowId, { inputs })                     │
 * │    pause()   → api.pauseRun(runId)                                      │
 * │    resume()  → api.resumeRun(runId)                                     │
 * │    stop()    → api.stopRun(runId)                                       │
 * │                                                                         │
 * │  SIMULATION LAYER  — replace with WebSocket/SSE in production           │
 * │    Step advancement via setTimeout (mirrors real async step execution)  │
 * │    Output generation via getMockOutput() (replace with real output)     │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * To switch to a real backend:
 *   1. Change lib/api/runtime.ts to use restAdapter
 *   2. Replace the two simulation useEffects with a WebSocket/SSE subscription
 */

import { useReducer, useEffect } from 'react'
import { api } from '@/lib/api/runtime'
import type { WorkflowStep, WorkflowStatus } from '@/types'
import { mockWorkflowSteps, getMockOutput } from '@/lib/mock'

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
  | { type: 'RUN';           steps: WorkflowStep[]; inputs: Record<string, string>; runId: string }
  | { type: 'STEP_COMPLETE'; idx: number; durationMs: number; total: number }
  | { type: 'COMPLETE';      output: string }
  | { type: 'PAUSE'  }
  | { type: 'RESUME' }
  | { type: 'STOP'   }
  | { type: 'RESET'  }

/* ======================================================================
   Helpers
   ====================================================================== */

function ts(): string { return new Date().toISOString() }

function mkLog(level: LogLevel, message: string): LogEntry {
  return { ts: ts(), level, message }
}

const STEP_MESSAGES: Record<string, string> = {
  'キーワード分析':      'KW volume 1,200/mo · competition: medium · LSI terms identified',
  'ターゲット設定':      'Persona: decision-maker · pain-point map complete',
  'アウトライン生成':    '6-section structure locked · H2/H3 hierarchy set',
  '本文執筆 (§1–§3)':   'Sections 1–3 written · 1,200 chars · readability: A',
  '本文執筆 (§4–§6)':   'Sections 4–6 written · 1,240 chars · CTR hooks added',
  'SEO最適化':          'KW density 1.8% · meta optimized · internal-link anchors set',
  'CTA生成':            'Primary CTA: "今すぐ試す" · secondary: "資料請求"',
  'メタ文章生成':        'Title 58 chars · description 152 chars · OG tags generated',
  '最終レビュー':        'Readability A · SEO score 91/100 · PASS',
  'テーマ分析':         'Theme cluster mapped · competitor content gap found',
  '本文執筆 (前半)':     'First half written · 900 chars',
  '本文執筆 (後半)':     'Second half written · 900 chars',
  'メタ情報生成':        'Title / description / OG image alt generated',
  'クエリ設計':         '12 targeted search queries · 3 intent types covered',
  'Web情報収集':        '24 sources retrieved · 8,400 chars raw data',
  '情報フィルタリング':  'Relevance filter applied · 18/24 sources retained (75%)',
  '要約生成':          'Key insights extracted · 5 trend signals identified',
  'レポート構造化':     'Executive summary + 3 sections + appendix generated',
  'ターゲット分析':     'ICP defined · pain points × content format matrix ready',
  '企画案生成':         '4 content concepts generated',
  '詳細設計':          'Hooks, CTAs, and formats defined for each concept',
  '最終仕上げ':         'Final polish · tone consistency verified',
  '構成設計':          '5-part structure: hook → story → value → proof → CTA',
  '台本執筆':           'Full 10-min script written · 3,200 chars',
  'サムネイル指示作成': 'Thumbnail brief: color #0A2463, bold white text, arrow graphic',
  'SEOタグ生成':        '15 tags generated · primary: top 3 · secondary: 12',
  '投稿文生成':         '3-platform copy written · character limits respected',
  'ハッシュタグ生成':   '24 hashtags · 8 per platform · optimized for reach',
}

function getStepMessage(name: string): string {
  return STEP_MESSAGES[name] ?? `${name} complete`
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
        startedAt:  ts(),
        endedAt:    null,
        tokensUsed: 0,
        output:     null,
        runId:      action.runId,          // assigned by api.startRun()
        logs: [
          mkLog('info', `▶ Workflow run started [${action.runId}]`),
          mkLog('info', `[1/${steps.length}] ${steps[0].name}`),
        ],
      }
    }

    case 'STEP_COMPLETE': {
      const { idx, durationMs, total } = action
      const completedStep = state.steps[idx]
      const newSteps = state.steps.map((s, i) => {
        if (i === idx)     return { ...s, status: 'done' as const, durationMs }
        if (i === idx + 1) return { ...s, status: 'running' as const }
        return s
      })
      const progress   = Math.round(((idx + 1) / total) * 100)
      const tokenDelta = Math.floor(Math.random() * 1800 + 400)
      const newLogs: LogEntry[] = [
        ...state.logs,
        mkLog('success', `✓ [${idx + 1}/${total}] ${completedStep.name} · ${getStepMessage(completedStep.name)}`),
        ...(idx + 1 < total
          ? [mkLog('info', `[${idx + 2}/${total}] ${state.steps[idx + 1].name}`)]
          : []),
      ]
      return { ...state, steps: newSteps, progress, logs: newLogs, tokensUsed: state.tokensUsed + tokenDelta }
    }

    case 'COMPLETE':
      return {
        ...state,
        status:   'completed',
        progress: 100,
        endedAt:  ts(),
        output:   action.output,
        steps:    state.steps.map(s => ({ ...s, status: 'done' as const })),
        logs:     [...state.logs, mkLog('success', '✅ Workflow completed successfully')],
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
        endedAt: ts(),
        steps:   state.steps.map(s =>
          s.status === 'running' ? { ...s, status: 'error' as const } : s
        ),
        logs: [...state.logs, mkLog('error', '■ Workflow stopped by user')],
      }

    case 'RESET':
      return INITIAL_STATE

    default:
      return state
  }
}

/* ======================================================================
   Hook
   ====================================================================== */

export function useWorkflowEngine(workflowId: string) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE)

  /* ------------------------------------------------------------------
     SIMULATION: step advancement
     Replace this useEffect with WebSocket/SSE subscription or polling:
       ws.on('step_complete', e => dispatch({ type: 'STEP_COMPLETE', ...e }))
       OR: setInterval(() => api.getRun(runId).then(r => syncState(r)), 2000)
  ------------------------------------------------------------------ */
  useEffect(() => {
    if (state.status !== 'running') return

    const runningIdx = state.steps.findIndex(s => s.status === 'running')
    if (runningIdx === -1) return

    const step = state.steps[runningIdx]
    const demoMs = Math.min(2200, Math.max(700, (step.durationMs ?? 3000) / 8))

    const timer = setTimeout(() => {
      dispatch({
        type:       'STEP_COMPLETE',
        idx:        runningIdx,
        durationMs: step.durationMs ?? demoMs * 8,
        total:      state.steps.length,
      })
    }, demoMs)

    return () => clearTimeout(timer)
  }, [state.status, state.steps])

  /* ------------------------------------------------------------------
     SIMULATION: all-steps-done → emit COMPLETE
     In production: WebSocket 'run_complete' event OR final poll result.
  ------------------------------------------------------------------ */
  useEffect(() => {
    if (state.status !== 'running') return
    const allDone = state.steps.length > 0 && state.steps.every(s => s.status === 'done')
    if (!allDone) return

    const output = getMockOutput(workflowId, state.inputs)
    const timer = setTimeout(() => {
      dispatch({ type: 'COMPLETE', output })
    }, 200)
    return () => clearTimeout(timer)
  }, [state.status, state.steps, workflowId, state.inputs])

  /* ------------------------------------------------------------------
     Public API — mirrors REST Workflow Engine surface
     Each function calls the api runtime, then updates local state.
     Swap lib/api/runtime.ts adapter to point at REST backend.
  ------------------------------------------------------------------ */

  async function run(inputs: Record<string, string>) {
    // Build local step list from simulation layer
    const template = mockWorkflowSteps[workflowId] ?? []
    const steps: WorkflowStep[] = template.map((t, i) => ({
      id:         `s${i + 1}`,
      name:       t.name,
      status:     'pending',
      durationMs: t.durationMs,
    }))

    // RUNTIME: create run on backend → get server-assigned runId
    const res = await api.startRun(workflowId, { inputs })
    const runId = res.ok ? res.data.runId : `run-local-${Date.now()}`

    dispatch({ type: 'RUN', steps, inputs, runId })
  }

  async function pause() {
    // RUNTIME: pause on backend, then update local state
    if (state.runId) await api.pauseRun(state.runId)
    dispatch({ type: 'PAUSE' })
  }

  async function resume() {
    // RUNTIME: resume on backend, then update local state
    if (state.runId) await api.resumeRun(state.runId)
    dispatch({ type: 'RESUME' })
  }

  async function stop() {
    // RUNTIME: stop on backend, then update local state
    if (state.runId) await api.stopRun(state.runId)
    dispatch({ type: 'STOP' })
  }

  function reset() {
    dispatch({ type: 'RESET' })
  }

  return { state, run, pause, resume, stop, reset }
}
