import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { clearToken } from './data/config'
import type { GithubConfig } from './data/config'
import { fetchData } from './data/github'
import { useData } from './data/store'
import { connect, disconnect, loadGis, useGcalStatus } from './gcal/auth'
import { DEFAULT_CLIENT_ID, getClientIdOverride, setClientIdOverride } from './gcal/config'

const FIELDS = [
  { key: 'owner', label: 'Owner' },
  { key: 'repo', label: 'Repository' },
  { key: 'branch', label: 'Branch' },
  { key: 'token', label: 'Token' },
] as const

const INPUT =
  'mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 font-normal dark:border-slate-700 dark:bg-slate-900'
const PRIMARY =
  'rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300'
const BUTTON =
  'rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800'

function Message({ message }: { message: { text: string; ok: boolean } | null }) {
  if (!message) return null
  return (
    <p
      role="status"
      className={`text-sm break-words ${
        message.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'
      }`}
    >
      {message.text}
    </p>
  )
}

function GoogleSettings() {
  const status = useGcalStatus()
  const [clientId, setClientId] = useState(() => getClientIdOverride() || DEFAULT_CLIENT_ID)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    loadGis().catch(() => {}) // preload so Connect opens the popup directly
  }, [])

  const onSave = (e: FormEvent) => {
    e.preventDefault()
    const v = clientId.trim()
    setClientIdOverride(v === DEFAULT_CLIENT_ID ? '' : v)
    if (!v) setClientId(DEFAULT_CLIENT_ID)
    setMessage({ text: 'Saved.', ok: true })
  }

  const onConnect = () => {
    setBusy(true)
    setMessage(null)
    connect()
      .then(() => setMessage({ text: 'Connected to Google Calendar.', ok: true }))
      .catch((e: unknown) => setMessage({ text: e instanceof Error ? e.message : 'Unknown error', ok: false }))
      .finally(() => setBusy(false))
  }

  const onDisconnect = () => {
    disconnect()
    setMessage({ text: 'Disconnected from Google.', ok: true })
  }

  return (
    <form onSubmit={onSave} className="mt-10 max-w-md space-y-4">
      <h3 className="text-lg font-semibold">Google Calendar</h3>
      <label className="block text-sm font-medium">
        Client ID
        <input
          type="text"
          autoComplete="off"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className={INPUT}
        />
      </label>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        OAuth client ID of the Google Cloud app. Leave empty for the default. The access token stays
        in this tab's sessionStorage only.
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="submit" className={PRIMARY}>
          Save
        </button>
        {status !== 'connected' && (
          <button type="button" onClick={onConnect} disabled={busy} className={BUTTON}>
            {status === 'expired' ? 'Reconnect' : 'Connect'}
          </button>
        )}
        {status !== 'disconnected' && (
          <button type="button" onClick={onDisconnect} className={BUTTON}>
            Disconnect
          </button>
        )}
      </div>
      <Message message={message} />
    </form>
  )
}

export default function Settings() {
  const { config, setConfig } = useData()
  const [form, setForm] = useState<GithubConfig>(config)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const [testing, setTesting] = useState(false)

  const trimmed = (): GithubConfig => ({
    owner: form.owner.trim(),
    repo: form.repo.trim(),
    branch: form.branch.trim(),
    token: form.token.trim(),
  })

  const onSave = (e: FormEvent) => {
    e.preventDefault()
    if (setConfig(trimmed())) setMessage({ text: 'Saved.', ok: true })
  }

  const onTest = async () => {
    setTesting(true)
    setMessage(null)
    try {
      const { data } = await fetchData(trimmed())
      setMessage({
        text: `Connected: ${data.projects.length} projects, ${data.tasks.length} tasks`,
        ok: true,
      })
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : 'Unknown error', ok: false })
    } finally {
      setTesting(false)
    }
  }

  const onForget = () => {
    clearToken()
    setForm((f) => ({ ...f, token: '' }))
    setConfig({ ...config, token: '' })
    setMessage({ text: 'Token removed from this browser.', ok: true })
  }

  return (
    <>
      <form onSubmit={onSave} className="mt-4 max-w-md space-y-4">
        {FIELDS.map((f) => (
          <label key={f.key} className="block text-sm font-medium">
            {f.label}
            <input
              type={f.key === 'token' ? 'password' : 'text'}
              autoComplete="off"
              value={form[f.key]}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
              className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 font-normal dark:border-slate-700 dark:bg-slate-900"
            />
          </label>
        ))}
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Fine-grained token with Contents: Read and write on this repo only. Stored in this
          browser's localStorage; never sent anywhere except api.github.com.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
          >
            Save
          </button>
          <button type="button" onClick={onTest} disabled={testing} className={BUTTON}>
            {testing ? 'Testing…' : 'Test connection'}
          </button>
          <button type="button" onClick={onForget} className={BUTTON}>
            Forget token
          </button>
        </div>
        <Message message={message} />
      </form>
      <GoogleSettings />
    </>
  )
}
