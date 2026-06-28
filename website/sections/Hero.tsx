'use client'

import { motion, useScroll, useTransform } from 'motion/react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import GradientText from '@/components/ui/GradientText'
import SmartImage from '@/components/ui/SmartImage'
import { sectionImages } from '@/config/images'

/* ========== Animation Variants ========== */

const container = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.13 } },
}
const textItem = {
  hidden:  { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.21, 0.47, 0.32, 0.98] as const } },
}

/* ========== Stats ========== */

const stats = [
  { value: '6',     label: 'AI Factories' },
  { value: '9step', label: 'Workflow'      },
  { value: '3 AI',  label: 'Providers'    },
]

/* ========== Component ========== */

export default function Hero() {
  const { scrollY } = useScroll()
  /* 視差: スクロール 0→800px で画像を 0→−40px 上にシフト */
  const parallaxY = useTransform(scrollY, [0, 800], [0, -40])

  return (
    <section
      className="relative min-h-screen flex items-center overflow-hidden bg-white"
      aria-label="ヒーローセクション"
    >
      {/* ---- Background decorations ---- */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] rounded-full bg-gradient-to-bl from-brand-blue/[0.08] via-brand-cyan/[0.04] to-transparent blur-3xl" />
        <div className="absolute top-1/2 -translate-y-1/2 right-0 w-[500px] h-[500px] rounded-full bg-brand-cyan/[0.04] blur-3xl" />
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

      {/* ---- Content grid ---- */}
      <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20 lg:pt-36 lg:pb-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Left: Text */}
          <motion.div
            variants={container}
            initial="hidden"
            animate="visible"
            className="text-center lg:text-left"
          >
            <motion.div variants={textItem}>
              <Badge variant="default">AI Operating System</Badge>
            </motion.div>

            <motion.h1
              variants={textItem}
              className="mt-7 text-5xl sm:text-6xl lg:text-[4rem] xl:text-[4.5rem] font-bold font-heading tracking-tight text-slate-900 leading-[1.06]"
            >
              Build Your{' '}
              <GradientText>AI Factory.</GradientText>
              <br />
              Operate Your
              <br />
              Future.
            </motion.h1>

            <motion.p
              variants={textItem}
              className="mt-6 text-lg sm:text-xl text-slate-500 max-w-xl leading-relaxed mx-auto lg:mx-0"
            >
              AIが考え、AIが動き、AIが成果を積み重ねる。
              <br className="hidden sm:block" />
              And Planningは日本初のAI Operating Systemです。
            </motion.p>

            <motion.div
              variants={textItem}
              className="mt-9 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4"
            >
              <Button variant="primary" size="lg" href="#contact">
                お問い合わせ
              </Button>
              <Button variant="secondary" size="lg" href="#ai-os">
                詳しく見る →
              </Button>
            </motion.div>

            {/* Stats */}
            <motion.div
              variants={textItem}
              className="mt-12 flex items-center justify-center lg:justify-start gap-10 sm:gap-14"
            >
              {stats.map((stat) => (
                <div key={stat.label} className="text-center lg:text-left">
                  <p className="text-2xl sm:text-3xl font-bold font-heading text-slate-900">
                    {stat.value}
                  </p>
                  <p className="mt-0.5 text-xs sm:text-sm text-slate-400">{stat.label}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right: Visual — parallax container */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, delay: 0.35, ease: [0.21, 0.47, 0.32, 0.98] }}
            style={{ y: parallaxY }}
            className="order-first lg:order-last"
          >
            {/* 浮遊アニメーション */}
            <motion.div
              animate={{ y: [0, -12, 0] }}
              transition={{ repeat: Infinity, duration: 5.5, ease: 'easeInOut' }}
              className="relative"
            >
              {/* Glow behind card */}
              <div
                className="absolute -inset-4 rounded-3xl opacity-30 blur-2xl pointer-events-none"
                style={{
                  background:
                    'radial-gradient(ellipse at 60% 40%, #2563EB 0%, #06B6D4 50%, transparent 80%)',
                }}
                aria-hidden="true"
              />

              {/* Glass card wrapper */}
              <div className="relative rounded-2xl overflow-hidden ring-1 ring-white/20 shadow-2xl bg-white/5 backdrop-blur-[2px]">
                <SmartImage
                  image={sectionImages.heroVisual}
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="w-full h-auto block"
                />

                {/* Glass reflection overlay */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 50%)',
                  }}
                  aria-hidden="true"
                />
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* ---- Scroll indicator ---- */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.6 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5"
        aria-hidden="true"
      >
        <p className="text-[10px] text-slate-300 tracking-widest uppercase">Scroll</p>
        <motion.div
          animate={{ y: [0, 7, 0] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
          className="w-px h-8 bg-gradient-to-b from-slate-300 to-transparent"
        />
      </motion.div>
    </section>
  )
}
