import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ClipboardCopy, Columns3, FolderPlus, LayoutGrid, ListTodo, Pencil, Plus, Table2, Trash2 } from 'lucide-react'
import BoardView from './BoardView'
import TableView from './TableView'
import TaskEditor from './TaskEditor'
import Button from './components/Button'
import Card from './components/Card'
import DueBadge from './components/DueBadge'
import EmptyState from './components/EmptyState'
import EstimateBadge from './components/EstimateBadge'
import IconButton from './components/IconButton'
import PriorityPill from './components/PriorityPill'
import ProgressBar from './components/ProgressBar'
import Segmented from './components/Segmented'
import StatusSelect from './components/StatusSelect'
import TodoList from './components/TodoList'
import { useDeleteWithUndo, useToast } from './components/useToast'
import ReviewInbox from './claude/ReviewInbox'
import { groupProjects } from './claude/groups'
import { buildQueue } from './claude/queue'
import { ensureClaudeProjects } from './claude/seed'
import { newProject, touch } from './data/make'
import { useData } from './data/store'
import type { Domain, Project, Task } from './data/types'
import { daysUntil } from './due'
import { ACCENT, FOCUS_RING, MUTED_TEXT, SURFACE } from './theme'
import { INPUT, compareTasks, statusesFor } from './ui'

type View = 'list' | 'projects' | 'board' | 'table'
const VIEWS: { value: View; label: string; icon: typeof LayoutGrid }[] = [
  { value: 'list', label: 'List', icon: ListTodo },
  { value: 'projects', label: 'Projects', icon: LayoutGrid },
  { value: 'board', label: 'Board', icon: Columns3 },
  { value: 'table', label: 'Table', icon: Table2 },
]

function readView(domain: Domain): View {
  try {
    const v = localStorage.getItem(`my-dashboard.view2.${domain}`)
    if (v === 'list' || v === 'projects' || v === 'board' || v === 'table') return v
  } catch {
    // storage unavailable
  }
  return 'list'
}

function writeView(domain: Domain, view: View) {
  try {
    localStorage.setItem(`my-dashboard.view2.${domain}`, view)
  } catch {
    // storage unavailable
  }
}

function readProject(domain: Domain): string | null {
  try {
    return localStorage.getItem(`my-dashboard.project.${domain}`) || null
  } catch {
    return null
  }
}

function writeProject(domain: Domain, id: string | null) {
  try {
    if (id) localStorage.setItem(`my-dashboard.project.${domain}`, id)
    else localStorage.removeItem(`my-dashboard.project.${domain}`)
  } catch {
    // storage unavailable
  }
}

function TaskRow({ domain, task }: { domain: Domain; task: Task }) {
  const { apply } = useData()
  const { deleteTask } = useDeleteWithUndo()
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <li className="py-2.5">
        <TaskEditor domain={domain} projectId={task.projectId} task={task} onDone={() => setEditing(false)} />
      </li>
    )
  }

  const done = task.status === 'done'
  const onStatus = (status: string) => apply({ type: 'upsertTask', task: touch({ ...task, status } as Task) })

  return (
    <li data-testid="task-row" className="flex flex-wrap items-center gap-x-2 gap-y-1 py-2">
      <StatusSelect
        value={task.status}
        statuses={statusesFor(domain)}
        onChange={onStatus}
        label={`Status of ${task.title}`}
        accent={domain}
      />
      <div className="min-w-0 flex-1 basis-32">
        <span
          className={`text-sm break-words ${done ? 'text-neutral-500 line-through dark:text-neutral-400' : ''}`}
        >
          {task.title}
        </span>
        {task.kind === 'claude' && task.repo && (
          <span className="ml-2 font-mono text-xs text-neutral-400 dark:text-neutral-500">{task.repo}</span>
        )}
      </div>
      <PriorityPill priority={task.priority} />
      <EstimateBadge minutes={task.estimateMin} />
      <DueBadge due={task.due} done={done} accent={domain} />
      <div className="flex shrink-0">
        <IconButton icon={Pencil} label={`Edit ${task.title}`} size="sm" accent={domain} onClick={() => setEditing(true)} />
        <IconButton icon={Trash2} label={`Delete ${task.title}`} size="sm" accent={domain} onClick={() => deleteTask(task)} />
      </div>
    </li>
  )
}

function ProjectCard({ project, tasks }: { project: Project; tasks: Task[] }) {
  const [adding, setAdding] = useState(false)
  const done = tasks.filter((t) => t.status === 'done').length

  return (
    <section data-testid="project-card" className={`${SURFACE} flex min-w-0 flex-col p-4`}>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="min-w-0 font-semibold break-words">{project.name}</h3>
        <span className={`shrink-0 text-xs tabular-nums ${MUTED_TEXT}`}>
          {done}/{tasks.length}
        </span>
      </div>
      {project.path && <p className={`mt-0.5 font-mono text-xs break-all ${MUTED_TEXT}`}>{project.path}</p>}
      <ProgressBar className="mt-2" value={done} max={tasks.length} accent={project.domain} label={`${project.name} progress`} />

      {tasks.length === 0 ? (
        <p className={`mt-3 text-sm ${MUTED_TEXT}`}>No tasks yet.</p>
      ) : (
        <ul className="mt-2 divide-y divide-neutral-100 dark:divide-neutral-800/80">
          {tasks.map((t) => (
            <TaskRow key={t.id} domain={project.domain} task={t} />
          ))}
        </ul>
      )}

      <div className="mt-3">
        {adding ? (
          <TaskEditor domain={project.domain} projectId={project.id} onDone={() => setAdding(false)} />
        ) : (
          <Button variant="ghost" size="sm" icon={Plus} accent={project.domain} onClick={() => setAdding(true)}>
            Add task
          </Button>
        )}
      </div>
    </section>
  )
}

export default function DomainView({ domain }: { domain: Domain }) {
  const { data, apply } = useData()
  const { deleteProject } = useDeleteWithUndo()
  const toast = useToast()
  const a = ACCENT[domain]
  const [view, setViewState] = useState<View>(() => readView(domain))
  const [picked, setPicked] = useState<string | null>(() => readProject(domain))
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')

  // Claude tab: create the Cowork / Code projects once per data load (the ref also survives StrictMode's double effect)
  const loaded = data !== null
  const seeded = useRef(false)
  useEffect(() => {
    if (domain !== 'claude' || !data || seeded.current) return
    seeded.current = true
    ensureClaudeProjects(data, apply)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain, loaded])

  if (!data) return null

  const setView = (v: View) => {
    writeView(domain, v)
    setViewState(v)
  }
  const select = (id: string | null) => {
    writeProject(domain, id)
    setPicked(id)
    setRenaming(false)
  }

  const projects = data.projects
    .filter((p) => p.domain === domain)
    .sort((x, y) => (x.createdAt < y.createdAt ? -1 : x.createdAt > y.createdAt ? 1 : 0))
  const selected = projects.find((p) => p.id === picked) ?? null

  const projectIds = new Set(projects.map((p) => p.id))
  const domainTasks = data.tasks.filter((t) => projectIds.has(t.projectId))
  const counts = new Map<string, number>()
  for (const t of domainTasks) counts.set(t.projectId, (counts.get(t.projectId) ?? 0) + 1)

  const shownProjects = selected ? [selected] : projects
  const shownTasks = selected ? domainTasks.filter((t) => t.projectId === selected.id) : domainTasks

  const open = domainTasks.filter((t) => t.status !== 'done').length
  const active = domainTasks.filter((t) => t.status === 'doing' || t.status === 'in-progress').length
  const overdue = domainTasks.filter((t) => t.status !== 'done' && t.due && daysUntil(t.due) < 0).length
  const stats = [
    { label: 'Open', value: open, red: false },
    { label: 'In progress', value: active, red: false },
    { label: 'Overdue', value: overdue, red: overdue > 0 },
    { label: 'Done', value: domainTasks.length - open, red: false },
  ]

  const onAdd = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = newName.trim()
    if (!trimmed) return
    apply({ type: 'upsertProject', project: newProject(domain, trimmed) })
    setNewName('')
    setCreating(false)
  }

  const startRename = () => {
    if (!selected) return
    setRenameValue(selected.name)
    setRenaming(true)
  }

  const commitRename = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = renameValue.trim()
    if (!selected || !trimmed) return
    if (trimmed !== selected.name) apply({ type: 'upsertProject', project: touch({ ...selected, name: trimmed }) })
    setRenaming(false)
  }

  const chip = (on: boolean) =>
    `inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-medium whitespace-nowrap transition-colors duration-150 ${FOCUS_RING} ${a.ring} ${
      on
        ? `${a.softBg} ${a.text} ${a.softBorder}`
        : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300 dark:hover:bg-neutral-900 dark:hover:text-neutral-100'
    }`

  const Icon = a.icon
  const grouped = domain === 'claude' ? groupProjects(projects) : null
  const copyQueue = async () => {
    const { text, count } = buildQueue(domainTasks, projects)
    try {
      await navigator.clipboard.writeText(text)
      toast({ message: `Copied ${count} ${count === 1 ? 'task' : 'tasks'}` })
    } catch {
      toast({ message: 'Could not copy to the clipboard', tone: 'error' })
    }
  }

  return (
    <div className="mt-4 space-y-4">
      <Card className={`${a.gradient} flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`}>
        <div className="flex items-center gap-3">
          <span className={`flex size-10 items-center justify-center rounded-xl md:hidden ${a.softBg} ${a.text}`}>
            <Icon className="size-5" aria-hidden />
          </span>
          <div>
            <div className="font-semibold md:hidden">{a.label}</div>
            <div className={`text-xs tabular-nums ${MUTED_TEXT}`}>
              {projects.length} {projects.length === 1 ? 'project' : 'projects'} · {domainTasks.length}{' '}
              {domainTasks.length === 1 ? 'task' : 'tasks'}
            </div>
          </div>
          {domain === 'claude' && (
            <Button size="sm" accent={domain} icon={ClipboardCopy} onClick={copyQueue} className="ml-auto">
              Copy queue
            </Button>
          )}
        </div>
        <dl className="grid grid-cols-4 gap-4 sm:gap-8">
          {stats.map((s) => (
            <div key={s.label}>
              <dt className={`text-xs ${MUTED_TEXT}`}>{s.label}</dt>
              <dd className={`text-xl font-semibold tabular-nums sm:text-2xl ${s.red ? 'text-red-600 dark:text-red-400' : ''}`}>
                {s.value}
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      {domain === 'claude' && <ReviewInbox tasks={domainTasks} projects={projects} />}

      <div className="flex items-center gap-2">
        <div
          role="group"
          aria-label="Project filter"
          className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <button type="button" aria-pressed={!selected} onClick={() => select(null)} className={chip(!selected)}>
            All
            <span className="text-xs tabular-nums opacity-70">{domainTasks.length}</span>
          </button>
          {(grouped ?? [{ key: 'all', label: '', projects }]).map((g) => (
            <div key={g.key} role="group" aria-label={g.label || undefined} className="flex shrink-0 items-center gap-2">
              {g.label && <span className={`text-xs font-medium ${MUTED_TEXT}`}>{g.label}</span>}
              {g.projects.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={selected?.id === p.id}
                  onClick={() => select(p.id)}
                  className={chip(selected?.id === p.id)}
                >
                  {p.name}
                  <span className="text-xs tabular-nums opacity-70">{counts.get(p.id) ?? 0}</span>
                </button>
              ))}
            </div>
          ))}
          {creating ? (
            <form onSubmit={onAdd} className="shrink-0">
              <input
                data-testid="new-project-input"
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setNewName('')
                    setCreating(false)
                  }
                }}
                onBlur={() => {
                  if (!newName.trim()) setCreating(false)
                }}
                placeholder="Project name"
                aria-label="New project name"
                className={`${INPUT} h-8 w-44`}
              />
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className={`${chip(false)} border-dashed text-neutral-500 dark:text-neutral-400`}
            >
              <Plus className="size-3.5" aria-hidden />
              New project
            </button>
          )}
        </div>
        {selected &&
          (renaming ? (
            <form onSubmit={commitRename} className="flex shrink-0 items-center gap-1">
              <input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && setRenaming(false)}
                aria-label="Project name"
                className={`${INPUT} h-8 w-32 sm:w-48`}
              />
              <Button type="submit" size="sm" variant="primary" accent={domain} disabled={!renameValue.trim()}>
                Save
              </Button>
            </form>
          ) : (
            <div className="flex shrink-0 items-center">
              <IconButton icon={Pencil} label="Rename project" size="sm" accent={domain} onClick={startRename} />
              <IconButton
                icon={Trash2}
                label="Delete project"
                size="sm"
                accent={domain}
                onClick={() => {
                  deleteProject(
                    selected,
                    domainTasks.filter((t) => t.projectId === selected.id),
                  )
                  select(null)
                }}
              />
            </div>
          ))}
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon={FolderPlus}
          title="Create your first project"
          description="Projects group the tasks of this area."
          action={
            <Button variant="primary" accent={domain} icon={Plus} onClick={() => setCreating(true)}>
              New project
            </Button>
          }
        />
      ) : (
        <>
          <div data-testid="view-switch" className="flex sm:justify-end">
            <Segmented value={view} onChange={setView} options={VIEWS} label="View" accent={domain} />
          </div>

          {view === 'list' ? (
            <div className={`${SURFACE} px-4 py-2`}>
              <TodoList domain={domain} tasks={shownTasks} projects={projects} />
            </div>
          ) : view === 'board' ? (
            <BoardView domain={domain} projects={projects} tasks={shownTasks} selectedId={selected?.id} />
          ) : view === 'table' ? (
            <TableView domain={domain} projects={projects} tasks={shownTasks} selectedId={selected?.id} />
          ) : (
            <div className="space-y-4">
              {(grouped ? groupProjects(shownProjects) : [{ key: 'all', label: '', projects: shownProjects }]).map((g) => (
                <div key={g.key}>
                  {g.label && <h2 className={`mb-2 text-xs font-semibold tracking-wide uppercase ${MUTED_TEXT}`}>{g.label}</h2>}
                  <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
                    {g.projects.map((p) => (
                      <ProjectCard key={p.id} project={p} tasks={shownTasks.filter((t) => t.projectId === p.id).sort(compareTasks)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
