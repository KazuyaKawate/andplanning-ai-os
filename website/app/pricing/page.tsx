'use client'

import { motion } from 'motion/react'
import SectionWrapper from '@/components/ui/SectionWrapper'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import GradientText from '@/components/ui/GradientText'

const plans = [
  {
    name: 'Free',
    price: '¥0',
    desc: 'AIOSの基本機能を体験',
    features: [
      '主要AIモデルへのアクセス',
      '基本ワークフローの利用',
      'コミュニティサポート',
      '月間実行数制限あり',
    ],
    cta: '無料で始める',
    href: '/signup',
    featured: false,
  },
  {
    name: 'Pro',
    price: '¥2,980',
    unit: '/月',
    desc: '個人事業・副業を加速させる',
    features: [
      'Freeプランの全機能',
      'Business Engineの利用',
      '高度なワークフロー作成',
      '優先的な実行キュー',
      'カスタムプロンプト保存',
    ],
    cta: 'Proプランを試す',
    href: '/signup',
    featured: true,
  },
  {
    name: 'Business',
    price: 'Custom',
    desc: 'チームでの利用と高度な自動化',
    features: [
      'Proプランの全機能',
      '複数ユーザー管理',
      'API連携・Webhook',
      '専用カスタマーサクセス',
      '独自Factory構築支援',
    ],
    cta: 'お問い合わせ',
    href: '/contact',
    featured: false,
  },
]

const item = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
}

export default function PricingPage() {
  return (
    <div className="pt-24 lg:pt-32">
      <SectionWrapper id="pricing-hero" background="white">
        <div className="max-w-4xl mx-auto text-center">
          <Badge variant="default">Pricing</Badge>
          <h1 className="mt-6 text-4xl lg:text-6xl font-bold font-heading text-slate-900">
            シンプルで透明な<GradientText>料金プラン</GradientText>
          </h1>
          <p className="mt-6 text-lg text-slate-500">
            あなたのビジネスの規模に合わせて、最適なプランをお選びいただけます。
          </p>
        </div>

        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto px-4">
          {plans.map((plan) => (
            <motion.div
              key={plan.name}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={item}
              className={[
                'relative flex flex-col p-8 rounded-3xl border transition-all duration-300',
                plan.featured
                  ? 'bg-slate-900 border-brand-blue shadow-2xl scale-105 z-10'
                  : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-xl',
              ].join(' ')}
            >
              {plan.featured && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1 bg-brand-blue rounded-full text-white text-[10px] font-bold uppercase tracking-widest">
                  Most Popular
                </div>
              )}

              <div className="mb-8">
                <h3 className={[
                  'text-xl font-bold font-heading mb-2',
                  plan.featured ? 'text-white' : 'text-slate-900'
                ].join(' ')}>
                  {plan.name}
                </h3>
                <div className="flex items-baseline gap-1">
                  <span className={[
                    'text-4xl font-bold font-heading',
                    plan.featured ? 'text-white' : 'text-slate-900'
                  ].join(' ')}>
                    {plan.price}
                  </span>
                  {plan.unit && (
                    <span className="text-slate-500 text-sm">{plan.unit}</span>
                  )}
                </div>
                <p className="mt-3 text-sm text-slate-500">{plan.desc}</p>
              </div>

              <ul className="flex-1 space-y-4 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm">
                    <span className="text-brand-cyan">✓</span>
                    <span className={plan.featured ? 'text-slate-300' : 'text-slate-600'}>{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                variant={plan.featured ? 'primary' : 'secondary'}
                size="lg"
                href={plan.href}
                className="w-full"
              >
                {plan.cta}
              </Button>
            </motion.div>
          ))}
        </div>

        <div className="mt-16 text-center text-sm text-slate-400">
          * 表示価格はすべて税込です。β版期間中はProプランの機能も一部無料で提供されます。
        </div>
      </SectionWrapper>
    </div>
  )
}
