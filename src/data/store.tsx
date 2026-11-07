import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { isConfigured, loadConfig, saveConfig } from './config'
import type { GithubConfig } from './config'
import { ConflictError, OfflineError, fetchData, saveData } from './github'
import { applyOps } from './ops'
import type { Op } from './ops'
import type { DashboardData } from './types'

export type SyncStatus = 'unconfigured' | 'loading' | 'saved' | 'saving' | 'offline' | 'error'

interface DataContextValue {
  data: DashboardData | null
  status: SyncStatus
  error: string | null
  pendingCount: number
  config: GithubConfig
  apply: (op: Op) => void
  reload: () => Promise<void>
  setConfig: (cfg: GithubConfig) => boolean
}

const DEBOUNCE_MS = 800
const MAX_ATTEMPTS = 3

const DataContext = createContext<DataContextValue | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<GithubConfig>(loadConfig)
  const [data, setData] = useState<DashboardData | null>(null)
  const [status, setStatusState] = useState<SyncStatus>(() =>
    isConfigured(config) ? 'loading' : 'unconfigured',
  )
  const [error, setError] = useState<string | null>(null)
  const [pendingCount, setPendingCount] = useState(0)

  const configRef = useRef(config)
  const statusRef = useRef(status)
  const base = useRef<DashboardData | null>(null) // last known remote data
  const sha = useRef('')
  const queue = useRef<Op[]>([]) // ops not yet saved; data === applyOps(base, queue)
  const timer = useRef<number | undefined>(undefined)
  const saving = useRef(false)
  const gen = useRef(0) // bumped on every load; stale async work checks it and bails out

  const setStatus = useCallback((s: SyncStatus, err: string | null = null) => {
    statusRef.current = s
    setStatusState(s)
    setError(err)
  }, [])

  const recompute = useCallback(() => {
    setData(base.current ? applyOps(base.current, queue.current) : null)
    setPendingCount(queue.current.length)
  }, [])

  const report = useCallback(
    (e: unknown) => {
      if (e instanceof OfflineError) setStatus('offline')
      else setStatus('error', e instanceof Error ? e.message : 'Unknown error')
    },
    [setStatus],
  )

  const flush = useCallback(
    async function flush() {
      if (saving.current) return
      saving.current = true
      const myGen = gen.current
      let attempts = 0
      try {
        while (base.current && queue.current.length > 0) {
          if (gen.current !== myGen) return
          const cfg = configRef.current
          const snapshot = queue.current.slice()
          setStatus('saving')
          try {
            const next = applyOps(base.current, snapshot)
            const newSha = await saveData(cfg, next, sha.current, `Dashboard: ${snapshot.length} change(s)`)
            if (gen.current !== myGen) return
            base.current = next
            sha.current = newSha
            queue.current.splice(0, snapshot.length)
            attempts = 0
            recompute()
          } catch (e) {
            if (gen.current !== myGen) return
            if (!(e instanceof ConflictError)) return report(e)
            if (++attempts >= MAX_ATTEMPTS) {
              return setStatus('error', 'Could not save: data.json keeps changing. Reload to try again.')
            }
            try {
              const remote = await fetchData(cfg)
              if (gen.current !== myGen) return
              base.current = remote.data
              sha.current = remote.sha
              recompute()
            } catch (e2) {
              if (gen.current === myGen) report(e2)
              return
            }
          }
        }
        if (base.current && gen.current === myGen) setStatus('saved')
      } finally {
        saving.current = false
        // a load superseded this save: pick the queue up again
        if (gen.current !== myGen && base.current && queue.current.length > 0) {
          window.clearTimeout(timer.current)
          timer.current = window.setTimeout(() => void flush(), DEBOUNCE_MS)
        }
      }
    },
    [recompute, report, setStatus],
  )

  const load = useCallback(
    async (cfg: GithubConfig) => {
      const myGen = ++gen.current
      window.clearTimeout(timer.current)
      if (!isConfigured(cfg)) {
        base.current = null
        sha.current = ''
        recompute()
        setStatus('unconfigured')
        return
      }
      setStatus('loading')
      try {
        const remote = await fetchData(cfg)
        if (gen.current !== myGen) return
        base.current = remote.data
        sha.current = remote.sha
        recompute()
        if (queue.current.length > 0) void flush()
        else setStatus('saved')
      } catch (e) {
        if (gen.current === myGen) report(e)
      }
    },
    [flush, recompute, report, setStatus],
  )

  useEffect(() => {
    void load(config)
    return () => window.clearTimeout(timer.current)
  }, [config, load])

  useEffect(() => {
    const onOnline = () => {
      if (statusRef.current !== 'offline') return
      if (base.current && queue.current.length > 0) void flush()
      else void load(configRef.current)
    }
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [flush, load])

  useEffect(() => {
    if (pendingCount === 0) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [pendingCount])

  const apply = useCallback(
    (op: Op) => {
      if (!base.current) return // nothing loaded to edit
      queue.current.push(op)
      recompute()
      setStatus('saving')
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => void flush(), DEBOUNCE_MS)
    },
    [flush, recompute, setStatus],
  )

  const reload = useCallback(() => load(configRef.current), [load])

  const setConfig = useCallback(
    (cfg: GithubConfig): boolean => {
      const prev = configRef.current
      const targetChanged =
        cfg.owner !== prev.owner || cfg.repo !== prev.repo || cfg.branch !== prev.branch
      if (targetChanged) {
        // a token-only change keeps pending edits; a different repo or branch cannot
        if (queue.current.length > 0) {
          const ok = window.confirm(
            `Discard ${queue.current.length} unsaved change(s)? They belong to the previous repo or branch.`,
          )
          if (!ok) return false
        }
        queue.current = []
        base.current = null
        sha.current = ''
        recompute()
      }
      saveConfig(cfg)
      configRef.current = cfg
      setConfigState(cfg)
      return true
    },
    [recompute],
  )

  const value = useMemo(
    () => ({ data, status, error, pendingCount, config, apply, reload, setConfig }),
    [data, status, error, pendingCount, config, apply, reload, setConfig],
  )

  return <DataContext value={value}>{children}</DataContext>
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used inside DataProvider')
  return ctx
}
