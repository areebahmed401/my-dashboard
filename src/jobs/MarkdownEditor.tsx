import { useEffect, useMemo, useRef, useState } from 'react'
import Segmented from '../components/Segmented'
import { MUTED_TEXT } from '../theme'
import { INPUT } from '../ui'
import { toHtml } from './markdown'

type Mode = 'edit' | 'preview'

interface Props {
  value: string
  onSave: (value: string) => void
  label: string
  placeholder?: string
  rows?: number
}

const SAVE_DELAY_MS = 1000

// Markdown textarea with an Edit / Preview toggle. Saves on blur, after a short pause, and on unmount.
// An outside change to `value` (e.g. "Start from base") is picked up unless there are unsaved keystrokes.
export default function MarkdownEditor({ value, onSave, label, placeholder, rows = 18 }: Props) {
  const [mode, setMode] = useState<Mode>('edit')
  const [text, setText] = useState(value)
  const [dirty, setDirty] = useState(false)
  const [seen, setSeen] = useState(value)
  if (value !== seen) {
    setSeen(value)
    if (!dirty) setText(value)
  }

  const live = useRef({ text, dirty, onSave })
  useEffect(() => {
    live.current = { text, dirty, onSave }
  })

  const flush = () => {
    const l = live.current
    if (!l.dirty) return
    l.onSave(l.text)
    setDirty(false)
  }

  useEffect(() => {
    if (!dirty) return
    const id = window.setTimeout(() => {
      live.current.onSave(live.current.text)
      setDirty(false)
    }, SAVE_DELAY_MS)
    return () => window.clearTimeout(id)
  }, [text, dirty])

  useEffect(
    () => () => {
      const l = live.current
      if (l.dirty) l.onSave(l.text)
    },
    [],
  )

  const html = useMemo(() => (mode === 'preview' ? toHtml(text) : ''), [mode, text])

  return (
    <div className="min-w-0">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className={`text-xs font-medium ${MUTED_TEXT}`}>
          {label}
          {dirty && <span className="ml-2 font-normal">Unsaved…</span>}
        </span>
        <Segmented
          value={mode}
          onChange={(m) => {
            flush()
            setMode(m)
          }}
          options={[
            { value: 'edit', label: 'Edit' },
            { value: 'preview', label: 'Preview' },
          ]}
          label={`${label} mode`}
          accent="job-search"
          size="sm"
        />
      </div>
      {mode === 'edit' ? (
        <textarea
          value={text}
          rows={rows}
          spellCheck
          aria-label={label}
          placeholder={placeholder}
          onChange={(e) => {
            setText(e.target.value)
            setDirty(true)
          }}
          onBlur={flush}
          className={`${INPUT} block w-full resize-y font-mono text-[13px] leading-relaxed`}
        />
      ) : text.trim() === '' ? (
        <p className={`rounded-lg border border-dashed border-neutral-200 p-4 text-sm dark:border-neutral-800 ${MUTED_TEXT}`}>
          Nothing to preview yet.
        </p>
      ) : (
        <div
          className="doc-prose max-h-[32rem] overflow-y-auto rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
    </div>
  )
}
