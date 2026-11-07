import { useData } from '../data/store'
import type { SyncStatus as Status } from '../data/store'

const LOOK: Record<Status, { label: string; dot: string }> = {
  unconfigured: { label: 'Not connected', dot: 'bg-neutral-400 dark:bg-neutral-600' },
  loading: { label: 'Loading…', dot: 'bg-neutral-400 animate-pulse' },
  saved: { label: 'Saved', dot: 'bg-emerald-500' },
  saving: { label: 'Saving…', dot: 'bg-yellow-500 animate-pulse' },
  offline: { label: 'Offline', dot: 'bg-neutral-400' },
  error: { label: 'Sync error', dot: 'bg-red-500' },
}

// Dot + text for the GitHub sync state; links to Settings when not connected
export default function SyncStatus({ className = '' }: { className?: string }) {
  const { status, error } = useData()
  const look = LOOK[status]
  const body = (
    <>
      <span className={`size-2 shrink-0 rounded-full ${look.dot}`} aria-hidden />
      <span className="truncate">{look.label}</span>
    </>
  )
  const cls = `inline-flex min-w-0 items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400 ${className}`
  if (status === 'unconfigured') {
    return (
      <a href="#settings" className={`${cls} rounded-md transition-colors duration-150 hover:text-neutral-900 dark:hover:text-neutral-100`}>
        {body}
      </a>
    )
  }
  return (
    <span className={cls} title={status === 'error' ? (error ?? undefined) : undefined} role="status">
      {body}
    </span>
  )
}
