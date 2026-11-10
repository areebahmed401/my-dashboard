import { ExternalLink, Plus, Search, Settings as SettingsIcon } from 'lucide-react'
import IconButton from './IconButton'
import SyncStatus from './SyncStatus'
import ThemeToggle from './ThemeToggle'
import { ACCENT, FOCUS_RING, NAV_KEYS } from '../theme'
import { TOOLS } from '../tools'
import type { AccentKey, Route } from '../theme'

// AA truss mark in the dashboard's accent colours; ink parts follow the text colour
const LOGO_LINES: [number, number, number, number, string, number][] = [
  [6, 54, 58, 54, 'currentColor', 3.4],
  [6, 54, 19, 12, '#3b82f6', 3.6],
  [19, 12, 32, 54, '#10b981', 3.6],
  [32, 54, 45, 12, '#facc15', 3.6],
  [45, 12, 58, 54, '#d97757', 3.6],
  [19, 12, 45, 12, 'currentColor', 3.4],
  [10.95, 38, 27.05, 38, 'currentColor', 2.8],
  [36.95, 38, 53.05, 38, 'currentColor', 2.8],
  [10.95, 38, 19, 54, '#3b82f6', 2],
  [27.05, 38, 19, 54, '#10b981', 2],
  [36.95, 38, 45, 54, '#facc15', 2],
  [53.05, 38, 45, 54, '#d97757', 2],
]
const LOGO_PINS: [number, number][] = [
  [6, 54],
  [32, 54],
  [58, 54],
  [19, 12],
  [45, 12],
  [10.95, 38],
  [27.05, 38],
  [36.95, 38],
  [53.05, 38],
  [19, 54],
  [45, 54],
]

export function LogoMark({ className = '' }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 64 64"
      strokeLinecap="round"
      className={`size-8 shrink-0 text-neutral-900 dark:text-white ${className}`}
    >
      {LOGO_LINES.map(([x1, y1, x2, y2, stroke, w], i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth={w} />
      ))}
      {LOGO_PINS.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={2.6} strokeWidth={1.6} stroke="currentColor" className="fill-white dark:fill-neutral-950" />
      ))}
    </svg>
  )
}

export const Kbd = ({ children }: { children: string }) => (
  <kbd className="rounded border border-neutral-200 bg-neutral-50 px-1.5 font-sans text-[10px] leading-4 font-medium text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400">
    {children}
  </kbd>
)

interface SidebarProps {
  route: Route
  counts: Partial<Record<AccentKey, number>>
  onQuickAdd: () => void
  onSearch: () => void
}

export default function Sidebar({ route, counts, onQuickAdd, onSearch }: SidebarProps) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-neutral-200 bg-white md:flex dark:border-neutral-800/80 dark:bg-neutral-950">
      <a href="#home" className={`mx-3 mt-4 flex items-center gap-2.5 rounded-lg px-2 py-1.5 ${FOCUS_RING} focus-visible:ring-neutral-500/40`}>
        <LogoMark />
        <span className="font-display text-base font-semibold tracking-tight">My Dashboard</span>
      </a>

      <nav aria-label="Main" className="mt-6 flex flex-col gap-0.5 px-3">
        {NAV_KEYS.map((key, i) => {
          const a = ACCENT[key]
          const Icon = a.icon
          const active = route === key
          const count = counts[key]
          return (
            <a
              key={key}
              href={`#${key}`}
              aria-current={active ? 'page' : undefined}
              className={`relative flex h-9 items-center gap-3 rounded-lg px-2.5 text-sm font-medium transition-colors duration-150 ${FOCUS_RING} ${a.ring} ${
                active
                  ? `${a.softBg} text-neutral-900 dark:text-white`
                  : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-100'
              }`}
            >
              {active && <span aria-hidden className={`absolute inset-y-2 -left-3 w-0.5 rounded-r-full ${a.dot}`} />}
              <Icon className={`size-[18px] shrink-0 ${a.text}`} aria-hidden />
              <span className="flex-1 truncate">{a.label}</span>
              {count !== undefined && count > 0 && (
                <span className="text-xs text-neutral-400 tabular-nums dark:text-neutral-500">{count}</span>
              )}
              <Kbd>{String(i + 1)}</Kbd>
            </a>
          )
        })}
      </nav>

      <div className="mt-4 flex flex-col gap-1 px-3">
        <button
          type="button"
          onClick={onQuickAdd}
          className={`flex h-9 w-full items-center gap-3 rounded-lg border border-neutral-200 px-2.5 text-sm font-medium text-neutral-700 shadow-sm transition-colors duration-150 hover:bg-neutral-50 hover:text-neutral-900 dark:border-neutral-800 dark:text-neutral-300 dark:shadow-none dark:hover:bg-neutral-900 dark:hover:text-white ${FOCUS_RING} focus-visible:ring-neutral-500/40`}
        >
          <Plus className="size-[18px]" aria-hidden />
          <span className="flex-1 text-left">Quick add</span>
          <Kbd>N</Kbd>
        </button>
        <button
          type="button"
          onClick={onSearch}
          className={`flex h-9 w-full items-center gap-3 rounded-lg border border-neutral-200 px-2.5 text-sm font-medium text-neutral-700 shadow-sm transition-colors duration-150 hover:bg-neutral-50 hover:text-neutral-900 dark:border-neutral-800 dark:text-neutral-300 dark:shadow-none dark:hover:bg-neutral-900 dark:hover:text-white ${FOCUS_RING} focus-visible:ring-neutral-500/40`}
        >
          <Search className="size-[18px]" aria-hidden />
          <span className="flex-1 text-left">Search</span>
          <Kbd>/</Kbd>
        </button>
      </div>

      <div className="mt-auto px-3 pb-3">
        <h2 className="px-2.5 pb-1.5 text-xs font-medium tracking-wide text-neutral-400 uppercase dark:text-neutral-500">Tools</h2>
        <ul className="flex flex-col gap-0.5">
          {TOOLS.map((t) => (
            <li key={t.href}>
              <a
                href={t.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex h-9 items-center gap-3 rounded-lg px-2.5 text-sm font-medium text-neutral-600 transition-colors duration-150 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-100 ${FOCUS_RING} focus-visible:ring-neutral-500/40`}
              >
                <img src={t.logo} alt="" width={20} height={20} className="size-5 shrink-0 rounded" />
                <span className="flex-1 truncate">{t.label}</span>
                <ExternalLink className="size-3.5 shrink-0 text-neutral-400 dark:text-neutral-500" aria-hidden />
              </a>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center gap-1 border-t border-neutral-200 px-3 py-3 dark:border-neutral-800/80">
        <SyncStatus className="ml-2.5 flex-1" />
        <ThemeToggle size="sm" />
        <IconButton icon={SettingsIcon} label="Settings" size="sm" href="#settings" active={route === 'settings'} />
      </div>
    </aside>
  )
}
