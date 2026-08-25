import type { CherryNoteDashboardData } from '../components/CherryNoteDashboard'
import type { OutcomeDashboardData } from '../components/OutcomeDashboard'

type Session = { authenticated: boolean; publicReadOnly?: boolean }
export type PrivateAccessConfig = { enabled: boolean; access: 'private_read_only'; providers: Array<{ id: string; mode: string }>; sessionMaximumDays: number; completionAuthority: false }
export type PrivateGate = { id: string; title: string; closed: boolean }
export type PrivateStage = { id: string; title: string; gate?: { gates?: PrivateGate[] } }
export type PrivateScope = { id: string; title: string; stages: PrivateStage[] }
export type PrivatePhase = { id: string; title: string; scopes: PrivateScope[] }
export type PrivateProjectProjection = { project: { id: string; name: string }; phases: PrivatePhase[]; current: { phaseId: string; scopeId: string; stageId: string } }
export type PrivateWorkspaceView = { viewState?: string; projects?: PrivateProjectProjection[] }

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

export async function fetchOutcomeDashboard(): Promise<OutcomeDashboardData> {
  const body = await readJson<{ dashboard: OutcomeDashboardData }>(await fetch('/api/dashboard', { credentials: 'same-origin', headers: { accept: 'application/json' } }))
  return body.dashboard
}

export async function fetchPrivateAccessConfig(): Promise<PrivateAccessConfig> {
  return readJson<PrivateAccessConfig>(await fetch('/api/private/config', { credentials: 'same-origin', headers: { accept: 'application/json' } }))
}

export async function fetchPrivateWorkspace(): Promise<{ workspace: PrivateWorkspaceView }> {
  return readJson<{ workspace: PrivateWorkspaceView }>(await fetch('/api/private/workspace', { credentials: 'same-origin', headers: { accept: 'application/json' } }))
}

export async function beginPrivateSession(provider: 'google' | 'email_code'): Promise<void> {
  await readJson(await fetch('/api/private/auth/login', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ provider }) }))
}

export async function endPrivateSession(): Promise<void> {
  await readJson(await fetch('/api/private/auth/logout', { method: 'POST', credentials: 'same-origin' }))
}
