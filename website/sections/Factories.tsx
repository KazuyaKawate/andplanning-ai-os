'use client'

import { motion } from 'motion/react'
import SectionWrapper from '@/components/ui/SectionWrapper'
import Badge from '@/components/ui/Badge'
import { factories } from '@/data/site'
import type { Factory } from '@/types'

/* ========== Animation ========== */

const container = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.09 } },
}
const item = {
  hidden:  { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] as const } },
}

/* ========== Status label map ========== */

const statusVariantMap: Record<Factory['status'], 'active' | 'stub' | 'planned'> = {
  active:  'active',
  stub:    'stub',
  planned: 'planned',
}

const statusLabelMap: Record<Factory['status'], string> = {
  active:  '提供中',
  stub:    'スタブ実装済',
  planned: '計画中',
}

/* ========== FactoryCard ========== */

function FactoryCard({ factory }: { factory: Factory }) {
  const isActive = factory.status === 'active'

  return (
    <motion.article
      variants={item}
      className="group relative flex flex-col rounded-2xl border border-slate-100 bg-white overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
    >
      {/* Accent top bar */}
      <div
        className="h-1 w-full shrink-0 transition-all duration-300 group-hover:h-1.5"
        style={{ backgroundColor: factory.accentColor }}
        aria-hidden="true"
      />

      <div className="flex flex-col flex-1 p-7">
        {/* Icon + status */}
        <div className="flex items-start justify-between">
          <span
            className="text-4xl leading-none"
            style={{ color: factory.accentColor }}
            aria-hidden="true"
          >
            {factory.icon}
          </span>
          <Badge variant={statusVariantMap[factory.status]}>
            {statusLabelMap[factory.status]}
          </Badge>
        </div>

        {/* Title */}
        <div className="mt-5">
          <h3 className="text-xl font-bold font-heading text-slate-900 tracking-tight">
            {factory.name}
          </h3>
          <p className="text-sm text-slate-400 mt-0.5">{factory.nameJa}</p>
        </div>

        {/* Description */}
        <p className="mt-4 text-sm text-slate-500 leading-relaxed">
          {factory.descriptionJa}
        </p>

        {/* Features */}
        <div className="mt-5 flex-1">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">できること</p>
          <ul className="space-y-2">
            {factory.features.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-slate-600">
                <span
                  className="mt-0.5 w-1 h-1 rounded-full shrink-0 mt-1.5"
                  style={{ backgroundColor: factory.accentColor }}
                  aria-hidden="true"
                />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Release label */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-400">β公開予定</span>
          <span
            className="text-sm font-bold font-mono"
            style={{ color: isActive ? '#2563EB' : '#94A3B8' }}
          >
            {factory.releaseLabel}
          </span>
        </div>
      </div>
    </motion.article>
  )
}

/* ========== Component ========== */

export default function Factories() {
  return (
    <SectionWrapper id="factories" background="light">
      <motion.div
        variants={container}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.06 }}
      >
        {/* Header */}
        <motion.div variants={item} className="text-center max-w-3xl mx-auto">
          <Badge variant="default">AI Factories</Badge>
          <h2 className="mt-6 text-4xl lg:text-5xl font-bold font-heading text-slate-900 tracking-tight">
            6つのAI Factory
          </h2>
          <p className="mt-5 text-lg text-slate-500 leading-relaxed">
            各 Factory は独立した AI エージェントとして動作します。
            <br className="hidden sm:block" />
            Workflow Engine を通じてタスクを受け取り、成果を自律的に生成します。
          </p>
        </motion.div>

        {/* Factory grid */}
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {factories.map((factory) => (
            <FactoryCard key={factory.id} factory={factory} />
          ))}
        </div>

        {/* Bottom note */}
        <motion.p
          variants={item}
          className="mt-10 text-center text-sm text-slate-400"
        >
          全 Factory は共通の Factory Framework 上に実装されており、将来も同じ設計で拡張できます。
        </motion.p>
      </motion.div>
    </SectionWrapper>
  )
}
