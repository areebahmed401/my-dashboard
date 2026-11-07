import { MUTED_TEXT } from '../theme'
import { INPUT } from '../ui'
import type { JobDraft } from './draft'

const LABEL = `block text-xs font-medium ${MUTED_TEXT}`
const FIELD = `${INPUT} mt-1.5 block w-full`

interface Props {
  draft: JobDraft
  onChange: (patch: Partial<JobDraft>) => void
  withNotes?: boolean
  postingRows?: number
}

export default function JobFields({ draft, onChange, withNotes = false, postingRows = 8 }: Props) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={LABEL}>
          Company *
          <input
            autoFocus={!withNotes}
            value={draft.company}
            onChange={(e) => onChange({ company: e.target.value })}
            className={FIELD}
          />
        </label>
        <label className={LABEL}>
          Role *
          <input value={draft.role} onChange={(e) => onChange({ role: e.target.value })} className={FIELD} />
        </label>
      </div>
      <label className={LABEL}>
        URL
        <input
          type="url"
          value={draft.url}
          onChange={(e) => onChange({ url: e.target.value })}
          placeholder="https://…"
          className={FIELD}
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={LABEL}>
          Location
          <input value={draft.location} onChange={(e) => onChange({ location: e.target.value })} className={FIELD} />
        </label>
        <label className={LABEL}>
          Deadline
          <input type="date" value={draft.deadline} onChange={(e) => onChange({ deadline: e.target.value })} className={FIELD} />
        </label>
      </div>
      <label className={LABEL}>
        Job posting *
        <textarea
          rows={postingRows}
          value={draft.posting}
          onChange={(e) => onChange({ posting: e.target.value })}
          placeholder="Paste the job ad text"
          className={FIELD}
        />
      </label>
      {withNotes && (
        <label className={LABEL}>
          Notes
          <textarea rows={3} value={draft.notes} onChange={(e) => onChange({ notes: e.target.value })} className={FIELD} />
        </label>
      )}
    </div>
  )
}
