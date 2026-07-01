'use client'

import { motion } from 'motion/react'

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#060C18] text-slate-200 py-32 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-5xl font-bold font-heading text-white mb-6"
        >
          Pricing
        </motion.h1>
        <p className="text-slate-400 text-lg mb-16 max-w-2xl mx-auto">
          必要な機能と利用規模に合わせて選べるシンプルな料金体系。
        </p>

        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {/* Pro Plan */}
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8 flex flex-col items-start text-left">
            <h3 className="text-xl font-bold text-white">Pro</h3>
            <p className="text-slate-400 mt-2 mb-6">個人のプロフェッショナルや小規模チーム向け</p>
            <div className="text-3xl font-bold text-brand-cyan mb-8">¥2,980 <span className="text-sm text-slate-500 font-normal">/月</span></div>
            <ul className="space-y-3 mb-8 flex-1">
              <li className="flex items-center gap-2"><span className="text-brand-cyan">✓</span> AIエージェント無制限</li>
              <li className="flex items-center gap-2"><span className="text-brand-cyan">✓</span> プロンプトテンプレート利用</li>
              <li className="flex items-center gap-2"><span className="text-brand-cyan">✓</span> マーケットプレイス購入</li>
              <li className="flex items-center gap-2"><span className="text-brand-cyan">✓</span> メールサポート</li>
            </ul>
            <a href="/signup" className="w-full text-center py-3 rounded-lg bg-brand-cyan text-slate-900 font-bold hover:bg-brand-cyan-bright transition">はじめる</a>
          </div>

          {/* Enterprise Plan */}
          <div className="bg-gradient-to-b from-brand-blue/20 to-transparent border border-brand-blue/30 rounded-2xl p-8 flex flex-col items-start text-left">
            <h3 className="text-xl font-bold text-white">Enterprise</h3>
            <p className="text-slate-400 mt-2 mb-6">高度なセキュリティとカスタマイズが必要な企業向け</p>
            <div className="text-3xl font-bold text-white mb-8">要お見積もり</div>
            <ul className="space-y-3 mb-8 flex-1">
              <li className="flex items-center gap-2"><span className="text-brand-blue-bright">✓</span> オンプレミス・VPC構築</li>
              <li className="flex items-center gap-2"><span className="text-brand-blue-bright">✓</span> 独自の社内データ連携</li>
              <li className="flex items-center gap-2"><span className="text-brand-blue-bright">✓</span> SSO / 監査ログ対応</li>
              <li className="flex items-center gap-2"><span className="text-brand-blue-bright">✓</span> 専任サポート・SLA</li>
            </ul>
            <a href="/contact" className="w-full text-center py-3 rounded-lg border border-white/20 text-white font-bold hover:bg-white/10 transition">お問い合わせ</a>
          </div>
        </div>
      </div>
    </div>
  )
}
