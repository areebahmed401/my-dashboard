import { useEffect, useMemo, useState } from 'react'
import { CalendarCheck, CalendarDays, ChevronDown, Clock, Coffee, ListChecks, RefreshCw } from 'lucide-react'
import Button from '../components/Button'
import DoneButton from '../components/DoneButton'
import DueBadge from '../components/DueBadge'
import EmptyState from '../components/EmptyState'
import EstimateBadge from '../components/EstimateBadge'
import IconButton from '../components/IconButton'
import PriorityPill from '../components/PriorityPill'
import Segmented from '../components/Segmented'
import { useOpenTask } from '../components/useTaskDialog'
import { useToast } from '../components/useToast'
import { touch } from '../data/make'
import { useData } from '../data/store'
import type { DashboardData, Domain, Task } from '../data/types'
import { GoogleAuthError } from '../gcal/api'
import { connect, loadGis } from '../gcal/auth'
import { ACCENT, FAINT_TEXT, FOCUS_RING, MUTED_TEXT, SURFACE } from '../theme'
import WorkHoursEditor from './WorkHoursEditor'
import { blockSlots } from './blockPlan'
import { REVIEW_MIN, addDaysYmd, atTime, isReview, planDays, ymdOf } from './plan'
import type { Busy, DayPlan, Slot } from './plan'
import { useBusy } from './useBusy'

type View = 'today' | 'week'
const VIEWS = [
  { value: 'today' as const, label: 'Today' },
  { value: 'week' as const, label: 'Week' },
]

const SECTION_TITLE = 'text-sm font-semibold text-neutral-900 dark:text-neutral-100'
const ERROR_NOTE = 'rounded-lg bg-red-500/10 px-3 py-2 text-sm break-words text-red-700 dark:text-red-400'
const LIST = `${SURFACE} divide-y divide-neutral-100 overflow-hidden dark:divide-neutral-800/80`

const pad = (n: number) => String(n).padStart(2, '0')
const clock = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`
const TITLE_BUTTON = `min-w-0 truncate text-left text-sm hover:underline ${FOCUS_RING} focus-visible:ring-neutral-500/40`
const errText = (e: unknown) => (e instanceof Error ? e.message : 'Unknown error')

function dayLabel(ymd: string): string {
  return atTime(ymd, '00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function PlanSection({ data }: { data: DashboardData }) {
  const { apply } = useData()
  const openTask = useOpenTask()
  const toast = useToast()
  const [view, setView] = useState<View>('today')
  const [editing, setEditing] = useState(false)
  const [blocking, setBlocking] = useState(false)
  const [showRest, setShowRest] = useState(false)
  const [now, setNow] = useState(() => new Date())

  // Re-plan from the current time as the day goes on
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  const today = ymdOf(now)
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDaysYmd(today, i)), [today])
  const busy = useBusy(days)

  const domainOf = useMemo(() => new Map(data.projects.map((p) => [p.id, p.domain])), [data.projects])
  const tasks = useMemo(() => data.tasks.filter((t) => domainOf.has(t.projectId)), [data.tasks, domainOf])
  const reviewCount = tasks.filter(isReview).length
  const hasOpen = tasks.some((t) => t.status !== 'done')
  const plan = useMemo(
    () => planDays(days, data.settings, busy.busyByDay, tasks, today, now),
    [days, data.settings, busy.busyByDay, tasks, today, now],
  )
  const todayPlan = plan.days[0]

  const markDone = (task: Task) => {
    apply({ type: 'upsertTask', task: touch({ ...task, status: 'done' }) })
    toast({
      message: 'Marked done',
      action: { label: 'Undo', onClick: () => apply({ type: 'upsertTask', task: touch(task) }) },
    })
  }

  const block = async () => {
    setBlocking(true)
    try {
      const r = await blockSlots(todayPlan.ymd, todayPlan.slots)
      const n = `${r.added} slot${r.added === 1 ? '' : 's'}`
      toast({ message: `Blocked ${n} in your tasks calendar${r.replaced ? `, replaced ${r.replaced}` : ''}` })
    } catch (e) {
      const message =
        e instanceof GoogleAuthError ? 'Google session expired. Reconnect and try again.' : `Could not block: ${errText(e)}`
      toast({ message, tone: 'error' })
    } finally {
      setBlocking(false)
    }
  }

  const loading = busy.loading

  return (
    <section aria-labelledby="plan-title" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="plan-title" className={`flex items-center gap-2 ${SECTION_TITLE}`}>
          <ListChecks className="size-4 text-neutral-500 dark:text-neutral-400" aria-hidden />
          Plan
        </h2>
        {reviewCount > 0 && (
          <a
            href="#claude"
            className={`rounded-full bg-violet-500/10 px-2.5 py-0.5 text-xs font-medium text-violet-700 transition-colors duration-150 hover:bg-violet-500/20 dark:text-violet-400 ${FOCUS_RING} focus-visible:ring-violet-500/50`}
          >
            Needs review ({reviewCount})
          </a>
        )}
        <Segmented value={view} onChange={setView} options={VIEWS} label="Plan range" size="sm" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" icon={Clock} onClick={() => setEditing(true)}>
          Working hours
        </Button>
        {busy.connected && (
          <>
            <Button
              size="sm"
              icon={CalendarCheck}
              accent="calendar"
              onClick={() => void block()}
              disabled={blocking || loading || todayPlan.slots.length === 0}
            >
              {blocking ? 'Blocking…' : 'Block in calendar'}
            </Button>
            <IconButton icon={RefreshCw} label="Reload calendar events" size="sm" onClick={busy.reload} disabled={loading} />
          </>
        )}
      </div>

      {!busy.connected && <ConnectHint expired={busy.expired} />}
      {busy.error && <p className={ERROR_NOTE}>Could not load calendar events: {busy.error}</p>}

      {loading ? (
        <div className={`${SURFACE} h-40 animate-pulse`} aria-busy="true" aria-label="Loading calendar" />
      ) : !hasOpen ? (
        <EmptyState icon={ListChecks} title="No open tasks to plan" description="Add a task and it will be fitted in here." />
      ) : view === 'today' ? (
        <TodayView day={todayPlan} domainOf={domainOf} onDone={markDone} onEditHours={() => setEditing(true)} />
      ) : (
        <WeekView days={plan.days} today={today} domainOf={domainOf} onDone={markDone} />
      )}

      {plan.unscheduled.length > 0 && (
        <div className={SURFACE}>
          <button
            type="button"
            aria-expanded={showRest}
            onClick={() => setShowRest((v) => !v)}
            className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium sm:px-4 ${FOCUS_RING} focus-visible:ring-neutral-500/40`}
          >
            <span>Doesn&apos;t fit this week ({plan.unscheduled.length})</span>
            <ChevronDown className={`size-4 transition-transform duration-150 ${showRest ? 'rotate-180' : ''}`} aria-hidden />
          </button>
          {showRest && (
            <ul className="divide-y divide-neutral-100 border-t border-neutral-100 dark:divide-neutral-800/80 dark:border-neutral-800/80">
              {plan.unscheduled.map((t) => {
                const domain = domainOf.get(t.projectId) as Domain
                return (
                  <li key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5 sm:px-4">
                    <span className={`size-2 shrink-0 rounded-full ${ACCENT[domain].dot}`} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <button type="button" onClick={() => openTask(t.id)} className={`max-w-full ${TITLE_BUTTON}`}>
                        {t.title}
                      </button>
                    </span>
                    <PriorityPill priority={t.priority} />
                    <EstimateBadge minutes={t.estimateMin} />
                    <DueBadge due={t.due} accent={domain} />
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      <WorkHoursEditor open={editing} onClose={() => setEditing(false)} />
    </section>
  )
}

function ConnectHint({ expired }: { expired: boolean }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadGis().catch(() => {}) // preload so the click opens the popup directly
  }, [])

  const onConnect = () => {
    setBusy(true)
    setError(null)
    connect()
      .catch((e: unknown) => setError(errText(e)))
      .finally(() => setBusy(false))
  }

  return (
    <>
      <div className={`${SURFACE} flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5 sm:px-4`}>
        <CalendarDays className={`size-4 shrink-0 ${ACCENT.calendar.text}`} aria-hidden />
        <p className={`min-w-0 flex-1 text-sm ${MUTED_TEXT}`}>
          {expired
            ? 'Google session expired. Reconnect to plan around your events.'
            : 'Connect Google Calendar to plan around your events.'}
        </p>
        <Button size="sm" variant="primary" accent="calendar" onClick={onConnect} disabled={busy}>
          {expired ? 'Reconnect' : 'Connect'}
        </Button>
      </div>
      {error && <p className={ERROR_NOTE}>{error}</p>}
    </>
  )
}

interface ViewProps {
  domainOf: Map<string, Domain>
  onDone: (task: Task) => void
}

type TimelineItem = { kind: 'event'; start: Date; event: Busy } | { kind: 'slot'; start: Date; slot: Slot }

function TodayView({ day, domainOf, onDone, onEditHours }: ViewProps & { day: DayPlan; onEditHours: () => void }) {
  const editHours = (
    <Button size="sm" icon={Clock} onClick={onEditHours}>
      Edit working hours
    </Button>
  )
  if (!day.workDay) return <EmptyState icon={Coffee} title="Day off; enjoy it" action={editHours} />

  const items: TimelineItem[] = [
    ...day.events.map((event) => ({ kind: 'event' as const, start: event.start, event })),
    ...day.slots.map((slot) => ({ kind: 'slot' as const, start: slot.start, slot })),
  ].sort((a, b) => a.start.getTime() - b.start.getTime())
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Coffee}
        title="Nothing left to plan today"
        description="Your working hours are over or already booked."
        action={editHours}
      />
    )
  }
  return (
    <ol className={LIST}>
      {items.map((it, i) =>
        it.kind === 'event' ? (
          <li key={`e${i}`} className="flex gap-3 bg-neutral-50 px-3 py-2.5 sm:px-4 dark:bg-neutral-900/40">
            <TimeCol start={it.event.start} end={it.event.end} />
            <span className={`flex min-w-0 flex-1 items-center gap-2 text-sm ${MUTED_TEXT}`}>
              <CalendarDays className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{it.event.title}</span>
            </span>
          </li>
        ) : (
          <SlotRow key={`s${i}`} slot={it.slot} domain={domainOf.get(it.slot.task.projectId) as Domain} onDone={onDone} />
        ),
      )}
    </ol>
  )
}

function WeekView({ days, today, domainOf, onDone }: ViewProps & { days: DayPlan[]; today: string }) {
  return (
    <div className={LIST}>
      {days.map((day) => (
        <div key={day.ymd}>
          <h3 className="flex items-center gap-2 px-3 pt-3 pb-1 text-xs font-semibold tracking-wide text-neutral-500 uppercase sm:px-4 dark:text-neutral-400">
            {dayLabel(day.ymd)}
            {day.ymd === today && (
              <span className="rounded-md bg-neutral-900/5 px-1.5 py-0.5 text-[10px] dark:bg-white/10">Today</span>
            )}
          </h3>
          {day.slots.length > 0 ? (
            <ul className="divide-y divide-neutral-100 dark:divide-neutral-800/80">
              {day.slots.map((s, i) => (
                <SlotRow key={i} slot={s} domain={domainOf.get(s.task.projectId) as Domain} onDone={onDone} />
              ))}
            </ul>
          ) : (
            <p className={`px-3 pb-3 text-sm sm:px-4 ${FAINT_TEXT}`}>{day.workDay ? 'Nothing planned' : 'Day off'}</p>
          )}
        </div>
      ))}
    </div>
  )
}

function TimeCol({ start, end }: { start: Date; end: Date }) {
  return (
    <div className="w-12 shrink-0 text-xs tabular-nums">
      <div className="font-medium">{clock(start)}</div>
      <div className={FAINT_TEXT}>{clock(end)}</div>
    </div>
  )
}

function SlotRow({ slot, domain, onDone }: { slot: Slot; domain: Domain; onDone: (task: Task) => void }) {
  const { task } = slot
  const openTask = useOpenTask()
  return (
    <li className="flex gap-3 px-3 py-2.5 sm:px-4">
      <TimeCol start={slot.start} end={slot.end} />
      <DoneButton title={task.title} onClick={() => onDone(task)} className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={`size-2 shrink-0 rounded-full ${ACCENT[domain].dot}`} aria-hidden />
          <button
            type="button"
            onClick={() => openTask(task.id)}
            className={`${TITLE_BUTTON} font-medium text-neutral-900 dark:text-neutral-100`}
          >
            {slot.review && <span className="text-violet-700 dark:text-violet-400">Review: </span>}
            {task.title}
          </button>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <PriorityPill priority={task.priority} />
          <EstimateBadge minutes={slot.review ? REVIEW_MIN : task.estimateMin} />
          {slot.part && <span className={`text-xs tabular-nums ${FAINT_TEXT}`}>part {slot.part}</span>}
        </div>
      </div>
    </li>
  )
}
