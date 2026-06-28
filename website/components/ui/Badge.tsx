import { cn } from '@/lib/utils'

type BadgeProps = {
  children:   React.ReactNode
  variant?:   'default' | 'active' | 'stub' | 'planned'
  className?: string
}

const variantMap: Record<string, string> = {
  default: 'border-slate-200 bg-white text-slate-700',
  active:  'border-brand-blue/30 bg-brand-blue/5 text-brand-blue',
  stub:    'border-brand-gray-400/30 bg-slate-50 text-brand-gray-600',
  planned: 'border-slate-200 bg-slate-50 text-slate-500',
}

const dotMap: Record<string, string> = {
  default: 'bg-brand-cyan',
  active:  'bg-brand-blue',
  stub:    'bg-brand-gray-400',
  planned: 'bg-slate-300',
}

export default function Badge({
  children,
  variant   = 'default',
  className = '',
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium',
        variantMap[variant],
        className,
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', dotMap[variant])} aria-hidden="true" />
      {children}
    </span>
  )
}
