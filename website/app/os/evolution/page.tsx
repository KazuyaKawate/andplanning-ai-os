'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { authHeaders } from '@/lib/auth'
import type {
  ProjectHealth, ImprovementSuggestion, QualitySnapshot,
  ArchitectureAnalysis, LessonLearned, EvolutionReport,
} from '@/types'

const BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000').replace(/\/$/, '')

/* ─── SSE helper ─────────────────────────────────────────────────── */

async function streamPost(
  path:    string,
  body:    unknown,
  onChunk: (text: string) => void,
  onEvent: (ev: Record<string, unknown>) => void,
): Promise<void> {
  const res = await fetch(`${BASE}${path}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream', ...authHeaders() },
    body:    JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error' }))
    throw new Error(err.detail ?? `HTTP ${res.status}`)
  }
  if (!res.body) return
  const reader  = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const raw = line.slice(6).trim()
      if (raw === '[DONE]') return
      try {
        const parsed = JSON.parse(raw) as Record<string, unknown>
        if (typeof parsed.content === 'string') onChunk(parsed.content)
        else onEvent(parsed)
      } catch { /* skip */ }
    }
  }
}

/* ─── Score ring ─────────────────────────────────────────────────── */

function ScoreRing({ score, label, color }: { score: number; label: string; color: string }) {
  const r   = 28
  const circ = 2 * Math.PI * r
  const pct  = Math.min(100, Math.max(0, score))
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={72} height={72}>
        <circle cx={36} cy={36} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
        <circle
          cx={36} cy={36} r={r} fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={`${circ * pct / 100} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 36 36)"
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
        <text x={36} y={40} textAnchor="middle" fill="white" fontSize={12} fontWeight={600}>
          {Math.round(pct)}
        </text>
      </svg>
      <span className="text-[10px] text-slate-500 text-center leading-tight">{label}</span>
    </div>
  )
}

/* ─── Debt badge ──────────────────────────────────────────────────── */

const DEBT_COLORS: Record<string, string> = {
  low:      'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  medium:   'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  high:     'text-orange-400 bg-orange-400/10 border-orange-400/30',
  critical: 'text-red-400 bg-red-400/10 border-red-400/30',
  unknown:  'text-slate-400 bg-slate-400/10 border-slate-400/30',
}

const CAT_COLORS: Record<string, string> = {
  feature:  'bg-blue-500/20 text-blue-300 border-blue-500/30',
  refactor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  security: 'bg-red-500/20 text-red-300 border-red-500/30',
  perf:     'bg-orange-500/20 text-orange-300 border-orange-500/30',
  ux:       'bg-pink-500/20 text-pink-300 border-pink-500/30',
}

const DIFF_COLORS: Record<string, string> = {
  easy:   'text-emerald-400',
  medium: 'text-yellow-400',
  hard:   'text-red-400',
}

/* ─── Main page ───────────────────────────────────────────────────── */

export default function EvolutionPage() {
  const [health,       setHealth]       = useState<ProjectHealth | null>(null)
  const [suggestions,  setSuggestions]  = useState<ImprovementSuggestion[]>([])
  const [quality,      setQuality]      = useState<QualitySnapshot[]>([])
  const [analyses,     setAnalyses]     = useState<ArchitectureAnalysis[]>([])
  const [lessons,      setLessons]      = useState<LessonLearned[]>([])
  const [report,       setReport]       = useState<EvolutionReport | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [streaming,    setStreaming]     = useState<string | null>(null)  // which action is running
  const [streamText,   setStreamText]   = useState('')
  const [error,        setError]        = useState<string | null>(null)
  const [activeTab,    setActiveTab]    = useState<'overview'|'suggestions'|'quality'|'architect'|'lessons'|'report'>('overview')
  const streamRef = useRef<string>('')

  const load = useCallback(async () => {
    try {
      const headers = { 'Content-Type': 'application/json', ...authHeaders() }
      const [h, s, q, a, l, r] = await Promise.all([
        fetch(`${BASE}/api/evolution/health`,         { headers }).then(r => r.json()),
        fetch(`${BASE}/api/evolution/suggestions`,    { headers }).then(r => r.json()),
        fetch(`${BASE}/api/evolution/quality`,        { headers }).then(r => r.json()),
        fetch(`${BASE}/api/evolution/architect`,      { headers }).then(r => r.json()),
        fetch(`${BASE}/api/evolution/lessons`,        { headers }).then(r => r.json()),
        fetch(`${BASE}/api/evolution/report/latest`,  { headers }).then(r => r.json()),
      ])
      setHealth(h)
      setSuggestions(Array.isArray(s) ? s : [])
      setQuality(Array.isArray(q) ? q : [])
      setAnalyses(Array.isArray(a) ? a : [])
      setLessons(Array.isArray(l) ? l : [])
      setReport(r.report ?? (r.id ? r : null))
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function runAction(
    label: string,
    path:  string,
    body:  unknown,
    onDone?: (ev: Record<string, unknown>) => void,
  ) {
    setStreaming(label)
    setStreamText('')
    streamRef.current = ''
    setError(null)
    try {
      await streamPost(
        path, body,
        (text) => { streamRef.current += text; setStreamText(s => s + text) },
        (ev)  => { if (onDone && ev.type && String(ev.type).endsWith('_done')) onDone(ev) },
      )
      await load()
    } catch (e) {
      setError(String(e))
    } finally {
      setStreaming(null)
    }
  }

  async function dismissSuggestion(id: string) {
    await fetch(`${BASE}/api/evolution/suggestions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ status: 'dismissed' }),
    })
    setSuggestions(s => s.filter(x => x.id !== id))
  }

  /* ── Quick overview section ── */
  const quickWins     = suggestions.filter(s => s.isQuickWin && s.status === 'pending')
  const highROI       = [...suggestions].filter(s => s.status === 'pending').sort((a,b) => (b.roiScore??0)-(a.roiScore??0)).slice(0,5)
  const majorRisks    = suggestions.filter(s => s.category === 'security' && s.status === 'pending')
  const latestArch    = analyses[0] ?? null

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-violet-500/40 border-t-violet-500 rounded-full animate-spin" />
      </div>
    )
  }

  const tabs = [
    { id: 'overview',     label: 'Overview' },
    { id: 'suggestions',  label: `Suggestions (${suggestions.filter(s=>s.status==='pending').length})` },
    { id: 'quality',      label: 'Quality' },
    { id: 'architect',    label: 'Architect' },
    { id: 'lessons',      label: `Lessons (${lessons.length})` },
    { id: 'report',       label: 'CEO Report' },
  ] as const

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white font-heading">Self-Evolution Engine</h1>
          <p className="text-sm text-slate-500 mt-0.5">AI-powered continuous improvement — all changes require human approval</p>
        </div>
        <button
          onClick={() => runAction('scan', '/api/evolution/scan', {}, undefined)}
          disabled={streaming !== null}
          className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-xs font-medium transition-colors"
        >
          {streaming === 'scan' ? '🔍 Scanning…' : '🔍 Run AI Scan'}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">{error}</div>
      )}

      {/* Project Health Cards */}
      {health && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { label: 'Completion', value: `${health.completionPct.toFixed(0)}%`, color: 'text-violet-400' },
            { label: 'Tech Debt',  value: health.technicalDebt.toUpperCase(),
              color: DEBT_COLORS[health.technicalDebt]?.split(' ')[0] ?? 'text-slate-400' },
            { label: 'Open Patches',   value: health.openPatches,   color: health.openPatches > 0 ? 'text-yellow-400' : 'text-emerald-400' },
            { label: 'Critical Bugs',  value: health.criticalBugs,  color: health.criticalBugs > 0 ? 'text-red-400' : 'text-emerald-400' },
            { label: 'Total Files',    value: health.fileCount,      color: 'text-blue-400' },
            { label: 'Est. Release',   value: health.estimatedRelease ?? '—', color: 'text-slate-300' },
          ].map(c => (
            <div key={c.label} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
              <p className={`text-lg font-bold font-mono ${c.color}`}>{c.value}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{c.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/[0.06] overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-3 py-2 text-xs font-medium rounded-t-lg transition-colors whitespace-nowrap ${
              activeTab === t.id
                ? 'text-violet-400 border-b-2 border-violet-500 bg-violet-500/10'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Streaming output box ── */}
      <AnimatePresence>
        {streaming && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-[#0d1425] border border-violet-500/20 rounded-xl overflow-hidden"
          >
            <div className="flex items-center gap-2 px-4 py-2 border-b border-white/[0.06]">
              <div className="w-2 h-2 bg-violet-500 rounded-full animate-pulse" />
              <span className="text-xs text-violet-400 font-medium">{streaming} running…</span>
            </div>
            <div className="p-4 max-h-64 overflow-y-auto">
              <pre className="text-xs text-slate-400 whitespace-pre-wrap font-mono leading-relaxed">
                {streamText || 'Waiting for AI…'}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── TAB: Overview ── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Health summary */}
          {health?.summary && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
              <h3 className="text-sm font-semibold text-white mb-2">Project Health Summary</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{health.summary}</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Architecture scores */}
            {latestArch && (
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                <h3 className="text-sm font-semibold text-white mb-4">Architecture Scores</h3>
                <div className="flex justify-around">
                  <ScoreRing score={100 - latestArch.riskScore}    label="Risk (inv)" color="#a78bfa" />
                  <ScoreRing score={latestArch.maintainability}     label="Maintain"   color="#34d399" />
                  <ScoreRing score={latestArch.performance}         label="Perf"       color="#60a5fa" />
                  <ScoreRing score={latestArch.securityScore}       label="Security"   color="#f87171" />
                </div>
              </div>
            )}

            {/* Quick Wins */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">⚡ Quick Wins</h3>
                <span className="text-xs text-slate-500">{quickWins.length} ready</span>
              </div>
              {quickWins.length === 0 ? (
                <p className="text-xs text-slate-600">None identified — run Suggestions</p>
              ) : (
                <div className="space-y-2">
                  {quickWins.slice(0,4).map(s => (
                    <div key={s.id} className="text-xs p-2 rounded-lg bg-white/[0.03] border border-emerald-500/20">
                      <p className="text-slate-200 font-medium">{s.title}</p>
                      <p className="text-slate-500 mt-0.5">{s.estimatedHours}h · {s.difficulty}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* High ROI */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">📈 Highest ROI</h3>
                <span className="text-xs text-slate-500">top 5</span>
              </div>
              {highROI.length === 0 ? (
                <p className="text-xs text-slate-600">None yet — run Suggestions</p>
              ) : (
                <div className="space-y-2">
                  {highROI.map((s,i) => (
                    <div key={s.id} className="flex items-center gap-2 text-xs">
                      <span className="text-slate-600 font-mono w-4">{i+1}.</span>
                      <span className="text-slate-300 flex-1 truncate">{s.title}</span>
                      <span className="text-violet-400 font-mono">{s.roiScore?.toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Major Risks */}
          {majorRisks.length > 0 && (
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-red-400 mb-3">🚨 Major Risks ({majorRisks.length})</h3>
              <div className="space-y-2">
                {majorRisks.map(s => (
                  <div key={s.id} className="flex items-start gap-3 text-xs">
                    <span className="text-red-500 mt-0.5">▸</span>
                    <div>
                      <p className="text-slate-200 font-medium">{s.title}</p>
                      <p className="text-slate-500">{s.reason}</p>
                    </div>
                    <span className="ml-auto text-red-400/60 font-mono">{s.difficulty}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Code stats */}
          {health?.scan && (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {[
                ['Pages', health.scan.page_routes],
                ['Endpoints', health.scan.api_endpoints],
                ['Routers', health.scan.api_routers],
                ['Services', health.scan.service_files],
                ['DB Models', health.scan.db_models],
                ['Total Lines', health.scan.total_lines.toLocaleString()],
              ].map(([label, val]) => (
                <div key={label} className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3 text-center">
                  <p className="text-base font-bold text-slate-200 font-mono">{val}</p>
                  <p className="text-[10px] text-slate-600">{label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Suggestions ── */}
      {activeTab === 'suggestions' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            {['general','security','perf','ux','refactor'].map(focus => (
              <button
                key={focus}
                onClick={() => runAction('generating suggestions', '/api/evolution/suggestions/generate', { focus, count: 10 })}
                disabled={streaming !== null}
                className="px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] disabled:opacity-40 text-slate-300 text-xs font-medium transition-colors capitalize border border-white/[0.06]"
              >
                + {focus}
              </button>
            ))}
          </div>

          {suggestions.filter(s=>s.status==='pending').length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-12">No pending suggestions. Click a category above to generate.</p>
          ) : (
            <div className="space-y-3">
              {suggestions.filter(s=>s.status==='pending').map(s => (
                <motion.div
                  key={s.id}
                  layout
                  className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 hover:border-violet-500/20 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded border font-medium ${CAT_COLORS[s.category] ?? ''}`}>
                          {s.category}
                        </span>
                        {s.isQuickWin && (
                          <span className="text-[10px] px-2 py-0.5 rounded border bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-medium">
                            ⚡ Quick Win
                          </span>
                        )}
                        <span className={`text-[10px] font-medium ${DIFF_COLORS[s.difficulty] ?? ''}`}>
                          {s.difficulty}
                        </span>
                        <span className="text-[10px] text-slate-600 ml-auto">
                          ROI {s.roiScore?.toFixed(0) ?? '—'} · {s.estimatedHours}h
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-white">{s.title}</p>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{s.description}</p>
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-slate-600">Why: </span>
                          <span className="text-slate-400">{s.reason}</span>
                        </div>
                        <div>
                          <span className="text-slate-600">Benefit: </span>
                          <span className="text-slate-400">{s.expectedBenefit}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => dismissSuggestion(s.id)}
                      className="text-slate-600 hover:text-red-400 transition-colors text-lg leading-none"
                      title="Dismiss"
                    >
                      ×
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Quality ── */}
      {activeTab === 'quality' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => runAction('quality', '/api/evolution/quality/analyze', {})}
              disabled={streaming !== null}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-medium transition-colors"
            >
              {streaming === 'quality' ? 'Analyzing…' : '📊 Run Quality Check'}
            </button>
          </div>

          {quality.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-12">No quality snapshots yet. Run a quality check.</p>
          ) : (
            <>
              {/* Latest snapshot */}
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                <h3 className="text-sm font-semibold text-white mb-3">Latest Snapshot</h3>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                  {[
                    { label: 'TS Errors',   val: quality[0].tsErrors,       ok: quality[0].tsErrors === 0 },
                    { label: 'Py Issues',   val: quality[0].pyIssues,       ok: quality[0].pyIssues === 0 },
                    { label: 'Build',       val: quality[0].buildOk ? 'OK' : 'FAIL', ok: quality[0].buildOk },
                    { label: 'Sec Issues',  val: quality[0].securityIssues, ok: quality[0].securityIssues === 0 },
                    { label: 'Dep Issues',  val: quality[0].depIssues,      ok: quality[0].depIssues === 0 },
                  ].map(m => (
                    <div key={m.label} className="bg-white/[0.03] rounded-lg p-3 text-center">
                      <p className={`text-lg font-bold font-mono ${m.ok ? 'text-emerald-400' : 'text-red-400'}`}>{m.val}</p>
                      <p className="text-[10px] text-slate-500">{m.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* History trend */}
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                <h3 className="text-sm font-semibold text-white mb-3">History (last {quality.length})</h3>
                <div className="space-y-2">
                  {quality.map(q => (
                    <div key={q.id} className="flex items-center gap-4 text-xs text-slate-400 py-1 border-b border-white/[0.04]">
                      <span className="font-mono text-slate-600 shrink-0">{new Date(q.createdAt).toLocaleDateString()}</span>
                      <span className={q.tsErrors === 0 ? 'text-emerald-400' : 'text-red-400'}>TS:{q.tsErrors}</span>
                      <span className={q.pyIssues === 0 ? 'text-emerald-400' : 'text-red-400'}>Py:{q.pyIssues}</span>
                      <span className={q.buildOk ? 'text-emerald-400' : 'text-red-400'}>{q.buildOk ? '✓ Build' : '✗ Build'}</span>
                      <span className="text-slate-600 ml-auto">{q.totalFiles} files</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── TAB: Architect ── */}
      {activeTab === 'architect' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            {['general','security','perf','deps'].map(focus => (
              <button
                key={focus}
                onClick={() => runAction('architect analysis', '/api/evolution/architect/analyze', { focus })}
                disabled={streaming !== null}
                className="px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] disabled:opacity-40 text-slate-300 text-xs font-medium transition-colors capitalize border border-white/[0.06]"
              >
                🏛 {focus}
              </button>
            ))}
          </div>

          {analyses.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-12">No analyses yet. Click a focus area above.</p>
          ) : (
            <div className="space-y-4">
              {analyses.map(a => (
                <div key={a.id} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="flex gap-4">
                      <ScoreRing score={100 - a.riskScore}  label="Risk"     color="#a78bfa" />
                      <ScoreRing score={a.maintainability}   label="Maintain" color="#34d399" />
                      <ScoreRing score={a.performance}       label="Perf"     color="#60a5fa" />
                      <ScoreRing score={a.securityScore}     label="Security" color="#f87171" />
                    </div>
                    <div className="ml-auto text-xs text-slate-600">
                      {new Date(a.createdAt).toLocaleDateString()} · {a.modelUsed}
                    </div>
                  </div>

                  {a.issues.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-red-400 font-medium mb-1">Issues</p>
                      <ul className="space-y-1">
                        {a.issues.map((issue,i) => (
                          <li key={i} className="text-xs text-slate-400 flex gap-2">
                            <span className="text-red-500">▸</span>{issue}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {a.suggestions.length > 0 && (
                    <div>
                      <p className="text-xs text-emerald-400 font-medium mb-1">Suggestions</p>
                      <ul className="space-y-1">
                        {a.suggestions.map((sug,i) => (
                          <li key={i} className="text-xs text-slate-400 flex gap-2">
                            <span className="text-emerald-500">✓</span>{sug}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {a.fullAnalysis && (
                    <details className="mt-3">
                      <summary className="text-xs text-slate-600 cursor-pointer hover:text-slate-400">Full analysis…</summary>
                      <pre className="mt-2 text-xs text-slate-400 whitespace-pre-wrap leading-relaxed font-mono bg-black/20 rounded p-3">
                        {a.fullAnalysis}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Lessons ── */}
      {activeTab === 'lessons' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => runAction('lesson', '/api/evolution/lessons/generate', { context: 'General AIOS system review' })}
              disabled={streaming !== null}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-medium transition-colors"
            >
              {streaming === 'lesson' ? 'Generating…' : '📚 Generate Lesson'}
            </button>
          </div>

          {lessons.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-12">No lessons yet. They are auto-generated after workflow runs.</p>
          ) : (
            <div className="space-y-3">
              {lessons.map(l => (
                <div key={l.id} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-slate-600">{new Date(l.createdAt).toLocaleDateString()}</span>
                    {l.factoryId && <span className="text-xs text-slate-600">{l.factoryId}</span>}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
                      <p className="text-emerald-400 font-medium mb-1">✓ What improved</p>
                      <p className="text-slate-400 leading-relaxed">{l.whatImproved}</p>
                    </div>
                    <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3">
                      <p className="text-yellow-400 font-medium mb-1">→ What to improve</p>
                      <p className="text-slate-400 leading-relaxed">{l.whatToImprove}</p>
                    </div>
                    {l.archChanges && (
                      <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-3">
                        <p className="text-purple-400 font-medium mb-1">🏛 Architecture changes</p>
                        <p className="text-slate-400 leading-relaxed">{l.archChanges}</p>
                      </div>
                    )}
                    {l.workflowChanges && (
                      <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3">
                        <p className="text-blue-400 font-medium mb-1">⚙️ Workflow changes</p>
                        <p className="text-slate-400 leading-relaxed">{l.workflowChanges}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: CEO Report ── */}
      {activeTab === 'report' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            {(['daily','weekly','milestone'] as const).map(type => (
              <button
                key={type}
                onClick={() => runAction('report', '/api/evolution/report', { report_type: type })}
                disabled={streaming !== null}
                className="px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] disabled:opacity-40 text-slate-300 text-xs font-medium transition-colors capitalize border border-white/[0.06]"
              >
                📋 {type}
              </button>
            ))}
            <div className="ml-auto flex gap-2">
              <button
                onClick={() => runAction('roadmap', '/api/evolution/roadmap/generate', { horizon: '3months' })}
                disabled={streaming !== null}
                className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-xs font-medium transition-colors"
              >
                🗺 Generate Roadmap
              </button>
            </div>
          </div>

          {report ? (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">{report.title}</h3>
                <span className="text-xs text-slate-600">{new Date(report.createdAt).toLocaleDateString()}</span>
              </div>

              {/* Meta stats */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center">
                  <p className="text-xl font-bold text-violet-400">{report.filesChanged.length}</p>
                  <p className="text-[10px] text-slate-500">Files Changed</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-emerald-400">{report.featuresDone.length}</p>
                  <p className="text-[10px] text-slate-500">Features Done</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-red-400">{report.risks.length}</p>
                  <p className="text-[10px] text-slate-500">Risks</p>
                </div>
              </div>

              {/* Markdown content */}
              <div className="prose prose-invert prose-sm max-w-none">
                <pre className="bg-black/20 rounded-xl p-4 text-xs text-slate-300 whitespace-pre-wrap leading-relaxed font-mono overflow-auto max-h-[500px]">
                  {report.contentMd}
                </pre>
              </div>

              {report.estLaunchDate && (
                <div className="mt-4 flex items-center gap-2 text-sm">
                  <span className="text-slate-500">Estimated launch:</span>
                  <span className="text-violet-400 font-semibold">{report.estLaunchDate}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-12">
              No report yet. Click Daily / Weekly / Milestone above to generate.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
