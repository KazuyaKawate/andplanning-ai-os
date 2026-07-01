'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import SmartImage from '@/components/ui/SmartImage'
import { navItems, siteConfig } from '@/data/site'
import { logoImages } from '@/config/images'

export default function Header() {
  const [isScrolled, setIsScrolled]          = useState(false)
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 24)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const closeMobileMenu = () => setMobileMenuOpen(false)

  return (
    <header
      className={[
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled
          ? 'bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-sm'
          : 'bg-transparent',
      ].join(' ')}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">

          {/* Logo image → TOP */}
          <Link
            href="/"
            className="flex items-center hover:opacity-80 transition-opacity"
            aria-label={`${siteConfig.name} — トップへ`}
          >
            <SmartImage
              image={logoImages.horizontal}
              priority
              sizes="(max-width: 768px) 120px, 180px"
              className="h-8 w-auto"
            />
          </Link>

          {/* Desktop navigation */}
          <nav className="hidden md:flex items-center gap-7" aria-label="メインナビゲーション">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-2">
            <Link
              href="/login"
              className="inline-flex items-center justify-center text-sm font-medium px-4 py-2.5 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
            >
              ログイン
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center text-sm font-medium px-4 py-2.5 rounded-lg bg-brand-cyan hover:bg-brand-cyan-bright text-slate-900 font-bold transition-colors shadow-sm"
            >
              ベータ登録
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 text-slate-600 hover:text-slate-900"
            onClick={() => setMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? 'メニューを閉じる' : 'メニューを開く'}
            aria-expanded={isMobileMenuOpen}
          >
            <span className="block w-5 h-0.5 bg-current mb-1.5 transition-transform duration-200" style={{ transform: isMobileMenuOpen ? 'translateY(8px) rotate(45deg)'  : undefined }} />
            <span className="block w-5 h-0.5 bg-current mb-1.5 transition-opacity duration-200"  style={{ opacity:    isMobileMenuOpen ? 0 : 1 }} />
            <span className="block w-5 h-0.5 bg-current transition-transform duration-200"        style={{ transform: isMobileMenuOpen ? 'translateY(-8px) rotate(-45deg)' : undefined }} />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden bg-white border-b border-slate-100 overflow-hidden"
          >
            <nav className="flex flex-col px-4 py-4 gap-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm font-medium text-slate-700 hover:text-slate-900 py-1"
                  onClick={closeMobileMenu}
                >
                  {item.label}
                </Link>
              ))}
              <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-slate-100">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center text-sm font-medium px-5 py-2.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                  onClick={closeMobileMenu}
                >
                  ログイン
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center text-sm font-medium px-5 py-2.5 rounded-lg bg-brand-cyan hover:bg-brand-cyan-bright text-slate-900 font-bold"
                  onClick={closeMobileMenu}
                >
                  ベータ登録
                </Link>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
