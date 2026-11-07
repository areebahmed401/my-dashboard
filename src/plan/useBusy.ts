import { useEffect, useState } from 'react'
import { GoogleAuthError, listCalendars, listEvents } from '../gcal/api'
import type { GEvent } from '../gcal/api'
import { markExpired, useGcalStatus } from '../gcal/auth'
import { getHiddenCalendars } from '../gcal/config'
import { isTasksCalendar } from '../gcal/taskSync'
import { addDaysYmd, atTime, toRfc3339 } from './plan'
import type { Busy } from './plan'

export interface BusyState {
  connected: boolean
  expired: boolean
  loading: boolean
  error: string | null
  busyByDay: Record<string, Busy[]>
  reload: () => void
}

const NONE: Record<string, Busy[]> = {}

// Timed, blocking events I have not declined
function blocks(e: GEvent): boolean {
  if (!e.start.dateTime || !e.end.dateTime) return false
  if (e.transparency === 'transparent') return false
  return !e.attendees?.some((a) => a.self && a.responseStatus === 'declined')
}

// Busy intervals per local day for the visible Google calendars (the tasks calendar, all-day and free events excluded)
export function useBusy(days: string[]): BusyState {
  const status = useGcalStatus()
  const connected = status === 'connected'
  const first = days[0]
  const count = days.length
  const [reloadKey, setReloadKey] = useState(0)
  const key = connected ? `${first}|${count}|${reloadKey}` : ''
  const [loaded, setLoaded] = useState<{ key: string; busyByDay: Record<string, Busy[]>; error: string | null }>({
    key: '',
    busyByDay: NONE,
    error: null,
  })

  useEffect(() => {
    if (!key) return
    let live = true
    const hidden = getHiddenCalendars()
    const range = Array.from({ length: count }, (_, i) => addDaysYmd(first, i))
    const timeMin = toRfc3339(atTime(first, '00:00'))
    const timeMax = toRfc3339(atTime(addDaysYmd(first, count), '00:00'))
    listCalendars()
      .then((cals) => cals.filter((c) => !isTasksCalendar(c) && !hidden.includes(c.id)))
      .then((cals) => Promise.all(cals.map((c) => listEvents(c.id, timeMin, timeMax))))
      .then((lists) => {
        if (!live) return
        const busyByDay: Record<string, Busy[]> = Object.fromEntries(range.map((d) => [d, []]))
        for (const e of lists.flat()) {
          if (!blocks(e)) continue
          const start = new Date(e.start.dateTime as string)
          const end = new Date(e.end.dateTime as string)
          // an event past midnight counts on every day it touches
          for (const d of range) {
            if (start < atTime(addDaysYmd(d, 1), '00:00') && end > atTime(d, '00:00')) {
              busyByDay[d].push({ start, end, title: e.summary || '(no title)' })
            }
          }
        }
        setLoaded({ key, busyByDay, error: null })
      })
      .catch((e: unknown) => {
        if (!live) return
        if (e instanceof GoogleAuthError) {
          markExpired()
          return
        }
        setLoaded({ key, busyByDay: NONE, error: e instanceof Error ? e.message : 'Unknown error' })
      })
    return () => {
      live = false
    }
  }, [key, first, count])

  const done = loaded.key === key
  return {
    connected,
    expired: status === 'expired',
    loading: connected && !done,
    error: done ? loaded.error : null,
    busyByDay: done ? loaded.busyByDay : NONE,
    reload: () => setReloadKey((n) => n + 1),
  }
}
