import type { Project, Task } from '../data/types'
import { STATUS_LABEL } from '../theme'
import { compareTasks, formatEstimate } from '../ui'

const OPEN = ['queued', 'in-progress', 'blocked']

// Markdown of all open Claude tasks, most important first, ready to paste into a session
export function buildQueue(tasks: Task[], projects: Project[]): { text: string; count: number } {
  const names = new Map(projects.map((p) => [p.id, p.name]))
  const open = tasks.filter((t) => t.kind === 'claude' && OPEN.includes(t.status)).sort(compareTasks)
  const indent = (s: string) => s.trim().replace(/\n/g, '\n    ')
  const text = open
    .map((t) => {
      const lines = [
        `- [P${t.priority}] ${t.title} (${names.get(t.projectId) ?? '?'} · ${STATUS_LABEL[t.status] ?? t.status} · ${formatEstimate(t.estimateMin)}${t.kind === 'claude' && t.auto ? ' · auto' : ''})`,
      ]
      if (t.kind === 'claude') {
        lines.push(`  Brief: ${indent(t.brief)}`, `  Acceptance: ${indent(t.acceptance)}`)
      }
      lines.push(`  id: ${t.id}`)
      return lines.join('\n')
    })
    .join('\n')
  return { text, count: open.length }
}
