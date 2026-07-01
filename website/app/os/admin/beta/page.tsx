'use client'

import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { api } from '@/lib/api/runtime'
import StatusBadge from '@/components/os/StatusBadge'
import type { AdminUser } from '@/types'

export default function AdminBetaPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'active' | 'pending'>('all')

  const fetchUsers = async () => {
    setLoading(true)
    setError(null)
    const res = await api.getAdminUsers()
    if (res.ok) {
      setUsers(res.data)
    } else {
      setError(res.error)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleToggleActive = async (userId: string) => {
    const res = await api.toggleUserActive(userId)
    if (res.ok) {
      setUsers(prev => prev.map(u => u.id === userId ? res.data : u))
    } else {
      alert(`エラー: ${res.error}`)
    }
  }

  const filteredUsers = users.filter(u => {
    if (filter === 'active') return u.is_active
    if (filter === 'pending') return !u.is_active
    return true
  })

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] bg-[#080F1E] text-slate-100 overflow-hidden font-sans">
      {/* Context bar */}
      <div className="p-4 border-b border-white/[0.06] bg-[#0A1220]/60 flex items-center justify-between shrink-0">
        <div>
          <span className="text-[10px] text-slate-500 font-mono">ADMINISTRATION</span>
          <h1 className="text-sm font-bold text-white mt-0.5">ベータユーザー・ウェイトリスト管理</h1>
        </div>

        <div className="flex items-center gap-1 bg-[#070E1A] p-1 border border-white/[0.04] rounded-lg text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-md transition-all ${filter === 'all' ? 'bg-white/[0.06] text-white font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            すべて
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-1 rounded-md transition-all ${filter === 'pending' ? 'bg-white/[0.06] text-white font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            保留中 (Pending)
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-3 py-1 rounded-md transition-all ${filter === 'active' ? 'bg-white/[0.06] text-white font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            承認済 (Active)
          </button>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 overflow-y-auto p-6 bg-[#070E1A]">
        {error && (
          <div className="mb-4 rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 text-xs text-rose-300">
            <p className="font-bold">エラーが発生しました</p>
            <p className="mt-1">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="text-center p-10 text-xs text-slate-500">ユーザーデータを読込中...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center p-12 border border-dashed border-white/[0.04] rounded-2xl">
            <span className="text-2xl mb-1 inline-block">👥</span>
            <p className="text-xs font-semibold text-slate-500 mt-1">該当するベータユーザー申請はありません</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/[0.04] text-slate-500 font-bold">
                  <th className="py-3 px-4">表示名</th>
                  <th className="py-3 px-4">メールアドレス</th>
                  <th className="py-3 px-4">権限</th>
                  <th className="py-3 px-4">ステータス</th>
                  <th className="py-3 px-4">登録日</th>
                  <th className="py-3 px-4 text-right">アクション</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-white/[0.01] transition-colors text-slate-300">
                    <td className="py-3 px-4 font-bold text-white">{u.display_name}</td>
                    <td className="py-3 px-4 font-mono">{u.email}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] uppercase font-bold font-mono ${u.role === 'admin' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={u.is_active ? 'active' : 'idle'} dot />
                    </td>
                    <td className="py-3 px-4 text-slate-500">{new Date(u.created_at).toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">
                      {u.is_active ? (
                        <button
                          onClick={() => handleToggleActive(u.id)}
                          className="px-2.5 py-1 text-[10px] font-bold rounded bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 transition-colors"
                        >
                          無効化する
                        </button>
                      ) : (
                        <button
                          onClick={() => handleToggleActive(u.id)}
                          className="px-2.5 py-1 text-[10px] font-bold rounded bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 transition-colors"
                        >
                          承認して有効化
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
