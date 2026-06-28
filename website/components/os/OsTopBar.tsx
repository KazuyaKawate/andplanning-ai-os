'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

const sectionMeta: Record<string, { label: string; desc: string }> = {
  '/os/dashboard': { label: 'Dashboard',         desc: 'システム概要とリアルタイム状態' },
  '/os/workflows': { label: 'Workflows',          desc: 'Workflow一覧・実行・履歴'      },
  '/os/factories': { label: 'Factory Dashboard',  desc: '各Factoryの状態と統計'         },
  '/os/memory':    { label: 'Memory',             desc: 'AIが記憶した情報の管理'         },
  '/os/settings':  { label: 'Settings',           desc: 'API・モデル・通知設定'          },
}

function getSection(pathname: string) {
  for (const [key, val] of Object.entries(sectionMeta)) {
    if (pathname.startsWith(key)) return val
  }
  return { label: 'AI OS', desc: 'And Planning AI Operating System' }
}

export default function OsTopBar() {
  const pathname = usePathname()
  const section  = getSection(pathname)
  const now      = new Date().toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <header className="fixed top-0 left-16 lg:left-56 right-0 z-30 h-14 flex items-center justify-between px-4 lg:px-6 bg-[#080F1E]/80 backdrop-blur-md border-b border-white/[0.06]">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3">
        <div>
          <p className="text-sm font-semibold text-white font-heading leading-tight">{section.label}</p>
          <p className="text-[10px] text-slate-600 hidden sm:block">{section.desc}</p>
        </div>
      </div>

      {/* Right: time + home link */}
      <div className="flex items-center gap-4">
        <span className="text-xs text-slate-600 font-mono hidden sm:block">{now}</span>
        <Link
          href="/"
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors border border-white/[0.06] rounded-md px-3 py-1.5"
        >
          ← サイトへ
        </Link>
      </div>
    </header>
  )
}
