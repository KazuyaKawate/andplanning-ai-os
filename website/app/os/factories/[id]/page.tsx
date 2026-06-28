'use client'

import { useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import Link from 'next/link'
import StatusBadge from '@/components/os/StatusBadge'
import {
  mockFactories, mockWorkflows, mockWorkflowRuns,
  mockMemory, mockFactoryOutputs, mockFactoryKnowledge, mockFactorySettings,
  formatRelativeTime, formatDuration, formatTokens,
} from '@/lib/mock'
import type {
  FactoryRuntime, FactoryKnowledge, FactorySettings,
  MemoryEntry, MemoryTag,
} from '@/types'

/* ======================================================================
   Tab config
   ====================================================================== */

type Tab = 'overview' | 'workflow' | 'memory' | 'history' | 'settings'

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview',  label: 'Overview'  },
  { id: 'workflow',  label: 'Workflow'  },
  { id: 'memory',    label: 'Memory'    },
  { id: 'history',   label: 'History'   },
  { id: 'settings',  label: 'Settings'  },
]

/* ======================================================================
   Shared helpers
   ====================================================================== */

function StatCard({
  label, value, sub, color,
}: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
      <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-xl font-bold font-mono" style={color ? { color } : undefined}>
        {value}
      </p>
      {sub && <p className="text-[10px] text-slate-600 mt-0.5">{sub}</p>}
    </div>
  )
}

const knowledgeTypeBadge: Record<FactoryKnowledge['type'], string> = {
  prompt:    'bg-brand-blue/15 text-brand-blue-bright border-brand-blue/25',
  template:  'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  reference: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  example:   'bg-purple-500/15 text-purple-400 border-purple-500/25',
}

/* ======================================================================
   Overview Tab
   ====================================================================== */

function OverviewTab({ factory }: { factory: FactoryRuntime }) {
  const workflows  = mockWorkflows.filter(w => w.factoryId === factory.id)
  const runs       = mockWorkflowRuns.filter(r => r.factoryId === factory.id)
  const outputs    = mockFactoryOutputs.filter(o => o.factoryId === factory.id)
  const knowledge  = mockFactoryKnowledge.filter(k => k.factoryId === factory.id)

  const totalTokens = runs.reduce((s, r) => s + (r.tokensUsed ?? 0), 0)
  const successRate = runs.length > 0
    ? Math.round(runs.filter(r => r.status === 'completed').length / runs.length * 100)
    : 0
  const avgDuration = runs.length > 0
    ? runs.filter(r => r.endedAt).reduce((s, r) => {
        return s + (new Date(r.endedAt!).getTime() - new Date(r.startedAt).getTime())
      }, 0) / Math.max(1, runs.filter(r => r.endedAt).length)
    : 0

  const latestOutput = outputs[0] ?? null

  return (
    <div className="space-y-5">
      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Total Runs"     value={factory.completedToday + runs.length} sub="累計"          color={factory.accentColor} />
        <StatCard label="Success Rate"   value={`${successRate}%`}  sub="成功率"        color={successRate >= 90 ? '#10B981' : '#F59E0B'} />
        <StatCard label="Avg Duration"   value={avgDuration > 0 ? formatDuration(avgDuration) : '—'} sub="平均処理時間" />
        <StatCard label="Tokens Used"    value={formatTokens(totalTokens)} sub="使用トークン"  color="#8B5CF6" />
        <StatCard label="Memory Items"   value={factory.memoryItems}  sub="保存メモリ"    color="#A78BFA" />
        <StatCard label="Active WF"      value={factory.activeWorkflows} sub="実行中"      color={factory.accentColor} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Latest Output */}
        <div className="lg:col-span-2 space-y-4">
          {latestOutput ? (
            <div>
              <h3 className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold mb-3">Latest Output</h3>
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
                <div className="px-5 py-4 border-b border-white/[0.05]">
                  <p className="text-sm font-semibold text-white leading-snug">{latestOutput.title}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] font-mono text-slate-600">
                    <span>{latestOutput.model}</span>
                    <span>·</span>
                    <span>{formatTokens(latestOutput.tokensUsed)} tok</span>
                    <span>·</span>
                    <span>{formatRelativeTime(latestOutput.createdAt)}</span>
                  </div>
                </div>
                <div className="p-5">
                  <pre className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap line-clamp-6 font-mono">
                    {latestOutput.preview}
                  </pre>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
              <p className="text-slate-600 text-sm">出力履歴がありません</p>
            </div>
          )}

          {/* Recent runs */}
          <div>
            <h3 className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold mb-3">Recent Workflows</h3>
            <div className="space-y-2">
              {runs.slice(0, 4).map(run => (
                <Link
                  key={run.id}
                  href={`/os/workflows/${run.workflowId}`}
                  className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 hover:bg-white/[0.05] transition-colors"
                >
                  <StatusBadge status={run.status} dot />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-300 truncate">{run.workflowName}</p>
                    <p className="text-[10px] text-slate-600 truncate mt-0.5">{run.inputSummary}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-slate-600 font-mono">{formatRelativeTime(run.startedAt)}</p>
                    {run.tokensUsed && (
                      <p className="text-[10px] text-slate-700 font-mono">{formatTokens(run.tokensUsed)} tok</p>
                    )}
                  </div>
                </Link>
              ))}
              {runs.length === 0 && (
                <p className="text-xs text-slate-600 text-center py-4">実行履歴なし</p>
              )}
            </div>
          </div>
        </div>

        {/* Right: Knowledge list */}
        <div>
          <h3 className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold mb-3">
            Knowledge ({knowledge.length})
          </h3>
          <div className="space-y-2">
            {knowledge.map(item => (
              <motion.div
                key={item.id}
                whileHover={{ x: 2 }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
              >
                <div className="flex items-start gap-2 mb-1">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border shrink-0 ${knowledgeTypeBadge[item.type]}`}>
                    {item.type}
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-300">{item.title}</p>
                <p className="text-[10px] text-slate-600 leading-snug mt-1 line-clamp-2">{item.description}</p>
                <div className="flex items-center gap-2 mt-1.5 text-[10px] font-mono text-slate-700">
                  <span>{item.size.toLocaleString()} chars</span>
                  <span>·</span>
                  <span>{formatRelativeTime(item.updatedAt)}</span>
                </div>
              </motion.div>
            ))}
            {knowledge.length === 0 && (
              <p className="text-xs text-slate-600 text-center py-4">Knowledge なし</p>
            )}
          </div>

          {/* Workflow summary */}
          <h3 className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold mt-5 mb-3">
            Workflows ({workflows.length})
          </h3>
          <div className="space-y-1.5">
            {workflows.map(wf => (
              <Link
                key={wf.id}
                href={`/os/workflows/${wf.id}`}
                className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 hover:bg-white/[0.05] transition-colors"
              >
                <p className="text-xs text-slate-400 truncate flex-1">{wf.nameJa}</p>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-[10px] text-slate-600 font-mono">{wf.successRate}%</span>
                  <StatusBadge status={wf.status} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ======================================================================
   Workflow Tab
   ====================================================================== */

function WorkflowTab({ factory }: { factory: FactoryRuntime }) {
  const workflows = mockWorkflows.filter(w => w.factoryId === factory.id)

  if (workflows.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-10 text-center">
        <p className="text-slate-600 text-sm">このFactoryのワークフローはまだありません</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {workflows.map(wf => {
        const latestRun = mockWorkflowRuns.find(r => r.workflowId === wf.id)
        return (
          <motion.div
            key={wf.id}
            whileHover={{ y: -1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold font-heading text-white">{wf.nameJa}</h3>
                  <StatusBadge status={wf.status} />
                </div>
                <p className="text-[10px] font-mono text-slate-600 mt-0.5">{wf.name}</p>
                <p className="text-xs text-slate-500 leading-relaxed mt-2">{wf.description}</p>
              </div>
            </div>

            {/* Stats */}
            <div className="mt-3 flex items-center gap-4 text-[10px] font-mono text-slate-600">
              <span>{wf.stepCount} steps</span>
              <span>avg {formatDuration(wf.avgDurationMs)}</span>
              <span>{wf.totalRuns} runs</span>
              <span className={wf.successRate >= 95 ? 'text-emerald-500' : wf.successRate >= 80 ? 'text-amber-500' : 'text-red-400'}>
                {wf.successRate}% ok
              </span>
              {wf.lastRunAt && <span>{formatRelativeTime(wf.lastRunAt)}</span>}
            </div>

            {/* Latest run steps */}
            {latestRun && (
              <div className="flex gap-0.5 mt-3">
                {latestRun.steps.map((step, i) => (
                  <div
                    key={step.id}
                    title={step.name}
                    className={[
                      'h-1.5 flex-1 rounded-full',
                      step.status === 'done'    ? 'bg-emerald-500'    : '',
                      step.status === 'running' ? 'bg-brand-blue animate-pulse' : '',
                      step.status === 'error'   ? 'bg-red-500'        : '',
                      step.status === 'pending' ? 'bg-white/[0.08]'   : '',
                    ].join(' ')}
                    style={{ animationDelay: `${i * 0.04}s` }}
                  />
                ))}
              </div>
            )}

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
                <Link
                  href={`/os/workflows/${wf.id}`}
                  className="text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-white/[0.05] text-slate-400 border border-white/[0.08] hover:bg-white/[0.08] transition-colors"
                >
                  History
                </Link>
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
      })}
    </div>
  )
}

/* ======================================================================
   Memory Tab
   ====================================================================== */

const tagConfig: Record<MemoryTag, { label: string; color: string }> = {
  article:      { label: 'Article',      color: 'bg-brand-blue/15 text-brand-blue-bright border-brand-blue/25'    },
  research:     { label: 'Research',     color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'         },
  task:         { label: 'Task',         color: 'bg-amber-500/15 text-amber-400 border-amber-500/25'               },
  conversation: { label: 'Conversation', color: 'bg-purple-500/15 text-purple-400 border-purple-500/25'            },
  system:       { label: 'System',       color: 'bg-slate-500/15 text-slate-400 border-slate-500/25'               },
}

function MemoryTagChip({ tag }: { tag: MemoryTag }) {
  const cfg = tagConfig[tag]
  return (
    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}

function MemoryTab({ factoryId }: { factoryId: string }) {
  const [search, setSearch]     = useState('')
  const [tagFilter, setTagFilter] = useState<MemoryTag | 'all'>('all')
  const [selected, setSelected] = useState<MemoryEntry | null>(null)

  const entries = useMemo(() => {
    return mockMemory
      .filter(m => m.factoryId === factoryId)
      .filter(m => !search || m.title.includes(search) || m.summary.includes(search))
      .filter(m => tagFilter === 'all' || m.tags.includes(tagFilter))
  }, [factoryId, search, tagFilter])

  const allTags = Array.from(
    new Set(mockMemory.filter(m => m.factoryId === factoryId).flatMap(m => m.tags))
  ) as MemoryTag[]

  return (
    <div className="space-y-4">
      {/* Search + tag filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="メモリを検索…"
          className="w-full sm:w-72 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-slate-300 placeholder:text-slate-600 focus:border-brand-cyan/40 focus:outline-none focus:ring-1 focus:ring-brand-cyan/20"
        />
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setTagFilter('all')}
            className={`text-[11px] font-mono px-3 py-1.5 rounded-lg border transition-colors ${
              tagFilter === 'all'
                ? 'bg-white/[0.08] text-slate-300 border-white/[0.12]'
                : 'bg-white/[0.02] text-slate-600 border-white/[0.06] hover:text-slate-400'
            }`}
          >
            All
          </button>
          {allTags.map(tag => {
            const cfg = tagConfig[tag]
            return (
              <button
                key={tag}
                onClick={() => setTagFilter(tag === tagFilter ? 'all' : tag)}
                className={`text-[11px] font-mono px-3 py-1.5 rounded-lg border transition-colors ${
                  tagFilter === tag ? cfg.color : 'bg-white/[0.02] text-slate-600 border-white/[0.06] hover:text-slate-400'
                }`}
              >
                {cfg.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* List */}
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
        {entries.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-slate-600 text-sm">一致するメモリが見つかりません</p>
          </div>
        ) : (
          entries.map((entry) => (
            <motion.button
              key={entry.id}
              onClick={() => setSelected(entry)}
              whileHover={{ x: 2 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              className="w-full text-left flex items-start gap-4 px-4 py-4 hover:bg-white/[0.03] transition-colors border-b border-white/[0.04] last:border-0"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">{entry.title}</p>
                <p className="text-xs text-slate-500 leading-snug mt-0.5 line-clamp-2">{entry.summary}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {entry.tags.map(t => <MemoryTagChip key={t} tag={t} />)}
                </div>
              </div>
              <div className="text-right shrink-0 space-y-1">
                <p className="text-[10px] text-slate-600 font-mono">{formatRelativeTime(entry.createdAt)}</p>
                <p className="text-[10px] text-slate-700 font-mono">{entry.size.toLocaleString()}c</p>
              </div>
            </motion.button>
          ))
        )}
      </div>

      {/* Detail modal */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              onClick={() => setSelected(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="w-full max-w-lg rounded-2xl border border-white/[0.10] bg-[#0C1526] shadow-2xl overflow-hidden">
                <div className="flex items-start justify-between p-5 border-b border-white/[0.06]">
                  <div className="flex-1 min-w-0 pr-3">
                    <h3 className="text-sm font-bold font-heading text-white leading-snug">{selected.title}</h3>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {selected.tags.map(t => <MemoryTagChip key={t} tag={t} />)}
                    </div>
                  </div>
                  <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-white transition-colors text-lg">✕</button>
                </div>
                <div className="p-5 space-y-4">
                  <p className="text-sm text-slate-300 leading-relaxed">{selected.summary}</p>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                      <p className="text-[10px] text-slate-600 mb-1">Model</p>
                      <p className="font-mono text-slate-300">{selected.model}</p>
                    </div>
                    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                      <p className="text-[10px] text-slate-600 mb-1">Saved</p>
                      <p className="font-mono text-slate-300">{formatRelativeTime(selected.createdAt)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ======================================================================
   History Tab
   ====================================================================== */

function HistoryTab({ factoryId, accentColor }: { factoryId: string; accentColor: string }) {
  const runs    = mockWorkflowRuns.filter(r => r.factoryId === factoryId)
  const outputs = mockFactoryOutputs.filter(o => o.factoryId === factoryId)
  const maxTokens = Math.max(...outputs.map(o => o.tokensUsed), 1)

  return (
    <div className="space-y-6">
      {/* Run history */}
      <div>
        <h3 className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold mb-3">
          Workflow 実行履歴 ({runs.length}件)
        </h3>
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-12 gap-3 px-4 py-2 border-b border-white/[0.05] text-[10px] text-slate-600 uppercase tracking-widest font-mono">
            <span className="col-span-4">Workflow</span>
            <span className="col-span-2">Status</span>
            <span className="col-span-2">Started</span>
            <span className="col-span-2">Tokens</span>
            <span className="col-span-2">Duration</span>
          </div>
          {runs.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-slate-600 text-sm">実行履歴がありません</p>
            </div>
          ) : (
            runs.map((run, i) => {
              const duration = run.endedAt
                ? new Date(run.endedAt).getTime() - new Date(run.startedAt).getTime()
                : null
              return (
                <motion.div
                  key={run.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="col-span-4 min-w-0">
                    <p className="text-xs text-slate-300 truncate">{run.workflowName}</p>
                    <p className="text-[10px] text-slate-600 truncate font-mono">{run.inputSummary}</p>
                  </div>
                  <div className="col-span-2 flex items-center">
                    <StatusBadge status={run.status} dot />
                  </div>
                  <div className="col-span-2 flex items-center">
                    <span className="text-[10px] text-slate-500 font-mono">{formatRelativeTime(run.startedAt)}</span>
                  </div>
                  <div className="col-span-2 flex items-center">
                    <span className="text-[10px] text-slate-500 font-mono">
                      {run.tokensUsed ? formatTokens(run.tokensUsed) : '—'}
                    </span>
                  </div>
                  <div className="col-span-2 flex items-center">
                    <span className="text-[10px] text-slate-500 font-mono">
                      {duration ? formatDuration(duration) : '—'}
                    </span>
                  </div>
                </motion.div>
              )
            })
          )}
        </div>
      </div>

      {/* Output history */}
      <div>
        <h3 className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold mb-3">
          Output 履歴 ({outputs.length}件)
        </h3>
        <div className="space-y-3">
          {outputs.map((out, i) => (
            <motion.div
              key={out.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-white leading-snug">{out.title}</p>
                <span className="text-[10px] font-mono text-slate-600 shrink-0">{formatRelativeTime(out.createdAt)}</span>
              </div>
              <pre className="text-xs text-slate-500 leading-relaxed whitespace-pre-wrap line-clamp-3 font-mono mt-2">
                {out.preview}
              </pre>
              <div className="flex items-center gap-3 mt-3 text-[10px] font-mono text-slate-600">
                <span>{out.model}</span>
                <span>·</span>
                <span>{out.tokensUsed.toLocaleString()} tokens</span>
              </div>
            </motion.div>
          ))}
          {outputs.length === 0 && (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
              <p className="text-slate-600 text-sm">出力履歴がありません</p>
            </div>
          )}
        </div>
      </div>

      {/* Token usage chart */}
      {outputs.length > 0 && (
        <div>
          <h3 className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold mb-3">Token 使用量</h3>
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5 space-y-3">
            {outputs.map(out => (
              <div key={out.id} className="flex items-center gap-3">
                <span className="w-32 text-[10px] text-slate-500 font-mono truncate">{out.title.substring(0, 16)}…</span>
                <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.round(out.tokensUsed / maxTokens * 100)}%` }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: accentColor }}
                  />
                </div>
                <span className="text-[10px] text-slate-600 font-mono w-12 text-right shrink-0">
                  {formatTokens(out.tokensUsed)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ======================================================================
   Settings Tab
   ====================================================================== */

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${checked ? 'bg-brand-cyan' : 'bg-white/[0.12]'}`}
    >
      <motion.span
        layout
        animate={{ x: checked ? 16 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="inline-block h-4 w-4 rounded-full bg-white shadow"
      />
    </button>
  )
}

const MODEL_OPTIONS = [
  { id: 'claude-sonnet-4-6',         label: 'Claude Sonnet 4.6',    provider: 'Anthropic' },
  { id: 'claude-opus-4-8',           label: 'Claude Opus 4.8',      provider: 'Anthropic' },
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5',     provider: 'Anthropic' },
  { id: 'gpt-4o',                    label: 'GPT-4o',               provider: 'OpenAI'    },
  { id: 'gpt-4o-mini',               label: 'GPT-4o mini',          provider: 'OpenAI'    },
  { id: 'gemini-2.0-flash',          label: 'Gemini 2.0 Flash',     provider: 'Google'    },
]

function SettingsTab({ factoryId }: { factoryId: string }) {
  const defaultSettings = mockFactorySettings[factoryId] ?? {
    factoryId, model: 'claude-sonnet-4-6', temperature: 0.7, maxTokens: 4096,
    systemPrompt: '', autoSaveMemory: false, notifyOnComplete: false,
  }
  const [settings, setSettings] = useState<FactorySettings>(defaultSettings)
  const [saved, setSaved] = useState(false)

  function handleSave() {
    // Real: PATCH /api/factories/{factoryId}/settings  { settings }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleReset() {
    setSettings(defaultSettings)
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Model */}
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5 space-y-4">
        <h3 className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold">Model</h3>
        <div>
          <label className="block text-xs text-slate-500 mb-2">使用モデル</label>
          <select
            value={settings.model}
            onChange={e => setSettings(s => ({ ...s, model: e.target.value }))}
            className="w-full rounded-lg border border-white/[0.08] bg-[#0A1220] px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-brand-cyan/40"
          >
            {MODEL_OPTIONS.map(m => (
              <option key={m.id} value={m.id}>{m.label} ({m.provider})</option>
            ))}
          </select>
        </div>

        {/* Temperature */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-slate-500">Temperature</label>
            <span className="text-xs font-mono text-brand-cyan">{settings.temperature.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={settings.temperature}
            onChange={e => setSettings(s => ({ ...s, temperature: parseFloat(e.target.value) }))}
            className="w-full accent-cyan-400 h-1.5 rounded-full bg-white/[0.08] cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-700 font-mono mt-1">
            <span>0.0 Precise</span>
            <span>1.0 Balanced</span>
            <span>2.0 Creative</span>
          </div>
        </div>

        {/* Max Tokens */}
        <div>
          <label className="block text-xs text-slate-500 mb-2">Max Tokens</label>
          <input
            type="number"
            min={256}
            max={32768}
            step={256}
            value={settings.maxTokens}
            onChange={e => setSettings(s => ({ ...s, maxTokens: parseInt(e.target.value) || 4096 }))}
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-slate-300 font-mono focus:border-brand-cyan/40 focus:outline-none focus:ring-1 focus:ring-brand-cyan/20"
          />
        </div>
      </div>

      {/* System Prompt */}
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5 space-y-3">
        <h3 className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold">System Prompt</h3>
        <textarea
          value={settings.systemPrompt}
          onChange={e => setSettings(s => ({ ...s, systemPrompt: e.target.value }))}
          rows={6}
          className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-slate-300 placeholder:text-slate-600 focus:border-brand-cyan/40 focus:outline-none focus:ring-1 focus:ring-brand-cyan/20 resize-y font-mono leading-relaxed"
          placeholder="このFactoryのデフォルトシステムプロンプトを入力..."
        />
        <p className="text-[10px] text-slate-600 font-mono">{settings.systemPrompt.length} chars</p>
      </div>

      {/* Toggles */}
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5 space-y-4">
        <h3 className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold">動作設定</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-300">Auto-save Memory</p>
            <p className="text-[11px] text-slate-600 mt-0.5">実行結果を自動的にMemoryに保存する</p>
          </div>
          <Toggle checked={settings.autoSaveMemory} onChange={v => setSettings(s => ({ ...s, autoSaveMemory: v }))} />
        </div>
        <div className="flex items-center justify-between border-t border-white/[0.05] pt-4">
          <div>
            <p className="text-sm text-slate-300">完了通知</p>
            <p className="text-[11px] text-slate-600 mt-0.5">Workflow完了時にブラウザ通知を送信する</p>
          </div>
          <Toggle checked={settings.notifyOnComplete} onChange={v => setSettings(s => ({ ...s, notifyOnComplete: v }))} />
        </div>
      </div>

      {/* Save / Reset */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          className={[
            'flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors',
            saved
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-brand-blue text-white hover:bg-brand-blue/80',
          ].join(' ')}
        >
          {saved ? '✓ 保存しました' : '保存'}
        </button>
        <button
          onClick={handleReset}
          className="px-5 py-2.5 rounded-lg text-sm text-slate-500 border border-white/[0.08] hover:text-slate-300 hover:border-white/[0.15] transition-colors"
        >
          デフォルトに戻す
        </button>
      </div>
    </div>
  )
}

/* ======================================================================
   Factory Hero (always visible)
   ====================================================================== */

function FactoryHero({ factory }: { factory: FactoryRuntime }) {
  const workflows = mockWorkflows.filter(w => w.factoryId === factory.id)
  const runs      = mockWorkflowRuns.filter(r => r.factoryId === factory.id)
  const totalTokens = runs.reduce((s, r) => s + (r.tokensUsed ?? 0), 0)

  return (
    <div
      className="relative rounded-2xl border p-6 overflow-hidden"
      style={{
        borderColor:  `${factory.accentColor}30`,
        background:   `linear-gradient(135deg, ${factory.accentColor}08 0%, transparent 55%)`,
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(circle at top left, ${factory.accentColor}12, transparent 60%)` }}
      />
      <div className="relative flex items-start gap-4">
        <motion.span
          className="text-5xl shrink-0"
          style={{ color: factory.accentColor }}
          animate={factory.status === 'active' ? { scale: [1, 1.06, 1] } : {}}
          transition={{ repeat: Infinity, duration: 3 }}
        >
          {factory.icon}
        </motion.span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold font-heading text-white">{factory.name}</h1>
            <StatusBadge status={factory.status} dot={factory.status === 'active'} />
          </div>
          <p className="text-sm text-slate-500 mt-0.5">{factory.nameJa}</p>
          <div className="flex items-center gap-4 mt-3 text-[11px] font-mono text-slate-600 flex-wrap">
            <span style={{ color: factory.accentColor }}>{factory.completedToday} done today</span>
            <span>·</span>
            <span>{workflows.length} workflows</span>
            <span>·</span>
            <span>{factory.memoryItems} memories</span>
            <span>·</span>
            <span>{formatTokens(totalTokens)} tokens used</span>
            <span>·</span>
            <span>Last active {formatRelativeTime(factory.lastActivity)}</span>
          </div>
        </div>
        {factory.status === 'active' && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden rounded-b-2xl">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: factory.accentColor, width: '30%' }}
              animate={{ x: ['-100%', '400%'] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

/* ======================================================================
   Page
   ====================================================================== */

export default function FactoryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [tab, setTab] = useState<Tab>('overview')

  // Real: GET /api/factories/{id}
  const factory = mockFactories.find(f => f.id === id)

  if (!factory) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-slate-500 text-sm">Factory &ldquo;{id}&rdquo; が見つかりません</p>
        <Link href="/os/factories" className="text-xs text-brand-cyan hover:underline">
          ← Factories 一覧へ
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-5xl space-y-0">
      {/* Back link */}
      <div className="mb-4">
        <Link
          href="/os/factories"
          className="inline-flex items-center gap-1 text-[11px] text-slate-600 hover:text-slate-400 transition-colors"
        >
          ← Factories
        </Link>
      </div>

      {/* Hero */}
      <FactoryHero factory={factory} />

      {/* Tab bar — sticky below topbar */}
      <div className="sticky top-0 z-10 bg-[#060C18] border-b border-white/[0.06] -mx-4 lg:-mx-6 px-4 lg:px-6 mt-5">
        <div className="flex gap-0 overflow-x-auto scrollbar-none">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={[
                'relative shrink-0 px-4 py-3 text-[12px] font-medium transition-colors',
                tab === t.id ? 'text-white' : 'text-slate-500 hover:text-slate-300',
              ].join(' ')}
            >
              {t.label}
              {tab === t.id && (
                <motion.div
                  layoutId="factory-detail-tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full"
                  style={{ backgroundColor: factory.accentColor }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="pt-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            {tab === 'overview'  && <OverviewTab  factory={factory} />}
            {tab === 'workflow'  && <WorkflowTab  factory={factory} />}
            {tab === 'memory'    && <MemoryTab    factoryId={factory.id} />}
            {tab === 'history'   && <HistoryTab   factoryId={factory.id} accentColor={factory.accentColor} />}
            {tab === 'settings'  && <SettingsTab  factoryId={factory.id} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
