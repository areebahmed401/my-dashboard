import type { LucideIcon } from 'lucide-react'
import { ACCENT, FOCUS_RING } from '../theme'
import type { AccentKey } from '../theme'

export interface SegmentOption<T extends string> {
  value: T
  label: string
  icon?: LucideIcon
}

interface SegmentedProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: SegmentOption<T>[]
  label: string // accessible group name
  accent?: AccentKey
  size?: 'sm' | 'md'
  className?: string
}

export default function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  accent = 'home',
  size = 'md',
  className = '',
}: SegmentedProps<T>) {
  const item = size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-sm'
  return (
    <div
      role="group"
      aria-label={label}
      className={`inline-flex items-center gap-0.5 rounded-lg border border-neutral-200 bg-neutral-100 p-0.5 dark:border-neutral-800 dark:bg-neutral-950 ${className}`}
    >
      {options.map((o) => {
        const on = o.value === value
        const Icon = o.icon
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className={`inline-flex items-center gap-1.5 rounded-md font-medium transition-colors duration-150 ${FOCUS_RING} ${ACCENT[accent].ring} ${item} ${
              on
                ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-white dark:shadow-none'
                : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
            }`}
          >
            {Icon && <Icon className={`size-3.5 ${on ? ACCENT[accent].text : ''}`} aria-hidden />}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
