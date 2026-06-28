'use client'

import Link from 'next/link'
import SmartImage from '@/components/ui/SmartImage'
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
    <footer className="bg-brand-navy text-brand-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 lg:gap-12">

          {/* Brand */}
          <div className="md:col-span-2">
            {/* Logo symbol */}
            <div className="flex items-center gap-3 mb-4">
              <SmartImage
                image={logoImages.symbol}
                sizes="48px"
                className="h-10 w-10 rounded-lg"
              />
              <div>
                <p className="text-base font-bold font-heading text-white tracking-tight">
                  {siteConfig.name}
                </p>
                <p className="text-xs text-brand-gray-600">AI Operating System</p>
              </div>
            </div>
            <p className="text-sm text-brand-gray-400 leading-relaxed max-w-xs">
              {siteConfig.taglineJa}
            </p>

            {/* Social icons */}
            <div className="mt-6 flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.id}
                  href={social.href}
                  target={social.external ? '_blank' : undefined}
                  rel={social.external ? 'noopener noreferrer' : undefined}
                  aria-label={social.label}
                  className="w-9 h-9 rounded-lg bg-brand-navy-light hover:bg-white/10 flex items-center justify-center text-brand-gray-400 hover:text-white transition-colors"
                >
                  <SocialIconComponent icon={social.icon} />
                </a>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div>
            <p className="text-xs font-semibold text-slate-300 uppercase tracking-widest mb-5">
              Navigation
            </p>
            <ul className="space-y-3">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-brand-gray-400 hover:text-white transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact + Legal */}
          <div>
            <p className="text-xs font-semibold text-slate-300 uppercase tracking-widest mb-5">
              Contact
            </p>
            <ul className="space-y-3">
              <li>
                <a
                  href={`mailto:${siteConfig.email}`}
                  className="text-sm text-brand-gray-400 hover:text-white transition-colors break-all"
                >
                  {siteConfig.email}
                </a>
              </li>
              <li>
                <a
                  href={siteConfig.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-brand-gray-400 hover:text-white transition-colors"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="https://note.com/andplanning"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-brand-gray-400 hover:text-white transition-colors"
                >
                  note
                </a>
              </li>
            </ul>

            {/* Legal links */}
            <div className="mt-8">
              <ul className="space-y-2.5">
                {legalLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-xs text-brand-gray-600 hover:text-brand-gray-400 transition-colors"
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
        <div className="mt-14 pt-8 border-t border-brand-navy-light flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-brand-gray-600">
            © {year} {siteConfig.name}. All rights reserved.
          </p>
          <p className="text-xs font-mono text-brand-gray-600">
            Build Your AI Factory. Operate Your Future.
          </p>
        </div>
      </div>
    </footer>
  )
}
