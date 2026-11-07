import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { FolderPlus } from 'lucide-react'
import Button from './Button'
import EmptyState from './EmptyState'
import Modal from './Modal'
import { useToast } from './useToast'
import { newBasicTask, newClaudeTask } from '../data/make'
import { useData } from '../data/store'
import type { Domain, Project } from '../data/types'
import { ACCENT, DOMAINS } from '../theme'
import { INPUT } from '../ui'

const LAST_KEY = 'my-dashboard.quickadd.project'

function readLast(): string {
  try {
    return localStorage.getItem(LAST_KEY) ?? ''
  } catch {
    return ''
  }
}

function writeLast(id: string) {
  try {
    localStorage.setItem(LAST_KEY, id)
  } catch {
    // storage unavailable
  }
}

// Current domain's newest project, else the last one used, else the first
function defaultProject(projects: Project[], domain?: Domain): string {
  if (domain) {
    const newest = projects
      .filter((p) => p.domain === domain)
      .reduce<Project | null>((a, p) => (!a || p.createdAt > a.createdAt ? p : a), null)
    if (newest) return newest.id
  }
  const last = readLast()
  if (projects.some((p) => p.id === last)) return last
  return projects[0]?.id ?? ''
}

interface QuickAddProps {
  open: boolean
  onClose: () => void
  domain?: Domain
}

export default function QuickAdd({ open, onClose, domain }: QuickAddProps) {
  return (
    <Modal open={open} onClose={onClose} title="Quick add" description="Add a task to any project.">
      <QuickAddForm onClose={onClose} domain={domain} />
    </Modal>
  )
}

const LABEL = 'mb-1.5 block text-xs font-medium text-neutral-600 dark:text-neutral-400'

function QuickAddForm({ onClose, domain }: { onClose: () => void; domain?: Domain }) {
  const { data, apply } = useData()
  const toast = useToast()
  // On a domain tab only that domain's projects are offered; on Home, all of them
  const projects = useMemo(
    () => (data?.projects ?? []).filter((p) => !domain || p.domain === domain),
    [data, domain],
  )
  const [picked, setProjectId] = useState(() => defaultProject(projects, domain))
  const [title, setTitle] = useState('')
  const [due, setDue] = useState('')
  const [repo, setRepo] = useState('')

  // Falls back when data arrives (or the project disappears) while open
  const projectId = projects.some((p) => p.id === picked) ? picked : defaultProject(projects, domain)
  const project = projects.find((p) => p.id === projectId)

  if (!data || projects.length === 0) {
    return (
      <EmptyState
        icon={FolderPlus}
        title={data ? 'Create a project first' : 'Connect your data first'}
        description={
          data ? (
            <span className="flex flex-wrap justify-center gap-x-3 gap-y-1">
              {DOMAINS.map((d) => (
                <a key={d} href={`#${d}`} onClick={onClose} className={`font-medium hover:underline ${ACCENT[d].text}`}>
                  {ACCENT[d].label}
                </a>
              ))}
            </span>
          ) : (
            <a href="#settings" onClick={onClose} className="font-medium underline">
              Open Settings
            </a>
          )
        }
      />
    )
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const t = title.trim()
    if (!t || !project) return
    const task =
      project.domain === 'claude'
        ? newClaudeTask(project.id, {
            title: t,
            status: 'queued',
            repo: repo.trim(),
            brief: '',
            acceptance: '',
            due: due || undefined,
          })
        : newBasicTask(project.id, { title: t, status: 'todo', due: due || undefined })
    apply({ type: 'upsertTask', task })
    writeLast(project.id)
    toast({ message: `Added to ${project.name}` })
    onClose()
  }

  const accent = project?.domain ?? 'home'

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="qa-title" className={LABEL}>
          Title
        </label>
        <input
          id="qa-title"
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs doing?"
          className={`${INPUT} w-full`}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <div className="min-w-0">
          <label htmlFor="qa-project" className={LABEL}>
            Project
          </label>
          <select
            id="qa-project"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className={`${INPUT} w-full`}
          >
            {(domain ? [domain] : DOMAINS).map((d) => {
              const list = projects.filter((p) => p.domain === d)
              if (list.length === 0) return null
              return (
                <optgroup key={d} label={ACCENT[d].label}>
                  {list.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
              )
            })}
          </select>
        </div>
        <div>
          <label htmlFor="qa-due" className={LABEL}>
            Due
          </label>
          <input
            id="qa-due"
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className={`${INPUT} w-full`}
          />
        </div>
      </div>
      {project?.domain === 'claude' && (
        <div>
          <label htmlFor="qa-repo" className={LABEL}>
            Repo
          </label>
          <input
            id="qa-repo"
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            placeholder="owner/repo"
            className={`${INPUT} w-full`}
          />
        </div>
      )}
      <div className="flex items-center justify-between gap-2 pt-1">
        <span className="hidden text-xs text-neutral-400 sm:inline dark:text-neutral-500">
          <kbd className="font-sans">Enter</kbd> to add · <kbd className="font-sans">Esc</kbd> to close
        </span>
        <div className="ml-auto flex gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" accent={accent} disabled={!title.trim()}>
            Add task
          </Button>
        </div>
      </div>
    </form>
  )
}
