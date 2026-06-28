'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import SmartImage from '@/components/ui/SmartImage'
import GradientText from '@/components/ui/GradientText'
import { navItems, siteConfig, socialLinks, legalLinks } from '@/data/site'
import { logoImages } from '@/config/images'

/* ========== Social icon SVGs ========== */

function IconGitHub({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  )
}

function IconX({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function SocialIconComponent({ icon }: { icon: string }) {
  switch (icon) {
    case 'github': return <IconGitHub className="w-5 h-5" />
    case 'x':      return <IconX className="w-4 h-4" />
    case 'note':   return <span className="text-sm font-bold leading-none">n</span>
    case 'email':  return <span className="text-sm leading-none">✉</span>
    default:       return null
  }
}

/* ========== Component ========== */

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="relative bg-[#060C18] text-brand-gray-400 overflow-hidden">
      {/* Gradient top border */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: 'linear-gradient(to right, transparent 0%, rgba(37,99,235,0.6) 30%, rgba(6,182,212,0.8) 50%, rgba(37,99,235,0.6) 70%, transparent 100%)',
        }}
        aria-hidden="true"
      />

      {/* Ambient glow behind content */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center top, rgba(37,99,235,0.06) 0%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      {/* Subtle dot pattern */}
      <div
        className="absolute inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
        aria-hidden="true"
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-10 lg:pt-20 lg:pb-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 lg:gap-14">

          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-5">
              <div className="relative">
                <div
                  className="absolute -inset-1 rounded-xl blur-sm opacity-40"
                  style={{ background: 'radial-gradient(ellipse, rgba(6,182,212,0.5), transparent)' }}
                  aria-hidden="true"
                />
                <SmartImage
                  image={logoImages.symbol}
                  sizes="48px"
                  className="relative h-10 w-10 rounded-lg"
                />
              </div>
              <div>
                <p className="text-base font-bold font-heading tracking-tight">
                  <GradientText>{siteConfig.name}</GradientText>
                </p>
                <p className="text-xs text-slate-600 mt-0.5">AI Operating System</p>
              </div>
            </div>

            <p className="text-sm text-slate-500 leading-relaxed max-w-xs">
              {siteConfig.taglineJa}
            </p>

            <p className="mt-3 text-xs text-slate-600 italic leading-relaxed max-w-xs">
              &ldquo;{siteConfig.tagline}&rdquo;
            </p>

            {/* Social icons */}
            <div className="mt-7 flex items-center gap-2.5">
              {socialLinks.map((social) => (
                <motion.a
                  key={social.id}
                  href={social.href}
                  target={social.external ? '_blank' : undefined}
                  rel={social.external ? 'noopener noreferrer' : undefined}
                  aria-label={social.label}
                  whileHover={{ y: -2, scale: 1.1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  className="w-9 h-9 rounded-lg border border-white/[0.06] bg-white/[0.04] hover:bg-white/[0.10] hover:border-white/[0.15] flex items-center justify-center text-slate-500 hover:text-white transition-colors"
                >
                  <SocialIconComponent icon={social.icon} />
                </motion.a>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div>
            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-[0.2em] mb-5">
              Navigation
            </p>
            <ul className="space-y-3">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-slate-500 hover:text-white transition-colors duration-200"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact + Legal */}
          <div>
            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-[0.2em] mb-5">
              Contact
            </p>
            <ul className="space-y-3">
              <li>
                <a
                  href={`mailto:${siteConfig.email}`}
                  className="text-sm text-slate-500 hover:text-white transition-colors duration-200 break-all"
                >
                  {siteConfig.email}
                </a>
              </li>
              <li>
                <a
                  href={siteConfig.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-slate-500 hover:text-white transition-colors duration-200"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="https://note.com/andplanning"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-slate-500 hover:text-white transition-colors duration-200"
                >
                  note
                </a>
              </li>
            </ul>

            <div className="mt-8">
              <ul className="space-y-2.5">
                {legalLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-xs text-slate-700 hover:text-slate-400 transition-colors duration-200"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-14 pt-7 flex flex-col sm:flex-row items-center justify-between gap-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
        >
          <p className="text-xs text-slate-700">
            © {year} {siteConfig.name}. All rights reserved.
          </p>
          <p className="text-xs font-mono"
            style={{
              background: 'linear-gradient(to right, #2563EB, #06B6D4)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Build Your AI Factory. Operate Your Future.
          </p>
        </div>
      </div>
    </footer>
  )
}
