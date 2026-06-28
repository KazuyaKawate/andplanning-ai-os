'use client'

import { motion } from 'motion/react'
import SectionWrapper from '@/components/ui/SectionWrapper'
import Badge from '@/components/ui/Badge'

/* ========== Data ========== */

const pillars = [
  {
    icon: '◎',
    title: 'Mission',
    body: 'AIの力で、すべての個人の生産性を10倍にする。規模の大小を問わず、誰もが高品質なアウトプットを持てる世界を作る。',
    color: '#2563EB',
  },
  {
    icon: '✦',
    title: 'Vision',
    body: '日本からAI Factoryの世界標準を創る。人とAIが共創する次世代のオペレーティングシステムを世界に届ける。',
    color: '#06B6D4',
  },
  {
    icon: '◈',
    title: 'Values',
    points: ['実用性 — 動くものだけを届ける', '透明性 — AIの判断を可視化する', '信頼性 — 品質を保証するWorkflow'],
    color: '#8B5CF6',
  },
]

/* ========== Animation ========== */

const container = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.12 } },
}
const item = {
  hidden:  { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.21, 0.47, 0.32, 0.98] as const } },
}

/* ========== Component ========== */

export default function About() {
  return (
    <SectionWrapper id="about" background="white">
      <motion.div
        variants={container}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
        className="max-w-5xl mx-auto"
      >
        {/* Header */}
        <motion.div variants={item} className="text-center">
          <Badge variant="default">About</Badge>
          <h2 className="mt-6 text-4xl lg:text-5xl font-bold font-heading text-slate-900 tracking-tight">
            And Planningとは
          </h2>
          <p className="mt-5 text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
            AIを道具ではなく、チームメンバーとして設計する。
            <br className="hidden sm:block" />
            私たちはその思想を、プロダクトで証明します。
          </p>
        </motion.div>

        {/* Philosophy row */}
        <motion.div variants={item} className="mt-14 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-8">
          {['AIが考える', 'AIが動く', 'AIが積み重ねる', '人が判断する'].map((phrase, i) => (
            <div key={phrase} className="flex items-center gap-3">
              <span className={`text-base font-medium ${i === 3 ? 'text-brand-blue' : 'text-slate-700'}`}>
                {phrase}
              </span>
              {i < 3 && (
                <span className="text-brand-cyan text-sm hidden sm:block" aria-hidden="true">→</span>
              )}
            </div>
          ))}
        </motion.div>

        {/* Mission / Vision / Values */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6">
          {pillars.map((p) => (
            <motion.div
              key={p.title}
              variants={item}
              className="relative rounded-2xl border border-slate-100 bg-white p-8 hover:shadow-lg hover:border-slate-200 transition-all duration-300 group"
            >
              {/* Top accent gradient */}
              <div
                className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl opacity-60 group-hover:opacity-100 transition-opacity"
                style={{ background: `linear-gradient(90deg, ${p.color}, transparent)` }}
                aria-hidden="true"
              />

              <span className="text-3xl" style={{ color: p.color }} aria-hidden="true">
                {p.icon}
              </span>

              <h3 className="mt-4 text-xl font-bold font-heading text-slate-900">
                {p.title}
              </h3>

              {p.body ? (
                <p className="mt-3 text-sm text-slate-500 leading-relaxed">{p.body}</p>
              ) : (
                <ul className="mt-3 space-y-2.5">
                  {p.points!.map((pt) => {
                    const [key, val] = pt.split(' — ')
                    return (
                      <li key={pt} className="flex items-start gap-2 text-sm text-slate-500">
                        <span className="mt-0.5 font-semibold text-slate-700 shrink-0">{key}</span>
                        <span className="text-slate-400">—</span>
                        <span>{val}</span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </motion.div>
          ))}
        </div>

        {/* Bottom philosophy quote */}
        <motion.div variants={item} className="mt-20">
          <div className="relative rounded-2xl bg-slate-50 border border-slate-100 px-8 sm:px-14 py-10 text-center overflow-hidden">
            {/* Glow backdrop */}
            <div
              className="absolute inset-0 opacity-[0.04] pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse at center, #2563EB 0%, transparent 70%)',
              }}
              aria-hidden="true"
            />

            <p className="relative text-2xl lg:text-3xl font-heading font-medium text-slate-800 leading-snug tracking-tight">
              &ldquo;AIが考え、AIが動き、AIが成果を積み重ねる。
              <br className="hidden sm:block" />
              <span className="gradient-text">そして人が判断し、未来を決める。</span>&rdquo;
            </p>
            <p className="mt-4 text-sm text-slate-400 font-mono tracking-wide">
              And Planning — AI First Philosophy
            </p>
          </div>
        </motion.div>
      </motion.div>
    </SectionWrapper>
  )
}
