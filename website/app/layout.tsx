import type { Metadata, Viewport } from 'next'
import { Inter, Noto_Sans_JP, JetBrains_Mono } from 'next/font/google'
import '@/styles/globals.css'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { siteConfig } from '@/data/site'

/* ========== Fonts ========== */

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  variable: '--font-noto-sans-jp',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

/* ========== Metadata ========== */

export const viewport: Viewport = {
  themeColor: '#ffffff',
}

export const metadata: Metadata = {
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [
    'AI OS', 'AI Operating System', 'AI Factory', 'And Planning',
    '自動化', 'ワークフロー自動化', 'AI工場', 'note自動化',
  ],
  authors: [{ name: siteConfig.name }],
  metadataBase: new URL(siteConfig.url),
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
  },
  robots: {
    index: true,
    follow: true,
  },
}

/* ========== Layout ========== */

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ja"
      className={[
        inter.variable,
        notoSansJP.variable,
        jetbrainsMono.variable,
      ].join(' ')}
    >
      <body className="bg-white text-slate-900 antialiased">
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  )
}
