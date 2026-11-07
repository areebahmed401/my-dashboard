import { useState } from 'react'
import { ArrowLeft, Check, Clipboard, Download, ExternalLink, Sparkles, Trash2 } from 'lucide-react'
import Button from '../components/Button'
import Modal from '../components/Modal'
import Segmented from '../components/Segmented'
import { useDeleteWithUndo, useToast } from '../components/useToast'
import { newClaudeTask, newProject, touch } from '../data/make'
import { useData } from '../data/store'
import type { Job } from '../data/types'
import { localYmd } from '../due'
import { MUTED_TEXT } from '../theme'
import { draftFields, draftFrom, draftValid } from './draft'
import type { JobDraft } from './draft'
import JobFields from './JobFields'
import MarkdownEditor from './MarkdownEditor'
import { fileTitle, printDoc } from './pdf'
import { buildTailorPrompt } from './prompt'
import { fillPlaceholders } from './template'

type Doc = 'cv' | 'letter'

const changed = (job: Job, d: JobDraft) => JSON.stringify(draftFields(d)) !== JSON.stringify(draftFields(draftFrom(job)))

export default function JobDetail({ jobId, onClose }: { jobId: string; onClose: () => void }) {
  const { data, apply } = useData()
  const toast = useToast()
  const { deleteJob } = useDeleteWithUndo()
  const job = data?.jobs.find((j) => j.id === jobId)
  const [draft, setDraft] = useState<JobDraft>(() => draftFrom(job))
  const [doc, setDoc] = useState<Doc>('cv')

  if (!data || !job) return null
  const profile = data.profile
  const applied = job.status === 'applied'
  const dirty = changed(job, draft)
  const text = (d: Doc) => (d === 'cv' ? job.cvMd : job.letterMd) ?? ''
  const base = doc === 'cv' ? profile.cvMd : profile.letterMd
  const docEmpty = text(doc).trim() === ''
  const queued = job.tailor === 'requested'

  const save = (patch: Partial<Job>) => apply({ type: 'upsertJob', job: touch({ ...job, ...patch }) })
  const saveDetails = () => {
    if (dirty && draftValid(draft)) save(draftFields(draft))
  }
  // Unsaved detail edits are kept when the dialog closes
  const close = () => {
    saveDetails()
    onClose()
  }

  const toggleApplied = () =>
    applied ? save({ status: 'not-applied', appliedOn: undefined }) : save({ status: 'applied', appliedOn: localYmd() })

  const startFromBase = () => {
    const filled = fillPlaceholders(base, job)
    save(doc === 'cv' ? { cvMd: filled } : { letterMd: filled })
  }

  const tailor = () => {
    const existing = data.projects.find((p) => p.domain === 'claude' && p.name.toLowerCase() === 'job-search')
    const project = existing ?? newProject('claude', 'job-search')
    if (!existing) apply({ type: 'upsertProject', project })
    const task = newClaudeTask(project.id, {
      title: `Tailor CV + letter: ${job.role} @ ${job.company}`,
      status: 'queued',
      repo: 'my-dashboard-data',
      brief: `Run the tailor-application skill for job ${job.id}.\n${job.role} at ${job.company}${job.url ? ' – ' + job.url : ''}`,
      acceptance: 'job.cvMd and job.letterMd written, job.tailor = "done", this task marked done with a short result note.',
      priority: 1,
      estimateMin: 15,
    })
    apply({ type: 'upsertTask', task })
    save({ tailor: 'requested', tailorTaskId: task.id })
    toast({ message: 'Tailoring queued as a Claude task' })
  }

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(buildTailorPrompt(profile, job))
      toast({ message: 'Prompt copied' })
    } catch {
      toast({ message: 'Could not copy to the clipboard', tone: 'error' })
    }
  }

  return (
    <Modal
      open
      onClose={close}
      size="xl"
      title={job.company}
      description={job.role}
      footer={
        <>
          <Button
            variant="ghost"
            icon={Trash2}
            className="mr-auto"
            onClick={() => {
              deleteJob(job)
              onClose()
            }}
          >
            Delete
          </Button>
          {dirty && (
            <Button variant="primary" accent="job-search" disabled={!draftValid(draft)} onClick={saveDetails}>
              Save details
            </Button>
          )}
          <Button onClick={close}>Close</Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant={applied ? 'secondary' : 'primary'}
            accent="job-search"
            icon={applied ? ArrowLeft : Check}
            onClick={toggleApplied}
          >
            {applied ? 'Move back to not applied' : 'Mark applied'}
          </Button>
          {job.url && (
            <a
              href={job.url}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 text-sm font-medium text-neutral-700 underline-offset-2 hover:underline dark:text-neutral-300"
            >
              <ExternalLink className="size-3.5" aria-hidden />
              Open posting
            </a>
          )}
        </div>

        <JobFields draft={draft} onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))} withNotes postingRows={6} />

        <section className="space-y-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Segmented
              value={doc}
              onChange={setDoc}
              options={[
                { value: 'cv', label: 'CV' },
                { value: 'letter', label: 'Letter' },
              ]}
              label="Document"
              accent="job-search"
            />
            {docEmpty && (
              <Button size="sm" onClick={startFromBase} disabled={base.trim() === ''}>
                Start from base
              </Button>
            )}
          </div>
          {docEmpty && base.trim() === '' && (
            <p className={`text-xs ${MUTED_TEXT}`}>The base {doc === 'cv' ? 'CV' : 'letter'} is empty. Write it under Documents first.</p>
          )}
          <MarkdownEditor
            key={doc}
            label={doc === 'cv' ? 'Tailored CV' : 'Tailored letter'}
            value={text(doc)}
            onSave={(v) => save(doc === 'cv' ? { cvMd: v } : { letterMd: v })}
          />
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" accent="job-search" icon={Sparkles} disabled={queued} onClick={tailor}>
              {queued ? 'Tailoring queued' : 'Tailor with Claude'}
            </Button>
            <Button icon={Clipboard} onClick={copyPrompt}>
              Copy prompt
            </Button>
            <Button
              icon={Download}
              disabled={text('cv').trim() === ''}
              onClick={() => printDoc(text('cv'), fileTitle('CV', job.company))}
            >
              Download CV (PDF)
            </Button>
            <Button
              icon={Download}
              disabled={text('letter').trim() === ''}
              onClick={() => printDoc(text('letter'), fileTitle('Letter', job.company))}
            >
              Download letter (PDF)
            </Button>
          </div>
        </section>
      </div>
    </Modal>
  )
}
