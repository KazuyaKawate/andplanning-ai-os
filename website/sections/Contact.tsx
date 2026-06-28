'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import SmartImage from '@/components/ui/SmartImage'
import { siteConfig } from '@/data/site'
import { logoImages } from '@/config/images'

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
    id:          'email',
    label:       'Email',
    icon:        '✉',
    value:       siteConfig.email,
    href:        `mailto:${siteConfig.email}`,
    description: 'お問い合わせ・ご提案',
    color:       '#2563EB',
  },
  {
    id:          'github',
    label:       'GitHub',
    icon:        '◈',
    value:       'github.com/andplanning',
    href:        siteConfig.github,
    description: 'ソースコード・Issue',
    external:    true,
    color:       '#06B6D4',
  },
  {
    id:          'line',
    label:       'LINE',
    icon:        '◉',
    value:       '近日公開予定',
    href:        '#',
    description: 'LINE 公式アカウント',
    comingSoon:  true,
    color:       '#94A3B8',
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
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
          className="text-5xl text-brand-cyan"
          aria-hidden="true"
        >
          ✓
        </motion.span>
        <p className="text-xl font-bold font-heading text-white">メーラーが開きました</p>
        <p className="text-sm text-slate-400">メールを送信してください。通常 2 営業日以内にご返信します。</p>
        <button
          onClick={() => setState('idle')}
          className="mt-2 text-sm text-brand-cyan hover:underline"
        >
          もう一度入力する
        </button>
      </motion.div>
    )
  }

  const inputClass =
    'w-full rounded-lg border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-brand-cyan/60 focus:outline-none focus:ring-2 focus:ring-brand-cyan/20 transition-all'

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="name" className="block text-xs font-semibold text-slate-400 mb-1.5">
            お名前 <span className="text-brand-cyan">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            value={form.name}
            onChange={handleChange}
            placeholder="And Planning 太郎"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-xs font-semibold text-slate-400 mb-1.5">
            メールアドレス <span className="text-brand-cyan">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={form.email}
            onChange={handleChange}
            placeholder="you@example.com"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="message" className="block text-xs font-semibold text-slate-400 mb-1.5">
          メッセージ <span className="text-brand-cyan">*</span>
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          value={form.message}
          onChange={handleChange}
          placeholder="ご質問・ご提案・導入相談など、お気軽にどうぞ。"
          className={`${inputClass} resize-none`}
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

      <p className="text-xs text-slate-500">
        送信するとメーラーが起動します。通常 2 営業日以内にご返信します。
      </p>
    </form>
  )
}

/* ========== Component ========== */

export default function Contact() {
  return (
    <section id="contact" className="relative py-24 lg:py-32 bg-brand-deep-navy overflow-hidden">
      {/* Background aurora */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <motion.div
          className="absolute top-[-80px] left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(37,99,235,0.14) 0%, rgba(6,182,212,0.07) 50%, transparent 70%)',
          }}
          animate={{ scale: [1, 1.1, 1], y: [0, 20, 0] }}
          transition={{ repeat: Infinity, duration: 10, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-0 right-0 w-96 h-96 rounded-full"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(6,182,212,0.08) 0%, transparent 70%)',
          }}
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ repeat: Infinity, duration: 8, ease: 'easeInOut', delay: 3 }}
        />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.018]"
          style={{
            backgroundImage: [
              'linear-gradient(to right, #ffffff 1px, transparent 1px)',
              'linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
            ].join(', '),
            backgroundSize: '72px 72px',
          }}
        />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
        >
          {/* Header */}
          <motion.div variants={item} className="text-center">
            <div className="flex justify-center mb-6">
              <SmartImage
                image={logoImages.horizontal}
                className="h-9 w-auto opacity-90"
                sizes="180px"
              />
            </div>
            <Badge variant="default" className="border-white/20 bg-white/5 text-brand-cyan-glow">
              Contact
            </Badge>
            <h2 className="mt-6 text-4xl lg:text-5xl font-bold font-heading text-white tracking-tight">
              一緒に未来を作りましょう
            </h2>
            <p className="mt-5 text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
              AI OS 導入のご相談・開発への参加・取材・提携など、
              <br className="hidden sm:block" />
              お気軽にご連絡ください。
            </p>
          </motion.div>

          <div className="mt-14 grid grid-cols-1 lg:grid-cols-5 gap-10">

            {/* Social links */}
            <motion.div variants={item} className="lg:col-span-2 space-y-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-6">
                連絡先
              </p>

              {socials.map((s) => (
                <motion.a
                  key={s.id}
                  href={s.comingSoon ? undefined : s.href}
                  target={s.external ? '_blank' : undefined}
                  rel={s.external ? 'noopener noreferrer' : undefined}
                  aria-label={`${s.label}: ${s.value}`}
                  aria-disabled={s.comingSoon}
                  whileHover={s.comingSoon ? {} : { x: 4 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                  className={[
                    'flex items-center gap-4 rounded-xl border px-5 py-4 transition-all duration-200',
                    s.comingSoon
                      ? 'border-white/5 bg-white/[0.02] cursor-default opacity-50'
                      : 'border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.08]',
                  ].join(' ')}
                >
                  <span
                    className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
                    style={{ backgroundColor: `${s.color}22`, color: s.color }}
                    aria-hidden="true"
                  >
                    {s.icon}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-500">{s.label}</p>
                    <p className="text-sm font-medium text-slate-200 truncate">{s.value}</p>
                    <p className="text-xs text-slate-500">{s.description}</p>
                  </div>
                  {s.comingSoon && (
                    <span className="ml-auto text-[10px] font-semibold text-slate-600 shrink-0">Coming Soon</span>
                  )}
                </motion.a>
              ))}
            </motion.div>

            {/* Form */}
            <motion.div
              variants={item}
              className="lg:col-span-3 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-7 sm:p-9"
            >
              <h3 className="text-lg font-bold font-heading text-white mb-6">
                フォームから送る
              </h3>
              <ContactForm />
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
