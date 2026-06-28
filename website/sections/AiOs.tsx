'use client'

import { motion } from 'motion/react'
import SectionWrapper from '@/components/ui/SectionWrapper'
import Badge from '@/components/ui/Badge'
import { osLayers } from '@/data/site'

/* ========== Animation ========== */

const container = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.1 } },
}
const item = {
  hidden:  { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] as const } },
}

/* ========== Layer Colors ========== */

const layerStyles: Record<string, { bg: string; border: string; label: string }> = {
  foundation: { bg: 'bg-brand-deep-navy',  border: 'border-white/[0.08]', label: 'text-brand-cyan'       },
  engine:     { bg: 'bg-brand-navy',        border: 'border-white/[0.10]', label: 'text-brand-blue-bright' },
  factory:    { bg: 'bg-brand-navy-light',  border: 'border-white/[0.12]', label: 'text-white'             },
}

/* ========== Sub-components ========== */

function ConnectorArrow() {
  return (
    <div className="flex justify-center py-2" aria-hidden="true">
      <div className="flex flex-col items-center">
        <div className="w-px h-5 bg-gradient-to-b from-white/20 to-white/5" />
        <span className="text-white/30 text-xs">↓</span>
      </div>
    </div>
  )
}

/* ========== Component ========== */

export default function AiOs() {
  const [foundation, engine, factory] = osLayers

  return (
    <SectionWrapper id="ai-os" background="dark">
      <motion.div
        variants={container}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.08 }}
        className="max-w-5xl mx-auto"
      >
        {/* Header */}
        <motion.div variants={item} className="text-center">
          <Badge
            variant="default"
            className="border-white/20 bg-white/5 text-brand-cyan-glow"
          >
            System Architecture
          </Badge>
          <h2 className="mt-6 text-4xl lg:text-5xl font-bold font-heading text-white tracking-tight">
            AI Operating System
          </h2>
          <p className="mt-5 text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            And Planning AI OS は 3 層構造で動作します。
            <br className="hidden sm:block" />
            OS 基盤 → エンジン → Factory が連携し、タスクを自律実行します。
          </p>
        </motion.div>

        {/* Architecture Diagram */}
        <motion.div variants={item} className="mt-14">
          <div className="rounded-2xl overflow-hidden border border-white/10">

            {/* Layer 1: Foundation */}
            <div className={`${layerStyles.foundation.bg} px-6 py-7`}>
              <div className="flex items-center gap-3 mb-5">
                <span className="text-xs font-mono font-semibold text-brand-cyan tracking-widest uppercase">
                  Layer 1 — OS Foundation
                </span>
                <span className="text-xs text-slate-600 font-mono">{foundation.titleJa}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {foundation.components.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-4 hover:bg-white/[0.06] transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg text-brand-cyan" aria-hidden="true">{c.icon}</span>
                      <span className="text-sm font-semibold text-white font-heading">{c.name}</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500 leading-relaxed">{c.descriptionJa}</p>
                  </div>
                ))}
              </div>
            </div>

            <ConnectorArrow />

            {/* Layer 2: Engine */}
            <div className={`${layerStyles.engine.bg} px-6 py-7`}>
              <div className="flex items-center gap-3 mb-5">
                <span className="text-xs font-mono font-semibold text-brand-blue-bright tracking-widest uppercase">
                  Layer 2 — Engine
                </span>
                <span className="text-xs text-slate-600 font-mono">{engine.titleJa}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {engine.components.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-xl border border-white/[0.10] bg-white/[0.04] px-5 py-4 hover:bg-white/[0.08] transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg text-brand-blue-bright" aria-hidden="true">{c.icon}</span>
                      <span className="text-sm font-semibold text-white font-heading">{c.name}</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500 leading-relaxed">{c.descriptionJa}</p>
                  </div>
                ))}
              </div>
            </div>

            <ConnectorArrow />

            {/* Layer 3: Factory */}
            <div className={`${layerStyles.factory.bg} px-6 py-7`}>
              <div className="flex items-center gap-3 mb-5">
                <span className="text-xs font-mono font-semibold text-white tracking-widest uppercase">
                  Layer 3 — Factories
                </span>
                <span className="text-xs text-slate-600 font-mono">{factory.titleJa}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {factory.components.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-xl border border-white/[0.12] bg-white/[0.05] px-4 py-4 text-center hover:bg-white/[0.10] transition-colors"
                  >
                    <span className="text-xl text-white/70" aria-hidden="true">{c.icon}</span>
                    <p className="mt-2 text-xs font-semibold text-white font-heading">{c.name}</p>
                    <p className="mt-1 text-[10px] text-slate-500">{c.descriptionJa}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Feature highlights */}
        <motion.div variants={item} className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            {
              icon: '⇄',
              title: 'Multi-AI Routing',
              body: 'GPT-4o / Claude / Gemini を用途に応じて自動選択。プロバイダー障害時も自動フォールバック。',
            },
            {
              icon: '⚙',
              title: 'N-Step Workflow',
              body: 'ステップを定義するだけで自律実行。Human Approval・条件分岐・並列実行を標準サポート。',
            },
            {
              icon: '◉',
              title: 'Persistent Memory',
              body: '実行履歴・コンテキストを記憶し、次の Workflow に活用。AIが賢くなり続ける基盤。',
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-6 py-5 hover:bg-white/[0.06] transition-colors"
            >
              <span className="text-2xl text-brand-cyan" aria-hidden="true">{f.icon}</span>
              <h3 className="mt-3 text-base font-bold font-heading text-white">{f.title}</h3>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </SectionWrapper>
  )
}
