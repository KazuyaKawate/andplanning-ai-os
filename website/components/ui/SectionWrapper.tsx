import { cn } from '@/lib/utils'

type SectionWrapperProps = {
  id?:          string
  children:     React.ReactNode
  className?:   string
  background?:  'white' | 'light' | 'dark'
  innerClass?:  string
}

const bgMap = {
  white: 'bg-white',
  light: 'bg-slate-50',
  dark:  'bg-brand-navy text-white',
}

export default function SectionWrapper({
  id,
  children,
  className  = '',
  background = 'white',
  innerClass = '',
}: SectionWrapperProps) {
  return (
    <section
      id={id}
      className={cn('py-24 lg:py-32', bgMap[background], className)}
    >
      <div className={cn('max-w-7xl mx-auto px-4 sm:px-6 lg:px-8', innerClass)}>
        {children}
      </div>
    </section>
  )
}
