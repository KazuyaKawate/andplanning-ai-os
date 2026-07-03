'use client'

import { motion } from 'motion/react'
import SectionWrapper from '@/components/ui/SectionWrapper'
import Button from '@/components/ui/Button'
import GradientText from '@/components/ui/GradientText'

export default function BetaAccess() {
  return (
    <SectionWrapper id="beta-access" background="dark">
      <div className="max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="bg-white/5 border border-white/10 rounded-3xl p-12 lg:p-20 relative overflow-hidden"
        >
          {/* Background Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-cyan/20 blur-[100px] pointer-events-none" />
          
          <h2 className="text-3xl lg:text-5xl font-bold font-heading text-white mb-8">
            あなたのビジネスに、<br />
            <GradientText>専属のAIチーム</GradientText>を。
          </h2>
          <p className="text-lg text-slate-400 mb-12 max-w-2xl mx-auto">
            現在、AIOSは無料β版として公開されています。
            先行ユーザーとして、次世代の業務OSを体験し、あなたのビジネスを加速させましょう。
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Button variant="primary" size="lg" href="/signup" className="w-full sm:w-auto px-12">
              無料β版をはじめる
            </Button>
            <Button variant="secondary" size="lg" href="#contact" className="w-full sm:w-auto border-white/20 text-white hover:bg-white/10">
              導入について相談する
            </Button>
          </div>
          <p className="mt-8 text-xs text-slate-500">
            * β版期間中は主要な機能を無料でご利用いただけます。
          </p>
        </motion.div>
      </div>
    </SectionWrapper>
  )
}
