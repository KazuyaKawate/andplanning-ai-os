'use client'

import { useEffect, useRef } from 'react'
import { motion, useScroll, useTransform, useInView, animate } from 'motion/react'
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

/* ========== Animated Counter ========== */

function AnimCounter({ to, suffix = '' }: { to: number; suffix?: string }) {
  const ref   = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })

  useEffect(() => {
    if (!inView || !ref.current) return
    const el = ref.current
    const ctrl = animate(0, to, {
      duration: 1.6,
      ease: [0.21, 0.47, 0.32, 0.98],
      onUpdate: (v) => { el.textContent = Math.round(v).toString() + suffix },
    })
    return ctrl.stop
  }, [inView, to, suffix])

  return <span ref={ref}>0{suffix}</span>
}

/* ========== Stats ========== */

const stats = [
  { label: 'AI Factories',  num: 6,  suffix: '',   display: '6'     },
  { label: 'Workflow',      num: 9,  suffix: 'step', display: '9step' },
  { label: 'AI Providers',  num: 3,  suffix: ' AI', display: '3 AI'  },
]

/* ========== Component ========== */

export default function Hero() {
  const { scrollY } = useScroll()
  const parallaxY = useTransform(scrollY, [0, 800], [0, -40])

  return (
    <section
      className="relative min-h-screen flex items-center overflow-hidden bg-white"
      aria-label="ヒーローセクション"
    >
      {/* ---- Animated background ---- */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {/* Pulsing aurora orb — top right */}
        <motion.div
          className="absolute top-[-100px] right-[-100px] w-[800px] h-[800px] rounded-full"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(37,99,235,0.10) 0%, rgba(6,182,212,0.06) 45%, transparent 70%)',
          }}
          animate={{ scale: [1, 1.12, 1], x: [0, 18, 0], y: [0, -22, 0] }}
          transition={{ repeat: Infinity, duration: 11, ease: 'easeInOut' }}
        />
        {/* Secondary orb — mid right */}
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 right-[-60px] w-[480px] h-[480px] rounded-full"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(6,182,212,0.06) 0%, transparent 70%)',
          }}
          animate={{ scale: [1, 1.08, 1], y: [0, 20, 0] }}
          transition={{ repeat: Infinity, duration: 8, ease: 'easeInOut', delay: 2 }}
        />
        {/* Bottom left accent */}
        <motion.div
          className="absolute bottom-1/4 left-[-40px] w-72 h-72 rounded-full"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(37,99,235,0.07) 0%, transparent 70%)',
          }}
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ repeat: Infinity, duration: 9, ease: 'easeInOut', delay: 4 }}
        />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.022]"
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
            {/* Badge with glow ring */}
            <motion.div variants={textItem} className="inline-flex items-center justify-center lg:justify-start">
              <span className="relative inline-flex">
                <span
                  className="absolute -inset-1 rounded-full blur-sm opacity-60"
                  style={{ background: 'radial-gradient(ellipse, rgba(6,182,212,0.3) 0%, transparent 70%)' }}
                  aria-hidden="true"
                />
                <Badge variant="default" className="relative">AI Operating System</Badge>
              </span>
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

            {/* Stats — with animated counters */}
            <motion.div
              variants={textItem}
              className="mt-12 flex items-center justify-center lg:justify-start divide-x divide-slate-100"
            >
              {stats.map((stat) => (
                <div key={stat.label} className="text-center lg:text-left px-6 first:pl-0 last:pr-0">
                  <p className="text-2xl sm:text-3xl font-bold font-heading text-slate-900 tabular-nums">
                    <AnimCounter to={stat.num} suffix={stat.suffix} />
                  </p>
                  <p className="mt-0.5 text-xs sm:text-sm text-slate-400">{stat.label}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right: Visual — parallax + 3D hover */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, delay: 0.35, ease: [0.21, 0.47, 0.32, 0.98] }}
            style={{ y: parallaxY }}
            className="order-first lg:order-last"
          >
            {/* Float animation */}
            <motion.div
              animate={{ y: [0, -14, 0] }}
              transition={{ repeat: Infinity, duration: 5.5, ease: 'easeInOut' }}
              className="relative"
            >
              {/* Glow behind card — breathes with float */}
              <motion.div
                className="absolute -inset-6 rounded-3xl pointer-events-none"
                style={{
                  background:
                    'radial-gradient(ellipse at 60% 40%, rgba(37,99,235,0.22) 0%, rgba(6,182,212,0.12) 50%, transparent 80%)',
                }}
                animate={{ opacity: [0.6, 1, 0.6], scale: [0.96, 1.04, 0.96] }}
                transition={{ repeat: Infinity, duration: 5.5, ease: 'easeInOut' }}
                aria-hidden="true"
              />

              {/* Glass card wrapper with 3D hover tilt */}
              <motion.div
                className="relative rounded-2xl overflow-hidden ring-1 ring-white/20 shadow-2xl bg-white/5 backdrop-blur-[2px]"
                whileHover={{ rotateY: 3, rotateX: -2, scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                style={{ transformStyle: 'preserve-3d' }}
              >
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
                      'linear-gradient(135deg, rgba(255,255,255,0.10) 0%, transparent 50%)',
                  }}
                  aria-hidden="true"
                />
              </motion.div>
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
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
          className="w-px h-8 bg-gradient-to-b from-slate-300 to-transparent"
        />
      </motion.div>
    </section>
  )
}
