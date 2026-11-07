import type { Job, Profile } from '../data/types'

const INSTRUCTIONS =
  'Tailor my CV and motivation letter to this job. Keep every fact true: reorder, select and rephrase, never invent experience, numbers or skills. CV: keep the same markdown structure and headings; lead the Profile with the job\'s core need; order bullets by relevance; keep it to 2 pages. Letter: fill every {{...}} placeholder; 250–350 words; name 2–3 concrete requirements from the posting and match each to evidence from the CV; same tone as the base letter. Return two markdown blocks: CV, then LETTER.'

// Self-contained prompt that can be pasted into any Claude chat
export function buildTailorPrompt(profile: Profile, job: Job): string {
  const meta = [
    `Company: ${job.company}`,
    `Role: ${job.role}`,
    job.location ? `Location: ${job.location}` : '',
    job.url ? `URL: ${job.url}` : '',
  ].filter(Boolean)
  return [
    INSTRUCTIONS,
    '## Job',
    meta.join('\n'),
    '## Job posting',
    job.posting.trim(),
    '## Base CV',
    profile.cvMd.trim() || '(empty)',
    '## Base letter',
    profile.letterMd.trim() || '(empty)',
  ].join('\n\n')
}
