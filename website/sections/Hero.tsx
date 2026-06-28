'use client'

import { motion } from 'motion/react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import GradientText from '@/components/ui/GradientText'
import PlaceholderImage from '@/components/ui/PlaceholderImage'

/* ========== Animation Variants ========== */

const container = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.13 } },
}
const item = {
  hidden:  { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.21, 0.47, 0.32, 0.98] as const },
  },
}
const visualVariant = {
  hidden:  { opacity: 0, x: 32, scale: 0.96 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { duration: 0.9, delay: 0.3, ease: [0.21, 0.47, 0.32, 0.98] as const },
  },
}

/* ========== Stats ========== */

const stats = [
  { value: '6',     label: 'AI Factories'  },
  { value: '9step', label: 'Workflow'       },
  { value: '3 AI',  label: 'Providers'     },
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
        <div className="absolute top-0 right-0 w-[700px] h-[700px] rounded-full bg-gradient-to-bl from-brand-blue/[0.07] via-brand-cyan/[0.04] to-transparent blur-3xl" />
        <div className="absolute bottom-1/4 left-0 w-64 h-64 rounded-full bg-brand-blue/[0.05] blur-3xl" />
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

      {/* ---- Main content ---- */}
      <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20 lg:pt-36 lg:pb-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* Left: Text */}
          <motion.div
            variants={container}
            initial="hidden"
            animate="visible"
            className="text-center lg:text-left"
          >
            <motion.div variants={item}>
              <Badge variant="default">AI Operating System</Badge>
            </motion.div>

            <motion.h1
              variants={item}
              className="mt-7 text-5xl sm:text-6xl lg:text-[4rem] xl:text-[4.5rem] font-bold font-heading tracking-tight text-slate-900 leading-[1.08]"
            >
              Build Your{' '}
              <GradientText>AI Factory.</GradientText>
              <br />
              Operate Your
              <br />
              Future.
            </motion.h1>

            <motion.p
              variants={item}
              className="mt-6 text-lg sm:text-xl text-slate-500 max-w-xl leading-relaxed mx-auto lg:mx-0"
            >
              AIが考え、AIが動き、AIが成果を積み重ねる。
              <br className="hidden sm:block" />
              And Planningは日本初のAI Operating Systemです。
            </motion.p>

            <motion.div
              variants={item}
              className="mt-8 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4"
            >
              <Button variant="primary" size="lg" href="#contact">
                お問い合わせ
              </Button>
              <Button variant="secondary" size="lg" href="#ai-os">
                詳しく見る →
              </Button>
            </motion.div>

            {/* Stats row */}
            <motion.div
              variants={item}
              className="mt-12 flex items-center justify-center lg:justify-start gap-10 sm:gap-14"
            >
              {stats.map((stat, i) => (
                <div key={stat.label} className="text-center lg:text-left">
                  <p className="text-2xl sm:text-3xl font-bold font-heading text-slate-900">
                    {stat.value}
                  </p>
                  <p className="mt-0.5 text-xs sm:text-sm text-slate-400">
                    {stat.label}
                  </p>
                  {i < stats.length - 1 && <span className="sr-only">/</span>}
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right: Hero visual */}
          <motion.div
            variants={visualVariant}
            initial="hidden"
            animate="visible"
            className="relative flex items-center justify-center order-first lg:order-last"
          >
            {/* Glow behind the card */}
            <div
              className="absolute inset-0 rounded-2xl blur-2xl opacity-30 pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse at center, #2563EB 0%, transparent 70%)',
              }}
              aria-hidden="true"
            />

            <div className="relative w-full max-w-sm sm:max-w-md lg:max-w-none rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
              <PlaceholderImage
                src="/images/hero-visual.svg"
                alt="And Planning AI OS — 6 Factoryのリアルタイムダッシュボード"
                width={560}
                height={460}
                priority
                className="w-full h-auto"
                fallbackBg="#0F172A"
              />
            </div>
          </motion.div>
        </div>
      </div>

      {/* ---- Scroll indicator ---- */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.6 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5"
        aria-hidden="true"
      >
        <p className="text-[10px] text-slate-300 tracking-widest uppercase">Scroll</p>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
          className="w-px h-8 bg-gradient-to-b from-slate-300 to-transparent"
        />
      </motion.div>
    </section>
  )
}
