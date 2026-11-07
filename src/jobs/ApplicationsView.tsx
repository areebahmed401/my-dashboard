import { useState } from 'react'
import type { FormEvent } from 'react'
import { Briefcase, Check, Loader, MapPin, Plus, Sparkles } from 'lucide-react'
import Button from '../components/Button'
import DueBadge from '../components/DueBadge'
import EmptyState from '../components/EmptyState'
import Modal from '../components/Modal'
import Pill from '../components/Pill'
import { newJob } from '../data/make'
import { useData } from '../data/store'
import type { Job } from '../data/types'
import { formatShortDate } from '../due'
import { ACCENT, FOCUS_RING, MUTED_TEXT, SURFACE } from '../theme'
import JobDetail from './JobDetail'
import { draftFields, draftFrom, draftValid } from './draft'
import type { JobDraft } from './draft'
import JobFields from './JobFields'

const a = ACCENT['job-search']

// Deadline soonest first, none last
function byDeadline(x: Job, y: Job): number {
  if (x.deadline !== y.deadline) {
    if (!x.deadline) return 1
    if (!y.deadline) return -1
    return x.deadline < y.deadline ? -1 : 1
  }
  return x.createdAt < y.createdAt ? -1 : x.createdAt > y.createdAt ? 1 : 0
}

// Most recently applied first
const byApplied = (x: Job, y: Job) => (y.appliedOn ?? '').localeCompare(x.appliedOn ?? '')

function JobCard({ job, onOpen }: { job: Job; onOpen: () => void }) {
  const applied = job.status === 'applied'
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        data-testid="job-card"
        className={`${SURFACE} block w-full min-w-0 p-3 text-left transition-colors duration-150 hover:border-neutral-300 dark:hover:border-neutral-700 ${FOCUS_RING} ${a.ring}`}
      >
        <div className="font-semibold break-words">{job.company}</div>
        <div className="mt-0.5 text-sm break-words text-neutral-700 dark:text-neutral-300">{job.role}</div>
        {job.location && (
          <div className={`mt-1.5 flex items-center gap-1 text-xs ${MUTED_TEXT}`}>
            <MapPin className="size-3 shrink-0" aria-hidden />
            <span className="min-w-0 break-words">{job.location}</span>
          </div>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-1.5 empty:hidden">
          {!applied && <DueBadge due={job.deadline} accent="job-search" />}
          {applied && job.appliedOn && (
            <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium ${a.softBg} ${a.text}`}>
              <Check className="size-3" aria-hidden />
              Applied {formatShortDate(job.appliedOn)}
            </span>
          )}
          {job.tailor === 'requested' && (
            <Pill className="bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300">
              <Loader className="size-3" aria-hidden />
              Tailoring…
            </Pill>
          )}
          {job.tailor === 'done' && (
            <Pill className={`${a.softBg} ${a.text}`}>
              <Sparkles className="size-3" aria-hidden />
              Tailored
            </Pill>
          )}
        </div>
      </button>
    </li>
  )
}

interface ColumnProps {
  title: string
  jobs: Job[]
  empty: string
  onOpen: (id: string) => void
}

function Column({ title, jobs, empty, onOpen }: ColumnProps) {
  return (
    <section className="min-w-0" aria-label={title}>
      <h3 className="mb-2 flex items-baseline gap-2 text-sm font-semibold">
        {title}
        <span className={`text-xs font-normal tabular-nums ${MUTED_TEXT}`}>{jobs.length}</span>
      </h3>
      {jobs.length === 0 ? (
        <p className={`rounded-xl border border-dashed border-neutral-200 px-4 py-6 text-center text-sm dark:border-neutral-800 ${MUTED_TEXT}`}>
          {empty}
        </p>
      ) : (
        <ul className="space-y-2">
          {jobs.map((j) => (
            <JobCard key={j.id} job={j} onOpen={() => onOpen(j.id)} />
          ))}
        </ul>
      )}
    </section>
  )
}

function AddJobModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { apply } = useData()
  const [draft, setDraft] = useState<JobDraft>(() => draftFrom())

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!draftValid(draft)) return
    const { company, role, url, location, deadline, posting } = draftFields(draft)
    apply({ type: 'upsertJob', job: newJob({ company, role, url, location, deadline, posting }) })
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add job"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="add-job-form" variant="primary" accent="job-search" disabled={!draftValid(draft)}>
            Add job
          </Button>
        </>
      }
    >
      <form id="add-job-form" onSubmit={onSubmit}>
        <JobFields draft={draft} onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))} />
      </form>
    </Modal>
  )
}

export default function ApplicationsView() {
  const { data } = useData()
  const [adding, setAdding] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  if (!data) return null

  const todo = data.jobs.filter((j) => j.status !== 'applied').sort(byDeadline)
  const applied = data.jobs.filter((j) => j.status === 'applied').sort(byApplied)
  const addButton = (
    <Button variant="primary" accent="job-search" icon={Plus} onClick={() => setAdding(true)}>
      Add job
    </Button>
  )

  return (
    <div className="space-y-4">
      {data.jobs.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No applications yet"
          description="Add a job with its posting, then tailor your CV and letter to it."
          action={addButton}
        />
      ) : (
        <>
          <div className="flex justify-end">{addButton}</div>
          <div className="grid gap-6 md:grid-cols-2">
            <Column title="Not yet applied" jobs={todo} empty="Nothing waiting." onOpen={setOpenId} />
            <Column title="Applied" jobs={applied} empty="No applications sent yet." onOpen={setOpenId} />
          </div>
        </>
      )}
      <AddJobModal open={adding} onClose={() => setAdding(false)} />
      {openId && <JobDetail jobId={openId} onClose={() => setOpenId(null)} />}
    </div>
  )
}
