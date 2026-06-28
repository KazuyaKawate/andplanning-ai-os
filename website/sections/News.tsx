'use client'

import { motion } from 'motion/react'
import Link from 'next/link'
import SectionWrapper from '@/components/ui/SectionWrapper'
import Badge from '@/components/ui/Badge'
import { newsItems } from '@/data/site'
import { formatDate } from '@/lib/utils'

/* ========== Animation ========== */

const container = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.1 } },
}
const item = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.21, 0.47, 0.32, 0.98] as const } },
}

/* ========== Category color map ========== */

const categoryColor: Record<string, string> = {
  Launch:  'text-brand-cyan border-brand-cyan/30 bg-brand-cyan/5',
  Release: 'text-brand-blue border-brand-blue/30 bg-brand-blue/5',
  Update:  'text-emerald-600 border-emerald-300 bg-emerald-50',
}

/* ========== Component ========== */

export default function News() {
  const sorted = [...newsItems].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <SectionWrapper id="news" background="light">
      <motion.div
        variants={container}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
        className="max-w-3xl mx-auto"
      >
        {/* Header */}
        <motion.div variants={item} className="text-center">
          <Badge variant="default">News</Badge>
          <h2 className="mt-6 text-4xl lg:text-5xl font-bold font-heading text-slate-900 tracking-tight">
            最新情報
          </h2>
          <p className="mt-5 text-lg text-slate-500">
            And Planning の開発状況・リリース情報をお届けします。
          </p>
        </motion.div>

        {/* News list */}
        <ol className="mt-12 space-y-4">
          {sorted.map((newsItem) => (
            <motion.li key={newsItem.id} variants={item}>
              <Link
                href={newsItem.href}
                className="group flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 rounded-xl border border-slate-100 bg-white px-6 py-5 hover:border-slate-200 hover:shadow-md transition-all duration-300"
                aria-label={newsItem.title}
              >
                {/* Date + category */}
                <div className="flex items-center gap-3 shrink-0">
                  <time
                    dateTime={newsItem.date}
                    className="text-xs font-mono text-slate-400 w-28 shrink-0"
                  >
                    {formatDate(newsItem.date)}
                  </time>
                  <span
                    className={[
                      'text-[10px] font-semibold px-2.5 py-1 rounded-full border shrink-0',
                      categoryColor[newsItem.category] ?? 'text-slate-500 border-slate-200 bg-slate-50',
                    ].join(' ')}
                  >
                    {newsItem.category}
                  </span>
                </div>

                {/* Title */}
                <p className="text-sm font-medium text-slate-700 group-hover:text-slate-900 leading-snug transition-colors flex-1">
                  {newsItem.title}
                </p>

                {/* Arrow */}
                <span
                  className="text-slate-300 group-hover:text-slate-500 transition-colors shrink-0 hidden sm:block"
                  aria-hidden="true"
                >
                  →
                </span>
              </Link>
            </motion.li>
          ))}
        </ol>

        {/* Empty state guard */}
        {sorted.length === 0 && (
          <motion.p
            variants={item}
            className="mt-10 text-center text-sm text-slate-400"
          >
            現在ニュースはありません。
          </motion.p>
        )}
      </motion.div>
    </SectionWrapper>
  )
}
