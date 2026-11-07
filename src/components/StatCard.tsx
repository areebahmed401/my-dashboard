import type { LucideIcon } from 'lucide-react'
import { ACCENT, FOCUS_RING, SURFACE } from '../theme'
import type { AccentKey } from '../theme'

export type StatTone = AccentKey | 'red'

const RED = { text: 'text-red-600 dark:text-red-400', softBg: 'bg-red-500/10', ring: 'focus-visible:ring-red-500/50' }

interface StatCardProps {
  label: string
  value: number
  icon: LucideIcon
  tone?: StatTone
  hint?: string
  active?: boolean
  onClick?: () => void
}

export default function StatCard({ label, value, icon: Icon, tone = 'home', hint, active = false, onClick }: StatCardProps) {
  const t = tone === 'red' ? RED : ACCENT[tone]
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs font-medium text-neutral-500 sm:text-sm dark:text-neutral-400">{label}</span>
        <span className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${t.softBg} ${t.text}`}>
          <Icon className="size-4" aria-hidden />
        </span>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span
          className={`text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl ${value > 0 ? t.text : 'text-neutral-900 dark:text-neutral-100'}`}
        >
          {value}
        </span>
        {hint && <span className="truncate text-xs text-neutral-400 dark:text-neutral-500">{hint}</span>}
      </div>
    </>
  )
  const base = `${SURFACE} block w-full p-4 text-left`
  if (!onClick) return <div className={base}>{body}</div>
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`${base} transition-colors duration-150 ${FOCUS_RING} ${t.ring} ${
        active
          ? 'border-neutral-400 ring-1 ring-neutral-400/40 dark:border-neutral-600 dark:ring-neutral-600/40'
          : 'hover:border-neutral-300 dark:hover:border-neutral-700'
      }`}
    >
      {body}
    </button>
  )
}
