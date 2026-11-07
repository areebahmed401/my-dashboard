import type { DashboardData, Priority } from './types'

export const DEFAULT_PRIORITY: Priority = 3
export const DEFAULT_ESTIMATE_MIN = 60

// Accepts data.json v1 or v2 and returns v2. v1 -> v2 drops the retired German domain
// and gives every task the default priority and estimate.
export function migrate(raw: unknown): DashboardData {
  const d = raw as { version?: unknown; projects?: unknown; tasks?: unknown } | null
  if (!d || typeof d !== 'object' || !Array.isArray(d.projects) || !Array.isArray(d.tasks)) {
    throw new Error('data.json has an unexpected format')
  }
  if (d.version === 2) return d as DashboardData
  if (d.version !== 1) throw new Error('data.json has an unexpected format')

  type V1Project = Omit<DashboardData['projects'][number], 'domain'> & { domain: string }
  const projects = (d.projects as V1Project[]).filter((p) => p.domain !== 'german')
  const kept = new Set(projects.map((p) => p.id))
  const tasks = (d.tasks as DashboardData['tasks']).filter((t) => kept.has(t.projectId)).map((t) => ({
    ...t,
    priority: DEFAULT_PRIORITY,
    estimateMin: DEFAULT_ESTIMATE_MIN,
  }))
  return { version: 2, projects: projects as DashboardData['projects'], tasks }
}
