'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'motion/react'

/* ========== Nav items ========== */

const navItems = [
  { href: '/os/dashboard',  label: 'Dashboard',  icon: DashboardIcon  },
  { href: '/os/workflows',  label: 'Workflows',  icon: WorkflowIcon   },
  { href: '/os/factories',  label: 'Factories',  icon: FactoryIcon    },
  { href: '/os/memory',     label: 'Memory',     icon: MemoryIcon     },
  { href: '/os/settings',   label: 'Settings',   icon: SettingsIcon   },
]

/* ========== Icons ========== */

function DashboardIcon({ active }: { active?: boolean }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" stroke={active ? '#22D3EE' : '#475569'} strokeWidth="1.5">
      <rect x="2" y="2" width="7" height="7" rx="1" />
      <rect x="11" y="2" width="7" height="7" rx="1" />
      <rect x="2" y="11" width="7" height="7" rx="1" />
      <rect x="11" y="11" width="7" height="7" rx="1" />
    </svg>
  )
}

function WorkflowIcon({ active }: { active?: boolean }) {
  const c = active ? '#22D3EE' : '#475569'
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" stroke={c} strokeWidth="1.5">
      <circle cx="4" cy="10" r="2" />
      <circle cx="16" cy="10" r="2" />
      <circle cx="10" cy="4" r="2" />
      <path d="M6 10h4M10 6v4" />
      <path d="M10 10l4 0" />
    </svg>
  )
}

function FactoryIcon({ active }: { active?: boolean }) {
  const c = active ? '#22D3EE' : '#475569'
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" stroke={c} strokeWidth="1.5">
      <path d="M2 16V9l5-3v3l5-3v3l4-2v8H2z" />
      <rect x="6" y="12" width="2" height="4" />
      <rect x="12" y="12" width="2" height="4" />
    </svg>
  )
}

function MemoryIcon({ active }: { active?: boolean }) {
  const c = active ? '#22D3EE' : '#475569'
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" stroke={c} strokeWidth="1.5">
      <ellipse cx="10" cy="6" rx="7" ry="2.5" />
      <path d="M3 6v4c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6" />
      <path d="M3 10v4c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-4" />
    </svg>
  )
}

function SettingsIcon({ active }: { active?: boolean }) {
  const c = active ? '#22D3EE' : '#475569'
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" stroke={c} strokeWidth="1.5">
      <circle cx="10" cy="10" r="2.5" />
      <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M4.2 15.8l1.4-1.4M14.4 5.6l1.4-1.4" />
    </svg>
  )
}

/* ========== Status dot ========== */

function StatusDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-cyan opacity-60" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-cyan" />
    </span>
  )
}

/* ========== Component ========== */

export default function OsSidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex flex-col w-16 lg:w-56 bg-[#080F1E] border-r border-white/[0.06]">
      {/* Logo */}
      <div className="flex items-center gap-3 h-14 px-3 lg:px-5 border-b border-white/[0.06] shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-blue to-brand-cyan flex items-center justify-center shrink-0">
          <span className="text-white text-xs font-bold font-mono">OS</span>
        </div>
        <div className="hidden lg:block overflow-hidden">
          <p className="text-xs font-bold font-heading text-white tracking-tight leading-tight">And Planning</p>
          <p className="text-[10px] text-slate-600 font-mono">AI OS β</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-0.5 px-2" aria-label="OS navigation">
        {navItems.map((nav) => {
          const active = pathname.startsWith(nav.href)
          const Icon   = nav.icon
          return (
            <Link
              key={nav.href}
              href={nav.href}
              className={[
                'relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors group',
                active
                  ? 'bg-white/[0.07] text-white'
                  : 'text-slate-500 hover:bg-white/[0.04] hover:text-slate-300',
              ].join(' ')}
            >
              {active && (
                <motion.div
                  layoutId="sidebar-indicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-full bg-brand-cyan"
                />
              )}
              <span className="shrink-0">
                <Icon active={active} />
              </span>
              <span className={['hidden lg:block text-sm font-medium', active ? 'text-white' : ''].join(' ')}>
                {nav.label}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* OS Status footer */}
      <div className="px-3 lg:px-5 py-4 border-t border-white/[0.06]">
        <div className="flex items-center gap-2">
          <StatusDot />
          <span className="hidden lg:block text-[10px] text-slate-600 font-mono">OS Running</span>
        </div>
      </div>
    </aside>
  )
}
