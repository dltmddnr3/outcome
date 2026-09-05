import type { CherryNoteDashboardData } from '../components/CherryNoteDashboard'
import type { OutcomeDashboardData } from '../components/OutcomeDashboard'

type Session = { authenticated: boolean; publicReadOnly?: boolean }
export type PrivateAccessConfig = { enabled: boolean; access: 'private_read_only'; providers: Array<{ id: string; mode: string }>; sessionMaximumDays: number; completionAuthority: false; publishableKey?: string }
export type PrivateGate = { id: string; title: string; closed: boolean }
export type PrivateStage = { id: string; title: string; gate?: { gates?: PrivateGate[] } }
export type PrivateScope = { id: string; title: string; stages: PrivateStage[] }
export type PrivatePhase = { id: string; title: string; scopes: PrivateScope[] }
export type PrivateModelV2State = 'loading' | 'stale' | 'conflict' | 'blocked' | 'delivery_unknown' | 'no_active_work' | 'ready'
export type PrivateModelV2Event = { id: string; sequence: number; role: 'planner' | 'builder' | 'ux_product_qa' | 'release_audit'; type: 'work_observed' | 'result_observed' | 'boundary_observed'; summary: string; observedAt: string; status: 'observed' | 'active' | 'blocked' | 'delivery_unknown' | 'failed' | 'rejected' | 'safe_hold'; completionAuthority: false }
export type PrivateModelV2Projection = { schemaVersion: 1; modelVersion: 2; project: { id: string; label: string }; destination: { id: string; label: string } | null; remainingAcceptanceGap: { remaining: number; total: number }; now: { observedAt: string; state: PrivateModelV2State }; readyBoundaryLabels: string[]; nextActionLabel: string | null; cherryActionLabel: string | null; state: PrivateModelV2State; events: PrivateModelV2Event[] }
export type PrivateProjectProjection = { project: { id: string; name: string }; phases: PrivatePhase[]; current: { phaseId: string; scopeId: string; stageId: string }; modelV2?: PrivateModelV2Projection }
export type PrivateWorkspaceView = { viewState?: string; projects?: PrivateProjectProjection[]; dashboard?: OutcomeDashboardData }
export type PrivateDecisionReason = 'evidence_insufficient' | 'scope_not_authorized' | 'superseded_by_newer_observation' | 'defer_pending_external_input'
export type PrivateDecisionReceipt = { decisionState: 'recorded'; decisionId: string; decision: 'approved' | 'rejected'; rejectionReason: PrivateDecisionReason | null; decidedAt: string; decisionActorClass: 'owner'; notice: '기록됨 · 전달은 이 범위 밖'; supersedesId: string | null; completionAuthority: false }
export type PrivateChatEvent = { event_id: string; sequence: number; observed_at: string; kind: 'user_message'; state: 'queued'; correlation_id: string; payload: { private_content: { text: string } }; delivery: PrivateChatSubmit['delivery']; dispatch_state: PrivateChatSubmit['dispatch_state'] }
export type PrivateChatTimeline = { target: { role: 'planner'; binding_version: number }; events: PrivateChatEvent[]; completion_authority: false; csrf: string }
export type PrivateChatSubmit = { accepted: true; sequence: number; event_id: string; dispatch_state: 'not_invoked' | 'dispatch_intent_recorded' | 'invoked'; delivery: 'acknowledged' | 'delivery_unknown' | 'rejected' | 'failed'; execution_started: false; result_attached: false; evidence_attached: false }

let privateDecisionBinding: { etag: string; csrf: string; bearer?: string } | null = null

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

export async function fetchPrivateWorkspace(sessionToken?: string): Promise<{ workspace: PrivateWorkspaceView }> {
  const response = await fetch('/api/private/workspace', { credentials: 'same-origin', headers: privateSessionHeaders(sessionToken) })
  const value = await readJson<{ workspace: PrivateWorkspaceView }>(response)
  const etag = response.headers.get('etag') ?? ''
  const csrf = response.headers.get('x-outcome-csrf') ?? ''
  privateDecisionBinding = etag && csrf ? { etag, csrf, ...(sessionToken ? { bearer: sessionToken } : {}) } : null
  return value
}

const privateSessionHeaders = (sessionToken?: string) => ({ accept: 'application/json', ...(sessionToken && /^[A-Za-z0-9._~-]+$/.test(sessionToken) ? { authorization: `Bearer ${sessionToken}` } : {}) })

export async function fetchPrivateChatTimeline(projectId: string, afterSequence = 0, sessionToken?: string): Promise<PrivateChatTimeline> {
  return readJson<PrivateChatTimeline>(await fetch(`/api/private/chat/timeline?project_id=${encodeURIComponent(projectId)}&after_sequence=${afterSequence}`, { credentials: 'same-origin', headers: privateSessionHeaders(sessionToken) }))
}

export async function submitPrivatePlannerMessage(projectId: string, message: string, csrf: string, idempotencyKey: string, sessionToken?: string): Promise<PrivateChatSubmit> {
  return readJson<PrivateChatSubmit>(await fetch('/api/private/chat/messages', { method: 'POST', credentials: 'same-origin', headers: { ...privateSessionHeaders(sessionToken), 'content-type': 'application/json', 'x-outcome-csrf': csrf, 'idempotency-key': idempotencyKey }, body: JSON.stringify({ project_id: projectId, message }) }))
}

export async function fetchPrivateOwnerSession(sessionToken?: string): Promise<{ authenticated: true; owner: true }> {
  return readJson<{ authenticated: true; owner: true }>(await fetch('/api/private/session', { credentials: 'same-origin', headers: privateSessionHeaders(sessionToken) }))
}

export async function beginPrivateSession(provider: 'google' | 'email_code', navigate: (url: string) => void = (url) => window.location.assign(url)): Promise<{ state: string; mode: string; redirectUrl?: string }> {
  const transition = await readJson<{ state: string; mode: string; redirectUrl?: string }>(await fetch('/api/private/auth/login', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ provider }) }))
  if (transition.redirectUrl) navigate(transition.redirectUrl)
  return transition
}

export async function endPrivateSession(): Promise<void> {
  await readJson(await fetch('/api/private/auth/logout', { method: 'POST', credentials: 'same-origin' }))
  privateDecisionBinding = null
}

const decisionNonce = () => Array.from(crypto.getRandomValues(new Uint8Array(24)), (value) => value.toString(16).padStart(2, '0')).join('')

export async function recordPrivateDecision(input: { projectId: string; eventId: string; sequence: number; decision: 'approved' | 'rejected'; rejectionReason?: PrivateDecisionReason | null }): Promise<PrivateDecisionReceipt> {
  const binding = privateDecisionBinding
  if (!binding) throw new Error('decision_store_unavailable')
  return readJson<PrivateDecisionReceipt>(await fetch('/api/private/decisions', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { ...privateSessionHeaders(binding.bearer), 'content-type': 'application/json', 'x-outcome-csrf': binding.csrf, 'if-match': binding.etag },
    body: JSON.stringify({ projectId: input.projectId, eventId: input.eventId, sequence: input.sequence, decision: input.decision, rejectionReason: input.decision === 'rejected' ? input.rejectionReason ?? null : null, nonce: decisionNonce() }),
  }))
}
