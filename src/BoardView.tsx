import { useState } from 'react'
import type { DragEvent } from 'react'
import { ListTodo, Pencil } from 'lucide-react'
import AddTask from './AddTask'
import TaskEditor from './TaskEditor'
import DueBadge from './components/DueBadge'
import EmptyState from './components/EmptyState'
import IconButton from './components/IconButton'
import Pill from './components/Pill'
import StatusSelect from './components/StatusSelect'
import { touch } from './data/make'
import { useData } from './data/store'
import type { Domain, Project, Task } from './data/types'
import { ACCENT, FAINT_TEXT, SURFACE } from './theme'
import { columnsFor, compareTasks, statusesFor } from './ui'

function Card({ domain, task, projectName }: { domain: Domain; task: Task; projectName: string }) {
  const { apply } = useData()
  const [editing, setEditing] = useState(false)

  if (editing) {
    return <TaskEditor domain={domain} projectId={task.projectId} task={task} onDone={() => setEditing(false)} />
  }

  const done = task.status === 'done'
  const onStatus = (status: string) => apply({ type: 'upsertTask', task: touch({ ...task, status } as Task) })

  return (
    <article
      data-testid="board-card"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', task.id)
        e.dataTransfer.effectAllowed = 'move'
      }}
      className="cursor-grab space-y-2 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm transition duration-150 hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-md active:cursor-grabbing dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-none dark:hover:border-neutral-700"
    >
      <div
        className={`text-sm font-medium break-words ${done ? 'text-neutral-500 line-through dark:text-neutral-400' : ''}`}
      >
        {task.title}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {projectName && (
          <Pill className="max-w-full bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
            <span className="truncate">{projectName}</span>
          </Pill>
        )}
        <DueBadge due={task.due} done={done} accent={domain} />
      </div>
      {task.kind === 'claude' && task.repo && (
        <div className="font-mono text-xs break-all text-neutral-500 dark:text-neutral-400">{task.repo}</div>
      )}
      <div className="flex items-center justify-between gap-2">
        <StatusSelect
          value={task.status}
          statuses={statusesFor(domain)}
          onChange={onStatus}
          label={`Status of ${task.title}`}
          accent={domain}
        />
        <IconButton icon={Pencil} label={`Edit ${task.title}`} size="sm" accent={domain} onClick={() => setEditing(true)} />
      </div>
    </article>
  )
}

export default function BoardView({
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
  const { apply } = useData()
  const [over, setOver] = useState<string | null>(null)
  const a = ACCENT[domain]
  const columns = columnsFor(domain)
  const names = new Map(projects.map((p) => [p.id, p.name]))
  const sorted = [...tasks].sort(compareTasks)

  const onDrop = (e: DragEvent, status: string) => {
    e.preventDefault()
    setOver(null)
    const task = tasks.find((t) => t.id === e.dataTransfer.getData('text/plain'))
    if (!task || task.status === status) return
    apply({ type: 'upsertTask', task: touch({ ...task, status } as Task) })
  }

  return (
    <div className="space-y-4">
      <AddTask domain={domain} projects={projects} selectedId={selectedId} />
      {tasks.length === 0 ? (
        <EmptyState icon={ListTodo} title="No tasks yet" description="Add a task to see it on the board." />
      ) : (
        <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${columns.length === 4 ? 'xl:grid-cols-4' : 'lg:grid-cols-3'}`}>
          {columns.map((status) => {
            const items = sorted.filter((t) => t.status === status)
            return (
              <section
                key={status}
                data-testid="board-column"
                data-status={status}
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={() => setOver(status)}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(null)
                }}
                onDrop={(e) => onDrop(e, status)}
                className={`min-w-0 space-y-2 p-2 transition-colors duration-150 ${
                  over === status ? `rounded-xl border ${a.softBorder} ${a.softBg}` : SURFACE
                }`}
              >
                <div className="flex items-center justify-between px-1 pt-1">
                  <Pill status={status} accent={domain} />
                  <span className="text-xs font-medium text-neutral-500 tabular-nums dark:text-neutral-400">{items.length}</span>
                </div>
                {items.length === 0 && <p className={`px-1 py-4 text-center text-xs ${FAINT_TEXT}`}>Drop a task here</p>}
                {items.map((t) => (
                  <Card key={t.id} domain={domain} task={t} projectName={names.get(t.projectId) ?? ''} />
                ))}
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
