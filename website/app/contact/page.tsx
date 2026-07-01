'use client'

import { motion } from 'motion/react'

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#060C18] text-slate-200 py-32 px-6">
      <div className="max-w-2xl mx-auto text-center">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-5xl font-bold font-heading text-white mb-6"
        >
          Contact
        </motion.h1>
        <p className="text-slate-400 text-lg mb-16">
          導入のご相談、エンタープライズプランのお見積もり、その他ご不明な点がございましたらお気軽にお問い合わせください。
        </p>

        <form className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-8 space-y-6 text-left" onSubmit={(e) => e.preventDefault()}>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">お名前</label>
              <input type="text" className="w-full bg-[#0A1220] border border-white/[0.1] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-cyan transition" placeholder="山田 太郎" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">会社名</label>
              <input type="text" className="w-full bg-[#0A1220] border border-white/[0.1] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-cyan transition" placeholder="株式会社〇〇" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">メールアドレス</label>
            <input type="email" className="w-full bg-[#0A1220] border border-white/[0.1] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-cyan transition" placeholder="yamada@example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">お問い合わせ内容</label>
            <textarea rows={5} className="w-full bg-[#0A1220] border border-white/[0.1] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-cyan transition resize-none" placeholder="導入に関するご相談など..."></textarea>
          </div>
          <button className="w-full bg-brand-cyan text-slate-900 font-bold py-4 rounded-lg hover:bg-brand-cyan-bright transition">
            送信する
          </button>
        </form>
      </div>
    </div>
  )
}
