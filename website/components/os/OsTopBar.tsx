'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { getStoredUser, apiLogout, type AuthUser } from '@/lib/auth'

const sectionMeta: Record<string, { label: string; desc: string }> = {
  '/os/dashboard':   { label: 'Dashboard',         desc: 'システム概要とリアルタイム状態' },
  '/os/workflows':   { label: 'Workflows',          desc: 'Workflow一覧・実行・履歴'      },
  '/os/factories':   { label: 'Factory Dashboard',  desc: '各Factoryの状態と統計'         },
  '/os/memory':      { label: 'Memory',             desc: 'AIが記憶した情報の管理'         },
  '/os/settings':    { label: 'Settings',           desc: 'API・モデル・通知設定'          },
  '/os/dev':         { label: 'Dev Workspace',       desc: 'Virtual Claude Developer'      },
  '/os/debug':       { label: 'Auto Debugger',       desc: 'AI-powered error analysis'     },
  '/os/team':        { label: 'Virtual Team',        desc: 'Multi-agent orchestration'     },
  '/os/collaborate': { label: 'Collaborate',         desc: 'AI Team real-time collaboration'},
  '/os/workspace':   { label: 'Agent Workspace',     desc: 'Virtual agent management'      },
  '/os/agents':      { label: 'Agents',              desc: 'Virtual agent management'      },
  '/os/evolution':   { label: 'Self-Evolution',       desc: 'AI-powered continuous improvement engine' },
}

function getSection(pathname: string) {
  for (const [key, val] of Object.entries(sectionMeta)) {
    if (pathname.startsWith(key)) return val
  }
  return { label: 'AI OS', desc: 'And Planning AI Operating System' }
}

export default function OsTopBar() {
  const pathname = usePathname()
  const router   = useRouter()
  const section  = getSection(pathname)
  const now      = new Date().toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  const [user,        setUser]        = useState<AuthUser | null>(null)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  useEffect(() => {
    setUser(getStoredUser())
  }, [pathname])

  async function handleLogout() {
    await apiLogout()
    router.push('/login')
  }

  return (
    <header className="fixed top-0 left-16 lg:left-56 right-0 z-30 h-14 flex items-center justify-between px-4 lg:px-6 bg-[#080F1E]/80 backdrop-blur-md border-b border-white/[0.06]">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3">
        <div>
          <p className="text-sm font-semibold text-white font-heading leading-tight">{section.label}</p>
          <p className="text-[10px] text-slate-600 hidden sm:block">{section.desc}</p>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-600 font-mono hidden sm:block">{now}</span>

        {user ? (
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(o => !o)}
              className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors border border-white/[0.06] rounded-lg px-3 py-1.5"
            >
              <span className="w-5 h-5 rounded-full bg-gradient-to-br from-[#2563EB] to-[#22D3EE] flex items-center justify-center text-[9px] text-white font-bold shrink-0">
                {user.display_name?.[0]?.toUpperCase() ?? user.email[0].toUpperCase()}
              </span>
              <span className="hidden sm:block max-w-[100px] truncate">{user.display_name || user.email}</span>
              {user.role === 'admin' && (
                <span className="hidden sm:block text-[9px] text-[#22D3EE] font-mono">ADMIN</span>
              )}
            </button>
            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-48 bg-[#0d1627] border border-white/[0.08] rounded-xl shadow-xl overflow-hidden z-50">
                <div className="px-3 py-2.5 border-b border-white/[0.06]">
                  <p className="text-xs text-slate-300 truncate">{user.email}</p>
                  <p className="text-[10px] text-slate-600 capitalize">{user.role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link
            href="/login"
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors border border-white/[0.06] rounded-md px-3 py-1.5"
          >
            Sign in
          </Link>
        )}

        <Link
          href="/"
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors border border-white/[0.06] rounded-md px-3 py-1.5 hidden sm:block"
        >
          ← サイトへ
        </Link>
      </div>
    </header>
  )
}
