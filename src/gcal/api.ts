import { getAccessToken, markExpired } from './auth'
import { getClientId } from './config'

export class GoogleAuthError extends Error {}

export type AccessRole = 'owner' | 'writer' | 'reader' | 'freeBusyReader'

export interface GCalendar {
  id: string
  summary: string
  backgroundColor: string
  accessRole: AccessRole
  primary: boolean
}

// date for all-day events, dateTime (+ timeZone) for timed ones; null clears a field in a patch
export interface EventTime {
  date?: string | null
  dateTime?: string | null
  timeZone?: string | null
}

export interface GEvent {
  id: string
  summary?: string
  description?: string
  start: EventTime
  end: EventTime
  extendedProperties?: { private?: Record<string, string> }
}

export function canWrite(c: GCalendar | undefined): boolean {
  return c?.accessRole === 'owner' || c?.accessRole === 'writer'
}

export type EventInput = Omit<GEvent, 'id'>
export type EventPatch = Partial<EventInput>

const BASE = 'https://www.googleapis.com/calendar/v3'

const isMock = () => getClientId() === 'mock'

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAccessToken()
  if (!token) throw new GoogleAuthError('Google access expired')
  const res = await fetch(BASE + path, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    },
  })
  if (res.status === 401) {
    markExpired()
    throw new GoogleAuthError('Google access expired')
  }
  if (res.status === 204 || (init.method === 'DELETE' && res.status === 410)) {
    return undefined as T
  }
  if (!res.ok) {
    let msg = res.statusText
    try {
      const j = (await res.json()) as { error?: { message?: string } }
      if (j.error?.message) msg = j.error.message
    } catch {
      // body was not JSON
    }
    throw new Error(`Google Calendar ${res.status}: ${msg}`)
  }
  return (await res.json()) as T
}

const enc = encodeURIComponent

interface Page<T> {
  items?: T[]
  nextPageToken?: string
}

async function allPages<T>(path: string, params: Record<string, string>): Promise<T[]> {
  const out: T[] = []
  let pageToken = ''
  do {
    const q = new URLSearchParams(params)
    if (pageToken) q.set('pageToken', pageToken)
    const page = await call<Page<T>>(`${path}?${q}`)
    out.push(...(page.items ?? []))
    pageToken = page.nextPageToken ?? ''
  } while (pageToken)
  return out
}

interface CalendarListEntry {
  id: string
  summary?: string
  summaryOverride?: string
  backgroundColor?: string
  accessRole: AccessRole
  primary?: boolean
}

export async function listCalendars(): Promise<GCalendar[]> {
  if (import.meta.env.DEV && isMock()) return mock().listCalendars()
  const items = await allPages<CalendarListEntry>('/users/me/calendarList', { maxResults: '250' })
  return items.map((c) => ({
    id: c.id,
    summary: c.summaryOverride || c.summary || c.id,
    backgroundColor: c.backgroundColor || '#64748b',
    accessRole: c.accessRole,
    primary: c.primary === true,
  }))
}

// timeMin/timeMax: RFC3339 with offset
export async function listEvents(calendarId: string, timeMin: string, timeMax: string): Promise<GEvent[]> {
  if (import.meta.env.DEV && isMock()) return mock().listEvents(calendarId, timeMin, timeMax)
  return allPages<GEvent>(`/calendars/${enc(calendarId)}/events`, {
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
  })
}

export async function insertEvent(calendarId: string, event: EventInput): Promise<GEvent> {
  if (import.meta.env.DEV && isMock()) return mock().insertEvent(calendarId, event)
  return call<GEvent>(`/calendars/${enc(calendarId)}/events`, {
    method: 'POST',
    body: JSON.stringify(event),
  })
}

export async function patchEvent(calendarId: string, eventId: string, patch: EventPatch): Promise<GEvent> {
  if (import.meta.env.DEV && isMock()) return mock().patchEvent(calendarId, eventId, patch)
  return call<GEvent>(`/calendars/${enc(calendarId)}/events/${enc(eventId)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
}

export async function deleteEvent(calendarId: string, eventId: string): Promise<void> {
  if (import.meta.env.DEV && isMock()) return mock().deleteEvent(calendarId, eventId)
  await call<void>(`/calendars/${enc(calendarId)}/events/${enc(eventId)}`, { method: 'DELETE' })
}

export async function createCalendar(summary: string): Promise<GCalendar> {
  if (import.meta.env.DEV && isMock()) return mock().createCalendar(summary)
  const c = await call<{ id: string; summary: string }>('/calendars', {
    method: 'POST',
    body: JSON.stringify({ summary }),
  })
  return { id: c.id, summary: c.summary, backgroundColor: '#64748b', accessRole: 'owner', primary: false }
}

// All events tagged with a private dashboardTaskId (the API cannot filter on key presence alone)
export async function listTaggedEvents(calendarId: string): Promise<GEvent[]> {
  if (import.meta.env.DEV && isMock()) return mock().listTaggedEvents(calendarId)
  const items = await allPages<GEvent>(`/calendars/${enc(calendarId)}/events`, { maxResults: '2500' })
  return items.filter((e) => e.extendedProperties?.private?.dashboardTaskId)
}

// Dev-only in-memory fake (Client ID 'mock'); the import.meta.env.DEV guards strip it from production builds.
function createMock() {
  const pad = (n: number) => String(n).padStart(2, '0')
  const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const local = (d: Date, h: number, m = 0) => `${ymd(d)}T${pad(h)}:${pad(m)}:00`
  const monday = new Date()
  monday.setHours(0, 0, 0, 0)
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  const day = (n: number) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + n)
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone

  const calendars: GCalendar[] = [
    { id: 'mock-me', summary: 'Me', backgroundColor: '#4285f4', accessRole: 'owner', primary: true },
    { id: 'mock-holidays', summary: 'Holidays', backgroundColor: '#0b8043', accessRole: 'reader', primary: false },
  ]
  let seq = 0
  const ev = (summary: string, start: EventTime, end: EventTime): GEvent => ({
    id: `mock-ev-${++seq}`,
    summary,
    start,
    end,
  })
  const events: Record<string, GEvent[]> = {
    'mock-me': [
      ev('Team sync', { dateTime: local(day(0), 9), timeZone: tz }, { dateTime: local(day(0), 10), timeZone: tz }),
      ev('Lab session', { dateTime: local(day(1), 14), timeZone: tz }, { dateTime: local(day(1), 16), timeZone: tz }),
      ev('German class', { dateTime: local(day(2), 18, 30), timeZone: tz }, { dateTime: local(day(2), 20), timeZone: tz }),
      ev('Conference', { date: ymd(day(3)) }, { date: ymd(day(5)) }),
    ],
    'mock-holidays': [ev('Public holiday', { date: ymd(day(4)) }, { date: ymd(day(5)) })],
  }

  const ms = (t: EventTime) => (t.dateTime ? Date.parse(t.dateTime) : Date.parse(`${t.date}T00:00:00`))
  const list = (calendarId: string) => {
    const l = events[calendarId]
    if (!l) throw new Error(`Google Calendar 404: Not Found`)
    return l
  }
  const copy = <T,>(x: T): T => structuredClone(x)

  return {
    async listCalendars() {
      return copy(calendars)
    },
    async listEvents(calendarId: string, timeMin: string, timeMax: string) {
      const lo = Date.parse(timeMin)
      const hi = Date.parse(timeMax)
      return copy(
        list(calendarId)
          .filter((e) => ms(e.start) < hi && ms(e.end) > lo)
          .sort((a, b) => ms(a.start) - ms(b.start)),
      )
    },
    async insertEvent(calendarId: string, event: EventInput) {
      const e = { ...copy(event), id: `mock-ev-${++seq}` }
      list(calendarId).push(e)
      return copy(e)
    },
    async patchEvent(calendarId: string, eventId: string, patch: EventPatch) {
      const l = list(calendarId)
      const i = l.findIndex((e) => e.id === eventId)
      if (i < 0) throw new Error('Google Calendar 404: Not Found')
      const clean = (t: EventTime): EventTime =>
        Object.fromEntries(Object.entries(t).filter(([, v]) => v !== null)) as EventTime
      const next: GEvent = { ...l[i], ...copy(patch), id: eventId }
      if (patch.start) next.start = clean({ ...l[i].start, ...patch.start })
      if (patch.end) next.end = clean({ ...l[i].end, ...patch.end })
      l[i] = next
      return copy(next)
    },
    async deleteEvent(calendarId: string, eventId: string) {
      const l = list(calendarId)
      const i = l.findIndex((e) => e.id === eventId)
      if (i >= 0) l.splice(i, 1)
    },
    async createCalendar(summary: string) {
      const c: GCalendar = {
        id: `mock-cal-${++seq}`,
        summary,
        backgroundColor: '#8e24aa',
        accessRole: 'owner',
        primary: false,
      }
      calendars.push(c)
      events[c.id] = []
      return copy(c)
    },
    async listTaggedEvents(calendarId: string) {
      return copy(list(calendarId).filter((e) => e.extendedProperties?.private?.dashboardTaskId))
    },
  }
}

let mockApi: ReturnType<typeof createMock> | undefined
const mock = () => (mockApi ??= createMock())
