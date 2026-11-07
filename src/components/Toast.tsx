import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { CircleAlert, CircleCheck, X } from 'lucide-react'
import { ToastContext } from './useToast'
import type { ToastInput } from './useToast'

interface ToastItem extends ToastInput {
  id: number
}

const DURATION = 5000

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const nextId = useRef(0)

  const dismiss = useCallback((id: number) => setItems((list) => list.filter((t) => t.id !== id)), [])
  const toast = useCallback((t: ToastInput) => {
    const id = ++nextId.current
    setItems((list) => [...list.slice(-3), { ...t, id }])
  }, [])

  return (
    <ToastContext value={toast}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-60 flex flex-col items-center gap-2 px-4 md:inset-x-auto md:right-6 md:bottom-6 md:items-end md:px-0"
      >
        {items.map((t) => (
          <Toast key={t.id} item={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext>
  )
}

function Toast({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const [paused, setPaused] = useState(false)
  const remaining = useRef(DURATION)
  const dismissRef = useRef(onDismiss)
  useEffect(() => {
    dismissRef.current = onDismiss
  })

  useEffect(() => {
    if (paused) return
    const started = Date.now()
    const timer = window.setTimeout(() => dismissRef.current(), remaining.current)
    return () => {
      window.clearTimeout(timer)
      remaining.current -= Date.now() - started
    }
  }, [paused])

  const error = item.tone === 'error'
  const Icon = error ? CircleAlert : CircleCheck
  return (
    <div
      role={error ? 'alert' : 'status'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900 py-2.5 pr-2 pl-3.5 text-sm text-neutral-100 shadow-xl shadow-black/10 dark:border-neutral-700 dark:bg-neutral-800 animate-[toast-in_150ms_ease-out] md:w-auto md:min-w-72"
    >
      <Icon className={`size-4 shrink-0 ${error ? 'text-red-400' : 'text-emerald-400'}`} aria-hidden />
      <span className="min-w-0 flex-1">{item.message}</span>
      {item.action && (
        <button
          type="button"
          onClick={() => {
            item.action?.onClick()
            onDismiss()
          }}
          className="rounded-md px-2 py-1 text-sm font-semibold text-white transition-colors duration-150 outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/40"
        >
          {item.action.label}
        </button>
      )}
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onDismiss}
        className="rounded-md p-1 text-neutral-400 transition-colors duration-150 outline-none hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/40"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  )
}
