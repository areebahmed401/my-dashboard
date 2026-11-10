import { createContext, useContext } from 'react'

export const TaskDialogContext = createContext<((taskId: string) => void) | null>(null)

// Opens the task editor dialog for any task id, from anywhere inside TaskDialogProvider
export function useOpenTask(): (taskId: string) => void {
  const ctx = useContext(TaskDialogContext)
  if (!ctx) throw new Error('useOpenTask must be used inside TaskDialogProvider')
  return ctx
}
