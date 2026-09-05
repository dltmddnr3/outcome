import { types } from 'node:util'
import { validateChatPrivateContent } from './outcome-chat.mjs'

const KINDS = new Set(['user_message', 'assistant_message', 'commentary', 'plan', 'tool_call', 'tool_result', 'file_change', 'diff', 'test_result', 'approval_request', 'waiting_user', 'error', 'connection'])
const STATES = new Set(['queued', 'responding', 'tool_running', 'verifying', 'waiting_approval', 'waiting_user', 'completed', 'failed', 'cancelled', 'reconnecting'])
const DELIVERY = new Set(['acknowledged', 'delivery_unknown', 'rejected', 'failed'])
const DISPATCH = new Set(['not_invoked', 'dispatch_intent_recorded', 'invoked'])
const EVENT_ID = /^event-[a-f0-9]{16}$/
const CORRELATION_ID = /^message-[a-f0-9]{16}$/
const response = (status, body, headers = {}) => ({ status, headers: { 'cache-control': 'no-store', 'content-type': 'application/json; charset=utf-8', ...headers }, body })
const fail = (code) => { throw new Error(code) }
const record = (value, keys, code = 'invalid_response', allowNullPrototype = false) => {
  if (!value || typeof value !== 'object' || Array.isArray(value) || types.isProxy(value)) fail(code)
  let descriptors, prototype
  try { descriptors = Object.getOwnPropertyDescriptors(value); prototype = Object.getPrototypeOf(value) } catch { fail(code) }
  if (prototype !== Object.prototype && !(allowNullPrototype && prototype === null)) fail(code)
  if (Reflect.ownKeys(descriptors).some((key) => typeof key !== 'string') || Object.keys(descriptors).sort().join(',') !== [...keys].sort().join(',') || Object.values(descriptors).some((item) => !item.enumerable || !Object.hasOwn(item, 'value'))) fail(code)
  return Object.fromEntries(keys.map((key) => [key, descriptors[key].value]))
}
const finiteEventId = (value) => typeof value === 'string' && EVENT_ID.test(value) ? value : fail('invalid_response')
const finiteCorrelationId = (value) => typeof value === 'string' && CORRELATION_ID.test(value) ? value : fail('invalid_response')
const finiteInteger = (value, minimum = 0) => Number.isSafeInteger(value) && value >= minimum ? value : fail('invalid_response')
const finiteTime = (value) => { const time = typeof value === 'string' ? Date.parse(value) : NaN; return Number.isFinite(time) && new Date(time).toISOString() === value ? value : fail('invalid_response') }
const finiteText = (value) => validateChatPrivateContent(value)
const ownerProjection = (value) => {
  let row
  try { row = record(value, ['authenticated', 'actor', 'allowed_origin', 'csrf'], 'authentication_required') }
  catch { row = record(value, ['authenticated', 'actor', 'allowed_origin', 'csrf', 'workspace_id', 'account_ref', 'project_ids'], 'authentication_required') }
  if (row.authenticated !== true || row.actor !== 'cherry_owner' || typeof row.allowed_origin !== 'string' || typeof row.csrf !== 'string') fail('authentication_required')
  if (Object.hasOwn(row, 'workspace_id')) {
    if (typeof row.workspace_id !== 'string' || typeof row.account_ref !== 'string' || !Array.isArray(row.project_ids) || types.isProxy(row.project_ids)) fail('authentication_required')
    const projects = Object.getOwnPropertyDescriptors(row.project_ids)
    if (row.project_ids.length !== 1 || !projects[0] || !Object.hasOwn(projects[0], 'value') || typeof projects[0].value !== 'string') fail('authentication_required')
    row.project_ids = [projects[0].value]
  }
  return row
}
const headerProjection = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value) || types.isProxy(value)) fail('invalid_request')
  let descriptors, prototype; try { descriptors = Object.getOwnPropertyDescriptors(value); prototype = Object.getPrototypeOf(value) } catch { fail('invalid_request') }
  if (prototype !== Object.prototype && prototype !== null) fail('invalid_request')
  const output = Object.create(null)
  for (const key of ['content-type', 'origin', 'x-outcome-csrf', 'idempotency-key']) { const item = descriptors[key]; if (item) { if (!item.enumerable || !Object.hasOwn(item, 'value') || typeof item.value !== 'string') fail('invalid_request'); output[key] = item.value } }
  return output
}
const eventProjection = (value) => {
  if (!value || typeof value !== 'object' || types.isProxy(value)) fail('invalid_response')
  const userMessage = Object.getOwnPropertyDescriptor(value, 'kind')?.value === 'user_message'
  const row = record(value, ['event_id', 'sequence', 'observed_at', 'kind', 'state', 'correlation_id', 'payload', ...(userMessage ? ['delivery', 'dispatch_state'] : [])])
  const kind = KINDS.has(row.kind) ? row.kind : fail('invalid_response'), state = STATES.has(row.state) ? row.state : fail('invalid_response')
  const payload = record(row.payload, kind === 'user_message' ? ['private_content'] : [])
  const privateContent = kind === 'user_message' ? record(payload.private_content, ['text']) : null
  if (userMessage && (!DELIVERY.has(row.delivery) || !DISPATCH.has(row.dispatch_state))) fail('invalid_response')
  return { event_id: finiteEventId(row.event_id), sequence: finiteInteger(row.sequence, 1), observed_at: finiteTime(row.observed_at), kind, state, correlation_id: finiteCorrelationId(row.correlation_id), payload: kind === 'user_message' ? { private_content: { text: finiteText(privateContent.text) } } : {}, ...(userMessage ? { delivery: row.delivery, dispatch_state: row.dispatch_state } : {}) }
}
const timelineEventsProjection = (value) => {
  if (types.isProxy(value) || !Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) fail('invalid_response')
  const descriptors = Object.getOwnPropertyDescriptors(value), length = descriptors.length.value
  if (Reflect.ownKeys(descriptors).length !== length + 1) fail('invalid_response')
  // Validate every slot before materialization; never call the carrier's methods or getters.
  for (let index = 0; index < length; index++) {
    if (!Object.hasOwn(descriptors, index) || !descriptors[index].enumerable || !Object.hasOwn(descriptors[index], 'value')) fail('invalid_response')
  }
  const events = []
  for (let index = 0; index < length; index++) events[index] = eventProjection(descriptors[index].value)
  return events
}
const timelineProjection = (value, afterSequence) => { const row = record(value, ['target', 'events', 'completion_authority']); const target = record(row.target, ['role', 'binding_version']); if (target.role !== 'planner') fail('invalid_response'); if (row.completion_authority !== false) fail('invalid_response'); const events = timelineEventsProjection(row.events), ids = new Set(); let prior = afterSequence, priorTime = ''; for (const event of events) { if (event.sequence !== prior + 1 || ids.has(event.event_id) || priorTime && event.observed_at < priorTime) fail('invalid_response'); ids.add(event.event_id); prior = event.sequence; priorTime = event.observed_at } return { target: { role: 'planner', binding_version: finiteInteger(target.binding_version, 1) }, events, completion_authority: false } }
const submitProjection = (value) => { const row = record(value, ['accepted', 'sequence', 'event_id', 'dispatch_state', 'delivery', 'execution_started', 'result_attached', 'evidence_attached']); if (row.accepted !== true || !DISPATCH.has(row.dispatch_state) || row.execution_started !== false || row.result_attached !== false || row.evidence_attached !== false || !DELIVERY.has(row.delivery) || (row.dispatch_state !== 'invoked' && row.delivery !== 'delivery_unknown')) fail('invalid_response'); return { accepted: true, sequence: finiteInteger(row.sequence, 1), event_id: finiteEventId(row.event_id), dispatch_state: row.dispatch_state, delivery: row.delivery, execution_started: false, result_attached: false, evidence_attached: false } }

async function handle(input) {
  const request = record(input, ['method', 'url', 'headers', 'rawBody', 'service', 'owner', 'rateLimit', 'sendEnabled'], 'invalid_request')
  if (!request.service) return response(503, { error: 'chat_unavailable' })
  if (typeof request.method !== 'string' || typeof request.url !== 'string' || typeof request.rateLimit !== 'function') fail('invalid_request')
  const parsed = new URL(request.url, 'http://outcome.local'), allowed = (request.method === 'GET' && parsed.pathname === '/api/private/chat/timeline') || (request.sendEnabled && request.method === 'POST' && parsed.pathname === '/api/private/chat/messages')
  if (!allowed) return response(405, { error: 'read_only' })
  if (request.owner === null || request.owner === undefined) return response(401, { error: 'authentication_required' })
  const owner = ownerProjection(request.owner), headers = headerProjection(request.headers)
  const rateInput = Object.hasOwn(owner, 'workspace_id')
    ? { route_class: request.method === 'GET' ? 'timeline' : 'submit', account_ref: owner.account_ref, workspace_id: owner.workspace_id, project_id: owner.project_ids.length === 1 ? owner.project_ids[0] : '' }
    : { path: parsed.pathname, owner: { authenticated: true, actor: 'cherry_owner' } }
  const rate = request.rateLimit(rateInput)
  const rateRow = record(rate, rate?.allowed === false ? ['allowed', 'retryAfter'] : ['allowed'], 'invalid_request'); if (rateRow.allowed !== true) { if (rateRow.allowed !== false) fail('invalid_request'); return response(429, { error: 'rate_limited' }, { 'retry-after': String(finiteInteger(rateRow.retryAfter, 1)) }) }
  if (request.method === 'GET') {
    const keys = [...parsed.searchParams.keys()]; if (keys.sort().join(',') !== ['after_sequence', 'project_id'].join(',')) return response(400, { error: 'invalid_request' })
    const afterSequence = Number(parsed.searchParams.get('after_sequence'))
    if (!Number.isSafeInteger(afterSequence) || afterSequence < 0) return response(400, { error: 'invalid_request' })
    return response(200, { ...timelineProjection(await request.service.timeline({ project_id: parsed.searchParams.get('project_id'), after_sequence: afterSequence, owner }), afterSequence), csrf: request.sendEnabled ? owner.csrf : '' })
  }
  if (!headers['content-type']?.startsWith('application/json')) return response(415, { error: 'content_type_required' })
  if (headers.origin !== owner.allowed_origin || headers['x-outcome-csrf'] !== owner.csrf) return response(403, { error: 'request_forbidden' })
  if (typeof request.rawBody !== 'string' || Buffer.byteLength(request.rawBody) > 10_000) return response(413, { error: 'request_too_large' })
  let body; try { body = record(JSON.parse(request.rawBody), ['project_id', 'message'], 'invalid_request') } catch { return response(400, { error: 'invalid_request' }) }
  const key = headers['idempotency-key']; if (typeof key !== 'string') return response(400, { error: 'idempotency_required' })
  try { return response(202, submitProjection(await request.service.submitPlannerMessage({ ...body, idempotency_key: key, owner }))) }
  catch (error) {
    if (error instanceof Error && error.message === 'invalid_message') return response(422, { error: 'sensitive_content_rejected' })
    if (error instanceof Error && error.message === 'idempotency_conflict') return response(409, { error: 'idempotency_conflict' })
    return response(503, { error: 'chat_unavailable' })
  }
}

export async function handlePrivateChatRequest(input = {}) {
  try {
    const defaults = { method: undefined, url: undefined, headers: {}, rawBody: '', service: undefined, owner: undefined, rateLimit: () => ({ allowed: true }), sendEnabled: false }
    if (!input || typeof input !== 'object' || Array.isArray(input) || types.isProxy(input)) fail('invalid_request')
    const descriptors = Object.getOwnPropertyDescriptors(input); if (Reflect.ownKeys(descriptors).some((key) => typeof key !== 'string' || !Object.hasOwn(defaults, key)) || Object.values(descriptors).some((item) => !item.enumerable || !Object.hasOwn(item, 'value'))) fail('invalid_request')
    return await handle({ ...defaults, ...Object.fromEntries(Object.entries(descriptors).map(([key, descriptor]) => [key, descriptor.value])) })
  } catch { return response(503, { error: 'chat_unavailable' }) }
}
