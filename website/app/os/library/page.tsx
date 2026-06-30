'use client'

import { useState, useEffect } from 'react'
import { authHeaders } from '@/lib/auth'

const BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000').replace(/\/$/, '')

type TabKey = 'purchases' | 'favorites' | 'history'

interface Purchase {
  id: string; marketplace_item_id: string; price_plan_id: string
  amount_jpy: number; status: string; purchased_at: string; expires_at: string | null
}

interface Favorite {
  id: string; item_type: string; item_id: string; created_at: string
}

interface History {
  id: string; item_type: string; item_id: string; action: string; created_at: string
}

const TABS: { key: TabKey; label: string }[] = [
  { key: 'purchases', label: '購入済み' },
  { key: 'favorites', label: 'お気に入り' },
  { key: 'history',   label: '利用履歴' },
]

const ACTION_ICONS: Record<string, string> = {
  view: '👁️', download: '⬇️', run: '▶️', purchase: '💳',
  favorite: '♥', share: '🔗', install: '📥',
}

const TYPE_ICONS: Record<string, string> = {
  marketplace_item: '🛒', asset: '🎨', factory: '🏭', workflow: '▶️', agent: '🤖',
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('ja-JP', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

export default function LibraryPage() {
  const [tab, setTab]               = useState<TabKey>('purchases')
  const [purchases, setPurchases]   = useState<Purchase[]>([])
  const [favorites, setFavorites]   = useState<Favorite[]>([])
  const [history, setHistory]       = useState<History[]>([])
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    setLoading(true)
    const loads = [
      fetch(`${BASE}/api/biz/library/purchases`, { headers: authHeaders() })
        .then(r => r.json()).then(d => setPurchases(Array.isArray(d) ? d : [])).catch(() => {}),
      fetch(`${BASE}/api/biz/library/favorites`, { headers: authHeaders() })
        .then(r => r.json()).then(d => setFavorites(Array.isArray(d) ? d : [])).catch(() => {}),
      fetch(`${BASE}/api/biz/library/history?limit=50`, { headers: authHeaders() })
        .then(r => r.json()).then(d => setHistory(Array.isArray(d) ? d : [])).catch(() => {}),
    ]
    Promise.all(loads).finally(() => setLoading(false))
  }, [])

  const removeFav = async (itemType: string, itemId: string) => {
    await fetch(`${BASE}/api/biz/library/favorites/${itemType}/${itemId}`, {
      method: 'DELETE', headers: authHeaders(),
    })
    setFavorites(prev => prev.filter(f => !(f.item_type === itemType && f.item_id === itemId)))
  }

  return (
    <div className="min-h-screen bg-[#060D1A] text-white p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-heading">📚 My Library</h1>
        <p className="text-slate-500 text-sm mt-0.5">購入済み・お気に入り・利用履歴</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] w-fit">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={[
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              tab === t.key ? 'bg-white/[0.08] text-white' : 'text-slate-500 hover:text-slate-300',
            ].join(' ')}
          >
            {t.label}
            {t.key === 'purchases' && purchases.length > 0 && (
              <span className="ml-1.5 text-xs text-cyan-400">({purchases.length})</span>
            )}
            {t.key === 'favorites' && favorites.length > 0 && (
              <span className="ml-1.5 text-xs text-cyan-400">({favorites.length})</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32 text-slate-600">読み込み中...</div>
      ) : (
        <>
          {tab === 'purchases' && (
            <PurchasesTab purchases={purchases} />
          )}
          {tab === 'favorites' && (
            <FavoritesTab favorites={favorites} onRemove={removeFav} />
          )}
          {tab === 'history' && (
            <HistoryTab history={history} />
          )}
        </>
      )}
    </div>
  )
}

/* ─── Purchases ────────────────────────────────────────────────────────── */

function PurchasesTab({ purchases }: { purchases: Purchase[] }) {
  if (purchases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48">
        <span className="text-3xl mb-2">💳</span>
        <p className="text-slate-500">購入済みアイテムはありません</p>
        <a href="/os/marketplace" className="mt-3 text-sm text-cyan-400 hover:underline">Marketplaceを見る →</a>
      </div>
    )
  }
  return (
    <div className="space-y-3">
      {purchases.map(p => (
        <div key={p.id} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <div>
            <p className="text-sm font-medium">🛒 アイテム</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {p.amount_jpy === 0 ? '無料' : `¥${p.amount_jpy.toLocaleString()}`} · {fmtDate(p.purchased_at)}
            </p>
            {p.expires_at && (
              <p className="text-xs text-amber-400 mt-0.5">期限: {fmtDate(p.expires_at)}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={[
              'text-xs px-2 py-0.5 rounded-full',
              p.status === 'completed' ? 'bg-green-400/10 text-green-400' : 'bg-slate-700 text-slate-400',
            ].join(' ')}>
              {p.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ─── Favorites ────────────────────────────────────────────────────────── */

function FavoritesTab({ favorites, onRemove }: { favorites: Favorite[]; onRemove: (t: string, id: string) => void }) {
  if (favorites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48">
        <span className="text-3xl mb-2">♡</span>
        <p className="text-slate-500">お気に入りアイテムはありません</p>
      </div>
    )
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {favorites.map(f => (
        <div key={f.id} className="flex items-start justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <div className="flex items-center gap-2">
            <span className="text-xl">{TYPE_ICONS[f.item_type] ?? '📦'}</span>
            <div>
              <p className="text-xs text-slate-400 capitalize">{f.item_type.replace('_', ' ')}</p>
              <p className="text-xs text-slate-600 font-mono">{f.item_id.slice(0, 8)}</p>
            </div>
          </div>
          <button
            onClick={() => onRemove(f.item_type, f.item_id)}
            className="text-slate-600 hover:text-red-400 text-lg"
          >
            ♥
          </button>
        </div>
      ))}
    </div>
  )
}

/* ─── History ──────────────────────────────────────────────────────────── */

function HistoryTab({ history }: { history: History[] }) {
  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48">
        <span className="text-3xl mb-2">📋</span>
        <p className="text-slate-500">利用履歴はありません</p>
      </div>
    )
  }
  return (
    <div className="space-y-1">
      {history.map(h => (
        <div key={h.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/[0.02] transition-colors">
          <span className="text-lg w-7">{ACTION_ICONS[h.action] ?? '•'}</span>
          <div className="flex-1 min-w-0">
            <span className="text-xs text-slate-400 capitalize">{h.action}</span>
            <span className="text-xs text-slate-600 mx-1">·</span>
            <span className="text-xs text-slate-500">{TYPE_ICONS[h.item_type]} {h.item_type.replace('_', ' ')}</span>
            <span className="text-xs text-slate-700 ml-1 font-mono">{h.item_id.slice(0, 8)}</span>
          </div>
          <p className="text-xs text-slate-700 shrink-0">{fmtDate(h.created_at)}</p>
        </div>
      ))}
    </div>
  )
}
