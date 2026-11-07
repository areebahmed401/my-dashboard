export type Domain = 'study' | 'job-search' | 'claude'

// 1 = urgent, 4 = someday
export type Priority = 1 | 2 | 3 | 4

export interface Project {
  id: string
  domain: Domain
  name: string
  createdAt: string
  updatedAt: string
}

export interface BasicTask {
  kind: 'basic'
  id: string
  projectId: string
  title: string
  status: 'todo' | 'doing' | 'done'
  due?: string // YYYY-MM-DD
  notes?: string
  priority: Priority
  estimateMin: number
  createdAt: string
  updatedAt: string
}

export interface ClaudeTask {
  kind: 'claude'
  id: string
  projectId: string
  title: string
  status: 'queued' | 'in-progress' | 'done' | 'blocked'
  repo: string
  brief: string
  acceptance: string
  result?: string
  due?: string
  notes?: string
  priority: Priority
  estimateMin: number
  createdAt: string
  updatedAt: string
}

export type Task = BasicTask | ClaudeTask

export interface DashboardData {
  version: 2
  projects: Project[]
  tasks: Task[]
}

export function emptyData(): DashboardData {
  return { version: 2, projects: [], tasks: [] }
}
