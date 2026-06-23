import { cn } from '@/lib/utils'
import { STATUS_CONFIG, PRIORITY_CONFIG } from '@/lib/utils'
import type { RequestStatus, RequestPriority } from '@/types'

interface StatusBadgeProps {
  status: RequestStatus
  className?: string
  showDot?: boolean
}

export function StatusBadge({ status, className, showDot = true }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
        config.bg,
        config.color,
        className
      )}
    >
      {showDot && <span className={cn('h-1.5 w-1.5 rounded-full', config.dot)} />}
      {config.label}
    </span>
  )
}

interface PriorityBadgeProps {
  priority: RequestPriority
  className?: string
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const config = PRIORITY_CONFIG[priority]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
        config.bg,
        config.color,
        className
      )}
    >
      {config.label}
    </span>
  )
}
