'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion } from 'motion/react'
import SectionWrapper from '@/components/ui/SectionWrapper'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { siteConfig } from '@/data/site'

/* ========== Animation ========== */

const container = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.1 } },
}
const item = {
  hidden:  { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] as const } },
}

/* ========== Social links ========== */

const socials = [
  {
    id: 'email',
    label: 'Email',
    icon: '✉',
    value: siteConfig.email,
    href: `mailto:${siteConfig.email}`,
    description: 'お問い合わせ・ご提案',
  },
  {
    id: 'github',
    label: 'GitHub',
    icon: '◈',
    value: 'github.com/andplanning',
    href: siteConfig.github,
    description: 'ソースコード・Issue',
    external: true,
  },
  {
    id: 'line',
    label: 'LINE',
    icon: '◉',
    value: '近日公開予定',
    href: '#',
    description: 'LINE 公式アカウント',
    comingSoon: true,
  },
]

/* ========== Form ========== */

type FormState = 'idle' | 'sending' | 'sent'

function ContactForm() {
  const [state, setState] = useState<FormState>('idle')
  const [form, setForm]   = useState({ name: '', email: '', message: '' })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.message) return
    setState('sending')

    const subject = encodeURIComponent(`[And Planning] ${form.name} からのお問い合わせ`)
    const body    = encodeURIComponent(`名前: ${form.name}\nメール: ${form.email}\n\n${form.message}`)
    window.location.href = `mailto:${siteConfig.email}?subject=${subject}&body=${body}`

    setTimeout(() => setState('sent'), 800)
  }

  if (state === 'sent') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-16 text-center gap-4"
      >
        <span className="text-5xl text-brand-cyan" aria-hidden="true">✓</span>
        <p className="text-xl font-bold font-heading text-slate-900">メーラーが開きました</p>
        <p className="text-sm text-slate-500">メールを送信してください。通常 2 営業日以内にご返信します。</p>
        <button
          onClick={() => setState('idle')}
          className="mt-2 text-sm text-brand-blue hover:underline"
        >
          もう一度入力する
        </button>
      </motion.div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="name" className="block text-xs font-semibold text-slate-500 mb-1.5">
            お名前 <span className="text-brand-blue">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            value={form.name}
            onChange={handleChange}
            placeholder="And Planning 太郎"
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-300 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20 transition-all"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-xs font-semibold text-slate-500 mb-1.5">
            メールアドレス <span className="text-brand-blue">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={form.email}
            onChange={handleChange}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-300 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20 transition-all"
          />
        </div>
      </div>

      <div>
        <label htmlFor="message" className="block text-xs font-semibold text-slate-500 mb-1.5">
          メッセージ <span className="text-brand-blue">*</span>
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          value={form.message}
          onChange={handleChange}
          placeholder="ご質問・ご提案・導入相談など、お気軽にどうぞ。"
          className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-300 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20 transition-all resize-none"
        />
      </div>

      <Button
        variant="primary"
        size="lg"
        className="w-full sm:w-auto"
        type="submit"
        disabled={state === 'sending'}
      >
        {state === 'sending' ? '送信中…' : 'メールで送信する →'}
      </Button>

      <p className="text-xs text-slate-400">
        送信するとメーラーが起動します。通常 2 営業日以内にご返信します。
      </p>
    </form>
  )
}

/* ========== Component ========== */

export default function Contact() {
  return (
    <SectionWrapper id="contact" background="white">
      <motion.div
        variants={container}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
        className="max-w-5xl mx-auto"
      >
        {/* Header */}
        <motion.div variants={item} className="text-center">
          {/* Brand logo */}
          <div className="flex justify-center mb-6">
            <Image
              src="/logos/main-logo.svg"
              alt="And Planning ブランドロゴ"
              width={180}
              height={36}
              className="h-9 w-auto"
            />
          </div>
          <Badge variant="default">Contact</Badge>
          <h2 className="mt-6 text-4xl lg:text-5xl font-bold font-heading text-slate-900 tracking-tight">
            一緒に未来を作りましょう
          </h2>
          <p className="mt-5 text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
            AI OS 導入のご相談・開発への参加・取材・提携など、
            <br className="hidden sm:block" />
            お気軽にご連絡ください。
          </p>
        </motion.div>

        <div className="mt-14 grid grid-cols-1 lg:grid-cols-5 gap-10">

          {/* Social links */}
          <motion.div variants={item} className="lg:col-span-2 space-y-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-6">
              連絡先
            </p>

            {socials.map((s) => (
              <a
                key={s.id}
                href={s.comingSoon ? undefined : s.href}
                target={s.external ? '_blank' : undefined}
                rel={s.external ? 'noopener noreferrer' : undefined}
                aria-label={`${s.label}: ${s.value}`}
                aria-disabled={s.comingSoon}
                className={[
                  'flex items-center gap-4 rounded-xl border px-5 py-4 transition-all duration-200',
                  s.comingSoon
                    ? 'border-slate-100 bg-slate-50 cursor-default opacity-60'
                    : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-md',
                ].join(' ')}
              >
                <span
                  className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-lg text-slate-500 shrink-0"
                  aria-hidden="true"
                >
                  {s.icon}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-400">{s.label}</p>
                  <p className="text-sm font-medium text-slate-700 truncate">{s.value}</p>
                  <p className="text-xs text-slate-400">{s.description}</p>
                </div>
                {s.comingSoon && (
                  <span className="ml-auto text-[10px] font-semibold text-slate-400 shrink-0">Coming Soon</span>
                )}
              </a>
            ))}
          </motion.div>

          {/* Form */}
          <motion.div
            variants={item}
            className="lg:col-span-3 rounded-2xl border border-slate-100 bg-white p-7 sm:p-9"
          >
            <h3 className="text-lg font-bold font-heading text-slate-900 mb-6">
              フォームから送る
            </h3>
            <ContactForm />
          </motion.div>
        </div>
      </motion.div>
    </SectionWrapper>
  )
}
