import type { Job } from '../data/types'

// "7 November 2026"
export function longDate(d: Date = new Date()): string {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Fills {{company}}, {{role}}, {{location}}, {{date}}; any other {{...}} stays as it is
export function fillPlaceholders(text: string, job: Pick<Job, 'company' | 'role' | 'location'>, date: Date = new Date()): string {
  const values: Record<string, string> = {
    company: job.company,
    role: job.role,
    location: job.location ?? '',
    date: longDate(date),
  }
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, key: string) => values[key.toLowerCase()] ?? m)
}
