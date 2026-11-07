import { useSyncExternalStore } from 'react'
import { getClientId, setConnected, wasConnected } from './config'

export const SCOPES = [
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.app.created',
]

// Minimal types for the parts of google.accounts.oauth2 used here
interface TokenResponse {
  access_token: string
  expires_in: number | string
  scope: string
  error?: string
  error_description?: string
}

interface ClientError {
  type: string
  message?: string
}

interface TokenClient {
  requestAccessToken(overrides?: { prompt?: string }): void
}

interface GoogleOAuth2 {
  initTokenClient(config: {
    client_id: string
    scope: string
    callback: (resp: TokenResponse) => void
    error_callback?: (err: ClientError) => void
  }): TokenClient
  hasGrantedAllScopes(resp: TokenResponse, ...scopes: string[]): boolean
  revoke(token: string, done?: () => void): void
}

declare global {
  interface Window {
    google?: { accounts: { oauth2: GoogleOAuth2 } }
  }
}

export type GcalStatus = 'disconnected' | 'connected' | 'expired'

const SESSION_KEY = 'my-dashboard.gcal-token'
const MARGIN_MS = 60_000 // treat the token as expired a minute early

interface Token {
  value: string
  expiresAt: number
}

function readSession(): Token | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as Partial<Record<keyof Token, unknown>>
    if (typeof p.value === 'string' && typeof p.expiresAt === 'number') {
      return { value: p.value, expiresAt: p.expiresAt }
    }
  } catch {
    // storage unavailable or corrupt
  }
  return null
}

function writeSession(t: Token | null): void {
  try {
    if (t) sessionStorage.setItem(SESSION_KEY, JSON.stringify(t))
    else sessionStorage.removeItem(SESSION_KEY)
  } catch {
    // storage unavailable: token lasts in memory only
  }
}

let token: Token | null = readSession()
let status: GcalStatus = 'disconnected'
let timer: ReturnType<typeof setTimeout> | undefined
const listeners = new Set<() => void>()

function valid(t: Token | null): t is Token {
  return t !== null && t.expiresAt - MARGIN_MS > Date.now()
}

function emit(): void {
  status = valid(token) ? 'connected' : wasConnected() ? 'expired' : 'disconnected'
  clearTimeout(timer)
  if (valid(token)) timer = setTimeout(emit, token.expiresAt - MARGIN_MS - Date.now())
  listeners.forEach((l) => l())
}
emit()

function setToken(t: Token | null): void {
  token = t
  writeSession(t)
  emit()
}

function subscribe(l: () => void): () => void {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

export function useGcalStatus(): GcalStatus {
  return useSyncExternalStore(subscribe, () => status)
}

export function getAccessToken(): string | null {
  return valid(token) ? token.value : null
}

// Called by the API layer on a 401
export function markExpired(): void {
  if (token) setToken(null)
}

export function clearToken(): void {
  setToken(null)
}

let gisLoad: Promise<void> | null = null

export function loadGis(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  gisLoad ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => {
      gisLoad = null
      s.remove()
      reject(new Error('Could not load Google sign-in'))
    }
    document.head.appendChild(s)
  })
  return gisLoad
}

let client: { id: string; tc: TokenClient } | null = null
let pending: { resolve: () => void; reject: (e: Error) => void } | null = null

function tokenClient(oauth2: GoogleOAuth2, clientId: string): TokenClient {
  if (client?.id === clientId) return client.tc
  const tc = oauth2.initTokenClient({
    client_id: clientId,
    scope: SCOPES.join(' '),
    callback: (resp) => {
      const p = pending
      pending = null
      if (resp.error) {
        p?.reject(new Error(resp.error_description || resp.error))
        return
      }
      if (!oauth2.hasGrantedAllScopes(resp, ...SCOPES)) {
        p?.reject(new Error('Please grant all requested Calendar permissions.'))
        return
      }
      setConnected(true)
      setToken({ value: resp.access_token, expiresAt: Date.now() + Number(resp.expires_in) * 1000 })
      p?.resolve()
    },
    error_callback: (err) => {
      const p = pending
      pending = null
      p?.reject(new Error(err.type === 'popup_closed' ? 'Sign-in window closed.' : err.message || err.type))
    },
  })
  client = { id: clientId, tc }
  return tc
}

// Must be called from a click handler: opens the Google popup.
export function connect(): Promise<void> {
  const clientId = getClientId()
  if (import.meta.env.DEV && clientId === 'mock') {
    setConnected(true)
    setToken({ value: 'mock', expiresAt: Date.now() + 3600_000 })
    return Promise.resolve()
  }
  const request = () =>
    new Promise<void>((resolve, reject) => {
      const oauth2 = window.google?.accounts.oauth2
      if (!oauth2) {
        reject(new Error('Google sign-in not loaded'))
        return
      }
      pending?.reject(new Error('Superseded by a new sign-in'))
      pending = { resolve, reject }
      tokenClient(oauth2, clientId).requestAccessToken({ prompt: wasConnected() ? '' : 'consent' })
    })
  // Request synchronously when GIS is already loaded so the popup keeps the click's user gesture
  return window.google?.accounts?.oauth2 ? request() : loadGis().then(request)
}

export function disconnect(): void {
  const t = token?.value
  if (t && t !== 'mock') window.google?.accounts.oauth2.revoke(t)
  setConnected(false)
  setToken(null)
}
