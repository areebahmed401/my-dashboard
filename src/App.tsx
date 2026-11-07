import { useEffect, useState } from 'react'
import DomainView from './DomainView'
import Settings from './Settings'
import { useData } from './data/store'
import type { SyncStatus } from './data/store'
import type { Domain } from './data/types'

const TABS = [
  { id: 'study', label: 'Study' },
  { id: 'job-search', label: 'Job Search' },
  { id: 'german', label: 'German' },
  { id: 'claude', label: 'Claude' },
  { id: 'calendar', label: 'Calendar' },
] as const

type TabId = (typeof TABS)[number]['id']
type Route = TabId | 'settings'

function routeFromHash(): Route {
  const id = window.location.hash.slice(1)
  if (id === 'settings') return 'settings'
  return TABS.some((t) => t.id === id) ? (id as TabId) : 'study'
}

const PILL: Record<Exclude<SyncStatus, 'unconfigured'>, { label: string; cls: string }> = {
  loading: { label: 'Loading…', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  saved: { label: 'Saved', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
  saving: { label: 'Saving…', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
  offline: { label: 'Offline', cls: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200' },
  error: { label: 'Error', cls: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300' },
}

function StatusPill() {
  const { status, error } = useData()
  const base = 'rounded-full px-2.5 py-0.5 text-xs whitespace-nowrap'
  if (status === 'unconfigured') {
    return (
      <a
        href="#settings"
        className={`${base} bg-slate-100 text-slate-600 hover:underline dark:bg-slate-800 dark:text-slate-300`}
      >
        Not connected
      </a>
    )
  }
  const p = PILL[status]
  return (
    <span className={`${base} ${p.cls}`} title={error ?? undefined}>
      {p.label}
    </span>
  )
}

function DomainBody({ domain }: { domain: Domain }) {
  const { data, status, error } = useData()
  const muted = 'mt-2 text-slate-500 dark:text-slate-400'
  if (status === 'unconfigured') {
    return (
      <p className={muted}>
        <a href="#settings" className="underline">
          Connect your data repo in Settings
        </a>
      </p>
    )
  }
  if (!data) {
    if (status === 'error') return <p className="mt-2 text-red-700 dark:text-red-400">{error}</p>
    return <p className={muted}>{status === 'offline' ? 'Offline.' : 'Loading…'}</p>
  }
  return (
    <>
      {status === 'error' && <p className="mt-2 text-red-700 dark:text-red-400">{error}</p>}
      <DomainView domain={domain} />
    </>
  )
}

export default function App() {
  const [route, setRoute] = useState<Route>(routeFromHash)

  useEffect(() => {
    const onHash = () => setRoute(routeFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const current = TABS.find((t) => t.id === route)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3">
          <h1 className="order-1 text-lg font-semibold">My Dashboard</h1>
          <div className="order-2 ml-auto flex items-center gap-2 sm:order-3">
            <StatusPill />
            <a
              href="#settings"
              aria-label="Settings"
              className={`rounded-md px-2 py-1 text-lg leading-none ${
                route === 'settings'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              ⚙
            </a>
          </div>
          <nav className="order-3 flex w-full min-w-0 gap-1 overflow-x-auto sm:order-2 sm:w-auto sm:flex-1">
            {TABS.map((t) => (
              <a
                key={t.id}
                href={`#${t.id}`}
                data-tab={t.id}
                className={`rounded-md px-3 py-1.5 text-sm whitespace-nowrap ${
                  t.id === route
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                {t.label}
              </a>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        {current ? (
          <>
            <h2 className="text-2xl font-semibold">{current.label}</h2>
            {current.id === 'calendar' ? (
              <p className="mt-2 text-slate-500 dark:text-slate-400">Coming soon.</p>
            ) : (
              <DomainBody domain={current.id} />
            )}
          </>
        ) : (
          <>
            <h2 className="text-2xl font-semibold">Settings</h2>
            <Settings />
          </>
        )}
      </main>
    </div>
  )
}
