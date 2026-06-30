'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { getToken } from '@/lib/auth'
import type { ExecutorTask, ExecutorProvider, DevPatch } from '@/types'

const BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000').replace(/\/$/, '')

/* ── API helpers ─────────────────────────────────────────────────────────── */

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const token = getToken()
  const authHeader: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}

  const res = await fetch(`${BASE}/api${path}`, {
    credentials: 'include',
    ...opts,
    headers: { 'Content-Type': 'application/json', ...authHeader, ...(opts?.headers ?? {}) },
  })
  if (!res.ok) {
    if (res.status === 401) {
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`
      throw new Error('認証が必要です')
    }
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error((err as Record<string, string>).detail ?? `HTTP ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

async function streamRequest(
  path: string,
  body: unknown,
  onChunk: (text: string) => void,
  onPatchId?: (id: string) => void,
): Promise<string> {
  const token = getToken()
  const authHeader: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}

  const res = await fetch(`${BASE}/api${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream', ...authHeader },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    if (res.status === 401) {
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`
      throw new Error('認証が必要です')
    }
    const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }))
    throw new Error((err as Record<string, string>).detail ?? `HTTP ${res.status}`)
  }
  if (!res.body) throw new Error('No response body')

  const reader  = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let full   = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const raw = line.slice(6).trim()
      if (raw === '[DONE]') return full
      try {
        const parsed = JSON.parse(raw) as Record<string, unknown>
        if (typeof parsed.content === 'string') { full += parsed.content; onChunk(parsed.content) }
        if (typeof parsed.patch_id === 'string' && onPatchId) onPatchId(parsed.patch_id)
        if (typeof parsed.error === 'string') throw new Error(parsed.error)
      } catch (e) { if (e instanceof SyntaxError) continue; throw e }
    }
  }
  return full
}

/* ── Status helpers ──────────────────────────────────────────────────────── */

const STATUS_COLOR: Record<string, string> = {
  pending:            'text-slate-400 bg-slate-800',
  planning:           'text-amber-400 bg-amber-900/30',
  planned:            'text-sky-400 bg-sky-900/30',
  patching:           'text-violet-400 bg-violet-900/30',
  awaiting_approval:  'text-orange-400 bg-orange-900/30 animate-pulse',
  applying:           'text-yellow-400 bg-yellow-900/30',
  applied:            'text-emerald-400 bg-emerald-900/30',
  testing:            'text-cyan-400 bg-cyan-900/30',
  completed:          'text-green-400 bg-green-900/20',
  cancelled:          'text-slate-500 bg-slate-900',
  failed:             'text-red-400 bg-red-900/30',
}

const STATUS_LABEL: Record<string, string> = {
  pending:            '待機中',
  planning:           'プラン生成中...',
  planned:            'プラン完了',
  patching:           'パッチ生成中...',
  awaiting_approval:  '承認待ち',
  applying:           '適用中...',
  applied:            '適用済み',
  testing:            'テスト中...',
  completed:          '完了',
  cancelled:          'キャンセル',
  failed:             'エラー',
}

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLOR[status] ?? 'text-slate-400 bg-slate-800'
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cls}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}

/* ── Risk badge ──────────────────────────────────────────────────────────── */

function RiskBadge({ level }: { level: string }) {
  const cls = level === 'high'   ? 'text-red-400 bg-red-900/30 border-red-700'
            : level === 'medium' ? 'text-amber-400 bg-amber-900/30 border-amber-700'
            :                      'text-emerald-400 bg-emerald-900/30 border-emerald-700'
  return <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${cls}`}>{level.toUpperCase()}</span>
}

/* ── Streaming text display ──────────────────────────────────────────────── */

function StreamingText({ text, active }: { text: string; active: boolean }) {
  return (
    <div className="relative font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
      {text}
      {active && <span className="inline-block w-1.5 h-3.5 bg-brand-cyan ml-0.5 animate-pulse align-middle" />}
    </div>
  )
}

/* ── Patch diff view ─────────────────────────────────────────────────────── */

function PatchDiff({ patch }: { patch: DevPatch }) {
  const [view, setView] = useState<'new' | 'original'>('new')
  const content = view === 'new' ? patch.newContent : patch.originalContent
  const lines = content.split('\n')

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-400 font-mono">{patch.filePath}</span>
        <RiskBadge level={patch.riskLevel} />
        <div className="ml-auto flex gap-1">
          <button onClick={() => setView('new')}
            className={`text-[10px] px-2 py-0.5 rounded ${view === 'new' ? 'bg-brand-cyan/20 text-brand-cyan' : 'text-slate-500 hover:text-slate-300'}`}>
            新しい内容
          </button>
          <button onClick={() => setView('original')}
            className={`text-[10px] px-2 py-0.5 rounded ${view === 'original' ? 'bg-brand-cyan/20 text-brand-cyan' : 'text-slate-500 hover:text-slate-300'}`}>
            元の内容
          </button>
        </div>
      </div>
      {patch.aiExplanation && (
        <p className="text-xs text-slate-400 italic">{patch.aiExplanation}</p>
      )}
      <div className="max-h-72 overflow-auto rounded-lg bg-[#0a1628] border border-white/[0.06] p-3">
        {lines.map((line, i) => (
          <div key={i} className="flex gap-2 min-w-0">
            <span className="text-slate-700 text-[10px] w-8 shrink-0 text-right select-none">{i + 1}</span>
            <span className="text-xs font-mono text-slate-300 break-all">{line || ' '}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Test results ────────────────────────────────────────────────────────── */

function TestResults({ result }: { result: NonNullable<ExecutorTask['test_result']> }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className={`text-sm font-semibold ${result.ok ? 'text-emerald-400' : 'text-amber-400'}`}>
          {result.ok ? '✅' : '⚠️'} {result.summary}
        </span>
      </div>
      <div className="space-y-1.5">
        {result.checks.map((c, i) => (
          <div key={i} className="flex items-start gap-2 text-xs">
            <span className={c.ok ? 'text-emerald-400' : 'text-red-400'} style={{ flexShrink: 0 }}>
              {c.ok ? '✓' : '✗'}
            </span>
            <span className="text-slate-400 font-medium">{c.name}:</span>
            <span className="text-slate-500">{c.detail}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Section wrapper ─────────────────────────────────────────────────────── */

function Section({ title, badge, children }: { title: string; badge?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
      <div className="px-4 py-2.5 border-b border-white/[0.06] flex items-center gap-2">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{title}</p>
        {badge}
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

/* ── Create Task Modal ───────────────────────────────────────────────────── */

function CreateModal({
  onClose, onCreate,
}: {
  onClose: () => void
  onCreate: (t: ExecutorTask) => void
}) {
  const [title, setTitle]           = useState('')
  const [instruction, setInstruction] = useState('')
  const [targetFiles, setTargetFiles] = useState('')
  const [provider, setProvider]     = useState<ExecutorProvider>('auto')
  const [priority, setPriority]     = useState(5)
  const [loading, setLoading]       = useState(false)
  const [err, setErr]               = useState('')

  // Sample verification task
  function fillSample() {
    setTitle('README.md の説明文を改善')
    setInstruction('README.mdの説明文を少し分かりやすく改善する。ただし必ずPatch Previewで停止し、承認後のみApplyする。')
    setTargetFiles('README.md')
  }

  async function submit() {
    if (!title.trim() || !instruction.trim()) return
    setLoading(true); setErr('')
    try {
      const task = await apiFetch<ExecutorTask>('/executor/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          instruction: instruction.trim(),
          target_files: targetFiles.trim() ? targetFiles.split(',').map(s => s.trim()).filter(Boolean) : [],
          provider,
          priority,
        }),
      })
      onCreate(task)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4 rounded-2xl border border-white/[0.08] bg-[#0D1829] p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <p className="text-base font-semibold text-white">新しいExecutorタスク</p>
          <button onClick={fillSample}
            className="text-[10px] text-violet-400 hover:text-violet-300 border border-violet-700/50 rounded px-2 py-0.5 transition-colors">
            サンプルを入力
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">タイトル *</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="例: ログイン画面のエラー表示を改善"
              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50" />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">開発指示 * （自然言語でOK）</label>
            <textarea value={instruction} onChange={e => setInstruction(e.target.value)} rows={4}
              placeholder="例: ログイン失敗時のエラーメッセージを日本語にして、より具体的な内容に変更する"
              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 resize-none" />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">対象ファイル（カンマ区切り、任意）</label>
            <input value={targetFiles} onChange={e => setTargetFiles(e.target.value)}
              placeholder="例: backend/app/routers/auth.py, website/app/login/page.tsx"
              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 font-mono text-xs" />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-slate-500 mb-1 block">AIプロバイダー</label>
              <select value={provider} onChange={e => setProvider(e.target.value as ExecutorProvider)}
                className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none">
                <option value="auto">Auto（Claude優先）</option>
                <option value="anthropic">Claude</option>
                <option value="google">Gemini</option>
                <option value="openai">OpenAI</option>
                <option value="ollama">Ollama（ローカル）</option>
              </select>
            </div>
            <div className="w-24">
              <label className="text-xs text-slate-500 mb-1 block">優先度</label>
              <input type="number" min={1} max={10} value={priority}
                onChange={e => setPriority(Number(e.target.value))}
                className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
            </div>
          </div>
        </div>

        {err && <p className="text-xs text-red-400">{err}</p>}

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="text-xs text-slate-500 hover:text-white px-4 py-2 transition-colors">キャンセル</button>
          <button onClick={submit} disabled={loading || !title.trim() || !instruction.trim()}
            className="px-5 py-2 rounded-lg bg-violet-600/20 border border-violet-500/30 text-violet-300 text-sm font-medium hover:bg-violet-600/30 transition-colors disabled:opacity-40">
            {loading ? '作成中...' : 'タスクを作成'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Task Detail ─────────────────────────────────────────────────────────── */

function TaskDetail({
  task: initialTask,
  onBack,
  onRefresh,
}: {
  task: ExecutorTask
  onBack: () => void
  onRefresh: () => Promise<void>
}) {
  const [task, setTask]           = useState(initialTask)
  const [planText, setPlanText]   = useState(initialTask.plan_content ?? '')
  const [patchText, setPatchText] = useState('')
  const [patch, setPatch]         = useState<DevPatch | null>(null)
  const [planStreaming, setPlanStreaming]   = useState(false)
  const [patchStreaming, setPatchStreaming] = useState(false)
  const [targetFile, setTargetFile] = useState(initialTask.target_files[0] ?? '')
  const [extraCtx, setExtraCtx]   = useState('')
  const [loading, setLoading]     = useState(false)
  const [msg, setMsg]             = useState('')

  // Reload task from server
  const reload = useCallback(async () => {
    try {
      const t = await apiFetch<ExecutorTask>(`/executor/tasks/${initialTask.id}`)
      setTask(t)
      if (t.plan_content && !planText) setPlanText(t.plan_content)
    } catch { /* ignore */ }
  }, [initialTask.id, planText])

  // Load linked patch
  useEffect(() => {
    if (task.patch_id && !patch) {
      apiFetch<DevPatch>(`/dev/patches`).then(async () => {
        // Get patch detail from /dev/patches list
        const patches = await apiFetch<DevPatch[]>('/dev/patches?limit=100')
        const found = patches.find(p => p.id === task.patch_id)
        if (found) setPatch(found)
      }).catch(() => {})
    }
  }, [task.patch_id, patch])

  async function doGeneratePlan() {
    setPlanStreaming(true); setPlanText(''); setMsg('')
    try {
      await streamRequest(
        `/executor/tasks/${task.id}/plan`,
        { extra_context: extraCtx },
        chunk => setPlanText(p => p + chunk),
      )
    } catch (e: unknown) {
      setMsg(`プラン生成エラー: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setPlanStreaming(false)
      await reload()  // always refresh status from server (success or failure)
    }
  }

  async function doGeneratePatch() {
    if (!targetFile.trim()) { setMsg('対象ファイルを入力してください'); return }
    setPatchStreaming(true); setPatchText(''); setMsg('')
    try {
      await streamRequest(
        `/executor/tasks/${task.id}/patch`,
        { target_file: targetFile.trim(), extra_context: extraCtx },
        chunk => setPatchText(p => p + chunk),
        async patchId => {
          // Fetch patch detail
          setTimeout(async () => {
            const patches = await apiFetch<DevPatch[]>('/dev/patches?limit=100')
            const found = patches.find(p => p.id === patchId)
            if (found) setPatch(found)
          }, 500)
        },
      )
    } catch (e: unknown) {
      setMsg(`パッチ生成エラー: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setPatchStreaming(false)
      await reload()  // always refresh status from server (success or failure)
    }
  }

  async function doApply() {
    if (!confirm('パッチを適用しますか？この操作はファイルを上書きします。')) return
    setLoading(true); setMsg('')
    try {
      const t = await apiFetch<ExecutorTask>(`/executor/tasks/${task.id}/apply`, {
        method: 'POST',
        body: JSON.stringify({ confirmed: true }),
      })
      setTask(t)
      setMsg('✅ パッチを適用しました')
    } catch (e: unknown) {
      setMsg(`適用エラー: ${e instanceof Error ? e.message : String(e)}`)
    } finally { setLoading(false) }
  }

  async function doTest() {
    setLoading(true); setMsg('')
    try {
      const t = await apiFetch<ExecutorTask>(`/executor/tasks/${task.id}/test`, {
        method: 'POST',
        body: JSON.stringify({ run_import_check: true }),
      })
      setTask(t)
    } catch (e: unknown) {
      setMsg(`テストエラー: ${e instanceof Error ? e.message : String(e)}`)
    } finally { setLoading(false) }
  }

  async function doRollback() {
    if (!confirm('元のファイル内容に戻しますか？')) return
    setLoading(true); setMsg('')
    try {
      const t = await apiFetch<ExecutorTask>(`/executor/tasks/${task.id}/rollback`, { method: 'POST' })
      setTask(t)
      setMsg('⏪ ロールバック完了')
    } catch (e: unknown) {
      setMsg(`ロールバックエラー: ${e instanceof Error ? e.message : String(e)}`)
    } finally { setLoading(false) }
  }

  async function doCancel() {
    setLoading(true); setMsg('')
    try {
      const t = await apiFetch<ExecutorTask>(`/executor/tasks/${task.id}/cancel`, { method: 'POST' })
      setTask(t); await onRefresh()
    } catch (e: unknown) {
      setMsg(`キャンセルエラー: ${e instanceof Error ? e.message : String(e)}`)
    } finally { setLoading(false) }
  }

  const isActive   = !['completed', 'cancelled', 'failed'].includes(task.status)
  const canPlan    = ['pending', 'planned', 'failed'].includes(task.status)
  const canPatch   = ['planned', 'awaiting_approval', 'failed'].includes(task.status)
  const canApply   = task.status === 'awaiting_approval'
  const canTest    = task.status === 'applied'
  const canRollback = ['applied', 'testing', 'completed'].includes(task.status)
  const canCancel  = isActive

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3 flex-wrap">
        <button onClick={onBack} className="text-xs text-slate-500 hover:text-white transition-colors mt-0.5">← 一覧</button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-semibold text-white truncate">{task.title}</h2>
            <StatusBadge status={task.status} />
          </div>
          <p className="text-xs text-slate-500 mt-0.5 font-mono">{task.id.slice(0, 8)}</p>
        </div>
        {/* Action buttons */}
        <div className="flex gap-1.5 flex-wrap">
          {canCancel && (
            <button onClick={doCancel} disabled={loading}
              className="text-xs px-3 py-1.5 rounded-lg border border-red-800 text-red-400 hover:bg-red-900/20 transition-colors disabled:opacity-40">
              キャンセル
            </button>
          )}
          {canRollback && (
            <button onClick={doRollback} disabled={loading}
              className="text-xs px-3 py-1.5 rounded-lg border border-amber-700 text-amber-400 hover:bg-amber-900/20 transition-colors disabled:opacity-40">
              ⏪ Rollback
            </button>
          )}
        </div>
      </div>

      {msg && (
        <div className={`text-xs px-3 py-2 rounded-lg ${msg.startsWith('✅') || msg.startsWith('⏪') ? 'bg-emerald-900/30 text-emerald-400' : 'bg-red-900/30 text-red-400'}`}>
          {msg}
        </div>
      )}

      {/* Instruction */}
      <Section title="開発指示">
        <p className="text-sm text-slate-300 leading-relaxed">{task.instruction}</p>
        {task.target_files.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {task.target_files.map(f => (
              <span key={f} className="text-[10px] font-mono bg-white/[0.05] border border-white/[0.06] rounded px-2 py-0.5 text-slate-400">{f}</span>
            ))}
          </div>
        )}
        {task.error_msg && (
          <p className="mt-2 text-xs text-red-400 bg-red-900/20 rounded px-2 py-1">{task.error_msg}</p>
        )}
      </Section>

      {/* Extra context input */}
      {isActive && (
        <div>
          <label className="text-xs text-slate-500 mb-1 block">追加コンテキスト（オプション）</label>
          <input value={extraCtx} onChange={e => setExtraCtx(e.target.value)}
            placeholder="例: パフォーマンスより可読性を優先してください"
            className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-violet-500/40" />
        </div>
      )}

      {/* ── Step 1: Plan ── */}
      <Section title="① プラン生成" badge={task.status === 'planned' && <span className="text-[10px] text-emerald-400">✓ 完了</span>}>
        {canPlan && !planStreaming && (
          <button onClick={doGeneratePlan} disabled={planStreaming}
            className="mb-3 text-xs px-4 py-2 rounded-lg bg-violet-600/20 border border-violet-500/30 text-violet-300 hover:bg-violet-600/30 transition-colors">
            🧠 プランを生成
          </button>
        )}
        {(planText || planStreaming) ? (
          <StreamingText text={planText || '生成中...'} active={planStreaming} />
        ) : (
          <p className="text-xs text-slate-600">「プランを生成」をクリックして開始</p>
        )}
      </Section>

      {/* ── Step 2: Patch ── */}
      <Section title="② パッチ生成" badge={
        task.status === 'awaiting_approval' ? <span className="text-[10px] text-orange-400 animate-pulse">承認待ち</span>
        : patch ? <span className="text-[10px] text-emerald-400">✓ 完了</span>
        : null
      }>
        {canPatch && !patchStreaming && (
          <div className="mb-3 flex gap-2">
            <input value={targetFile} onChange={e => setTargetFile(e.target.value)}
              placeholder="対象ファイル（例: backend/app/routers/auth.py）"
              className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-violet-500/40 font-mono" />
            <button onClick={doGeneratePatch} disabled={patchStreaming || !targetFile.trim()}
              className="text-xs px-4 py-2 rounded-lg bg-violet-600/20 border border-violet-500/30 text-violet-300 hover:bg-violet-600/30 transition-colors disabled:opacity-40">
              🔧 パッチ生成
            </button>
          </div>
        )}
        {(patchText || patchStreaming) && !patch && (
          <StreamingText text={patchText} active={patchStreaming} />
        )}
        {patch && (
          <PatchDiff patch={patch} />
        )}
        {!patchText && !patch && (
          <p className="text-xs text-slate-600">プラン生成後にパッチを生成できます</p>
        )}
      </Section>

      {/* ── Step 3: Approval & Apply ── */}
      <Section title="③ 承認 & 適用">
        {canApply ? (
          <div className="space-y-3">
            <div className="rounded-lg bg-orange-900/20 border border-orange-700/40 p-3">
              <p className="text-sm font-semibold text-orange-300">⚠️ Human Approval が必要です</p>
              <p className="text-xs text-orange-400 mt-1">
                上のパッチを確認してから「承認して適用」を押してください。
                この操作でファイルが上書きされます。
              </p>
            </div>
            <button onClick={doApply} disabled={loading}
              className="w-full py-2.5 rounded-lg bg-orange-600/20 border border-orange-500/40 text-orange-300 text-sm font-semibold hover:bg-orange-600/30 transition-colors disabled:opacity-40">
              {loading ? '適用中...' : '✅ 承認して適用 (Apply)'}
            </button>
          </div>
        ) : task.status === 'applied' || task.status === 'testing' || task.status === 'completed' ? (
          <p className="text-xs text-emerald-400">✓ パッチ適用済み</p>
        ) : (
          <p className="text-xs text-slate-600">パッチ生成後に承認ボタンが表示されます</p>
        )}
      </Section>

      {/* ── Step 4: Test ── */}
      <Section title="④ テスト" badge={
        task.test_result ? (
          task.test_result.ok
            ? <span className="text-[10px] text-emerald-400">✓ 通過</span>
            : <span className="text-[10px] text-amber-400">⚠ 要確認</span>
        ) : null
      }>
        {canTest && (
          <button onClick={doTest} disabled={loading}
            className="mb-3 text-xs px-4 py-2 rounded-lg bg-cyan-600/20 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-600/30 transition-colors disabled:opacity-40">
            🧪 テスト実行
          </button>
        )}
        {task.test_result ? (
          <TestResults result={task.test_result} />
        ) : (
          <p className="text-xs text-slate-600">パッチ適用後にテストを実行できます</p>
        )}
      </Section>

      {/* ── Step 5: Report ── */}
      {task.report && (
        <Section title="⑤ 実行レポート">
          <div className="prose prose-sm prose-invert max-w-none">
            <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">{task.report}</pre>
          </div>
        </Section>
      )}
    </div>
  )
}

/* ── Task list item ──────────────────────────────────────────────────────── */

function TaskItem({ task, onSelect }: { task: ExecutorTask; onSelect: () => void }) {
  return (
    <button onClick={onSelect}
      className="w-full text-left rounded-xl border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.04] transition-colors p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-white line-clamp-1">{task.title}</p>
        <StatusBadge status={task.status} />
      </div>
      <p className="text-xs text-slate-500 line-clamp-2">{task.instruction}</p>
      <div className="flex items-center gap-3 text-[10px] text-slate-600 font-mono">
        <span>{task.provider}</span>
        <span>優先度 {task.priority}</span>
        <span>{new Date(task.created_at).toLocaleDateString('ja-JP')}</span>
      </div>
    </button>
  )
}

/* ── Main page ───────────────────────────────────────────────────────────── */

export default function ExecutorPage() {
  const [tasks, setTasks]         = useState<ExecutorTask[]>([])
  const [selected, setSelected]   = useState<ExecutorTask | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [loading, setLoading]     = useState(true)
  const [err, setErr]             = useState('')

  async function fetchTasks() {
    setLoading(true)
    try {
      const data = await apiFetch<ExecutorTask[]>('/executor/tasks?limit=50')
      setTasks(data)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTasks() }, [])

  function handleCreate(task: ExecutorTask) {
    setTasks(p => [task, ...p])
    setShowCreate(false)
    setSelected(task)
  }

  return (
    <div className="min-h-screen bg-[#060D1B] text-white">
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">

        {/* Header */}
        {!selected && (
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-violet-400">⚡</span> AIOS Executor
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Plan → Patch → Preview → Approval → Apply → Test → Report
              </p>
            </div>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600/20 border border-violet-500/30 text-violet-300 text-sm font-medium hover:bg-violet-600/30 transition-colors">
              <span className="text-lg leading-none">+</span>
              新しいタスク
            </button>
          </div>
        )}

        {/* Pipeline flow indicator */}
        {!selected && (
          <div className="flex items-center gap-1 flex-wrap text-[10px] text-slate-600 font-mono">
            {['指示', 'プラン', 'パッチ', '承認', '適用', 'テスト', 'レポート'].map((step, i, arr) => (
              <>
                <span key={step} className="px-2 py-0.5 rounded bg-white/[0.03] border border-white/[0.05]">{step}</span>
                {i < arr.length - 1 && <span key={`arrow-${i}`} className="text-slate-700">→</span>}
              </>
            ))}
          </div>
        )}

        {/* Content */}
        {selected ? (
          <TaskDetail
            task={selected}
            onBack={() => { setSelected(null); fetchTasks() }}
            onRefresh={fetchTasks}
          />
        ) : (
          <>
            {loading && (
              <div className="text-center py-16">
                <div className="inline-block w-6 h-6 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
                <p className="text-xs text-slate-600 mt-3">タスク読み込み中...</p>
              </div>
            )}
            {err && <p className="text-sm text-red-400">{err}</p>}
            {!loading && !err && tasks.length === 0 && (
              <div className="text-center py-16">
                <p className="text-3xl mb-3">⚡</p>
                <p className="text-sm text-slate-400">タスクがまだありません</p>
                <p className="text-xs text-slate-600 mt-1">「新しいタスク」から開発指示を入力してください</p>
                <button onClick={() => setShowCreate(true)}
                  className="mt-4 text-xs px-4 py-2 rounded-lg bg-violet-600/20 border border-violet-500/30 text-violet-300 hover:bg-violet-600/30 transition-colors">
                  最初のタスクを作成
                </button>
              </div>
            )}
            <div className="space-y-3">
              {tasks.map(t => (
                <TaskItem key={t.id} task={t} onSelect={() => setSelected(t)} />
              ))}
            </div>
          </>
        )}
      </div>

      {showCreate && (
        <CreateModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />
      )}
    </div>
  )
}
