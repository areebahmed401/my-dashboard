import { useState } from 'react'
import Button from '../components/Button'
import Modal from '../components/Modal'
import { touch } from '../data/make'
import { useData } from '../data/store'
import type { WorkDay } from '../data/types'
import { FOCUS_RING, MUTED_TEXT } from '../theme'
import { INPUT } from '../ui'

// Display order Monday first; the value is the JS weekday (0 = Sunday)
const DAYS = [
  { dow: 1, label: 'Monday' },
  { dow: 2, label: 'Tuesday' },
  { dow: 3, label: 'Wednesday' },
  { dow: 4, label: 'Thursday' },
  { dow: 5, label: 'Friday' },
  { dow: 6, label: 'Saturday' },
  { dow: 0, label: 'Sunday' },
]

const FALLBACK = { start: '09:00', end: '17:00' }
const TIME = `${INPUT} w-[6.5rem] px-2`

interface Row {
  on: boolean
  start: string
  end: string
}

function Switch({ on, onChange, label }: { on: boolean; onChange: (on: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-150 ${FOCUS_RING} focus-visible:ring-neutral-500/50 ${
        on ? 'bg-neutral-900 dark:bg-neutral-100' : 'bg-neutral-300 dark:bg-neutral-700'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-sm transition-transform duration-150 ${
          on ? 'translate-x-4 dark:bg-neutral-900' : 'dark:bg-neutral-400'
        }`}
      />
    </button>
  )
}

export default function WorkHoursEditor({ open, onClose }: { open: boolean; onClose: () => void }) {
  // The form mounts only while open, so it starts from the saved hours every time
  return open ? <Editor onClose={onClose} /> : null
}

function Editor({ onClose }: { onClose: () => void }) {
  const { data, apply } = useData()
  const [rows, setRows] = useState<Row[]>(() =>
    Array.from({ length: 7 }, (_, dow) => {
      const w = data?.settings.workHours[dow] ?? null
      return { on: w !== null, ...(w ?? FALLBACK) }
    }),
  )

  const patch = (dow: number, p: Partial<Row>) => setRows((rs) => rs.map((r, i) => (i === dow ? { ...r, ...p } : r)))
  const invalid = rows.some((r) => r.on && (!r.start || !r.end || r.end <= r.start))

  const save = () => {
    if (!data || invalid) return
    const workHours: WorkDay[] = rows.map((r) => (r.on ? { start: r.start, end: r.end } : null))
    apply({ type: 'setSettings', settings: touch({ ...data.settings, workHours }) })
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Working hours"
      description="The planner only schedules tasks inside these hours."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save} disabled={invalid || !data}>
            Save
          </Button>
        </>
      }
    >
      <ul className="space-y-2.5">
        {DAYS.map(({ dow, label }) => {
          const r = rows[dow]
          return (
            <li key={dow} className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <Switch on={r.on} onChange={(on) => patch(dow, { on })} label={`${label} is a working day`} />
              <span className={`w-24 text-sm ${r.on ? '' : MUTED_TEXT}`}>{label}</span>
              {r.on ? (
                <span className="flex items-center gap-2">
                  <input
                    type="time"
                    aria-label={`${label} start`}
                    value={r.start}
                    onChange={(e) => patch(dow, { start: e.target.value })}
                    className={TIME}
                  />
                  <span className={MUTED_TEXT} aria-hidden>
                    to
                  </span>
                  <input
                    type="time"
                    aria-label={`${label} end`}
                    value={r.end}
                    onChange={(e) => patch(dow, { end: e.target.value })}
                    className={TIME}
                  />
                </span>
              ) : (
                <span className={`text-sm ${MUTED_TEXT}`}>Day off</span>
              )}
            </li>
          )
        })}
      </ul>
      {invalid && <p className="mt-3 text-sm text-red-600 dark:text-red-400">Each end time must be after its start time.</p>}
    </Modal>
  )
}
