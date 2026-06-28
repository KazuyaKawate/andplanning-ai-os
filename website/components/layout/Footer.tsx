import Link from 'next/link'
import { navItems, siteConfig } from '@/data/site'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-brand-navy text-brand-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">

          {/* Brand */}
          <div className="col-span-1">
            <p className="text-xl font-bold font-heading text-white tracking-tight">
              {siteConfig.name}
            </p>
            <p className="mt-2 text-sm text-brand-gray-400 leading-relaxed">
              {siteConfig.tagline}
            </p>
            <p className="mt-1 text-sm text-brand-gray-600">
              {siteConfig.taglineJa}
            </p>
          </div>

          {/* Navigation */}
          <div>
            <p className="text-xs font-semibold text-slate-300 uppercase tracking-widest mb-4">
              Navigation
            </p>
            <ul className="space-y-2.5">
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

          {/* Contact */}
          <div>
            <p className="text-xs font-semibold text-slate-300 uppercase tracking-widest mb-4">
              Contact
            </p>
            <ul className="space-y-2.5">
              <li>
                <a
                  href={`mailto:${siteConfig.email}`}
                  className="text-sm text-brand-gray-400 hover:text-white transition-colors"
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
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-brand-navy-light flex flex-col sm:flex-row items-center justify-between gap-4">
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
