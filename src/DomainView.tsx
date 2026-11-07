import { useState } from 'react'
import type { FormEvent } from 'react'
import TaskEditor from './TaskEditor'
import { newProject, touch } from './data/make'
import { useData } from './data/store'
import type { BasicTask, ClaudeTask, Domain, Project, Task } from './data/types'

const BUTTON =
  'rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800'
const PRIMARY =
  'rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300'
const INPUT =
  'rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900'
const MUTED = 'text-sm text-slate-500 dark:text-slate-400'

const BASIC_STATUSES: BasicTask['status'][] = ['todo', 'doing', 'done']
const CLAUDE_STATUSES: ClaudeTask['status'][] = ['queued', 'in-progress', 'done', 'blocked']

// Open tasks first, then by due date (none last), then creation time
function compareTasks(a: Task, b: Task): number {
  const open = Number(a.status === 'done') - Number(b.status === 'done')
  if (open !== 0) return open
  if (a.due !== b.due) {
    if (!a.due) return 1
    if (!b.due) return -1
    return a.due < b.due ? -1 : 1
  }
  return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0
}

function TaskRow({ domain, task }: { domain: Domain; task: Task }) {
  const { apply } = useData()
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <li>
        <TaskEditor
          domain={domain}
          projectId={task.projectId}
          task={task}
          onDone={() => setEditing(false)}
        />
      </li>
    )
  }

  const done = task.status === 'done'
  const statuses: string[] = task.kind === 'claude' ? CLAUDE_STATUSES : BASIC_STATUSES
  const onStatus = (status: string) =>
    apply({
      type: 'upsertTask',
      task: touch({ ...task, status } as Task),
    })
  const onDelete = () => {
    if (window.confirm(`Delete task "${task.title}"?`)) apply({ type: 'deleteTask', id: task.id })
  }

  return (
    <li data-testid="task-row" className="flex flex-wrap items-center gap-x-3 gap-y-1 py-1.5">
      <span
        className={`min-w-0 flex-1 break-words ${
          done ? 'text-slate-400 line-through dark:text-slate-500' : ''
        }`}
      >
        {task.title}
      </span>
      {task.kind === 'claude' && <span className={MUTED}>{task.repo}</span>}
      {task.due && <span className={MUTED}>{task.due}</span>}
      <select
        value={task.status}
        onChange={(e) => onStatus(e.target.value)}
        aria-label={`Status of ${task.title}`}
        className={INPUT}
      >
        {statuses.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <button type="button" onClick={() => setEditing(true)} className={BUTTON}>
        Edit
      </button>
      <button type="button" onClick={onDelete} className={BUTTON}>
        Delete
      </button>
    </li>
  )
}

function ProjectCard({ project, tasks }: { project: Project; tasks: Task[] }) {
  const { apply } = useData()
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(project.name)
  const [adding, setAdding] = useState(false)

  const startRename = () => {
    setName(project.name)
    setRenaming(true)
  }

  const commitRename = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    if (trimmed !== project.name) {
      apply({ type: 'upsertProject', project: touch({ ...project, name: trimmed }) })
    }
    setRenaming(false)
  }

  const onDelete = () => {
    if (window.confirm(`Delete project "${project.name}" and its ${tasks.length} task(s)?`)) {
      apply({ type: 'deleteProject', id: project.id })
    }
  }

  return (
    <section
      data-testid="project-card"
      className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex flex-wrap items-center gap-2">
        {renaming ? (
          <form onSubmit={commitRename} className="flex flex-1 flex-wrap items-center gap-2">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setRenaming(false)}
              aria-label="Project name"
              className={`${INPUT} min-w-0 flex-1`}
            />
            <button type="submit" disabled={!name.trim()} className={PRIMARY}>
              Save
            </button>
          </form>
        ) : (
          <>
            <h3 className="min-w-0 flex-1 text-lg font-semibold break-words">{project.name}</h3>
            <button type="button" onClick={startRename} className={BUTTON}>
              Rename
            </button>
          </>
        )}
        <button type="button" onClick={onDelete} className={BUTTON}>
          Delete
        </button>
      </div>

      {tasks.length === 0 ? (
        <p className={`mt-3 ${MUTED}`}>No tasks yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-200 dark:divide-slate-800">
          {tasks.map((t) => (
            <TaskRow key={t.id} domain={project.domain} task={t} />
          ))}
        </ul>
      )}

      <div className="mt-3">
        {adding ? (
          <TaskEditor
            domain={project.domain}
            projectId={project.id}
            onDone={() => setAdding(false)}
          />
        ) : (
          <button type="button" onClick={() => setAdding(true)} className={BUTTON}>
            Add task
          </button>
        )}
      </div>
    </section>
  )
}

export default function DomainView({ domain }: { domain: Domain }) {
  const { data, apply } = useData()
  const [newName, setNewName] = useState('')

  if (!data) return null

  const projects = data.projects
    .filter((p) => p.domain === domain)
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0))

  const onAdd = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = newName.trim()
    if (!trimmed) return
    apply({ type: 'upsertProject', project: newProject(domain, trimmed) })
    setNewName('')
  }

  return (
    <div className="mt-4 space-y-4">
      <form onSubmit={onAdd} className="flex max-w-md gap-2">
        <input
          data-testid="new-project-input"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New project"
          aria-label="New project name"
          className={`${INPUT} min-w-0 flex-1`}
        />
        <button type="submit" className={PRIMARY}>
          Add
        </button>
      </form>

      {projects.length === 0 ? (
        <p className={MUTED}>No projects yet.</p>
      ) : (
        projects.map((p) => (
          <ProjectCard
            key={p.id}
            project={p}
            tasks={data.tasks.filter((t) => t.projectId === p.id).sort(compareTasks)}
          />
        ))
      )}
    </div>
  )
}
