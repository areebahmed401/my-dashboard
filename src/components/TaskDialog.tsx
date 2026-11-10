import { useState } from 'react'
import type { ReactNode } from 'react'
import TaskEditor from '../TaskEditor'
import { useData } from '../data/store'
import { ACCENT } from '../theme'
import Modal from './Modal'
import { TaskDialogContext } from './useTaskDialog'

export function TaskDialogProvider({ children }: { children: ReactNode }) {
  const { data } = useData()
  const [taskId, setTaskId] = useState<string | null>(null)

  // Looked up on every render so edits and deletes elsewhere are reflected
  const task = taskId ? data?.tasks.find((t) => t.id === taskId) : undefined
  const project = task ? data?.projects.find((p) => p.id === task.projectId) : undefined
  const close = () => setTaskId(null)

  return (
    <TaskDialogContext value={setTaskId}>
      {children}
      {task && project && (
        <Modal open onClose={close} title="Edit task" description={`${ACCENT[project.domain].label} · ${project.name}`}>
          <TaskEditor key={task.id} domain={project.domain} projectId={project.id} task={task} onDone={close} />
        </Modal>
      )}
    </TaskDialogContext>
  )
}
