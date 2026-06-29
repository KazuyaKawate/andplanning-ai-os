'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import Link from 'next/link'
import StatusBadge from '@/components/os/StatusBadge'
import { useWorkflowEngine } from '@/hooks/useWorkflowEngine'
import { api } from '@/lib/api/runtime'
import { formatDuration, formatRelativeTime } from '@/lib/utils'
import type { Workflow, FactoryRuntime, WorkflowInputField } from '@/types'

/* ======================================================================
   Step list
   ====================================================================== */

function StepList({ steps }: { steps: { id: string; name: string; status: string; durationMs?: number }[] }) {
  return (
    <div className="space-y-1.5">
      {steps.map((step, i) => (
        <motion.div
          key={step.id}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.04, duration: 0.2 }}
          className={[
            'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors',
            step.status === 'running'
              ? 'bg-brand-blue/10 border border-brand-blue/20'
              : 'bg-white/[0.02] border border-transparent',
          ].join(' ')}
        >
          <span className={[
            'w-6 h-6 rounded-full text-[11px] flex items-center justify-center shrink-0 font-mono font-bold',
            step.status === 'done'    ? 'bg-emerald-500/20 text-emerald-400'      : '',
            step.status === 'running' ? 'bg-brand-blue/20 text-brand-blue-bright' : '',
            step.status === 'error'   ? 'bg-red-500/20 text-red-400'              : '',
            step.status === 'pending' ? 'bg-white/[0.05] text-slate-600'          : '',
          ].join(' ')}>
            {step.status === 'done'    && '✓'}
            {step.status === 'running' && <span className="animate-pulse">▶</span>}
            {step.status === 'error'   && '✕'}
            {step.status === 'pending' && String(i + 1)}
          </span>
          <span className={[
            'text-xs flex-1',
            step.status === 'done'    ? 'text-slate-400'         : '',
            step.status === 'running' ? 'text-white font-medium' : '',
            step.status === 'error'   ? 'text-red-400'           : '',
            step.status === 'pending' ? 'text-slate-600'         : '',
          ].join(' ')}>
            {step.name}
          </span>
          {step.durationMs && step.status === 'done' && (
            <span className="text-[10px] text-slate-600 font-mono shrink-0">
              {formatDuration(step.durationMs)}
            </span>
          )}
          {step.status === 'running' && (
            <span className="text-[10px] text-brand-blue-bright font-mono shrink-0 animate-pulse">
              running…
            </span>
          )}
        </motion.div>
      ))}
    </div>
  )
}

/* ======================================================================
   Progress bar
   ====================================================================== */

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="relative h-2 rounded-full bg-white/[0.06] overflow-hidden">
      <motion.div
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-brand-blue to-brand-cyan"
      />
    </div>
  )
}

/* ======================================================================
   Execution log
   ====================================================================== */

function ExecLog({ logs }: { logs: { ts: string; level: string; message: string }[] }) {
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [logs.length])

  const levelColor: Record<string, string> = {
    info: 'text-slate-400', success: 'text-emerald-400', warn: 'text-amber-400', error: 'text-red-400',
  }
  const levelPrefix: Record<string, string> = {
    info: 'INFO ', success: 'OK   ', warn: 'WARN ', error: 'ERR  ',
  }

  return (
    <div
      ref={logRef}
      className="h-48 overflow-y-auto rounded-lg bg-black/40 border border-white/[0.06] p-3 font-mono text-[11px] space-y-1 scroll-smooth"
    >
      {logs.length === 0 && <p className="text-slate-700">— awaiting run —</p>}
      {logs.map((entry, i) => {
        const time = new Date(entry.ts).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        return (
          <motion.div key={i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }} className="flex gap-2">
            <span className="text-slate-700 shrink-0">{time}</span>
            <span className={`shrink-0 ${levelColor[entry.level] ?? 'text-slate-400'}`}>{levelPrefix[entry.level] ?? 'INFO '}</span>
            <span className={levelColor[entry.level] ?? 'text-slate-400'}>{entry.message}</span>
          </motion.div>
        )
      })}
    </div>
  )
}

/* ======================================================================
   Output preview
   ====================================================================== */

function OutputPreview({ output }: { output: string }) {
  const [copied, setCopied] = useState(false)
  function handleCopy() {
    navigator.clipboard.writeText(output).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-emerald-500/10">
        <div className="flex items-center gap-2">
          <span className="text-emerald-400 text-sm">✅</span>
          <p className="text-xs font-semibold text-emerald-300 uppercase tracking-widest">Output Preview</p>
        </div>
        <button
          onClick={handleCopy}
          className="text-[11px] font-mono px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div className="p-4 max-h-80 overflow-y-auto">
        <pre className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed font-mono">{output}</pre>
      </div>
    </motion.div>
  )
}

/* ======================================================================
   Input form
   ====================================================================== */

function InputForm({
  fields, values, onChange, disabled,
}: {
  fields:   WorkflowInputField[]
  values:   Record<string, string>
  onChange: (id: string, value: string) => void
  disabled: boolean
}) {
  return (
    <div className="space-y-3">
      {fields.map(field => (
        <div key={field.id}>
          <label className="block text-[11px] text-slate-500 mb-1">
            {field.label}
            {field.required && <span className="text-red-400 ml-0.5">*</span>}
          </label>
          {field.type === 'textarea' ? (
            <textarea
              value={values[field.id] ?? ''}
              onChange={e => onChange(field.id, e.target.value)}
              disabled={disabled}
              placeholder={field.placeholder}
              rows={3}
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-slate-300 placeholder:text-slate-600 focus:border-brand-cyan/40 focus:outline-none focus:ring-1 focus:ring-brand-cyan/20 resize-none disabled:opacity-40"
            />
          ) : field.type === 'select' && field.options && field.options.length > 0 ? (
            <select
              value={values[field.id] ?? ''}
              onChange={e => onChange(field.id, e.target.value)}
              disabled={disabled}
              className="w-full rounded-lg border border-white/[0.08] bg-[#0d1117] px-3 py-2 text-sm text-slate-300 focus:border-brand-cyan/40 focus:outline-none focus:ring-1 focus:ring-brand-cyan/20 disabled:opacity-40"
            >
              <option value="">選択してください</option>
              {field.options.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={values[field.id] ?? ''}
              onChange={e => onChange(field.id, e.target.value)}
              disabled={disabled}
              placeholder={field.placeholder}
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-slate-300 placeholder:text-slate-600 focus:border-brand-cyan/40 focus:outline-none focus:ring-1 focus:ring-brand-cyan/20 disabled:opacity-40"
            />
          )}
        </div>
      ))}
    </div>
  )
}

/* ======================================================================
   Control buttons
   ====================================================================== */

function ControlButtons({
  status, onRun, onPause, onResume, onStop, onReset, canRun,
}: {
  status:   string
  onRun:    () => void
  onPause:  () => void
  onResume: () => void
  onStop:   () => void
  onReset:  () => void
  canRun:   boolean
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {status === 'idle' && (
        <button
          onClick={onRun}
          disabled={!canRun}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-blue text-white text-sm font-semibold hover:bg-brand-blue/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span>▶</span> Run
        </button>
      )}
      {status === 'running' && (
        <button
          onClick={onPause}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 text-sm font-semibold hover:bg-amber-500/30 transition-colors"
        >
          <span>⏸</span> Pause
        </button>
      )}
      {status === 'paused' && (
        <button
          onClick={onResume}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-blue text-white text-sm font-semibold hover:bg-brand-blue/80 transition-colors"
        >
          <span>▶</span> Resume
        </button>
      )}
      {(status === 'running' || status === 'paused') && (
        <button
          onClick={onStop}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 text-sm font-semibold hover:bg-red-500/30 transition-colors"
        >
          <span>■</span> Stop
        </button>
      )}
      {(status === 'completed' || status === 'failed') && (
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/[0.06] text-slate-400 border border-white/[0.08] text-sm font-semibold hover:bg-white/[0.10] transition-colors"
        >
          ↺ New Run
        </button>
      )}
    </div>
  )
}

/* ======================================================================
   Stats strip
   ====================================================================== */

function StatStrip({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
      <p className="text-[10px] text-slate-600 mb-1">{label}</p>
      <p className={`text-sm font-mono font-semibold ${accent ? 'text-brand-cyan' : 'text-slate-200'}`}>{value}</p>
    </div>
  )
}

/* ======================================================================
   Page
   ====================================================================== */

export default function WorkflowRunPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  // Page-level data — all fetched via api runtime
  const [workflow,    setWorkflow]    = useState<Workflow | null>(null)
  const [factory,     setFactory]     = useState<FactoryRuntime | null>(null)
  const [inputFields, setInputFields] = useState<WorkflowInputField[]>([])
  const [inputs,      setInputs]      = useState<Record<string, string>>({})
  const [isLoading,   setIsLoading]   = useState(true)
  const [loadError,   setLoadError]   = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let alive = true

    const tid = setTimeout(() => {
      setIsLoading(true)
      setLoadError(null)

      void Promise.all([
        api.getWorkflows(),
        api.getFactories(),
        api.getWorkflowSchema(id),
      ]).then(([wfRes, factoriesRes, schemaRes]) => {
        if (!alive) return

        const wf = wfRes.ok ? wfRes.data.find(w => w.id === id) : null
        if (!wf) {
          setLoadError(wfRes.ok ? `Workflow "${id}" が見つかりません` : wfRes.error)
          setIsLoading(false)
          return
        }

        const fac = factoriesRes.ok ? factoriesRes.data.find(f => f.id === wf.factoryId) ?? null : null
        const fields = schemaRes.ok ? schemaRes.data : []
        const defaults: Record<string, string> = {}
        fields.forEach(f => { defaults[f.id] = '' })

        setWorkflow(wf)
        setFactory(fac)
        setInputFields(fields)
        setInputs(defaults)
        setIsLoading(false)
      }).catch(e => {
        if (!alive) return
        setLoadError(e instanceof Error ? e.message : String(e))
        setIsLoading(false)
      })
    }, 0)

    return () => { alive = false; clearTimeout(tid) }
  }, [id])

  const { state, run, pause, resume, stop, reset } = useWorkflowEngine(id ?? '')

  // Live clock — updated by effect, avoids calling Date.now() in render
  const [liveMs, setLiveMs] = useState(0)
  useEffect(() => {
    if (state.status !== 'running') return
    const tick = () => setLiveMs(Date.now())
    tick()
    const timerId = setInterval(tick, 1000)
    return () => clearInterval(timerId)
  }, [state.status])

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4 max-w-5xl">
        <div className="fixed top-14 left-16 lg:left-56 right-0 h-[2px] z-50 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-brand-blue to-brand-cyan"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
          />
        </div>
        <div className="h-12 w-64 rounded-xl border border-white/[0.05] bg-white/[0.01] animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-48 rounded-xl border border-white/[0.05] bg-white/[0.01] animate-pulse" />
            <div className="h-24 rounded-xl border border-white/[0.05] bg-white/[0.01] animate-pulse" />
          </div>
          <div className="lg:col-span-3 space-y-4">
            <div className="h-24 rounded-xl border border-white/[0.05] bg-white/[0.01] animate-pulse" />
            <div className="h-64 rounded-xl border border-white/[0.05] bg-white/[0.01] animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  // Error / not-found state
  if (loadError || !workflow) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-slate-500 text-sm">{loadError ?? `Workflow "${id}" が見つかりません`}</p>
        <Link href="/os/workflows" className="text-xs text-brand-cyan hover:underline">
          ← Workflows 一覧へ
        </Link>
      </div>
    )
  }

  function handleRun() {
    void run(inputs)    // run() is async — api.startRun() is called inside
  }

  function handleChange(fieldId: string, value: string) {
    setInputs(prev => ({ ...prev, [fieldId]: value }))
  }

  const isActive  = state.status === 'running' || state.status === 'paused'
  const canRun    = inputFields.filter(f => f.required).every(f => (inputs[f.id] ?? '').trim() !== '')
  const doneCount = state.steps.filter(s => s.status === 'done').length
  const elapsed   = state.startedAt
    ? Math.max(0, (state.endedAt ? new Date(state.endedAt).getTime() : liveMs) - new Date(state.startedAt).getTime())
    : 0

  return (
    <div className="max-w-5xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-3 justify-between">
        <div>
          <Link
            href="/os/workflows"
            className="inline-flex items-center gap-1 text-[11px] text-slate-600 hover:text-slate-400 transition-colors mb-2"
          >
            ← Workflows
          </Link>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold font-heading text-white">{workflow.nameJa}</h1>
            <StatusBadge status={state.status} dot={isActive} />
          </div>
          <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-600 font-mono">
            {factory && (
              <span style={{ color: factory.accentColor }}>
                {factory.icon} {factory.nameJa}
              </span>
            )}
            <span>·</span>
            <span>{workflow.stepCount} steps</span>
            <span>·</span>
            <span>{workflow.totalRuns} runs · {workflow.successRate}% ok</span>
          </div>
        </div>
        <button
          onClick={() => router.push('/os/workflows')}
          className="text-[11px] text-slate-600 hover:text-slate-400 transition-colors shrink-0"
        >
          ✕
        </button>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Left: Input + Controls + Stats */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5 space-y-4">
            <p className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold">入力パラメータ</p>
            {inputFields.length === 0 ? (
              <p className="text-xs text-slate-600">入力パラメータなし</p>
            ) : (
              <InputForm
                fields={inputFields}
                values={inputs}
                onChange={handleChange}
                disabled={isActive || state.status === 'completed'}
              />
            )}
          </div>

          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5 space-y-4">
            <p className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold">実行コントロール</p>
            <ControlButtons
              status={state.status}
              onRun={handleRun}
              onPause={() => void pause()}
              onResume={() => void resume()}
              onStop={() => void stop()}
              onReset={reset}
              canRun={canRun}
            />
            {state.status === 'idle' && !canRun && inputFields.some(f => f.required) && (
              <p className="text-[11px] text-amber-400/70">必須フィールドを入力してください</p>
            )}
          </div>

          {state.status !== 'idle' && (
            <div className="grid grid-cols-2 gap-2">
              <StatStrip label="Run ID"  value={state.runId ? state.runId.split('-').slice(1).join('-').slice(-8) : '—'} />
              <StatStrip label="Started" value={state.startedAt ? formatRelativeTime(state.startedAt) : '—'} />
              <StatStrip label="Elapsed" value={elapsed > 0 ? formatDuration(elapsed) : '—'} />
              <StatStrip label="Tokens"  value={state.tokensUsed > 0 ? `${state.tokensUsed.toLocaleString()}` : '—'} accent />
            </div>
          )}
        </div>

        {/* Right: Progress + Steps + Log */}
        <div className="lg:col-span-3 space-y-4">
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold">Progress</p>
              <span className="text-sm font-mono font-bold text-brand-cyan">{state.progress}%</span>
            </div>
            <ProgressBar value={state.progress} />
            <p className="text-[11px] text-slate-600 font-mono">
              {state.steps.length > 0
                ? `Step ${doneCount} / ${state.steps.length} complete`
                : `${workflow.stepCount} steps total`}
            </p>
          </div>

          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5 space-y-3">
            <p className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold">
              Steps
              {state.steps.length > 0 && (
                <span className="ml-2 text-slate-700 normal-case">({doneCount}/{state.steps.length})</span>
              )}
            </p>
            {state.steps.length === 0 ? (
              <div className="space-y-1.5">
                {Array.from({ length: workflow.stepCount }, (_, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2.5 bg-white/[0.02] border border-transparent">
                    <span className="w-6 h-6 rounded-full text-[11px] flex items-center justify-center bg-white/[0.05] text-slate-600 font-mono shrink-0">
                      {i + 1}
                    </span>
                    <div className="h-3 rounded bg-white/[0.04] flex-1" />
                  </div>
                ))}
              </div>
            ) : (
              <StepList steps={state.steps} />
            )}
          </div>

          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5 space-y-3">
            <p className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold">Execution Log</p>
            <ExecLog logs={state.logs} />
          </div>
        </div>
      </div>

      {/* Output preview */}
      <AnimatePresence>
        {state.status === 'completed' && state.output && (
          <OutputPreview output={state.output} />
        )}
      </AnimatePresence>

      {/* Stopped notice */}
      <AnimatePresence>
        {state.status === 'failed' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="rounded-xl border border-red-500/20 bg-red-500/5 p-4"
          >
            <p className="text-sm text-red-400 font-medium">■ Workflow was stopped.</p>
            <p className="text-xs text-slate-500 mt-1">
              Click &ldquo;New Run&rdquo; above to start a fresh run.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
