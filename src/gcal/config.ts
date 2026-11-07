export const DEFAULT_CLIENT_ID =
  '940978486670-rmholnt1pr1ocf9mtdf1dvnfc685tsgn.apps.googleusercontent.com'

export const TASKS_CALENDAR_NAME = 'Dashboard tasks'

const KEY = 'my-dashboard.gcal'

interface GcalPrefs {
  clientId: string // empty means DEFAULT_CLIENT_ID
  hidden: string[] // calendar ids unticked in the Calendar tab
  tasksCalendarId: string
  connected: boolean // consent was given once in this browser
}

const DEFAULTS: GcalPrefs = { clientId: '', hidden: [], tasksCalendarId: '', connected: false }

function load(): GcalPrefs {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULTS }
    const p = JSON.parse(raw) as Partial<Record<keyof GcalPrefs, unknown>>
    return {
      clientId: typeof p.clientId === 'string' ? p.clientId : '',
      hidden: Array.isArray(p.hidden) ? p.hidden.filter((x): x is string => typeof x === 'string') : [],
      tasksCalendarId: typeof p.tasksCalendarId === 'string' ? p.tasksCalendarId : '',
      connected: p.connected === true,
    }
  } catch {
    return { ...DEFAULTS }
  }
}

function save(patch: Partial<GcalPrefs>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...load(), ...patch }))
  } catch {
    // storage unavailable: settings last for this session only
  }
}

export const getClientIdOverride = (): string => load().clientId
export const getClientId = (): string => load().clientId || DEFAULT_CLIENT_ID
export const setClientIdOverride = (clientId: string): void => save({ clientId: clientId.trim() })

export const getHiddenCalendars = (): string[] => load().hidden
export const setHiddenCalendars = (hidden: string[]): void => save({ hidden })

export const getTasksCalendarId = (): string => load().tasksCalendarId
export const setTasksCalendarId = (tasksCalendarId: string): void => save({ tasksCalendarId })

export const wasConnected = (): boolean => load().connected
export const setConnected = (connected: boolean): void => save({ connected })
