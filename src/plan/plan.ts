// Planner: fits open tasks into the free time inside working hours, in priority order. Pure (no React, no I/O).
// All times are local; days are YYYY-MM-DD strings.
import type { Priority, Settings, Task, WorkDay } from '../data/types'

export interface Busy {
  start: Date
  end: Date
  title?: string
}
export interface Gap {
  start: Date
  end: Date
}
export interface Slot {
  start: Date
  end: Date
  task: Task
  part?: string // '1/2' when a long task is split across gaps
  review?: true // a Claude task waiting for my review: a 15 min slot, whatever its estimate
}
export interface DayPlan {
  ymd: string
  workDay: WorkDay // null = day off
  slots: Slot[]
  events: Busy[]
}
export interface Plan {
  days: DayPlan[]
  unscheduled: Task[]
}

const MIN = 60_000
export const GRID_MIN = 15 // gaps shorter than this are dropped; "now" rounds up to it
export const EVENT_BUFFER_MIN = 5
export const SPLIT_ABOVE_MIN = 60 // only estimates longer than this may be split
export const MIN_CHUNK_MIN = 30
export const REVIEW_MIN = 15
const DUE_SOON_DAYS = 2

const pad = (n: number) => String(n).padStart(2, '0')
export const ymdOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

function parseYmd(ymd: string): [number, number, number] {
  const [y, m, d] = ymd.split('-').map(Number)
  return [y, m - 1, d]
}

export function addDaysYmd(ymd: string, n: number): string {
  const [y, m, d] = parseYmd(ymd)
  return ymdOf(new Date(y, m, d + n))
}

function dayDiff(from: string, to: string): number {
  const [fy, fm, fd] = parseYmd(from)
  const [ty, tm, td] = parseYmd(to)
  return Math.round((Date.UTC(ty, tm, td) - Date.UTC(fy, fm, fd)) / 86_400_000)
}

// Local Date of a day plus 'HH:MM'
export function atTime(ymd: string, hhmm: string): Date {
  const [y, m, d] = parseYmd(ymd)
  const [h, min] = hhmm.split(':').map(Number)
  return new Date(y, m, d, h, min)
}

export const isReview = (t: Task) => t.kind === 'claude' && t.status === 'review'

// task.priority, one level higher (min P1) when overdue or due within 2 days
export function effectivePriority(task: Task, today: string): Priority {
  if (task.due && dayDiff(today, task.due) <= DUE_SOON_DAYS) return Math.max(1, task.priority - 1) as Priority
  return task.priority
}

// Open tasks by effective priority, then due date (none last), then creation time
export function orderTasks(tasks: Task[], today: string): Task[] {
  return tasks
    .filter((t) => t.status !== 'done' && t.status !== 'blocked') // blocked tasks wait, they are not planned
    .filter((t) => !(t.kind === 'claude' && t.auto && (t.status === 'queued' || t.status === 'in-progress'))) // Claude does these
    .sort((a, b) => {
      const pa = effectivePriority(a, today)
      const pb = effectivePriority(b, today)
      if (pa !== pb) return pa - pb
      if (a.due !== b.due) {
        if (!a.due) return 1
        if (!b.due) return -1
        return a.due < b.due ? -1 : 1
      }
      return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0
    })
}

// `d` rounded up to the next quarter hour (unchanged when already on one)
function ceilToGrid(d: Date): Date {
  const mins = d.getHours() * 60 + d.getMinutes() + (d.getSeconds() > 0 || d.getMilliseconds() > 0 ? 1 : 0)
  const up = Math.ceil(mins / GRID_MIN) * GRID_MIN
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, up)
}

// The work window minus the busy intervals. For today the window starts no earlier than `now` (rounded up to
// 15 min); a day that is already over has no gaps. Gaps under 15 min are dropped.
export function freeGaps(dayYmd: string, workDay: WorkDay, busy: Busy[], now?: Date): Gap[] {
  if (!workDay) return []
  let start = atTime(dayYmd, workDay.start)
  const end = atTime(dayYmd, workDay.end)
  if (now) {
    const today = ymdOf(now)
    if (dayYmd < today) return []
    if (dayYmd === today) {
      const from = ceilToGrid(now)
      if (from > start) start = from
    }
  }
  const sorted = busy
    .filter((b) => b.end > start && b.start < end && b.end > b.start)
    .map((b) => ({ start: b.start, end: b.end }))
    .sort((a, b) => a.start.getTime() - b.start.getTime())
  const gaps: Gap[] = []
  let cursor = start
  for (const b of sorted) {
    if (b.start > cursor) gaps.push({ start: cursor, end: b.start })
    if (b.end > cursor) cursor = b.end
  }
  if (end > cursor) gaps.push({ start: cursor, end })
  return gaps.filter((g) => g.end.getTime() - g.start.getTime() >= GRID_MIN * MIN)
}

interface OpenGap extends Gap {
  day: number // index into the plan's days
}

const gapMin = (g: Gap) => (g.end.getTime() - g.start.getTime()) / MIN

// Chunk sizes (minutes) per gap for a split task, or null when the gaps cannot hold it
function splitAcross(gaps: OpenGap[], estimate: number): { gap: OpenGap; min: number }[] | null {
  const out: { gap: OpenGap; min: number }[] = []
  let left = estimate
  for (const gap of gaps) {
    if (left <= 0) break
    const room = gapMin(gap)
    if (room < MIN_CHUNK_MIN) continue
    let take = Math.min(room, left)
    // never leave a remainder smaller than a chunk
    if (left - take > 0 && left - take < MIN_CHUNK_MIN) take = left - MIN_CHUNK_MIN
    if (take < MIN_CHUNK_MIN) continue
    out.push({ gap, min: take })
    left -= take
  }
  return left > 0 ? null : out
}

// Greedy fill, day by day, task by task (priority order). Each task takes the earliest gap that holds all of its
// estimate; failing that, an estimate over 60 min is split into chunks of >= 30 min across the gaps in order.
// Events get a 5 min buffer afterwards; tasks are packed back to back.
export function planDays(
  days: string[],
  settings: Settings,
  busyByDay: Record<string, Busy[]>,
  tasks: Task[],
  today: string,
  now: Date,
): Plan {
  const plans: DayPlan[] = days.map((ymd) => {
    const [y, m, d] = parseYmd(ymd)
    return { ymd, workDay: settings.workHours[new Date(y, m, d).getDay()] ?? null, slots: [], events: busyByDay[ymd] ?? [] }
  })
  const gaps: OpenGap[] = plans.flatMap((p, day) => {
    const buffered = p.events.map((e) => ({ ...e, end: new Date(e.end.getTime() + EVENT_BUFFER_MIN * MIN) }))
    return freeGaps(p.ymd, p.workDay, buffered, now).map((g) => ({ ...g, day }))
  })

  const place = (gap: OpenGap, task: Task, min: number, part?: string) => {
    const end = new Date(gap.start.getTime() + min * MIN)
    plans[gap.day].slots.push({ start: gap.start, end, task, part, ...(isReview(task) && { review: true as const }) })
    gap.start = end
  }

  const unscheduled: Task[] = []
  for (const task of orderTasks(tasks, today)) {
    const estimate = isReview(task) ? REVIEW_MIN : Math.max(1, task.estimateMin)
    const whole = gaps.find((g) => gapMin(g) >= estimate)
    if (whole) {
      place(whole, task, estimate)
      continue
    }
    const chunks = estimate > SPLIT_ABOVE_MIN ? splitAcross(gaps, estimate) : null
    if (!chunks) {
      unscheduled.push(task)
      continue
    }
    chunks.forEach((c, i) => place(c.gap, task, c.min, `${i + 1}/${chunks.length}`))
  }

  for (const p of plans) p.slots.sort((a, b) => a.start.getTime() - b.start.getTime())
  return { days: plans, unscheduled }
}

// RFC3339 with the local UTC offset, as the Calendar API wants it
export function toRfc3339(d: Date): string {
  const off = -d.getTimezoneOffset()
  const sign = off >= 0 ? '+' : '-'
  const abs = Math.abs(off)
  return `${ymdOf(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
}
