'use client'

import Image from 'next/image'
import { useState } from 'react'
import { cn } from '@/lib/utils'

type PlaceholderImageProps = {
  src: string
  alt: string
  width: number
  height: number
  className?: string
  priority?: boolean
  fallbackBg?: string
}

/**
 * SVG プレースホルダー → PNG/WebP 実画像への差し替え対応ラッパー。
 * src パスを同名の PNG/WebP に変更するだけで切り替え可能。
 * 画像読み込みに失敗した場合はブランドカラーのフォールバックを表示。
 */
export default function PlaceholderImage({
  src,
  alt,
  width,
  height,
  className      = '',
  priority       = false,
  fallbackBg     = '#1E293B',
}: PlaceholderImageProps) {
  const [hasError, setHasError] = useState(false)

  if (hasError) {
    return (
      <div
        className={cn('flex items-center justify-center', className)}
        style={{ width, height, backgroundColor: fallbackBg }}
        role="img"
        aria-label={alt}
      />
    )
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={cn('object-cover', className)}
      priority={priority}
      onError={() => setHasError(true)}
    />
  )
}
