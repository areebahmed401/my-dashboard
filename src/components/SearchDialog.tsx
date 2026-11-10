import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import DueBadge from './DueBadge'
import Modal from './Modal'
import { useOpenTask } from './useTaskDialog'
import { useData } from '../data/store'
import type { Task } from '../data/types'
import { ACCENT, FOCUS_RING, MUTED_TEXT } from '../theme'
import { INPUT, compareTasks } from '../ui'

const MAX_ROWS = 20

interface SearchDialogProps {
  open: boolean
  onClose: () => void
}

export default function SearchDialog({ open, onClose }: SearchDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title="Search">
      <SearchForm onClose={onClose} />
    </Modal>
  )
}

function SearchForm({ onClose }: { onClose: () => void }) {
  const { data } = useData()
  const openTask = useOpenTask()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const list = useRef<HTMLUListElement>(null)

  const results = useMemo(() => {
    if (!data) return []
    const projects = new Map(data.projects.map((p) => [p.id, p]))
    const q = query.trim().toLowerCase()
    // compareTasks already puts open tasks before done ones
    return data.tasks
      .filter((t) => {
        if (!q) return t.status !== 'done'
        return t.title.toLowerCase().includes(q) || (projects.get(t.projectId)?.name.toLowerCase().includes(q) ?? false)
      })
      .sort(compareTasks)
      .slice(0, MAX_ROWS)
      .map((task) => ({ task, project: projects.get(task.projectId) }))
  }, [data, query])

  const current = Math.min(active, Math.max(results.length - 1, 0))

  useEffect(() => {
    list.current?.children[current]?.scrollIntoView({ block: 'nearest' })
  }, [current, results])

  const openResult = (task: Task) => {
    onClose()
    openTask(task.id)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (results.length === 0) return
      const step = e.key === 'ArrowDown' ? 1 : -1
      setActive((current + step + results.length) % results.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const hit = results[current]
      if (hit) openResult(hit.task)
    }
  }

  return (
    <div>
      <input
        autoFocus
        type="text"
        role="combobox"
        aria-expanded
        aria-controls="search-results"
        aria-label="Search tasks"
        aria-activedescendant={results.length > 0 ? `search-option-${current}` : undefined}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setActive(0)
        }}
        onKeyDown={onKeyDown}
        placeholder="Search tasks…"
        className={`${INPUT} w-full`}
      />
      {results.length === 0 ? (
        <p className={`mt-3 text-sm ${MUTED_TEXT}`}>No tasks match</p>
      ) : (
        <ul
          ref={list}
          id="search-results"
          role="listbox"
          aria-label="Results"
          className="mt-3 -mx-2 max-h-[60vh] overflow-y-auto"
        >
          {results.map(({ task, project }, i) => {
            const domain = project?.domain ?? 'home'
            const done = task.status === 'done'
            return (
              <li
                key={task.id}
                id={`search-option-${i}`}
                role="option"
                aria-selected={i === current}
                onClick={() => openResult(task)}
                onMouseMove={() => i !== current && setActive(i)}
                className={`flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 ${FOCUS_RING} ${
                  i === current ? 'bg-neutral-100 dark:bg-neutral-800' : ''
                }`}
              >
                <span className={`size-2 shrink-0 rounded-full ${ACCENT[domain].dot}`} aria-hidden />
                <div className="min-w-0 flex-1">
                  <div
                    className={`truncate text-sm font-medium ${
                      done ? `line-through ${MUTED_TEXT}` : 'text-neutral-900 dark:text-neutral-100'
                    }`}
                  >
                    {task.title}
                  </div>
                  <div className={`truncate text-xs ${MUTED_TEXT}`}>
                    {ACCENT[domain].label}
                    {project && ` · ${project.name}`}
                  </div>
                </div>
                <DueBadge due={task.due} done={done} accent={domain} className="shrink-0" />
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
