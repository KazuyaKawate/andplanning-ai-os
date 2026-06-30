'use client'

import { useState, useEffect } from 'react'
import { authHeaders } from '@/lib/auth'

const BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000').replace(/\/$/, '')

interface PricePlan {
  id: string; name: string; name_ja: string; price_jpy: number
  billing_type: string; billing_interval: string | null
  discount_pct: number; trial_days: number
  description: string; features: string[]; is_active: boolean; sort_order: number
}

interface Subscription {
  id: string; price_plan_id: string; status: string
  started_at: string; current_period_end: string | null; cancelled_at: string | null
}

const BILLING_LABEL: Record<string, string> = {
  free: '無料', one_time: '買い切り', subscription: 'サブスク', enterprise: 'エンタープライズ',
}

function fmtPrice(plan: PricePlan): string {
  if (plan.billing_type === 'free') return '¥0'
  if (plan.billing_type === 'enterprise') return '要問合せ'
  const base = `¥${plan.price_jpy.toLocaleString()}`
  if (plan.billing_interval === 'monthly') return `${base}/月`
  if (plan.billing_interval === 'yearly') return `${base}/年`
  return base
}

export default function PricingPage() {
  const [plans, setPlans]         = useState<PricePlan[]>([])
  const [subs, setSubs]           = useState<Subscription[]>([])
  const [loading, setLoading]     = useState(true)
  const [subscribing, setSub]     = useState<string | null>(null)
  const [message, setMessage]     = useState('')

  useEffect(() => {
    Promise.all([
      fetch(`${BASE}/api/biz/pricing/plans`).then(r => r.json()).then(d => setPlans(Array.isArray(d) ? d : [])),
      fetch(`${BASE}/api/biz/pricing/subscriptions`, { headers: authHeaders() })
        .then(r => r.json()).then(d => setSubs(Array.isArray(d) ? d : [])).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  const subscribe = async (planId: string) => {
    setSub(planId)
    setMessage('')
    try {
      const res = await fetch(`${BASE}/api/biz/pricing/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ price_plan_id: planId }),
      })
      const data = await res.json()
      if (res.ok) {
        setSubs(prev => [...prev, data])
        setMessage('サブスク契約が完了しました')
      } else {
        setMessage(data.detail || 'エラーが発生しました')
      }
    } catch { setMessage('ネットワークエラー') }
    setSub(null)
  }

  const cancel = async (subId: string) => {
    if (!confirm('サブスクをキャンセルしますか？')) return
    const res = await fetch(`${BASE}/api/biz/pricing/subscriptions/${subId}/cancel`, {
      method: 'POST', headers: authHeaders(),
    })
    if (res.ok) {
      setSubs(prev => prev.map(s => s.id === subId ? { ...s, status: 'cancelled' } : s))
      setMessage('キャンセルしました')
    }
  }

  const isSubscribed = (planId: string) =>
    subs.some(s => s.price_plan_id === planId && ['active', 'trial'].includes(s.status))

  const getPlanColor = (plan: PricePlan) => {
    if (plan.billing_type === 'enterprise') return 'from-purple-500/20 to-purple-800/10 border-purple-500/30'
    if (plan.billing_type === 'subscription') return 'from-cyan-500/20 to-cyan-800/10 border-cyan-500/30'
    if (plan.billing_type === 'free') return 'from-white/[0.03] to-white/[0.01] border-white/[0.06]'
    return 'from-white/[0.05] to-white/[0.02] border-white/[0.08]'
  }

  return (
    <div className="min-h-screen bg-[#060D1A] text-white p-6">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold font-heading">💳 Pricing</h1>
        <p className="text-slate-500 text-sm mt-1">あなたに合ったプランを選んでください</p>
      </div>

      {message && (
        <div className="max-w-2xl mx-auto mb-4 p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm text-center">
          {message}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48 text-slate-600">読み込み中...</div>
      ) : (
        <>
          {/* Plan cards */}
          <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
            {plans.map(plan => (
              <div
                key={plan.id}
                className={`relative rounded-2xl bg-gradient-to-br p-6 border ${getPlanColor(plan)}`}
              >
                {plan.discount_pct > 0 && (
                  <div className="absolute -top-2 -right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    -{plan.discount_pct}%
                  </div>
                )}
                {plan.trial_days > 0 && (
                  <div className="text-xs text-amber-400 mb-1">{plan.trial_days}日間無料トライアル</div>
                )}
                <h3 className="text-lg font-bold mb-0.5">{plan.name_ja || plan.name}</h3>
                <p className="text-xs text-slate-500 mb-3">{BILLING_LABEL[plan.billing_type]}</p>
                <div className="text-3xl font-bold mb-1">{fmtPrice(plan)}</div>
                <p className="text-xs text-slate-500 mb-4">{plan.description}</p>
                <ul className="space-y-1.5 mb-6">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                      <span className="text-cyan-400 mt-0.5">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                {plan.billing_type === 'enterprise' ? (
                  <a href="mailto:info@andplanning.jp"
                    className="block text-center py-2.5 rounded-xl border border-purple-500/30 text-purple-300 text-sm font-medium hover:bg-purple-500/10 transition-colors">
                    問い合わせる
                  </a>
                ) : isSubscribed(plan.id) ? (
                  <div>
                    <div className="py-2.5 rounded-xl text-center text-green-400 text-sm border border-green-500/20 mb-2">
                      ✓ 契約中
                    </div>
                    {subs.find(s => s.price_plan_id === plan.id) && (
                      <button
                        onClick={() => cancel(subs.find(s => s.price_plan_id === plan.id)!.id)}
                        className="w-full text-xs text-slate-600 hover:text-red-400 transition-colors"
                      >
                        キャンセル
                      </button>
                    )}
                  </div>
                ) : plan.billing_type === 'subscription' ? (
                  <button
                    onClick={() => subscribe(plan.id)}
                    disabled={subscribing === plan.id}
                    className="w-full py-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-sm font-medium hover:bg-cyan-500/30 transition-colors disabled:opacity-50"
                  >
                    {subscribing === plan.id ? '処理中...' : '契約する'}
                  </button>
                ) : plan.billing_type === 'free' ? (
                  <div className="py-2.5 rounded-xl text-center text-slate-500 text-sm">
                    現在のプラン
                  </div>
                ) : (
                  <button className="w-full py-2.5 rounded-xl bg-white/[0.06] text-slate-300 text-sm font-medium hover:bg-white/[0.1] transition-colors">
                    購入する
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Active subscriptions */}
          {subs.length > 0 && (
            <div className="max-w-2xl mx-auto">
              <h2 className="text-sm font-semibold text-slate-400 mb-3">アクティブなサブスク</h2>
              <div className="space-y-2">
                {subs.filter(s => s.status !== 'cancelled').map(s => {
                  const plan = plans.find(p => p.id === s.price_plan_id)
                  return (
                    <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <div>
                        <p className="text-sm font-medium">{plan?.name_ja || plan?.name || '—'}</p>
                        <p className="text-xs text-slate-500">
                          {s.status === 'trial' ? '🟡 トライアル' : '🟢 アクティブ'}
                          {s.current_period_end && ` · ${new Date(s.current_period_end).toLocaleDateString('ja-JP')}まで`}
                        </p>
                      </div>
                      <button
                        onClick={() => cancel(s.id)}
                        className="text-xs text-slate-600 hover:text-red-400 transition-colors"
                      >
                        キャンセル
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
