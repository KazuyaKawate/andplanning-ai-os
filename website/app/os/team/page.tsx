'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { formatRelativeTime, formatTokens } from '@/lib/utils'
import type { AgentTask, TeamSession, AgentMessage, TeamStatus } from '@/types'

const BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000').replace(/\/$/, '')

/* ======================================================================
   Constants
   ====================================================================== */

const AGENTS = [
  { id: 'architect-claude',  label: 'Architect',  icon: '🏛️', color: 'from-purple-600/20 to-purple-800/10', ring: 'ring-purple-500/30',  desc: '設計・調整・タスク配分' },
  { id: 'backend-claude',    label: 'Backend',    icon: '⚙️', color: 'from-blue-600/20 to-blue-800/10',    ring: 'ring-blue-500/30',    desc: 'FastAPI・Python・DB' },
  { id: 'frontend-claude',   label: 'Frontend',   icon: '🎨', color: 'from-cyan-600/20 to-cyan-800/10',    ring: 'ring-cyan-500/30',    desc: 'Next.js・TypeScript・UI' },
  { id: 'reviewer-claude',   label: 'Reviewer',   icon: '🔍', color: 'from-amber-600/20 to-amber-800/10',  ring: 'ring-amber-500/30',   desc: 'コード品質・セキュリティ' },
  { id: 'debug-claude',      label: 'Debug',      icon: '🐛', color: 'from-red-600/20 to-red-800/10',      ring: 'ring-red-500/30',     desc: 'エラー分析・バグ修正' },
  { id: 'research-claude',   label: 'Research',   icon: '🔬', color: 'from-emerald-600/20 to-emerald-800/10', ring: 'ring-emerald-500/30', desc: '技術調査・ベストプラクティス' },
]

const STATUS_CLR: Record<string, string> = {
  pending:     'bg-slate-500/20 text-slate-400 border-slate-500/30',
  in_progress: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  review:      'bg-purple-500/20 text-purple-400 border-purple-500/30',
  blocked:     'bg-red-500/20 text-red-400 border-red-500/30',
  completed:   'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  failed:      'bg-red-500/20 text-red-400 border-red-500/30',
  planning:    'bg-amber-500/20 text-amber-400 border-amber-500/30',
  active:      'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  paused:      'bg-slate-500/20 text-slate-400 border-slate-500/30',
}

const MSG_CLR: Record<string, string> = {
  plan:    'text-purple-400', task: 'text-blue-400',
  approve: 'text-emerald-400', reject: 'text-red-400',
  info:    'text-slate-300', error: 'text-red-400', review: 'text-amber-400',
}

/* ======================================================================
   Sub-components
   ====================================================================== */

function MetricCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-4">
      <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-2xl font-bold font-mono text-white">{value}</p>
      {sub && <p className="text-[10px] text-slate-600 mt-0.5">{sub}</p>}
    </div>
  )
}

function AgentCard({
  agent, tasks, isActive, onClick,
}: {
  agent: typeof AGENTS[0]
  tasks: AgentTask[]
  isActive: boolean
  onClick: () => void
}) {
  const pending   = tasks.filter(t => t.status === 'pending').length
  const inProg    = tasks.filter(t => t.status === 'in_progress').length
  const completed = tasks.filter(t => t.status === 'completed').length
  const tokens    = tasks.reduce((acc, t) => acc + (t.tokensUsed ?? 0), 0)

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={[
        'w-full text-left rounded-xl border p-4 transition-all',
        `bg-gradient-to-br ${agent.color}`,
        isActive ? `ring-2 ${agent.ring} border-white/20` : 'border-white/[0.07] hover:border-white/20',
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        <span className="text-3xl">{agent.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm">{agent.label} Claude</p>
          <p className="text-[10px] text-slate-500 mt-0.5">{agent.desc}</p>
          {inProg > 0 && (
            <div className="mt-1.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-[10px] text-amber-400">実行中 {inProg}</span>
            </div>
          )}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
        {[
          { label: '待機', val: pending,   clr: 'text-slate-400' },
          { label: '完了', val: completed, clr: 'text-emerald-400' },
          { label: 'tokens', val: formatTokens(tokens), clr: 'text-brand-cyan' },
        ].map(({ label, val, clr }) => (
          <div key={label} className="rounded-lg bg-white/[0.03] py-1">
            <p className={`text-sm font-bold font-mono ${clr}`}>{val}</p>
            <p className="text-[9px] text-slate-700">{label}</p>
          </div>
        ))}
      </div>
    </motion.button>
  )
}

function TaskRow({ task }: { task: AgentTask }) {
  const clr = STATUS_CLR[task.status] ?? 'bg-slate-500/20 text-slate-400 border-slate-500/30'
  return (
    <div className="flex items-start gap-2 py-2 border-b border-white/[0.04]">
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-slate-300 font-medium truncate">{task.title}</p>
        {task.filePath && (
          <p className="text-[9px] font-mono text-slate-600 truncate">{task.filePath}</p>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[9px] text-slate-600 font-mono">P{task.priority}</span>
        <span className={`text-[9px] px-1.5 py-0.5 rounded border font-mono ${clr}`}>
          {task.status}
        </span>
      </div>
    </div>
  )
}

function TimelineLine({ msg }: { msg: AgentMessage }) {
  const clr = MSG_CLR[msg.messageType] ?? 'text-slate-400'
  const icon = {
    plan: '📋', task: '📌', approve: '✅', reject: '❌',
    info: 'ℹ️', error: '🔴', review: '🔍',
  }[msg.messageType] ?? '💬'

  return (
    <div className="flex gap-2.5 py-2 border-b border-white/[0.04]">
      <span className="text-xs shrink-0 mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className={`text-[10px] font-semibold ${clr}`}>{msg.fromAgent}</span>
          {msg.toAgent && msg.toAgent !== 'all' && (
            <>
              <span className="text-[9px] text-slate-700">→</span>
              <span className="text-[10px] text-slate-500">{msg.toAgent}</span>
            </>
          )}
          <span className="text-[9px] text-slate-700 ml-auto">{formatRelativeTime(msg.createdAt)}</span>
        </div>
        <p className="text-[10px] text-slate-400 leading-snug">{msg.content}</p>
      </div>
    </div>
  )
}

function SessionRow({ session, onClick, active }: { session: TeamSession; onClick: () => void; active: boolean }) {
  const clr = STATUS_CLR[session.status] ?? 'bg-slate-500/20 text-slate-400 border-slate-500/30'
  const pct = session.taskCount > 0 ? Math.round((session.completedTasks / session.taskCount) * 100) : 0
  return (
    <button
      onClick={onClick}
      className={[
        'w-full text-left rounded-lg border p-2.5 transition-all',
        active ? 'border-brand-cyan/40 bg-brand-cyan/5' : 'border-white/[0.05] hover:border-white/10 bg-white/[0.02]',
      ].join(' ')}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`text-[9px] px-1.5 py-0.5 rounded border font-mono ${clr}`}>{session.status}</span>
        <span className="text-[10px] text-slate-700 ml-auto">{formatRelativeTime(session.createdAt)}</span>
      </div>
      <p className="text-[11px] text-slate-300 leading-snug font-medium">{session.goal.slice(0, 80)}</p>
      <div className="mt-1.5 flex items-center gap-2">
        <div className="flex-1 h-1 rounded-full bg-white/[0.05] overflow-hidden">
          <div className="h-full rounded-full bg-brand-cyan/60" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-[9px] text-slate-600 font-mono">{session.completedTasks}/{session.taskCount}</span>
      </div>
    </button>
  )
}

/* ======================================================================
   Main page
   ====================================================================== */

export default function TeamPage() {
  const [status,    setStatus]    = useState<TeamStatus | null>(null)
  const [tasks,     setTasks]     = useState<AgentTask[]>([])
  const [messages,  setMessages]  = useState<AgentMessage[]>([])
  const [sessions,  setSessions]  = useState<TeamSession[]>([])

  const [activeAgent,   setActiveAgent]   = useState<string | null>(null)
  const [activeSession, setActiveSession] = useState<string | null>(null)
  const [rightTab,      setRightTab]      = useState<'messages' | 'sessions'>('messages')

  // Improve AI OS state
  const [improving,     setImproving]     = useState(false)
  const [improveLog,    setImproveLog]    = useState<string[]>([])
  const [improveGoal,   setImproveGoal]   = useState('')
  const improveScrollRef = useRef<HTMLDivElement>(null)

  const loadAll = useCallback(async () => {
    await Promise.all([
      fetch(`${BASE_URL}/api/team/status`).then(r => r.json()).then(setStatus).catch(() => {}),
      fetch(`${BASE_URL}/api/team/tasks?limit=80`).then(r => r.json()).then(setTasks).catch(() => {}),
      fetch(`${BASE_URL}/api/team/messages?limit=40`).then(r => r.json()).then(setMessages).catch(() => {}),
      fetch(`${BASE_URL}/api/team/sessions?limit=20`).then(r => r.json()).then(setSessions).catch(() => {}),
    ])
  }, [])

  useEffect(() => { void loadAll() }, [loadAll])

  useEffect(() => {
    if (improveScrollRef.current) {
      improveScrollRef.current.scrollTop = improveScrollRef.current.scrollHeight
    }
  }, [improveLog])

  async function handleImprove() {
    if (improving) return
    setImproving(true)
    setImproveLog([])
    const goal = improveGoal.trim() || 'AI OSのソースコードを検査し、改善ロードマップを生成してください'

    try {
      const res = await fetch(`${BASE_URL}/api/team/improve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal }),
      })
      if (!res.ok || !res.body) {
        setImproveLog(l => [...l, `[Error] HTTP ${res.status}`])
        return
      }
      const reader  = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const text = decoder.decode(value)
        for (const line of text.split('\n')) {
          const l = line.trim()
          if (!l.startsWith('data: ')) continue
          const raw = l.slice(6).trim()
          if (raw === '[DONE]') break
          try {
            const parsed = JSON.parse(raw) as { content?: string; session_id?: string; task_count?: number }
            if (parsed.content) {
              setImproveLog(prev => {
                const copy = [...prev]
                if (copy.length === 0 || copy[copy.length - 1] === '\n') {
                  copy.push(parsed.content ?? '')
                } else {
                  copy[copy.length - 1] = (copy[copy.length - 1] ?? '') + (parsed.content ?? '')
                }
                return copy
              })
            }
            if (parsed.session_id) {
              setImproveLog(l => [...l, `\n\n✅ セッション作成: ${parsed.session_id} (タスク数: ${parsed.task_count})`])
              await loadAll()
            }
          } catch {
            /* non-JSON data line */
          }
        }
      }
    } catch (e) {
      setImproveLog(l => [...l, `[Error] ${String(e)}`])
    } finally {
      setImproving(false)
    }
  }

  const agentTasks = (agentId: string) => tasks.filter(t => t.agentId === agentId)
  const filteredTasks = activeAgent ? agentTasks(activeAgent) : tasks.slice(0, 40)

  return (
    <div className="flex flex-col h-full gap-4 max-w-none">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold font-heading text-white">🤖 Virtual Claude Team</h1>
          <p className="text-xs text-slate-500 mt-0.5">6エージェントによる自律的なAI OS開発チーム</p>
        </div>
        <button onClick={() => void loadAll()} className="text-[11px] px-2 py-1 rounded bg-white/[0.04] hover:bg-white/[0.07] text-slate-400 transition-colors">↻ 更新</button>
      </div>

      {/* Metrics row */}
      {status && (
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-6 gap-3 shrink-0">
          <MetricCard label="Agents"       value={status.total_agents}      sub={`${status.active_agents} active`} />
          <MetricCard label="Pending"      value={status.pending_tasks} />
          <MetricCard label="In Progress"  value={status.in_progress_tasks} />
          <MetricCard label="Completed"    value={status.completed_tasks} />
          <MetricCard label="Sessions"     value={status.total_sessions} />
          <MetricCard label="Tokens"       value={formatTokens(status.total_tokens)} />
        </div>
      )}

      {/* Main grid: agents | task queue | messages/sessions */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-[320px_1fr_300px] gap-4 min-h-0">

        {/* Left — Agent cards + Improve button */}
        <div className="flex flex-col gap-3 min-h-0 overflow-y-auto">
          {/* Improve AI OS */}
          <div className="rounded-xl border border-brand-blue/30 bg-brand-blue/5 p-4 space-y-3 shrink-0">
            <p className="text-sm font-semibold text-brand-cyan">🚀 AI OS を改善</p>
            <textarea
              value={improveGoal}
              onChange={e => setImproveGoal(e.target.value)}
              placeholder="改善目標を入力（空白でデフォルト目標）"
              rows={2}
              className="w-full rounded-lg bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-xs text-slate-300 placeholder-slate-600 resize-none focus:outline-none focus:border-brand-cyan/40"
            />
            <button
              onClick={() => void handleImprove()}
              disabled={improving}
              className={[
                'w-full py-2 rounded-lg text-xs font-semibold transition-colors',
                improving
                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-brand-blue hover:bg-brand-blue/80 text-white',
              ].join(' ')}
            >
              {improving ? '⏳ 分析中…' : '✨ Improve AI OS'}
            </button>
            {improveLog.length > 0 && (
              <div ref={improveScrollRef} className="max-h-40 overflow-y-auto rounded-lg bg-black/40 border border-white/[0.05] p-2">
                <pre className="text-[10px] text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {improveLog.join('')}
                </pre>
              </div>
            )}
          </div>

          {/* 6 Agent cards */}
          {AGENTS.map(agent => (
            <AgentCard
              key={agent.id}
              agent={agent}
              tasks={agentTasks(agent.id)}
              isActive={activeAgent === agent.id}
              onClick={() => setActiveAgent(prev => prev === agent.id ? null : agent.id)}
            />
          ))}
        </div>

        {/* Center — Task Queue */}
        <div className="flex flex-col rounded-xl border border-white/[0.07] bg-white/[0.02] min-h-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.06] shrink-0 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">
                {activeAgent
                  ? `${AGENTS.find(a => a.id === activeAgent)?.label} — Tasks`
                  : 'Task Queue'}
              </p>
              <p className="text-[10px] text-slate-600">
                {filteredTasks.length} タスク
              </p>
            </div>
            {activeAgent && (
              <button onClick={() => setActiveAgent(null)} className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors">全て表示</button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04]">
            {filteredTasks.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 text-slate-600 gap-2">
                <span className="text-3xl opacity-30">📭</span>
                <p className="text-xs">タスクがありません</p>
              </div>
            )}
            <div className="p-3 space-y-0">
              {filteredTasks.map(t => <TaskRow key={t.id} task={t} />)}
            </div>
          </div>
        </div>

        {/* Right — Timeline / Sessions */}
        <div className="flex flex-col rounded-xl border border-white/[0.07] bg-white/[0.02] min-h-0 overflow-hidden">
          <div className="flex border-b border-white/[0.06] shrink-0">
            {(['messages', 'sessions'] as const).map(tab => (
              <button key={tab} onClick={() => setRightTab(tab)}
                className={[
                  'flex-1 py-2.5 text-[11px] font-medium transition-colors',
                  rightTab === tab ? 'text-white border-b-2 border-brand-cyan' : 'text-slate-500 hover:text-slate-300',
                ].join(' ')}>
                {tab === 'messages'
                  ? `Timeline (${messages.length})`
                  : `Sessions (${sessions.length})`}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {rightTab === 'messages' && (
              <>
                {messages.length === 0 && (
                  <p className="text-xs text-slate-600 text-center py-8">メッセージがありません</p>
                )}
                {messages.map(m => <TimelineLine key={m.id} msg={m} />)}
              </>
            )}

            {rightTab === 'sessions' && (
              <div className="space-y-2">
                {sessions.length === 0 && (
                  <p className="text-xs text-slate-600 text-center py-8">セッションがありません</p>
                )}
                {sessions.map(s => (
                  <SessionRow
                    key={s.id} session={s}
                    active={activeSession === s.id}
                    onClick={() => setActiveSession(prev => prev === s.id ? null : s.id)}
                  />
                ))}

                {/* Session detail */}
                <AnimatePresence>
                  {activeSession && (() => {
                    const s = sessions.find(ss => ss.id === activeSession)
                    if (!s) return null
                    const sTasks = tasks.filter(t => t.sessionId === activeSession)
                    return (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="rounded-lg border border-brand-cyan/20 bg-brand-cyan/5 p-3 space-y-2 mt-2">
                          <p className="text-[10px] text-slate-500 font-mono">{s.id.slice(0, 8)}…</p>
                          {s.plan && (
                            <pre className="text-[10px] text-slate-400 whitespace-pre-wrap leading-relaxed max-h-32 overflow-auto">{s.plan}</pre>
                          )}
                          {sTasks.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-[9px] text-slate-600 uppercase tracking-widest">Tasks</p>
                              {sTasks.map(t => <TaskRow key={t.id} task={t} />)}
                            </div>
                          )}
                          {s.tokens && (
                            <p className="text-[10px] text-slate-600">使用トークン: {formatTokens(s.tokens)} / {s.modelUsed}</p>
                          )}
                        </div>
                      </motion.div>
                    )
                  })()}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
