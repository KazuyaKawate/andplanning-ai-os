'use client'

import { useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import SmartImage from '@/components/ui/SmartImage'
import type { SiteImage } from '@/config/images'

type ImageModalProps = {
  image:   SiteImage
  isOpen:  boolean
  onClose: () => void
}

/**
 * クリック拡大モーダル。
 * - Escape キーで閉じる
 * - 背景クリックで閉じる
 * - スクロールロック
 * - フォーカストラップ（閉じるボタン）
 */
export default function ImageModal({ image, isOpen, onClose }: ImageModalProps) {
  const handleKey = useCallback(
    (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() },
    [onClose],
  )

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKey)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      window.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [isOpen, handleKey])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={`${image.alt} — 拡大表示`}
        >
          <motion.div
            key="modal-content"
            initial={{ scale: 0.88, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.88, opacity: 0, y: 16 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="relative w-full max-w-5xl rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label="モーダルを閉じる"
              autoFocus
            >
              ✕
            </button>

            <SmartImage
              image={image}
              className="w-full h-auto"
              sizes="(max-width: 768px) 95vw, 80vw"
            />

            {/* Caption */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-6 py-4">
              <p className="text-white/80 text-sm">{image.alt}</p>
              <p className="text-white/40 text-xs mt-0.5">Esc または背景クリックで閉じる</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
