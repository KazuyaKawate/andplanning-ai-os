'use client'

import Image from 'next/image'
import { useState } from 'react'
import type { SiteImage } from '@/config/images'

type SmartImageProps = {
  image:     SiteImage
  className?: string
  priority?:  boolean
  sizes?:     string
  /** fill モード。親要素に position:relative と明示的な高さが必要。 */
  fill?:      boolean
}

/**
 * And Planning — 画像コンポーネント
 *
 * - 実画像（WebP/PNG）が存在する場合: そちらを表示
 * - 存在しない（onError）場合: SVG プレースホルダーに自動フォールバック
 * - next/image による最適化・遅延ロード・CLS ゼロ対応
 *
 * 実画像への差し替え: /public/images/ に同名 webp ファイルを置くだけ。
 * config/images.ts の src パスを変更すればパス名も変更可能。
 */
export default function SmartImage({
  image,
  className = '',
  priority  = false,
  sizes,
  fill      = false,
}: SmartImageProps) {
  const [src, setSrc] = useState(image.src)

  const handleError = () => {
    if (src !== image.fallback) setSrc(image.fallback)
  }

  if (fill) {
    return (
      <Image
        src={src}
        alt={image.alt}
        fill
        sizes={sizes ?? '100vw'}
        priority={priority}
        className={className}
        onError={handleError}
      />
    )
  }

  return (
    <Image
      src={src}
      alt={image.alt}
      width={image.width}
      height={image.height}
      sizes={sizes}
      priority={priority}
      className={className}
      onError={handleError}
    />
  )
}
