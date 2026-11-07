export type Domain = 'study' | 'job-search' | 'german' | 'claude'

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
  createdAt: string
  updatedAt: string
}

export type Task = BasicTask | ClaudeTask

export interface DashboardData {
  version: 1
  projects: Project[]
  tasks: Task[]
}

export function emptyData(): DashboardData {
  return { version: 1, projects: [], tasks: [] }
}
