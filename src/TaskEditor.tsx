import { useState } from 'react'
import type { FormEvent } from 'react'
import { newBasicTask, newClaudeTask, touch } from './data/make'
import { useData } from './data/store'
import type { BasicTask, ClaudeTask, Domain, Task } from './data/types'

const BUTTON =
  'rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800'
const PRIMARY =
  'rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300'
const INPUT =
  'mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 font-normal dark:border-slate-700 dark:bg-slate-900'
const LABEL = 'block text-sm font-medium'

const BASIC_STATUSES: BasicTask['status'][] = ['todo', 'doing', 'done']
const CLAUDE_STATUSES: ClaudeTask['status'][] = ['queued', 'in-progress', 'done', 'blocked']

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
      className="space-y-3 rounded-md border border-slate-300 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950"
    >
      <label className={LABEL}>
        Title
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={INPUT} />
      </label>
      {isClaude && (
        <>
          <label className={LABEL}>
            Repo
            <input value={repo} onChange={(e) => setRepo(e.target.value)} className={INPUT} />
          </label>
          <label className={LABEL}>
            Brief
            <textarea
              rows={3}
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              className={INPUT}
            />
          </label>
          <label className={LABEL}>
            Acceptance criteria
            <textarea
              rows={3}
              value={acceptance}
              onChange={(e) => setAcceptance(e.target.value)}
              className={INPUT}
            />
          </label>
        </>
      )}
      <div className="flex flex-wrap gap-4">
        <label className={LABEL}>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={INPUT}>
            {(isClaude ? CLAUDE_STATUSES : BASIC_STATUSES).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className={LABEL}>
          Due
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={INPUT} />
        </label>
      </div>
      <label className={LABEL}>
        Notes
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={INPUT}
        />
      </label>
      {claude?.result && (
        <div className="text-sm">
          <div className="font-medium">Result</div>
          <p className="mt-1 whitespace-pre-wrap text-slate-600 dark:text-slate-300">{claude.result}</p>
        </div>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={!valid} className={PRIMARY}>
          Save
        </button>
        <button type="button" onClick={onDone} className={BUTTON}>
          Cancel
        </button>
      </div>
    </form>
  )
}
