import type { CherryNoteDashboardData } from '../components/CherryNoteDashboard'
import type { OutcomeDashboardData } from '../components/OutcomeDashboard'
import {destinationQuestions} from './destination-discovery'
import {destinationSourceSha256,validateDestinationAnalysis,type DestinationProposal} from './destination-analysis'

type Session = { authenticated: boolean; publicReadOnly?: boolean }
export type PrivateAccessConfig = { enabled: boolean; access: 'private_read_only'; providers: Array<{ id: string; mode: string }>; sessionMaximumDays: number; completionAuthority: false; publishableKey?: string }
export type PrivateGate = { id: string; title: string; closed: boolean }
export type PrivateStage = { id: string; title: string; gate?: { gates?: PrivateGate[] } }
export type PrivateScope = { id: string; title: string; stages: PrivateStage[] }
export type PrivatePhase = { id: string; title: string; scopes: PrivateScope[] }
export type PrivateModelV2State = 'loading' | 'stale' | 'conflict' | 'blocked' | 'delivery_unknown' | 'no_active_work' | 'ready'
export type PrivateModelV2Event = { id: string; sequence: number; role: 'planner' | 'builder' | 'ux_product_qa' | 'release_audit'; type: 'work_observed' | 'result_observed' | 'boundary_observed'; summary: string; observedAt: string; status: 'observed' | 'active' | 'blocked' | 'delivery_unknown' | 'failed' | 'rejected' | 'safe_hold'; completionAuthority: false }
export type PrivateExecutionLoopFact = { state: 'known' | 'missing' | 'unknown' | 'safe_hold' | 'not_applicable'; value: string | null; sourceRef: string | null; reasonCode: string | null }
export type PrivateExecutionLoopItem = { itemId: string; state: 'ready' | 'safe_hold'; checked: PrivateExecutionLoopFact; missing: PrivateExecutionLoopFact; ownerInstruction: PrivateExecutionLoopFact; receiptState: PrivateExecutionLoopFact; nextCheckpoint: PrivateExecutionLoopFact; reviewResult: PrivateExecutionLoopFact; reworkState: PrivateExecutionLoopFact; cherryBoundary: PrivateExecutionLoopFact | null; completionAuthority: false }
export type PrivateModelV2Projection = { schemaVersion: 1; modelVersion: 2; project: { id: string; label: string }; destination: { id: string; label: string } | null; remainingAcceptanceGap: { remaining: number; total: number }; now: { observedAt: string; state: PrivateModelV2State }; readyBoundaryLabels: string[]; nextActionLabel: string | null; cherryActionLabel: string | null; state: PrivateModelV2State; events: PrivateModelV2Event[]; executionLoopItems?: PrivateExecutionLoopItem[] }
export type PrivateProjectProjection = { project: { id: string; name: string }; phases: PrivatePhase[]; current: { phaseId: string; scopeId: string; stageId: string }; modelV2?: PrivateModelV2Projection }
export type PrivateWorkspaceView = { viewState?: string; projects?: PrivateProjectProjection[]; dashboard?: OutcomeDashboardData }
export type PrivateDecisionReason = 'evidence_insufficient' | 'scope_not_authorized' | 'superseded_by_newer_observation' | 'defer_pending_external_input'
export type PrivateDecisionReceipt = { decisionState: 'recorded'; decisionId: string; decision: 'approved' | 'rejected'; rejectionReason: PrivateDecisionReason | null; decidedAt: string; decisionActorClass: 'owner'; notice: '기록됨 · 전달은 이 범위 밖'; supersedesId: string | null; completionAuthority: false }
type PrivateChatEventBase = { event_id: string; sequence: number; observed_at: string; correlation_id: string }
export type PrivateChatEvent = PrivateChatEventBase & (
  { kind: 'user_message'; state: 'queued'; payload: { private_content: { text: string } }; delivery: PrivateChatSubmit['delivery']; dispatch_state: PrivateChatSubmit['dispatch_state'] }
  | { kind: 'assistant_message' | 'commentary' | 'plan' | 'tool_call' | 'tool_result' | 'file_change' | 'diff' | 'test_result' | 'approval_request' | 'waiting_user' | 'error' | 'connection'; state: 'queued' | 'responding' | 'tool_running' | 'verifying' | 'waiting_approval' | 'waiting_user' | 'completed' | 'failed' | 'cancelled' | 'reconnecting'; payload: { private_content?: { text: string } } }
)
export type PrivateChatTimeline = { target: { role: 'planner'; binding_version: number }; events: PrivateChatEvent[]; completion_authority: false; csrf: string }
export type PrivateChatSubmit = { accepted: true; sequence: number; event_id: string; dispatch_state: 'not_invoked' | 'dispatch_intent_recorded' | 'invoked'; delivery: 'acknowledged' | 'delivery_unknown' | 'rejected' | 'failed'; execution_started: false; result_attached: false; evidence_attached: false }

let privateDecisionBinding: { etag: string; csrf: string; bearer?: string } | null = null
let privateDecisionBindingVersion = 0
let privateDestinationBinding: { csrf: string; bearer?: string } | null = null
export const privateDestinationStorageAvailable = () => privateDestinationBinding !== null
export const activeDestinationDraftId = '00000000-0000-4000-8000-000000000001'
export type DestinationDraftDocument = { schemaVersion: 1; mode: 'guided_200q' | 'brief_gap'; source: string; answers: import('./destination-discovery').DestinationAnswers; unknowns: string[] }
export type StoredDestinationDraft = { draftId: string; revision: number; document: DestinationDraftDocument; state: 'draft'; completionAuthority: false }
export type DestinationAnalysisView = {requestId:string;state:'queued'|'dispatch_started'|'completed'|'failed'|'delivery_unknown';proposals:DestinationProposal[];conflicts:string[]}
export async function destinationDraftDigest(doc:DestinationDraftDocument) {
 const answers=Object.fromEntries(destinationQuestions.filter(q=>Object.hasOwn(doc.answers,q.id)).map(q=>[q.id,doc.answers[q.id]]))
 const bytes=new TextEncoder().encode(JSON.stringify({schemaVersion:1,mode:doc.mode,source:doc.source,answers,unknowns:doc.unknowns}))
 if(bytes.length>131072)throw Error('destination_invalid')
 return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('')
}
export async function requestDestinationAnalysis(draft:StoredDestinationDraft,requestId:string,submit=false):Promise<DestinationAnalysisView|null> {
 if(!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(requestId))throw Error('destination_invalid')
 const binding=privateDestinationBinding,generation=privateDecisionBindingVersion
 if(!binding)throw Error('destination_unavailable')
 const documentDigest=await destinationDraftDigest(draft.document)
 if(binding!==privateDestinationBinding||generation!==privateDecisionBindingVersion)throw Error('destination_identity_changed')
 const response=await fetch(`/api/private/destination/analysis/${requestId}`,{method:submit?'POST':'GET',credentials:'same-origin',headers:{...privateSessionHeaders(binding.bearer),...(submit?{'content-type':'application/json','x-outcome-csrf':binding.csrf}:{})},...(submit?{body:JSON.stringify({draftId:draft.draftId,draftRevision:draft.revision,documentDigest})}:{})})
 const body=await readJson<{analysis:Record<string,unknown>|null;completionAuthority:false}>(response)
 if(binding!==privateDestinationBinding||generation!==privateDecisionBindingVersion)throw Error('destination_identity_changed')
 if(!body||body.completionAuthority!==false)throw Error('destination_response_invalid')
 const row=body.analysis
 if(row===null&&!submit)return null
 if(!row||row.requestId!==requestId||row.draftId!==draft.draftId||row.draftRevision!==draft.revision||row.documentDigest!==documentDigest||row.completionAuthority!==false||!['queued','dispatch_started','completed','failed','delivery_unknown'].includes(String(row.state)))throw Error('destination_response_invalid')
 const state=row.state as DestinationAnalysisView['state']
 if(state!=='completed') {
  if(row.result!==null)throw Error('destination_response_invalid')
  return {requestId,state,proposals:[],conflicts:[]}
 }
 const result=row.result as Record<string,unknown>
 if(!result||result.schemaVersion!==1||result.documentDigest!==documentDigest||result.draftRevision!==draft.revision||result.completionAuthority!==false||result.semanticVerification!=='owner_review_required'||!Array.isArray(result.proposals))throw Error('destination_response_invalid')
 const proposals=result.proposals.map(p=>{
  if(!p||p.status!=='needs_confirmation'||Object.keys(p).sort().join(',')!=='endLine,field,quote,startLine,status,value')throw Error('destination_response_invalid')
  const {status:_,...value}=p;return value
 })
 const verified=await validateDestinationAnalysis(draft.document.source,JSON.stringify({schemaVersion:1,sourceSha256:await destinationSourceSha256(draft.document.source),proposals}))
 if(binding!==privateDestinationBinding||generation!==privateDecisionBindingVersion)throw Error('destination_identity_changed')
 return {requestId,state,proposals:verified.proposals,conflicts:verified.conflicts}
}

export function validateStoredDestinationDraft(value: unknown): StoredDestinationDraft | null {
  const object = (v: unknown, keys: string[]): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === keys.length && keys.every(k => Object.hasOwn(v, k))
  if (!object(value, ['draft', 'completionAuthority']) || value.completionAuthority !== false) throw new Error('destination_response_invalid')
  if (value.draft === null) return null
  const row = value.draft
  if (!object(row, ['draftId','revision','document','state','completionAuthority']) || row.draftId !== activeDestinationDraftId || !Number.isSafeInteger(row.revision) || Number(row.revision) < 1 || row.state !== 'draft' || row.completionAuthority !== false) throw new Error('destination_response_invalid')
  const doc = row.document
  const fields = ['problem','targetUser','outcome','scope','nonGoals','constraints','acceptance','failureRecovery']
  if (!object(doc, ['schemaVersion','mode','source','answers','unknowns']) || doc.schemaVersion !== 1 || !['guided_200q','brief_gap'].includes(String(doc.mode)) || typeof doc.source !== 'string' || new TextEncoder().encode(doc.source).length > 65536 || !doc.answers || typeof doc.answers !== 'object' || Array.isArray(doc.answers) || Object.entries(doc.answers).some(([k,v]) => !fields.includes(k) || typeof v !== 'string' || new TextEncoder().encode(v).length > 16000) || !Array.isArray(doc.unknowns) || doc.unknowns.length > 200 || doc.unknowns.some(v => typeof v !== 'string' || new TextEncoder().encode(v).length > 2000)) throw new Error('destination_response_invalid')
  return row as StoredDestinationDraft
}

export async function requestDestinationDraft(save?: { expectedRevision: number; document: DestinationDraftDocument }): Promise<StoredDestinationDraft | null> {
  const binding = privateDestinationBinding; const generation = privateDecisionBindingVersion
  if (!binding) throw new Error('destination_unavailable')
  const response = await fetch(`/api/private/destination/drafts/${activeDestinationDraftId}`, { method: save ? 'PUT' : 'GET', credentials: 'same-origin', headers: { ...privateSessionHeaders(binding.bearer), ...(save ? { 'content-type':'application/json','x-outcome-csrf':binding.csrf } : {}) }, ...(save ? { body:JSON.stringify({requestId:crypto.randomUUID(),expectedRevision:save.expectedRevision,document:JSON.stringify(save.document)}) } : {}) })
  const value = await readJson<unknown>(response)
  if (generation !== privateDecisionBindingVersion || binding !== privateDestinationBinding) throw new Error('destination_identity_changed')
  const draft = validateStoredDestinationDraft(value)
  const canonical = (doc: DestinationDraftDocument) => JSON.stringify([doc.schemaVersion,doc.mode,doc.source,Object.entries(doc.answers).sort(([a],[b])=>a.localeCompare(b)),doc.unknowns])
  if (save && (!draft || draft.revision !== save.expectedRevision + 1 || canonical(draft.document) !== canonical(save.document))) throw new Error('destination_response_invalid')
  return draft
}

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
  const bindingVersion=++privateDecisionBindingVersion
  privateDecisionBinding=null
  privateDestinationBinding=null
  const response = await fetch('/api/private/workspace', { credentials: 'same-origin', headers: privateSessionHeaders(sessionToken) })
  const value = await readJson<{ workspace: PrivateWorkspaceView }>(response)
  const etag = response.headers.get('etag') ?? ''
  const csrf = response.headers.get('x-outcome-csrf') ?? ''
  if(bindingVersion===privateDecisionBindingVersion)privateDecisionBinding = etag && csrf ? { etag, csrf, ...(sessionToken ? { bearer: sessionToken } : {}) } : null
  const destinationCsrf=response.headers.get('x-outcome-destination-csrf')
  if(bindingVersion===privateDecisionBindingVersion)privateDestinationBinding=destinationCsrf ? {csrf:destinationCsrf,...(sessionToken ? {bearer:sessionToken} : {})} : null
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
  privateDecisionBindingVersion++
  privateDecisionBinding = null
  privateDestinationBinding = null
  await readJson(await fetch('/api/private/auth/logout', { method: 'POST', credentials: 'same-origin' }))
}

const decisionNonce = () => Array.from(crypto.getRandomValues(new Uint8Array(24)), (value) => value.toString(16).padStart(2, '0')).join('')
export const privateDecisionRecordingAvailable = () => privateDecisionBinding !== null
export const capturePrivateDecisionBindingVersion = () => privateDecisionBinding ? privateDecisionBindingVersion : null

export type PrivateDecisionHistoryEntry = {receipt:PrivateDecisionReceipt; target:{projectId:string;eventId:string;sequence:number};withdrawn:boolean}
export function validatePrivateDecisionHistory(value:unknown): PrivateDecisionHistoryEntry[] {
  const invalid=():never=>{throw new Error('decision_history_invalid')}
  const closed=(value:unknown,keys:string[]):Record<string,unknown>=>{
    if(!value||typeof value!=='object'||Array.isArray(value)||Object.getPrototypeOf(value)!==Object.prototype)return invalid()
    const fields=Object.getOwnPropertyDescriptors(value)
    if(Reflect.ownKeys(value).length!==keys.length||keys.some(key=>!fields[key]?.enumerable||!Object.hasOwn(fields[key],'value')))return invalid()
    return Object.fromEntries(keys.map(key=>[key,fields[key].value]))
  }
  const body=closed(value,['decisions','completionAuthority'])
  if(body.completionAuthority!==false||!Array.isArray(body.decisions))return invalid()
  const seen=new Set<string>()
  return body.decisions.map(value=>{
    const entry=closed(value,['receipt','target','withdrawn'])
    const target=closed(entry.target,['projectId','eventId','sequence'])
    if(typeof entry.withdrawn!=='boolean'||![target.projectId,target.eventId].every(id=>typeof id==='string'&&/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/.test(id))||!Number.isSafeInteger(target.sequence)||Number(target.sequence)<1)return invalid()
    const raw=closed(entry.receipt,['decisionState','decisionId','decision','rejectionReason','decidedAt','decisionActorClass','notice','supersedesId','completionAuthority'])
    if(!['approved','rejected'].includes(String(raw.decision))||(raw.decision==='rejected'&&!['evidence_insufficient','scope_not_authorized','superseded_by_newer_observation','defer_pending_external_input'].includes(String(raw.rejectionReason))))return invalid()
    if(raw.supersedesId!==null&&(typeof raw.supersedesId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(raw.supersedesId)))return invalid()
    const receipt=validatePrivateDecisionReceipt({...raw,supersedesId:null},{decision:raw.decision as 'approved'|'rejected',rejectionReason:raw.rejectionReason as PrivateDecisionReason|null})
    const key=JSON.stringify([target.projectId,target.eventId,target.sequence])
    if(seen.has(key)||seen.has(receipt.decisionId))return invalid()
    seen.add(key);seen.add(receipt.decisionId)
    return {receipt:{...receipt,supersedesId:raw.supersedesId as string|null},target:target as PrivateDecisionHistoryEntry['target'],withdrawn:entry.withdrawn}
  })
}
export async function fetchPrivateDecisionHistory():Promise<PrivateDecisionHistoryEntry[]> {
  const binding=privateDecisionBinding
  if(!binding)throw new Error('decision_store_unavailable')
  return validatePrivateDecisionHistory(await readJson<unknown>(await fetch('/api/private/decisions',{credentials:'same-origin',headers:privateSessionHeaders(binding.bearer)})))
}

export function validatePrivateDecisionReceipt(value: unknown, expected: {decision:'approved'|'rejected'; rejectionReason?:PrivateDecisionReason|null}): PrivateDecisionReceipt {
  const invalid = (): never => { throw new Error('decision_receipt_invalid') }
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.getPrototypeOf(value)!==Object.prototype)return invalid()
  const fields=Object.getOwnPropertyDescriptors(value)
  const keys=['decisionState','decisionId','decision','rejectionReason','decidedAt','decisionActorClass','notice','supersedesId','completionAuthority']
  if(Reflect.ownKeys(value).length!==keys.length||keys.some(key=>!fields[key]?.enumerable||!Object.hasOwn(fields[key],'value')))return invalid()
  const record=Object.fromEntries(keys.map(key=>[key,fields[key].value]))
  if(record.decisionState!=='recorded'||record.decision!==expected.decision||record.rejectionReason!==(expected.decision==='rejected'?expected.rejectionReason??null:null)||record.decisionActorClass!=='owner'||record.notice!=='기록됨 · 전달은 이 범위 밖'||record.completionAuthority!==false||record.supersedesId!==null)return invalid()
  if(typeof record.decisionId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(record.decisionId))return invalid()
  if(typeof record.decidedAt!=='string'||!Number.isFinite(Date.parse(record.decidedAt))||new Date(record.decidedAt).toISOString()!==record.decidedAt)return invalid()
  return Object.freeze(record) as PrivateDecisionReceipt
}

export async function recordPrivateDecision(input: { projectId: string; eventId: string; sequence: number; decision: 'approved' | 'rejected'; rejectionReason?: PrivateDecisionReason | null; expectedBindingVersion?:number|null }): Promise<PrivateDecisionReceipt> {
  const binding = privateDecisionBinding
  if (!binding) throw new Error('decision_store_unavailable')
  if(input.expectedBindingVersion!==undefined&&input.expectedBindingVersion!==privateDecisionBindingVersion)throw new Error('decision_source_changed')
  const receipt = await readJson<unknown>(await fetch('/api/private/decisions', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { ...privateSessionHeaders(binding.bearer), 'content-type': 'application/json', 'x-outcome-csrf': binding.csrf, 'if-match': binding.etag },
    body: JSON.stringify({ projectId: input.projectId, eventId: input.eventId, sequence: input.sequence, decision: input.decision, rejectionReason: input.decision === 'rejected' ? input.rejectionReason ?? null : null, nonce: decisionNonce() }),
  }))
  return validatePrivateDecisionReceipt(receipt,input)
}
