import { deleteEvent, insertEvent, listEvents } from '../gcal/api'
import { tasksCalendarId } from '../gcal/taskSync'
import { addDaysYmd, atTime, toRfc3339 } from './plan'
import type { Slot } from './plan'

const TAG = 'dashboardPlanTaskId' // distinct from dashboardTaskId, which syncTasks owns

export interface BlockResult {
  added: number
  replaced: number
}

// Puts one day's planned slots into the tasks calendar as timed events. Earlier plan events of that day
// are removed first, so blocking again replaces rather than duplicates.
export async function blockSlots(ymd: string, slots: Slot[]): Promise<BlockResult> {
  const calendarId = await tasksCalendarId()
  const dayStart = toRfc3339(atTime(ymd, '00:00'))
  const dayEnd = toRfc3339(atTime(addDaysYmd(ymd, 1), '00:00'))
  const old = (await listEvents(calendarId, dayStart, dayEnd)).filter((e) => e.extendedProperties?.private?.[TAG])
  for (const e of old) await deleteEvent(calendarId, e.id)

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  for (const s of slots) {
    await insertEvent(calendarId, {
      summary: s.review ? `Review: ${s.task.title}` : s.task.title,
      description: s.part ? `Planned by the dashboard (part ${s.part})` : 'Planned by the dashboard',
      start: { dateTime: toRfc3339(s.start), timeZone },
      end: { dateTime: toRfc3339(s.end), timeZone },
      extendedProperties: { private: { [TAG]: s.task.id } },
    })
  }
  return { added: slots.length, replaced: old.length }
}
