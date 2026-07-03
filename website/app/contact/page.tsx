'use client'

import { motion } from 'motion/react'
import SectionWrapper from '@/components/ui/SectionWrapper'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import GradientText from '@/components/ui/GradientText'

export default function ContactPage() {
  return (
    <div className="pt-24 lg:pt-32 min-h-screen bg-white">
      <SectionWrapper id="contact-hero" background="white">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <Badge variant="default">Contact</Badge>
          <h1 className="mt-6 text-4xl lg:text-5xl font-bold font-heading text-slate-900">
            一緒に<GradientText>未来</GradientText>を作りましょう
          </h1>
          <p className="mt-6 text-lg text-slate-500">
            導入のご相談、開発への参加、取材・提携など、お気軽にご連絡ください。
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-slate-50 border border-slate-100 rounded-3xl p-8 lg:p-12 shadow-sm"
          >
            <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">お名前</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-brand-blue transition"
                    placeholder="山田 太郎"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">メールアドレス</label>
                  <input
                    type="email"
                    required
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-brand-blue transition"
                    placeholder="you@example.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">お問い合わせ内容</label>
                <textarea
                  rows={6}
                  required
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-brand-blue transition resize-none"
                  placeholder="ご質問、導入に関するご相談など..."
                ></textarea>
              </div>
              <Button
                variant="primary"
                size="lg"
                className="w-full py-4 rounded-xl shadow-lg shadow-brand-blue/20"
                type="submit"
              >
                メッセージを送信する
              </Button>
            </form>
          </motion.div>

          <div className="mt-12 text-center text-sm text-slate-400">
            通常 2 営業日以内に info@andplanning.ai よりご返信いたします。
          </div>
        </div>
      </SectionWrapper>
    </div>
  )
}
