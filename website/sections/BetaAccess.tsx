'use client'

import { motion } from 'motion/react'
import SectionWrapper from '@/components/ui/SectionWrapper'
import Button from '@/components/ui/Button'
import GradientText from '@/components/ui/GradientText'
import Badge from '@/components/ui/Badge'

const benefits = [
  {
    title: 'Business Engine先行利用',
    desc: '収益化管理やライセンス発行機能をいち早く体験できます。',
    icon: '💰',
  },
  {
    title: '新機能を最優先提供',
    desc: '最新のAIモデルや追加Factoryをリリース前に利用可能です。',
    icon: '🚀',
  },
  {
    title: 'Discordコミュニティ参加',
    desc: '開発者や他のβユーザーと直接意見交換ができる場を提供します。',
    icon: '💬',
  },
  {
    title: '正式版割引',
    desc: '正式リリース時に、βユーザー限定の特別価格を適用します。',
    icon: '💎',
  },
]

const container = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.1 } },
}
const item = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
}

export default function BetaAccess() {
  return (
    <SectionWrapper id="beta-access" background="dark">
      <div className="max-w-6xl mx-auto space-y-24">
        
        {/* Recruitment Section */}
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-white/5 border border-white/10 rounded-3xl p-12 lg:p-20 relative overflow-hidden"
          >
            {/* Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-cyan/20 blur-[100px] pointer-events-none" />
            
            <Badge variant="default" className="mb-6 border-white/20 bg-white/5 text-brand-cyan-glow">
              Now Recruiting
            </Badge>
            
            <h2 className="text-3xl lg:text-5xl font-bold font-heading text-white mb-8">
              AIOS β版 <br />
              <GradientText>先行ユーザー募集</GradientText>
            </h2>
            
            <div className="text-lg text-slate-300 mb-12 max-w-2xl mx-auto space-y-4">
              <p>AIOSを無料で先行体験できるβテスターを募集しています。</p>
              <p className="text-sm text-slate-400">参加者には以下を優先提供します：</p>
              <div className="flex flex-wrap justify-center gap-3 mt-4">
                {['Business Engine', 'AI Workflow', '最新AI機能'].map((tag) => (
                  <span key={tag} className="px-4 py-1.5 rounded-full bg-white/10 border border-white/10 text-white text-sm font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Button variant="primary" size="lg" href="/signup" className="w-full sm:w-auto px-12">
                無料で参加する
              </Button>
            </div>
            
            <p className="mt-8 text-xs text-slate-500">
              * β版期間中は主要な機能を無料でご利用いただけます。
            </p>
          </motion.div>
        </div>

        {/* Benefits Section */}
        <div className="space-y-16">
          <div className="text-center">
            <Badge variant="default" className="mb-6">Benefits</Badge>
            <h2 className="text-3xl lg:text-4xl font-bold font-heading text-white">
              ベータ特典
            </h2>
          </div>

          <motion.div 
            variants={container}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {benefits.map((b) => (
              <motion.div
                key={b.title}
                variants={item}
                whileHover={{ y: -5, borderColor: 'rgba(255,255,255,0.2)' }}
                className="bg-white/5 border border-white/10 rounded-2xl p-8 transition-colors group"
              >
                <div className="text-4xl mb-6 group-hover:scale-110 transition-transform duration-300">
                  {b.icon}
                </div>
                <h3 className="text-lg font-bold text-white mb-3 font-heading leading-tight">
                  {b.title}
                </h3>
                <p className="text-slate-500 text-xs leading-relaxed">
                  {b.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>

      </div>
    </SectionWrapper>
  )
}
