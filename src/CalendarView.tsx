import { useEffect, useEffectEvent, useMemo, useState } from 'react'
import EventEditor from './EventEditor'
import type { EditTarget } from './EventEditor'
import { useData } from './data/store'
import type { Domain, Task } from './data/types'
import { GoogleAuthError, canWrite, listCalendars, listEvents } from './gcal/api'
import type { GCalendar, GEvent } from './gcal/api'
import { connect, loadGis, useGcalStatus } from './gcal/auth'
import { getHiddenCalendars, setHiddenCalendars } from './gcal/config'
import { addDays, isTasksCalendar, syncTasks } from './gcal/taskSync'

const BUTTON =
  'rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800'
const PRIMARY =
  'rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300'

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
    <div className="mt-4 space-y-2">
      <button type="button" onClick={onConnect} disabled={busy} className={PRIMARY}>
        {reconnect ? 'Reconnect Google' : 'Connect Google Calendar'}
      </button>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Testing-mode Google app: only your account can sign in. Access lasts about an hour, then
        click Reconnect.
      </p>
      {error && <p className="text-sm break-words text-red-700 dark:text-red-400">{error}</p>}
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

  const colorOf = (e: CalEvent) => byId.get(e.calendarId)?.backgroundColor ?? '#64748b'
  const timeOf = (e: CalEvent) =>
    new Date(e.start.dateTime ?? '').toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })

  const chips = (d: DayItems) => (
    <>
      {d.tasks.map(({ task, domain }) => (
        <a
          key={task.id}
          href={domain ? `#${domain}` : undefined}
          className={`block rounded border border-dashed border-slate-400 px-1.5 py-0.5 text-xs break-words hover:bg-slate-100 dark:border-slate-500 dark:hover:bg-slate-800 ${
            task.status === 'done' ? 'text-slate-400 line-through dark:text-slate-500' : ''
          }`}
        >
          Task: {task.title}
        </a>
      ))}
      {[...d.allDay, ...d.timed].map((e) => (
        <button
          key={`${e.calendarId}/${e.id}`}
          type="button"
          onClick={() => setEditing({ calendarId: e.calendarId, event: e, date: d.ymd })}
          style={{ borderLeftColor: colorOf(e) }}
          className={`block w-full rounded border-l-4 px-1.5 py-0.5 text-left text-xs break-words hover:opacity-80 ${
            e.start.date ? 'bg-slate-200 dark:bg-slate-700' : 'bg-slate-100 dark:bg-slate-800'
          }`}
        >
          {e.start.dateTime && <span className="text-slate-500 tabular-nums dark:text-slate-400">{timeOf(e)} </span>}
          {e.summary || '(No title)'}
        </button>
      ))}
    </>
  )

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Previous week" onClick={() => setWeekStart(addDays(weekStart, -7))} className={BUTTON}>
            ‹
          </button>
          <button type="button" onClick={() => setWeekStart(localYmd(mondayOf(new Date())))} className={BUTTON}>
            Today
          </button>
          <button type="button" aria-label="Next week" onClick={() => setWeekStart(addDays(weekStart, 7))} className={BUTTON}>
            ›
          </button>
        </div>
        <span className="text-sm font-medium">{weekLabel}</span>
        {loading && <span className="text-sm text-slate-500 dark:text-slate-400">Loading…</span>}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button type="button" onClick={openNew} disabled={!calendars} className={PRIMARY}>
            New event
          </button>
          <button
            type="button"
            onClick={() => void runSync()}
            disabled={!data || syncing}
            title={data ? undefined : 'Connect your data repo in Settings to sync tasks'}
            className={BUTTON}
          >
            {syncing ? 'Syncing…' : 'Sync tasks to Google'}
          </button>
        </div>
      </div>
      {dataStatus === 'unconfigured' && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          <a href="#settings" className="underline">
            Connect your data repo in Settings
          </a>{' '}
          to show and sync tasks.
        </p>
      )}
      {syncMsg && (
        <p
          role="status"
          className={`text-sm break-words ${syncMsg.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}
        >
          {syncMsg.text}
        </p>
      )}
      {shown.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {shown.map((c) => (
            <label key={c.id} className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" checked={!hidden.includes(c.id)} onChange={() => toggle(c.id)} />
              <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: c.backgroundColor }} />
              {c.summary}
            </label>
          ))}
        </div>
      )}
      {(error || loadError) && (
        <p className="text-sm break-words text-red-700 dark:text-red-400">{error || loadError}</p>
      )}

      <div className="hidden grid-cols-7 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 sm:grid dark:border-slate-800 dark:bg-slate-800">
        {days.map((d) => (
          <div
            key={d.ymd}
            className={`min-h-40 min-w-0 space-y-1 p-1.5 ${
              d.ymd === today ? 'bg-amber-50 dark:bg-slate-900' : 'bg-white dark:bg-slate-950'
            }`}
          >
            <div className={`text-xs font-medium ${d.ymd === today ? 'text-amber-700 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}`}>
              {d.date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}
            </div>
            {chips(d)}
          </div>
        ))}
      </div>

      <div className="space-y-3 sm:hidden">
        {days.map((d) => (
          <section key={d.ymd} className="min-w-0">
            <h3
              className={`text-sm font-medium ${d.ymd === today ? 'text-amber-700 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}`}
            >
              {d.date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })}
              {d.ymd === today && ' · Today'}
            </h3>
            <div className="mt-1 space-y-1">
              {d.tasks.length + d.allDay.length + d.timed.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500">Nothing scheduled</p>
              ) : (
                chips(d)
              )}
            </div>
          </section>
        ))}
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
