import { Check, Undo2 } from 'lucide-react'
import Button from '../components/Button'
import Linkify from '../components/Linkify'
import { useOpenTask } from '../components/useTaskDialog'
import { useToast } from '../components/useToast'
import { touch } from '../data/make'
import { useData } from '../data/store'
import type { ClaudeTask, Project, Task } from '../data/types'
import { FAINT_TEXT, FOCUS_RING, MUTED_TEXT, SURFACE } from '../theme'
import { compareTasks } from '../ui'

export default function ReviewInbox({ tasks, projects }: { tasks: Task[]; projects: Project[] }) {
  const { apply } = useData()
  const toast = useToast()
  const openTask = useOpenTask()

  const review = tasks.filter((t): t is ClaudeTask => t.kind === 'claude' && t.status === 'review').sort(compareTasks)
  if (review.length === 0) return null

  const move = (task: ClaudeTask, status: 'done' | 'queued', message: string) => {
    apply({ type: 'upsertTask', task: touch({ ...task, status }) })
    toast({
      message,
      action: { label: 'Undo', onClick: () => apply({ type: 'upsertTask', task: touch(task) }) },
    })
  }

  return (
    <section id="review" aria-labelledby="review-title" className="scroll-mt-20">
      <h2 id="review-title" className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
        Needs review
        <span className={`ml-2 font-normal tabular-nums ${MUTED_TEXT}`}>{review.length}</span>
      </h2>
      <ul className={`${SURFACE} divide-y divide-neutral-100 overflow-hidden dark:divide-neutral-800/80`}>
        {review.map((task) => {
          const project = projects.find((p) => p.id === task.projectId)
          const result = (task.result?.split('\n').find((l) => l.trim()) ?? '').trim()
          return (
            <li key={task.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-3 sm:px-4">
              <div className="min-w-0 flex-1 basis-48">
                <button
                  type="button"
                  onClick={() => openTask(task.id)}
                  className={`block max-w-full text-left text-sm font-medium break-words text-neutral-900 hover:underline dark:text-neutral-100 ${FOCUS_RING} focus-visible:ring-neutral-500/40`}
                >
                  {task.title}
                </button>
                {project && <span className={`block text-xs break-words ${MUTED_TEXT}`}>{project.name}</span>}
                {result ? (
                  <span className={`block truncate text-xs ${MUTED_TEXT}`}>
                    <Linkify text={result} />
                  </span>
                ) : (
                  <span className={`block text-xs ${FAINT_TEXT}`}>No result written</span>
                )}
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Button size="sm" variant="primary" accent="claude" icon={Check} onClick={() => move(task, 'done', 'Approved')}>
                  Approve
                </Button>
                <Button size="sm" icon={Undo2} onClick={() => move(task, 'queued', 'Sent back to the queue')}>
                  Send back
                </Button>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
