import type { WorkflowStatus, FactoryStatus } from '@/types'

type Status = WorkflowStatus | FactoryStatus

const styles: Record<string, string> = {
  running:   'bg-brand-blue/20 text-brand-blue-bright border-brand-blue/30',
  active:    'bg-brand-blue/20 text-brand-blue-bright border-brand-blue/30',
  paused:    'bg-amber-500/15 text-amber-400 border-amber-500/30',
  completed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  failed:    'bg-red-500/15 text-red-400 border-red-500/30',
  error:     'bg-red-500/15 text-red-400 border-red-500/30',
  queued:    'bg-purple-500/15 text-purple-400 border-purple-500/30',
  idle:      'bg-slate-500/15 text-slate-400 border-slate-500/30',
  disabled:  'bg-slate-700/30 text-slate-600 border-slate-700/40',
}

const labels: Record<string, string> = {
  running:   'Running',
  active:    'Active',
  paused:    'Paused',
  completed: 'Done',
  failed:    'Failed',
  error:     'Error',
  queued:    'Queued',
  idle:      'Idle',
  disabled:  'Disabled',
}

export default function StatusBadge({ status, dot = false }: { status: Status; dot?: boolean }) {
  const cls = styles[status] ?? styles.idle
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold font-mono ${cls}`}>
      {dot && (
        <span className={[
          'w-1.5 h-1.5 rounded-full',
          status === 'running' || status === 'active' ? 'animate-pulse bg-current' : 'bg-current',
        ].join(' ')} />
      )}
      {labels[status] ?? status}
    </span>
  )
}
