'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { apiLogin, apiRegister, isAuthenticated } from '@/lib/auth'

export default function LoginPage() {
  const router = useRouter()
  const [mode,     setMode]     = useState<'login' | 'register'>('login')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [name,     setName]     = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  useEffect(() => {
    if (isAuthenticated()) router.replace('/os/dashboard')
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = mode === 'login'
        ? await apiLogin(email, password)
        : await apiRegister(email, password, name)
      if (result.ok) {
        router.push('/os/dashboard')
      } else {
        setError(result.error)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#060C18] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.21, 0.47, 0.32, 0.98] }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#22D3EE] flex items-center justify-center">
            <span className="text-white text-sm font-bold font-mono">OS</span>
          </div>
          <div>
            <p className="text-white font-bold tracking-tight">And Planning</p>
            <p className="text-[11px] text-slate-600 font-mono">AI OS β</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
          <h1 className="text-lg font-semibold text-white mb-1">
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </h1>
          <p className="text-sm text-slate-500 mb-6">
            {mode === 'login' ? 'Welcome back to AI OS.' : 'First user becomes admin.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Display name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-3 py-2.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white placeholder:text-slate-600 text-sm focus:outline-none focus:border-[#22D3EE]/40 focus:bg-white/[0.07] transition-colors"
                />
              </div>
            )}

            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-3 py-2.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white placeholder:text-slate-600 text-sm focus:outline-none focus:border-[#22D3EE]/40 focus:bg-white/[0.07] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                className="w-full px-3 py-2.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white placeholder:text-slate-600 text-sm focus:outline-none focus:border-[#22D3EE]/40 focus:bg-white/[0.07] transition-colors"
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2 border border-red-500/20">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-gradient-to-r from-[#2563EB] to-[#22D3EE] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <div className="mt-5 text-center">
            <button
              onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError('') }}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              {mode === 'login' ? "Don't have an account? Register" : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] text-slate-700">
          By signing in you agree to And Planning&apos;s terms of service.
        </p>
      </motion.div>
    </div>
  )
}
