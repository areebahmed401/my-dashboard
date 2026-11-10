import { useEffect, useMemo, useState } from 'react'
import { Settings as SettingsIcon } from 'lucide-react'
import DomainView from './DomainView'
import Home from './Home'
import Settings from './Settings'
import JobsView from './jobs/JobsView'
import { MobileTabBar, MobileTopBar } from './components/MobileNav'
import QuickAdd from './components/QuickAdd'
import SearchDialog from './components/SearchDialog'
import Sidebar from './components/Sidebar'
import { TaskDialogProvider } from './components/TaskDialog'
import { useData } from './data/store'
import type { Domain } from './data/types'
import { ACCENT, DOMAINS, NAV_KEYS } from './theme'
import type { AccentKey, Route } from './theme'

function routeFromHash(): Route {
  const id = window.location.hash.slice(1).split('/')[0] // #job-search/docs -> job-search
  if (id === 'settings') return 'settings'
  return NAV_KEYS.find((k) => k === id) ?? 'home'
}

const isDomain = (r: Route): r is Domain => (DOMAINS as string[]).includes(r)

// The calendar lives on Home; #calendar scrolls to its section
const scrollToCalendar = () => setTimeout(() => document.getElementById('calendar')?.scrollIntoView(), 0)

function DomainBody({ domain }: { domain: Domain }) {
  const { data, status, error } = useData()
  const muted = 'mt-2 text-sm text-neutral-500 dark:text-neutral-400'
  if (status === 'unconfigured') {
    return (
      <p className={muted}>
        <a href="#settings" className="font-medium text-neutral-900 underline dark:text-neutral-100">
          Connect your data repo in Settings
        </a>
      </p>
    )
  }
  if (!data) {
    if (status === 'error') return <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
    return <p className={muted}>{status === 'offline' ? 'Offline.' : 'Loading…'}</p>
  }
  return (
    <>
      {status === 'error' && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {domain === 'job-search' ? <JobsView /> : <DomainView domain={domain} />}
    </>
  )
}

// Global shortcuts (n quick add, / search, 1-9 tabs) are ignored while typing or when a dialog is open
function isTyping(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false
  return t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)
}

function PageHeader({ route }: { route: Route }) {
  const a = route === 'settings' ? null : ACCENT[route]
  const Icon = a?.icon ?? SettingsIcon
  return (
    <div className="mb-2 hidden items-center gap-3 md:flex">
      <span className={`flex size-9 items-center justify-center rounded-xl ${a?.softBg ?? 'bg-neutral-100 dark:bg-neutral-900'}`}>
        <Icon className={`size-5 ${a?.text ?? 'text-neutral-600 dark:text-neutral-300'}`} aria-hidden />
      </span>
      <h1 className="font-display text-2xl font-semibold tracking-tight">{a?.label ?? 'Settings'}</h1>
    </div>
  )
}

export default function App() {
  const [route, setRoute] = useState<Route>(routeFromHash)
  const [quickOpen, setQuickOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const { data } = useData()

  useEffect(() => {
    const onHash = () => {
      setRoute(routeFromHash())
      if (window.location.hash === '#calendar') scrollToCalendar()
      else window.scrollTo(0, 0)
    }
    if (window.location.hash === '#calendar') scrollToCalendar()
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    const dialogOpen = () => !!document.querySelector('[aria-modal="true"], .fixed.inset-0')
    const onKey = (e: KeyboardEvent) => {
      // Ctrl/Cmd+K works even while typing in a field
      if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'k') {
        if (dialogOpen()) return
        e.preventDefault()
        setSearchOpen(true)
        return
      }
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target) || dialogOpen()) return
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        setQuickOpen(true)
      } else if (e.key === '/') {
        e.preventDefault()
        setSearchOpen(true)
      } else if (/^[1-9]$/.test(e.key)) {
        const key = NAV_KEYS[Number(e.key) - 1]
        if (key) window.location.hash = key
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Open (not done) tasks per domain for the sidebar
  const counts = useMemo(() => {
    const out: Partial<Record<AccentKey, number>> = {}
    if (!data) return out
    const domainOf = new Map(data.projects.map((p) => [p.id, p.domain]))
    for (const t of data.tasks) {
      const d = domainOf.get(t.projectId)
      if (d && t.status !== 'done') out[d] = (out[d] ?? 0) + 1
    }
    return out
  }, [data])

  const openQuick = () => setQuickOpen(true)
  const openSearch = () => setSearchOpen(true)

  return (
    <TaskDialogProvider>
      <div className="min-h-dvh bg-neutral-50 text-neutral-900 dark:bg-black dark:text-neutral-100">
        <Sidebar route={route} counts={counts} onQuickAdd={openQuick} onSearch={openSearch} />
        <MobileTopBar route={route} onQuickAdd={openQuick} onSearch={openSearch} />
        <main className="min-w-0 md:pl-64">
          <div className="mx-auto max-w-6xl px-4 pt-5 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-6 md:px-10 md:py-10">
            {route === 'home' ? (
              <Home />
            ) : (
              <>
                <PageHeader route={route} />
                {route === 'settings' ? (
                  <Settings />
                ) : isDomain(route) ? (
                  <DomainBody key={route} domain={route} />
                ) : null}
              </>
            )}
          </div>
        </main>
        <MobileTabBar route={route} />
        <QuickAdd open={quickOpen} onClose={() => setQuickOpen(false)} domain={isDomain(route) ? route : undefined} />
        <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
      </div>
    </TaskDialogProvider>
  )
}
