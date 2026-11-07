import type { Job } from '../data/types'

export interface JobDraft {
  company: string
  role: string
  url: string
  location: string
  deadline: string
  posting: string
  notes: string
}

export function draftFrom(job?: Job): JobDraft {
  return {
    company: job?.company ?? '',
    role: job?.role ?? '',
    url: job?.url ?? '',
    location: job?.location ?? '',
    deadline: job?.deadline ?? '',
    posting: job?.posting ?? '',
    notes: job?.notes ?? '',
  }
}

export const draftValid = (d: JobDraft) => d.company.trim() !== '' && d.role.trim() !== '' && d.posting.trim() !== ''

// Trimmed values, empty optionals as undefined
export function draftFields(d: JobDraft) {
  const opt = (s: string) => (s.trim() === '' ? undefined : s.trim())
  return {
    company: d.company.trim(),
    role: d.role.trim(),
    url: opt(d.url),
    location: opt(d.location),
    deadline: d.deadline || undefined,
    posting: d.posting,
    notes: d.notes.trim() === '' ? undefined : d.notes,
  }
}
