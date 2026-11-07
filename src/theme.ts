/*
 * Design system (read this before restyling a view)
 *
 * Palette: NEUTRAL only. Light: page bg-neutral-50, surfaces bg-white + border-neutral-200 + shadow-sm.
 * Dark is true black: page bg-black, surfaces bg-neutral-950 + border-neutral-800/80, raised bg-neutral-900.
 * Dark mode is class based (`.dark` on <html>, see useTheme), so always pair light classes with `dark:` ones.
 *
 * Tokens here: SURFACE / RAISED (card + popover classes), TEXT / MUTED_TEXT / FAINT_TEXT, HOVER, FOCUS_RING,
 * ACCENT[key] (literal per-domain classes: text, softBg, softBorder, dot, solid, ring, bar, gradient, label, icon),
 * statusPill(status, accent) + STATUS_LABEL, NAV_KEYS / Route, useTheme().
 * Primitives in src/components/: Button (+ buttonClass for <a>), IconButton, Card, Pill, Segmented, Modal,
 * EmptyState, StatCard, ProgressBar, DueBadge, ThemeToggle, SyncStatus. Toasts: useToast / useDeleteWithUndo
 * (src/components/useToast.ts). Inputs: INPUT from src/ui.ts. Due dates: dueInfo() in src/due.ts.
 * Conventions: rounded-xl cards, rounded-lg controls, transition-colors duration-150, tabular-nums for counts,
 * focus-visible rings in the accent (`FOCUS_RING` + ACCENT[key].ring).
 */
import { useSyncExternalStore } from 'react'
import { Briefcase, CalendarDays, GraduationCap, House, Sparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Domain, Priority } from './data/types'

export type AccentKey = 'home' | Domain | 'calendar'
export type Route = AccentKey | 'settings'

export const DOMAINS: Domain[] = ['study', 'job-search', 'claude']
export const NAV_KEYS: AccentKey[] = ['home', ...DOMAINS]

export const SURFACE =
  'rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800/80 dark:bg-neutral-950 dark:shadow-none'
export const RAISED =
  'rounded-xl border border-neutral-200 bg-white shadow-lg dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-none'
export const TEXT = 'text-neutral-900 dark:text-neutral-100'
export const MUTED_TEXT = 'text-neutral-500 dark:text-neutral-400'
export const FAINT_TEXT = 'text-neutral-400 dark:text-neutral-500'
export const HOVER = 'hover:bg-neutral-100 dark:hover:bg-neutral-900'
export const FOCUS_RING = 'outline-none focus-visible:ring-2 focus-visible:ring-offset-0'

export interface Accent {
  label: string
  icon: LucideIcon
  text: string
  softBg: string
  softBorder: string
  dot: string
  solid: string
  ring: string
  bar: string
  gradient: string
}

export const ACCENT: Record<AccentKey, Accent> = {
  home: {
    label: 'Home',
    icon: House,
    text: 'text-neutral-900 dark:text-neutral-100',
    softBg: 'bg-neutral-900/5 dark:bg-white/10',
    softBorder: 'border-neutral-900/10 dark:border-white/15',
    dot: 'bg-neutral-500',
    solid: 'bg-neutral-900 text-white hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white',
    ring: 'focus-visible:ring-neutral-500/50',
    bar: 'bg-neutral-900 dark:bg-neutral-100',
    gradient: 'bg-linear-to-br from-neutral-500/15 to-transparent',
  },
  study: {
    label: 'Study',
    icon: GraduationCap,
    text: 'text-blue-600 dark:text-blue-400',
    softBg: 'bg-blue-500/10 dark:bg-blue-400/10',
    softBorder: 'border-blue-500/20 dark:border-blue-400/20',
    dot: 'bg-blue-500',
    solid: 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600',
    ring: 'focus-visible:ring-blue-500/50',
    bar: 'bg-blue-500',
    gradient: 'bg-linear-to-br from-blue-500/15 to-transparent',
  },
  'job-search': {
    label: 'Job Search',
    icon: Briefcase,
    text: 'text-emerald-600 dark:text-emerald-400',
    softBg: 'bg-emerald-500/10 dark:bg-emerald-400/10',
    softBorder: 'border-emerald-500/20 dark:border-emerald-400/20',
    dot: 'bg-emerald-500',
    solid: 'bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500',
    ring: 'focus-visible:ring-emerald-500/50',
    bar: 'bg-emerald-500',
    gradient: 'bg-linear-to-br from-emerald-500/15 to-transparent',
  },
  claude: {
    label: 'Claude',
    icon: Sparkles,
    text: 'text-claude-600 dark:text-claude-400',
    softBg: 'bg-claude-500/10',
    softBorder: 'border-claude-500/25',
    dot: 'bg-claude-500',
    solid: 'bg-claude-500 text-white hover:bg-claude-600',
    ring: 'focus-visible:ring-claude-500/50',
    bar: 'bg-claude-500',
    gradient: 'bg-linear-to-br from-claude-500/15 to-transparent',
  },
  calendar: {
    label: 'Calendar',
    icon: CalendarDays,
    text: 'text-fuchsia-600 dark:text-fuchsia-400',
    softBg: 'bg-fuchsia-500/10 dark:bg-fuchsia-400/10',
    softBorder: 'border-fuchsia-500/20 dark:border-fuchsia-400/20',
    dot: 'bg-fuchsia-500',
    solid: 'bg-fuchsia-600 text-white hover:bg-fuchsia-700 dark:bg-fuchsia-500 dark:hover:bg-fuchsia-600',
    ring: 'focus-visible:ring-fuchsia-500/50',
    bar: 'bg-fuchsia-500',
    gradient: 'bg-linear-to-br from-fuchsia-500/15 to-transparent',
  },
}

export const STATUS_LABEL: Record<string, string> = {
  todo: 'To do',
  doing: 'Doing',
  done: 'Done',
  queued: 'Queued',
  'in-progress': 'In progress',
  review: 'Review',
  blocked: 'Blocked',
}

const PILL_NEUTRAL = 'bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300'

// Classes for a status pill; `doing` takes the domain accent
export function statusPill(status: string, accent: AccentKey = 'home'): string {
  switch (status) {
    case 'doing':
      return `${ACCENT[accent].softBg} ${ACCENT[accent].text}`
    case 'done':
      return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
    case 'in-progress':
      return 'bg-claude-500/10 text-claude-700 dark:text-claude-400'
    case 'review':
      return 'bg-violet-500/10 text-violet-700 dark:text-violet-400'
    case 'blocked':
      return 'bg-red-500/10 text-red-700 dark:text-red-400'
    default:
      return PILL_NEUTRAL
  }
}

// Classes for a priority pill: P1 red, P2 amber, P3/P4 neutral
export function priorityPill(p: Priority): string {
  switch (p) {
    case 1:
      return 'bg-red-500/10 text-red-700 dark:text-red-400'
    case 2:
      return 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
    default:
      return PILL_NEUTRAL
  }
}

// Theme preference: System follows prefers-color-scheme; index.html applies it before first paint
export type ThemePref = 'system' | 'light' | 'dark'
const THEME_KEY = 'my-dashboard.theme'
const media = window.matchMedia('(prefers-color-scheme: dark)')
const themeListeners = new Set<() => void>()

function readPref(): ThemePref {
  try {
    const v = localStorage.getItem(THEME_KEY)
    if (v === 'light' || v === 'dark') return v
  } catch {
    // storage unavailable
  }
  return 'system'
}

let pref = readPref()

function applyTheme() {
  const dark = pref === 'dark' || (pref === 'system' && media.matches)
  document.documentElement.classList.toggle('dark', dark)
}

media.addEventListener('change', () => {
  if (pref === 'system') applyTheme()
})
applyTheme()

export function setThemePref(p: ThemePref) {
  pref = p
  try {
    if (p === 'system') localStorage.removeItem(THEME_KEY)
    else localStorage.setItem(THEME_KEY, p)
  } catch {
    // storage unavailable: preference lasts for this session
  }
  applyTheme()
  themeListeners.forEach((l) => l())
}

function subscribeTheme(l: () => void) {
  themeListeners.add(l)
  return () => {
    themeListeners.delete(l)
  }
}

export function useTheme(): [ThemePref, (p: ThemePref) => void] {
  const p = useSyncExternalStore(subscribeTheme, () => pref)
  return [p, setThemePref]
}
