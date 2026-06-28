'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import { mockSettings, mockModels } from '@/lib/mock'
import type { OsSettings } from '@/types'

/* ========== Toggle ========== */

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

/* ========== Section wrapper ========== */

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

/* ========== Masked API key input ========== */

function ApiKeyInput({
  provider, value, onChange,
}: {
  provider: string
  value: string
  onChange: (v: string) => void
}) {
  const [show, setShow] = useState(false)
  const [localVal, setLocalVal] = useState(value)

  function handleSave() {
    onChange(localVal)
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type={show ? 'text' : 'password'}
        value={localVal}
        onChange={e => setLocalVal(e.target.value)}
        placeholder={`${provider} API key`}
        className="w-52 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-mono text-slate-300 placeholder:text-slate-600 focus:border-brand-cyan/40 focus:outline-none"
      />
      <button
        onClick={() => setShow(s => !s)}
        className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors px-2 py-1 rounded border border-white/[0.06]"
      >
        {show ? 'Hide' : 'Show'}
      </button>
      <button
        onClick={handleSave}
        className="text-[10px] font-semibold text-brand-cyan hover:text-brand-cyan-glow transition-colors px-2 py-1 rounded border border-brand-cyan/20"
      >
        Save
      </button>
    </div>
  )
}

/* ========== Page ========== */

export default function SettingsPage() {
  const [settings, setSettings] = useState<OsSettings>(mockSettings)
  const [saved, setSaved] = useState(false)

  function update<K extends keyof OsSettings>(key: K, value: OsSettings[K]) {
    setSettings(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  function updateApiKey(provider: keyof OsSettings['apiKeys'], value: string) {
    setSettings(prev => ({ ...prev, apiKeys: { ...prev.apiKeys, [provider]: value } }))
    setSaved(false)
  }

  function handleSaveAll() {
    // In production: POST /api/settings
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const providerInfo = {
    openai:    { label: 'OpenAI',    hint: 'sk-...', color: '#10B981' },
    anthropic: { label: 'Anthropic', hint: 'sk-ant-...', color: '#8B5CF6' },
    google:    { label: 'Google',    hint: 'AIza...', color: '#F59E0B' },
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold font-heading text-white">Settings</h1>
          <p className="text-xs text-slate-600 mt-0.5">API接続・モデル・動作設定</p>
        </div>
        <motion.button
          onClick={handleSaveAll}
          whileTap={{ scale: 0.96 }}
          className={[
            'text-sm font-semibold px-4 py-2 rounded-lg transition-colors',
            saved
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-brand-blue/20 text-brand-blue-bright border border-brand-blue/30 hover:bg-brand-blue/30',
          ].join(' ')}
        >
          {saved ? '✓ Saved' : 'Save All'}
        </motion.button>
      </div>

      {/* API Keys */}
      <SettingsSection title="API Keys">
        {(Object.keys(providerInfo) as (keyof typeof providerInfo)[]).map(provider => (
          <SettingsRow
            key={provider}
            label={providerInfo[provider].label}
            sub={`接続キー (${providerInfo[provider].hint})`}
          >
            <ApiKeyInput
              provider={providerInfo[provider].label}
              value={settings.apiKeys[provider]}
              onChange={v => updateApiKey(provider, v)}
            />
          </SettingsRow>
        ))}
      </SettingsSection>

      {/* Model */}
      <SettingsSection title="AI Model">
        <SettingsRow label="Default Model" sub="優先して使用するモデル">
          <select
            value={settings.defaultModel}
            onChange={e => update('defaultModel', e.target.value)}
            className="rounded-lg border border-white/[0.08] bg-[#0A1220] px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-brand-cyan/40"
          >
            {mockModels.map(m => (
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
            {mockModels.map(m => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.provider})
              </option>
            ))}
          </select>
        </SettingsRow>
        <SettingsRow label="Max Concurrent Runs" sub="同時実行できるWorkflow数">
          <div className="flex items-center gap-2">
            <button
              onClick={() => update('maxConcurrentRuns', Math.max(1, settings.maxConcurrentRuns - 1))}
              className="w-7 h-7 rounded-lg border border-white/[0.08] bg-white/[0.04] text-slate-400 hover:text-white transition-colors"
            >
              −
            </button>
            <span className="w-6 text-center text-sm font-mono text-white">{settings.maxConcurrentRuns}</span>
            <button
              onClick={() => update('maxConcurrentRuns', Math.min(10, settings.maxConcurrentRuns + 1))}
              className="w-7 h-7 rounded-lg border border-white/[0.08] bg-white/[0.04] text-slate-400 hover:text-white transition-colors"
            >
              ＋
            </button>
          </div>
        </SettingsRow>
      </SettingsSection>

      {/* Memory */}
      <SettingsSection title="Memory">
        <SettingsRow label="Retention Period" sub="メモリの保持日数">
          <div className="flex items-center gap-2">
            <button
              onClick={() => update('memoryRetentionDays', Math.max(7, settings.memoryRetentionDays - 30))}
              className="w-7 h-7 rounded-lg border border-white/[0.08] bg-white/[0.04] text-slate-400 hover:text-white transition-colors"
            >
              −
            </button>
            <span className="w-12 text-center text-sm font-mono text-white">{settings.memoryRetentionDays}d</span>
            <button
              onClick={() => update('memoryRetentionDays', Math.min(365, settings.memoryRetentionDays + 30))}
              className="w-7 h-7 rounded-lg border border-white/[0.08] bg-white/[0.04] text-slate-400 hover:text-white transition-colors"
            >
              ＋
            </button>
          </div>
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

      {/* Model info table */}
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
              {mockModels.map(m => (
                <tr key={m.id} className={settings.defaultModel === m.id ? 'text-brand-cyan-glow' : 'text-slate-400'}>
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
