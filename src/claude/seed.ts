import { newProject, touch } from '../data/make'
import type { Op } from '../data/ops'
import type { DashboardData, ProjectGroup } from '../data/types'

interface SeedProject {
  name: string
  group: ProjectGroup
  path: string
}

const cowork = (name: string): SeedProject => ({ name, group: 'cowork', path: `claude_cowork/${name}` })
const code = (name: string): SeedProject => ({ name, group: 'code', path: `C:\\dev\\${name}` })

// Claude tab projects: Cowork folders and Code repos
export const CLAUDE_PROJECTS: SeedProject[] = [
  cowork('uni'),
  cowork('job-search'),
  cowork('personal'),
  code('my-dashboard'),
  code('engineering-toolkit'),
  code('learning-german'),
  code('my-portfolio'),
  code('claude-plugins'),
]

// Idempotent: creates missing projects (matched by name, case-insensitive) and fills group/path on existing ones
export function ensureClaudeProjects(data: DashboardData, apply: (op: Op) => void): void {
  for (const seed of CLAUDE_PROJECTS) {
    const existing = data.projects.find((p) => p.domain === 'claude' && p.name.toLowerCase() === seed.name)
    if (!existing) {
      apply({ type: 'upsertProject', project: { ...newProject('claude', seed.name), group: seed.group, path: seed.path } })
    } else if (!existing.group || !existing.path) {
      apply({
        type: 'upsertProject',
        project: touch({ ...existing, group: existing.group ?? seed.group, path: existing.path ?? seed.path }),
      })
    }
  }
}
