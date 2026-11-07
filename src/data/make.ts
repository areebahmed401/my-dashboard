import type { BasicTask, ClaudeTask, Domain, Project } from './types'

export function now(): string {
  return new Date().toISOString()
}

export function newProject(domain: Domain, name: string): Project {
  const t = now()
  return { id: crypto.randomUUID(), domain, name, createdAt: t, updatedAt: t }
}

export type BasicTaskFields = Pick<BasicTask, 'title' | 'status' | 'due' | 'notes'>
export type ClaudeTaskFields = Omit<ClaudeTask, 'kind' | 'id' | 'projectId' | 'createdAt' | 'updatedAt'>

export function newBasicTask(projectId: string, fields: BasicTaskFields): BasicTask {
  const t = now()
  return { ...fields, kind: 'basic', id: crypto.randomUUID(), projectId, createdAt: t, updatedAt: t }
}

export function newClaudeTask(projectId: string, fields: ClaudeTaskFields): ClaudeTask {
  const t = now()
  return { ...fields, kind: 'claude', id: crypto.randomUUID(), projectId, createdAt: t, updatedAt: t }
}

// Copy with a fresh updatedAt; every edit sent as an upsert must go through this
export function touch<T extends { updatedAt: string }>(item: T): T {
  return { ...item, updatedAt: now() }
}
