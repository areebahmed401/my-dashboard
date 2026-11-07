import { useEffect, useState } from 'react'

const TABS = [
  { id: 'study', label: 'Study' },
  { id: 'job-search', label: 'Job Search' },
  { id: 'german', label: 'German' },
  { id: 'claude', label: 'Claude' },
  { id: 'calendar', label: 'Calendar' },
] as const

type TabId = (typeof TABS)[number]['id']

function tabFromHash(): TabId {
  const id = window.location.hash.slice(1)
  return TABS.some((t) => t.id === id) ? (id as TabId) : 'study'
}

export default function App() {
  const [tab, setTab] = useState<TabId>(tabFromHash)

  useEffect(() => {
    const onHash = () => setTab(tabFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const current = TABS.find((t) => t.id === tab)!

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-lg font-semibold">My Dashboard</h1>
          <nav className="flex gap-1 overflow-x-auto">
            {TABS.map((t) => (
              <a
                key={t.id}
                href={`#${t.id}`}
                data-tab={t.id}
                className={`rounded-md px-3 py-1.5 text-sm whitespace-nowrap ${
                  t.id === tab
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
        <h2 className="text-2xl font-semibold">{current.label}</h2>
        <p className="mt-2 text-slate-500 dark:text-slate-400">Coming soon.</p>
      </main>
    </div>
  )
}
