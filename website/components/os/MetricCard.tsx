'use client'

import { motion } from 'motion/react'

interface Props {
  label:     string
  value:     string | number
  sub?:      string
  accent?:   string
  icon?:     React.ReactNode
  trend?:    'up' | 'down' | 'neutral'
  trendVal?: string
}

export default function MetricCard({ label, value, sub, accent = '#22D3EE', icon, trend, trendVal }: Props) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-5 py-4 space-y-3"
    >
      <div className="flex items-start justify-between">
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        {icon && <span className="text-slate-600">{icon}</span>}
      </div>

      <div>
        <p className="text-2xl font-bold font-mono" style={{ color: accent }}>{value}</p>
        {sub && <p className="mt-0.5 text-xs text-slate-600">{sub}</p>}
      </div>

      {trend && trendVal && (
        <p className={[
          'text-[10px] font-mono',
          trend === 'up'   ? 'text-emerald-500' : '',
          trend === 'down' ? 'text-red-400'     : '',
          trend === 'neutral' ? 'text-slate-600' : '',
        ].join(' ')}>
          {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendVal}
        </p>
      )}
    </motion.div>
  )
}
