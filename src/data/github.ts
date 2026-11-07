import type { GithubConfig } from './config'
import { migrate } from './migrate'
import { emptyData } from './types'
import type { DashboardData } from './types'

export class ConflictError extends Error {}
export class AuthError extends Error {}
export class NotFoundError extends Error {}
export class OfflineError extends Error {}

function contentsUrl(cfg: GithubConfig): string {
  const e = encodeURIComponent
  return `https://api.github.com/repos/${e(cfg.owner)}/${e(cfg.repo)}/contents/data.json`
}

function headers(cfg: GithubConfig): Record<string, string> {
  return {
    Authorization: `Bearer ${cfg.token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

async function request(url: string, init: RequestInit): Promise<unknown> {
  let res: Response
  try {
    res = await fetch(url, { ...init, cache: 'no-store' })
  } catch (e) {
    if (e instanceof TypeError) throw new OfflineError('Network unreachable')
    throw e
  }
  if (res.ok) return res.json()
  let message = res.statusText
  try {
    const body = (await res.json()) as { message?: unknown }
    if (typeof body.message === 'string') message = body.message
  } catch {
    // keep statusText
  }
  if (res.status === 409 || (res.status === 422 && /sha/i.test(message))) {
    throw new ConflictError(message)
  }
  if (res.status === 401 || res.status === 403) {
    throw new AuthError('Token is invalid, expired or lacks access to the repo')
  }
  if (res.status === 404) {
    throw new NotFoundError('Repo or data.json not found; check owner, repo, branch and token access')
  }
  throw new Error(`GitHub ${res.status}: ${message}`)
}

function decodeBase64(b64: string): string {
  const bin = atob(b64.replace(/\s/g, ''))
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function encodeBase64(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(bin)
}

// Dev-only mock backend (token 'mock'); the import.meta.env.DEV guard strips it from production builds.
const MOCK_KEY = 'my-dashboard.mock-data'

function readMock(): { data: DashboardData; sha: string } {
  try {
    const raw = localStorage.getItem(MOCK_KEY)
    if (raw) {
      const p = JSON.parse(raw) as { data?: unknown; sha?: unknown }
      if (p.data && typeof p.sha === 'string') return { data: migrate(p.data), sha: p.sha }
    }
  } catch {
    // storage unavailable or corrupt: start empty
  }
  return { data: emptyData(), sha: '0' }
}

function mockFetch(): { data: DashboardData; sha: string } {
  return readMock()
}

function mockSave(data: DashboardData, sha: string): string {
  if (sha !== readMock().sha) throw new ConflictError('Mock sha mismatch')
  const next = String(Number(sha) + 1)
  try {
    localStorage.setItem(MOCK_KEY, JSON.stringify({ data, sha: next }))
  } catch {
    // storage unavailable: mock data lasts for this session only
  }
  return next
}

export async function fetchData(cfg: GithubConfig): Promise<{ data: DashboardData; sha: string }> {
  if (import.meta.env.DEV && cfg.token === 'mock') return mockFetch()
  const url = `${contentsUrl(cfg)}?ref=${encodeURIComponent(cfg.branch)}`
  const json = (await request(url, { headers: headers(cfg) })) as {
    content?: unknown
    sha?: unknown
  }
  if (typeof json.content !== 'string' || typeof json.sha !== 'string') {
    throw new Error('Unexpected response from GitHub')
  }
  return { data: migrate(JSON.parse(decodeBase64(json.content))), sha: json.sha }
}

export async function saveData(
  cfg: GithubConfig,
  data: DashboardData,
  sha: string,
  message: string,
): Promise<string> {
  if (import.meta.env.DEV && cfg.token === 'mock') return mockSave(data, sha)
  const content = encodeBase64(JSON.stringify(data, null, 2) + '\n')
  const json = (await request(contentsUrl(cfg), {
    method: 'PUT',
    headers: { ...headers(cfg), 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, content, sha, branch: cfg.branch }),
  })) as { content?: { sha?: unknown } }
  if (typeof json.content?.sha !== 'string') throw new Error('Unexpected response from GitHub')
  return json.content.sha
}
