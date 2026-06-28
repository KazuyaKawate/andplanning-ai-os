'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import Link from 'next/link'
import StatusBadge from '@/components/os/StatusBadge'
import {
  mockWorkflows, mockWorkflowRuns,
  formatRelativeTime, formatDuration, formatTokens,
} from '@/lib/mock'
import type { Workflow, WorkflowRun, WorkflowStatus } from '@/types'

/* ========== Step progress bar ========== */

function StepBar({ steps }: { steps: WorkflowRun['steps'] }) {
  return (
    <div className="flex gap-0.5 mt-2">
      {steps.map((step, i) => (
        <motion.div
          key={step.id}
          title={step.name}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: i * 0.04 }}
          style={{ originX: 0 }}
          className={[
            'h-1.5 flex-1 rounded-full',
            step.status === 'done'    ? 'bg-emerald-500'    : '',
            step.status === 'running' ? 'bg-brand-blue animate-pulse' : '',
            step.status === 'error'   ? 'bg-red-500'        : '',
            step.status === 'pending' ? 'bg-white/[0.08]'   : '',
          ].join(' ')}
        />
      ))}
    </div>
  )
}

/* ========== Run detail panel ========== */

function RunDetail({ run, onClose }: { run: WorkflowRun; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#0A1220] border-l border-white/[0.08] overflow-y-auto"
    >
      <div className="p-5 border-b border-white/[0.06] flex items-start justify-between">
        <div>
          <h3 className="text-sm font-bold font-heading text-white">{run.workflowName}</h3>
          <p className="text-xs text-slate-600 font-mono mt-0.5">Run ID: {run.id}</p>
        </div>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-white transition-colors text-lg leading-none"
          aria-label="閉じる"
        >
          ✕
        </button>
      </div>

      <div className="p-5 space-y-5">
        {/* Status & model */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
            <p className="text-[10px] text-slate-600 mb-1">Status</p>
            <StatusBadge status={run.status} dot />
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
            <p className="text-[10px] text-slate-600 mb-1">Model</p>
            <p className="text-xs font-mono text-slate-300">{run.model}</p>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
            <p className="text-[10px] text-slate-600 mb-1">Started</p>
            <p className="text-xs font-mono text-slate-300">{formatRelativeTime(run.startedAt)}</p>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
            <p className="text-[10px] text-slate-600 mb-1">Tokens</p>
            <p className="text-xs font-mono text-slate-300">{run.tokensUsed ? formatTokens(run.tokensUsed) : '—'}</p>
          </div>
        </div>

        {/* Input */}
        <div>
          <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-2">Input</p>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
            <p className="text-xs text-slate-400 leading-relaxed">{run.inputSummary}</p>
          </div>
        </div>

        {/* Output */}
        {run.outputSummary && (
          <div>
            <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-2">Output</p>
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
              <p className="text-xs text-emerald-300 leading-relaxed">{run.outputSummary}</p>
            </div>
          </div>
        )}

        {/* Steps */}
        <div>
          <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-2">
            Steps ({run.steps.filter(s => s.status === 'done').length}/{run.steps.length})
          </p>
          <div className="space-y-1.5">
            {run.steps.map((step, i) => (
              <div key={step.id} className="flex items-center gap-3">
                <span className={[
                  'w-5 h-5 rounded-full text-[10px] flex items-center justify-center shrink-0 font-mono',
                  step.status === 'done'    ? 'bg-emerald-500/20 text-emerald-400'         : '',
                  step.status === 'running' ? 'bg-brand-blue/20 text-brand-blue-bright animate-pulse' : '',
                  step.status === 'error'   ? 'bg-red-500/20 text-red-400'                 : '',
                  step.status === 'pending' ? 'bg-white/[0.05] text-slate-600'             : '',
                ].join(' ')}>
                  {step.status === 'done' ? '✓' : step.status === 'error' ? '✕' : step.status === 'running' ? '▶' : String(i + 1)}
                </span>
                <span className={['text-xs flex-1', step.status === 'pending' ? 'text-slate-600' : 'text-slate-400'].join(' ')}>
                  {step.name}
                </span>
                {step.durationMs && (
                  <span className="text-[10px] text-slate-600 font-mono">{formatDuration(step.durationMs)}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/* ========== Workflow card ========== */

function WorkflowCard({ wf, onRun }: { wf: Workflow; onRun: (wf: Workflow) => void }) {
  const latestRun = mockWorkflowRuns.find(r => r.workflowId === wf.id)

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5 hover:bg-white/[0.04] transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold font-heading text-white truncate">{wf.nameJa}</h3>
            <StatusBadge status={wf.status} />
          </div>
          <p className="text-[10px] font-mono text-slate-600 mt-0.5">{wf.name}</p>
          <p className="text-xs text-slate-500 leading-relaxed mt-2">{wf.description}</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="mt-4 flex items-center gap-4 text-[10px] font-mono text-slate-600">
        <span>{wf.stepCount} steps</span>
        <span>avg {formatDuration(wf.avgDurationMs)}</span>
        <span>{wf.totalRuns} runs</span>
        <span className={wf.successRate >= 95 ? 'text-emerald-500' : wf.successRate >= 80 ? 'text-amber-500' : 'text-red-400'}>
          {wf.successRate}% ok
        </span>
      </div>

      {/* Last run steps */}
      {latestRun && <StepBar steps={latestRun.steps} />}

      {/* Tags + actions */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex gap-1.5 flex-wrap">
          {wf.tags.map(tag => (
            <span key={tag} className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.05] text-slate-500">
              #{tag}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {wf.lastRunAt && (
            <span className="text-[10px] text-slate-600 font-mono">{formatRelativeTime(wf.lastRunAt)}</span>
          )}
          <button
            onClick={() => onRun(wf)}
            className="text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-white/[0.05] text-slate-400 border border-white/[0.08] hover:bg-white/[0.08] transition-colors"
          >
            History
          </button>
          <Link
            href={`/os/workflows/${wf.id}`}
            className="text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-brand-blue/20 text-brand-blue-bright hover:bg-brand-blue/30 transition-colors"
          >
            ▶ Run
          </Link>
        </div>
      </div>
    </motion.div>
  )
}

/* ========== Status filter ========== */

const filters: { label: string; value: WorkflowStatus | 'all' }[] = [
  { label: 'All',       value: 'all'       },
  { label: 'Running',   value: 'running'   },
  { label: 'Paused',    value: 'paused'    },
  { label: 'Idle',      value: 'idle'      },
  { label: 'Queued',    value: 'queued'    },
]

/* ========== Page ========== */

export default function WorkflowsPage() {
  const [filter, setFilter]   = useState<WorkflowStatus | 'all'>('all')
  const [search, setSearch]   = useState('')
  const [selectedRun, setSelectedRun] = useState<WorkflowRun | null>(null)

  const filtered = mockWorkflows.filter(wf => {
    const matchStatus = filter === 'all' || wf.status === filter
    const matchSearch = wf.nameJa.includes(search) || wf.name.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  function handleRun(wf: Workflow) {
    // Simulate: find latest run and show it
    const run = mockWorkflowRuns.find(r => r.workflowId === wf.id)
    if (run) setSelectedRun(run)
  }

  return (
    <div className="space-y-5 max-w-6xl">
      <div>
        <h1 className="text-xl font-bold font-heading text-white">Workflows</h1>
        <p className="text-xs text-slate-600 mt-0.5">{mockWorkflows.length} 件のワークフロー</p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="ワークフローを検索…"
          className="w-full sm:w-64 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-slate-300 placeholder:text-slate-600 focus:border-brand-cyan/40 focus:outline-none focus:ring-1 focus:ring-brand-cyan/20"
        />
        <div className="flex gap-1.5">
          {filters.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={[
                'text-[11px] font-mono px-3 py-1.5 rounded-lg transition-colors',
                filter === f.value
                  ? 'bg-brand-blue/20 text-brand-blue-bright border border-brand-blue/30'
                  : 'bg-white/[0.03] text-slate-500 border border-white/[0.06] hover:text-slate-300',
              ].join(' ')}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* History panel header */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Workflow list */}
        <div className="lg:col-span-2 space-y-3">
          {filtered.map(wf => (
            <WorkflowCard
              key={wf.id}
              wf={wf}
              onRun={handleRun}
            />
          ))}
          {filtered.length === 0 && (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-10 text-center">
              <p className="text-slate-600 text-sm">一致するワークフローが見つかりませんでした</p>
            </div>
          )}
        </div>

        {/* Run history */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Run History</h2>
          <div className="space-y-2">
            {mockWorkflowRuns.map(run => (
              <button
                key={run.id}
                onClick={() => setSelectedRun(run)}
                className={[
                  'w-full text-left rounded-xl border px-4 py-3 transition-colors',
                  selectedRun?.id === run.id
                    ? 'border-brand-cyan/30 bg-brand-cyan/5'
                    : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05]',
                ].join(' ')}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <StatusBadge status={run.status} />
                  <span className="text-[10px] text-slate-600 font-mono">{formatRelativeTime(run.startedAt)}</span>
                </div>
                <p className="text-xs text-slate-300 truncate">{run.workflowName}</p>
                <p className="text-[10px] text-slate-600 truncate mt-0.5">{run.inputSummary}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Run detail side panel */}
      <AnimatePresence>
        {selectedRun && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              onClick={() => setSelectedRun(null)}
            />
            <RunDetail run={selectedRun} onClose={() => setSelectedRun(null)} />
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
