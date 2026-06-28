'use client'

import { motion, AnimatePresence } from 'motion/react'
import Link from 'next/link'
import MetricCard from '@/components/os/MetricCard'
import StatusBadge from '@/components/os/StatusBadge'
import { useOsPolling } from '@/hooks/useOsPolling'
import { mockQueue, formatRelativeTime, formatTokens } from '@/lib/mock'

/* ========== Animation ========== */

const fadeUp = {
  hidden:  { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, duration: 0.45, ease: [0.21, 0.47, 0.32, 0.98] as const },
  }),
}

/* ========== Activity icon / color ========== */

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

/* ========== Refresh button ========== */

function RefreshButton({
  onRefresh,
  isLoading,
  isPolling,
  onTogglePolling,
}: {
  onRefresh:       () => void
  isLoading:       boolean
  isPolling:       boolean
  onTogglePolling: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      {/* Manual refresh */}
      <button
        onClick={onRefresh}
        disabled={isLoading}
        title="今すぐ更新"
        className="flex items-center justify-center w-7 h-7 rounded-lg border border-white/[0.08] bg-white/[0.03] text-slate-500 hover:text-white hover:border-brand-cyan/30 transition-colors disabled:opacity-40"
      >
        <motion.span
          animate={isLoading ? { rotate: 360 } : { rotate: 0 }}
          transition={isLoading ? { repeat: Infinity, duration: 0.8, ease: 'linear' } : { duration: 0.2 }}
          className="text-xs leading-none inline-block"
        >
          ↻
        </motion.span>
      </button>

      {/* Polling toggle */}
      <button
        onClick={onTogglePolling}
        title={isPolling ? 'ポーリング停止' : 'ポーリング開始'}
        className={[
          'flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-lg border transition-colors',
          isPolling
            ? 'border-brand-cyan/30 bg-brand-cyan/5 text-brand-cyan'
            : 'border-white/[0.06] bg-white/[0.03] text-slate-600 hover:text-slate-400',
        ].join(' ')}
      >
        {isPolling ? (
          <><span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-cyan animate-pulse" />30s</>
        ) : (
          <>⏸ paused</>
        )}
      </button>
    </div>
  )
}

/* ========== Last-updated caption ========== */

function LastUpdatedCaption({ ts, error }: { ts: string | null; error: string | null }) {
  if (error) return <span className="text-red-400">エラー: {error}</span>
  if (!ts)   return <span className="text-slate-700">— まだ更新なし</span>
  // Show clock time of last fetch — pure computation, no Date.now() in render
  const time = new Date(ts).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  return <span className="text-slate-600">最終更新: {time}</span>
}

/* ========== Component ========== */

export default function DashboardPage() {
  const {
    dashboard: m,
    runs,
    factories,
    activity,
    isLoading,
    isPolling,
    lastUpdated,
    error,
    refresh,
    start,
    stop,
  } = useOsPolling()

  function handleTogglePolling() {
    if (isPolling) stop()
    else start()
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Page header */}
      <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold font-heading text-white">Dashboard</h1>
            <p className="text-xs mt-0.5 font-mono flex items-center gap-2">
              <span className="text-slate-600">
                {new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
              <LastUpdatedCaption ts={lastUpdated} error={error} />
            </p>
          </div>
          <RefreshButton
            onRefresh={refresh}
            isLoading={isLoading}
            isPolling={isPolling}
            onTogglePolling={handleTogglePolling}
          />
        </div>
      </motion.div>

      {/* Loading flash bar */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ scaleX: 0, opacity: 1 }}
            animate={{ scaleX: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{ originX: 0 }}
            className="fixed top-14 left-16 lg:left-56 right-0 h-[2px] bg-gradient-to-r from-brand-blue to-brand-cyan z-40"
          />
        )}
      </AnimatePresence>

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
            trendVal={`Queue: ${m.queueDepth}件`}
          />
        </motion.div>
        <motion.div variants={fadeUp} custom={3}>
          <MetricCard
            label="Success Rate"
            value={`${m.successRateToday}%`}
            sub="成功率（本日）"
            accent="#10B981"
            trend="down"
            trendVal={`エラー ${m.errorsToday}件`}
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

        {/* Active Runs + Queue */}
        <motion.section custom={5} variants={fadeUp} initial="hidden" animate="visible" className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Active / Recent Runs</h2>
            <Link href="/os/workflows" className="text-[10px] text-slate-600 hover:text-slate-300 transition-colors">
              全て見る →
            </Link>
          </div>

          <div className="space-y-2">
            {runs.slice(0, 4).map((run) => (
              <Link
                key={run.id}
                href={`/os/workflows/${run.workflowId}`}
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
              </Link>
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
          {/* Factory 状態 */}
          <motion.section custom={6} variants={fadeUp} initial="hidden" animate="visible">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Factory 状態</h2>
              <Link href="/os/factories" className="text-[10px] text-slate-600 hover:text-slate-300 transition-colors">
                詳細 →
              </Link>
            </div>
            <div className="space-y-2">
              {factories.filter(f => f.status !== 'disabled').map((f) => (
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
              <AnimatePresence initial={false}>
                {activity.slice(0, 6).map((act, idx) => (
                  <motion.div
                    key={act.id}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: idx * 0.04 }}
                    className={['flex items-start gap-3 px-4 py-3', idx < 5 ? 'border-b border-white/[0.04]' : ''].join(' ')}
                  >
                    <span className={`text-xs mt-0.5 w-4 shrink-0 ${activityColor[act.type] ?? 'text-slate-400'}`}>
                      {activityIcon[act.type] ?? '·'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-400 leading-snug">{act.message}</p>
                      <p className="text-[10px] text-slate-600 font-mono mt-0.5">{formatRelativeTime(act.timestamp)}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  )
}
