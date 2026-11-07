export type Domain = 'study' | 'job-search' | 'claude'

// 1 = urgent, 4 = someday
export type Priority = 1 | 2 | 3 | 4

// Claude projects mirror Claude Cowork folders and Claude Code repos
export type ProjectGroup = 'cowork' | 'code'

export interface Project {
  id: string
  domain: Domain
  name: string
  group?: ProjectGroup // claude domain: where the work runs
  path?: string // claude domain: Cowork folder or local repo path
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

export type JobStatus = 'not-applied' | 'applied'

export interface Job {
  id: string
  company: string
  role: string
  url?: string
  location?: string
  deadline?: string // YYYY-MM-DD
  posting: string // pasted job ad text
  status: JobStatus
  appliedOn?: string // YYYY-MM-DD
  cvMd?: string // tailored documents (markdown)
  letterMd?: string
  tailor?: 'requested' | 'done'
  tailorTaskId?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

// Base documents the tailored copies start from
export interface Profile {
  cvMd: string
  letterMd: string
  updatedAt: string
}

export const EMPTY_PROFILE_AT = '1970-01-01T00:00:00.000Z'

export function emptyProfile(): Profile {
  return { cvMd: '', letterMd: '', updatedAt: EMPTY_PROFILE_AT }
}

// Working window per weekday (0 = Sunday), null = day off; times are local HH:MM
export type WorkDay = { start: string; end: string } | null

export interface Settings {
  workHours: WorkDay[] // length 7
  updatedAt: string
}

export function defaultSettings(): Settings {
  const day = { start: '09:00', end: '17:00' }
  return { workHours: [null, day, day, day, day, day, null], updatedAt: EMPTY_PROFILE_AT }
}

export interface DashboardData {
  version: 2
  projects: Project[]
  tasks: Task[]
  jobs: Job[]
  profile: Profile
  settings: Settings
}

export function emptyData(): DashboardData {
  return { version: 2, projects: [], tasks: [], jobs: [], profile: emptyProfile(), settings: defaultSettings() }
}
