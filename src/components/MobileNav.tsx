import { Plus, Settings as SettingsIcon } from 'lucide-react'
import IconButton from './IconButton'
import { ACCENT, NAV_KEYS } from '../theme'
import type { Route } from '../theme'

// Sticky top bar for phones: current page, quick add, settings
export function MobileTopBar({ route, onQuickAdd }: { route: Route; onQuickAdd: () => void }) {
  const a = route === 'settings' ? null : ACCENT[route]
  const Icon = a?.icon ?? SettingsIcon
  return (
    <header className="sticky top-0 z-30 flex h-[calc(3.5rem+env(safe-area-inset-top))] items-center gap-2 border-b border-neutral-200 bg-white/85 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-md md:hidden dark:border-neutral-800/80 dark:bg-black/80">
      <span className={`flex size-7 items-center justify-center rounded-lg ${a?.softBg ?? 'bg-neutral-100 dark:bg-neutral-900'}`}>
        <Icon className={`size-4 ${a?.text ?? 'text-neutral-600 dark:text-neutral-300'}`} aria-hidden />
      </span>
      <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{a?.label ?? 'Settings'}</span>
      <IconButton icon={Plus} label="Quick add" onClick={onQuickAdd} />
      <IconButton icon={SettingsIcon} label="Settings" href="#settings" active={route === 'settings'} />
    </header>
  )
}

// Fixed bottom tab bar for phones
export function MobileTabBar({ route }: { route: Route }) {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-200 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden dark:border-neutral-800/80 dark:bg-black/85"
    >
      <div className="grid h-16 grid-cols-4">
        {NAV_KEYS.map((key) => {
          const a = ACCENT[key]
          const Icon = a.icon
          const active = route === key
          return (
            <a
              key={key}
              href={`#${key}`}
              aria-current={active ? 'page' : undefined}
              className={`flex min-w-0 flex-col items-center justify-center gap-0.5 text-[11px] leading-tight font-medium transition-colors duration-150 outline-none focus-visible:bg-neutral-100 dark:focus-visible:bg-neutral-900 ${
                active ? a.text : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200'
              }`}
            >
              <span className={`flex h-7 w-11 items-center justify-center rounded-full transition-colors duration-150 ${active ? a.softBg : ''}`}>
                <Icon className="size-[22px]" aria-hidden />
              </span>
              <span className="max-w-full px-0.5 text-center">{a.label}</span>
            </a>
          )
        })}
      </div>
    </nav>
  )
}
