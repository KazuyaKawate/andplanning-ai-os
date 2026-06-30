'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getToken } from '@/lib/auth'

export default function OsAuthGuard({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const token = getToken()
    if (!token) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`)
    }
  }, [router, pathname])

  // トークンがない間は何も描画しない（ちらつき防止）
  if (typeof window !== 'undefined' && !getToken()) return null

  return <>{children}</>
}
