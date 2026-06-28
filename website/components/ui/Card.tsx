import { cn } from '@/lib/utils'

type CardProps = {
  children:   React.ReactNode
  className?: string
  hover?:     boolean
  padding?:   'sm' | 'md' | 'lg'
  as?:        'div' | 'article' | 'section'
}

const paddingMap = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

export default function Card({
  children,
  className = '',
  hover     = false,
  padding   = 'md',
  as: Tag   = 'div',
}: CardProps) {
  return (
    <Tag
      className={cn(
        'bg-white rounded-2xl border border-slate-100',
        paddingMap[padding],
        hover && 'hover:border-brand-cyan/50 hover:shadow-lg transition-all duration-300 cursor-default',
        className,
      )}
    >
      {children}
    </Tag>
  )
}
