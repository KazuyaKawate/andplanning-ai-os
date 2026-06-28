'use client'

import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import Link from 'next/link'
import MetricCard from '@/components/os/MetricCard'
import StatusBadge from '@/components/os/StatusBadge'
import {
  mockDashboard, mockActivity, mockQueue, mockFactories, mockWorkflowRuns,
  formatRelativeTime, formatTokens,
} from '@/lib/mock'

/* ========== Animation ========== */

const fadeUp = {
  hidden:  { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, duration: 0.45, ease: [0.21, 0.47, 0.32, 0.98] as const },
  }),
}

/* ========== Activity icon ========== */

const activityIcon: Record<string, string> = {
  run_complete:    '✓',
  run_start:       '▶',
  run_error:       '✕',
  memory_save:     '◉',
  settings_change: '⚙',
}
const activityColor: Record<string, string> = {
  run_complete:    'text-emerald-400',
  run_start:       'text-brand-blue-bright',
  run_error:       'text-red-400',
  memory_save:     'text-purple-400',
  settings_change: 'text-slate-400',
}

/* ========== Component ========== */

export default function DashboardPage() {
  const [tick, setTick] = useState(0)
  // Simulate live refresh every 30s
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30000)
    return () => clearInterval(id)
  }, [])

  const m = mockDashboard

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Page header */}
      <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible">
        <h1 className="text-xl font-bold font-heading text-white">Dashboard</h1>
        <p className="text-xs text-slate-600 mt-0.5 font-mono">
          AI OS β — {new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
          {tick > 0 && <span className="ml-2 text-brand-cyan">● 更新済み</span>}
        </p>
      </motion.div>

      {/* Metrics grid */}
      <motion.div
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
        variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={fadeUp} custom={1}>
          <MetricCard
            label="Today's Runs"
            value={m.totalRunsToday}
            sub="本日実行"
            accent="#22D3EE"
            trend="up"
            trendVal="昨日比 +4"
          />
        </motion.div>
        <motion.div variants={fadeUp} custom={2}>
          <MetricCard
            label="Active Workflows"
            value={m.activeWorkflows}
            sub="実行中"
            accent="#3B82F6"
            trend="neutral"
            trendVal="Queue: 4件"
          />
        </motion.div>
        <motion.div variants={fadeUp} custom={3}>
          <MetricCard
            label="Success Rate"
            value={`${m.successRateToday}%`}
            sub="成功率（本日）"
            accent="#10B981"
            trend="down"
            trendVal="エラー 2件"
          />
        </motion.div>
        <motion.div variants={fadeUp} custom={4}>
          <MetricCard
            label="Tokens Used"
            value={formatTokens(m.tokensUsedToday)}
            sub="本日使用"
            accent="#8B5CF6"
            trend="up"
            trendVal="今月累計 284k"
          />
        </motion.div>
      </motion.div>

      {/* Body: 3 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Active Runs */}
        <motion.section custom={5} variants={fadeUp} initial="hidden" animate="visible" className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Active / Recent Runs</h2>
            <Link href="/os/workflows" className="text-[10px] text-slate-600 hover:text-slate-300 transition-colors">
              全て見る →
            </Link>
          </div>

          <div className="space-y-2">
            {mockWorkflowRuns.slice(0, 4).map((run) => (
              <div
                key={run.id}
                className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 hover:bg-white/[0.05] transition-colors"
              >
                <StatusBadge status={run.status} dot />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{run.workflowName}</p>
                  <p className="text-xs text-slate-600 truncate mt-0.5">{run.inputSummary}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-slate-600 font-mono">{formatRelativeTime(run.startedAt)}</p>
                  {run.tokensUsed && (
                    <p className="text-[10px] text-slate-700 font-mono">{formatTokens(run.tokensUsed)} tok</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Queue */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Queue</h3>
              <span className="text-[10px] font-mono text-slate-600">{mockQueue.length} 件待機</span>
            </div>
            <div className="space-y-2">
              {mockQueue.map((q) => (
                <div key={q.id} className="flex items-center gap-3 text-sm">
                  <span className={[
                    'text-[10px] font-mono px-1.5 py-0.5 rounded',
                    q.status === 'running' ? 'bg-brand-blue/20 text-brand-blue-bright' : 'bg-white/[0.04] text-slate-600',
                  ].join(' ')}>
                    {q.status === 'running' ? '▶ RUN' : '○ QUE'}
                  </span>
                  <span className={[
                    'text-[10px] font-mono',
                    q.priority === 'high' ? 'text-red-400' : q.priority === 'low' ? 'text-slate-600' : 'text-slate-500',
                  ].join(' ')}>
                    {q.priority.toUpperCase()}
                  </span>
                  <p className="text-xs text-slate-400 truncate flex-1">{q.name}</p>
                  <p className="text-[10px] text-slate-600 font-mono shrink-0">{formatRelativeTime(q.createdAt)}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Right column: Factories + Activity */}
        <div className="space-y-4">
          {/* Active Factories */}
          <motion.section custom={6} variants={fadeUp} initial="hidden" animate="visible">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Factory 状態</h2>
              <Link href="/os/factories" className="text-[10px] text-slate-600 hover:text-slate-300 transition-colors">
                詳細 →
              </Link>
            </div>
            <div className="space-y-2">
              {mockFactories.filter(f => f.status !== 'disabled').map((f) => (
                <Link
                  key={f.id}
                  href={`/os/factories?f=${f.id}`}
                  className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 hover:bg-white/[0.05] transition-colors"
                >
                  <span className="text-xl shrink-0" style={{ color: f.accentColor }}>{f.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-300 truncate">{f.name}</p>
                    <p className="text-[10px] text-slate-600 font-mono">{f.completedToday} done · {f.queuedTasks} queued</p>
                  </div>
                  <StatusBadge status={f.status} />
                </Link>
              ))}
            </div>
          </motion.section>

          {/* Activity Feed */}
          <motion.section custom={7} variants={fadeUp} initial="hidden" animate="visible">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Recent Activity</h2>
            <div className="space-y-0 rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
              {mockActivity.slice(0, 6).map((act, idx) => (
                <div
                  key={act.id}
                  className={['flex items-start gap-3 px-4 py-3', idx < mockActivity.length - 1 ? 'border-b border-white/[0.04]' : ''].join(' ')}
                >
                  <span className={`text-xs mt-0.5 w-4 shrink-0 ${activityColor[act.type]}`}>
                    {activityIcon[act.type]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-400 leading-snug">{act.message}</p>
                    <p className="text-[10px] text-slate-600 font-mono mt-0.5">{formatRelativeTime(act.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  )
}
