import { createHash } from 'node:crypto'
import { types } from 'node:util'

const KINDS = new Set(['user_message', 'assistant_message', 'commentary', 'plan', 'tool_call', 'tool_result', 'file_change', 'diff', 'test_result', 'approval_request', 'waiting_user', 'error', 'connection'])
const STATES = new Set(['queued', 'responding', 'tool_running', 'verifying', 'waiting_approval', 'waiting_user', 'completed', 'failed', 'cancelled', 'reconnecting'])
const DELIVERY = new Set(['acknowledged', 'delivery_unknown', 'rejected', 'failed'])
const DISPATCH = new Set(['not_invoked', 'dispatch_intent_recorded', 'invoked'])
const ID = /^[a-z][a-z0-9-]{1,63}$/
const EVENT_ID = /^event-[a-f0-9]{16}$/
const CORRELATION_ID = /^message-[a-f0-9]{16}$/
const PROVIDER_CREDENTIALS = Object.freeze([
  { provider: 'openai', pattern: /\bsk-(?:proj-)?[A-Za-z0-9][A-Za-z0-9_-]{7,}/ },
  { provider: 'anthropic', pattern: /\bsk[-_ ]ant[-_ ](?:api\d+[-_ ])?[A-Za-z0-9][A-Za-z0-9_-]{7,}/ },
  { provider: 'github', pattern: /(?:\bgh[pousr][-_ ][A-Za-z0-9]{8,}|\bgithub[-_ ]pat[-_ ][A-Za-z0-9_]{20,})/ },
  { provider: 'slack', pattern: /\bxox[baprs][-_ ][A-Za-z0-9-]{8,}/ },
  { provider: 'aws', pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/ },
  { provider: 'google', pattern: /\bAIza[A-Za-z0-9_-]{20,}/ },
  { provider: 'vercel', pattern: /\b(?:vercel|vcp)[-_ ][A-Za-z0-9_-]{8,}/ },
  { provider: 'supabase', pattern: /\bsb[-_ ](?:secret|service[-_ ]role)[-_ ][A-Za-z0-9_-]{8,}/ },
  { provider: 'clerk', pattern: /\bsk[-_ ](?:test|live)[-_ ][A-Za-z0-9_-]{8,}/ },
])
const PROHIBITED_CREDENTIAL = [
  /\b(?:bearer|basic)\s+[a-z0-9+/._~-]+={0,2}/i,
  /-----BEGIN (?:[A-Z0-9 ]+ )?PRIVATE KEY-----[\s\S]*?-----END (?:[A-Z0-9 ]+ )?PRIVATE KEY-----/,
  /\b(?:sk|pk|ghp)_[a-z0-9_-]{8,}/i,
  /\b(?:cookie|set-cookie|session)\s*[:=]\s*\S+/i,
  /\b(?:api[_ -]?key|token|secret|password|authorization|credential)\s*[:=]\s*\S+/i,
  /\b[A-Z][A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|CREDENTIAL|API_KEY)[A-Z0-9_]*(?:\s*=\s*|\s+)\S+/,
]
const fail = (code) => { throw new Error(code) }
const exact = (value, keys, code = 'invalid_input') => {
  if (!value || typeof value !== 'object' || Array.isArray(value) || types.isProxy(value) || Object.getPrototypeOf(value) !== Object.prototype) fail(code)
  const descriptors = Object.getOwnPropertyDescriptors(value)
  if (Object.keys(descriptors).sort().join(',') !== [...keys].sort().join(',') || Object.values(descriptors).some((item) => !Object.hasOwn(item, 'value'))) fail(code)
  return Object.fromEntries(keys.map((key) => [key, descriptors[key].value]))
}
const integer = (value, minimum, code) => Number.isSafeInteger(value) && value >= minimum ? value : fail(code)
const identifier = (value, code = 'invalid_input') => typeof value === 'string' && ID.test(value) && !/^(?:session|thread|task|turn|locator)(?:-|$)/.test(value) ? value : fail(code)
const eventIdentifier = (value, code = 'invalid_snapshot') => typeof value === 'string' && EVENT_ID.test(value) ? value : fail(code)
const correlationIdentifier = (value, code = 'invalid_input') => typeof value === 'string' && CORRELATION_ID.test(value) ? value : fail(code)
const timestamp = (value, code = 'invalid_snapshot') => { if (typeof value !== 'string') fail(code); const time = Date.parse(value); return Number.isFinite(time) && new Date(time).toISOString() === value ? value : fail(code) }
const safeText = (value, maximum = 4_000, code = 'invalid_message') => {
  if (typeof value !== 'string' || value.length === 0 || [...value].length > maximum || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value) || value.trim().length === 0) fail(code)
  const detection = value.normalize('NFKC')
  if (PROHIBITED_CREDENTIAL.some((pattern) => pattern.test(detection)) || PROVIDER_CREDENTIALS.some(({ pattern }) => pattern.test(detection))) fail(code)
  return value
}
export const validateChatPrivateContent = (value) => safeText(value, 4_000, 'invalid_response')
const digest = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const clone = (value) => structuredClone(value)

const validateEvent = (value) => {
  const row = exact(value, ['event_id', 'sequence', 'observed_at', 'kind', 'state', 'correlation_id', 'payload'], 'invalid_snapshot')
  const payload = exact(row.payload, row.kind === 'user_message' ? ['private_content'] : [], 'invalid_snapshot')
  const privateContent = row.kind === 'user_message' ? exact(payload.private_content, ['text'], 'invalid_snapshot') : null
  return {
    event_id: eventIdentifier(row.event_id), sequence: integer(row.sequence, 1, 'invalid_snapshot'), observed_at: timestamp(row.observed_at),
    kind: KINDS.has(row.kind) ? row.kind : fail('invalid_snapshot'), state: STATES.has(row.state) ? row.state : fail('invalid_snapshot'), correlation_id: correlationIdentifier(row.correlation_id, 'invalid_snapshot'),
    payload: row.kind === 'user_message' ? { private_content: { text: safeText(privateContent.text, 4_000, 'invalid_snapshot') } } : {},
  }
}

export function validateChatSnapshot(value) {
  const root = exact(value, ['schema_version', 'streams', 'idempotency'], 'invalid_snapshot')
  if (root.schema_version !== 1 || !Array.isArray(root.streams) || !Array.isArray(root.idempotency)) fail('invalid_snapshot')
  const scopes = new Set(), eventIds = new Set(), scopedEvents = new Map()
  const streams = root.streams.map((value) => {
    const row = exact(value, ['project_id', 'role', 'binding_version', 'events'], 'invalid_snapshot')
    if (!Array.isArray(row.events) || row.role !== 'planner') fail('invalid_snapshot')
    const stream = { project_id: identifier(row.project_id, 'invalid_snapshot'), role: 'planner', binding_version: integer(row.binding_version, 1, 'invalid_snapshot'), events: row.events.map(validateEvent) }
    const scope = `${stream.project_id}\0${stream.binding_version}`; if (scopes.has(scope)) fail('invalid_snapshot'); scopes.add(scope)
    let priorTime = ''
    stream.events.forEach((event, index) => { if (event.sequence !== index + 1 || eventIds.has(event.event_id) || (priorTime && event.observed_at < priorTime)) fail('invalid_snapshot'); eventIds.add(event.event_id); scopedEvents.set(`${scope}\0${event.event_id}`, event); priorTime = event.observed_at })
    return stream
  })
  const keys = new Set()
  const idempotency = root.idempotency.map((value) => {
    const row = exact(value, ['project_id', 'binding_version', 'key', 'fingerprint', 'result'], 'invalid_snapshot')
    const item = { project_id: identifier(row.project_id, 'invalid_snapshot'), binding_version: integer(row.binding_version, 1, 'invalid_snapshot'), key: correlationIdentifier(row.key, 'invalid_snapshot'), fingerprint: typeof row.fingerprint === 'string' && /^[a-f0-9]{64}$/.test(row.fingerprint) ? row.fingerprint : fail('invalid_snapshot'), result: exact(row.result, ['accepted', 'sequence', 'event_id', 'dispatch_state', 'delivery', 'execution_started', 'result_attached', 'evidence_attached'], 'invalid_snapshot') }
    const identity = `${item.project_id}\0${item.binding_version}\0${item.key}`; if (keys.has(identity)) fail('invalid_snapshot'); keys.add(identity)
    if (item.result.accepted !== true || !DISPATCH.has(item.result.dispatch_state) || !DELIVERY.has(item.result.delivery) || item.result.execution_started !== false || item.result.result_attached !== false || item.result.evidence_attached !== false) fail('invalid_snapshot')
    if (item.result.dispatch_state !== 'invoked' && item.result.delivery !== 'delivery_unknown') fail('invalid_snapshot')
    integer(item.result.sequence, 1, 'invalid_snapshot'); eventIdentifier(item.result.event_id)
    return item
  })
  const linkedEvents = new Set()
  for (const item of idempotency) {
    const scope = `${item.project_id}\0${item.binding_version}`, link = `${scope}\0${item.result.event_id}`, event = scopedEvents.get(link)
    if (!event || event.kind !== 'user_message' || event.sequence !== item.result.sequence || event.correlation_id !== item.key || linkedEvents.has(link) || item.fingerprint !== digest({ project_id: item.project_id, binding_version: item.binding_version, message: event.payload.private_content.text })) fail('invalid_snapshot')
    linkedEvents.add(link)
  }
  for (const [link, event] of scopedEvents) if (event.kind === 'user_message' && !linkedEvents.has(link)) fail('invalid_snapshot')
  return { schema_version: 1, streams, idempotency }
}

export function createInMemoryChatRepository({ snapshot = { schema_version: 1, streams: [], idempotency: [] }, materialize = clone } = {}) {
  let state = validateChatSnapshot(snapshot), mutating = false
  const commit = (operation) => {
    if (mutating) fail('repository_reentry')
    mutating = true
    try { const draft = clone(state), result = operation(draft); const next = validateChatSnapshot(materialize(draft)); state = next; return result }
    catch (error) { throw error instanceof Error && ['repository_reentry', 'idempotency_conflict'].includes(error.message) ? error : new Error(error instanceof Error && error.message === 'idempotency_conflict' ? error.message : 'materialization_failed') }
    finally { mutating = false }
  }
  return Object.freeze({
    reserve(input) {
      const fingerprint = digest({ project_id: input.project_id, binding_version: input.binding_version, message: input.message })
      const prior = state.idempotency.find((item) => item.project_id === input.project_id && item.binding_version === input.binding_version && item.key === input.idempotency_key)
      if (prior) { if (prior.fingerprint !== fingerprint) fail('idempotency_conflict'); return { duplicate: true, result: clone(prior.result) } }
      return commit((draft) => {
        let stream = draft.streams.find((item) => item.project_id === input.project_id && item.binding_version === input.binding_version)
        if (!stream) { stream = { project_id: input.project_id, role: 'planner', binding_version: input.binding_version, events: [] }; draft.streams.push(stream) }
        const sequence = stream.events.length + 1, event_id = `event-${digest(`${input.project_id}\0${input.binding_version}\0${sequence}`).slice(0, 16)}`, correlation_id = input.idempotency_key
        stream.events.push({ event_id, sequence, observed_at: input.observed_at, kind: 'user_message', state: 'queued', correlation_id, payload: { private_content: { text: input.message } } })
        const result = { accepted: true, sequence, event_id, dispatch_state: 'not_invoked', delivery: 'delivery_unknown', execution_started: false, result_attached: false, evidence_attached: false }
        draft.idempotency.push({ project_id: input.project_id, binding_version: input.binding_version, key: input.idempotency_key, fingerprint, result })
        return { duplicate: false, result }
      })
    },
    markDispatch(input) { return commit((draft) => { const item = draft.idempotency.find((row) => row.project_id === input.project_id && row.binding_version === input.binding_version && row.key === input.idempotency_key); if (!item || item.result.dispatch_state !== 'not_invoked') fail('materialization_failed'); item.result.dispatch_state = 'dispatch_intent_recorded'; return clone(item.result) }) },
    markInvoked(input) { return commit((draft) => { const item = draft.idempotency.find((row) => row.project_id === input.project_id && row.binding_version === input.binding_version && row.key === input.idempotency_key); if (!item || item.result.dispatch_state !== 'dispatch_intent_recorded') fail('materialization_failed'); item.result.dispatch_state = 'invoked'; return clone(item.result) }) },
    finalize(input) { return commit((draft) => { const item = draft.idempotency.find((row) => row.project_id === input.project_id && row.binding_version === input.binding_version && row.key === input.idempotency_key); if (!item || item.result.dispatch_state !== 'invoked') fail('materialization_failed'); item.result.delivery = input.delivery; return clone(item.result) }) },
    timeline({ project_id, binding_version, after_sequence }) {
      const stream = state.streams.find((item) => item.project_id === project_id && item.binding_version === binding_version)
      return clone((stream?.events ?? []).filter((event) => event.sequence > after_sequence).map((event) => {
        if (event.kind !== 'user_message') return event
        const { result } = state.idempotency.find((item) => item.project_id === project_id && item.binding_version === binding_version && item.key === event.correlation_id)
        return { ...event, delivery: result.delivery, dispatch_state: result.dispatch_state }
      }))
    },
    snapshot: () => clone(state),
  })
}

export function createOutcomeChatService({ repository, bindingResolver, transport, ownerVerifier = async () => null, now = () => new Date().toISOString(), timeoutMs = 5_000, setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
  if (!repository || typeof bindingResolver !== 'function' || typeof transport !== 'function' || typeof ownerVerifier !== 'function') fail('invalid_configuration')
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60_000 || typeof setTimer !== 'function' || typeof clearTimer !== 'function') fail('invalid_configuration')
  const inFlight = new Map()
  const owner = (value) => { const row = exact(value, ['authenticated', 'actor'], 'owner_required'); if (row.authenticated !== true || row.actor !== 'cherry_owner') fail('owner_required'); return row }
  const scope = (input, operation) => {
    const modern = operation === 'submit' ? ['project_id', 'message', 'idempotency_key', 'owner'] : ['project_id', 'after_sequence', 'owner']
    const legacy = operation === 'submit' ? ['project_id', 'role', 'binding_version', 'message', 'idempotency_key', 'owner'] : ['project_id', 'role', 'binding_version', 'after_sequence', 'owner']
    let row
    try { row = exact(input, modern) } catch { row = exact(input, legacy) }
    if (Object.hasOwn(row, 'role') && row.role !== 'planner') fail('invalid_scope')
    owner(row.owner)
    return { ...row, project_id: identifier(row.project_id) }
  }
  const resolve = async (row) => { const value = await bindingResolver({ project_id: row.project_id, role: 'planner' }); const binding = exact(value, ['project_id', 'role', 'binding_version', 'status', 'freshness', 'destination'], 'binding_unavailable'); const destinationDescriptors = binding.destination && typeof binding.destination === 'object' && !types.isProxy(binding.destination) ? Object.getOwnPropertyDescriptors(binding.destination) : null; if (binding.project_id !== row.project_id || binding.role !== 'planner' || binding.status !== 'active' || binding.freshness !== 'fresh' || !destinationDescriptors || Object.values(destinationDescriptors).some((item) => !Object.hasOwn(item, 'value'))) fail('binding_unavailable'); binding.binding_version = integer(binding.binding_version, 1, 'binding_unavailable'); return binding }
  const prepareTransport = (input) => {
    let settled = false
    let timer
    let resolveResult
    const result = new Promise((resolve) => { resolveResult = resolve })
    const finish = (delivery) => { if (settled) return; settled = true; if (timer !== undefined) clearTimer(timer); resolveResult(delivery) }
    timer = setTimer(() => finish('delivery_unknown'), timeoutMs)
    return { result, cancel: () => finish('delivery_unknown'), invoke: () => { let value; try { value = transport(input) } catch { finish('delivery_unknown'); return } Promise.resolve(value).then((output) => finish(DELIVERY.has(output?.delivery) ? output.delivery : 'delivery_unknown'), () => finish('delivery_unknown')) } }
  }
  return Object.freeze({
    authenticateOwner: ownerVerifier,
    async submitPlannerMessage(input) {
      const row = scope(input, 'submit'); row.message = safeText(row.message); row.idempotency_key = correlationIdentifier(row.idempotency_key)
      const binding = await resolve(row)
      const bindingVersion = binding.binding_version
      const operationKey = `${row.project_id}\0${bindingVersion}\0${row.idempotency_key}`, operationFingerprint = digest({ message: row.message })
      const existing = inFlight.get(operationKey)
      if (existing) { if (existing.fingerprint !== operationFingerprint) fail('idempotency_conflict'); return existing.promise }
      if (inFlight.size > 0) fail('submit_reentry')
      const operation = (async () => {
        const confirmed = await resolve(row); if (confirmed.binding_version !== bindingVersion) fail('binding_unavailable')
        const observed_at = timestamp(now(), 'clock_unavailable'); const reservation = repository.reserve({ project_id: row.project_id, binding_version: bindingVersion, message: row.message, idempotency_key: row.idempotency_key, observed_at })
        if (reservation.duplicate) return reservation.result
        const attempt = prepareTransport({ destination: binding.destination, message: row.message, correlation_id: row.idempotency_key })
        let intent
        try { intent = repository.markDispatch({ project_id: row.project_id, binding_version: bindingVersion, idempotency_key: row.idempotency_key }) } catch (error) { attempt.cancel(); throw error }
        attempt.invoke()
        let invoked
        try { invoked = repository.markInvoked({ project_id: row.project_id, binding_version: bindingVersion, idempotency_key: row.idempotency_key }) } catch { await attempt.result; return intent }
        const delivery = await attempt.result
        try { return repository.finalize({ project_id: row.project_id, binding_version: bindingVersion, idempotency_key: row.idempotency_key, delivery }) } catch { return invoked }
      })()
      inFlight.set(operationKey, { fingerprint: operationFingerprint, promise: operation })
      try { return await operation } finally { if (inFlight.get(operationKey)?.promise === operation) inFlight.delete(operationKey) }
    },
    async timeline(input) { const row = scope(input, 'timeline'); row.after_sequence = integer(row.after_sequence, 0, 'invalid_cursor'); const binding = await resolve(row); return { target: { role: 'planner', binding_version: binding.binding_version }, events: repository.timeline({ project_id: row.project_id, binding_version: binding.binding_version, after_sequence: row.after_sequence }), completion_authority: false } },
  })
}
