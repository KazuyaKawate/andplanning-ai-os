'use client'

import { useState, useEffect } from 'react'
import { authHeaders } from '@/lib/auth'

const BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000').replace(/\/$/, '')

interface RevenueSummary {
  seller_id: string | null; total_revenue_jpy: number; seller_revenue_jpy: number
  platform_revenue_jpy: number; total_transactions: number; active_subscriptions: number
  mrr_jpy: number; period_days: number
}

interface Transaction {
  id: string; buyer_id: string; seller_id: string; marketplace_item_id: string
  amount_jpy: number; seller_revenue_jpy: number; platform_revenue_jpy: number
  transaction_type: string; payment_provider: string; created_at: string
}

interface RankingItem {
  item_id: string; title: string; item_type: string
  total_sales: number; avg_rating: number; revenue_jpy: number
}

function fmtJpy(n: number): string {
  return `¥${n.toLocaleString()}`
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('ja-JP', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

const TYPE_ICONS: Record<string, string> = {
  factory: '🏭', workflow: '▶️', agent: '🤖', template: '📋',
  prompt: '💬', knowledge_pack: '📦', plugin: '🔌', business_pack: '💼',
}

export default function RevenuePage() {
  const [summary, setSummary]       = useState<RevenueSummary | null>(null)
  const [txns, setTxns]             = useState<Transaction[]>([])
  const [ranking, setRanking]       = useState<RankingItem[]>([])
  const [loading, setLoading]       = useState(true)
  const [period, setPeriod]         = useState(30)
  const [activeTab, setTab]         = useState<'overview' | 'transactions' | 'ranking'>('overview')

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`${BASE}/api/biz/revenue/summary?days=${period}`, { headers: authHeaders() })
        .then(r => r.json()).then(d => setSummary(d)).catch(() => {}),
      fetch(`${BASE}/api/biz/revenue/transactions?limit=20`, { headers: authHeaders() })
        .then(r => r.json()).then(d => setTxns(Array.isArray(d) ? d : [])).catch(() => {}),
      fetch(`${BASE}/api/biz/revenue/ranking?limit=10`)
        .then(r => r.json()).then(d => setRanking(Array.isArray(d) ? d : [])).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [period])

  return (
    <div className="min-h-screen bg-[#060D1A] text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-heading">💰 Revenue</h1>
          <p className="text-slate-500 text-sm mt-0.5">売上・収益ダッシュボード</p>
        </div>
        <select
          value={period}
          onChange={e => setPeriod(Number(e.target.value))}
          className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-slate-300 focus:outline-none"
        >
          <option value={7}  className="bg-slate-900">直近7日</option>
          <option value={30} className="bg-slate-900">直近30日</option>
          <option value={90} className="bg-slate-900">直近90日</option>
          <option value={365} className="bg-slate-900">直近1年</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-slate-600">読み込み中...</div>
      ) : (
        <>
          {/* KPI cards */}
          {summary && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <KPICard label="総売上" value={fmtJpy(summary.total_revenue_jpy)} sub={`直近${period}日`} color="cyan" />
              <KPICard label="自分の収益" value={fmtJpy(summary.seller_revenue_jpy)} sub={`プラットフォーム手数料差引後`} color="green" />
              <KPICard label="取引数" value={`${summary.total_transactions}件`} sub={`直近${period}日`} color="slate" />
              <KPICard label="アクティブSub" value={`${summary.active_subscriptions}件`} sub={`MRR: ${fmtJpy(summary.mrr_jpy)}`} color="purple" />
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 mb-4 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] w-fit">
            {(['overview', 'transactions', 'ranking'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={[
                  'px-4 py-1.5 rounded-lg text-sm transition-colors',
                  activeTab === t ? 'bg-white/[0.08] text-white' : 'text-slate-500 hover:text-slate-300',
                ].join(' ')}>
                {t === 'overview' ? '概要' : t === 'transactions' ? '取引履歴' : 'ランキング'}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && summary && <OverviewTab summary={summary} />}
          {activeTab === 'transactions' && <TransactionsTab txns={txns} />}
          {activeTab === 'ranking' && <RankingTab items={ranking} />}
        </>
      )}
    </div>
  )
}

/* ─── KPI Card ───────────────────────────────────────────────────────────── */

function KPICard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  const colorMap: Record<string, string> = {
    cyan: 'border-cyan-500/20', green: 'border-green-500/20',
    slate: 'border-white/[0.06]', purple: 'border-purple-500/20',
  }
  return (
    <div className={`p-4 rounded-xl bg-white/[0.03] border ${colorMap[color] ?? colorMap.slate}`}>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-slate-600 mt-0.5">{sub}</p>
    </div>
  )
}

/* ─── Overview ───────────────────────────────────────────────────────────── */

function OverviewTab({ summary }: { summary: RevenueSummary }) {
  const total = summary.total_revenue_jpy || 1
  const sellerPct = Math.round((summary.seller_revenue_jpy / total) * 100)
  const platformPct = 100 - sellerPct
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5">
        <h3 className="text-sm font-semibold mb-4">収益配分</h3>
        <div className="space-y-3">
          <RevenueBar label="あなたの収益" amount={summary.seller_revenue_jpy} pct={sellerPct} color="bg-cyan-500" />
          <RevenueBar label="プラットフォーム" amount={summary.platform_revenue_jpy} pct={platformPct} color="bg-slate-600" />
        </div>
        <div className="mt-4 pt-4 border-t border-white/[0.06]">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">合計</span>
            <span className="font-bold">{`¥${summary.total_revenue_jpy.toLocaleString()}`}</span>
          </div>
        </div>
      </div>
      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5">
        <h3 className="text-sm font-semibold mb-4">収益ハイライト</h3>
        <div className="space-y-3">
          <HighlightRow label="月次経常収益 (MRR)" value={`¥${summary.mrr_jpy.toLocaleString()}`} />
          <HighlightRow label="アクティブサブスク" value={`${summary.active_subscriptions}件`} />
          <HighlightRow label="平均取引単価" value={summary.total_transactions > 0 ? `¥${Math.round(summary.total_revenue_jpy / summary.total_transactions).toLocaleString()}` : '—'} />
        </div>
      </div>
    </div>
  )
}

function RevenueBar({ label, amount, pct, color }: { label: string; amount: number; pct: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-300">{`¥${amount.toLocaleString()}`} ({pct}%)</span>
      </div>
      <div className="h-2 rounded-full bg-white/[0.06]">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function HighlightRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  )
}

/* ─── Transactions ───────────────────────────────────────────────────────── */

function TransactionsTab({ txns }: { txns: Transaction[] }) {
  if (txns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32">
        <span className="text-slate-500">取引履歴はありません</span>
      </div>
    )
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.06]">
            {['日時', 'タイプ', '金額', '自分の収益', '決済'].map(h => (
              <th key={h} className="text-left text-xs text-slate-500 px-4 py-3 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {txns.map(t => (
            <tr key={t.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
              <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(t.created_at)}</td>
              <td className="px-4 py-3">
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-400">{t.transaction_type}</span>
              </td>
              <td className="px-4 py-3 font-medium">{`¥${t.amount_jpy.toLocaleString()}`}</td>
              <td className="px-4 py-3 text-green-400">{`¥${t.seller_revenue_jpy.toLocaleString()}`}</td>
              <td className="px-4 py-3 text-xs text-slate-500">{t.payment_provider}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ─── Ranking ────────────────────────────────────────────────────────────── */

function RankingTab({ items }: { items: RankingItem[] }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32">
        <span className="text-slate-500">データがありません</span>
      </div>
    )
  }
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={item.item_id} className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <span className={`text-lg font-bold w-8 text-center ${i < 3 ? 'text-amber-400' : 'text-slate-600'}`}>
            {i + 1}
          </span>
          <span className="text-xl">{TYPE_ICONS[item.item_type] ?? '📦'}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{item.title}</p>
            <p className="text-xs text-slate-500">{item.total_sales}件販売 · ⭐{item.avg_rating.toFixed(1)}</p>
          </div>
          <span className="text-sm font-bold text-green-400">{`¥${item.revenue_jpy.toLocaleString()}`}</span>
        </div>
      ))}
    </div>
  )
}
