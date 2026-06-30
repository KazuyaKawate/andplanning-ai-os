'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { formatRelativeTime } from '@/lib/utils'
import type { DevFileNode, DevPatch, DevHistoryEntry, AgentTask } from '@/types'

const BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000').replace(/\/$/, '')

/* ======================================================================
   File tree node
   ====================================================================== */

function FileTreeNode({
  node, depth, selected, onSelect,
}: {
  node: DevFileNode; depth: number; selected: string | null; onSelect: (p: string) => void
}) {
  const [open, setOpen] = useState(depth < 2)
  const isFile     = node.type === 'file'
  const isSelected = selected === node.path

  return (
    <div>
      <button
        onClick={() => isFile ? onSelect(node.path) : setOpen(o => !o)}
        style={{ paddingLeft: `${8 + depth * 12}px` }}
        className={[
          'w-full flex items-center gap-1.5 py-1 pr-2 rounded text-left text-xs transition-colors',
          isSelected ? 'bg-brand-blue/20 text-brand-cyan' : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200',
        ].join(' ')}
      >
        <span className="shrink-0 text-[10px]">{isFile ? '📄' : open ? '📂' : '📁'}</span>
        <span className="truncate font-mono">{node.name}</span>
        {isFile && node.size !== undefined && (
          <span className="text-[9px] text-slate-700 ml-auto">
            {node.size < 1024 ? `${node.size}B` : `${(node.size / 1024).toFixed(0)}K`}
          </span>
        )}
      </button>
      {!isFile && open && node.children?.map(c => (
        <FileTreeNode key={c.path} node={c} depth={depth + 1} selected={selected} onSelect={onSelect} />
      ))}
    </div>
  )
}

/* ======================================================================
   Task row
   ====================================================================== */

const STATUS_COLORS: Record<string, string> = {
  pending:     'bg-slate-500/20 text-slate-400',
  in_progress: 'bg-amber-500/20 text-amber-400',
  review:      'bg-purple-500/20 text-purple-400',
  blocked:     'bg-red-500/20 text-red-400',
  completed:   'bg-emerald-500/20 text-emerald-400',
  failed:      'bg-red-500/20 text-red-400',
}

const AGENT_ICONS: Record<string, string> = {
  'architect-claude': '🏛️', 'backend-claude': '⚙️', 'frontend-claude': '🎨',
  'reviewer-claude': '🔍', 'debug-claude': '🐛', 'research-claude': '🔬',
  'virtual-claude-dev': '🛠️', 'auto-debugger': '🐛',
}

function TaskRow({ task, onStatusChange }: { task: AgentTask; onStatusChange?: (id: string, status: string) => void }) {
  const clr = STATUS_COLORS[task.status] ?? 'bg-slate-500/20 text-slate-500'
  const icon = AGENT_ICONS[task.agentId ?? ''] ?? '🤖'
  return (
    <div className="rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2 space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-base shrink-0">{icon}</span>
        <p className="text-xs text-slate-200 font-medium flex-1 truncate">{task.title}</p>
        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0 ${clr}`}>
          {task.status}
        </span>
      </div>
      {task.filePath && (
        <p className="text-[10px] font-mono text-slate-600 truncate">{task.filePath}</p>
      )}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-slate-700">P{task.priority}</span>
        {task.agentId && <span className="text-[10px] text-slate-600">{task.agentId}</span>}
        <span className="text-[10px] text-slate-700 ml-auto">{formatRelativeTime(task.createdAt)}</span>
      </div>
    </div>
  )
}

/* ======================================================================
   Diff viewer
   ====================================================================== */

function DiffViewer({ original, updated }: { original: string; updated: string }) {
  const origLines = original.split('\n')
  const updLines  = updated.split('\n')
  const rows: { o: string | null; u: string | null }[] = []
  const max = Math.max(origLines.length, updLines.length)
  for (let i = 0; i < max; i++) {
    const o = origLines[i] ?? null
    const u = updLines[i]  ?? null
    if (o !== u) rows.push({ o, u })
  }
  if (rows.length === 0) return <p className="text-xs text-slate-600 p-2">変更なし</p>
  return (
    <div className="font-mono text-[10px] overflow-auto max-h-40">
      {rows.slice(0, 80).map((row, i) => (
        <div key={i}>
          {row.o !== null && <div className="px-2 py-0.5 whitespace-pre text-red-400 bg-red-500/10">- {row.o}</div>}
          {row.u !== null && <div className="px-2 py-0.5 whitespace-pre text-emerald-400 bg-emerald-500/10">+ {row.u}</div>}
        </div>
      ))}
    </div>
  )
}

/* ======================================================================
   Patch mini card
   ====================================================================== */

function PatchMini({ p, onApply, onReject }: {
  p: DevPatch
  onApply: (id: string) => void
  onReject: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className={[
      'rounded-lg border p-2 text-xs space-y-1.5',
      p.status === 'pending'  ? 'border-brand-blue/20 bg-brand-blue/5'    : '',
      p.status === 'applied'  ? 'border-emerald-500/20 bg-emerald-500/5 opacity-70' : '',
      p.status === 'rejected' ? 'border-white/[0.05] opacity-40' : '',
    ].join(' ')}>
      <div className="flex items-center gap-1.5">
        <p className="flex-1 truncate text-slate-200 font-medium">{p.title}</p>
        <span className={`text-[9px] font-mono px-1 py-0.5 rounded ${p.riskLevel === 'high' ? 'bg-red-500/20 text-red-400' : p.riskLevel === 'medium' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
          {p.riskLevel}
        </span>
        <button onClick={() => setExpanded(e => !e)} className="text-[9px] text-slate-600 hover:text-slate-400">
          {expanded ? '▲' : '▼'}
        </button>
      </div>
      {expanded && (
        <div className="rounded border border-white/[0.05] overflow-hidden">
          <DiffViewer original={p.originalContent} updated={p.newContent} />
        </div>
      )}
      {p.aiExplanation && <p className="text-[10px] text-slate-500 leading-snug">{p.aiExplanation.slice(0, 100)}</p>}
      {p.status === 'pending' && (
        <div className="flex gap-1.5">
          <button onClick={() => onApply(p.id)} className="flex-1 py-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold hover:bg-emerald-500/30 transition-colors">
            ✓ Apply
          </button>
          <button onClick={() => onReject(p.id)} className="flex-1 py-1 rounded bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-semibold hover:bg-red-500/30 transition-colors">
            ✕ Reject
          </button>
        </div>
      )}
    </div>
  )
}

/* ======================================================================
   Main page
   ====================================================================== */

export default function WorkspacePage() {
  const [fileTree,      setFileTree]      = useState<DevFileNode[]>([])
  const [selectedFile,  setSelectedFile]  = useState<string | null>(null)
  const [fileContent,   setFileContent]   = useState<string | null>(null)
  const [fileLoading,   setFileLoading]   = useState(false)
  const [treeLoading,   setTreeLoading]   = useState(true)

  const [tasks,         setTasks]         = useState<AgentTask[]>([])
  const [patches,       setPatches]       = useState<DevPatch[]>([])
  const [history,       setHistory]       = useState<DevHistoryEntry[]>([])

  const [leftTab,       setLeftTab]       = useState<'files' | 'tasks'>('files')
  const [rightTab,      setRightTab]      = useState<'patches' | 'history'>('history')
  const [taskFilter,    setTaskFilter]    = useState<string>('all')
  const [error,         setError]         = useState<string | null>(null)

  // Load file tree
  useEffect(() => {
    setTreeLoading(true)
    fetch(`${BASE_URL}/api/dev/files`)
      .then(r => r.json())
      .then((d: DevFileNode[]) => setFileTree(d))
      .catch(e => setError(String(e)))
      .finally(() => setTreeLoading(false))
  }, [])

  // Load tasks, patches, history in parallel
  const loadData = useCallback(async () => {
    await Promise.all([
      fetch(`${BASE_URL}/api/team/tasks?limit=50`).then(r => r.json()).then(setTasks).catch(() => {}),
      fetch(`${BASE_URL}/api/dev/patches?limit=20`).then(r => r.json()).then(setPatches).catch(() => {}),
      fetch(`${BASE_URL}/api/dev/history?limit=30`).then(r => r.json()).then(setHistory).catch(() => {}),
    ])
  }, [])

  useEffect(() => { void loadData() }, [loadData])

  async function handleSelectFile(path: string) {
    setSelectedFile(path)
    setFileContent(null)
    setFileLoading(true)
    try {
      const res  = await fetch(`${BASE_URL}/api/dev/inspect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      })
      const data = await res.json() as { content: string }
      setFileContent(res.ok ? data.content : `Error: ${(data as Record<string, string>).detail ?? 'Cannot read'}`)
    } catch (e) {
      setFileContent(`Error: ${String(e)}`)
    } finally {
      setFileLoading(false)
    }
  }

  async function handleApply(patchId: string) {
    const res  = await fetch(`${BASE_URL}/api/dev/apply`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patchId, confirmed: true }),
    })
    const data = await res.json() as { ok: boolean; detail?: string }
    if (!res.ok || !data.ok) setError(data.detail ?? 'Apply failed')
    else await loadData()
  }

  async function handleReject(patchId: string) {
    await fetch(`${BASE_URL}/api/dev/reject`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patchId, confirmed: true }),
    })
    await loadData()
  }

  const filteredTasks = taskFilter === 'all'
    ? tasks
    : tasks.filter(t => t.status === taskFilter)

  const fileTasks  = selectedFile ? tasks.filter(t => t.filePath === selectedFile) : []
  const filePatches = selectedFile ? patches.filter(p => p.filePath === selectedFile) : patches

  return (
    <div className="flex flex-col h-full gap-4 max-w-none">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold font-heading text-white">💻 AI Developer Workspace</h1>
          <p className="text-xs text-slate-500 mt-0.5">プロジェクト探索・ファイル編集・タスク管理・パッチ適用</p>
        </div>
        <button onClick={() => void loadData()} className="text-[11px] px-2 py-1 rounded bg-white/[0.04] hover:bg-white/[0.07] text-slate-400 transition-colors">↻ 更新</button>
      </div>

      {error && (
        <div className="shrink-0 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400 flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Main grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[260px_1fr_280px] gap-4 min-h-0">

        {/* Left — File Explorer / Task Queue */}
        <div className="flex flex-col rounded-xl border border-white/[0.07] bg-white/[0.02] min-h-0 overflow-hidden">
          <div className="flex border-b border-white/[0.06] shrink-0">
            {(['files', 'tasks'] as const).map(tab => (
              <button key={tab} onClick={() => setLeftTab(tab)}
                className={['flex-1 py-2 text-[11px] font-medium transition-colors',
                  leftTab === tab ? 'text-white border-b-2 border-brand-cyan' : 'text-slate-500 hover:text-slate-300',
                ].join(' ')}>
                {tab === 'files' ? `Files` : `Tasks (${tasks.length})`}
              </button>
            ))}
          </div>

          {leftTab === 'files' && (
            <div className="flex-1 overflow-y-auto py-2">
              {treeLoading && <p className="px-3 text-xs text-slate-600 py-4">Loading…</p>}
              {fileTree.map(n => (
                <FileTreeNode key={n.path} node={n} depth={0} selected={selectedFile} onSelect={handleSelectFile} />
              ))}
            </div>
          )}

          {leftTab === 'tasks' && (
            <div className="flex flex-col flex-1 min-h-0">
              <div className="px-3 py-2 border-b border-white/[0.05] shrink-0">
                <select value={taskFilter} onChange={e => setTaskFilter(e.target.value)}
                  className="w-full px-2 py-1 rounded-lg border border-white/[0.08] bg-white/[0.04] text-xs text-slate-300 focus:outline-none">
                  {['all','pending','in_progress','review','completed','failed'].map(s => (
                    <option key={s} value={s}>{s === 'all' ? '全タスク' : s}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {filteredTasks.length === 0 && (
                  <p className="text-xs text-slate-600 text-center py-8">タスクがありません</p>
                )}
                {filteredTasks.map(t => <TaskRow key={t.id} task={t} />)}
              </div>
            </div>
          )}
        </div>

        {/* Center — File Content */}
        <div className="flex flex-col rounded-xl border border-white/[0.07] bg-white/[0.02] min-h-0 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-white/[0.06] shrink-0 flex items-center justify-between">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
              {selectedFile ? 'File Viewer' : 'Project Explorer'}
            </p>
            {selectedFile && (
              <p className="text-[10px] font-mono text-brand-cyan truncate max-w-xs">{selectedFile}</p>
            )}
          </div>

          {!selectedFile && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-3">
                <p className="text-4xl">💻</p>
                <p className="text-xs text-slate-500">左のファイルツリーからファイルを選択</p>
                <div className="grid grid-cols-2 gap-2 mt-4 text-[11px]">
                  {[
                    { label: 'Total Tasks',   val: tasks.length },
                    { label: 'Pending',        val: tasks.filter(t => t.status === 'pending').length },
                    { label: 'In Progress',    val: tasks.filter(t => t.status === 'in_progress').length },
                    { label: 'Patches',        val: patches.filter(p => p.status === 'pending').length },
                  ].map(({ label, val }) => (
                    <div key={label} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                      <p className="text-slate-600 text-[10px]">{label}</p>
                      <p className="text-white font-mono text-lg font-bold">{val}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {selectedFile && (
            <div className="flex-1 overflow-y-auto">
              {/* File-specific tasks */}
              {fileTasks.length > 0 && (
                <div className="p-3 border-b border-white/[0.05] space-y-1.5">
                  <p className="text-[10px] text-slate-600 uppercase tracking-widest">このファイルのタスク</p>
                  {fileTasks.map(t => <TaskRow key={t.id} task={t} />)}
                </div>
              )}
              {/* File content */}
              {fileLoading && (
                <div className="p-4 flex items-center gap-2 text-xs text-slate-600">
                  <span className="animate-pulse">読込中…</span>
                </div>
              )}
              {fileContent !== null && !fileLoading && (
                <pre className="text-[11px] font-mono text-slate-300 p-4 whitespace-pre overflow-auto leading-relaxed">
                  {fileContent}
                </pre>
              )}
            </div>
          )}
        </div>

        {/* Right — Patches + Dev History */}
        <div className="flex flex-col rounded-xl border border-white/[0.07] bg-white/[0.02] min-h-0 overflow-hidden">
          <div className="flex border-b border-white/[0.06] shrink-0">
            {(['patches', 'history'] as const).map(tab => (
              <button key={tab} onClick={() => setRightTab(tab)}
                className={['flex-1 py-2.5 text-[11px] font-medium transition-colors',
                  rightTab === tab ? 'text-white border-b-2 border-brand-cyan bg-white/[0.03]' : 'text-slate-500 hover:text-slate-300',
                ].join(' ')}>
                {tab === 'patches'
                  ? `Patches (${patches.filter(p => p.status === 'pending').length})`
                  : `History (${history.length})`}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {rightTab === 'patches' && (
              <>
                {filePatches.length === 0 && (
                  <p className="text-xs text-slate-600 text-center py-8">パッチなし</p>
                )}
                {filePatches.map(p => (
                  <PatchMini key={p.id} p={p} onApply={handleApply} onReject={handleReject} />
                ))}
              </>
            )}

            {rightTab === 'history' && (
              <>
                {history.length === 0 && (
                  <p className="text-xs text-slate-600 text-center py-8">履歴なし</p>
                )}
                {history.map(h => (
                  <div key={h.id} className="rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-brand-blue/20 text-brand-cyan">
                        {h.action}
                      </span>
                      <span className="text-[10px] text-slate-700 font-mono ml-auto">{formatRelativeTime(h.createdAt)}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">{h.summary}</p>
                    {h.filePath && <p className="text-[10px] text-slate-600 font-mono truncate">{h.filePath}</p>}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
