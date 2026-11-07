export type DueTone = 'overdue' | 'today' | 'soon' | 'later' | 'none' | 'done'

const pad = (n: number) => String(n).padStart(2, '0')

export function localYmd(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Whole days from today (local) to a YYYY-MM-DD; negative when past
export function daysUntil(due: string, today: Date = new Date()): number {
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((parseYmd(due).getTime() - t.getTime()) / 86_400_000)
}

// "14 Nov", plus the year when it is not the current one
export function formatShortDate(ymd: string): string {
  const d = parseYmd(ymd)
  const sameYear = d.getFullYear() === new Date().getFullYear()
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) })
}

export function dueInfo(due?: string, done?: boolean): { tone: DueTone; label: string } {
  if (!due) return { tone: done ? 'done' : 'none', label: '' }
  if (done) return { tone: 'done', label: formatShortDate(due) }
  const n = daysUntil(due)
  if (n < 0) return { tone: 'overdue', label: `Overdue ${-n}d` }
  if (n === 0) return { tone: 'today', label: 'Today' }
  if (n === 1) return { tone: 'soon', label: 'Tomorrow' }
  const tone = n <= 3 ? 'soon' : 'later'
  if (n <= 6) return { tone, label: parseYmd(due).toLocaleDateString('en-GB', { weekday: 'short' }) }
  return { tone, label: formatShortDate(due) }
}
