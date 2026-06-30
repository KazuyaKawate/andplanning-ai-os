'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { formatRelativeTime } from '@/lib/utils'
import type { DebugStatus, DebugLogEntry, DebugSession, DevPatch } from '@/types'

const BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000').replace(/\/$/, '')

/* ======================================================================
   SSE stream helper
   ====================================================================== */

async function streamPost(
  path: string,
  body: unknown,
  onChunk: (text: string) => void,
  onMeta?: (data: Record<string, string>) => void,
): Promise<void> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify(body),
  })
  if (!res.body) throw new Error('No response body')
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
        const parsed = JSON.parse(raw) as Record<string, string>
        if ('content' in parsed) onChunk(parsed.content)
        else if (onMeta) onMeta(parsed)
      } catch { /* skip */ }
    }
  }
}

/* ======================================================================
   Severity badge
   ====================================================================== */

function SeverityBadge({ level }: { level: string }) {
  const map: Record<string, string> = {
    low:      'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    medium:   'bg-amber-500/20 text-amber-400 border-amber-500/30',
    high:     'bg-orange-500/20 text-orange-400 border-orange-500/30',
    critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  }
  const cls = map[level] ?? map.medium
  return (
    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${cls}`}>
      {level.toUpperCase()}
    </span>
  )
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`flex items-center gap-1 text-[11px] font-mono ${ok ? 'text-emerald-400' : 'text-red-400'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-emerald-400' : 'bg-red-400'}`} />
      {label}
    </span>
  )
}

/* ======================================================================
   Health cards
   ====================================================================== */

function HealthCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
      <p className="text-[10px] text-slate-600 uppercase tracking-widest font-medium mb-1">{label}</p>
      <p className={`text-xl font-bold font-mono ${accent ?? 'text-white'}`}>{value}</p>
      {sub && <p className="text-[10px] text-slate-600 mt-0.5">{sub}</p>}
    </div>
  )
}

/* ======================================================================
   Risk badge (for patches)
   ====================================================================== */

function RiskBadge({ level }: { level: string }) {
  const color = level === 'high'
    ? 'bg-red-500/20 text-red-400 border-red-500/30'
    : level === 'medium'
    ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
  return (
    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${color}`}>
      {level.toUpperCase()}
    </span>
  )
}

/* ======================================================================
   Simple diff viewer
   ====================================================================== */

function DiffViewer({ original, updated }: { original: string; updated: string }) {
  const origLines = original.split('\n')
  const updLines  = updated.split('\n')
  const maxLen    = Math.max(origLines.length, updLines.length)
  const changed: { orig: string | null; upd: string | null; kind: 'add' | 'del' | 'change' }[] = []
  for (let i = 0; i < maxLen; i++) {
    const o = origLines[i] ?? null
    const u = updLines[i]  ?? null
    if (o === u) continue
    if (o === null)  changed.push({ orig: null, upd: u, kind: 'add' })
    else if (u === null) changed.push({ orig: o, upd: null, kind: 'del' })
    else changed.push({ orig: o, upd: u, kind: 'change' })
  }
  if (changed.length === 0) return <p className="text-xs text-slate-600 p-3">変更なし</p>
  return (
    <div className="font-mono text-[10px] overflow-auto max-h-48">
      {changed.slice(0, 100).map((row, i) => (
        <div key={i} className={row.kind === 'add' ? 'bg-emerald-500/10' : row.kind === 'del' ? 'bg-red-500/10' : 'bg-amber-500/10'}>
          {row.orig !== null && <div className="px-2 py-0.5 whitespace-pre text-red-400">- {row.orig}</div>}
          {row.upd  !== null && <div className="px-2 py-0.5 whitespace-pre text-emerald-400">+ {row.upd}</div>}
        </div>
      ))}
      {changed.length > 100 && <p className="text-slate-600 text-[10px] p-2">…省略</p>}
    </div>
  )
}

/* ======================================================================
   Patch card (apply / reject)
   ====================================================================== */

function PatchCard({
  patch, onApply, onReject, applying,
}: {
  patch: DevPatch
  onApply: (id: string) => void
  onReject: (id: string) => void
  applying: string | null
}) {
  const [expanded, setExpanded] = useState(false)
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className={[
        'rounded-xl border p-3 space-y-2 text-xs',
        patch.status === 'pending'  ? 'border-brand-blue/20 bg-brand-blue/5'   : '',
        patch.status === 'applied'  ? 'border-emerald-500/20 bg-emerald-500/5' : '',
        patch.status === 'rejected' ? 'border-white/[0.06] bg-white/[0.02] opacity-50' : '',
      ].join(' ')}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-1.5 items-center mb-0.5">
            <p className="text-sm font-semibold text-white truncate">{patch.title}</p>
            <RiskBadge level={patch.riskLevel} />
            <span className={[
              'text-[10px] font-mono px-1.5 py-0.5 rounded',
              patch.status === 'pending'  ? 'bg-blue-500/20 text-blue-400'       : '',
              patch.status === 'applied'  ? 'bg-emerald-500/20 text-emerald-400' : '',
              patch.status === 'rejected' ? 'bg-slate-500/20 text-slate-500'     : '',
            ].join(' ')}>{patch.status.toUpperCase()}</span>
          </div>
          <p className="text-[10px] text-slate-500 font-mono truncate">{patch.filePath}</p>
        </div>
        <button onClick={() => setExpanded(e => !e)} className="text-[10px] text-slate-600 hover:text-slate-400 shrink-0">
          {expanded ? '▲' : '▼ diff'}
        </button>
      </div>
      {patch.aiExplanation && <p className="text-[11px] text-slate-400 leading-relaxed">{patch.aiExplanation}</p>}
      {expanded && (
        <div className="rounded-lg border border-white/[0.06] overflow-hidden">
          <p className="px-2 py-1 text-[10px] text-slate-600 font-mono border-b border-white/[0.05]">diff — {patch.filePath}</p>
          <DiffViewer original={patch.originalContent} updated={patch.newContent} />
        </div>
      )}
      {patch.status === 'pending' && (
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => onApply(patch.id)}
            disabled={!!applying}
            className="flex-1 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold hover:bg-emerald-500/30 transition-colors disabled:opacity-40"
          >
            {applying === patch.id ? '適用中…' : '✓ Apply'}
          </button>
          <button
            onClick={() => onReject(patch.id)}
            disabled={!!applying}
            className="flex-1 py-1 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 font-semibold hover:bg-red-500/30 transition-colors disabled:opacity-40"
          >
            ✕ Reject
          </button>
        </div>
      )}
      <p className="text-[9px] text-slate-700 font-mono">{formatRelativeTime(patch.createdAt)}</p>
    </motion.div>
  )
}

/* ======================================================================
   Debug session row
   ====================================================================== */

function SessionRow({ s, onSelect }: { s: DebugSession; onSelect: (s: DebugSession) => void }) {
  return (
    <button
      onClick={() => onSelect(s)}
      className="w-full text-left rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2 hover:bg-white/[0.05] transition-colors space-y-1"
    >
      <div className="flex items-center gap-2 flex-wrap">
        <SeverityBadge level={s.severity} />
        {s.errorType && (
          <span className="text-[10px] font-mono text-brand-cyan">{s.errorType}</span>
        )}
        <span className="text-[10px] text-slate-600 font-mono ml-auto">{formatRelativeTime(s.createdAt)}</span>
      </div>
      <p className="text-[11px] text-slate-400 truncate">{s.errorText.slice(0, 100)}</p>
      <div className="flex items-center gap-2">
        <span className={[
          'text-[9px] font-mono px-1 py-0.5 rounded',
          s.status === 'resolved' ? 'bg-emerald-500/20 text-emerald-600' :
          s.status === 'patched'  ? 'bg-brand-blue/20 text-brand-cyan' :
          'bg-white/[0.05] text-slate-600',
        ].join(' ')}>{s.status}</span>
        <span className="text-[9px] text-slate-700">{s.source}</span>
      </div>
    </button>
  )
}

/* ======================================================================
   Main page
   ====================================================================== */

export default function DebugPage() {
  // System health
  const [status,        setStatus]        = useState<DebugStatus | null>(null)
  const [logs,          setLogs]          = useState<DebugLogEntry[]>([])
  const [history,       setHistory]       = useState<DebugSession[]>([])
  const [patches,       setPatches]       = useState<DevPatch[]>([])

  // Analysis workspace
  const [errorText,     setErrorText]     = useState('')
  const [severity,      setSeverity]      = useState<'low' | 'medium' | 'high' | 'critical'>('medium')
  const [source,        setSource]        = useState('manual')
  const [streaming,     setStreaming]      = useState(false)
  const [streamBuf,     setStreamBuf]     = useState('')
  const [sessionId,     setSessionId]     = useState<string | null>(null)
  const [detectedType,  setDetectedType]  = useState<string | null>(null)

  // Patch generation
  const [filePath,      setFilePath]      = useState('')
  const [patchStreaming, setPatchStreaming] = useState(false)
  const [patchBuf,      setPatchBuf]      = useState('')
  const [applying,      setApplying]      = useState<string | null>(null)

  // UI state
  const [rightTab,      setRightTab]      = useState<'patches' | 'history'>('history')
  const [error,         setError]         = useState<string | null>(null)
  const [loading,       setLoading]       = useState(true)

  const analysisEndRef = useRef<HTMLDivElement>(null)

  // ── Data loading ──────────────────────────────────────────────────────

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/debug/status`)
      if (res.ok) setStatus(await res.json() as DebugStatus)
    } catch { /* non-fatal */ }
  }, [])

  const loadLogs = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/debug/logs?limit=20`)
      if (res.ok) setLogs(await res.json() as DebugLogEntry[])
    } catch { /* non-fatal */ }
  }, [])

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/debug/history?limit=20`)
      if (res.ok) setHistory(await res.json() as DebugSession[])
    } catch { /* non-fatal */ }
  }, [])

  const loadPatches = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/dev/patches?limit=20`)
      if (res.ok) setPatches(await res.json() as DevPatch[])
    } catch { /* non-fatal */ }
  }, [])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await Promise.all([loadStatus(), loadLogs(), loadHistory(), loadPatches()])
      setLoading(false)
    }
    void init()
    const interval = setInterval(() => { void loadStatus() }, 30_000)
    return () => clearInterval(interval)
  }, [loadStatus, loadLogs, loadHistory, loadPatches])

  // Scroll analysis to bottom
  useEffect(() => {
    analysisEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [streamBuf])

  // ── Actions ───────────────────────────────────────────────────────────

  async function handleAnalyze() {
    if (!errorText.trim() || streaming) return
    setStreaming(true)
    setStreamBuf('')
    setSessionId(null)
    setDetectedType(null)
    setError(null)

    try {
      await streamPost(
        '/api/debug/analyze',
        { error_text: errorText.trim(), context: '', source, severity },
        (chunk) => setStreamBuf(b => b + chunk),
        (meta) => {
          if (meta.session_id) setSessionId(meta.session_id)
          if (meta.error_type) setDetectedType(meta.error_type)
          if (meta.severity)   setSeverity(meta.severity as typeof severity)
        },
      )
    } catch (e) {
      setError(String(e))
    }

    setStreaming(false)
    await loadHistory()
    setRightTab('history')
  }

  async function handleGeneratePatch() {
    if (!sessionId || !filePath.trim() || patchStreaming) return
    setPatchStreaming(true)
    setPatchBuf('')
    setError(null)
    let newPatchId: string | null = null

    try {
      await streamPost(
        '/api/debug/patch',
        { session_id: sessionId, file_path: filePath.trim(), context: '' },
        (chunk) => setPatchBuf(b => b + chunk),
        (meta) => { if (meta.patch_id) newPatchId = meta.patch_id },
      )
    } catch (e) {
      setError(String(e))
    }

    setPatchStreaming(false)
    if (newPatchId) {
      await loadPatches()
      setRightTab('patches')
    }
  }

  async function handleApply(patchId: string) {
    setApplying(patchId)
    setError(null)
    try {
      const res = await fetch(`${BASE_URL}/api/dev/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patchId, confirmed: true }),
      })
      const data = await res.json() as { ok: boolean; message: string; detail?: string }
      if (res.ok && data.ok) {
        await loadPatches()
        await loadHistory()
      } else {
        setError(data.detail ?? data.message ?? 'Apply failed')
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setApplying(null)
    }
  }

  async function handleReject(patchId: string) {
    try {
      await fetch(`${BASE_URL}/api/dev/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patchId, confirmed: true }),
      })
      await loadPatches()
    } catch { /* ignore */ }
  }

  function handleSelectSession(s: DebugSession) {
    setErrorText(s.errorText)
    setSeverity(s.severity as typeof severity)
    setSource(s.source)
    if (s.fullAnalysis) setStreamBuf(s.fullAnalysis)
    if (s.errorType)    setDetectedType(s.errorType)
    setSessionId(s.id)
  }

  function handleSelectLog(log: DebugLogEntry) {
    const text = log.detail ? `${log.message}\n\n${log.detail}` : log.message
    setErrorText(text)
    setSource(log.source)
    setSeverity(log.level === 'ERROR' ? 'high' : 'medium')
    setStreamBuf('')
    setSessionId(null)
  }

  const pendingPatches = patches.filter(p => p.status === 'pending').length

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full gap-4 max-w-none">

      {/* ── Header ── */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold font-heading text-white flex items-center gap-2">
            🐛 Auto Debugger
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            エラー検出・根本原因分析・安全なパッチ提案
          </p>
        </div>
        <div className="flex items-center gap-2">
          {status && (
            <div className="flex gap-3 text-[11px]">
              <StatusBadge ok={status.uptime_ok} label="Backend" />
              <StatusBadge ok={status.db_ok}     label="DB" />
            </div>
          )}
          <button
            onClick={() => { void loadStatus(); void loadLogs(); void loadHistory(); void loadPatches() }}
            className="text-[11px] px-2 py-1 rounded bg-white/[0.04] hover:bg-white/[0.07] text-slate-400 transition-colors"
          >
            ↻ 更新
          </button>
        </div>
      </div>

      {error && (
        <div className="shrink-0 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400 flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-slate-600 hover:text-slate-400">✕</button>
        </div>
      )}

      {/* ── System Health row ── */}
      {status && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
          <HealthCard
            label="Today's Error Rate"
            value={`${(status.error_rate * 100).toFixed(1)}%`}
            sub={`${status.errors_today} errors / ${status.runs_today} runs`}
            accent={status.error_rate > 0.1 ? 'text-red-400' : 'text-emerald-400'}
          />
          <HealthCard
            label="Errors Today"
            value={status.errors_today}
            sub={`${status.failed_runs.length} recent failed runs`}
            accent={status.errors_today > 0 ? 'text-amber-400' : 'text-emerald-400'}
          />
          <HealthCard
            label="Debug Sessions"
            value={status.debug_sessions_total}
            sub="累計解析セッション数"
          />
          <HealthCard
            label="Pending Patches"
            value={pendingPatches}
            sub="承認待ちパッチ"
            accent={pendingPatches > 0 ? 'text-amber-400' : 'text-white'}
          />
        </div>
      )}

      {/* ── Main 3-panel grid ── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[260px_1fr_280px] gap-4 min-h-0">

        {/* ── Left: Recent Errors / Logs ── */}
        <div className="flex flex-col rounded-xl border border-white/[0.07] bg-white/[0.02] min-h-0 overflow-hidden">
          <div className="px-3 py-2.5 border-b border-white/[0.06] shrink-0">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
              Recent Errors
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {loading && <p className="text-xs text-slate-600 p-3">読込中…</p>}
            {!loading && logs.length === 0 && (
              <div className="text-center py-8">
                <p className="text-2xl mb-2">✅</p>
                <p className="text-xs text-slate-600">エラーが見当たりません</p>
              </div>
            )}
            {logs.map(log => (
              <button
                key={log.id}
                onClick={() => handleSelectLog(log)}
                className="w-full text-left rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2 hover:bg-white/[0.06] transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={[
                    'text-[9px] font-mono px-1 py-0.5 rounded',
                    log.level === 'ERROR'   ? 'bg-red-500/20 text-red-400'     : '',
                    log.level === 'WARNING' ? 'bg-amber-500/20 text-amber-400' : '',
                    log.level === 'INFO'    ? 'bg-blue-500/20 text-blue-400'   : '',
                  ].join(' ')}>{log.level}</span>
                  <span className="text-[9px] text-slate-600 font-mono">{log.source}</span>
                  <span className="text-[9px] text-slate-700 font-mono ml-auto">
                    {formatRelativeTime(log.timestamp)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate leading-snug">{log.message}</p>
              </button>
            ))}
          </div>

          {/* Failed runs */}
          {status && status.failed_runs.length > 0 && (
            <>
              <div className="px-3 py-2 border-t border-white/[0.06] shrink-0">
                <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Failed Runs</p>
              </div>
              <div className="overflow-y-auto max-h-40 p-2 space-y-1.5 border-t border-white/[0.04]">
                {status.failed_runs.map(r => (
                  <button
                    key={r.id}
                    onClick={() => {
                      setErrorText(`Workflow failed: ${r.workflowName}\nFactory: ${r.factoryId}\nInput: ${r.inputSummary}`)
                      setSource('workflow')
                      setSeverity('high')
                      setStreamBuf('')
                      setSessionId(null)
                    }}
                    className="w-full text-left rounded-lg border border-white/[0.05] bg-white/[0.02] px-2 py-1.5 hover:bg-white/[0.06] transition-colors"
                  >
                    <p className="text-[11px] text-slate-400 truncate">{r.workflowName}</p>
                    <p className="text-[9px] text-slate-700 font-mono">{r.factoryId} · {formatRelativeTime(r.startedAt)}</p>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── Center: Analysis workspace ── */}
        <div className="flex flex-col rounded-xl border border-white/[0.07] bg-white/[0.02] min-h-0 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-white/[0.06] shrink-0 flex items-center justify-between">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
              Error Analysis
            </p>
            {sessionId && detectedType && (
              <span className="text-[10px] font-mono text-brand-cyan">{detectedType}</span>
            )}
          </div>

          {/* Error input */}
          <div className="p-4 border-b border-white/[0.06] shrink-0 space-y-3">
            <textarea
              value={errorText}
              onChange={e => setErrorText(e.target.value)}
              placeholder="エラーメッセージ・スタックトレースを貼り付けてください&#10;&#10;例:&#10;TypeError: Cannot read properties of undefined (reading 'map')&#10;    at DashboardPage (/app/os/dashboard/page.tsx:42:18)"
              rows={5}
              disabled={streaming}
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs text-slate-300 placeholder:text-slate-600 focus:border-brand-cyan/40 focus:outline-none resize-none font-mono disabled:opacity-40"
            />
            <div className="flex gap-2 flex-wrap items-center">
              <select
                value={severity}
                onChange={e => setSeverity(e.target.value as typeof severity)}
                disabled={streaming}
                className="px-2 py-1 rounded-lg border border-white/[0.08] bg-white/[0.04] text-xs text-slate-300 focus:outline-none disabled:opacity-40"
              >
                <option value="low">低 low</option>
                <option value="medium">中 medium</option>
                <option value="high">高 high</option>
                <option value="critical">致命的 critical</option>
              </select>
              <select
                value={source}
                onChange={e => setSource(e.target.value)}
                disabled={streaming}
                className="px-2 py-1 rounded-lg border border-white/[0.08] bg-white/[0.04] text-xs text-slate-300 focus:outline-none disabled:opacity-40"
              >
                <option value="manual">手動入力</option>
                <option value="frontend">フロントエンド</option>
                <option value="backend">バックエンド</option>
                <option value="workflow">ワークフロー</option>
                <option value="api">API</option>
              </select>
              <button
                onClick={() => void handleAnalyze()}
                disabled={streaming || !errorText.trim()}
                className="px-4 py-1.5 rounded-lg bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-semibold hover:bg-red-500/30 transition-colors disabled:opacity-40"
              >
                {streaming ? '解析中…' : '🐛 Analyze'}
              </button>
              {(streamBuf || errorText) && (
                <button
                  onClick={() => { setErrorText(''); setStreamBuf(''); setSessionId(null); setDetectedType(null) }}
                  className="text-[11px] text-slate-600 hover:text-slate-400"
                >
                  クリア
                </button>
              )}
            </div>
          </div>

          {/* Analysis output */}
          <div className="flex-1 overflow-y-auto p-4">
            {!streamBuf && !streaming && (
              <div className="text-center py-12 space-y-3">
                <p className="text-4xl">🔍</p>
                <p className="text-xs text-slate-500">エラーを貼り付けてAnalyzeをクリック</p>
                <div className="flex flex-wrap gap-2 justify-center mt-4">
                  {[
                    'TypeError: Cannot read properties of undefined',
                    'ModuleNotFoundError: No module named',
                    'CORS error: Access-Control-Allow-Origin',
                    'SQLAlchemy TimeoutError on DB connect',
                  ].map(hint => (
                    <button
                      key={hint}
                      onClick={() => { setErrorText(hint); setSource('manual') }}
                      className="text-[11px] px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-slate-400 hover:bg-white/[0.08] hover:text-slate-200 transition-colors font-mono"
                    >
                      {hint}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(streamBuf || streaming) && (
              <div className="space-y-3">
                {detectedType && (
                  <div className="flex gap-2 flex-wrap">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                      {detectedType}
                    </span>
                    <SeverityBadge level={severity} />
                    <span className="text-[10px] font-mono text-slate-600">{source}</span>
                  </div>
                )}
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
                  <pre className="text-xs text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">
                    {streamBuf}
                    {streaming && <span className="inline-block w-1.5 h-3 bg-brand-cyan animate-pulse ml-0.5 rounded-sm" />}
                  </pre>
                </div>
                <div ref={analysisEndRef} />
              </div>
            )}

            {/* Patch generation section (appears after analysis) */}
            {sessionId && !streaming && (
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="mt-4 rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 space-y-3"
              >
                <p className="text-xs font-semibold text-purple-300">🔧 パッチ提案を生成</p>
                <p className="text-[11px] text-slate-500">
                  修正したいファイルのパスを入力してください（例: website/hooks/useWorkflowEngine.ts）
                </p>
                <input
                  type="text"
                  value={filePath}
                  onChange={e => setFilePath(e.target.value)}
                  placeholder="例: website/app/os/dashboard/page.tsx"
                  disabled={patchStreaming}
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs text-slate-300 placeholder:text-slate-600 font-mono focus:border-purple-400/40 focus:outline-none disabled:opacity-40"
                />
                <button
                  onClick={() => void handleGeneratePatch()}
                  disabled={patchStreaming || !filePath.trim()}
                  className="px-4 py-1.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-semibold hover:bg-purple-500/30 transition-colors disabled:opacity-40"
                >
                  {patchStreaming ? 'パッチ生成中…' : '🔧 Generate Patch'}
                </button>

                {(patchBuf || patchStreaming) && (
                  <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                    <pre className="text-xs text-slate-300 whitespace-pre-wrap font-sans leading-relaxed max-h-40 overflow-y-auto">
                      {patchBuf}
                      {patchStreaming && <span className="inline-block w-1.5 h-3 bg-purple-400 animate-pulse ml-0.5 rounded-sm" />}
                    </pre>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>

        {/* ── Right: Patches + Debug History ── */}
        <div className="flex flex-col rounded-xl border border-white/[0.07] bg-white/[0.02] min-h-0 overflow-hidden">
          <div className="flex border-b border-white/[0.06] shrink-0">
            {(['patches', 'history'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setRightTab(tab)}
                className={[
                  'flex-1 py-2.5 text-[11px] font-medium transition-colors',
                  rightTab === tab
                    ? 'text-white border-b-2 border-brand-cyan bg-white/[0.03]'
                    : 'text-slate-500 hover:text-slate-300',
                ].join(' ')}
              >
                {tab === 'patches'
                  ? `Patches${pendingPatches ? ` (${pendingPatches})` : ''}`
                  : `History (${history.length})`}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {rightTab === 'patches' && (
              <>
                <div className="flex justify-between items-center mb-1">
                  <p className="text-[10px] text-slate-600 font-mono">{patches.length} patches total</p>
                  <button onClick={() => void loadPatches()} className="text-[10px] text-slate-600 hover:text-slate-400">↻</button>
                </div>
                {patches.length === 0 && (
                  <div className="text-center py-10">
                    <p className="text-2xl mb-2">📋</p>
                    <p className="text-xs text-slate-600">パッチ提案がありません</p>
                    <p className="text-[10px] text-slate-700 mt-1">エラーを解析してパッチを生成してください</p>
                  </div>
                )}
                {patches.map(p => (
                  <PatchCard
                    key={p.id} patch={p}
                    onApply={handleApply} onReject={handleReject}
                    applying={applying}
                  />
                ))}
              </>
            )}

            {rightTab === 'history' && (
              <>
                <div className="flex justify-between items-center mb-1">
                  <p className="text-[10px] text-slate-600 font-mono">{history.length} sessions</p>
                  <button onClick={() => void loadHistory()} className="text-[10px] text-slate-600 hover:text-slate-400">↻</button>
                </div>
                {history.length === 0 && (
                  <div className="text-center py-10">
                    <p className="text-2xl mb-2">🔍</p>
                    <p className="text-xs text-slate-600">デバッグ履歴がありません</p>
                  </div>
                )}
                {history.map(s => (
                  <SessionRow key={s.id} s={s} onSelect={handleSelectSession} />
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
