'use client'

import { motion } from 'motion/react'
import SectionWrapper from '@/components/ui/SectionWrapper'
import Badge from '@/components/ui/Badge'

const cases = [
  {
    title: '個人事業主・フリーランス',
    desc: '見積書作成からSNS発信、Webサイトの保守まで、AIがバックオフィス業務を巻き取ります。',
    icon: '👤',
  },
  {
    title: '副業クリエイター',
    desc: '本業の間もAIがコンテンツの企画と下書きを進めます。帰宅後には「チェックするだけ」の状態に。',
    icon: '✍️',
  },
  {
    title: '配信者・インフルエンサー',
    desc: '動画の切り抜きポイント提案、台本作成、ファンへの返信案作成など、クリエイティブに集中できる環境を作ります。',
    icon: '🎥',
  },
]

const container = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.1 } },
}
const item = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

export default function UseCases() {
  return (
    <SectionWrapper id="use-cases" background="light">
      <motion.div
        variants={container}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
        className="max-w-6xl mx-auto"
      >
        <div className="text-center mb-16">
          <Badge variant="default">Use Cases</Badge>
          <h2 className="mt-6 text-3xl lg:text-4xl font-bold font-heading text-slate-900">
            こんな方のための AIOS です
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {cases.map((c) => (
            <motion.div
              key={c.title}
              variants={item}
              className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="text-4xl mb-6">{c.icon}</div>
              <h3 className="text-xl font-bold mb-4 text-slate-900">{c.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{c.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </SectionWrapper>
  )
}
