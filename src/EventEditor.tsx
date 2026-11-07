import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import Button from './components/Button'
import Modal from './components/Modal'
import { GoogleAuthError, canWrite, deleteEvent, insertEvent, patchEvent } from './gcal/api'
import type { EventTime, GCalendar, GEvent } from './gcal/api'
import { addDays, daysBetween } from './gcal/taskSync'
import { MUTED_TEXT } from './theme'
import { INPUT } from './ui'

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

const LABEL = `block text-xs font-medium ${MUTED_TEXT}`
const FIELD = `${INPUT} mt-1.5 block w-full disabled:opacity-60`

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
  const formId = useId()
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

  const footer = (
    <>
      {!readOnly && !isNew && (
        <Button variant="danger" onClick={onDelete} disabled={busy} className="mr-auto">
          Delete
        </Button>
      )}
      <Button variant="ghost" onClick={onClose}>
        {readOnly ? 'Close' : 'Cancel'}
      </Button>
      {!readOnly && (
        <Button type="submit" form={formId} variant="primary" accent="calendar" disabled={busy}>
          {busy ? 'Saving…' : 'Save'}
        </Button>
      )}
    </>
  )

  return (
    <Modal
      open
      onClose={onClose}
      title={isNew ? 'New event' : readOnly ? 'Event details' : 'Edit event'}
      footer={footer}
    >
      <form id={formId} onSubmit={onSubmit} className="space-y-4">
        <label className={LABEL}>
          Calendar
          {isNew ? (
            <select value={calendarId} onChange={(e) => setCalendarId(e.target.value)} className={FIELD}>
              {writable.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.summary}
                </option>
              ))}
            </select>
          ) : (
            <p className="mt-1.5 text-sm font-normal text-neutral-900 dark:text-neutral-100">{cal?.summary ?? calendarId}</p>
          )}
        </label>
        <label className={LABEL}>
          Title
          <input
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            disabled={readOnly}
            autoFocus={!readOnly}
            className={FIELD}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-fuchsia-600"
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
          <label className={`${LABEL} min-w-36 flex-1`}>
            Date
            <input
              type="date"
              required
              value={form.date}
              onChange={(e) => set('date', e.target.value)}
              disabled={readOnly}
              className={FIELD}
            />
          </label>
          {!form.allDay && (
            <>
              <label className={`${LABEL} min-w-28 flex-1`}>
                Start
                <input
                  type="time"
                  required
                  value={form.start}
                  onChange={(e) => set('start', e.target.value)}
                  disabled={readOnly}
                  className={FIELD}
                />
              </label>
              <label className={`${LABEL} min-w-28 flex-1`}>
                End
                <input
                  type="time"
                  required
                  value={form.end}
                  onChange={(e) => set('end', e.target.value)}
                  disabled={readOnly}
                  className={FIELD}
                />
              </label>
            </>
          )}
        </div>
        {form.span > (form.allDay ? 1 : 0) && (
          <p className={`text-xs ${MUTED_TEXT}`}>
            Ends {addDays(form.date, form.span)}
            {form.allDay ? ' (exclusive)' : ''}
          </p>
        )}
        <label className={LABEL}>
          Description
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            disabled={readOnly}
            className={FIELD}
          />
        </label>
        {error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm break-words text-red-700 dark:text-red-400">{error}</p>
        )}
      </form>
    </Modal>
  )
}
