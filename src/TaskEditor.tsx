import { useState } from 'react'
import type { FormEvent } from 'react'
import Button from './components/Button'
import { DEFAULT_ESTIMATE_MIN, DEFAULT_PRIORITY } from './data/migrate'
import { newBasicTask, newClaudeTask, touch } from './data/make'
import { useData } from './data/store'
import type { BasicTask, ClaudeTask, Domain, Priority, Task } from './data/types'
import { MUTED_TEXT, STATUS_LABEL } from './theme'
import { BASIC_STATUSES, CLAUDE_STATUSES, ESTIMATE_OPTIONS, INPUT, PRIORITIES, PRIORITY_LABEL, formatEstimate } from './ui'

const LABEL = `block text-xs font-medium ${MUTED_TEXT}`
const FIELD = `${INPUT} mt-1.5 block w-full`

interface Props {
  domain: Domain
  projectId: string
  task?: Task
  onDone: () => void
}

export default function TaskEditor({ domain, projectId, task, onDone }: Props) {
  const { apply } = useData()
  const isClaude = task ? task.kind === 'claude' : domain === 'claude'
  const claude = task?.kind === 'claude' ? task : undefined

  const [title, setTitle] = useState(task?.title ?? '')
  const [status, setStatus] = useState<string>(task?.status ?? (isClaude ? 'queued' : 'todo'))
  const [due, setDue] = useState(task?.due ?? '')
  const [priority, setPriority] = useState<Priority>(task?.priority ?? DEFAULT_PRIORITY)
  const [estimateMin, setEstimateMin] = useState(task?.estimateMin ?? DEFAULT_ESTIMATE_MIN)
  const [notes, setNotes] = useState(task?.notes ?? '')
  const [repo, setRepo] = useState(claude?.repo ?? '')
  const [brief, setBrief] = useState(claude?.brief ?? '')
  const [acceptance, setAcceptance] = useState(claude?.acceptance ?? '')

  const valid = title.trim() !== '' && (!isClaude || repo.trim() !== '')

  const onSave = (e: FormEvent) => {
    e.preventDefault()
    if (!valid) return
    const common = {
      title: title.trim(),
      due: due || undefined,
      priority,
      estimateMin,
      notes: notes.trim() === '' ? undefined : notes,
    }
    if (isClaude) {
      const edits = {
        ...common,
        status: status as ClaudeTask['status'],
        repo: repo.trim(),
        brief,
        acceptance,
      }
      apply({
        type: 'upsertTask',
        task: claude ? touch({ ...claude, ...edits }) : newClaudeTask(projectId, edits),
      })
    } else {
      const edits = { ...common, status: status as BasicTask['status'] }
      apply({
        type: 'upsertTask',
        task: task?.kind === 'basic' ? touch({ ...task, ...edits }) : newBasicTask(projectId, edits),
      })
    }
    onDone()
  }

  return (
    <form
      onSubmit={onSave}
      data-testid="task-editor"
      className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3 sm:p-4 dark:border-neutral-800 dark:bg-neutral-900/60"
    >
      <label className={LABEL}>
        Title
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs doing?"
          className={FIELD}
        />
      </label>
      {isClaude && (
        <>
          <label className={LABEL}>
            Repo
            <input value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="owner/repo" className={FIELD} />
          </label>
          <label className={LABEL}>
            Brief
            <textarea rows={3} value={brief} onChange={(e) => setBrief(e.target.value)} className={FIELD} />
          </label>
          <label className={LABEL}>
            Acceptance criteria
            <textarea rows={3} value={acceptance} onChange={(e) => setAcceptance(e.target.value)} className={FIELD} />
          </label>
        </>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={LABEL}>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={FIELD}>
            {(isClaude ? CLAUDE_STATUSES : BASIC_STATUSES).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s] ?? s}
              </option>
            ))}
          </select>
        </label>
        <label className={LABEL}>
          Due
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={FIELD} />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={LABEL}>
          Priority
          <select value={priority} onChange={(e) => setPriority(Number(e.target.value) as Priority)} className={FIELD}>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABEL[p]}
              </option>
            ))}
          </select>
        </label>
        <label className={LABEL}>
          Estimate
          <select value={estimateMin} onChange={(e) => setEstimateMin(Number(e.target.value))} className={FIELD}>
            {(ESTIMATE_OPTIONS.includes(estimateMin) ? ESTIMATE_OPTIONS : [...ESTIMATE_OPTIONS, estimateMin].sort((a, b) => a - b)).map(
              (m) => (
                <option key={m} value={m}>
                  {formatEstimate(m)}
                </option>
              ),
            )}
          </select>
        </label>
      </div>
      <label className={LABEL}>
        Notes
        <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={FIELD} />
      </label>
      {claude?.result && (
        <div className="text-sm">
          <div className={`text-xs font-medium ${MUTED_TEXT}`}>Result</div>
          <p className="mt-1.5 whitespace-pre-wrap text-neutral-700 dark:text-neutral-300">{claude.result}</p>
        </div>
      )}
      <div className="flex gap-2 pt-1">
        <Button type="submit" variant="primary" accent={domain} disabled={!valid}>
          Save
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
