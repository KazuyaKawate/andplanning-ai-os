'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { api } from '@/lib/api/runtime'
import { formatRelativeTime } from '@/lib/utils'
import type { MemoryEntry, MemoryTag, FactoryRuntime } from '@/types'

/* ======================================================================
   Tag config
   ====================================================================== */

const tagConfig: Record<MemoryTag, { label: string; color: string }> = {
  article:      { label: 'Article',      color: 'bg-brand-blue/15 text-brand-blue-bright border-brand-blue/25'   },
  research:     { label: 'Research',     color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'        },
  task:         { label: 'Task',         color: 'bg-amber-500/15 text-amber-400 border-amber-500/25'              },
  conversation: { label: 'Conversation', color: 'bg-purple-500/15 text-purple-400 border-purple-500/25'           },
  system:       { label: 'System',       color: 'bg-slate-500/15 text-slate-400 border-slate-500/25'              },
}

function TagChip({ tag }: { tag: MemoryTag }) {
  const cfg = tagConfig[tag]
  return (
    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}

/* ======================================================================
   Memory detail modal
   ====================================================================== */

function MemoryDetail({
  entry, factory, onClose,
}: {
  entry:    MemoryEntry
  factory?: FactoryRuntime
  onClose:  () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, y: 8 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="w-full max-w-lg rounded-2xl border border-white/[0.10] bg-[#0C1526] shadow-2xl overflow-hidden">
        <div className="flex items-start justify-between p-5 border-b border-white/[0.06]">
          <div className="flex-1 min-w-0 pr-3">
            <h3 className="text-sm font-bold font-heading text-white leading-snug">{entry.title}</h3>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {entry.tags.map(t => <TagChip key={t} tag={t} />)}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors text-lg">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-2">Summary</p>
            <p className="text-sm text-slate-300 leading-relaxed">{entry.summary}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="text-[10px] text-slate-600 mb-1">Factory</p>
              <div className="flex items-center gap-1.5">
                {factory && <span style={{ color: factory.accentColor }}>{factory.icon}</span>}
                <p className="text-xs text-slate-300">{factory?.nameJa ?? entry.factoryId}</p>
              </div>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="text-[10px] text-slate-600 mb-1">Model</p>
              <p className="text-xs font-mono text-slate-300">{entry.model}</p>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="text-[10px] text-slate-600 mb-1">Size</p>
              <p className="text-xs font-mono text-slate-300">{entry.size.toLocaleString()} chars</p>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="text-[10px] text-slate-600 mb-1">Saved</p>
              <p className="text-xs font-mono text-slate-300">{formatRelativeTime(entry.createdAt)}</p>
            </div>
          </div>
          {entry.workflowId && (
            <p className="text-[10px] text-slate-600 font-mono">Workflow: {entry.workflowId}</p>
          )}
        </div>
      </div>
    </motion.div>
  )
}

/* ======================================================================
   Memory row
   ====================================================================== */

function MemoryRow({
  entry, factory, onClick,
}: {
  entry:    MemoryEntry
  factory?: FactoryRuntime
  onClick:  () => void
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ x: 2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className="w-full text-left flex items-start gap-4 px-4 py-4 hover:bg-white/[0.03] transition-colors border-b border-white/[0.04] last:border-0"
    >
      <span className="text-xl mt-0.5 shrink-0" style={{ color: factory?.accentColor ?? '#94A3B8' }}>
        {factory?.icon ?? '◉'}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-200 truncate">{entry.title}</p>
        <p className="text-xs text-slate-500 leading-snug mt-0.5 line-clamp-2">{entry.summary}</p>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {entry.tags.map(t => <TagChip key={t} tag={t} />)}
        </div>
      </div>
      <div className="text-right shrink-0 space-y-1">
        <p className="text-[10px] text-slate-600 font-mono">{formatRelativeTime(entry.createdAt)}</p>
        <p className="text-[10px] text-slate-700 font-mono">{entry.size.toLocaleString()}c</p>
      </div>
    </motion.button>
  )
}

/* ======================================================================
   Page
   ====================================================================== */

export default function MemoryPage() {
  const [memory,        setMemory]        = useState<MemoryEntry[]>([])
  const [factories,     setFactories]     = useState<FactoryRuntime[]>([])
  const [isLoading,     setIsLoading]     = useState(true)
  const [error,         setError]         = useState<string | null>(null)
  const [search,        setSearch]        = useState('')
  const [tagFilter,     setTagFilter]     = useState<MemoryTag | 'all'>('all')
  const [factoryFilter, setFactoryFilter] = useState('all')
  const [selected,      setSelected]      = useState<MemoryEntry | null>(null)

  // Initial data load via api runtime
  useEffect(() => {
    const tid = setTimeout(() => {
      setIsLoading(true)
      void Promise.all([
        api.getMemory({ limit: 100 }),
        api.getFactories(),
      ]).then(([memRes, facRes]) => {
        if (memRes.ok) setMemory(memRes.data)
        else           setError(memRes.error)
        if (facRes.ok) setFactories(facRes.data)
        setIsLoading(false)
      }).catch(e => {
        setError(e instanceof Error ? e.message : String(e))
        setIsLoading(false)
      })
    }, 0)
    return () => clearTimeout(tid)
  }, [])

  // Factory lookup map — O(1) access in render
  const factoryMap = useMemo(
    () => Object.fromEntries(factories.map(f => [f.id, f])) as Record<string, FactoryRuntime>,
    [factories],
  )

  // Client-side filter (search, tag, factory)
  const filtered = useMemo(() => {
    return memory.filter(m => {
      const matchSearch  = !search || m.title.includes(search) || m.summary.includes(search)
      const matchTag     = tagFilter === 'all' || m.tags.includes(tagFilter)
      const matchFactory = factoryFilter === 'all' || m.factoryId === factoryFilter
      return matchSearch && matchTag && matchFactory
    })
  }, [memory, search, tagFilter, factoryFilter])

  const totalSize       = useMemo(() => memory.reduce((s, m) => s + m.size, 0), [memory])
  const factoryOptions  = useMemo(() => factories.filter(f => f.memoryItems > 0), [factories])

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Loading flash bar — matches Dashboard/Factory/Workflow design */}
      {isLoading && (
        <div className="fixed top-14 left-16 lg:left-56 right-0 h-[2px] z-50 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-brand-blue to-brand-cyan"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
          />
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold font-heading text-white">Memory</h1>
          <p className="text-xs text-slate-600 mt-0.5">
            {memory.length > 0
              ? `${memory.length} 件 · 合計 ${totalSize.toLocaleString()} chars`
              : isLoading ? '読み込み中…' : '0 件'}
          </p>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-xs text-red-400 font-mono">
          {error}
        </div>
      )}

      {/* Tag stats bar */}
      <div className="flex gap-3 overflow-x-auto pb-1">
        {Object.entries(tagConfig).map(([tag, cfg]) => {
          const count = memory.filter(m => m.tags.includes(tag as MemoryTag)).length
          return (
            <button
              key={tag}
              onClick={() => setTagFilter(tag === tagFilter ? 'all' : tag as MemoryTag)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 border text-[11px] font-mono whitespace-nowrap transition-colors ${
                tagFilter === tag
                  ? cfg.color
                  : 'border-white/[0.06] bg-white/[0.02] text-slate-600 hover:text-slate-400'
              }`}
            >
              {cfg.label}
              <span className="opacity-60">{count}</span>
            </button>
          )
        })}
      </div>

      {/* Search + factory filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="メモリを検索…"
          className="w-full sm:w-80 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-slate-300 placeholder:text-slate-600 focus:border-brand-cyan/40 focus:outline-none focus:ring-1 focus:ring-brand-cyan/20"
        />
        <select
          value={factoryFilter}
          onChange={e => setFactoryFilter(e.target.value)}
          className="rounded-lg border border-white/[0.08] bg-[#0A1220] px-3 py-2 text-sm text-slate-400 focus:outline-none focus:border-brand-cyan/40"
        >
          <option value="all">全 Factory</option>
          {factoryOptions.map(f => (
            <option key={f.id} value={f.id}>{f.nameJa}</option>
          ))}
        </select>
      </div>

      {/* Memory list */}
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
        {memory.length === 0 && !isLoading ? (
          <div className="p-10 text-center">
            <p className="text-slate-600 text-sm">メモリがありません</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-slate-600 text-sm">一致するメモリが見つかりませんでした</p>
          </div>
        ) : (
          filtered.map(entry => (
            <MemoryRow
              key={entry.id}
              entry={entry}
              factory={factoryMap[entry.factoryId]}
              onClick={() => setSelected(entry)}
            />
          ))
        )}
      </div>

      {/* Detail overlay */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              onClick={() => setSelected(null)}
            />
            <MemoryDetail
              entry={selected}
              factory={factoryMap[selected.factoryId]}
              onClose={() => setSelected(null)}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
