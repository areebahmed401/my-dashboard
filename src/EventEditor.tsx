import { useState } from 'react'
import type { FormEvent } from 'react'
import { GoogleAuthError, canWrite, deleteEvent, insertEvent, patchEvent } from './gcal/api'
import type { EventTime, GCalendar, GEvent } from './gcal/api'
import { addDays, daysBetween } from './gcal/taskSync'

export interface EditTarget {
  calendarId: string
  event: GEvent | null // null: new event
  date: string // YYYY-MM-DD default for a new event
}

const pad = (n: number) => String(n).padStart(2, '0')
const localYmd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const localHm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`

function initial(target: EditTarget) {
  const e = target.event
  if (!e) {
    return { title: '', allDay: false, date: target.date, start: '09:00', end: '10:00', span: 0, description: '' }
  }
  if (e.start.date && e.end.date) {
    const span = Math.max(1, daysBetween(e.start.date, e.end.date))
    const description = e.description ?? ''
    return { title: e.summary ?? '', allDay: true, date: e.start.date, start: '09:00', end: '10:00', span, description }
  }
  const s = new Date(e.start.dateTime ?? '')
  const en = new Date(e.end.dateTime ?? '')
  return {
    title: e.summary ?? '',
    allDay: false,
    date: localYmd(s),
    start: localHm(s),
    end: localHm(en),
    span: Math.max(0, daysBetween(localYmd(s), localYmd(en))),
    description: e.description ?? '',
  }
}

const INPUT =
  'mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 font-normal dark:border-slate-700 dark:bg-slate-900'
const BUTTON =
  'rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800'

export default function EventEditor({
  target,
  calendars,
  onClose,
  onSaved,
}: {
  target: EditTarget
  calendars: GCalendar[]
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState(() => initial(target))
  const [calendarId, setCalendarId] = useState(target.calendarId)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isNew = target.event === null
  const cal = calendars.find((c) => c.id === calendarId)
  const writable = calendars.filter(canWrite)
  const readOnly = !canWrite(cal)

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
      onSaved()
    } catch (e) {
      if (e instanceof GoogleAuthError) onClose()
      else setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setBusy(false)
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (readOnly) return
    const endDate = addDays(form.date, form.span)
    if (!form.allDay && `${endDate}T${form.end}` <= `${form.date}T${form.start}`) {
      setError('End must be after start.')
      return
    }
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const time = (date: string, hm: string): EventTime =>
      form.allDay ? { date } : { dateTime: `${date}T${hm}:00`, timeZone }
    const start = form.allDay ? time(form.date, '') : time(form.date, form.start)
    const end = form.allDay ? time(addDays(form.date, Math.max(1, form.span)), '') : time(endDate, form.end)
    const body = { summary: form.title.trim() || '(No title)', description: form.description, start, end }
    const ev = target.event
    if (!ev) {
      void run(() => insertEvent(calendarId, body))
      return
    }
    // null clears the other representation when switching between all-day and timed
    const clear: EventTime = form.allDay ? { dateTime: null, timeZone: null } : { date: null }
    void run(() =>
      patchEvent(calendarId, ev.id, { ...body, start: { ...clear, ...start }, end: { ...clear, ...end } }),
    )
  }

  const onDelete = () => {
    const ev = target.event
    if (!ev || !window.confirm(`Delete "${ev.summary ?? '(No title)'}"?`)) return
    void run(() => deleteEvent(calendarId, ev.id))
  }

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4"
      onClick={onClose}
    >
      <form
        onSubmit={onSubmit}
        onClick={(e) => e.stopPropagation()}
        className="mt-10 w-full max-w-md space-y-3 rounded-lg bg-white p-4 shadow-lg dark:bg-slate-900"
      >
        <h3 className="text-lg font-semibold">{isNew ? 'New event' : readOnly ? 'Event details' : 'Edit event'}</h3>
        <label className="block text-sm font-medium">
          Calendar
          {isNew ? (
            <select value={calendarId} onChange={(e) => setCalendarId(e.target.value)} className={INPUT}>
              {writable.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.summary}
                </option>
              ))}
            </select>
          ) : (
            <p className="mt-1 font-normal">{cal?.summary ?? calendarId}</p>
          )}
        </label>
        <label className="block text-sm font-medium">
          Title
          <input
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            disabled={readOnly}
            autoFocus={!readOnly}
            className={INPUT}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.allDay}
            onChange={(e) => {
              const allDay = e.target.checked
              setForm((f) => ({ ...f, allDay, span: allDay ? Math.max(1, f.span) : 0 }))
            }}
            disabled={readOnly}
          />
          All day
        </label>
        <div className="flex flex-wrap gap-3">
          <label className="block text-sm font-medium">
            Date
            <input
              type="date"
              required
              value={form.date}
              onChange={(e) => set('date', e.target.value)}
              disabled={readOnly}
              className={INPUT}
            />
          </label>
          {!form.allDay && (
            <>
              <label className="block text-sm font-medium">
                Start
                <input
                  type="time"
                  required
                  value={form.start}
                  onChange={(e) => set('start', e.target.value)}
                  disabled={readOnly}
                  className={INPUT}
                />
              </label>
              <label className="block text-sm font-medium">
                End
                <input
                  type="time"
                  required
                  value={form.end}
                  onChange={(e) => set('end', e.target.value)}
                  disabled={readOnly}
                  className={INPUT}
                />
              </label>
            </>
          )}
        </div>
        {form.span > (form.allDay ? 1 : 0) && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Ends {addDays(form.date, form.span)}
            {form.allDay ? ' (exclusive)' : ''}
          </p>
        )}
        <label className="block text-sm font-medium">
          Description
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            disabled={readOnly}
            className={INPUT}
          />
        </label>
        {error && <p className="text-sm break-words text-red-700 dark:text-red-400">{error}</p>}
        <div className="flex flex-wrap gap-2">
          {!readOnly && (
            <button
              type="submit"
              disabled={busy}
              className="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
            >
              {busy ? 'Saving…' : 'Save'}
            </button>
          )}
          {!readOnly && !isNew && (
            <button
              type="button"
              onClick={onDelete}
              disabled={busy}
              className={`${BUTTON} text-red-700 dark:text-red-400`}
            >
              Delete
            </button>
          )}
          <button type="button" onClick={onClose} className={BUTTON}>
            {readOnly ? 'Close' : 'Cancel'}
          </button>
        </div>
      </form>
    </div>
  )
}
