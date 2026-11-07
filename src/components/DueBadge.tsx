import { CalendarClock } from 'lucide-react'
import { dueInfo } from '../due'
import type { DueTone } from '../due'
import { ACCENT } from '../theme'
import type { AccentKey } from '../theme'

interface DueBadgeProps {
  due?: string
  done?: boolean
  accent?: AccentKey
  className?: string
}

function toneClass(tone: DueTone, accent: AccentKey): string {
  switch (tone) {
    case 'overdue':
      return 'bg-red-500/10 text-red-700 dark:text-red-400'
    case 'today':
      return 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400'
    case 'soon':
      return `${ACCENT[accent].softBg} ${ACCENT[accent].text}`
    case 'done':
      return 'text-neutral-400 line-through dark:text-neutral-500'
    default:
      return 'bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400'
  }
}

// Renders nothing when there is no due date
export default function DueBadge({ due, done, accent = 'home', className = '' }: DueBadgeProps) {
  const { tone, label } = dueInfo(due, done)
  if (!label) return null
  return (
    <span
      title={due}
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium whitespace-nowrap tabular-nums ${toneClass(tone, accent)} ${className}`}
    >
      <CalendarClock className="size-3" aria-hidden />
      {label}
    </span>
  )
}
