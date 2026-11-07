import { useState } from 'react'
import { ChevronDown, ChevronRight, Circle, CircleCheck } from 'lucide-react'
import TaskEditor from '../TaskEditor'
import DueBadge from './DueBadge'
import EstimateBadge from './EstimateBadge'
import PriorityPill from './PriorityPill'
import { touch } from '../data/make'
import { useData } from '../data/store'
import type { Domain, Project, Task } from '../data/types'
import { ACCENT, FAINT_TEXT, FOCUS_RING, MUTED_TEXT, STATUS_LABEL, statusPill } from '../theme'
import { compareTasks } from '../ui'

interface TodoListProps {
  domain: Domain
  tasks: Task[]
  projects: Project[]
  groupBy?: 'none' | 'project'
}

function TodoRow({ domain, task, project }: { domain: Domain; task: Task; project?: Project }) {
  const { apply } = useData()
  const [editing, setEditing] = useState(false)
  const a = ACCENT[domain]

  if (editing) {
    return (
      <li className="py-2.5">
        <TaskEditor domain={domain} projectId={task.projectId} task={task} onDone={() => setEditing(false)} />
      </li>
    )
  }

  const done = task.status === 'done'
  const toggle = () => {
    const status = done ? (task.kind === 'claude' ? 'queued' : 'todo') : 'done'
    apply({ type: 'upsertTask', task: touch({ ...task, status } as Task) })
  }
  const Check = done ? CircleCheck : Circle
  const brief = task.kind === 'claude' ? (task.brief.split('\n').find((l) => l.trim()) ?? '').trim() : ''

  return (
    <li data-testid="todo-row" className="flex items-start gap-2 py-2">
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={done ? `Reopen ${task.title}` : `Mark ${task.title} done`}
        onClick={toggle}
        className={`mt-0.5 shrink-0 rounded-full ${FOCUS_RING} ${a.ring} ${done ? a.text : FAINT_TEXT}`}
      >
        <Check className="size-5" aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label={`Edit ${task.title}`}
        className={`min-w-0 flex-1 rounded-md text-left ${FOCUS_RING} ${a.ring}`}
      >
        <span className={`block text-sm break-words ${done ? 'text-neutral-500 line-through dark:text-neutral-400' : ''}`}>
          {task.title}
        </span>
        {project && <span className={`block text-xs break-words ${MUTED_TEXT}`}>{project.name}</span>}
        {brief && <span className={`block truncate text-xs ${FAINT_TEXT}`}>{brief}</span>}
      </button>
      <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
        {task.kind === 'claude' && (
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${statusPill(task.status, domain)}`}>
            {STATUS_LABEL[task.status] ?? task.status}
          </span>
        )}
        <div className="flex items-center gap-2">
          <PriorityPill priority={task.priority} />
          <EstimateBadge minutes={task.estimateMin} />
          <DueBadge due={task.due} done={done} accent={domain} />
        </div>
      </div>
    </li>
  )
}

function Rows({ domain, tasks, projects }: { domain: Domain; tasks: Task[]; projects: Map<string, Project> }) {
  return (
    <ul className="divide-y divide-neutral-100 dark:divide-neutral-800/80">
      {tasks.map((t) => (
        <TodoRow key={t.id} domain={domain} task={t} project={projects.get(t.projectId)} />
      ))}
    </ul>
  )
}

// Flat, priority-sorted todo list; done tasks hide behind a toggle
export default function TodoList({ domain, tasks, projects, groupBy = 'none' }: TodoListProps) {
  const [showDone, setShowDone] = useState(false)
  const byId = new Map(projects.map((p) => [p.id, p]))
  const sorted = [...tasks].sort(compareTasks)
  const open = sorted.filter((t) => t.status !== 'done')
  const done = sorted.filter((t) => t.status === 'done')
  const Chevron = showDone ? ChevronDown : ChevronRight

  return (
    <div data-testid="todo-list">
      {open.length === 0 ? (
        <p className={`py-4 text-sm ${MUTED_TEXT}`}>Nothing open.</p>
      ) : groupBy === 'project' ? (
        projects
          .filter((p) => open.some((t) => t.projectId === p.id))
          .map((p) => (
            <section key={p.id} className="mb-2">
              <h3 className={`pt-2 text-xs font-medium ${MUTED_TEXT}`}>{p.name}</h3>
              <Rows domain={domain} tasks={open.filter((t) => t.projectId === p.id)} projects={new Map()} />
            </section>
          ))
      ) : (
        <Rows domain={domain} tasks={open} projects={byId} />
      )}
      {done.length > 0 && (
        <div className="mt-2">
          <button
            type="button"
            aria-expanded={showDone}
            onClick={() => setShowDone(!showDone)}
            className={`inline-flex items-center gap-1 rounded-md py-1 text-sm ${MUTED_TEXT} ${FOCUS_RING} ${ACCENT[domain].ring}`}
          >
            <Chevron className="size-4" aria-hidden />
            Show done ({done.length})
          </button>
          {showDone && <Rows domain={domain} tasks={done} projects={byId} />}
        </div>
      )}
    </div>
  )
}
