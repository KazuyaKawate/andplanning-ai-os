'use client'

import { motion } from 'motion/react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import GradientText from '@/components/ui/GradientText'

/* ========== Animation Variants ========== */

const container = {
  hidden:  {},
  visible: {
    transition: { staggerChildren: 0.14 },
  },
}

const item = {
  hidden:  { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: [0.21, 0.47, 0.32, 0.98] as const,
    },
  },
}

/* ========== Stats ========== */

const stats = [
  { value: '6',      label: 'AI Factories'   },
  { value: '9step',  label: 'Workflow'        },
  { value: '3AI',    label: 'Providers'       },
]

/* ========== Component ========== */

export default function Hero() {
  return (
    <section
      className="relative min-h-screen flex items-center overflow-hidden bg-white"
      aria-label="ヒーローセクション"
    >
      {/* ---- Background decoration ---- */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {/* Top center glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full bg-gradient-to-b from-brand-blue/[0.07] via-brand-cyan/[0.04] to-transparent blur-3xl" />
        {/* Right accent */}
        <div className="absolute top-1/4 right-0 w-80 h-80 rounded-full bg-brand-cyan/[0.06] blur-3xl" />
        {/* Left accent */}
        <div className="absolute bottom-1/3 -left-20 w-64 h-64 rounded-full bg-brand-blue/[0.05] blur-3xl" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: [
              'linear-gradient(to right, #0F172A 1px, transparent 1px)',
              'linear-gradient(to bottom, #0F172A 1px, transparent 1px)',
            ].join(', '),
            backgroundSize: '72px 72px',
          }}
        />
      </div>

      {/* ---- Content ---- */}
      <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24 lg:pt-40 lg:pb-32">
        <motion.div
          variants={container}
          initial="hidden"
          animate="visible"
          className="text-center max-w-4xl mx-auto"
        >
          {/* Eyebrow badge */}
          <motion.div variants={item}>
            <Badge variant="default">AI Operating System</Badge>
          </motion.div>

          {/* Main heading */}
          <motion.h1
            variants={item}
            className="mt-8 text-5xl sm:text-6xl lg:text-[4.5rem] font-bold font-heading tracking-tight text-slate-900 leading-[1.08]"
          >
            Build Your{' '}
            <GradientText>AI Factory.</GradientText>
            <br />
            Operate Your Future.
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={item}
            className="mt-7 text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed"
          >
            AIが考え、AIが動き、AIが成果を積み重ねる。
            <br className="hidden sm:block" />
            And Planningは日本初のAI Operating Systemです。
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            variants={item}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button variant="primary" size="lg" href="#contact">
              お問い合わせ
            </Button>
            <Button variant="secondary" size="lg" href="#ai-os">
              詳しく見る →
            </Button>
          </motion.div>

          {/* Divider */}
          <motion.div variants={item} className="mt-20">
            <div className="w-px h-12 bg-gradient-to-b from-transparent via-slate-200 to-transparent mx-auto" />
          </motion.div>

          {/* Stats row */}
          <motion.div
            variants={item}
            className="mt-8 flex items-center justify-center gap-12 sm:gap-16"
          >
            {stats.map((stat, i) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl sm:text-3xl font-bold font-heading text-slate-900">
                  {stat.value}
                </p>
                <p className="mt-1 text-xs sm:text-sm text-slate-400 tracking-wide">
                  {stat.label}
                </p>
                {i < stats.length - 1 && (
                  <span className="sr-only">/</span>
                )}
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* ---- Scroll indicator ---- */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        aria-hidden="true"
      >
        <p className="text-xs text-slate-300 tracking-widest uppercase">Scroll</p>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
          className="w-px h-8 bg-gradient-to-b from-slate-300 to-transparent"
        />
      </motion.div>
    </section>
  )
}
