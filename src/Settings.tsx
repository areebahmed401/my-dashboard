import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { CalendarDays, Clock, Database, Monitor, Moon, Palette, Sun } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Button from './components/Button'
import Segmented from './components/Segmented'
import { clearToken } from './data/config'
import type { GithubConfig } from './data/config'
import { fetchData } from './data/github'
import { useData } from './data/store'
import { connect, disconnect, loadGis, useGcalStatus } from './gcal/auth'
import { DEFAULT_CLIENT_ID, getClientIdOverride, setClientIdOverride } from './gcal/config'
import WorkHoursEditor from './plan/WorkHoursEditor'
import { ACCENT, MUTED_TEXT, SURFACE, useTheme } from './theme'
import type { AccentKey, ThemePref } from './theme'
import { INPUT } from './ui'

const FIELDS = [
  { key: 'owner', label: 'Owner' },
  { key: 'repo', label: 'Repository' },
  { key: 'branch', label: 'Branch' },
  { key: 'token', label: 'Token' },
] as const

const LABEL = `block text-xs font-medium ${MUTED_TEXT}`
const FIELD = `${INPUT} mt-1.5 block w-full`

const THEME_OPTIONS: { value: ThemePref; label: string; icon: LucideIcon }[] = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
]

function Message({ message }: { message: { text: string; ok: boolean } | null }) {
  if (!message) return null
  return (
    <p
      role="status"
      className={`rounded-lg px-3 py-2 text-sm break-words ${
        message.ok
          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
          : 'bg-red-500/10 text-red-700 dark:text-red-400'
      }`}
    >
      {message.text}
    </p>
  )
}

function Section({
  icon: Icon,
  accent,
  title,
  description,
  children,
}: {
  icon: LucideIcon
  accent: AccentKey
  title: string
  description: string
  children: ReactNode
}) {
  const a = ACCENT[accent]
  return (
    <section className={`${SURFACE} p-4 sm:p-5`}>
      <div className="flex items-start gap-3">
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${a.softBg} ${a.text}`}>
          <Icon className="size-[18px]" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="font-semibold">{title}</h2>
          <p className={`mt-0.5 text-sm ${MUTED_TEXT}`}>{description}</p>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
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
    <Section
      icon={CalendarDays}
      accent="calendar"
      title="Google Calendar"
      description="Show events next to your tasks and sync due dates to a Google calendar."
    >
      <form onSubmit={onSave} className="space-y-4">
        <label className={LABEL}>
          Client ID
          <input
            type="text"
            autoComplete="off"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className={FIELD}
          />
        </label>
        <p className={`text-sm ${MUTED_TEXT}`}>
          OAuth client ID of the Google Cloud app. Leave empty for the default. The access token stays in this tab's
          sessionStorage only.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="primary">
            Save
          </Button>
          {status !== 'connected' && (
            <Button onClick={onConnect} disabled={busy}>
              {status === 'expired' ? 'Reconnect' : 'Connect'}
            </Button>
          )}
          {status !== 'disconnected' && <Button onClick={onDisconnect}>Disconnect</Button>}
        </div>
        <Message message={message} />
      </form>
    </Section>
  )
}

function WorkingHours() {
  const [open, setOpen] = useState(false)
  return (
    <Section
      icon={Clock}
      accent="home"
      title="Working hours"
      description="The Home planner only schedules tasks inside these hours."
    >
      <Button onClick={() => setOpen(true)}>Edit working hours</Button>
      <WorkHoursEditor open={open} onClose={() => setOpen(false)} />
    </Section>
  )
}

function Appearance() {
  const [pref, setPref] = useTheme()
  return (
    <Section icon={Palette} accent="home" title="Appearance" description="Dark mode is true black. System follows your device.">
      <Segmented value={pref} onChange={setPref} options={THEME_OPTIONS} label="Theme" />
    </Section>
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
    <div className="mt-4 max-w-2xl space-y-4">
      <Section
        icon={Database}
        accent="home"
        title="GitHub data"
        description="Tasks and projects live in a private repo as data.json."
      >
        <form onSubmit={onSave} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {FIELDS.map((f) => (
              <label key={f.key} className={LABEL}>
                {f.label}
                <input
                  type={f.key === 'token' ? 'password' : 'text'}
                  autoComplete="off"
                  value={form[f.key]}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  className={FIELD}
                />
              </label>
            ))}
          </div>
          <p className={`text-sm ${MUTED_TEXT}`}>
            Fine-grained token with Contents: Read and write on this repo only. Stored in this browser's localStorage;
            never sent anywhere except api.github.com.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="primary">
              Save
            </Button>
            <Button onClick={onTest} disabled={testing}>
              {testing ? 'Testing…' : 'Test connection'}
            </Button>
            <Button onClick={onForget}>Forget token</Button>
          </div>
          <Message message={message} />
        </form>
      </Section>
      <GoogleSettings />
      <WorkingHours />
      <Appearance />
    </div>
  )
}
