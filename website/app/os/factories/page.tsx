'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import Link from 'next/link'
import StatusBadge from '@/components/os/StatusBadge'
import MetricCard from '@/components/os/MetricCard'
import { api } from '@/lib/api/runtime'
import { formatRelativeTime } from '@/lib/mock'
import type { FactoryRuntime, Workflow, WorkflowRun } from '@/types'

/* ======================================================================
   Factory detail slide panel
   ====================================================================== */

function FactoryDetail({
  factory, workflows, runs, onClose,
}: {
  factory:   FactoryRuntime
  workflows: Workflow[]
  runs:      WorkflowRun[]
  onClose:   () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#0A1220] border-l border-white/[0.08] overflow-y-auto"
    >
      <div
        className="p-5 border-b border-white/[0.06] flex items-start justify-between"
        style={{ borderLeftColor: factory.accentColor, borderLeftWidth: 3 }}
      >
        <div className="flex items-center gap-3">
          <span className="text-3xl" style={{ color: factory.accentColor }}>{factory.icon}</span>
          <div>
            <h3 className="text-sm font-bold font-heading text-white">{factory.name}</h3>
            <p className="text-xs text-slate-600">{factory.nameJa}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-white transition-colors text-lg leading-none"
        >
          ✕
        </button>
      </div>

      <div className="p-5 space-y-5">
        {/* Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
            <p className="text-[10px] text-slate-600 mb-1">Today&apos;s Runs</p>
            <p className="text-xl font-bold font-mono" style={{ color: factory.accentColor }}>{factory.completedToday}</p>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
            <p className="text-[10px] text-slate-600 mb-1">Queue</p>
            <p className="text-xl font-bold font-mono text-slate-300">{factory.queuedTasks}</p>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
            <p className="text-[10px] text-slate-600 mb-1">Memory Items</p>
            <p className="text-xl font-bold font-mono text-purple-400">{factory.memoryItems}</p>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
            <p className="text-[10px] text-slate-600 mb-1">Errors</p>
            <p className={`text-xl font-bold font-mono ${factory.errorCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {factory.errorCount}
            </p>
          </div>
        </div>

        {/* Workflows */}
        <div>
          <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-2">Workflows ({workflows.length})</p>
          <div className="space-y-2">
            {workflows.map(wf => (
              <div key={wf.id} className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                <div>
                  <p className="text-xs font-medium text-slate-300">{wf.nameJa}</p>
                  <p className="text-[10px] text-slate-600 font-mono">{wf.totalRuns} runs · {wf.successRate}% ok</p>
                </div>
                <StatusBadge status={wf.status} />
              </div>
            ))}
            {workflows.length === 0 && (
              <p className="text-xs text-slate-600 text-center py-3">ワークフローなし</p>
            )}
          </div>
        </div>

        {/* Recent runs */}
        {runs.length > 0 && (
          <div>
            <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-2">Recent Runs</p>
            <div className="space-y-2">
              {runs.map(run => (
                <div key={run.id} className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                  <StatusBadge status={run.status} dot />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-400 truncate">{run.inputSummary}</p>
                  </div>
                  <p className="text-[10px] text-slate-600 font-mono shrink-0">{formatRelativeTime(run.startedAt)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-[10px] text-slate-600 font-mono">
          Last activity: {formatRelativeTime(factory.lastActivity)}
        </p>
      </div>
    </motion.div>
  )
}

/* ======================================================================
   Factory card
   ====================================================================== */

function FactoryCard({ factory, onClick, selected }: {
  factory:  FactoryRuntime
  onClick:  () => void
  selected: boolean
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 350, damping: 28 }}
      className={[
        'text-left rounded-2xl border p-5 transition-all duration-200 w-full',
        factory.status === 'disabled'
          ? 'border-white/[0.04] bg-white/[0.01] opacity-50 cursor-not-allowed'
          : selected
            ? 'border-opacity-60 bg-white/[0.06]'
            : 'border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.05]',
      ].join(' ')}
      style={selected ? { borderColor: factory.accentColor + '60' } : {}}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <motion.span
            className="text-3xl"
            style={{ color: factory.accentColor }}
            animate={{ scale: factory.status === 'active' ? [1, 1.05, 1] : 1 }}
            transition={{ repeat: Infinity, duration: 3 }}
          >
            {factory.icon}
          </motion.span>
          <div>
            <p className="text-sm font-bold font-heading text-white">{factory.name}</p>
            <p className="text-xs text-slate-600">{factory.nameJa}</p>
          </div>
        </div>
        <StatusBadge status={factory.status} dot />
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center">
          <p className="text-lg font-bold font-mono" style={{ color: factory.accentColor }}>{factory.completedToday}</p>
          <p className="text-[9px] text-slate-600">done</p>
        </div>
        <div className="text-center border-x border-white/[0.06]">
          <p className="text-lg font-bold font-mono text-slate-300">{factory.queuedTasks}</p>
          <p className="text-[9px] text-slate-600">queued</p>
        </div>
        <div className="text-center">
          <p className={`text-lg font-bold font-mono ${factory.errorCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            {factory.errorCount}
          </p>
          <p className="text-[9px] text-slate-600">errors</p>
        </div>
      </div>

      {factory.status === 'active' && (
        <div className="h-0.5 rounded-full bg-white/[0.05] overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: factory.accentColor }}
            animate={{ x: ['-100%', '100%'] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          />
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        <p className="text-[10px] text-slate-600 font-mono">
          {formatRelativeTime(factory.lastActivity)} · {factory.memoryItems} memories
        </p>
        {factory.status !== 'disabled' && (
          <Link
            href={`/os/factories/${factory.id}`}
            onClick={e => e.stopPropagation()}
            className="text-[10px] font-mono text-slate-600 hover:text-brand-cyan transition-colors"
          >
            詳細 →
          </Link>
        )}
      </div>
    </motion.button>
  )
}

/* ======================================================================
   Page
   ====================================================================== */

export default function FactoriesPage() {
  const [factories,    setFactories]    = useState<FactoryRuntime[]>([])
  const [isLoading,    setIsLoading]    = useState(true)
  const [error,        setError]        = useState<string | null>(null)
  const [selected,     setSelected]     = useState<FactoryRuntime | null>(null)
  const [panelWf,      setPanelWf]      = useState<Workflow[]>([])
  const [panelRuns,    setPanelRuns]    = useState<WorkflowRun[]>([])

  // Initial factory list load
  useEffect(() => {
    const tid = setTimeout(() => {
      setIsLoading(true)
      void api.getFactories().then(res => {
        if (res.ok) setFactories(res.data)
        else setError(res.error)
        setIsLoading(false)
      }).catch(e => {
        setError(e instanceof Error ? e.message : String(e))
        setIsLoading(false)
      })
    }, 0)
    return () => clearTimeout(tid)
  }, [])

  // Fetch workflows + recent runs for the selected factory's detail panel
  useEffect(() => {
    const factoryId = selected?.id
    const tid = setTimeout(() => {
      if (!factoryId) { setPanelWf([]); setPanelRuns([]); return }
      void Promise.all([
        api.getWorkflows({ factoryId }),
        api.getWorkflowRuns({ factoryId, limit: 5 }),
      ]).then(([wfRes, runsRes]) => {
        setPanelWf(wfRes.ok     ? wfRes.data  : [])
        setPanelRuns(runsRes.ok ? runsRes.data : [])
      })
    }, 0)
    return () => clearTimeout(tid)
  }, [selected])

  // Derived summary metrics
  const activeCount   = factories.filter(f => f.status === 'active').length
  const totalDone     = factories.reduce((s, f) => s + f.completedToday, 0)
  const totalErrors   = factories.reduce((s, f) => s + f.errorCount, 0)
  const totalMemories = factories.reduce((s, f) => s + f.memoryItems, 0)

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Loading flash bar — mirrors Dashboard design */}
      {isLoading && (
        <div className="fixed top-14 left-16 lg:left-56 right-0 h-[2px] z-50 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-brand-blue to-brand-cyan"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
          />
        </div>
      )}

      <div>
        <h1 className="text-xl font-bold font-heading text-white">Factory Dashboard</h1>
        <p className="text-xs text-slate-600 mt-0.5">
          {factories.length > 0 ? `${factories.length} Factories — ${activeCount} Active` : '読み込み中…'}
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/05 px-4 py-3 text-xs text-red-400 font-mono">
          {error}
        </div>
      )}

      {/* Summary metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Active Factories"  value={activeCount}   sub="稼働中"     accent="#22D3EE" />
        <MetricCard label="Today's Completed" value={totalDone}     sub="本日完了"   accent="#10B981" />
        <MetricCard label="Total Errors"      value={totalErrors}   sub="エラー合計" accent={totalErrors > 0 ? '#F87171' : '#10B981'} />
        <MetricCard label="Memory Items"      value={totalMemories} sub="メモリ総数" accent="#8B5CF6" />
      </div>

      {/* Factory grid */}
      {factories.length === 0 && !isLoading ? (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-12 text-center">
          <p className="text-slate-600 text-sm">Factoryが見つかりません</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {factories.map(factory => (
            <FactoryCard
              key={factory.id}
              factory={factory}
              selected={selected?.id === factory.id}
              onClick={() => {
                if (factory.status === 'disabled') return
                setSelected(selected?.id === factory.id ? null : factory)
              }}
            />
          ))}
        </div>
      )}

      {/* Detail panel */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              onClick={() => setSelected(null)}
            />
            <FactoryDetail
              factory={selected}
              workflows={panelWf}
              runs={panelRuns}
              onClose={() => setSelected(null)}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
