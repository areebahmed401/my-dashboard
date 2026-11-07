import { Fragment, useState } from 'react'
import { ArrowDown, ArrowUp, ListTodo, Pencil, SearchX, Trash2 } from 'lucide-react'
import AddTask from './AddTask'
import TaskEditor from './TaskEditor'
import DueBadge from './components/DueBadge'
import EmptyState from './components/EmptyState'
import IconButton from './components/IconButton'
import StatusSelect from './components/StatusSelect'
import { useDeleteWithUndo } from './components/useToast'
import { touch } from './data/make'
import { useData } from './data/store'
import type { Domain, Project, Task } from './data/types'
import { FOCUS_RING, MUTED_TEXT, STATUS_LABEL, SURFACE } from './theme'
import { INPUT, compareTasks, statusesFor } from './ui'

type SortKey = 'title' | 'project' | 'status' | 'due'
type Sort = { key: SortKey; dir: 'asc' | 'desc' } | null

const HEADERS: { key: SortKey; label: string }[] = [
  { key: 'title', label: 'Title' },
  { key: 'project', label: 'Project' },
  { key: 'status', label: 'Status' },
  { key: 'due', label: 'Due' },
]

const CELL = 'px-3 py-2.5'
const HEAD =
  'sticky top-0 z-10 bg-neutral-50 px-3 py-2 text-xs font-medium shadow-[0_1px_0_0_var(--color-neutral-200)] dark:bg-neutral-950 dark:shadow-[0_1px_0_0_var(--color-neutral-800)]'

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
  const { deleteTask } = useDeleteWithUndo()
  const [editing, setEditing] = useState(false)
  const done = task.status === 'done'

  const onStatus = (status: string) => apply({ type: 'upsertTask', task: touch({ ...task, status } as Task) })

  return (
    <Fragment>
      <tr data-testid="task-table-row" className="transition-colors duration-150 hover:bg-neutral-50 dark:hover:bg-neutral-900/60">
        <td className={`${CELL} text-sm break-words ${done ? 'text-neutral-500 line-through dark:text-neutral-400' : ''}`}>
          {task.title}
        </td>
        <td className={`${CELL} text-sm break-words ${MUTED_TEXT}`}>{projectName}</td>
        <td className={CELL}>
          <StatusSelect
            value={task.status}
            statuses={statusesFor(domain)}
            onChange={onStatus}
            label={`Status of ${task.title}`}
            accent={domain}
          />
        </td>
        <td className={`${CELL} whitespace-nowrap`}>
          <DueBadge due={task.due} done={done} accent={domain} />
        </td>
        {domain === 'claude' && (
          <td className={`${CELL} font-mono text-xs break-words ${MUTED_TEXT}`}>{task.kind === 'claude' ? task.repo : ''}</td>
        )}
        <td className={CELL}>
          <div className="flex justify-end">
            <IconButton
              icon={Pencil}
              label={`Edit ${task.title}`}
              size="sm"
              accent={domain}
              active={editing}
              onClick={() => setEditing(!editing)}
            />
            <IconButton icon={Trash2} label={`Delete ${task.title}`} size="sm" accent={domain} onClick={() => deleteTask(task)} />
          </div>
        </td>
      </tr>
      {editing && (
        <tr>
          <td colSpan={colSpan} className="bg-neutral-50 px-3 py-3 dark:bg-neutral-900/30">
            <TaskEditor domain={domain} projectId={task.projectId} task={task} onDone={() => setEditing(false)} />
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
  selectedId,
}: {
  domain: Domain
  projects: Project[]
  tasks: Task[]
  selectedId?: string | null
}) {
  const [sort, setSort] = useState<Sort>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const statuses = statusesFor(domain)
  const names = new Map(projects.map((p) => [p.id, p.name]))
  const colSpan = domain === 'claude' ? 6 : 5

  const onSort = (key: SortKey) =>
    setSort((s) => (s?.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))

  const visible = tasks.filter(
    (t) => statusFilter === '' || (statusFilter === 'open' ? t.status !== 'done' : t.status === statusFilter),
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
      <AddTask domain={domain} projects={projects} selectedId={selectedId} />
      {tasks.length > 0 && (
        <div className="flex sm:justify-end">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
            className={`${INPUT} h-9`}
          >
            <option value="">All statuses</option>
            <option value="open">Open</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s] ?? s}
              </option>
            ))}
          </select>
        </div>
      )}
      {tasks.length === 0 ? (
        <EmptyState icon={ListTodo} title="No tasks yet" description="Add a task to see it in the table." />
      ) : rows.length === 0 ? (
        <EmptyState icon={SearchX} title="No tasks match" description="Try a different status filter." />
      ) : (
        <div className={`${SURFACE} relative max-h-[70vh] overflow-x-auto overflow-y-auto`}>
          <table data-testid="task-table" className="w-full min-w-xl text-left">
            <thead>
              <tr>
                {HEADERS.map((h) => (
                  <th
                    key={h.key}
                    scope="col"
                    aria-sort={sort?.key === h.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                    className={`${HEAD} ${MUTED_TEXT}`}
                  >
                    <button
                      type="button"
                      onClick={() => onSort(h.key)}
                      className={`inline-flex items-center gap-1 rounded transition-colors duration-150 hover:text-neutral-900 dark:hover:text-neutral-100 ${FOCUS_RING} focus-visible:ring-neutral-500/40`}
                    >
                      {h.label}
                      {sort?.key === h.key &&
                        (sort.dir === 'asc' ? (
                          <ArrowUp className="size-3" aria-hidden />
                        ) : (
                          <ArrowDown className="size-3" aria-hidden />
                        ))}
                    </button>
                  </th>
                ))}
                {domain === 'claude' && (
                  <th scope="col" className={`${HEAD} ${MUTED_TEXT}`}>
                    Repo
                  </th>
                )}
                <th scope="col" className={HEAD}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/80">
              {rows.map((t) => (
                <Row key={t.id} domain={domain} task={t} projectName={names.get(t.projectId) ?? ''} colSpan={colSpan} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
