'use client'

import { motion } from 'motion/react'

export default function BetaPage() {
  return (
    <div className="min-h-screen bg-[#060C18] text-slate-200 py-32 px-6 flex items-center justify-center">
      <div className="max-w-md w-full text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8"
        >
          <div className="text-4xl mb-4">🚀</div>
          <h1 className="text-2xl font-bold text-white mb-2">ベータ版アクセス</h1>
          <p className="text-slate-400 mb-8">
            現在、AIOSはクローズドベータテスト中です。ウェイティングリストに登録して、早期アクセスの招待を受け取りましょう。
          </p>

          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <input 
              type="email" 
              placeholder="あなたのメールアドレス" 
              className="w-full bg-[#0A1220] border border-white/[0.1] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-cyan transition text-center" 
            />
            <button className="w-full bg-brand-cyan text-slate-900 font-bold py-3 rounded-lg hover:bg-brand-cyan-bright transition">
              リストに登録する
            </button>
          </form>
          
          <p className="text-xs text-slate-500 mt-6">
            登録により<a href="/terms" className="underline hover:text-white">利用規約</a>と<a href="/privacy" className="underline hover:text-white">プライバシーポリシー</a>に同意したものとみなされます。
          </p>
        </motion.div>
      </div>
    </div>
  )
}
