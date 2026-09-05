import assert from 'node:assert/strict'

test('T2 user status enums are independent closed own-data fields with trap-free rejection', async () => {
  const base = { event_id: 'event-0000000000000001', sequence: 1, observed_at: '2026-09-03T00:00:00.000Z', kind: 'user_message', state: 'queued', correlation_id: 'message-0000000000000001', payload: { private_content: { text: 'ordinary' } }, delivery: 'acknowledged', dispatch_state: 'invoked' }
  const read = events => handlePrivateChatRequest({ method: 'GET', url: '/api/private/chat/timeline?project_id=outcome&after_sequence=0', service: { timeline: async () => ({ target: { role: 'planner', binding_version: 7 }, events, completion_authority: false }) }, owner })
  for (const delivery of ['acknowledged', 'delivery_unknown', 'rejected', 'failed']) for (const dispatch_state of ['not_invoked', 'dispatch_intent_recorded', 'invoked']) {
    const event = { ...base, delivery, dispatch_state }, response = await read([event])
    assert.equal(response.status, 200); assert.deepEqual(response.body.events, [event])
  }
  let traps = 0
  const bad = []
  for (const key of ['delivery', 'dispatch_state']) {
    const missing = { ...base }; delete missing[key]; bad.push(missing)
    for (const value of ['invented-private-value', null, {}, 1]) bad.push({ ...base, [key]: value })
    const getter = { ...base }; Object.defineProperty(getter, key, { enumerable: true, get() { traps++; throw new Error('private-trap') } }); bad.push(getter)
    const hidden = { ...base }; Object.defineProperty(hidden, key, { enumerable: false }); bad.push(hidden)
  }
  const kindGetter = { ...base }; Object.defineProperty(kindGetter, 'kind', { enumerable: true, get() { traps++; throw new Error('private-trap') } }); bad.push(kindGetter)
  bad.push({ ...base, extra: 'private-extra' }, { ...base, [Symbol('hidden')]: true })
  bad.push(new Proxy(base, { get() { traps++; throw new Error('private-trap') }, getOwnPropertyDescriptor() { traps++; throw new Error('private-trap') }, ownKeys() { traps++; throw new Error('private-trap') }, getPrototypeOf() { traps++; throw new Error('private-trap') } }))
  const revoked = Proxy.revocable(base, {}); revoked.revoke(); bad.push(revoked.proxy)
  for (const event of bad) { const response = await read([event]); assert.equal(response.status, 503); assert.deepEqual(response.body, { error: 'chat_unavailable' }) }
  assert.equal(traps, 0)
  for (const kind of ['assistant_message', 'commentary', 'plan', 'tool_call', 'tool_result', 'file_change', 'diff', 'test_result', 'approval_request', 'waiting_user', 'error', 'connection']) {
    const event = { ...base, kind, payload: {} }; delete event.delivery; delete event.dispatch_state
    const response = await read([event]); assert.equal(response.status, 200); assert.deepEqual(response.body.events, [event])
    assert.equal((await read([{ ...event, delivery: 'delivery_unknown', dispatch_state: 'not_invoked' }])).status, 503)
  }
  // Paired valid controls for existing privacy, identity, ordering and timestamp negatives.
  assert.equal((await read([base])).status, 200)
  const second = { ...base, event_id: 'event-0000000000000002', correlation_id: 'message-0000000000000002', sequence: 2, observed_at: '2026-09-03T00:00:01.000Z' }
  assert.equal((await read([base, second])).status, 200)
  for (const events of [[{ ...base, payload: { private_content: { text: 'Bearer private-value' } } }], [{ ...base, correlation_id: 'message-session-abcdefgh' }], [base, { ...second, sequence: 3 }], [base, { ...second, event_id: base.event_id }], [{ ...base, observed_at: second.observed_at }, { ...second, observed_at: base.observed_at }]]) {
    const response = await read(events); assert.equal(response.status, 503); assert.deepEqual(response.body, { error: 'chat_unavailable' })
  }
})
import test from 'node:test'
import { handlePrivateChatRequest } from './outcome-chat-api.mjs'

const owner = { authenticated: true, actor: 'cherry_owner', allowed_origin: 'https://preview.invalid', csrf: 'csrf-value' }
const service = { timeline: async () => ({ target: { role: 'planner', binding_version: 7 }, events: [], completion_authority: false }), submitPlannerMessage: async () => ({ accepted: true, sequence: 1, event_id: 'event-0000000000000001', dispatch_state: 'invoked', delivery: 'acknowledged', execution_started: false, result_attached: false, evidence_attached: false }) }
const postInput = { method: 'POST', url: '/api/private/chat/messages', headers: { 'content-type': 'application/json', origin: owner.allowed_origin, 'x-outcome-csrf': owner.csrf, 'idempotency-key': 'message-0000000000000001' }, rawBody: JSON.stringify({ project_id: 'outcome', message: '안녕하세요' }), service, owner }
const post = (overrides = {}) => handlePrivateChatRequest({ ...postInput, sendEnabled: true, ...overrides })
const defaultPost = (overrides = {}) => handlePrivateChatRequest({ ...postInput, ...overrides })

test('TIMELINE-ARRAY-RED rejects an own array index getter without evaluation', async () => {
  let traps = 0
  const event = { event_id: 'event-0000000000000001', sequence: 1, observed_at: '2026-09-03T00:00:00.000Z', kind: 'user_message', state: 'queued', correlation_id: 'message-0000000000000001', payload: { private_content: { text: 'ordinary' } }, delivery: 'acknowledged', dispatch_state: 'invoked' }
  const events = []
  Object.defineProperty(events, '0', { enumerable: true, get() { traps++; return event } })
  const result = await handlePrivateChatRequest({ method: 'GET', url: '/api/private/chat/timeline?project_id=outcome&after_sequence=0', service: { timeline: async () => ({ target: { role: 'planner', binding_version: 7 }, events, completion_authority: false }) }, owner })
  assert.deepEqual({ traps, status: result.status }, { traps: 0, status: 503 })
  assert.deepEqual(result.body, { error: 'chat_unavailable' })
})

test('T2 timeline array carriers reject holes accessors methods species and proxies without callbacks', async () => {
  let traps = 0
  const trap = () => { traps++; throw new Error('private-array-callback') }
  const event = { event_id: 'event-0000000000000001', sequence: 1, observed_at: '2026-09-03T00:00:00.000Z', kind: 'user_message', state: 'queued', correlation_id: 'message-0000000000000001', payload: { private_content: { text: 'ordinary' } }, delivery: 'acknowledged', dispatch_state: 'invoked' }
  const read = events => handlePrivateChatRequest({ method: 'GET', url: '/api/private/chat/timeline?project_id=outcome&after_sequence=0', service: { timeline: async () => ({ target: { role: 'planner', binding_version: 7 }, events, completion_authority: false }) }, owner })
  const bad = [undefined, null, {}, 'events', new Array(1), new Array(4294967295), [event, ,], [, event], [undefined]]
  for (const index of [0, 1]) {
    const getter = [event, event]; Object.defineProperty(getter, index, { enumerable: true, get: trap }); bad.push(getter)
    const setter = [event, event]; Object.defineProperty(setter, index, { enumerable: true, set: trap }); bad.push(setter)
    const hidden = [event, event]; Object.defineProperty(hidden, index, { enumerable: false }); bad.push(hidden)
  }
  for (const key of ['map', 'constructor', Symbol.iterator, Symbol.species, Symbol('extra')]) {
    const accessor = [event]; Object.defineProperty(accessor, key, { get: trap }); bad.push(accessor)
    const method = [event]; Object.defineProperty(method, key, { value: trap }); bad.push(method)
  }
  const species = [event]; Object.defineProperty(species, 'constructor', { value: { get [Symbol.species]() { return trap() } } }); bad.push(species)
  const inherited = new Array(1), prototype = Object.create(Array.prototype)
  for (const key of ['0', 'map', 'constructor', Symbol.iterator]) Object.defineProperty(prototype, key, { get: trap })
  Object.setPrototypeOf(inherited, prototype); bad.push(inherited)
  class EventArray extends Array { static get [Symbol.species]() { return trap() } }
  bad.push(new EventArray(event), Object.setPrototypeOf([event], null))
  const handler = { get: trap, getPrototypeOf: trap, ownKeys: trap, getOwnPropertyDescriptor: trap }
  bad.push(new Proxy([event], handler), new Proxy({}, handler))
  const revoked = Proxy.revocable([event], handler); revoked.revoke(); bad.push(revoked.proxy)
  for (const events of bad) {
    const result = await read(events)
    assert.equal(result.status, 503); assert.deepEqual(result.body, { error: 'chat_unavailable' }); assert.equal(traps, 0)
  }
  const missing = await handlePrivateChatRequest({ method: 'GET', url: '/api/private/chat/timeline?project_id=outcome&after_sequence=0', service: { timeline: async () => ({ target: { role: 'planner', binding_version: 7 }, completion_authority: false }) }, owner })
  assert.equal(missing.status, 503); assert.deepEqual(missing.body, { error: 'chat_unavailable' }); assert.equal(traps, 0)
})

test('T2 plain empty frozen and sealed timeline arrays retain closed status schema ordering and detached output', async () => {
  const read = (events, afterSequence = 0) => handlePrivateChatRequest({ method: 'GET', url: `/api/private/chat/timeline?project_id=outcome&after_sequence=${afterSequence}`, service: { timeline: async () => ({ target: { role: 'planner', binding_version: 7 }, events, completion_authority: false }) }, owner })
  for (const wrap of [events => events, Object.freeze, Object.seal]) {
    assert.deepEqual((await read(wrap([]))).body.events, [])
    const first = { event_id: 'event-0000000000000001', sequence: 1, observed_at: '2026-09-03T00:00:00.000Z', kind: 'user_message', state: 'queued', correlation_id: 'message-0000000000000001', payload: { private_content: { text: 'ordinary' } }, delivery: 'failed', dispatch_state: 'dispatch_intent_recorded' }
    const second = { event_id: 'event-0000000000000002', sequence: 2, observed_at: '2026-09-03T00:00:01.000Z', kind: 'commentary', state: 'responding', correlation_id: 'message-0000000000000002', payload: {} }
    const single = await read(wrap([first])); assert.equal(single.status, 200); assert.deepEqual(single.body.events, [first])
    const events = wrap([first, second]), result = await read(events)
    assert.equal(result.status, 200); assert.deepEqual(result.body.events, [first, second]); assert.equal(result.body.completion_authority, false)
    assert.equal(Object.keys(result.body.events[0]).length, 9); assert.equal(Object.keys(result.body.events[1]).length, 7)
    assert.notEqual(result.body.events, events); assert.notEqual(result.body.events[0], first); assert.notEqual(result.body.events[0].payload.private_content, first.payload.private_content); assert.notEqual(result.body.events[1].payload, second.payload)
    const resumed = await read(wrap([second]), 1); assert.equal(resumed.status, 200); assert.deepEqual(resumed.body.events, [second])
    result.body.events[0].payload.private_content.text = 'output mutation'; assert.equal(first.payload.private_content.text, 'ordinary')
    first.delivery = 'rejected'; assert.equal(result.body.events[0].delivery, 'failed')
    second.payload.extra = 'source mutation'; assert.deepEqual(result.body.events[1].payload, {})
  }
})

test('TIMELINE-RED API accepts exact authoritative user status fields', async () => {
  const event = { event_id: 'event-0000000000000001', sequence: 1, observed_at: '2026-09-03T00:00:00.000Z', kind: 'user_message', state: 'queued', correlation_id: 'message-0000000000000001', payload: { private_content: { text: 'persisted' } }, delivery: 'failed', dispatch_state: 'dispatch_intent_recorded' }
  const result = await handlePrivateChatRequest({ method: 'GET', url: '/api/private/chat/timeline?project_id=outcome&after_sequence=0', service: { ...service, timeline: async () => ({ target: { role: 'planner', binding_version: 7 }, events: [event], completion_authority: false }) }, owner })
  assert.equal(result.status, 200); assert.deepEqual(result.body.events, [event])
})

test('C1-R1 keeps message submission default-off before service dispatch', async () => {
  let calls = 0
  const denied = await defaultPost({ service: { ...service, submitPlannerMessage: async () => { calls += 1; return service.submitPlannerMessage() } } })
  assert.equal(denied.status, 405); assert.deepEqual(denied.body, { error: 'read_only' }); assert.equal(calls, 0)
})

test('C1-R2 preserves timeline reads when send is default-off', async () => {
  const result = await handlePrivateChatRequest({ method: 'GET', url: '/api/private/chat/timeline?project_id=outcome&after_sequence=0', service, owner })
  assert.equal(result.status, 200); assert.deepEqual(result.body.target, { role: 'planner', binding_version: 7 }); assert.equal(result.body.csrf, '')
})

test('C1-R3 suppresses the owner csrf value while send is default-off', async () => {
  const result = await handlePrivateChatRequest({ method: 'GET', url: '/api/private/chat/timeline?project_id=outcome&after_sequence=0', service, owner })
  assert.equal(result.body.csrf, ''); assert.equal(JSON.stringify(result).includes(owner.csrf), false)
})

test('C1-R5 permits message submission only with explicit send enablement', async () => {
  assert.equal((await defaultPost()).status, 405)
  assert.equal((await post()).status, 202)
})

test('GET timeline and POST message expose only exact private routes with no-store', async () => {
  const get = await handlePrivateChatRequest({ method: 'GET', url: '/api/private/chat/timeline?project_id=outcome&after_sequence=0', service, owner, sendEnabled: true }); assert.equal(get.status, 200); assert.equal(get.headers['cache-control'], 'no-store'); assert.deepEqual(get.body.target, { role: 'planner', binding_version: 7 }); assert.equal(get.body.csrf, 'csrf-value')
  const sent = await post(); assert.equal(sent.status, 202); assert.equal(sent.headers['cache-control'], 'no-store'); assert.equal(JSON.stringify(sent).includes('destination'), false)
  assert.equal((await handlePrivateChatRequest({ method: 'PUT', url: '/api/private/chat/messages', service, owner })).status, 405)
})

test('browser cannot select role binding provider locator host or target', async () => {
  for (const [key, value] of Object.entries({ role: 'planner', binding_version: 7, provider: 'codex', locator: 'opaque', host: 'local', target: 'planner' })) {
    const denied = await post({ rawBody: JSON.stringify({ project_id: 'outcome', message: '안녕하세요', [key]: value }) })
    assert.equal(denied.status, 400); assert.deepEqual(denied.body, { error: 'invalid_request' })
  }
  for (const query of ['role=planner', 'binding_version=7', 'provider=codex', 'host=local']) {
    const denied = await handlePrivateChatRequest({ method: 'GET', url: `/api/private/chat/timeline?project_id=outcome&after_sequence=0&${query}`, service, owner })
    assert.equal(denied.status, 400)
  }
})

test('default-off and unauthenticated requests fail before service', async () => {
  assert.equal((await handlePrivateChatRequest({ method: 'GET', url: '/api/private/chat/timeline' })).status, 503)
  let calls = 0; const denied = await handlePrivateChatRequest({ method: 'GET', url: '/api/private/chat/timeline', service: { timeline: async () => { calls += 1 } }, owner: null }); assert.equal(denied.status, 401); assert.equal(calls, 0)
})

test('POST enforces content type origin csrf size shape and idempotency', async () => {
  for (const overrides of [
    { headers: {} },
    { headers: { 'content-type': 'application/json', origin: 'https://wrong.invalid', 'x-outcome-csrf': owner.csrf, 'idempotency-key': 'message-0000000000000001' } },
    { headers: { 'content-type': 'application/json', origin: owner.allowed_origin, 'x-outcome-csrf': 'wrong', 'idempotency-key': 'message-0000000000000001' } },
    { rawBody: 'x'.repeat(10001) }, { rawBody: '{' }, { rawBody: JSON.stringify({ project_id: 'outcome', role: 'planner', binding_version: 7, message: 'x', extra: true }) },
    { headers: { 'content-type': 'application/json', origin: owner.allowed_origin, 'x-outcome-csrf': owner.csrf } },
  ]) assert.notEqual((await post(overrides)).status, 202)
})

test('rate limiting and finite domain errors are bounded', async () => {
  assert.equal((await post({ rateLimit: () => ({ allowed: false, retryAfter: 9 }) })).status, 429)
  const failed = await post({ service: { submitPlannerMessage: async () => { throw new Error('raw token=private') } } }); assert.deepEqual(failed.body, { error: 'chat_unavailable' }); assert.equal(JSON.stringify(failed).includes('private'), false)
})

test('hosted owner sends only minimum validated scope and route class to limiter', async () => {
  let seen
  const hostedOwner = { ...owner, workspace_id: 'account-only-preview', account_ref: 'a'.repeat(64), project_ids: ['outcome'] }
  const result = await handlePrivateChatRequest({ method: 'GET', url: '/api/private/chat/timeline?project_id=outcome&after_sequence=0', headers: {}, rawBody: '', service, owner: hostedOwner, rateLimit: (value) => { seen = value; return { allowed: true } } })
  assert.equal(result.status, 200)
  assert.deepEqual(seen, { route_class: 'timeline', account_ref: 'a'.repeat(64), workspace_id: 'account-only-preview', project_id: 'outcome' })
})

test('hosted owner project scope accessors and proxies fail before limiter', async () => {
  let calls = 0, hits = 0
  const accessorProjects = []; Object.defineProperty(accessorProjects, '0', { enumerable: true, get() { hits += 1; return 'outcome' } }); accessorProjects.length = 1
  for (const project_ids of [accessorProjects, new Proxy(['outcome'], { getOwnPropertyDescriptor() { hits += 1; throw new Error('trap') } })]) {
    const value = await handlePrivateChatRequest({ method: 'GET', url: '/api/private/chat/timeline?project_id=outcome&after_sequence=0', headers: {}, rawBody: '', service, owner: { ...owner, workspace_id: 'account-only-preview', account_ref: 'a'.repeat(64), project_ids }, rateLimit: () => { calls += 1; return { allowed: true } } })
    assert.equal(value.status, 503)
  }
  assert.equal(calls, 0); assert.equal(hits, 0)
})

test('GET requires exact cursor query', async () => {
  for (const suffix of ['', '&extra=1', '&after_sequence=-1']) { const result = await handlePrivateChatRequest({ method: 'GET', url: `/api/private/chat/timeline?project_id=outcome${suffix}`, service, owner }); assert.equal(result.status, 400) }
})

test('QA correction contains owner URL and rate-limit traps as finite responses', async () => {
  const hostileOwner = {}; Object.defineProperty(hostileOwner, 'authenticated', { enumerable: true, get() { throw new Error('owner-private') } })
  for (const overrides of [{ owner: hostileOwner }, { url: Symbol('private-url') }, { rateLimit: () => { throw new Error('rate-private') } }]) {
    const result = await handlePrivateChatRequest({ method: 'GET', url: '/api/private/chat/timeline?project_id=outcome&after_sequence=0', headers: {}, rawBody: '', service, owner, rateLimit: () => ({ allowed: true }), ...overrides }); assert.deepEqual(result.body, { error: 'chat_unavailable' }); assert.equal(result.status, 503)
  }
})

test('QA correction rejects hostile headers body and handler envelopes without service calls', async () => {
  let calls = 0; const counted = { submitPlannerMessage: async () => { calls += 1 } }
  const headers = {}; Object.defineProperty(headers, 'content-type', { enumerable: true, get() { throw new Error('header-private') } })
  const proxy = new Proxy({}, { ownKeys() { throw new Error('proxy-private') } })
  for (const value of [await post({ service: counted, headers }), await handlePrivateChatRequest(proxy)]) { assert.equal(value.status, 503); assert.deepEqual(value.body, { error: 'chat_unavailable' }) }
  const body = await post({ service: counted, rawBody: Symbol('body') }); assert.equal(body.status, 413); assert.deepEqual(body.body, { error: 'request_too_large' })
  assert.equal(calls, 0)
})

test('QA correction exact outbound schemas reject credential and path extras', async () => {
  const timeline = await handlePrivateChatRequest({ method: 'GET', url: '/api/private/chat/timeline?project_id=outcome&after_sequence=0', service: { timeline: async () => ({ target: { role: 'planner', binding_version: 7 }, events: [], completion_authority: false, credential: 'hidden', private_path: '/private/value' }) }, owner })
  assert.equal(timeline.status, 503); assert.deepEqual(timeline.body, { error: 'chat_unavailable' }); assert.equal(JSON.stringify(timeline).includes('hidden'), false); assert.equal(JSON.stringify(timeline).includes('/private'), false)
  const submitted = await post({ service: { submitPlannerMessage: async () => ({ ...(await service.submitPlannerMessage()), credential: 'hidden' }) } }); assert.equal(submitted.status, 503); assert.deepEqual(submitted.body, { error: 'chat_unavailable' })
})

test('QA correction exact outbound message payload rejects prohibited values', async () => {
  const event = { event_id: 'event-0000000000000001', sequence: 1, observed_at: '2026-09-03T00:00:00.000Z', kind: 'user_message', state: 'queued', delivery: 'acknowledged', dispatch_state: 'invoked', correlation_id: 'message-0000000000000001', payload: { private_content: { text: 'Bearer private-value' } } }
  const result = await handlePrivateChatRequest({ method: 'GET', url: '/api/private/chat/timeline?project_id=outcome&after_sequence=0', service: { timeline: async () => ({ target: { role: 'planner', binding_version: 7 }, events: [event], completion_authority: false }) }, owner })
  assert.equal(result.status, 503); assert.deepEqual(result.body, { error: 'chat_unavailable' }); assert.equal(JSON.stringify(result).includes('private-value'), false)
})

test('V2 RED authenticated private content round-trips while locator IDs fail closed', async () => {
  const message = 'Review https://example.invalid/a%20b and /Users/cherry/Notes/file.md'
  const event = { event_id: 'event-0000000000000001', sequence: 1, observed_at: '2026-09-03T00:00:00.000Z', kind: 'user_message', state: 'queued', delivery: 'acknowledged', dispatch_state: 'invoked', correlation_id: 'message-0000000000000001', payload: { private_content: { text: message } } }
  const result = await handlePrivateChatRequest({ method: 'GET', url: '/api/private/chat/timeline?project_id=outcome&after_sequence=0', service: { timeline: async () => ({ target: { role: 'planner', binding_version: 7 }, events: [event], completion_authority: false }) }, owner })
  assert.equal(result.status, 200); assert.equal(result.body.events[0].payload.private_content.text, message)
  for (const field of ['event_id', 'correlation_id']) { const hostile = structuredClone(event); hostile[field] = 'session-abcdefgh'; const denied = await handlePrivateChatRequest({ method: 'GET', url: '/api/private/chat/timeline?project_id=outcome&after_sequence=0', service: { timeline: async () => ({ target: { role: 'planner', binding_version: 7 }, events: [hostile], completion_authority: false }) }, owner }); assert.equal(denied.status, 503); assert.equal(JSON.stringify(denied).includes('session-abcdefgh'), false) }
})

test('V2 outbound lifecycle never translates intent into an invocation fact', async () => {
  const base = await service.submitPlannerMessage()
  const intent = await post({ service: { submitPlannerMessage: async () => ({ ...base, dispatch_state: 'dispatch_intent_recorded', delivery: 'delivery_unknown' }) } }); assert.equal(intent.status, 202); assert.equal(intent.body.dispatch_state, 'dispatch_intent_recorded'); assert.equal(Object.hasOwn(intent.body, 'transport_invoked'), false)
  const contradictory = await post({ service: { submitPlannerMessage: async () => ({ ...base, dispatch_state: 'not_invoked', delivery: 'acknowledged' }) } }); assert.equal(contradictory.status, 503); assert.deepEqual(contradictory.body, { error: 'chat_unavailable' })
})

test('V3 RED outbound correlation identity rejects locator decoration', async () => {
  const event = { event_id: 'event-0000000000000001', sequence: 1, observed_at: '2026-09-03T00:00:00.000Z', kind: 'user_message', state: 'queued', delivery: 'acknowledged', dispatch_state: 'invoked', correlation_id: 'message-session-abcdefgh', payload: { private_content: { text: 'ordinary' } } }
  const result = await handlePrivateChatRequest({ method: 'GET', url: '/api/private/chat/timeline?project_id=outcome&after_sequence=0', service: { timeline: async () => ({ target: { role: 'planner', binding_version: 7 }, events: [event], completion_authority: false }) }, owner })
  assert.equal(result.status, 503); assert.equal(JSON.stringify(result).includes('message-session-abcdefgh'), false)
})

test('V4 GitHub fine-grained credential failure has no raw echo', async () => {
  const message = `github_pat_${'a'.repeat(24)}`
  const result = await post({ rawBody: JSON.stringify({ project_id: 'outcome', message }), service: { submitPlannerMessage: async () => { throw new Error(`invalid_message ${message}`) } } })
  assert.equal(result.status, 503); assert.deepEqual(result.body, { error: 'chat_unavailable' }); assert.equal(JSON.stringify(result).includes(message), false)
})

test('timeline gaps regressions and duplicate event identities fail closed', async () => {
  const event = (event_id, sequence) => ({ event_id, sequence, observed_at: '2026-09-03T00:00:00.000Z', kind: 'user_message', state: 'queued', delivery: 'acknowledged', dispatch_state: 'invoked', correlation_id: 'message-0000000000000001', payload: { private_content: { text: 'ordinary' } } })
  for (const events of [[event('event-0000000000000001', 2)], [event('event-0000000000000001', 1), event('event-0000000000000002', 3)], [event('event-0000000000000001', 1), event('event-0000000000000001', 2)]]) {
    const denied = await handlePrivateChatRequest({ method: 'GET', url: '/api/private/chat/timeline?project_id=outcome&after_sequence=0', service: { timeline: async () => ({ target: { role: 'planner', binding_version: 7 }, events, completion_authority: false }) }, owner })
    assert.equal(denied.status, 503); assert.deepEqual(denied.body, { error: 'chat_unavailable' })
  }
})

test('timeline rejects decreasing observed timestamps with increasing sequences', async () => {
  const event = (event_id, sequence, observed_at) => ({ event_id, sequence, observed_at, kind: 'user_message', state: 'queued', delivery: 'acknowledged', dispatch_state: 'invoked', correlation_id: `message-${String(sequence).padStart(16, '0')}`, payload: { private_content: { text: 'ordinary' } } })
  const events = [event('event-0000000000000001', 1, '2026-09-03T00:00:01.000Z'), event('event-0000000000000002', 2, '2026-09-03T00:00:00.000Z')]
  const denied = await handlePrivateChatRequest({ method: 'GET', url: '/api/private/chat/timeline?project_id=outcome&after_sequence=0', service: { timeline: async () => ({ target: { role: 'planner', binding_version: 7 }, events, completion_authority: false }) }, owner })
  assert.equal(denied.status, 503); assert.deepEqual(denied.body, { error: 'chat_unavailable' })
})
