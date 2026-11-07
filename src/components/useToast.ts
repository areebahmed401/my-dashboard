import { createContext, useCallback, useContext } from 'react'
import { touch } from '../data/make'
import { useData } from '../data/store'
import type { Project, Task } from '../data/types'

export interface ToastInput {
  message: string
  action?: { label: string; onClick: () => void }
  tone?: 'default' | 'error'
}

export const ToastContext = createContext<((t: ToastInput) => void) | null>(null)

export function useToast(): (t: ToastInput) => void {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}

// Deletes that can be undone from a toast (replaces window.confirm)
export function useDeleteWithUndo() {
  const { apply } = useData()
  const toast = useToast()

  const deleteTask = useCallback(
    (task: Task) => {
      apply({ type: 'deleteTask', id: task.id })
      toast({
        message: 'Task deleted',
        action: { label: 'Undo', onClick: () => apply({ type: 'upsertTask', task: touch(task) }) },
      })
    },
    [apply, toast],
  )

  const deleteProject = useCallback(
    (project: Project, tasks: Task[]) => {
      apply({ type: 'deleteProject', id: project.id })
      toast({
        message: 'Project deleted',
        action: {
          label: 'Undo',
          onClick: () => {
            apply({ type: 'upsertProject', project: touch(project) })
            tasks.forEach((t) => apply({ type: 'upsertTask', task: touch(t) }))
          },
        },
      })
    },
    [apply, toast],
  )

  return { deleteTask, deleteProject }
}
