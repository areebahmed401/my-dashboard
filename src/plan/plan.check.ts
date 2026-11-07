// Assertions for the planner. Run: npx tsx src/plan/plan.check.ts (exits non-zero on the first failure)
import { defaultSettings } from '../data/types.ts'
import type { BasicTask, Priority } from '../data/types.ts'
import { atTime, effectivePriority, freeGaps, orderTasks, planDays } from './plan.ts'
import type { Busy } from './plan.ts'

let passed = 0
function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a !== e) throw new Error(`FAIL ${name}\n  expected ${e}\n  actual   ${a}`)
  passed++
}

const MON = '2026-11-09' // a Monday; the default settings work Mon-Fri 09:00-17:00
const TUE = '2026-11-10'
const SAT = '2026-11-14'
const SUN = '2026-11-15'
const WORK = { start: '09:00', end: '17:00' }
const hm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
const range = (g: { start: Date; end: Date }) => `${hm(g.start)}-${hm(g.end)}`
const ev = (ymd: string, from: string, to: string, title = 'Event'): Busy => ({
  start: atTime(ymd, from),
  end: atTime(ymd, to),
  title,
})

let seq = 0
function task(title: string, priority: Priority, estimateMin: number, due?: string): BasicTask {
  seq++
  return {
    kind: 'basic',
    id: title,
    projectId: 'p',
    title,
    status: 'todo',
    due,
    priority,
    estimateMin,
    createdAt: `2026-11-01T00:00:${String(seq).padStart(2, '0')}Z`,
    updatedAt: '2026-11-01T00:00:00Z',
  }
}

const settings = defaultSettings()
const longAgo = new Date(2026, 10, 1, 8, 0) // "now" before the planned days: no cutoff
const titles = (xs: { task: { title: string } }[]) => xs.map((s) => s.task.title)

// Gaps around two events (one pokes out of the window, adjacent ones merge)
check(
  'gaps around 2 events',
  freeGaps(MON, WORK, [ev(MON, '10:00', '11:00'), ev(MON, '13:30', '14:00')]).map(range),
  ['09:00-10:00', '11:00-13:30', '14:00-17:00'],
)
check(
  'gaps merge overlapping and clip to the window',
  freeGaps(MON, WORK, [ev(MON, '08:00', '09:30'), ev(MON, '09:30', '10:00'), ev(MON, '12:00', '13:00'), ev(MON, '12:30', '18:00')]).map(range),
  ['10:00-12:00'],
)
check('gaps under 15 min are dropped', freeGaps(MON, WORK, [ev(MON, '09:10', '16:50')]).map(range), [])
check('no work day, no gaps', freeGaps(SUN, null, []), [])

// Today cutoff: starts at now rounded up to 15 min
check('now cutoff rounds up', freeGaps(MON, WORK, [], new Date(2026, 10, 9, 10, 7)).map(range), ['10:15-17:00'])
check('now on the grid is kept', freeGaps(MON, WORK, [], new Date(2026, 10, 9, 10, 15)).map(range), ['10:15-17:00'])
check('now before work starts', freeGaps(MON, WORK, [], new Date(2026, 10, 9, 7, 0)).map(range), ['09:00-17:00'])
check('now after work ends', freeGaps(MON, WORK, [], new Date(2026, 10, 9, 18, 0)).map(range), [])
check('cutoff applies to today only', freeGaps(TUE, WORK, [], new Date(2026, 10, 9, 10, 7)).map(range), ['09:00-17:00'])
check('past days have no gaps', freeGaps(MON, WORK, [], new Date(2026, 10, 10, 8, 0)).map(range), [])
check(
  'cutoff swallowing a gap leaves the rest',
  freeGaps(MON, WORK, [ev(MON, '10:00', '11:00')], new Date(2026, 10, 9, 9, 50)).map(range),
  ['11:00-17:00'],
)

// Priority order, then due, then creation
const a = task('a-p3', 3, 30)
const b = task('b-p1', 1, 30)
const c = task('c-p2', 2, 30)
const d = task('d-p3-due-later', 3, 30, '2026-12-01')
const e = task('e-p3-due-sooner', 3, 30, '2026-11-30')
check('priority order', orderTasks([a, b, c], MON).map((t) => t.title), ['b-p1', 'c-p2', 'a-p3'])
check('same priority: due first, none last', orderTasks([a, d, e], MON).map((t) => t.title), ['e-p3-due-sooner', 'd-p3-due-later', 'a-p3'])
check('done tasks are dropped', orderTasks([{ ...a, status: 'done' }, b], MON).map((t) => t.title), ['b-p1'])

// Due-soon boost: overdue or due within 2 days raises one level, never above P1
check('boost overdue', effectivePriority(task('x', 3, 30, '2026-11-01'), MON), 2)
check('boost due today', effectivePriority(task('x', 3, 30, MON), MON), 2)
check('boost due in 2 days', effectivePriority(task('x', 4, 30, '2026-11-11'), MON), 3)
check('no boost at 3 days', effectivePriority(task('x', 3, 30, '2026-11-12'), MON), 3)
check('no boost without due', effectivePriority(task('x', 3, 30), MON), 3)
check('P1 stays P1', effectivePriority(task('x', 1, 30, '2026-11-01'), MON), 1)
const boosted = task('boosted-p3', 3, 30, '2026-11-10')
check('boosted P3 outranks plain P3 and ties break on due', orderTasks([a, boosted], MON).map((t) => t.title), ['boosted-p3', 'a-p3'])
check('boosted P3 ties with P2 and loses on no due only', orderTasks([task('p2-nodue', 2, 30), boosted], MON).map((t) => t.title), ['boosted-p3', 'p2-nodue'])

// P1 before P3 in the plan; tasks pack back to back; 5 min buffer after events
{
  const plan = planDays([MON], settings, { [MON]: [ev(MON, '09:00', '10:00', 'Standup')] }, [task('p3', 3, 60), task('p1', 1, 60)], MON, longAgo)
  const slots = plan.days[0].slots
  check('P1 placed before P3', titles(slots), ['p1', 'p3'])
  check('buffer after event, no buffer between tasks', slots.map(range), ['10:05-11:05', '11:05-12:05'])
  check('events are returned with titles', plan.days[0].events.map((x) => x.title), ['Standup'])
  check('nothing unscheduled', plan.unscheduled.length, 0)
}

// A task goes into the earliest gap that fits its whole estimate (a later task may use an earlier small gap)
{
  const plan = planDays([MON], settings, { [MON]: [ev(MON, '09:30', '10:00')] }, [task('long', 1, 120), task('short', 2, 20)], MON, longAgo)
  check('earliest gap that fits whole', plan.days[0].slots.map((s) => `${s.task.title} ${range(s)}`), ['short 09:00-09:20', 'long 10:05-12:05'])
}

// A long task is split across gaps when none holds it whole
{
  const busy = { [MON]: [ev(MON, '10:00', '11:00'), ev(MON, '12:00', '17:00')] }
  const plan = planDays([MON], settings, busy, [task('big', 2, 100)], MON, longAgo)
  check('split into chunks', plan.days[0].slots.map((s) => `${range(s)} ${s.part}`), ['09:00-10:00 1/2', '11:05-11:45 2/2'])
  check('split chunks are >= 30 min', plan.days[0].slots.every((s) => s.end.getTime() - s.start.getTime() >= 30 * 60_000), true)
  const short = planDays([MON], settings, busy, [task('mid', 2, 45)], MON, longAgo)
  check('a task of 60 min or less is never split', short.unscheduled.map((t) => t.title), [])
  const noFit = planDays([MON], settings, { [MON]: [ev(MON, '09:40', '17:00')] }, [task('mid', 2, 45)], MON, longAgo)
  check('not split when <= 60 and no gap fits', noFit.unscheduled.map((t) => t.title), ['mid'])
  const noRoom = planDays([MON], settings, busy, [task('huge', 2, 240)], MON, longAgo)
  check('split that cannot fit entirely is unscheduled', [noRoom.days[0].slots.length, noRoom.unscheduled.map((t) => t.title)], [0, ['huge']])
}

// A split never leaves a remainder under 30 min
{
  const busy = { [MON]: [ev(MON, '10:30', '17:00')], [TUE]: [ev(TUE, '10:30', '17:00')] } // a 90 min gap on each day
  const plan = planDays([MON, TUE], settings, busy, [task('t', 2, 110)], MON, longAgo)
  check('remainder keeps chunks >= 30', plan.days.flatMap((p) => p.slots).map((s) => `${s.start.getDate()} ${range(s)}`), ['9 09:00-10:20', '10 09:00-09:30'])
}

// Day off (null) and the weekend get nothing
{
  const plan = planDays([SAT, SUN, MON], settings, {}, [task('only', 1, 30)], MON, longAgo)
  check('day off has no slots', [plan.days[0].slots.length, plan.days[0].workDay, plan.days[1].slots.length], [0, null, 0])
  check('task lands on the next work day', titles(plan.days[2].slots), ['only'])
  const custom = { ...settings, workHours: settings.workHours.map((w, i) => (i === 1 ? null : w)) }
  check('custom day off', planDays([MON], custom, {}, [task('x', 1, 30)], MON, longAgo).unscheduled.map((t) => t.title), ['x'])
}

// Overflow: what does not fit is unscheduled, lowest priority last
{
  const tasks = [task('o1', 1, 120), task('o2', 2, 120), task('o3', 3, 120), task('o4', 3, 120), task('o5', 4, 120)]
  const plan = planDays([MON], settings, {}, tasks, MON, longAgo)
  check('overflow scheduled', titles(plan.days[0].slots), ['o1', 'o2', 'o3', 'o4'])
  check('overflow unscheduled', plan.unscheduled.map((t) => t.title), ['o5'])
}

// Today: nothing before now
{
  const plan = planDays([MON], settings, {}, [task('late', 1, 30)], MON, new Date(2026, 10, 9, 13, 2))
  check('today starts at the next quarter', plan.days[0].slots.map(range), ['13:15-13:45'])
}

console.log(`plan.check: ${passed} assertions passed`)
