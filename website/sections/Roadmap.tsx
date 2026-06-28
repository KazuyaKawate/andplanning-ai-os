'use client'

import { motion } from 'motion/react'
import SectionWrapper from '@/components/ui/SectionWrapper'
import Badge from '@/components/ui/Badge'
import { roadmapItems } from '@/data/site'
import type { RoadmapItem } from '@/types'
import { cn } from '@/lib/utils'

/* ========== Animation ========== */

const container = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.08 } },
}
const item = {
  hidden:  { opacity: 0, x: -16 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] as const } },
}

/* ========== Status styles ========== */

const dotStyle: Record<RoadmapItem['status'], string> = {
  completed:   'bg-brand-cyan border-brand-cyan/50',
  'in-progress': 'bg-brand-blue border-brand-blue/50 ring-4 ring-brand-blue/20',
  planned:     'bg-slate-200 border-slate-300',
}

const cardStyle: Record<RoadmapItem['status'], string> = {
  completed:   'border-brand-cyan/20 bg-white',
  'in-progress': 'border-brand-blue/40 bg-white shadow-md shadow-brand-blue/5',
  planned:     'border-slate-100 bg-white',
}

const labelStyle: Record<RoadmapItem['status'], string> = {
  completed:   'text-brand-cyan',
  'in-progress': 'text-brand-blue',
  planned:     'text-slate-400',
}

const labelText: Record<RoadmapItem['status'], string> = {
  completed:   '完了',
  'in-progress': '進行中',
  planned:     '予定',
}

/* ========== Component ========== */

export default function Roadmap() {
  return (
    <SectionWrapper id="roadmap" background="white">
      <motion.div
        variants={container}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.05 }}
        className="max-w-3xl mx-auto"
      >
        {/* Header */}
        <motion.div variants={item} className="text-center">
          <Badge variant="default">Roadmap</Badge>
          <h2 className="mt-6 text-4xl lg:text-5xl font-bold font-heading text-slate-900 tracking-tight">
            開発ロードマップ
          </h2>
          <p className="mt-5 text-lg text-slate-500 leading-relaxed">
            AI Router から始まり、6 つの Factory を経て AI OS v1.0 へ。
            <br className="hidden sm:block" />
            2025 Q4 〜 2027 Q2 の軌跡。
          </p>
        </motion.div>

        {/* Timeline */}
        <div className="mt-14 relative">
          {/* Vertical line */}
          <div
            className="absolute left-[18px] top-2 bottom-2 w-px bg-gradient-to-b from-brand-cyan via-brand-blue to-slate-200"
            aria-hidden="true"
          />

          <ol className="space-y-5">
            {roadmapItems.map((roadmapItem, idx) => (
              <motion.li
                key={`${roadmapItem.date}-${roadmapItem.title}`}
                variants={item}
                className="relative flex gap-6"
              >
                {/* Dot */}
                <div className="relative z-10 mt-3 shrink-0">
                  <div
                    className={cn(
                      'w-9 h-9 rounded-full border-2 flex items-center justify-center',
                      dotStyle[roadmapItem.status],
                    )}
                    aria-hidden="true"
                  >
                    {roadmapItem.status === 'completed' && (
                      <span className="text-white text-xs font-bold">✓</span>
                    )}
                    {roadmapItem.status === 'in-progress' && (
                      <motion.span
                        className="w-2 h-2 rounded-full bg-white"
                        animate={{ scale: [1, 1.4, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                      />
                    )}
                    {roadmapItem.status === 'planned' && (
                      <span className="w-2 h-2 rounded-full bg-slate-300" />
                    )}
                  </div>
                </div>

                {/* Card */}
                <div
                  className={cn(
                    'flex-1 rounded-xl border px-5 py-4 transition-all duration-300 hover:shadow-md',
                    cardStyle[roadmapItem.status],
                    roadmapItem.isHighlight && 'ring-2 ring-brand-blue/20',
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-medium text-slate-400">
                          {roadmapItem.date}
                        </span>
                        {roadmapItem.isHighlight && (
                          <span className="text-[10px] font-semibold bg-brand-blue/10 text-brand-blue px-2 py-0.5 rounded-full">
                            Milestone
                          </span>
                        )}
                      </div>
                      <h3 className="mt-1 text-base font-bold font-heading text-slate-900 leading-snug">
                        {roadmapItem.title}
                      </h3>
                      <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">
                        {roadmapItem.descriptionJa}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'text-xs font-semibold shrink-0 mt-0.5',
                        labelStyle[roadmapItem.status],
                      )}
                    >
                      {labelText[roadmapItem.status]}
                    </span>
                  </div>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>

        {/* Footer note */}
        <motion.p
          variants={item}
          className="mt-10 text-center text-xs text-slate-400"
        >
          ロードマップは開発状況により変更になる場合があります。
        </motion.p>
      </motion.div>
    </SectionWrapper>
  )
}
