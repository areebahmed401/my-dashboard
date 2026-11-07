import type { BasicTask, ClaudeTask, Domain, Priority, Task } from './data/types'

// Legacy class strings, restyled to the neutral system; prefer the components in src/components/
export const BUTTON =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 shadow-sm transition-colors duration-150 hover:bg-neutral-50 hover:text-neutral-900 outline-none focus-visible:ring-2 focus-visible:ring-neutral-500/40 disabled:pointer-events-none disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200 dark:shadow-none dark:hover:bg-neutral-900 dark:hover:text-white'
export const PRIMARY =
  'inline-flex items-center justify-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-colors duration-150 hover:bg-neutral-700 outline-none focus-visible:ring-2 focus-visible:ring-neutral-500/50 disabled:pointer-events-none disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:shadow-none dark:hover:bg-white'
export const INPUT =
  'rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-900 placeholder:text-neutral-400 transition-colors duration-150 outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-500/20 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100 dark:placeholder:text-neutral-600 dark:focus:border-neutral-600 dark:[color-scheme:dark]'
export const MUTED = 'text-sm text-neutral-500 dark:text-neutral-400'

export const BASIC_STATUSES: BasicTask['status'][] = ['todo', 'doing', 'done']
export const CLAUDE_STATUSES: ClaudeTask['status'][] = ['queued', 'in-progress', 'review', 'done', 'blocked']

// Option order for status selects and filters
export function statusesFor(domain: Domain): string[] {
  return domain === 'claude' ? CLAUDE_STATUSES : BASIC_STATUSES
}

// Board column order
export function columnsFor(domain: Domain): string[] {
  return domain === 'claude' ? ['queued', 'in-progress', 'review', 'blocked', 'done'] : BASIC_STATUSES
}

export const PRIORITIES: Priority[] = [1, 2, 3, 4]
export const PRIORITY_LABEL: Record<Priority, string> = {
  1: 'P1 Urgent',
  2: 'P2 High',
  3: 'P3 Normal',
  4: 'P4 Someday',
}
export const ESTIMATE_OPTIONS = [15, 30, 45, 60, 90, 120, 180, 240]

export function formatEstimate(min: number): string {
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  return min % 60 === 0 ? `${h}h` : `${h}h ${min % 60}m`
}

// Open tasks first, then by priority (1 first), due date (none last), then creation time
export function compareTasks(a: Task, b: Task): number {
  const open = Number(a.status === 'done') - Number(b.status === 'done')
  if (open !== 0) return open
  if (a.priority !== b.priority) return a.priority - b.priority
  if (a.due !== b.due) {
    if (!a.due) return 1
    if (!b.due) return -1
    return a.due < b.due ? -1 : 1
  }
  return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0
}
