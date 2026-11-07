import { useState } from 'react'
import TaskEditor from './TaskEditor'
import type { Domain, Project } from './data/types'
import { BUTTON, INPUT, MUTED } from './ui'

export default function AddTask({ domain, projects }: { domain: Domain; projects: Project[] }) {
  const [open, setOpen] = useState(false)
  const [projectId, setProjectId] = useState('')

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={BUTTON}>
        Add task
      </button>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="flex items-center gap-3">
        <span className={MUTED}>Create a project first</span>
        <button type="button" onClick={() => setOpen(false)} className={BUTTON}>
          Cancel
        </button>
      </div>
    )
  }

  const chosen = projects.find((p) => p.id === projectId) ?? projects[0]

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">
        Project
        <select
          value={chosen.id}
          onChange={(e) => setProjectId(e.target.value)}
          className={`${INPUT} mt-1 block`}
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <TaskEditor
        key={chosen.id}
        domain={domain}
        projectId={chosen.id}
        onDone={() => setOpen(false)}
      />
    </div>
  )
}
