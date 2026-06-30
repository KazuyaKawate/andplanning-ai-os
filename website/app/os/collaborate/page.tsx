'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { formatRelativeTime } from '@/lib/utils'
import type { CollaborateEvent, DevPatch } from '@/types'

const BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000').replace(/\/$/, '')

/* ======================================================================
   Constants
   ====================================================================== */

const AGENT_COLORS: Record<string, { ring: string; bg: string; text: string }> = {
  'architect-claude': { ring: 'ring-purple-500/50',  bg: 'bg-purple-600/10',  text: 'text-purple-300' },
  'backend-claude':   { ring: 'ring-blue-500/50',    bg: 'bg-blue-600/10',    text: 'text-blue-300' },
  'frontend-claude':  { ring: 'ring-cyan-500/50',    bg: 'bg-cyan-600/10',    text: 'text-cyan-300' },
  'reviewer-claude':  { ring: 'ring-amber-500/50',   bg: 'bg-amber-600/10',   text: 'text-amber-300' },
  'debug-claude':     { ring: 'ring-red-500/50',     bg: 'bg-red-600/10',     text: 'text-red-300' },
  'research-claude':  { ring: 'ring-emerald-500/50', bg: 'bg-emerald-600/10', text: 'text-emerald-300' },
}

const QUICK_GOALS = [
  'Create a login/register authentication system with JWT tokens',
  'Add a dark/light theme toggle to the AI OS settings',
  'Build a real-time notification system for workflow completion',
  'Implement a file upload endpoint with size validation',
  'Add pagination to the memory entries list',
  'Create an admin dashboard showing system usage statistics',
]

/* ======================================================================
   Types
   ====================================================================== */

type AgentBubble = {
  id:        string
  agent:     string
  icon:      string
  phase:     string
  content:   string
  status:    'thinking' | 'done' | 'error'
  summary?:  string
  model?:    string
  startedAt: string
}

type TaskCreated = {
  taskId:    string
  title:     string
  agent:     string
  filePath?: string | null
}

type PatchInfo = {
  patchId:  string
  filePath: string
  title:    string
  agent:    string
  isNew:    boolean
}

/* ======================================================================
   Diff Viewer
   ====================================================================== */

function DiffViewer({ original, updated }: { original: string; updated: string }) {
  const origLines = original.split('\n')
  const updLines  = updated.split('\n')
  type Row = { type: 'remove' | 'add' | 'same'; text: string }
  const rows: Row[] = []

  const max = Math.max(origLines.length, updLines.length)
  for (let i = 0; i < Math.min(max, 200); i++) {
    const o = origLines[i]
    const u = updLines[i]
    if (o !== undefined && u === undefined) rows.push({ type: 'remove', text: o })
    else if (o === undefined && u !== undefined) rows.push({ type: 'add', text: u })
    else if (o !== u) {
      if (o !== undefined) rows.push({ type: 'remove', text: o })
      if (u !== undefined) rows.push({ type: 'add', text: u })
    } else if (o !== undefined) {
      rows.push({ type: 'same', text: o })
    }
  }

  const changes = rows.filter(r => r.type !== 'same')
  if (changes.length === 0) return <p className="text-xs text-slate-600 px-3 py-2">変更なし</p>

  return (
    <div className="overflow-auto max-h-48 text-[10px] font-mono">
      {changes.slice(0, 100).map((row, i) => (
        <div key={i} className={[
          'px-3 py-0.5 whitespace-pre',
          row.type === 'remove' ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400',
        ].join(' ')}>
          {row.type === 'remove' ? '- ' : '+ '}{row.text}
        </div>
      ))}
    </div>
  )
}

/* ======================================================================
   Patch Card
   ====================================================================== */

function PatchCard({
  info,
  onApply,
  onReject,
}: {
  info:      PatchInfo
  onApply:   (id: string) => void
  onReject:  (id: string) => void
}) {
  const [patch,    setPatch]    = useState<DevPatch | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [applied,  setApplied]  = useState<'pending' | 'applied' | 'rejected'>('pending')

  async function load() {
    if (patch || loading) return
    setLoading(true)
    try {
      const res = await fetch(`${BASE_URL}/api/dev/patches`)
      if (res.ok) {
        const patches = await res.json() as DevPatch[]
        const found = patches.find(p => p.id === info.patchId)
        if (found) setPatch(found)
      }
    } finally { setLoading(false) }
  }

  async function handleApply() {
    const res = await fetch(`${BASE_URL}/api/dev/apply`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patchId: info.patchId, confirmed: true }),
    })
    if (res.ok) { setApplied('applied'); onApply(info.patchId) }
  }

  async function handleReject() {
    await fetch(`${BASE_URL}/api/dev/reject`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patchId: info.patchId, confirmed: true }),
    })
    setApplied('rejected'); onReject(info.patchId)
  }

  const agentClr = AGENT_COLORS[info.agent] ?? { text: 'text-slate-400' }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={[
        'rounded-xl border p-3 space-y-2 transition-opacity',
        applied === 'applied'  ? 'border-emerald-500/30 bg-emerald-500/5 opacity-70' : '',
        applied === 'rejected' ? 'border-white/[0.05] opacity-30' : '',
        applied === 'pending'  ? 'border-white/[0.08] bg-white/[0.02]' : '',
      ].join(' ')}
    >
      {/* Header */}
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-white font-semibold truncate">{info.title}</p>
          <p className="text-[10px] font-mono text-slate-600 truncate mt-0.5">{info.filePath}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {info.isNew && (
            <span className="text-[8px] px-1.5 py-0.5 rounded bg-brand-blue/20 text-brand-cyan border border-brand-blue/30 font-mono">NEW</span>
          )}
          <span className={`text-[9px] font-medium ${agentClr.text}`}>{info.agent.replace('-claude', '')}</span>
        </div>
      </div>

      {/* Status badge */}
      {applied !== 'pending' && (
        <div className={`text-[10px] font-semibold text-center py-1 rounded ${applied === 'applied' ? 'text-emerald-400' : 'text-slate-500'}`}>
          {applied === 'applied' ? '✅ Applied' : '✕ Rejected'}
        </div>
      )}

      {/* Diff toggle */}
      {applied === 'pending' && (
        <>
          <button
            onClick={() => { setExpanded(e => !e); void load() }}
            className="w-full text-[10px] text-slate-500 hover:text-slate-300 transition-colors py-1 border border-white/[0.06] rounded hover:border-white/10"
          >
            {expanded ? '▲ Hide diff' : '▼ Show diff'}
          </button>

          {expanded && (
            <div className="rounded-lg overflow-hidden border border-white/[0.06]">
              {loading && <p className="text-[10px] text-slate-600 p-2">Loading…</p>}
              {patch && <DiffViewer original={patch.originalContent} updated={patch.newContent} />}
              {!loading && !patch && <p className="text-[10px] text-slate-600 p-2">Diff unavailable</p>}
            </div>
          )}

          {/* AI explanation */}
          {expanded && patch?.aiExplanation && (
            <p className="text-[10px] text-slate-500 leading-snug line-clamp-3">
              {patch.aiExplanation.slice(0, 200)}
            </p>
          )}

          {/* Approve / Reject */}
          <div className="flex gap-2">
            <button
              onClick={() => void handleApply()}
              className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors"
            >
              ✓ Approve & Apply
            </button>
            <button
              onClick={() => void handleReject()}
              className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors"
            >
              ✕ Reject
            </button>
          </div>
        </>
      )}
    </motion.div>
  )
}

/* ======================================================================
   Agent Bubble (live streaming card)
   ====================================================================== */

function AgentBubbleCard({ bubble }: { bubble: AgentBubble }) {
  const clr = AGENT_COLORS[bubble.agent] ?? { ring: 'ring-white/10', bg: 'bg-white/[0.02]', text: 'text-slate-300' }
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [bubble.content])

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      className={[
        'rounded-xl border p-4 space-y-3',
        `ring-1 ${clr.ring} ${clr.bg}`,
        bubble.status === 'error' ? 'border-red-500/30' : 'border-white/[0.06]',
      ].join(' ')}
    >
      {/* Agent header */}
      <div className="flex items-center gap-2.5">
        <span className="text-2xl">{bubble.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={`text-sm font-semibold ${clr.text}`}>
              {bubble.agent.replace('-claude', ' Claude').replace(/^[a-z]/, c => c.toUpperCase())}
            </p>
            {bubble.status === 'thinking' && (
              <span className="flex gap-0.5">
                {[0, 1, 2].map(i => (
                  <span key={i} className={`w-1.5 h-1.5 rounded-full ${clr.text.replace('text-', 'bg-')} opacity-70 animate-bounce`}
                    style={{ animationDelay: `${i * 100}ms` }} />
                ))}
              </span>
            )}
            {bubble.status === 'done' && <span className="text-[10px] text-emerald-400">✓ Done</span>}
            {bubble.status === 'error' && <span className="text-[10px] text-red-400">✕ Error</span>}
          </div>
          <p className="text-[10px] text-slate-600">{bubble.phase}</p>
        </div>
        <span className="text-[9px] text-slate-700 shrink-0">{formatRelativeTime(bubble.startedAt)}</span>
      </div>

      {/* Streaming content */}
      {bubble.content && (
        <div
          ref={contentRef}
          className={[
            'text-[11px] text-slate-400 leading-relaxed overflow-y-auto transition-all',
            bubble.status === 'thinking' ? 'max-h-32' : 'max-h-60',
          ].join(' ')}
        >
          <pre className="whitespace-pre-wrap font-sans">{bubble.content}</pre>
          {bubble.status === 'thinking' && (
            <span className="inline-block w-1.5 h-3.5 bg-brand-cyan/70 ml-0.5 animate-pulse align-middle" />
          )}
        </div>
      )}

      {/* Summary (when done) */}
      {bubble.summary && bubble.status === 'done' && (
        <div className="flex items-center gap-2 pt-1 border-t border-white/[0.05]">
          <span className="text-[10px] text-slate-500">{bubble.summary}</span>
          {bubble.model && (
            <span className="text-[9px] text-slate-700 ml-auto font-mono">{bubble.model.slice(0, 20)}</span>
          )}
        </div>
      )}
    </motion.div>
  )
}

/* ======================================================================
   Task event marker
   ====================================================================== */

function TaskMarker({ task }: { task: TaskCreated }) {
  const clr = AGENT_COLORS[task.agent] ?? { text: 'text-slate-400' }
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.05]"
    >
      <span className="text-[10px]">📌</span>
      <span className={`text-[10px] font-medium ${clr.text}`}>{task.agent.replace('-claude', '')}</span>
      <span className="text-[10px] text-slate-500">←</span>
      <span className="text-[10px] text-slate-300 flex-1 truncate">{task.title}</span>
      {task.filePath && (
        <span className="text-[9px] font-mono text-slate-600 truncate max-w-[100px]">{task.filePath}</span>
      )}
    </motion.div>
  )
}

/* ======================================================================
   Review result banner
   ====================================================================== */

function ReviewBanner({ verdict }: { verdict: string }) {
  const isApproved = verdict.toUpperCase().includes('APPROVED')
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={[
        'rounded-xl border p-3 text-center',
        isApproved
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
          : 'border-amber-500/30 bg-amber-500/10 text-amber-400',
      ].join(' ')}
    >
      <p className="text-sm font-semibold">{isApproved ? '✅ Review Passed' : '⚠️ Revision Needed'}</p>
      <p className="text-[10px] mt-0.5 opacity-80">{verdict.slice(0, 120)}</p>
    </motion.div>
  )
}

/* ======================================================================
   Main page
   ====================================================================== */

export default function CollaboratePage() {
  const [goal,        setGoal]        = useState('')
  const [context,     setContext]      = useState('')
  const [running,     setRunning]      = useState(false)
  const [sessionId,   setSessionId]    = useState<string | null>(null)
  const [bubbles,     setBubbles]      = useState<AgentBubble[]>([])
  const [taskMarkers, setTaskMarkers]  = useState<TaskCreated[]>([])
  const [patches,     setPatches]      = useState<PatchInfo[]>([])
  const [verdict,     setVerdict]      = useState<string | null>(null)
  const [error,       setError]        = useState<string | null>(null)
  const [done,        setDone]         = useState(false)
  const [history,     setHistory]      = useState<Array<{ goal: string; sessionId: string; patches: number; ts: string }>>([])

  const streamRef   = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null)
  const centerRef   = useRef<HTMLDivElement>(null)
  const patchesRef  = useRef<HTMLDivElement>(null)

  // Auto-scroll center panel
  useEffect(() => {
    if (centerRef.current) {
      centerRef.current.scrollTop = centerRef.current.scrollHeight
    }
  }, [bubbles, taskMarkers])

  // Auto-scroll patches panel
  useEffect(() => {
    if (patchesRef.current) {
      patchesRef.current.scrollTop = patchesRef.current.scrollHeight
    }
  }, [patches])

  function reset() {
    setBubbles([])
    setTaskMarkers([])
    setPatches([])
    setVerdict(null)
    setError(null)
    setDone(false)
    setSessionId(null)
  }

  const handleSubmit = useCallback(async () => {
    if (!goal.trim() || running) return
    reset()
    setRunning(true)
    setError(null)

    try {
      const res = await fetch(`${BASE_URL}/api/team/collaborate`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ goal: goal.trim(), context: context.trim() }),
      })

      if (!res.ok || !res.body) {
        setError(`HTTP ${res.status}: ${res.statusText}`)
        setRunning(false)
        return
      }

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      streamRef.current = reader
      let buf = ''

      while (true) {
        const { done: rdone, value } = await reader.read()
        if (rdone) break

        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data: ')) continue
          const raw = trimmed.slice(6).trim()
          if (raw === '[DONE]') break

          let evt: CollaborateEvent
          try {
            evt = JSON.parse(raw) as CollaborateEvent
          } catch { continue }

          switch (evt.type) {
            case 'session_start':
              setSessionId(evt.sessionId)
              break

            case 'agent_start':
              setBubbles(prev => [
                ...prev,
                {
                  id:        `${evt.agent}-${Date.now()}`,
                  agent:     evt.agent,
                  icon:      evt.icon,
                  phase:     evt.phase,
                  content:   '',
                  status:    'thinking',
                  startedAt: evt.timestamp,
                },
              ])
              break

            case 'content':
              setBubbles(prev =>
                prev.map(b =>
                  b.agent === evt.agent && b.status === 'thinking'
                    ? { ...b, content: b.content + evt.text }
                    : b
                )
              )
              break

            case 'agent_done':
              setBubbles(prev =>
                prev.map(b =>
                  b.agent === evt.agent && b.status === 'thinking'
                    ? { ...b, status: 'done', summary: evt.summary, model: evt.modelUsed }
                    : b
                )
              )
              break

            case 'task_created':
              setTaskMarkers(prev => [...prev, {
                taskId:   evt.taskId,
                title:    evt.title,
                agent:    evt.agent,
                filePath: evt.filePath,
              }])
              break

            case 'patch_created':
              setPatches(prev => [...prev, {
                patchId:  evt.patchId,
                filePath: evt.filePath,
                title:    evt.title,
                agent:    evt.agent,
                isNew:    evt.isNew,
              }])
              break

            case 'review_result':
              setVerdict(evt.verdict)
              break

            case 'error':
              setBubbles(prev =>
                prev.map(b =>
                  b.agent === evt.agent
                    ? { ...b, status: 'error', summary: evt.message }
                    : b
                )
              )
              break

            case 'done':
              setDone(true)
              setHistory(prev => [{
                goal:      goal.trim(),
                sessionId: evt.sessionId,
                patches:   evt.patchCount,
                ts:        evt.timestamp,
              }, ...prev.slice(0, 9)])
              break
          }
        }
      }
    } catch (e) {
      setError(String(e))
      setBubbles(prev => prev.map(b => b.status === 'thinking' ? { ...b, status: 'error' } : b))
    } finally {
      setRunning(false)
    }
  }, [goal, context, running])

  function handlePatchApply(id: string) {
    // Visual handled by PatchCard; no additional state change needed here
  }
  function handlePatchReject(id: string) {
    // Visual handled by PatchCard
  }

  const pendingPatches = patches.length
  const isStreaming    = running && !done

  return (
    <div className="flex flex-col h-full gap-4 max-w-none">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold font-heading text-white">🤝 AI Team Collaboration</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            機能を説明するだけで、Claudeチームが設計→実装→レビュー→パッチ生成まで自動実行
          </p>
        </div>
        {sessionId && (
          <span className="text-[10px] font-mono text-slate-700 bg-white/[0.03] px-2 py-1 rounded">
            session: {sessionId.slice(0, 8)}
          </span>
        )}
      </div>

      {/* Main 3-panel grid */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-[300px_1fr_320px] gap-4 min-h-0">

        {/* ── Left: Input + History ───────────────────────────────────── */}
        <div className="flex flex-col gap-3 min-h-0 overflow-y-auto">
          {/* Goal input */}
          <div className="rounded-xl border border-brand-blue/30 bg-brand-blue/5 p-4 space-y-3 shrink-0">
            <p className="text-sm font-semibold text-brand-cyan">✨ 機能リクエスト</p>

            <textarea
              value={goal}
              onChange={e => setGoal(e.target.value)}
              placeholder="例: ユーザー認証システムを作成してください（ログイン・登録・JWTトークン）"
              rows={4}
              disabled={running}
              className="w-full rounded-lg bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-xs text-slate-300 placeholder-slate-600 resize-none focus:outline-none focus:border-brand-cyan/40 disabled:opacity-50"
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void handleSubmit()
              }}
            />

            <textarea
              value={context}
              onChange={e => setContext(e.target.value)}
              placeholder="追加コンテキスト（任意）: 使用するライブラリ、制約など"
              rows={2}
              disabled={running}
              className="w-full rounded-lg bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-xs text-slate-500 placeholder-slate-700 resize-none focus:outline-none focus:border-brand-cyan/40 disabled:opacity-50"
            />

            <div className="flex gap-2">
              <button
                onClick={() => void handleSubmit()}
                disabled={!goal.trim() || running}
                className={[
                  'flex-1 py-2 rounded-lg text-xs font-semibold transition-all',
                  !goal.trim() || running
                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    : 'bg-brand-blue hover:bg-brand-blue/80 text-white shadow-lg shadow-brand-blue/20',
                ].join(' ')}
              >
                {running ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                    実行中…
                  </span>
                ) : '🚀 コラボレーション開始'}
              </button>
              {(running || done) && (
                <button
                  onClick={() => { reset(); setGoal('') }}
                  className="px-3 py-2 rounded-lg text-xs text-slate-400 border border-white/[0.08] hover:bg-white/[0.04] transition-colors"
                >
                  ↺
                </button>
              )}
            </div>

            <p className="text-[9px] text-slate-700 text-center">Ctrl+Enter で送信</p>
          </div>

          {/* Quick examples */}
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 space-y-2 shrink-0">
            <p className="text-[10px] text-slate-600 uppercase tracking-widest">クイック例</p>
            <div className="space-y-1">
              {QUICK_GOALS.map((g, i) => (
                <button
                  key={i}
                  onClick={() => setGoal(g)}
                  disabled={running}
                  className="w-full text-left text-[10px] text-slate-500 hover:text-slate-300 py-1 px-2 rounded hover:bg-white/[0.04] transition-colors leading-snug disabled:opacity-40"
                >
                  {g.slice(0, 60)}…
                </button>
              ))}
            </div>
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 space-y-2">
              <p className="text-[10px] text-slate-600 uppercase tracking-widest">実行履歴</p>
              {history.map((h, i) => (
                <div key={i} className="rounded-lg border border-white/[0.05] px-2 py-1.5 space-y-0.5">
                  <p className="text-[10px] text-slate-400 truncate leading-snug">{h.goal.slice(0, 55)}…</p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-mono text-brand-cyan bg-brand-cyan/10 px-1 rounded">
                      {h.patches} patches
                    </span>
                    <span className="text-[9px] text-slate-700 ml-auto">{formatRelativeTime(h.ts)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Center: Live Collaboration Stream ───────────────────────── */}
        <div className="flex flex-col rounded-xl border border-white/[0.07] bg-white/[0.02] min-h-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.06] shrink-0 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Collaboration Stream</p>
              <p className="text-[10px] text-slate-600">
                {isStreaming
                  ? 'Claudeチームが実行中…'
                  : done
                  ? `完了 — ${patches.length} patches generated`
                  : '機能リクエストを入力してください'}
              </p>
            </div>
            {isStreaming && (
              <div className="flex gap-1 items-center">
                <span className="w-2 h-2 rounded-full bg-brand-cyan animate-pulse" />
                <span className="text-[10px] text-brand-cyan">LIVE</span>
              </div>
            )}
          </div>

          <div ref={centerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* Empty state */}
            {bubbles.length === 0 && taskMarkers.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-4">
                <div className="space-y-2">
                  <p className="text-5xl">🤝</p>
                  <p className="text-sm font-semibold text-white">Virtual Claude Team</p>
                  <p className="text-xs text-slate-500 max-w-xs">
                    機能を説明するとチームが自動的に設計・実装・レビューを行い、承認待ちのパッチを生成します
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {[
                    { icon: '🏛️', label: 'Architect', desc: '設計・計画' },
                    { icon: '⚙️', label: 'Backend',   desc: 'API実装' },
                    { icon: '🎨', label: 'Frontend',  desc: 'UI実装' },
                    { icon: '🔍', label: 'Reviewer',  desc: 'コードレビュー' },
                    { icon: '🐛', label: 'Debug',     desc: 'テスト' },
                    { icon: '🔬', label: 'Research',  desc: '技術調査' },
                  ].map(a => (
                    <div key={a.label} className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-2 text-center">
                      <p className="text-xl">{a.icon}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{a.label}</p>
                      <p className="text-[9px] text-slate-600">{a.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                ⚠️ {error}
              </div>
            )}

            {/* Interleaved bubbles + markers */}
            {(() => {
              const items: Array<{ key: string; kind: 'bubble' | 'marker'; idx: number }> = [
                ...bubbles.map((_, i) => ({ key: `b-${i}`, kind: 'bubble' as const, idx: i })),
                ...taskMarkers.map((_, i) => ({ key: `m-${i}`, kind: 'marker' as const, idx: i })),
              ]
              return items.map(item => {
                if (item.kind === 'bubble') {
                  const b = bubbles[item.idx]!
                  return <AgentBubbleCard key={item.key} bubble={b} />
                }
                const m = taskMarkers[item.idx]!
                return <TaskMarker key={item.key} task={m} />
              })
            })()}

            {/* Review verdict */}
            {verdict && <ReviewBanner verdict={verdict} />}

            {/* Done banner */}
            {done && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-xl border border-brand-cyan/30 bg-brand-cyan/5 p-4 text-center space-y-1"
              >
                <p className="text-base font-bold text-brand-cyan">✅ コラボレーション完了</p>
                <p className="text-xs text-slate-400">
                  {patches.length > 0
                    ? `${patches.length}個のパッチが生成されました — 右パネルで承認してください`
                    : 'パッチは生成されませんでした'}
                </p>
              </motion.div>
            )}
          </div>
        </div>

        {/* ── Right: Patches + Approval ────────────────────────────────── */}
        <div className="flex flex-col rounded-xl border border-white/[0.07] bg-white/[0.02] min-h-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.06] shrink-0">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Generated Patches</p>
              {pendingPatches > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  {pendingPatches} pending
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-600 mt-0.5">承認するとファイルに適用されます</p>
          </div>

          <div ref={patchesRef} className="flex-1 overflow-y-auto p-3 space-y-3">
            {patches.length === 0 && (
              <div className="flex flex-col items-center justify-center h-32 gap-2 text-slate-700">
                <span className="text-3xl opacity-30">📋</span>
                <p className="text-xs">パッチが生成されると表示されます</p>
              </div>
            )}

            <AnimatePresence>
              {patches.map(p => (
                <PatchCard
                  key={p.patchId}
                  info={p}
                  onApply={handlePatchApply}
                  onReject={handlePatchReject}
                />
              ))}
            </AnimatePresence>

            {/* Safety note */}
            {patches.length > 0 && (
              <div className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-2 text-[9px] text-slate-700 leading-relaxed">
                🔒 パッチは承認なしにファイルへ書き込まれません。<br />
                Kernel/Router/Config ファイルは保護されています。
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
