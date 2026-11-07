import { ChevronDown } from 'lucide-react'
import { ACCENT, FOCUS_RING, STATUS_LABEL, statusPill } from '../theme'
import type { AccentKey } from '../theme'

interface StatusSelectProps {
  value: string
  statuses: string[]
  onChange: (status: string) => void
  label: string // aria-label
  accent?: AccentKey
  className?: string
}

// Native select dressed as the status pill, so keyboard and touch behave natively
export default function StatusSelect({ value, statuses, onChange, label, accent = 'home', className = '' }: StatusSelectProps) {
  return (
    <span className={`relative inline-flex shrink-0 ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className={`cursor-pointer appearance-none rounded-full border-0 py-0.5 pr-6 pl-2.5 text-xs font-medium transition-colors duration-150 dark:[color-scheme:dark] ${FOCUS_RING} ${ACCENT[accent].ring} ${statusPill(value, accent)}`}
      >
        {statuses.map((s) => (
          <option key={s} value={s} className="bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
            {STATUS_LABEL[s] ?? s}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-1.5 size-3 -translate-y-1/2 opacity-70" aria-hidden />
    </span>
  )
}
