import Link from 'next/link'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type ButtonProps = {
  variant?:   'primary' | 'secondary' | 'ghost'
  size?:      'sm' | 'md' | 'lg'
  href?:      string
  external?:  boolean
  children:   React.ReactNode
  className?: string
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>

const base = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2'

const variants = {
  primary:   'bg-brand-blue hover:bg-brand-blue-bright text-white',
  secondary: 'border border-brand-blue text-brand-blue hover:bg-brand-blue hover:text-white',
  ghost:     'text-slate-600 hover:text-slate-900 hover:bg-slate-50',
}

const sizes = {
  sm: 'text-sm px-4 py-2',
  md: 'text-base px-6 py-3',
  lg: 'text-base px-8 py-4',
}

export default function Button({
  variant   = 'primary',
  size      = 'md',
  href,
  external  = false,
  children,
  className = '',
  ...props
}: ButtonProps) {
  const classes = cn(base, variants[variant], sizes[size], className)

  if (href) {
    return (
      <Link
        href={href}
        className={classes}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        {children}
      </Link>
    )
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  )
}
