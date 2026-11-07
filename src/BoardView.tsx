import { useState } from 'react'
import type { DragEvent } from 'react'
import AddTask from './AddTask'
import TaskEditor from './TaskEditor'
import { touch } from './data/make'
import { useData } from './data/store'
import type { Domain, Project, Task } from './data/types'
import { BUTTON, INPUT, MUTED, columnsFor, compareTasks, statusesFor } from './ui'

function Card({
  domain,
  task,
  projectName,
}: {
  domain: Domain
  task: Task
  projectName: string
}) {
  const { apply } = useData()
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <TaskEditor
        domain={domain}
        projectId={task.projectId}
        task={task}
        onDone={() => setEditing(false)}
      />
    )
  }

  const done = task.status === 'done'
  const onStatus = (status: string) =>
    apply({
      type: 'upsertTask',
      task: touch({ ...task, status } as Task),
    })

  return (
    <article
      data-testid="board-card"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', task.id)
        e.dataTransfer.effectAllowed = 'move'
      }}
      className={`cursor-grab space-y-1 rounded-md border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 ${
        done ? 'opacity-60' : ''
      }`}
    >
      <div
        className={`break-words ${done ? 'text-slate-400 line-through dark:text-slate-500' : ''}`}
      >
        {task.title}
      </div>
      <div className="text-xs text-slate-500 break-words dark:text-slate-400">{projectName}</div>
      {task.due && <div className={MUTED}>{task.due}</div>}
      {task.kind === 'claude' && <div className={`${MUTED} break-words`}>{task.repo}</div>}
      <div className="flex flex-wrap items-center gap-2 pt-1">
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
        <button type="button" onClick={() => setEditing(true)} className={BUTTON}>
          Edit
        </button>
      </div>
    </article>
  )
}

export default function BoardView({
  domain,
  projects,
  tasks,
}: {
  domain: Domain
  projects: Project[]
  tasks: Task[]
}) {
  const { apply } = useData()
  const [over, setOver] = useState<string | null>(null)
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
      <AddTask domain={domain} projects={projects} />
      {tasks.length === 0 ? (
        <p className={MUTED}>No tasks yet.</p>
      ) : (
        <div
          className={`grid grid-cols-1 gap-3 ${columns.length === 4 ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}
        >
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
                className={`min-w-0 space-y-2 rounded-lg border p-2 ${
                  over === status
                    ? 'border-slate-500 bg-slate-100 dark:border-slate-400 dark:bg-slate-800'
                    : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950'
                }`}
              >
                <h3 className="text-sm font-semibold">
                  {status} ({items.length})
                </h3>
                {items.map((t) => (
                  <Card
                    key={t.id}
                    domain={domain}
                    task={t}
                    projectName={names.get(t.projectId) ?? ''}
                  />
                ))}
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
