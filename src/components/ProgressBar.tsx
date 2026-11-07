import { ACCENT } from '../theme'
import type { AccentKey } from '../theme'

interface ProgressBarProps {
  value: number
  max: number
  accent?: AccentKey
  label?: string
  className?: string
}

export default function ProgressBar({ value, max, accent = 'home', label = 'Progress', className = '' }: ProgressBarProps) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={`h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800 ${className}`}
    >
      <div className={`h-full rounded-full transition-[width] duration-300 ${ACCENT[accent].bar}`} style={{ width: `${pct}%` }} />
    </div>
  )
}
