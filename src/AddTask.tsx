import { useState } from 'react'
import { Plus } from 'lucide-react'
import Button from './components/Button'
import TaskEditor from './TaskEditor'
import type { Domain, Project } from './data/types'
import { MUTED_TEXT } from './theme'
import { INPUT } from './ui'

interface Props {
  domain: Domain
  projects: Project[]
  selectedId?: string | null // project chip selected on the domain page
}

export default function AddTask({ domain, projects, selectedId }: Props) {
  const [open, setOpen] = useState(false)
  const [projectId, setProjectId] = useState('')

  if (!open) {
    return (
      <Button icon={Plus} accent={domain} onClick={() => setOpen(true)}>
        Add task
      </Button>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="flex items-center gap-3">
        <span className={`text-sm ${MUTED_TEXT}`}>Create a project first</span>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    )
  }

  const chosen =
    projects.find((p) => p.id === projectId) ?? projects.find((p) => p.id === selectedId) ?? projects[0]

  return (
    <div className="space-y-3">
      <label className={`block text-xs font-medium ${MUTED_TEXT}`}>
        Project
        <select
          value={chosen.id}
          onChange={(e) => setProjectId(e.target.value)}
          className={`${INPUT} mt-1.5 block w-full sm:max-w-xs`}
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <TaskEditor key={chosen.id} domain={domain} projectId={chosen.id} onDone={() => setOpen(false)} />
    </div>
  )
}
