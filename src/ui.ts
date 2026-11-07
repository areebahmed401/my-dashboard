import type { BasicTask, ClaudeTask, Domain, Task } from './data/types'

export const BUTTON =
  'rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800'
export const PRIMARY =
  'rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300'
export const INPUT =
  'rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900'
export const MUTED = 'text-sm text-slate-500 dark:text-slate-400'

export const BASIC_STATUSES: BasicTask['status'][] = ['todo', 'doing', 'done']
export const CLAUDE_STATUSES: ClaudeTask['status'][] = ['queued', 'in-progress', 'done', 'blocked']

// Option order for status selects and filters
export function statusesFor(domain: Domain): string[] {
  return domain === 'claude' ? CLAUDE_STATUSES : BASIC_STATUSES
}

// Board column order
export function columnsFor(domain: Domain): string[] {
  return domain === 'claude' ? ['queued', 'in-progress', 'blocked', 'done'] : BASIC_STATUSES
}

// Open tasks first, then by due date (none last), then creation time
export function compareTasks(a: Task, b: Task): number {
  const open = Number(a.status === 'done') - Number(b.status === 'done')
  if (open !== 0) return open
  if (a.due !== b.due) {
    if (!a.due) return 1
    if (!b.due) return -1
    return a.due < b.due ? -1 : 1
  }
  return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0
}
