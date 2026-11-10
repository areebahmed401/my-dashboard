import { useMemo, useRef, useState } from 'react'
import {
  AlarmClock,
  ArrowRight,
  CalendarDays,
  CalendarRange,
  CircleAlert,
  Database,
  PartyPopper,
  Sparkles,
  X,
} from 'lucide-react'
import CalendarView from './CalendarView'
import Card from './components/Card'
import DueBadge from './components/DueBadge'
import EmptyState from './components/EmptyState'
import DoneButton from './components/DoneButton'
import EstimateBadge from './components/EstimateBadge'
import PriorityPill from './components/PriorityPill'
import ProgressBar from './components/ProgressBar'
import StatCard from './components/StatCard'
import { buttonClass } from './components/classes'
import { useOpenTask } from './components/useTaskDialog'
import { useToast } from './components/useToast'
import { touch } from './data/make'
import { useData } from './data/store'
import type { DashboardData, Domain, Project, Task } from './data/types'
import { daysUntil } from './due'
import PlanSection from './plan/PlanSection'
import { ACCENT, DOMAINS, FOCUS_RING, MUTED_TEXT, SURFACE } from './theme'
import { TOOLS } from './tools'

type Filter = 'overdue' | 'today' | 'week' | 'claude'
const FILTER_LABEL: Record<Filter, string> = {
  overdue: 'Overdue',
  today: 'Due today',
  week: 'Due this week',
  claude: 'Claude queue',
}

const SECTION_TITLE = 'text-sm font-semibold text-neutral-900 dark:text-neutral-100'

function greeting(h: number): string {
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

interface Row {
  task: Task
  project: Project
  days: number | null
}

export default function Home() {
  const { data, status, error } = useData()
  const [now] = useState(() => new Date())
  const longDate = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="space-y-8">
      <header>
        <p className={`text-sm font-medium ${MUTED_TEXT}`}>{longDate}</p>
        <h1 className="font-display mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{greeting(now.getHours())}</h1>
      </header>

      {data ? (
        <TaskSections data={data} />
      ) : status === 'unconfigured' ? (
        <SetupCard />
      ) : status === 'error' ? (
        <Card className="flex items-start gap-3 text-sm text-red-600 dark:text-red-400">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span className="break-words">{error}</span>
        </Card>
      ) : (
        <LoadingBlock label={status === 'offline' ? 'Offline.' : 'Loading your tasks…'} />
      )}

      <section id="calendar" aria-labelledby="calendar-title" className="scroll-mt-20">
        <h2 id="calendar-title" className={`flex items-center gap-2 ${SECTION_TITLE}`}>
          <CalendarDays className={`size-4 ${ACCENT.calendar.text}`} aria-hidden />
          Calendar
        </h2>
        <CalendarView />
      </section>

      {data && <DomainGrid data={data} />}

      <ToolsRow />
    </div>
  )
}

function LoadingBlock({ label }: { label: string }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-busy="true" aria-label={label}>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className={`${SURFACE} h-[92px] animate-pulse`} />
      ))}
    </div>
  )
}

function SetupCard() {
  return (
    <Card className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300">
        <Database className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">Connect your task data</p>
        <p className={`mt-0.5 text-sm ${MUTED_TEXT}`}>
          Add your GitHub data repo and token in Settings to see what is due, your Claude queue and progress per domain.
        </p>
      </div>
      <a href="#settings" className={buttonClass({ variant: 'primary' })}>
        Open Settings
        <ArrowRight className="size-4" aria-hidden />
      </a>
    </Card>
  )
}

function TaskSections({ data }: { data: DashboardData }) {
  const { apply } = useData()
  const toast = useToast()
  const [filter, setFilter] = useState<Filter | null>(null)
  const focusRef = useRef<HTMLElement>(null)

  const rows = useMemo<Row[]>(() => {
    const byId = new Map(data.projects.map((p) => [p.id, p]))
    const out: Row[] = []
    for (const task of data.tasks) {
      const project = byId.get(task.projectId)
      if (!project || task.status === 'done') continue
      out.push({ task, project, days: task.due ? daysUntil(task.due) : null })
    }
    return out
  }, [data])

  const inWeek = (r: Row) => r.days !== null && r.days >= 0 && r.days <= 7
  const match: Record<Filter, (r: Row) => boolean> = {
    overdue: (r) => r.days !== null && r.days < 0,
    today: (r) => r.days === 0,
    week: inWeek,
    claude: (r) => r.project.domain === 'claude' && (r.task.status === 'queued' || r.task.status === 'in-progress'),
  }
  const count = (f: Filter) => rows.filter(match[f]).length

  const focus = rows
    .filter(filter ? match[filter] : (r) => match.overdue(r) || inWeek(r))
    .sort((a, b) => {
      if (a.task.priority !== b.task.priority) return a.task.priority - b.task.priority
      if (a.task.due !== b.task.due) {
        if (!a.task.due) return 1
        if (!b.task.due) return -1
        return a.task.due < b.task.due ? -1 : 1
      }
      return a.task.createdAt < b.task.createdAt ? -1 : 1
    })

  const pick = (f: Filter) => {
    setFilter((cur) => (cur === f ? null : f))
    focusRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const markDone = (task: Task) => {
    apply({ type: 'upsertTask', task: touch({ ...task, status: 'done' }) })
    toast({
      message: 'Marked done',
      action: { label: 'Undo', onClick: () => apply({ type: 'upsertTask', task: touch(task) }) },
    })
  }

  const overdue = count('overdue')
  return (
    <>
      <section aria-label="Summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Overdue"
          value={overdue}
          icon={CircleAlert}
          tone={overdue > 0 ? 'red' : 'home'}
          active={filter === 'overdue'}
          onClick={() => pick('overdue')}
        />
        <StatCard label="Due today" value={count('today')} icon={AlarmClock} tone="job-search" active={filter === 'today'} onClick={() => pick('today')} />
        <StatCard label="Due this week" value={count('week')} icon={CalendarRange} tone="study" active={filter === 'week'} onClick={() => pick('week')} />
        <StatCard label="Claude queue" value={count('claude')} icon={Sparkles} tone="claude" active={filter === 'claude'} onClick={() => pick('claude')} />
      </section>

      <div className="grid gap-8 xl:grid-cols-2 xl:items-start">
        <div className="min-w-0">
          <PlanSection data={data} />
        </div>

        <section ref={focusRef} aria-labelledby="focus-title" className="min-w-0 scroll-mt-20">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 id="focus-title" className={SECTION_TITLE}>
              Focus
              <span className={`ml-2 font-normal tabular-nums ${MUTED_TEXT}`}>{focus.length}</span>
            </h2>
            {filter && (
              <button
                type="button"
                onClick={() => setFilter(null)}
                className={`inline-flex items-center gap-1 rounded-full bg-neutral-100 py-0.5 pr-1.5 pl-2.5 text-xs font-medium text-neutral-700 transition-colors duration-150 hover:bg-neutral-200 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 ${FOCUS_RING} focus-visible:ring-neutral-500/40`}
              >
                {FILTER_LABEL[filter]}
                <X className="size-3.5" aria-label="Clear filter" />
              </button>
            )}
          </div>
          {focus.length === 0 ? (
            <EmptyState
              icon={PartyPopper}
              title={filter ? `Nothing in ${FILTER_LABEL[filter].toLowerCase()}` : 'Nothing due this week 🎉'}
              description={filter ? undefined : 'Enjoy the calm, or press N to add something.'}
            />
          ) : (
            <ul className={`${SURFACE} divide-y divide-neutral-100 overflow-hidden dark:divide-neutral-800/80`}>
              {focus.map((r) => (
                <FocusRow key={r.task.id} row={r} onDone={() => markDone(r.task)} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  )
}

function FocusRow({ row, onDone }: { row: Row; onDone: () => void }) {
  const { task, project } = row
  const a = ACCENT[project.domain]
  const openTask = useOpenTask()
  return (
    <li className="group flex items-start gap-3 px-3 transition-colors duration-150 hover:bg-neutral-50 sm:px-4 dark:hover:bg-neutral-900/60">
      <DoneButton title={task.title} onClick={onDone} className="mt-3" />
      <button
        type="button"
        onClick={() => openTask(task.id)}
        className="flex min-w-0 flex-1 items-start gap-3 py-3 text-left outline-none focus-visible:underline"
      >
        <span className={`mt-1.5 size-2 shrink-0 rounded-full ${a.dot}`} aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{task.title}</span>
          <span className={`block truncate text-xs ${MUTED_TEXT}`}>
            {a.label} · {project.name}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <PriorityPill priority={task.priority} />
            <EstimateBadge minutes={task.estimateMin} />
            <DueBadge due={task.due} accent={project.domain} />
          </span>
        </span>
      </button>
    </li>
  )
}

// The sidebar's tool links, for phones where the sidebar is hidden
function ToolsRow() {
  return (
    <section aria-labelledby="tools-title">
      <h2 id="tools-title" className={`mb-3 ${SECTION_TITLE}`}>
        Tools
      </h2>
      <ul className="flex flex-wrap gap-2">
        {TOOLS.map((t) => (
          <li key={t.href}>
            <a
              href={t.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`${SURFACE} inline-flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors duration-150 hover:border-neutral-300 dark:hover:border-neutral-700 ${FOCUS_RING} focus-visible:ring-neutral-500/40`}
            >
              <img src={t.logo} alt="" className="size-5 shrink-0 rounded" />
              {t.label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}

function DomainGrid({ data }: { data: DashboardData }) {
  const stats = useMemo(() => {
    const domainOf = new Map(data.projects.map((p) => [p.id, p.domain]))
    const out = Object.fromEntries(
      DOMAINS.map((d) => [d, { open: 0, active: 0, done: 0, next: null as Task | null }]),
    ) as Record<Domain, { open: number; active: number; done: number; next: Task | null }>
    for (const t of data.tasks) {
      const d = domainOf.get(t.projectId)
      if (!d) continue
      const s = out[d]
      if (t.status === 'done') {
        s.done++
        continue
      }
      s.open++
      if (t.status === 'doing' || t.status === 'in-progress') s.active++
      if (t.due && (!s.next?.due || t.due < s.next.due)) s.next = t
    }
    return out
  }, [data])

  return (
    <section aria-labelledby="domains-title">
      <h2 id="domains-title" className={`mb-3 ${SECTION_TITLE}`}>
        Domains
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {DOMAINS.map((d) => {
          const a = ACCENT[d]
          const Icon = a.icon
          const s = stats[d]
          const total = s.open + s.done
          return (
            <Card key={d} href={`#${d}`} padded={false} className="overflow-hidden">
              <div className={`flex items-center gap-3 px-4 pt-4 pb-3 ${a.gradient}`}>
                <span className={`flex size-8 items-center justify-center rounded-lg bg-white/70 dark:bg-black/40 ${a.text}`}>
                  <Icon className="size-[18px]" aria-hidden />
                </span>
                <span className="flex-1 font-semibold">{a.label}</span>
                <ArrowRight
                  className="size-4 text-neutral-400 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-neutral-600 dark:group-hover:text-neutral-300"
                  aria-hidden
                />
              </div>
              <div className="space-y-3 px-4 pb-4">
                <dl className="flex gap-5 text-sm">
                  {(
                    [
                      ['Open', s.open],
                      [d === 'claude' ? 'In progress' : 'Doing', s.active],
                      ['Done', s.done],
                    ] as const
                  ).map(([label, n]) => (
                    <div key={label}>
                      <dt className={`text-xs ${MUTED_TEXT}`}>{label}</dt>
                      <dd className="font-semibold tabular-nums">{n}</dd>
                    </div>
                  ))}
                </dl>
                <div className="flex items-center gap-2">
                  <ProgressBar value={s.done} max={total} accent={d} label={`${a.label} progress`} />
                  <span className={`text-xs tabular-nums ${MUTED_TEXT}`}>
                    {total > 0 ? Math.round((s.done / total) * 100) : 0}%
                  </span>
                </div>
                <div className="flex min-h-6 items-center gap-2 text-sm">
                  {s.next ? (
                    <>
                      <span className={`shrink-0 text-xs ${MUTED_TEXT}`}>Next</span>
                      <span className="min-w-0 flex-1 truncate">{s.next.title}</span>
                      <DueBadge due={s.next.due} accent={d} />
                    </>
                  ) : (
                    <span className={`text-xs ${MUTED_TEXT}`}>{s.open > 0 ? 'No due dates set' : 'All clear'}</span>
                  )}
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
