import type { Project } from '../data/types'

export interface ProjectGroupBlock {
  key: string
  label: string
  projects: Project[]
}

// Claude tab: Cowork projects, Code repos, then anything without a group; empty groups are dropped
export function groupProjects(projects: Project[]): ProjectGroupBlock[] {
  const blocks: ProjectGroupBlock[] = [
    { key: 'cowork', label: 'Cowork', projects: projects.filter((p) => p.group === 'cowork') },
    { key: 'code', label: 'Code', projects: projects.filter((p) => p.group === 'code') },
    { key: 'other', label: 'Other', projects: projects.filter((p) => !p.group) },
  ]
  return blocks.filter((b) => b.projects.length > 0)
}
