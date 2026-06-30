'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'motion/react'

/* ========== Nav items ========== */

const navItems = [
  { href: '/os/dashboard',  label: 'Dashboard',  icon: DashboardIcon  },
  { href: '/os/workflows',  label: 'Workflows',  icon: WorkflowIcon   },
  { href: '/os/factories',  label: 'Factories',  icon: FactoryIcon    },
  { href: '/os/agents',     label: 'Agents',     icon: AgentIcon      },
  { href: '/os/memory',     label: 'Memory',     icon: MemoryIcon     },
  { href: '/os/dev',          label: 'Dev',         icon: DevIcon          },
  { href: '/os/debug',        label: 'Debug',       icon: DebugIcon        },
  { href: '/os/workspace',    label: 'Workspace',   icon: WorkspaceIcon    },
  { href: '/os/team',         label: 'Team',        icon: TeamIcon         },
  { href: '/os/collaborate',  label: 'Collaborate', icon: CollaborateIcon  },
  { href: '/os/evolution',    label: 'Evolution',   icon: EvolutionIcon    },
  { href: '/os/knowledge',   label: 'Knowledge',   icon: KnowledgeIcon   },
  { href: '/os/executor',    label: 'Executor',    icon: ExecutorIcon     },
  { href: '/os/settings',   label: 'Settings',   icon: SettingsIcon   },
]

const bizItems = [
  { href: '/os/orgs',             label: 'Orgs',        icon: OrgsIcon        },
  { href: '/os/marketplace',      label: 'Marketplace', icon: MarketplaceIcon },
  { href: '/os/assets',           label: 'Assets',      icon: AssetsIcon      },
  { href: '/os/library',          label: 'Library',     icon: LibraryIcon     },
  { href: '/os/pricing',          label: 'Pricing',     icon: PricingIcon     },
  { href: '/os/revenue',          label: 'Revenue',     icon: RevenueIcon     },
  { href: '/os/knowledge/graph',  label: 'KnowGraph',   icon: GraphIcon       },
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

function AgentIcon({ active }: { active?: boolean }) {
  const c = active ? '#22D3EE' : '#475569'
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" stroke={c} strokeWidth="1.5">
      <circle cx="10" cy="7" r="3" />
      <path d="M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <path d="M10 4V2M7 5.3L5.5 3.8M13 5.3l1.5-1.5" />
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

function DevIcon({ active }: { active?: boolean }) {
  const c = active ? '#22D3EE' : '#475569'
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" stroke={c} strokeWidth="1.5">
      <polyline points="6,7 2,10 6,13" />
      <polyline points="14,7 18,10 14,13" />
      <line x1="11" y1="5" x2="9" y2="15" />
    </svg>
  )
}

function DebugIcon({ active }: { active?: boolean }) {
  const c = active ? '#22D3EE' : '#475569'
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" stroke={c} strokeWidth="1.5">
      <circle cx="10" cy="12" r="4" />
      <path d="M10 8V5M7 6.3L4.5 4M13 6.3L15.5 4" />
      <path d="M6 12H2M18 12h-4M7.2 15.5L5 17.5M12.8 15.5L15 17.5" />
    </svg>
  )
}

function CollaborateIcon({ active }: { active?: boolean }) {
  const c = active ? '#22D3EE' : '#475569'
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" stroke={c} strokeWidth="1.5">
      <circle cx="6"  cy="7" r="2.5" />
      <circle cx="14" cy="7" r="2.5" />
      <path d="M6 11c-2.5 0-4 1.2-4 2.5M14 11c2.5 0 4 1.2 4 2.5" />
      <path d="M10 15v-3M8 13l2-2 2 2" />
    </svg>
  )
}

function WorkspaceIcon({ active }: { active?: boolean }) {
  const c = active ? '#22D3EE' : '#475569'
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" stroke={c} strokeWidth="1.5">
      <rect x="2" y="3" width="7" height="14" rx="1" />
      <rect x="11" y="3" width="7" height="6" rx="1" />
      <rect x="11" y="11" width="7" height="6" rx="1" />
    </svg>
  )
}

function TeamIcon({ active }: { active?: boolean }) {
  const c = active ? '#22D3EE' : '#475569'
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" stroke={c} strokeWidth="1.5">
      <circle cx="10" cy="7" r="3" />
      <circle cx="4"  cy="9" r="2.2" />
      <circle cx="16" cy="9" r="2.2" />
      <path d="M10 12c-3 0-5 1.5-5 3M1.5 16c0-1.5 1.1-2.5 2.5-3M18.5 16c0-1.5-1.1-2.5-2.5-3" />
    </svg>
  )
}

function EvolutionIcon({ active }: { active?: boolean }) {
  const c = active ? '#a78bfa' : '#475569'
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" stroke={c} strokeWidth="1.5">
      <path d="M10 3c3.9 0 7 3.1 7 7s-3.1 7-7 7-7-3.1-7-7" />
      <path d="M3.5 6.5L3 3l3.5.5" />
      <path d="M10 7v3l2 2" />
    </svg>
  )
}

function KnowledgeIcon({ active }: { active?: boolean }) {
  const c = active ? '#22D3EE' : '#475569'
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" stroke={c} strokeWidth="1.5">
      <path d="M4 3h12v14H4z" />
      <path d="M7 7h6M7 10h6M7 13h4" />
      <path d="M4 3c0 0 1-1.5 3-1.5S10 3 10 3s1-1.5 3-1.5 3 1.5 3 1.5" />
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

function MarketplaceIcon({ active }: { active?: boolean }) {
  const c = active ? '#22D3EE' : '#475569'
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" stroke={c} strokeWidth="1.5">
      <path d="M2 4h16l-1.5 8H3.5L2 4z" />
      <circle cx="7" cy="17" r="1" />
      <circle cx="14" cy="17" r="1" />
      <path d="M5 8h10" />
    </svg>
  )
}

function AssetsIcon({ active }: { active?: boolean }) {
  const c = active ? '#22D3EE' : '#475569'
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" stroke={c} strokeWidth="1.5">
      <rect x="2" y="4" width="16" height="12" rx="1" />
      <circle cx="7" cy="9" r="1.5" />
      <path d="M2 14l4-4 3 3 3-3 6 4" />
    </svg>
  )
}

function LibraryIcon({ active }: { active?: boolean }) {
  const c = active ? '#22D3EE' : '#475569'
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" stroke={c} strokeWidth="1.5">
      <path d="M4 3v14M8 3v14M12 3l4 14" />
    </svg>
  )
}

function PricingIcon({ active }: { active?: boolean }) {
  const c = active ? '#22D3EE' : '#475569'
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" stroke={c} strokeWidth="1.5">
      <rect x="2" y="4" width="16" height="12" rx="1.5" />
      <path d="M2 8h16" />
      <path d="M6 12h2M10 12h4" />
    </svg>
  )
}

function RevenueIcon({ active }: { active?: boolean }) {
  const c = active ? '#22D3EE' : '#475569'
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" stroke={c} strokeWidth="1.5">
      <path d="M2 15l4-5 4 2 4-6 4-2" />
      <circle cx="10" cy="3" r="1" fill={c} stroke="none" />
    </svg>
  )
}

function ExecutorIcon({ active }: { active?: boolean }) {
  const c = active ? '#a78bfa' : '#475569'
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" stroke={c} strokeWidth="1.5">
      <rect x="2" y="2" width="16" height="11" rx="1.5" />
      <path d="M5 6l3 3-3 3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M11 12h4" strokeLinecap="round"/>
      <path d="M4 17h12" strokeLinecap="round"/>
    </svg>
  )
}

function OrgsIcon({ active }: { active?: boolean }) {
  const c = active ? '#22D3EE' : '#475569'
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" stroke={c} strokeWidth="1.5">
      <rect x="2" y="3" width="7" height="5" rx="1" />
      <rect x="11" y="3" width="7" height="5" rx="1" />
      <path d="M5.5 8v2.5h9V8" />
      <path d="M10 10.5v2" />
      <rect x="7" y="12.5" width="6" height="4.5" rx="1" />
    </svg>
  )
}

function GraphIcon({ active }: { active?: boolean }) {
  const c = active ? '#22D3EE' : '#475569'
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" stroke={c} strokeWidth="1.5">
      <circle cx="10" cy="10" r="2" />
      <circle cx="3"  cy="6"  r="1.5" />
      <circle cx="17" cy="6"  r="1.5" />
      <circle cx="3"  cy="15" r="1.5" />
      <circle cx="17" cy="15" r="1.5" />
      <path d="M8.5 9L4.3 6.8M11.5 9L15.7 6.8M8.5 11L4.3 14M11.5 11L15.7 14" />
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
      <nav className="flex-1 py-4 space-y-0.5 px-2 overflow-y-auto" aria-label="OS navigation">
        {navItems.map((nav) => {
          const active = pathname.startsWith(nav.href) && nav.href !== '/os/knowledge'
            || pathname === nav.href
          const isKnowledge = nav.href === '/os/knowledge'
          const isActive = isKnowledge
            ? pathname === '/os/knowledge' || (pathname.startsWith('/os/knowledge') && !pathname.startsWith('/os/knowledge/graph'))
            : pathname.startsWith(nav.href)
          const Icon = nav.icon
          return (
            <Link
              key={nav.href}
              href={nav.href}
              className={[
                'relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors group',
                isActive
                  ? 'bg-white/[0.07] text-white'
                  : 'text-slate-500 hover:bg-white/[0.04] hover:text-slate-300',
              ].join(' ')}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-indicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-full bg-brand-cyan"
                />
              )}
              <span className="shrink-0">
                <Icon active={isActive} />
              </span>
              <span className={['hidden lg:block text-sm font-medium', isActive ? 'text-white' : ''].join(' ')}>
                {nav.label}
              </span>
            </Link>
          )
        })}

        {/* Business section */}
        <div className="pt-3 mt-3 border-t border-white/[0.04]">
          <p className="hidden lg:block text-[9px] font-semibold text-slate-700 uppercase tracking-widest px-3 mb-1.5">Business</p>
          {bizItems.map((nav) => {
            const isActive = pathname.startsWith(nav.href)
            const Icon = nav.icon
            return (
              <Link
                key={nav.href}
                href={nav.href}
                className={[
                  'relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors group',
                  isActive
                    ? 'bg-white/[0.07] text-white'
                    : 'text-slate-500 hover:bg-white/[0.04] hover:text-slate-300',
                ].join(' ')}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-biz-indicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-full bg-brand-cyan"
                  />
                )}
                <span className="shrink-0">
                  <Icon active={isActive} />
                </span>
                <span className={['hidden lg:block text-sm font-medium', isActive ? 'text-white' : ''].join(' ')}>
                  {nav.label}
                </span>
              </Link>
            )
          })}
        </div>
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
