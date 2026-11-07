import { ACCENT, FOCUS_RING } from '../theme'
import type { AccentKey } from '../theme'

// Class builders, for links or anything else that should look like a Button / IconButton
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md'

const VARIANT: Record<Exclude<ButtonVariant, 'primary'>, string> = {
  secondary:
    'border border-neutral-200 bg-white text-neutral-700 shadow-sm hover:bg-neutral-50 hover:text-neutral-900 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200 dark:shadow-none dark:hover:bg-neutral-900 dark:hover:text-white',
  ghost:
    'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-100',
  danger: 'bg-red-600 text-white shadow-sm hover:bg-red-700 dark:shadow-none',
}

const SIZE: Record<ButtonSize, string> = {
  sm: 'h-8 gap-1.5 px-2.5 text-xs',
  md: 'h-9 gap-2 px-3.5 text-sm',
}

// Class string for anything that should look like a button (e.g. an <a>)
export function buttonClass({
  variant = 'secondary',
  size = 'md',
  accent = 'home',
}: { variant?: ButtonVariant; size?: ButtonSize; accent?: AccentKey } = {}): string {
  const look = variant === 'primary' ? `${ACCENT[accent].solid} shadow-sm dark:shadow-none` : VARIANT[variant]
  const ring = variant === 'danger' ? 'focus-visible:ring-red-500/50' : ACCENT[accent].ring
  return `inline-flex shrink-0 items-center justify-center rounded-lg font-medium whitespace-nowrap transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 ${FOCUS_RING} ${ring} ${SIZE[size]} ${look}`
}

export function iconButtonClass(size: 'sm' | 'md' = 'md', accent: AccentKey = 'home', active = false): string {
  const box = size === 'sm' ? 'size-8' : 'size-9'
  const look = active
    ? `${ACCENT[accent].softBg} ${ACCENT[accent].text}`
    : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-100'
  return `inline-flex shrink-0 items-center justify-center rounded-lg transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 ${FOCUS_RING} ${ACCENT[accent].ring} ${box} ${look}`
}
