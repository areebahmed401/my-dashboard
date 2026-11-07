import { useEffect, useEffectEvent, useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Plus, RefreshCw } from 'lucide-react'
import EventEditor from './EventEditor'
import type { EditTarget } from './EventEditor'
import Button from './components/Button'
import EmptyState from './components/EmptyState'
import IconButton from './components/IconButton'
import { useData } from './data/store'
import type { Domain, Task } from './data/types'
import { dueInfo } from './due'
import type { DueTone } from './due'
import { GoogleAuthError, canWrite, listCalendars, listEvents } from './gcal/api'
import type { GCalendar, GEvent } from './gcal/api'
import { connect, loadGis, useGcalStatus } from './gcal/auth'
import { getHiddenCalendars, setHiddenCalendars } from './gcal/config'
import { addDays, isTasksCalendar, syncTasks } from './gcal/taskSync'
import { ACCENT, FOCUS_RING, MUTED_TEXT, SURFACE } from './theme'
import type { AccentKey } from './theme'

const A = ACCENT.calendar

const pad = (n: number) => String(n).padStart(2, '0')
const localYmd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

function mondayOf(d: Date): Date {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7))
  return m
}

// Local midnight of a YYYY-MM-DD as RFC3339 with the local offset
function rfc3339(ymd: string): string {
  const d = new Date(`${ymd}T00:00:00`)
  const off = -d.getTimezoneOffset()
  const sign = off >= 0 ? '+' : '-'
  return `${ymd}T00:00:00${sign}${pad(Math.floor(Math.abs(off) / 60))}:${pad(Math.abs(off) % 60)}`
}

const errText = (e: unknown) => (e instanceof Error ? e.message : 'Unknown error')

const ERROR_NOTE = 'rounded-lg bg-red-500/10 px-3 py-2 text-sm break-words text-red-700 dark:text-red-400'

function ConnectPanel({ reconnect }: { reconnect: boolean }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadGis().catch(() => {}) // preload so the click opens the popup directly
  }, [])

  const onConnect = () => {
    setBusy(true)
    setError(null)
    connect()
      .catch((e: unknown) => setError(errText(e)))
      .finally(() => setBusy(false))
  }

  return (
    <div className="mt-4 space-y-3">
      <EmptyState
        icon={CalendarDays}
        title={reconnect ? 'Google session expired' : 'Connect Google Calendar'}
        description="Testing-mode Google app: only your account can sign in. Access lasts about an hour, then click Reconnect."
        action={
          <Button variant="primary" accent="calendar" onClick={onConnect} disabled={busy}>
            {reconnect ? 'Reconnect Google' : 'Connect Google Calendar'}
          </Button>
        }
      />
      {error && <p className={ERROR_NOTE}>{error}</p>}
    </div>
  )
}

export default function CalendarView() {
  const status = useGcalStatus()
  if (status !== 'connected') return <ConnectPanel reconnect={status === 'expired'} />
  return <ConnectedCalendar />
}

interface CalEvent extends GEvent {
  calendarId: string
}

interface DayItems {
  ymd: string
  date: Date
  tasks: { task: Task; domain: Domain | null }[]
  allDay: CalEvent[]
  timed: CalEvent[]
}

const NO_EVENTS: CalEvent[] = []
let autoSynced = false

// Task chip colours follow the same tones as DueBadge
function taskChipClass(tone: DueTone, accent: AccentKey): string {
  switch (tone) {
    case 'overdue':
      return 'border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-400'
    case 'today':
      return 'border-yellow-500/50 bg-yellow-500/15 text-yellow-700 dark:text-yellow-400'
    case 'soon':
      return `border-current/40 ${ACCENT[accent].softBg} ${ACCENT[accent].text}`
    case 'done':
      return 'border-neutral-300 text-neutral-400 line-through dark:border-neutral-700 dark:text-neutral-500'
    default:
      return 'border-neutral-300 bg-neutral-100 text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400'
  }
}

function ConnectedCalendar() {
  const { data, status: dataStatus } = useData()
  const [weekStart, setWeekStart] = useState(() => localYmd(mondayOf(new Date())))
  const [calendars, setCalendars] = useState<GCalendar[] | null>(null)
  const [hidden, setHidden] = useState<string[]>(getHiddenCalendars)
  // key identifies the week + calendars + reload the result belongs to
  const [loaded, setLoaded] = useState<{ key: string; events: CalEvent[]; error: string | null }>({
    key: '',
    events: [],
    error: null,
  })
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [editing, setEditing] = useState<EditTarget | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState<{ text: string; ok: boolean } | null>(null)

  const [today] = useState(() => localYmd(new Date()))
  const shown = useMemo(() => (calendars ?? []).filter((c) => !isTasksCalendar(c)), [calendars])
  const visible = useMemo(() => shown.filter((c) => !hidden.includes(c.id)), [shown, hidden])
  const byId = useMemo(() => new Map(shown.map((c) => [c.id, c])), [shown])
  const loadKey = calendars ? `${weekStart}|${reloadKey}|${visible.map((c) => c.id).join(',')}` : ''
  const loading = calendars !== null && loaded.key !== loadKey
  const events = loaded.key === loadKey ? loaded.events : NO_EVENTS
  const loadError = loaded.key === loadKey ? loaded.error : null

  useEffect(() => {
    let live = true
    listCalendars()
      .then((c) => live && setCalendars(c))
      .catch((e: unknown) => {
        if (live && !(e instanceof GoogleAuthError)) setError(errText(e))
      })
    return () => {
      live = false
    }
  }, [])

  useEffect(() => {
    if (!loadKey) return
    let live = true
    const timeMin = rfc3339(weekStart)
    const timeMax = rfc3339(addDays(weekStart, 7))
    Promise.all(
      visible.map((c) =>
        listEvents(c.id, timeMin, timeMax).then((evs) => evs.map((e) => ({ ...e, calendarId: c.id }))),
      ),
    )
      .then((lists) => live && setLoaded({ key: loadKey, events: lists.flat(), error: null }))
      .catch((e: unknown) => {
        if (live && !(e instanceof GoogleAuthError)) setLoaded({ key: loadKey, events: [], error: errText(e) })
      })
    return () => {
      live = false
    }
  }, [loadKey, weekStart, visible])

  const runSync = async () => {
    if (!data) return
    setSyncing(true)
    try {
      const r = await syncTasks(data.tasks, data.projects)
      setSyncMsg({ text: `Synced: +${r.added} ~${r.updated} −${r.removed}`, ok: true })
    } catch (e) {
      if (!(e instanceof GoogleAuthError)) setSyncMsg({ text: `Sync failed: ${errText(e)}`, ok: false })
    } finally {
      setSyncing(false)
    }
  }

  // Sync once in the background on the first render with data after connecting
  const autoSync = useEffectEvent(() => void runSync())
  useEffect(() => {
    if (!data || autoSynced) return
    autoSynced = true
    setTimeout(autoSync, 0)
  }, [data])

  const days = useMemo<DayItems[]>(() => {
    const list: DayItems[] = Array.from({ length: 7 }, (_, i) => {
      const ymd = addDays(weekStart, i)
      return { ymd, date: new Date(`${ymd}T00:00:00`), tasks: [], allDay: [], timed: [] }
    })
    const at = (ymd: string) => list.find((d) => d.ymd === ymd)
    for (const e of events) {
      if (e.start.date) {
        const end = e.end.date ?? addDays(e.start.date, 1)
        for (const d of list) if (d.ymd >= e.start.date && d.ymd < end) d.allDay.push(e)
      } else if (e.start.dateTime) {
        at(localYmd(new Date(e.start.dateTime)))?.timed.push(e)
      }
    }
    for (const d of list) {
      d.timed.sort((a, b) => Date.parse(a.start.dateTime ?? '') - Date.parse(b.start.dateTime ?? ''))
    }
    if (data) {
      const domains = new Map(data.projects.map((p) => [p.id, p.domain]))
      for (const t of data.tasks) {
        if (t.due) at(t.due)?.tasks.push({ task: t, domain: domains.get(t.projectId) ?? null })
      }
    }
    return list
  }, [weekStart, events, data])

  const toggle = (id: string) => {
    const next = hidden.includes(id) ? hidden.filter((h) => h !== id) : [...hidden, id]
    setHidden(next)
    setHiddenCalendars(next)
  }

  const openNew = () => {
    const target = shown.find((c) => c.primary && canWrite(c)) ?? shown.find(canWrite)
    if (!target) {
      setError('No writable calendar.')
      return
    }
    const inWeek = today >= weekStart && today < addDays(weekStart, 7)
    setEditing({ calendarId: target.id, event: null, date: inWeek ? today : weekStart })
  }

  const weekLabel = (() => {
    const a = new Date(`${weekStart}T00:00:00`)
    const b = new Date(`${addDays(weekStart, 6)}T00:00:00`)
    const fmt = (d: Date, year: boolean) =>
      d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', ...(year ? { year: 'numeric' } : {}) })
    return `${fmt(a, false)} – ${fmt(b, true)}`
  })()

  const colorOf = (e: CalEvent) => byId.get(e.calendarId)?.backgroundColor ?? '#737373'
  const timeOf = (e: CalEvent) =>
    new Date(e.start.dateTime ?? '').toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })

  const chips = (d: DayItems) => (
    <>
      {d.tasks.map(({ task, domain }) => {
        const done = task.status === 'done'
        const tone = dueInfo(task.due, done).tone
        return (
          <a
            key={task.id}
            href={domain ? `#${domain}` : undefined}
            className={`block rounded-md border border-dashed px-1.5 py-1 text-xs break-words transition-opacity duration-150 hover:opacity-80 ${FOCUS_RING} ${A.ring} ${taskChipClass(tone, domain ?? 'calendar')}`}
          >
            Task: {task.title}
          </a>
        )
      })}
      {[...d.allDay, ...d.timed].map((e) => (
        <button
          key={`${e.calendarId}/${e.id}`}
          type="button"
          onClick={() => setEditing({ calendarId: e.calendarId, event: e, date: d.ymd })}
          style={{ borderLeftColor: colorOf(e) }}
          className={`block w-full rounded-md border-l-[3px] px-1.5 py-1 text-left text-xs break-words transition-colors duration-150 ${FOCUS_RING} ${A.ring} ${
            e.start.date
              ? 'bg-neutral-200/70 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700'
              : 'bg-neutral-100 hover:bg-neutral-200/70 dark:bg-neutral-900 dark:hover:bg-neutral-800'
          }`}
        >
          {e.start.dateTime && <span className={`tabular-nums ${MUTED_TEXT}`}>{timeOf(e)} </span>}
          {e.summary || '(No title)'}
        </button>
      ))}
    </>
  )

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="inline-flex items-center gap-0.5 rounded-lg border border-neutral-200 bg-neutral-100 p-0.5 dark:border-neutral-800 dark:bg-neutral-950">
          <IconButton
            icon={ChevronLeft}
            label="Previous week"
            size="sm"
            accent="calendar"
            onClick={() => setWeekStart(addDays(weekStart, -7))}
          />
          <Button variant="ghost" size="sm" accent="calendar" onClick={() => setWeekStart(localYmd(mondayOf(new Date())))}>
            Today
          </Button>
          <IconButton
            icon={ChevronRight}
            label="Next week"
            size="sm"
            accent="calendar"
            onClick={() => setWeekStart(addDays(weekStart, 7))}
          />
        </div>
        <span className="text-sm font-semibold tabular-nums">{weekLabel}</span>
        {loading && <span className={`text-sm ${MUTED_TEXT}`}>Loading…</span>}
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          {syncMsg && (
            <span
              role="status"
              className={`text-xs break-words ${syncMsg.ok ? MUTED_TEXT : 'text-red-600 dark:text-red-400'}`}
            >
              {syncMsg.text}
            </span>
          )}
          <Button variant="primary" accent="calendar" icon={Plus} onClick={openNew} disabled={!calendars}>
            New event
          </Button>
          <Button
            icon={RefreshCw}
            onClick={() => void runSync()}
            disabled={!data || syncing}
            title={data ? undefined : 'Connect your data repo in Settings to sync tasks'}
          >
            {syncing ? 'Syncing…' : 'Sync tasks to Google'}
          </Button>
        </div>
      </div>
      {dataStatus === 'unconfigured' && (
        <p className={`text-sm ${MUTED_TEXT}`}>
          <a href="#settings" className="underline">
            Connect your data repo in Settings
          </a>{' '}
          to show and sync tasks.
        </p>
      )}
      {shown.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {shown.map((c) => {
            const on = !hidden.includes(c.id)
            return (
              <label key={c.id} className="cursor-pointer">
                <input type="checkbox" className="peer sr-only" checked={on} onChange={() => toggle(c.id)} />
                <span
                  className={`inline-flex h-8 items-center gap-2 rounded-full border px-3 text-sm font-medium transition-colors duration-150 peer-focus-visible:ring-2 peer-focus-visible:ring-fuchsia-500/50 ${
                    on
                      ? 'border-neutral-200 bg-white text-neutral-800 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100 dark:shadow-none'
                      : 'border-transparent text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300'
                  }`}
                >
                  <span
                    className={`size-2.5 rounded-full ${on ? '' : 'opacity-40'}`}
                    style={{ backgroundColor: c.backgroundColor }}
                  />
                  {c.summary}
                </span>
              </label>
            )
          })}
        </div>
      )}
      {(error || loadError) && <p className={ERROR_NOTE}>{error || loadError}</p>}

      <div className="hidden grid-cols-7 gap-2 lg:grid">
        {days.map((d) => {
          const isToday = d.ymd === today
          return (
            <div
              key={d.ymd}
              className={`${SURFACE} min-h-40 min-w-0 space-y-1.5 p-2 ${isToday ? 'ring-2 ring-fuchsia-500/40' : ''}`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium ${isToday ? A.text : MUTED_TEXT}`}>
                  {d.date.toLocaleDateString(undefined, { weekday: 'short' })}
                </span>
                <span
                  className={`flex size-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums ${
                    isToday ? 'bg-fuchsia-600 text-white dark:bg-fuchsia-500' : ''
                  }`}
                >
                  {d.date.getDate()}
                </span>
              </div>
              {chips(d)}
            </div>
          )
        })}
      </div>

      <div className="space-y-5 lg:hidden">
        {days.map((d) => {
          const isToday = d.ymd === today
          return (
            <section key={d.ymd} className="min-w-0">
              <h3 className="flex items-center gap-2 border-b border-neutral-200 pb-1.5 text-sm font-semibold dark:border-neutral-800">
                <span className={isToday ? A.text : ''}>
                  {d.date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })}
                </span>
                {isToday && (
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${A.softBg} ${A.text}`}>Today</span>
                )}
              </h3>
              <div className="mt-2 space-y-1.5">
                {d.tasks.length + d.allDay.length + d.timed.length === 0 ? (
                  <p className="text-xs text-neutral-400 dark:text-neutral-500">Nothing scheduled</p>
                ) : (
                  chips(d)
                )}
              </div>
            </section>
          )
        })}
      </div>

      {editing && (
        <EventEditor
          target={editing}
          calendars={shown}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            setReloadKey((k) => k + 1)
          }}
        />
      )}
    </div>
  )
}
