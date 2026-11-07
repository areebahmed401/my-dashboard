import type { DashboardData, Job, Profile, Project, Task } from './types'

export type Op =
  | { type: 'upsertProject'; project: Project }
  | { type: 'deleteProject'; id: string }
  | { type: 'upsertTask'; task: Task }
  | { type: 'deleteTask'; id: string }
  | { type: 'upsertJob'; job: Job }
  | { type: 'deleteJob'; id: string }
  | { type: 'setProfile'; profile: Profile }

// Insert if missing; replace only when the incoming item is at least as new
function upsert<T extends { id: string; updatedAt: string }>(list: T[], item: T): T[] {
  const i = list.findIndex((x) => x.id === item.id)
  if (i < 0) return [...list, item]
  if (item.updatedAt < list[i].updatedAt) return list
  return list.map((x, j) => (j === i ? item : x))
}

export function applyOp(data: DashboardData, op: Op): DashboardData {
  switch (op.type) {
    case 'upsertProject':
      return { ...data, projects: upsert(data.projects, op.project) }
    case 'deleteProject':
      return {
        ...data,
        projects: data.projects.filter((p) => p.id !== op.id),
        tasks: data.tasks.filter((t) => t.projectId !== op.id),
      }
    case 'upsertTask':
      return { ...data, tasks: upsert(data.tasks, op.task) }
    case 'deleteTask':
      return { ...data, tasks: data.tasks.filter((t) => t.id !== op.id) }
    case 'upsertJob':
      return { ...data, jobs: upsert(data.jobs, op.job) }
    case 'deleteJob':
      return { ...data, jobs: data.jobs.filter((j) => j.id !== op.id) }
    case 'setProfile':
      return op.profile.updatedAt < data.profile.updatedAt ? data : { ...data, profile: op.profile }
  }
}

export function applyOps(data: DashboardData, ops: Op[]): DashboardData {
  return ops.reduce(applyOp, data)
}
