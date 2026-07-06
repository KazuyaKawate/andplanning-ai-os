'use client'

import SectionWrapper from '@/components/ui/SectionWrapper'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import GradientText from '@/components/ui/GradientText'

export default function BusinessEngine() {
  return (
    <SectionWrapper id="business-engine" background="white">
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-16">
        <div className="lg:w-1/2">
          <Badge variant="default">Monetization</Badge>
          <h2 className="mt-6 text-4xl lg:text-5xl font-bold font-heading text-slate-900 leading-tight">
            AIで、<br />
            <GradientText>稼げる仕組み</GradientText>を作る。
          </h2>
          <p className="mt-8 text-lg text-slate-500 leading-relaxed">
            AIOS Business Engineは、AIによるアウトプットを「価値」に変えるための管理レイヤーです。
            クライアント管理、ライセンス発行、成果物の収益化までを一元化。
            あなたのAI Factoryを、持続可能なビジネスへと進化させます。
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Button variant="primary" size="lg" href="/login">
              Business Engineを試す
            </Button>
          </div>
        </div>

        <div className="lg:w-1/2 w-full">
          <div className="relative rounded-3xl bg-slate-900 p-8 shadow-2xl overflow-hidden min-h-[400px] flex items-center justify-center">
            {/* Mock Dashboard UI */}
            <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/20 to-transparent opacity-50" />
            <div className="relative z-10 w-full space-y-6">
              <div className="flex gap-4">
                <div className="h-24 flex-1 bg-white/5 rounded-2xl border border-white/10 p-4 flex flex-col justify-between">
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest">Revenue</p>
                  <p className="text-2xl font-bold text-brand-cyan">¥128,400</p>
                </div>
                <div className="h-24 flex-1 bg-white/5 rounded-2xl border border-white/10 p-4 flex flex-col justify-between">
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest">Active Licenses</p>
                  <p className="text-2xl font-bold text-white">42</p>
                </div>
              </div>
              <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
                <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-4">Latest Transactions</p>
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-blue/30" />
                        <div className="h-2 w-24 bg-white/10 rounded" />
                      </div>
                      <div className="h-2 w-12 bg-brand-cyan/20 rounded" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SectionWrapper>
  )
}
