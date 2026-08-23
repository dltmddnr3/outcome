import type { CherryNoteDashboardData } from '../components/CherryNoteDashboard'

type Session = { authenticated: boolean; publicReadOnly?: boolean }

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json() as T & { error?: string }
  if (!response.ok) throw new Error(body.error ?? '요청을 처리하지 못했습니다.')
  return body
}

export async function fetchSession(): Promise<Session> {
  return readJson<Session>(await fetch('/api/auth/session', { credentials: 'same-origin' }))
}

export async function login(password: string): Promise<void> {
  await readJson(await fetch('/api/auth/login', {
    method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password }),
  }))
}

export async function logout(): Promise<void> {
  await readJson(await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }))
}

export async function fetchCherryNoteDashboard(): Promise<CherryNoteDashboardData> {
  const body = await readJson<{ dashboard: CherryNoteDashboardData }>(await fetch('/api/dashboard/cherry-note', {
    credentials: 'same-origin', headers: { accept: 'application/json' },
  }))
  return body.dashboard
}
