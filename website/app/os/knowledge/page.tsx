'use client'

import { useState, useEffect, useCallback } from 'react'
import { authHeaders } from '@/lib/auth'

const BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000').replace(/\/$/, '')

/* ─── Types ─────────────────────────────────────────────────────────── */

interface KnowledgeSection {
  section: string
  filename: string
  content: string
  last_modified: string | null
  word_count: number
  available: boolean
}

interface OutdatedWarning {
  section: string
  reason: string
  age_days?: number
  last_modified?: string
}

interface Conflict {
  type: string
  item: string
  detail: string
}

interface AllKnowledge {
  sections: Record<string, KnowledgeSection>
  total_sections: number
  memory_dir: string
  loaded_at: string
  outdated_warnings: OutdatedWarning[]
  conflicts: Conflict[]
}

/* ─── Tab config ─────────────────────────────────────────────────────── */

const TABS = [
  { key: 'overview',     label: 'プロジェクト概要' },
  { key: 'architecture', label: 'アーキテクチャ' },
  { key: 'rules',        label: '開発ルール' },
  { key: 'business',     label: 'ビジネス' },
  { key: 'changelog',    label: '変更履歴' },
  { key: 'lessons',      label: 'レッスン' },
  { key: 'roadmap',      label: 'ロードマップ' },
] as const

type TabKey = typeof TABS[number]['key']

/* ─── Helpers ─────────────────────────────────────────────────────────── */

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('ja-JP', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

function SectionKey(key: TabKey): string {
  const map: Record<TabKey, string> = {
    overview:     'project',
    architecture: 'architecture',
    rules:        'rules',
    business:     'business',
    changelog:    'changelog',
    lessons:      'lessons',
    roadmap:      'roadmap',
  }
  return map[key]
}

/* ─── Markdown-lite renderer ─────────────────────────────────────────── */

function MarkdownContent({ text }: { text: string }) {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('# ')) {
      elements.push(
        <h1 key={i} className="text-xl font-bold text-white mt-6 mb-3 border-b border-white/10 pb-2">
          {line.slice(2)}
        </h1>
      )
    } else if (line.startsWith('## ')) {
      elements.push(
        <h2 key={i} className="text-base font-semibold text-cyan-400 mt-5 mb-2">
          {line.slice(3)}
        </h2>
      )
    } else if (line.startsWith('### ')) {
      elements.push(
        <h3 key={i} className="text-sm font-semibold text-slate-300 mt-4 mb-1">
          {line.slice(4)}
        </h3>
      )
    } else if (line.startsWith('```')) {
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      elements.push(
        <pre key={i} className="bg-black/40 border border-white/10 rounded-lg p-3 text-xs text-slate-300 overflow-x-auto my-3 font-mono">
          {codeLines.join('\n')}
        </pre>
      )
    } else if (line.startsWith('| ')) {
      const tableLines: string[] = [line]
      i++
      while (i < lines.length && lines[i].startsWith('|')) {
        tableLines.push(lines[i])
        i++
      }
      const rows = tableLines.filter(r => !r.match(/^\|[-: |]+\|$/))
      elements.push(
        <div key={i} className="overflow-x-auto my-3">
          <table className="w-full text-xs text-slate-300 border-collapse">
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className={ri === 0 ? 'text-slate-400 font-semibold border-b border-white/10' : 'border-b border-white/5'}>
                  {row.split('|').filter((_, ci) => ci > 0 && ci < row.split('|').length - 1).map((cell, ci) => (
                    <td key={ci} className="px-3 py-1.5 align-top">{cell.trim()}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
      continue
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <li key={i} className="text-sm text-slate-300 ml-4 list-disc my-0.5">
          {line.slice(2)}
        </li>
      )
    } else if (line.match(/^\d+\. /)) {
      elements.push(
        <li key={i} className="text-sm text-slate-300 ml-4 list-decimal my-0.5">
          {line.replace(/^\d+\. /, '')}
        </li>
      )
    } else if (line.startsWith('---')) {
      elements.push(<hr key={i} className="border-white/10 my-4" />)
    } else if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />)
    } else {
      const bold = line.replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
      const code = bold.replace(/`(.+?)`/g, '<code class="bg-white/10 px-1 rounded text-cyan-300 font-mono text-xs">$1</code>')
      elements.push(
        <p
          key={i}
          className="text-sm text-slate-300 my-1"
          dangerouslySetInnerHTML={{ __html: code }}
        />
      )
    }

    i++
  }

  return <div className="space-y-0.5">{elements}</div>
}

/* ─── Lesson append form ─────────────────────────────────────────────── */

function AppendLessonForm({ onSuccess }: { onSuccess: () => void }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  async function submit() {
    if (!text.trim()) return
    setLoading(true)
    setMsg('')
    try {
      const res = await fetch(`${BASE}/api/knowledge/lessons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ lesson: text }),
      })
      if (res.ok) {
        setMsg('レッスンを追記しました')
        setText('')
        onSuccess()
      } else {
        const err = await res.json().catch(() => ({ detail: 'Error' }))
        setMsg(`エラー: ${err.detail}`)
      }
    } catch (e) {
      setMsg(`エラー: ${e}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-6 bg-white/[0.03] border border-white/10 rounded-xl p-4">
      <p className="text-xs font-semibold text-slate-400 mb-2">新しいレッスンを追記</p>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="バグ・原因・修正・防止策を記述..."
        rows={4}
        className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-300 resize-y focus:outline-none focus:border-cyan-500/50"
      />
      <div className="flex items-center gap-3 mt-2">
        <button
          onClick={submit}
          disabled={loading || !text.trim()}
          className="px-4 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 text-xs font-semibold rounded-lg disabled:opacity-40 transition-colors"
        >
          {loading ? '追記中...' : '追記する'}
        </button>
        {msg && <span className="text-xs text-slate-400">{msg}</span>}
      </div>
    </div>
  )
}

/* ─── Changelog append form ──────────────────────────────────────────── */

function AppendChangelogForm({ onSuccess }: { onSuccess: () => void }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  async function submit() {
    if (!text.trim()) return
    setLoading(true)
    setMsg('')
    try {
      const res = await fetch(`${BASE}/api/knowledge/changelog/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ summary: text }),
      })
      if (res.ok) {
        setMsg('変更履歴に追記しました')
        setText('')
        onSuccess()
      } else {
        const err = await res.json().catch(() => ({ detail: 'Error' }))
        setMsg(`エラー: ${err.detail}`)
      }
    } catch (e) {
      setMsg(`エラー: ${e}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-6 bg-white/[0.03] border border-white/10 rounded-xl p-4">
      <p className="text-xs font-semibold text-slate-400 mb-2">変更履歴に追記</p>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="完了した実装・意思決定・残課題を記述..."
        rows={4}
        className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-300 resize-y focus:outline-none focus:border-cyan-500/50"
      />
      <div className="flex items-center gap-3 mt-2">
        <button
          onClick={submit}
          disabled={loading || !text.trim()}
          className="px-4 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 text-xs font-semibold rounded-lg disabled:opacity-40 transition-colors"
        >
          {loading ? '追記中...' : '追記する'}
        </button>
        {msg && <span className="text-xs text-slate-400">{msg}</span>}
      </div>
    </div>
  )
}

/* ─── Main Page ───────────────────────────────────────────────────────── */

export default function KnowledgePage() {
  const [activeTab, setActiveTab]   = useState<TabKey>('overview')
  const [data, setData]             = useState<AllKnowledge | null>(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${BASE}/api/knowledge`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json() as AllKnowledge
      setData(json)
    } catch (e) {
      setError(`ロード失敗: ${e}`)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const sectionKey = SectionKey(activeTab)
  const section = data?.sections[sectionKey]

  return (
    <div className="flex flex-col h-full bg-[#080F1E] text-white">

      {/* Header */}
      <div className="shrink-0 px-6 pt-6 pb-4 border-b border-white/[0.06]">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-bold text-white font-heading">Knowledge Base</h1>
            <p className="text-xs text-slate-500 mt-0.5">AIOS の歴史・構造・ルール・ビジョンを管理する知識ベース</p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 text-slate-400 rounded-lg transition-colors disabled:opacity-40"
          >
            {loading ? '読込中...' : '更新'}
          </button>
        </div>

        {/* Warnings */}
        {data && data.outdated_warnings.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {data.outdated_warnings.map((w, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/20 rounded text-xs text-yellow-400">
                ⚠ {w.section} — {w.reason === 'stale' ? `${w.age_days}日更新なし` : '未作成'}
              </span>
            ))}
          </div>
        )}
        {data && data.conflicts.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {data.conflicts.map((c, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
                ⚡ 矛盾: {c.item}
              </span>
            ))}
          </div>
        )}

        {/* Stats */}
        {data && (
          <div className="mt-3 flex gap-4 text-xs text-slate-500">
            <span>セクション: <span className="text-slate-300">{data.total_sections}</span></span>
            <span>更新: <span className="text-slate-300">{fmtDate(data.loaded_at)}</span></span>
            <span>警告: <span className={data.outdated_warnings.length > 0 ? 'text-yellow-400' : 'text-slate-300'}>{data.outdated_warnings.length}</span></span>
            <span>矛盾: <span className={data.conflicts.length > 0 ? 'text-red-400' : 'text-slate-300'}>{data.conflicts.length}</span></span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="shrink-0 flex gap-1 px-6 pt-3 pb-0 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={[
              'shrink-0 px-3 py-1.5 text-xs font-medium rounded-t-lg border-b-2 transition-colors',
              activeTab === tab.key
                ? 'text-cyan-400 border-cyan-400 bg-white/[0.04]'
                : 'text-slate-500 border-transparent hover:text-slate-300',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {loading && !data && (
          <div className="flex items-center justify-center h-40 text-slate-500 text-sm">
            読み込み中...
          </div>
        )}

        {section && (
          <div>
            {/* Section meta */}
            <div className="flex items-center gap-4 mb-4 text-xs text-slate-500">
              <span className="font-mono text-slate-400">{section.filename}</span>
              <span>最終更新: {fmtDate(section.last_modified)}</span>
              <span>{section.word_count.toLocaleString()} ワード</span>
              {!section.available && (
                <span className="text-yellow-400">⚠ ファイル未作成</span>
              )}
            </div>

            {section.available && section.content ? (
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
                <MarkdownContent text={section.content} />
              </div>
            ) : (
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-8 text-center text-slate-500 text-sm">
                このセクションはまだ作成されていません。
              </div>
            )}

            {/* Append forms */}
            {activeTab === 'lessons' && (
              <AppendLessonForm onSuccess={load} />
            )}
            {activeTab === 'changelog' && (
              <AppendChangelogForm onSuccess={load} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
