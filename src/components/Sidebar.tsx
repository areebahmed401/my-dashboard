import { Plus, Settings as SettingsIcon } from 'lucide-react'
import IconButton from './IconButton'
import SyncStatus from './SyncStatus'
import ThemeToggle from './ThemeToggle'
import { ACCENT, FOCUS_RING, NAV_KEYS } from '../theme'
import type { AccentKey, Route } from '../theme'

export function LogoMark({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`grid size-7 grid-cols-2 gap-[3px] rounded-lg bg-neutral-900 p-[5px] dark:bg-white ${className}`}
    >
      <span className="rounded-[2px] bg-blue-500" />
      <span className="rounded-[2px] bg-emerald-500" />
      <span className="rounded-[2px] bg-yellow-400" />
      <span className="rounded-[2px] bg-claude-500" />
    </span>
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
}

export default function Sidebar({ route, counts, onQuickAdd }: SidebarProps) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-neutral-200 bg-white md:flex dark:border-neutral-800/80 dark:bg-neutral-950">
      <a href="#home" className={`mx-3 mt-4 flex items-center gap-2.5 rounded-lg px-2 py-1.5 ${FOCUS_RING} focus-visible:ring-neutral-500/40`}>
        <LogoMark />
        <span className="text-[15px] font-semibold tracking-tight">My Dashboard</span>
      </a>

      <nav aria-label="Main" className="mt-6 flex flex-col gap-0.5 px-3">
        {NAV_KEYS.map((key) => {
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
            </a>
          )
        })}
      </nav>

      <div className="mt-4 px-3">
        <button
          type="button"
          onClick={onQuickAdd}
          className={`flex h-9 w-full items-center gap-3 rounded-lg border border-neutral-200 px-2.5 text-sm font-medium text-neutral-700 shadow-sm transition-colors duration-150 hover:bg-neutral-50 hover:text-neutral-900 dark:border-neutral-800 dark:text-neutral-300 dark:shadow-none dark:hover:bg-neutral-900 dark:hover:text-white ${FOCUS_RING} focus-visible:ring-neutral-500/40`}
        >
          <Plus className="size-[18px]" aria-hidden />
          <span className="flex-1 text-left">Quick add</span>
          <Kbd>N</Kbd>
        </button>
      </div>

      <div className="mt-auto flex items-center gap-1 border-t border-neutral-200 px-3 py-3 dark:border-neutral-800/80">
        <SyncStatus className="ml-2.5 flex-1" />
        <ThemeToggle size="sm" />
        <IconButton icon={SettingsIcon} label="Settings" size="sm" href="#settings" active={route === 'settings'} />
      </div>
    </aside>
  )
}
