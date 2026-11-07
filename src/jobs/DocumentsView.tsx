import { Download } from 'lucide-react'
import Button from '../components/Button'
import { touch } from '../data/make'
import { useData } from '../data/store'
import { MUTED_TEXT, SURFACE } from '../theme'
import MarkdownEditor from './MarkdownEditor'
import { fileTitle, printDoc } from './pdf'

export default function DocumentsView() {
  const { data, apply } = useData()
  if (!data) return null
  const profile = data.profile

  const save = (patch: { cvMd: string } | { letterMd: string }) =>
    apply({ type: 'setProfile', profile: touch({ ...profile, ...patch }) })

  return (
    <div className="space-y-4">
      <p className={`text-sm ${MUTED_TEXT}`}>
        Placeholders like {'{{company}}'}, {'{{role}}'}, {'{{location}}'}, {'{{date}}'} are filled per job.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className={`${SURFACE} min-w-0 space-y-3 p-4`}>
          <MarkdownEditor
            label="Base CV"
            value={profile.cvMd}
            onSave={(cvMd) => save({ cvMd })}
            placeholder="# Your Name&#10;&#10;## Profile"
          />
          <Button
            icon={Download}
            size="sm"
            disabled={profile.cvMd.trim() === ''}
            onClick={() => printDoc(profile.cvMd, fileTitle('CV'))}
          >
            Download base CV (PDF)
          </Button>
        </section>
        <section className={`${SURFACE} min-w-0 space-y-3 p-4`}>
          <MarkdownEditor
            label="Base letter"
            value={profile.letterMd}
            onSave={(letterMd) => save({ letterMd })}
            placeholder="{{date}}&#10;&#10;Dear Hiring Team at {{company}},"
          />
        </section>
      </div>
    </div>
  )
}
