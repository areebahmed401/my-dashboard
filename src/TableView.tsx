import { Fragment, useState } from 'react'
import AddTask from './AddTask'
import TaskEditor from './TaskEditor'
import { touch } from './data/make'
import { useData } from './data/store'
import type { Domain, Project, Task } from './data/types'
import { BUTTON, INPUT, MUTED, compareTasks, statusesFor } from './ui'

type SortKey = 'title' | 'project' | 'status' | 'due'
type Sort = { key: SortKey; dir: 'asc' | 'desc' } | null

const HEADERS: { key: SortKey; label: string }[] = [
  { key: 'title', label: 'Title' },
  { key: 'project', label: 'Project' },
  { key: 'status', label: 'Status' },
  { key: 'due', label: 'Due' },
]

function Row({
  domain,
  task,
  projectName,
  colSpan,
}: {
  domain: Domain
  task: Task
  projectName: string
  colSpan: number
}) {
  const { apply } = useData()
  const [editing, setEditing] = useState(false)
  const done = task.status === 'done'

  const onStatus = (status: string) =>
    apply({
      type: 'upsertTask',
      task: touch({ ...task, status } as Task),
    })
  const onDelete = () => {
    if (window.confirm(`Delete task "${task.title}"?`)) apply({ type: 'deleteTask', id: task.id })
  }

  return (
    <Fragment>
      <tr data-testid="task-table-row" className={done ? 'opacity-60' : ''}>
        <td className={`px-2 py-1.5 break-words ${done ? 'line-through' : ''}`}>{task.title}</td>
        <td className="px-2 py-1.5 break-words">{projectName}</td>
        <td className="px-2 py-1.5">
          <select
            value={task.status}
            onChange={(e) => onStatus(e.target.value)}
            aria-label={`Status of ${task.title}`}
            className={INPUT}
          >
            {statusesFor(domain).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </td>
        <td className="px-2 py-1.5 whitespace-nowrap">{task.due ?? ''}</td>
        {domain === 'claude' && (
          <td className="px-2 py-1.5 break-words">{task.kind === 'claude' ? task.repo : ''}</td>
        )}
        <td className="px-2 py-1.5">
          <div className="flex gap-2">
            <button type="button" onClick={() => setEditing(!editing)} className={BUTTON}>
              Edit
            </button>
            <button type="button" onClick={onDelete} className={BUTTON}>
              Delete
            </button>
          </div>
        </td>
      </tr>
      {editing && (
        <tr>
          <td colSpan={colSpan} className="px-2 py-2">
            <TaskEditor
              domain={domain}
              projectId={task.projectId}
              task={task}
              onDone={() => setEditing(false)}
            />
          </td>
        </tr>
      )}
    </Fragment>
  )
}

export default function TableView({
  domain,
  projects,
  tasks,
}: {
  domain: Domain
  projects: Project[]
  tasks: Task[]
}) {
  const [sort, setSort] = useState<Sort>(null)
  const [projectFilter, setProjectFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const statuses = statusesFor(domain)
  const names = new Map(projects.map((p) => [p.id, p.name]))
  const colSpan = domain === 'claude' ? 6 : 5

  const onSort = (key: SortKey) =>
    setSort((s) => (s?.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))

  const visible = tasks.filter(
    (t) =>
      (projectFilter === '' || t.projectId === projectFilter) &&
      (statusFilter === '' ||
        (statusFilter === 'open' ? t.status !== 'done' : t.status === statusFilter)),
  )

  const rows = [...visible].sort((a, b) => {
    if (!sort) return compareTasks(a, b)
    const dir = sort.dir === 'asc' ? 1 : -1
    let c = 0
    if (sort.key === 'due') {
      if (!a.due !== !b.due) return a.due ? -1 : 1 // empty due dates always last
      if (a.due && b.due && a.due !== b.due) c = a.due < b.due ? -1 : 1
    } else if (sort.key === 'status') {
      c = statuses.indexOf(a.status) - statuses.indexOf(b.status)
    } else if (sort.key === 'project') {
      c = (names.get(a.projectId) ?? '').localeCompare(names.get(b.projectId) ?? '')
    } else {
      c = a.title.localeCompare(b.title)
    }
    return c !== 0 ? c * dir : compareTasks(a, b)
  })

  return (
    <div className="space-y-4">
      <AddTask domain={domain} projects={projects} />
      {tasks.length === 0 ? (
        <p className={MUTED}>No tasks yet.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              aria-label="Filter by project"
              className={INPUT}
            >
              <option value="">All projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
              className={INPUT}
            >
              <option value="">All statuses</option>
              <option value="open">Open</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          {rows.length === 0 ? (
            <p className={MUTED}>No tasks match</p>
          ) : (
            <div className="relative overflow-x-auto">
              <table data-testid="task-table" className="w-full min-w-xl text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    {HEADERS.map((h) => (
                      <th
                        key={h.key}
                        scope="col"
                        aria-sort={
                          sort?.key === h.key
                            ? sort.dir === 'asc'
                              ? 'ascending'
                              : 'descending'
                            : 'none'
                        }
                        className="px-2 py-1.5 font-semibold"
                      >
                        <button type="button" onClick={() => onSort(h.key)}>
                          {h.label}
                          {sort?.key === h.key && (sort.dir === 'asc' ? ' ▲' : ' ▼')}
                        </button>
                      </th>
                    ))}
                    {domain === 'claude' && (
                      <th scope="col" className="px-2 py-1.5 font-semibold">
                        Repo
                      </th>
                    )}
                    <th scope="col" className="px-2 py-1.5">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {rows.map((t) => (
                    <Row
                      key={t.id}
                      domain={domain}
                      task={t}
                      projectName={names.get(t.projectId) ?? ''}
                      colSpan={colSpan}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
