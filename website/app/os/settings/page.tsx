'use client'

import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { api } from '@/lib/api/runtime'
import type { OsSettings, ModelOption } from '@/types'

/* ======================================================================
   Toggle
   ====================================================================== */

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={[
        'relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none',
        checked ? 'bg-brand-cyan' : 'bg-white/[0.10]',
      ].join(' ')}
    >
      <motion.span
        layout
        animate={{ x: checked ? 16 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 28 }}
        className="inline-block h-4 w-4 rounded-full bg-white shadow"
      />
    </button>
  )
}

/* ======================================================================
   Section / Row wrappers
   ====================================================================== */

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
      <div className="px-5 py-3 border-b border-white/[0.06]">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{title}</p>
      </div>
      <div className="divide-y divide-white/[0.05]">{children}</div>
    </div>
  )
}

function SettingsRow({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div>
        <p className="text-sm text-slate-300">{label}</p>
        {sub && <p className="text-xs text-slate-600 mt-0.5">{sub}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

/* ======================================================================
   Masked API key input
   ====================================================================== */

function ApiKeyInput({
  provider, value, onChange,
}: {
  provider: string
  value:    string
  onChange: (v: string) => void
}) {
  const [show,     setShow]     = useState(false)
  const [localVal, setLocalVal] = useState(value)

  return (
    <div className="flex items-center gap-2">
      <input
        type={show ? 'text' : 'password'}
        value={localVal}
        onChange={e => setLocalVal(e.target.value)}
        onBlur={() => onChange(localVal)}
        placeholder={`${provider} API key`}
        className="w-52 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-mono text-slate-300 placeholder:text-slate-600 focus:border-brand-cyan/40 focus:outline-none"
      />
      <button
        onClick={() => setShow(s => !s)}
        className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors px-2 py-1 rounded border border-white/[0.06]"
      >
        {show ? 'Hide' : 'Show'}
      </button>
    </div>
  )
}

/* ======================================================================
   Stepper
   ====================================================================== */

function Stepper({
  value, min, max, step = 1, unit = '', onChange,
}: {
  value:    number
  min:      number
  max:      number
  step?:    number
  unit?:    string
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(Math.max(min, value - step))}
        className="w-7 h-7 rounded-lg border border-white/[0.08] bg-white/[0.04] text-slate-400 hover:text-white transition-colors"
      >
        −
      </button>
      <span className="w-12 text-center text-sm font-mono text-white">{value}{unit}</span>
      <button
        onClick={() => onChange(Math.min(max, value + step))}
        className="w-7 h-7 rounded-lg border border-white/[0.08] bg-white/[0.04] text-slate-400 hover:text-white transition-colors"
      >
        ＋
      </button>
    </div>
  )
}

/* ======================================================================
   Loading skeleton
   ====================================================================== */

function SettingsSkeleton() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="fixed top-14 left-16 lg:left-56 right-0 h-[2px] z-50 overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-brand-blue to-brand-cyan"
          animate={{ x: ['-100%', '100%'] }}
          transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
        />
      </div>
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="h-24 rounded-xl border border-white/[0.05] bg-white/[0.01] animate-pulse" />
      ))}
    </div>
  )
}

/* ======================================================================
   Page
   ====================================================================== */

const PROVIDER_INFO = {
  openai:    { label: 'OpenAI',    hint: 'sk-...',     color: '#10B981' },
  anthropic: { label: 'Anthropic', hint: 'sk-ant-...', color: '#8B5CF6' },
  google:    { label: 'Google',    hint: 'AIza...',    color: '#F59E0B' },
} as const

export default function SettingsPage() {
  const [settings,  setSettings]  = useState<OsSettings | null>(null)
  const [models,    setModels]    = useState<ModelOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isSaving,  setIsSaving]  = useState(false)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  // Initial load via api runtime
  useEffect(() => {
    const tid = setTimeout(() => {
      setIsLoading(true)
      void Promise.all([
        api.getSettings(),
        api.getModels(),
      ]).then(([settingsRes, modelsRes]) => {
        if (settingsRes.ok) setSettings(settingsRes.data)
        else                setLoadError(settingsRes.error)
        if (modelsRes.ok)   setModels(modelsRes.data)
        setIsLoading(false)
      }).catch(e => {
        setLoadError(e instanceof Error ? e.message : String(e))
        setIsLoading(false)
      })
    }, 0)
    return () => clearTimeout(tid)
  }, [])

  if (isLoading) return <SettingsSkeleton />

  if (loadError || !settings) {
    return (
      <div className="max-w-2xl rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-6 text-sm text-red-400 font-mono">
        {loadError ?? '設定を読み込めませんでした'}
      </div>
    )
  }

  function update<K extends keyof OsSettings>(key: K, value: OsSettings[K]) {
    setSettings(prev => prev ? { ...prev, [key]: value } : prev)
    setSaveState('idle')
  }

  function updateApiKey(provider: keyof OsSettings['apiKeys'], value: string) {
    setSettings(prev => prev ? { ...prev, apiKeys: { ...prev.apiKeys, [provider]: value } } : prev)
    setSaveState('idle')
  }

  async function handleSaveAll() {
    if (!settings || isSaving) return
    setIsSaving(true)
    setSaveState('saving')
    const res = await api.patchSettings(settings)
    setIsSaving(false)
    if (res.ok) {
      setSettings(res.data)
      setSaveState('saved')
      setTimeout(() => setSaveState('idle'), 2500)
    } else {
      setSaveState('error')
      setTimeout(() => setSaveState('idle'), 3000)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold font-heading text-white">Settings</h1>
          <p className="text-xs text-slate-600 mt-0.5">API接続・モデル・動作設定</p>
        </div>
        <motion.button
          onClick={() => void handleSaveAll()}
          disabled={isSaving}
          whileTap={{ scale: 0.96 }}
          className={[
            'text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:cursor-wait',
            saveState === 'saved'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : saveState === 'error'
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : saveState === 'saving'
                  ? 'bg-white/[0.05] text-slate-500 border border-white/[0.08]'
                  : 'bg-brand-blue/20 text-brand-blue-bright border border-brand-blue/30 hover:bg-brand-blue/30',
          ].join(' ')}
        >
          {saveState === 'saved'  && '✓ Saved'}
          {saveState === 'error'  && '✕ Error'}
          {saveState === 'saving' && 'Saving…'}
          {saveState === 'idle'   && 'Save All'}
        </motion.button>
      </div>

      {/* Save error notice */}
      {saveState === 'error' && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-xs text-red-400 font-mono">
          保存に失敗しました。再度お試しください。
        </div>
      )}

      {/* API Keys */}
      <SettingsSection title="API Keys">
        {(Object.keys(PROVIDER_INFO) as (keyof typeof PROVIDER_INFO)[]).map(provider => (
          <SettingsRow
            key={provider}
            label={PROVIDER_INFO[provider].label}
            sub={`接続キー (${PROVIDER_INFO[provider].hint})`}
          >
            <ApiKeyInput
              provider={PROVIDER_INFO[provider].label}
              value={settings.apiKeys[provider]}
              onChange={v => updateApiKey(provider, v)}
            />
          </SettingsRow>
        ))}
      </SettingsSection>

      {/* AI Model */}
      <SettingsSection title="AI Model">
        <SettingsRow label="Default Model" sub="優先して使用するモデル">
          <select
            value={settings.defaultModel}
            onChange={e => update('defaultModel', e.target.value)}
            className="rounded-lg border border-white/[0.08] bg-[#0A1220] px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-brand-cyan/40"
          >
            {models.map(m => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.provider})
              </option>
            ))}
          </select>
        </SettingsRow>
        <SettingsRow label="Fallback Model" sub="エラー時に切り替えるモデル">
          <select
            value={settings.fallbackModel}
            onChange={e => update('fallbackModel', e.target.value)}
            className="rounded-lg border border-white/[0.08] bg-[#0A1220] px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-brand-cyan/40"
          >
            {models.map(m => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.provider})
              </option>
            ))}
          </select>
        </SettingsRow>
        <SettingsRow label="Max Concurrent Runs" sub="同時実行できるWorkflow数">
          <Stepper
            value={settings.maxConcurrentRuns}
            min={1} max={10}
            onChange={v => update('maxConcurrentRuns', v)}
          />
        </SettingsRow>
      </SettingsSection>

      {/* Memory */}
      <SettingsSection title="Memory">
        <SettingsRow label="Retention Period" sub="メモリの保持日数">
          <Stepper
            value={settings.memoryRetentionDays}
            min={7} max={365} step={30} unit="d"
            onChange={v => update('memoryRetentionDays', v)}
          />
        </SettingsRow>
      </SettingsSection>

      {/* Notifications */}
      <SettingsSection title="Notifications">
        <SettingsRow label="完了時に通知" sub="Workflow完了時にブラウザ通知">
          <Toggle checked={settings.notifyOnComplete} onChange={v => update('notifyOnComplete', v)} />
        </SettingsRow>
        <SettingsRow label="エラー時に通知" sub="エラー発生時にブラウザ通知">
          <Toggle checked={settings.notifyOnError} onChange={v => update('notifyOnError', v)} />
        </SettingsRow>
      </SettingsSection>

      {/* Display */}
      <SettingsSection title="Display">
        <SettingsRow label="Language" sub="インターフェース言語">
          <div className="flex gap-1.5">
            {(['ja', 'en'] as const).map(lang => (
              <button
                key={lang}
                onClick={() => update('language', lang)}
                className={[
                  'text-xs font-mono px-3 py-1.5 rounded-lg border transition-colors',
                  settings.language === lang
                    ? 'bg-brand-blue/20 text-brand-blue-bright border-brand-blue/30'
                    : 'bg-white/[0.03] text-slate-500 border-white/[0.06] hover:text-slate-300',
                ].join(' ')}
              >
                {lang === 'ja' ? '日本語' : 'English'}
              </button>
            ))}
          </div>
        </SettingsRow>
        <SettingsRow label="Theme" sub="OS インターフェースのテーマ">
          <div className="flex gap-1.5">
            {(['dark', 'light', 'system'] as const).map(t => (
              <button
                key={t}
                onClick={() => update('theme', t)}
                className={[
                  'text-xs font-mono px-3 py-1.5 rounded-lg border transition-colors capitalize',
                  settings.theme === t
                    ? 'bg-brand-blue/20 text-brand-blue-bright border-brand-blue/30'
                    : 'bg-white/[0.03] text-slate-500 border-white/[0.06] hover:text-slate-300',
                ].join(' ')}
              >
                {t}
              </button>
            ))}
          </div>
        </SettingsRow>
      </SettingsSection>

      {/* Available Models table */}
      <SettingsSection title="Available Models">
        <div className="px-5 py-4 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] text-slate-600 uppercase tracking-widest">
                <th className="text-left pb-2 font-medium">Model</th>
                <th className="text-left pb-2 font-medium">Provider</th>
                <th className="text-right pb-2 font-medium">Context</th>
                <th className="text-right pb-2 font-medium">Max Out</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {models.map(m => (
                <tr
                  key={m.id}
                  className={settings.defaultModel === m.id ? 'text-brand-cyan-glow' : 'text-slate-400'}
                >
                  <td className="py-2 font-mono">{m.name}</td>
                  <td className="py-2 capitalize">{m.provider}</td>
                  <td className="py-2 text-right font-mono">{(m.contextWindow / 1000).toFixed(0)}k</td>
                  <td className="py-2 text-right font-mono">{(m.maxTokens / 1000).toFixed(1)}k</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SettingsSection>
    </div>
  )
}
