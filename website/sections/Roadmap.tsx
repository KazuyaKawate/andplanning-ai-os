'use client'

import { useRef } from 'react'
import { motion, useInView } from 'motion/react'
import SectionWrapper from '@/components/ui/SectionWrapper'
import Badge from '@/components/ui/Badge'
import SmartImage from '@/components/ui/SmartImage'
import { roadmapItems, phases } from '@/data/site'
import { sectionImages } from '@/config/images'
import type { RoadmapItem } from '@/types'
import { cn } from '@/lib/utils'

/* ========== Animation ========== */

const container = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.08 } },
}
const slideUp = {
  hidden:  { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] as const } },
}

/* ========== Status styles ========== */

const dotStyle: Record<RoadmapItem['status'], string> = {
  completed:     'bg-brand-cyan border-brand-cyan/50',
  'in-progress': 'bg-brand-blue border-brand-blue/50 ring-4 ring-brand-blue/20',
  planned:       'bg-slate-200 border-slate-300',
}

const cardStyle: Record<RoadmapItem['status'], string> = {
  completed:     'border-brand-cyan/20 bg-white',
  'in-progress': 'border-brand-blue/40 bg-blue-50/40 shadow-md shadow-brand-blue/5',
  planned:       'border-slate-100 bg-white',
}

const labelStyle: Record<RoadmapItem['status'], string> = {
  completed:     'text-brand-cyan',
  'in-progress': 'text-brand-blue',
  planned:       'text-slate-400',
}

const labelText: Record<RoadmapItem['status'], string> = {
  completed:     '完了',
  'in-progress': '進行中',
  planned:       '予定',
}

const phaseBarColor: Record<string, string> = {
  completed:     'bg-brand-cyan',
  'in-progress': 'bg-brand-blue',
  planned:       'bg-slate-200',
}

/* ========== Animated timeline line ========== */

function TimelineLine() {
  const ref    = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.05 })

  return (
    <div
      ref={ref}
      className="absolute left-[18px] top-2 bottom-2 w-px overflow-hidden"
      aria-hidden="true"
    >
      {/* Base track */}
      <div className="absolute inset-0 bg-slate-100" />
      {/* Animated fill */}
      <motion.div
        className="absolute top-0 left-0 right-0 bg-gradient-to-b from-brand-cyan via-brand-blue to-slate-200"
        initial={{ height: 0 }}
        animate={{ height: inView ? '100%' : 0 }}
        transition={{ duration: 1.8, ease: [0.21, 0.47, 0.32, 0.98], delay: 0.2 }}
      />
    </div>
  )
}

/* ========== Single timeline item ========== */

function TimelineItem({ roadmapItem, index }: { roadmapItem: RoadmapItem; index: number }) {
  const ref    = useRef<HTMLLIElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.3 })

  return (
    <motion.li
      ref={ref}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: inView ? 1 : 0, x: inView ? 0 : -20 }}
      transition={{ duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98], delay: index * 0.05 }}
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
              animate={{ scale: [1, 1.5, 1] }}
              transition={{ repeat: Infinity, duration: 1.8 }}
            />
          )}
          {roadmapItem.status === 'planned' && (
            <span className="w-2 h-2 rounded-full bg-slate-300" />
          )}
        </div>
      </div>

      {/* Card */}
      <motion.div
        whileHover={{ x: 4 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        className={cn(
          'flex-1 rounded-xl border px-5 py-4 transition-shadow duration-300 hover:shadow-md',
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
          <span className={cn('text-xs font-semibold shrink-0 mt-0.5', labelStyle[roadmapItem.status])}>
            {labelText[roadmapItem.status]}
          </span>
        </div>
      </motion.div>
    </motion.li>
  )
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
      >
        {/* Header */}
        <motion.div variants={slideUp} className="text-center max-w-3xl mx-auto">
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

        {/* 2-column: timeline + sticky visual */}
        <div className="mt-14 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-12 xl:gap-16 items-start">

          {/* ---- Left: Timeline ---- */}
          <div className="relative">
            <TimelineLine />

            <ol className="space-y-5">
              {roadmapItems.map((roadmapItem, index) => (
                <TimelineItem
                  key={`${roadmapItem.date}-${roadmapItem.title}`}
                  roadmapItem={roadmapItem}
                  index={index}
                />
              ))}
            </ol>

            <motion.p
              variants={slideUp}
              className="mt-10 text-xs text-slate-400 pl-14"
            >
              ロードマップは開発状況により変更になる場合があります。
            </motion.p>
          </div>

          {/* ---- Right: Sticky visual + phase summary ---- */}
          <motion.div variants={slideUp} className="hidden lg:block">
            <div className="sticky top-24 space-y-6">
              {/* Roadmap visual */}
              <div className="rounded-2xl overflow-hidden ring-1 ring-slate-100 shadow-sm">
                <SmartImage
                  image={sectionImages.roadmapVisual}
                  sizes="300px"
                  className="w-full h-auto block"
                />
              </div>

              {/* Phase progress */}
              <div className="rounded-2xl border border-slate-100 bg-white p-6">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-5">
                  Phase 進捗
                </p>
                <div className="space-y-5">
                  {phases.map((phase) => (
                    <div key={phase.number}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-slate-700">
                          {phase.number}. {phase.title}
                        </span>
                        <span
                          className={cn(
                            'text-xs font-bold',
                            phase.status === 'completed'   && 'text-brand-cyan',
                            phase.status === 'in-progress' && 'text-brand-blue',
                            phase.status === 'planned'     && 'text-slate-400',
                          )}
                        >
                          {phase.percentage}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <motion.div
                          className={cn('h-full rounded-full', phaseBarColor[phase.status])}
                          initial={{ width: 0 }}
                          whileInView={{ width: `${phase.percentage}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
                        />
                      </div>
                      <p className="mt-1 text-[10px] text-slate-400 leading-snug">{phase.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </SectionWrapper>
  )
}
