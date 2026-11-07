import type { ReactNode } from 'react'
import { Check } from 'lucide-react'
import { STATUS_LABEL, statusPill } from '../theme'
import type { AccentKey } from '../theme'

interface PillProps {
  status?: string // styles and labels it as a task status
  accent?: AccentKey
  className?: string // colour classes when no status is given
  children?: ReactNode
}

export default function Pill({ status, accent = 'home', className = '', children }: PillProps) {
  const colours = status ? statusPill(status, accent) : className
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${colours} ${status ? className : ''}`}
    >
      {status === 'done' && <Check className="size-3" strokeWidth={2.5} aria-hidden />}
      {children ?? (status ? (STATUS_LABEL[status] ?? status) : null)}
    </span>
  )
}
