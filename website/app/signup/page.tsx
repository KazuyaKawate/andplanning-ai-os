'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import { apiRegister } from '@/lib/auth'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [company, setCompany] = useState('')
  const [useCase, setUseCase] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Append company and usecase metadata into display name or register details
    const fullDisplayName = `${displayName.trim()}${company ? ` @ ${company}` : ''}`

    const res = await apiRegister(email.trim(), password, fullDisplayName)
    if (res.ok) {
      setIsSuccess(true)
    } else {
      setError(res.error)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#070E1A] text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Decorative gradients */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-brand-cyan/10 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-brand-blue/10 blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-[#0A1220] border border-white/[0.08] rounded-2xl p-6 shadow-2xl z-10 relative"
      >
        {isSuccess ? (
          <div className="text-center space-y-4 py-4">
            <span className="text-4xl inline-block">🚀</span>
            <h2 className="text-lg font-bold text-white">ベータ登録・ウェイトリスト申請が完了しました！</h2>
            <div className="text-xs text-slate-400 space-y-2 leading-relaxed bg-[#050B14] p-4 rounded-xl border border-white/[0.02]">
              <p>申請されたメールアドレス <strong>{email}</strong> はウェイトリストに登録されました。</p>
              <p>管理者によるアカウントの有効化が完了するまで、今しばらくお待ちください。承認されると、同じメールアドレスでログインできるようになります。</p>
            </div>
            <div className="pt-4">
              <Link
                href="/login"
                className="inline-flex justify-center w-full px-4 py-2.5 text-xs font-bold rounded-xl bg-brand-cyan hover:bg-brand-cyan-bright text-slate-900 transition-colors"
              >
                ログイン画面へ
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-bold text-white">AIOS ベータ版利用申請</h2>
              <p className="text-[10px] text-slate-500 mt-1">
                AIOSの全機能をお使いいただけるクローズドベータのウェイトリスト申請フォームです。
              </p>
            </div>

            {error && (
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-xs text-rose-300">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[10px] text-slate-400 font-bold mb-1">お名前 (必須)</label>
                <input
                  type="text" required
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="w-full text-xs bg-[#070E1A] border border-white/[0.08] rounded-lg p-2.5 text-white focus:outline-none focus:border-brand-cyan"
                  placeholder="山田 太郎"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-bold mb-1">会社名 / 組織名</label>
                <input
                  type="text"
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                  className="w-full text-xs bg-[#070E1A] border border-white/[0.08] rounded-lg p-2.5 text-white focus:outline-none focus:border-brand-cyan"
                  placeholder="株式会社テックソリューションズ"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-bold mb-1">メールアドレス (必須)</label>
                <input
                  type="email" required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full text-xs bg-[#070E1A] border border-white/[0.08] rounded-lg p-2.5 text-white focus:outline-none focus:border-brand-cyan"
                  placeholder="yamada@company.com"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-bold mb-1">パスワード (必須)</label>
                <input
                  type="password" required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full text-xs bg-[#070E1A] border border-white/[0.08] rounded-lg p-2.5 text-white focus:outline-none focus:border-brand-cyan"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-bold mb-1">想定される主なAI用途</label>
                <textarea
                  value={useCase}
                  onChange={e => setUseCase(e.target.value)}
                  className="w-full text-xs bg-[#070E1A] border border-white/[0.08] rounded-lg p-2.5 text-white focus:outline-none focus:border-brand-cyan h-16 resize-none"
                  placeholder="AIを用いた営業提案やマーケティングコンテンツ、動画スクリプト作成の自動化など..."
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 mt-2 text-xs font-bold rounded-xl bg-brand-cyan hover:bg-brand-cyan-bright disabled:opacity-50 text-slate-900 transition-colors shadow-md"
              >
                {loading ? '申請処理中...' : 'ウェイトリストに登録申請する'}
              </button>
            </form>

            <div className="text-center pt-2 border-t border-white/[0.04]">
              <span className="text-[10px] text-slate-500">すでにアカウントをお持ちですか？ </span>
              <Link href="/login" className="text-[10px] text-brand-cyan hover:underline font-bold">
                ログイン画面
              </Link>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
