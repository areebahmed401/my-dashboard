import type { Project, Task } from '../data/types'
import { createCalendar, deleteEvent, insertEvent, listCalendars, listTaggedEvents, patchEvent } from './api'
import type { GCalendar, GEvent } from './api'
import { TASKS_CALENDAR_NAME, getTasksCalendarId, setTasksCalendarId } from './config'

// Date arithmetic on YYYY-MM-DD strings in UTC (no timezone shifts)
export function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)
}

export function isTasksCalendar(c: GCalendar): boolean {
  const id = getTasksCalendarId()
  return id ? c.id === id : c.summary === TASKS_CALENDAR_NAME && c.accessRole === 'owner'
}

export interface SyncResult {
  added: number
  updated: number
  removed: number
}

export async function tasksCalendarId(): Promise<string> {
  const cals = await listCalendars()
  const stored = getTasksCalendarId()
  if (stored && cals.some((c) => c.id === stored)) return stored
  // Reuse one created from another browser before making a new one
  const found =
    cals.find((c) => c.summary === TASKS_CALENDAR_NAME && c.accessRole === 'owner') ??
    (await createCalendar(TASKS_CALENDAR_NAME))
  setTasksCalendarId(found.id)
  return found.id
}

export async function syncTasks(tasks: Task[], projects: Project[]): Promise<SyncResult> {
  const calendarId = await tasksCalendarId()
  const byProject = new Map(projects.map((p) => [p.id, p]))
  const desired = new Map<string, { summary: string; description: string; start: string; end: string }>()
  for (const t of tasks) {
    if (!t.due) continue
    const p = byProject.get(t.projectId)
    desired.set(t.id, {
      summary: (t.status === 'done' ? '✓ ' : '') + t.title,
      description: `Project: ${p?.name ?? '?'} · Domain: ${p?.domain ?? '?'}`,
      start: t.due,
      end: addDays(t.due, 1),
    })
  }

  const result: SyncResult = { added: 0, updated: 0, removed: 0 }
  const seen = new Set<string>()
  const existing: GEvent[] = await listTaggedEvents(calendarId)
  for (const e of existing) {
    const id = e.extendedProperties?.private?.dashboardTaskId ?? ''
    const want = desired.get(id)
    if (!want || seen.has(id)) {
      await deleteEvent(calendarId, e.id)
      result.removed++
      continue
    }
    seen.add(id)
    if (
      e.summary !== want.summary ||
      (e.description ?? '') !== want.description ||
      e.start.date !== want.start ||
      e.end.date !== want.end
    ) {
      await patchEvent(calendarId, e.id, {
        summary: want.summary,
        description: want.description,
        start: { date: want.start, dateTime: null, timeZone: null },
        end: { date: want.end, dateTime: null, timeZone: null },
      })
      result.updated++
    }
  }
  for (const [id, want] of desired) {
    if (seen.has(id)) continue
    await insertEvent(calendarId, {
      summary: want.summary,
      description: want.description,
      start: { date: want.start },
      end: { date: want.end },
      extendedProperties: { private: { dashboardTaskId: id } },
    })
    result.added++
  }
  return result
}
