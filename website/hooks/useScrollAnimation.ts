'use client'

import { useEffect, useRef } from 'react'
import { useInView, useAnimation } from 'motion/react'

export function useScrollAnimation(threshold = 0.15) {
  const ref      = useRef(null)
  const isInView = useInView(ref, { once: true, amount: threshold })
  const controls = useAnimation()

  useEffect(() => {
    if (isInView) {
      controls.start('visible')
    }
  }, [isInView, controls])

  return { ref, controls, isInView }
}

export const fadeUpVariants = {
  hidden:  { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] as const },
  },
}

export const staggerContainerVariants = {
  hidden:  {},
  visible: {
    transition: { staggerChildren: 0.12 },
  },
}
