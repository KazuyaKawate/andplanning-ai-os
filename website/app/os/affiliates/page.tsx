'use client'

import { useState } from 'react'

type Resource = {
  id: string
  title: string
  category: 'api' | 'hosting' | 'tools' | 'services'
  description: string
  affiliateUrl: string
  discountCode?: string
  accentColor: string
}

const RESOURCES: Resource[] = [
  {
    id: 'openai',
    title: 'OpenAI API Platform',
    category: 'api',
    description: 'GPT-4oおよびGPT-4o-miniをアプリケーションに統合し、先進的なテキスト・画像生成を組み込むための業界標準API。',
    affiliateUrl: 'https://platform.openai.com/',
    accentColor: 'from-emerald-500/20 to-emerald-600/10 text-emerald-400'
  },
  {
    id: 'anthropic',
    title: 'Anthropic Claude API',
    category: 'api',
    description: 'AIOSが開発・設計タスクの実行で主力として使用する、極めて優秀なプログラミング・思考能力を誇るClaude 3.5 Sonnet API。',
    affiliateUrl: 'https://www.anthropic.com/api',
    accentColor: 'from-orange-500/20 to-orange-600/10 text-orange-400'
  },
  {
    id: 'conoha',
    title: 'ConoHa VPS (XServer Fallback)',
    category: 'hosting',
    description: 'AIOSを低コスト・高性能で日本のネットワークに向けてデプロイするための高速SSD VPSレンタルサーバー。',
    affiliateUrl: 'https://www.conoha.jp/vps/',
    discountCode: 'AIOS_PROMO_2026',
    accentColor: 'from-blue-500/20 to-blue-600/10 text-blue-400'
  },
  {
    id: 'deepseek',
    title: 'DeepSeek Coder API',
    category: 'api',
    description: '圧倒的なコストパフォーマンスを誇る最先端のオープンソース・コード生成LLM。開発コスト削減の強力な選択肢。',
    affiliateUrl: 'https://www.deepseek.com/',
    accentColor: 'border-cyan-500/20 bg-cyan-500/5 text-cyan-400'
  }
]

export default function AffiliatesPage() {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] bg-[#080F1E] text-slate-100 overflow-hidden font-sans">
      {/* Context bar */}
      <div className="p-4 border-b border-white/[0.06] bg-[#0A1220]/60 flex items-center justify-between shrink-0">
        <div>
          <span className="text-[10px] text-slate-500 font-mono">RECOMMENDED ECOSYSTEM</span>
          <h1 className="text-sm font-bold text-white mt-0.5">アフィリエイト・外部リソース推奨ポータル</h1>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 overflow-y-auto p-6 bg-[#070E1A] space-y-6">
        
        {/* Banner */}
        <div className="rounded-2xl border border-brand-cyan/20 bg-brand-cyan/[0.02] p-5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span>💡</span> AIOS推奨リソース＆アフィリエイトリンク
          </h3>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            AIOSの自動化エージェントやCRMワークフローを最大速度・最低コストで運用するために、私たちが厳選した推奨ツールおよびインフラサービスです。一部のリンクではプロモーション割引コードを適用いただけます。
          </p>
        </div>

        {/* Resources Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {RESOURCES.map(r => (
            <div
              key={r.id}
              className="rounded-xl border border-white/[0.04] bg-[#0A1220]/40 p-5 flex flex-col justify-between gap-4 hover:border-white/[0.08] transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">{r.category}</span>
                    <h4 className="text-sm font-bold text-white mt-0.5">{r.title}</h4>
                  </div>
                  <span className={`inline-block px-1.5 py-0.5 text-[10px] font-bold rounded bg-white/[0.04] text-slate-400 border border-white/[0.06]`}>
                    RECOM_ID: {r.id.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{r.description}</p>
              </div>

              <div className="flex items-center justify-between border-t border-white/[0.04] pt-3 shrink-0">
                {r.discountCode ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-500">コード:</span>
                    <button
                      onClick={() => handleCopy(r.discountCode!, r.id)}
                      className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan"
                    >
                      {copiedId === r.id ? 'コピー済' : r.discountCode}
                    </button>
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-500">特別紹介リンク</span>
                )}

                <a
                  href={r.affiliateUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 text-[10px] font-bold rounded-lg bg-brand-cyan hover:bg-brand-cyan-bright text-slate-900 transition-all flex items-center gap-1"
                >
                  公式サイトを開く ↗
                </a>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
