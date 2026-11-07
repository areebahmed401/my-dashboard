export interface GithubConfig {
  owner: string
  repo: string
  branch: string
  token: string
}

const KEY = 'my-dashboard.github'

const DEFAULTS: GithubConfig = {
  owner: 'areebahmed401',
  repo: 'my-dashboard-data',
  branch: 'main',
  token: '',
}

export function loadConfig(): GithubConfig {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULTS }
    const p = JSON.parse(raw) as Partial<Record<keyof GithubConfig, unknown>>
    const pick = (k: keyof GithubConfig) =>
      typeof p[k] === 'string' ? (p[k] as string) : DEFAULTS[k]
    return { owner: pick('owner'), repo: pick('repo'), branch: pick('branch'), token: pick('token') }
  } catch {
    return { ...DEFAULTS }
  }
}

export function saveConfig(cfg: GithubConfig): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(cfg))
  } catch {
    // storage unavailable: config lasts for this session only
  }
}

export function clearToken(): void {
  saveConfig({ ...loadConfig(), token: '' })
}

export function isConfigured(cfg: GithubConfig): boolean {
  return cfg.token.length > 0
}
