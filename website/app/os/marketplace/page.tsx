'use client'

import { useState, useEffect, useCallback } from 'react'
import { authHeaders } from '@/lib/auth'

const BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000').replace(/\/$/, '')

interface MarketplaceItem {
  id: string
  title: string
  title_ja: string
  short_desc: string
  item_type: string
  seller_id: string
  status: string
  category: string
  tags: string[]
  total_sales: number
  avg_rating: number
  review_count: number
  creator_revenue_pct: number
  created_at: string
}

interface ListResponse {
  items: MarketplaceItem[]
  total: number
  skip: number
  limit: number
}

const TYPE_ICONS: Record<string, string> = {
  factory: '🏭', workflow: '▶️', agent: '🤖', template: '📋',
  prompt: '💬', knowledge_pack: '📦', plugin: '🔌', business_pack: '💼',
}

const TYPE_LABELS: Record<string, string> = {
  factory: 'Factory', workflow: 'Workflow', agent: 'Agent', template: 'Template',
  prompt: 'Prompt', knowledge_pack: 'Knowledge Pack', plugin: 'Plugin', business_pack: 'Business Pack',
}

const TYPES = ['', 'factory', 'workflow', 'agent', 'template', 'prompt', 'knowledge_pack', 'plugin', 'business_pack']

export default function MarketplacePage() {
  const [items, setItems]       = useState<MarketplaceItem[]>([])
  const [total, setTotal]       = useState(0)
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [typeFilter, setType]   = useState('')
  const [sortBy, setSort]       = useState('created_at')
  const [selected, setSelected] = useState<MarketplaceItem | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '24', sort_by: sortBy })
      if (typeFilter) params.set('item_type', typeFilter)
      if (search)     params.set('search', search)
      const res  = await fetch(`${BASE}/api/biz/marketplace?${params}`)
      const data: ListResponse = await res.json()
      setItems(data.items ?? [])
      setTotal(data.total ?? 0)
    } catch { setItems([]) }
    setLoading(false)
  }, [search, typeFilter, sortBy])

  useEffect(() => { load() }, [load])

  return (
    <div className="min-h-screen bg-[#060D1A] text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-heading">🛒 Marketplace</h1>
          <p className="text-slate-500 text-sm mt-0.5">{total}件の商品</p>
        </div>
        <button
          onClick={() => setSelected({ id: 'new' } as MarketplaceItem)}
          className="px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-sm font-medium hover:bg-cyan-500/30 transition-colors"
        >
          + 出品する
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="タイトル・説明で検索..."
          className="flex-1 min-w-48 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
        />
        <select
          value={typeFilter}
          onChange={e => setType(e.target.value)}
          className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-slate-300 focus:outline-none"
        >
          {TYPES.map(t => (
            <option key={t} value={t} className="bg-slate-900">
              {t ? (TYPE_ICONS[t] + ' ' + TYPE_LABELS[t]) : 'すべてのタイプ'}
            </option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={e => setSort(e.target.value)}
          className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-slate-300 focus:outline-none"
        >
          <option value="created_at" className="bg-slate-900">新着順</option>
          <option value="total_sales" className="bg-slate-900">人気順</option>
          <option value="avg_rating" className="bg-slate-900">評価順</option>
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64 text-slate-600">読み込み中...</div>
      ) : items.length === 0 ? (
        <EmptyState typeFilter={typeFilter} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map(item => (
            <ItemCard key={item.id} item={item} onClick={() => setSelected(item)} />
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selected && selected.id !== 'new' && (
        <DetailModal item={selected} onClose={() => setSelected(null)} />
      )}

      {/* Publish modal */}
      {selected?.id === 'new' && (
        <PublishModal onClose={() => { setSelected(null); load() }} />
      )}
    </div>
  )
}

/* ─── Item Card ─────────────────────────────────────────────────────────── */

function ItemCard({ item, onClick }: { item: MarketplaceItem; onClick: () => void }) {
  const icon  = TYPE_ICONS[item.item_type] ?? '📦'
  const label = TYPE_LABELS[item.item_type] ?? item.item_type
  return (
    <button
      onClick={onClick}
      className="text-left p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-cyan-500/20 transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-400">{label}</span>
      </div>
      <h3 className="font-semibold text-sm leading-tight mb-1 line-clamp-2">{item.title}</h3>
      <p className="text-xs text-slate-500 line-clamp-2 mb-3">{item.short_desc || item.title_ja}</p>
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>⭐ {item.avg_rating.toFixed(1)} ({item.review_count})</span>
        <span>{item.total_sales}件販売</span>
      </div>
      {item.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {item.tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-600">{tag}</span>
          ))}
        </div>
      )}
    </button>
  )
}

/* ─── Detail Modal ───────────────────────────────────────────────────────── */

function DetailModal({ item, onClose }: { item: MarketplaceItem; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-lg rounded-2xl bg-[#0D1830] border border-white/[0.08] p-6" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white text-xl">✕</button>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">{TYPE_ICONS[item.item_type] ?? '📦'}</span>
          <div>
            <h2 className="font-bold text-lg">{item.title}</h2>
            <p className="text-xs text-slate-500">{item.title_ja} · {TYPE_LABELS[item.item_type]}</p>
          </div>
        </div>
        <p className="text-slate-400 text-sm mb-4">{item.short_desc}</p>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Stat label="評価" value={`⭐ ${item.avg_rating.toFixed(1)}`} />
          <Stat label="販売数" value={`${item.total_sales}件`} />
          <Stat label="タイプ" value={TYPE_LABELS[item.item_type] ?? item.item_type} />
        </div>
        {item.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {item.tags.map(tag => (
              <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-white/[0.05] text-slate-400">{tag}</span>
            ))}
          </div>
        )}
        <p className="text-xs text-slate-600">カテゴリ: {item.category || '未分類'} · ID: {item.id.slice(0, 8)}</p>
      </div>
    </div>
  )
}

/* ─── Publish Modal ──────────────────────────────────────────────────────── */

function PublishModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    title: '', title_ja: '', short_desc: '', item_type: 'workflow', category: '', tags: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const submit = async () => {
    if (!form.title) { setError('タイトルは必須です'); return }
    setSaving(true)
    try {
      const res = await fetch(`${BASE}/api/biz/marketplace`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          ...form,
          tags: form.tags.split(',').map(s => s.trim()).filter(Boolean),
        }),
      })
      if (!res.ok) { setError('出品に失敗しました'); setSaving(false); return }
      onClose()
    } catch { setError('ネットワークエラー'); setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-md rounded-2xl bg-[#0D1830] border border-white/[0.08] p-6" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white text-xl">✕</button>
        <h2 className="font-bold text-lg mb-4">+ 出品する</h2>
        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
        <div className="space-y-3">
          <Field label="タイトル *" value={form.title} onChange={v => setForm(f => ({...f, title: v}))} />
          <Field label="タイトル（日本語）" value={form.title_ja} onChange={v => setForm(f => ({...f, title_ja: v}))} />
          <Field label="短い説明" value={form.short_desc} onChange={v => setForm(f => ({...f, short_desc: v}))} />
          <div>
            <label className="text-xs text-slate-400 mb-1 block">タイプ</label>
            <select
              value={form.item_type}
              onChange={e => setForm(f => ({...f, item_type: e.target.value}))}
              className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white focus:outline-none"
            >
              {TYPES.filter(Boolean).map(t => (
                <option key={t} value={t} className="bg-slate-900">{TYPE_ICONS[t]} {TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>
          <Field label="カテゴリ" value={form.category} onChange={v => setForm(f => ({...f, category: v}))} />
          <Field label="タグ（カンマ区切り）" value={form.tags} onChange={v => setForm(f => ({...f, tags: v}))} />
        </div>
        <div className="flex gap-2 mt-6">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-white/[0.08] text-sm text-slate-400 hover:text-white">キャンセル</button>
          <button
            onClick={submit} disabled={saving}
            className="flex-1 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-sm font-medium hover:bg-cyan-500/30 disabled:opacity-50"
          >
            {saving ? '処理中...' : '下書き保存'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-semibold mt-0.5">{value}</p>
    </div>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs text-slate-400 mb-1 block">{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white focus:outline-none focus:border-cyan-500/50"
      />
    </div>
  )
}

function EmptyState({ typeFilter }: { typeFilter: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <div className="text-4xl mb-3">🛒</div>
      <p className="text-slate-400 font-medium">商品がまだありません</p>
      <p className="text-slate-600 text-sm mt-1">
        {typeFilter ? `${TYPE_LABELS[typeFilter]}の商品はまだ出品されていません` : '最初の商品を出品してみましょう'}
      </p>
    </div>
  )
}
