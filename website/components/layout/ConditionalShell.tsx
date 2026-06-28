'use client'

import { usePathname } from 'next/navigation'
import Header from './Header'
import Footer from './Footer'

export default function ConditionalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isOs = pathname.startsWith('/os')

  if (isOs) return <>{children}</>

  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  )
}
