import assert from 'node:assert/strict'

test('T1 T5 transitions survive reload and projected copies cannot alter seven-field snapshots', () => {
  const repository = createInMemoryChatRepository()
  const scope = { project_id: 'outcome', binding_version: 7, idempotency_key: input.idempotency_key }
  repository.reserve({ ...scope, message: 'persisted', observed_at: '2026-09-03T00:00:00.000Z' })
  const check = (delivery, dispatch_state) => {
    const snapshot = repository.snapshot(), restored = createInMemoryChatRepository({ snapshot })
    const query = { project_id: scope.project_id, binding_version: scope.binding_version, after_sequence: 0 }
    const events = restored.timeline(query)
    assert.equal(events[0].delivery, delivery); assert.equal(events[0].dispatch_state, dispatch_state); assert.equal(events[0].state, 'queued')
    assert.deepEqual(Object.keys(snapshot.streams[0].events[0]).sort(), ['event_id', 'sequence', 'observed_at', 'kind', 'state', 'correlation_id', 'payload'].sort())
    events[0].delivery = 'failed'; events[0].dispatch_state = 'not_invoked'; events[0].payload.private_content.text = 'changed'
    assert.deepEqual(restored.snapshot(), snapshot); assert.deepEqual(repository.snapshot(), snapshot)
    assert.equal(restored.timeline(query)[0].delivery, delivery); assert.equal(restored.timeline(query)[0].payload.private_content.text, 'persisted')
    assert.deepEqual(restored.timeline({ ...query, after_sequence: 1 }), [])
  }
  check('delivery_unknown', 'not_invoked')
  repository.markDispatch(scope); check('delivery_unknown', 'dispatch_intent_recorded')
  repository.markInvoked(scope); check('delivery_unknown', 'invoked')
  for (const delivery of ['acknowledged', 'delivery_unknown', 'rejected', 'failed']) { repository.finalize({ ...scope, delivery }); check(delivery, 'invoked') }
})

test('T6 timeline status joins exact project binding and correlation only', async () => {
  const repository = createInMemoryChatRepository()
  const scopes = [{ project_id: 'other', binding_version: 7 }, { project_id: 'outcome', binding_version: 8 }, { project_id: 'outcome', binding_version: 7 }]
  for (const [i, scope] of scopes.entries()) {
    const request = { ...scope, idempotency_key: input.idempotency_key }
    repository.reserve({ ...request, message: 'scope-' + i, observed_at: '2026-09-03T00:00:00.000Z' })
    if (i === 0) { repository.markDispatch(request); repository.markInvoked(request); repository.finalize({ ...request, delivery: 'rejected' }) }
    if (i === 1) repository.markDispatch(request)
  }
  const extra = { project_id: 'outcome', binding_version: 7, idempotency_key: 'message-0000000000000002' }
  repository.reserve({ ...extra, message: 'other correlation', observed_at: '2026-09-03T00:00:00.000Z' })
  repository.markDispatch(extra); repository.markInvoked(extra); repository.finalize({ ...extra, delivery: 'failed' })
  const restored = createInMemoryChatRepository({ snapshot: repository.snapshot() })
  const expected = [['rejected', 'invoked'], ['delivery_unknown', 'dispatch_intent_recorded'], ['delivery_unknown', 'not_invoked']]
  for (const [i, scope] of scopes.entries()) {
    const event = restored.timeline({ ...scope, after_sequence: 0 })[0]
    assert.deepEqual([event.delivery, event.dispatch_state], expected[i]); assert.equal(event.payload.private_content.text, 'scope-' + i)
  }
  const { service, calls } = fixture({ repository: restored })
  const result = await service.timeline({ project_id: 'outcome', role: 'planner', binding_version: 8, after_sequence: 0, owner })
  assert.equal(result.target.binding_version, 7); assert.equal(result.events.length, 2)
  assert.deepEqual(result.events.map(e => e.delivery), ['delivery_unknown', 'failed']); assert.equal(calls.transport, 0)
  assert.deepEqual(restored.timeline({ project_id: 'missing', binding_version: 7, after_sequence: 0 }), [])
})

test('T5 reserved non-user timeline events retain the seven-field shape', () => {
  for (const kind of ['assistant_message', 'commentary', 'plan', 'tool_call', 'tool_result', 'file_change', 'diff', 'test_result', 'approval_request', 'waiting_user', 'error', 'connection']) {
    const event = { event_id: 'event-0000000000000001', sequence: 1, observed_at: '2026-09-03T00:00:00.000Z', kind, state: 'queued', correlation_id: input.idempotency_key, payload: {} }
    const snapshot = { schema_version: 1, streams: [{ project_id: 'outcome', role: 'planner', binding_version: 7, events: [event] }], idempotency: [] }
    const repository = createInMemoryChatRepository({ snapshot })
    assert.deepEqual(repository.timeline({ project_id: 'outcome', binding_version: 7, after_sequence: 0 }), [event])
    assert.deepEqual(repository.snapshot(), snapshot)
  }
})
import { createHash } from 'node:crypto'
import test from 'node:test'
import { createInMemoryChatRepository, createOutcomeChatService, validateChatSnapshot } from './outcome-chat.mjs'

const owner = { authenticated: true, actor: 'cherry_owner' }
const binding = { project_id: 'outcome', role: 'planner', binding_version: 7, status: 'active', freshness: 'fresh', destination: Object.freeze({ opaque: true }) }
const input = { project_id: 'outcome', role: 'planner', binding_version: 7, message: '계획을 시작해 주세요.', idempotency_key: 'message-0000000000000001', owner }
const fingerprint = (project_id, binding_version, message) => createHash('sha256').update(JSON.stringify({ project_id, binding_version, message })).digest('hex')
const fixture = (overrides = {}) => {
  const calls = { resolve: 0, transport: 0 }
  const repository = overrides.repository ?? createInMemoryChatRepository(overrides.repositoryOptions)
  const service = createOutcomeChatService({ repository, now: overrides.now ?? (() => '2026-09-03T00:00:00.000Z'), ownerVerifier: overrides.ownerVerifier ?? (async () => owner), bindingResolver: overrides.bindingResolver ?? (async () => { calls.resolve += 1; return binding }), transport: overrides.transport ?? (async ({ destination }) => { calls.transport += 1; assert.equal(destination, binding.destination); return { delivery: 'acknowledged' } }) })
  return { service, repository, calls }
}

test('TIMELINE-RED memory reload preserves authoritative status without another send', async () => {
  const { service, repository, calls } = fixture()
  const submitted = await service.submitPlannerMessage(input)
  const reloaded = fixture({ repository: createInMemoryChatRepository({ snapshot: repository.snapshot() }) })
  const result = await reloaded.service.timeline({ project_id: 'outcome', after_sequence: 0, owner })
  assert.equal(result.events[0].delivery, submitted.delivery)
  assert.equal(result.events[0].dispatch_state, submitted.dispatch_state)
  assert.equal(result.events[0].state, 'queued')
  assert.equal(calls.transport, 1); assert.equal(reloaded.calls.transport, 0)
})

test('submission appends one ordered event and invokes transport exactly once', async () => {
  const { service, repository, calls } = fixture(); const result = await service.submitPlannerMessage(input)
  assert.equal(result.accepted, true); assert.equal(result.sequence, 1); assert.match(result.event_id, /^event-[a-f0-9]{16}$/); assert.equal(result.dispatch_state, 'invoked'); assert.equal(result.delivery, 'acknowledged'); assert.equal(result.execution_started, false); assert.equal(result.result_attached, false); assert.equal(result.evidence_attached, false)
  assert.equal(calls.resolve, 2); assert.equal(calls.transport, 1)
  const timeline = await service.timeline({ project_id: 'outcome', role: 'planner', binding_version: 7, after_sequence: 0, owner })
  assert.equal(timeline.events.length, 1); assert.deepEqual(timeline.events[0], { event_id: result.event_id, sequence: 1, observed_at: '2026-09-03T00:00:00.000Z', kind: 'user_message', state: 'queued', delivery: 'acknowledged', dispatch_state: 'invoked', correlation_id: 'message-0000000000000001', payload: { private_content: { text: '계획을 시작해 주세요.' } } }); assert.equal(timeline.completion_authority, false)
  assert.equal(JSON.stringify(repository.snapshot()).includes('opaque'), false)
})

test('identical idempotency returns original result without append or transport', async () => {
  const { service, repository, calls } = fixture(); const first = await service.submitPlannerMessage(input); const second = await service.submitPlannerMessage(input)
  assert.deepEqual(second, first); assert.equal(calls.transport, 1); assert.equal(repository.snapshot().streams[0].events.length, 1)
})

test('same idempotency key with different bytes conflicts', async () => {
  const { service, calls } = fixture(); await service.submitPlannerMessage(input)
  await assert.rejects(service.submitPlannerMessage({ ...input, message: '다른 메시지' }), /idempotency_conflict/); assert.equal(calls.transport, 1)
})

test('preflight failures persist nothing and invoke no transport', async () => {
  for (const bad of [
    { ...input, role: 'builder' }, { ...input, project_id: 'wrong' }, { ...input, message: '   ' }, { ...input, message: 'bad\u0000text' }, { ...input, message: 'x'.repeat(4001) }, { ...input, extra: true }, { ...input, owner: { authenticated: false, actor: 'cherry_owner' } },
  ]) { const { service, repository, calls } = fixture(); await assert.rejects(service.submitPlannerMessage(bad)); assert.equal(calls.transport, 0); assert.equal(repository.snapshot().streams.length, 0) }
})

test('binding mismatch states fail before persistence or transport', async () => {
  for (const patch of [{ status: 'stale' }, { status: 'replaced' }, { freshness: 'stale' }, { project_id: 'other' }, { binding_version: 0 }, { destination: null }]) {
    let transports = 0; const repository = createInMemoryChatRepository(); const service = createOutcomeChatService({ repository, bindingResolver: async () => ({ ...binding, ...patch }), transport: async () => { transports += 1 }, ownerVerifier: async () => owner })
    await assert.rejects(service.submitPlannerMessage(input), /binding_unavailable/); assert.equal(transports, 0); assert.equal(repository.snapshot().streams.length, 0)
  }
})

test('binding revalidation prevents persistence and transport', async () => {
  let count = 0, transports = 0; const repository = createInMemoryChatRepository(); const service = createOutcomeChatService({ repository, bindingResolver: async () => (++count === 1 ? binding : { ...binding, status: 'stale' }), transport: async () => { transports += 1 }, ownerVerifier: async () => owner })
  await assert.rejects(service.submitPlannerMessage(input), /binding_unavailable/); assert.equal(transports, 0); assert.equal(repository.snapshot().streams.length, 0)
})

test('transport throw and unknown result are delivery_unknown without retry', async () => {
  for (const transport of [async () => { throw new Error('raw-private-error') }, async () => ({ delivery: 'invented' })]) {
    let calls = 0; const { service } = fixture({ transport: async (value) => { calls += 1; return transport(value) } }); const result = await service.submitPlannerMessage(input); assert.equal(result.delivery, 'delivery_unknown'); assert.equal(calls, 1)
  }
})

test('materialization failure and repository reentry are atomic', () => {
  const original = { schema_version: 1, streams: [], idempotency: [] }
  const failed = createInMemoryChatRepository({ snapshot: original, materialize: () => { throw new Error('private') } })
  assert.throws(() => failed.reserve({ ...input, observed_at: '2026-09-03T00:00:00.000Z' }), /materialization_failed/); assert.deepEqual(failed.snapshot(), original)
  let repository; repository = createInMemoryChatRepository({ materialize: (draft) => { repository.reserve({ ...input, idempotency_key: 'message-0000000000000002', observed_at: '2026-09-03T00:00:00.000Z' }); return draft } })
  assert.throws(() => repository.reserve({ ...input, observed_at: '2026-09-03T00:00:00.000Z' }), /repository_reentry/); assert.deepEqual(repository.snapshot(), original)
})

test('hostile snapshots fail totally', () => {
  const valid = { schema_version: 1, streams: [], idempotency: [] }
  const accessor = {}; Object.defineProperty(accessor, 'schema_version', { enumerable: true, get() { throw new Error('trap') } })
  const proxy = new Proxy(valid, { ownKeys() { throw new Error('trap') } })
  for (const bad of [null, [], { ...valid, extra: true }, accessor, proxy, { ...valid, streams: [{ project_id: 'outcome', role: 'planner', binding_version: 1, events: [{ event_id: 'event-0000000000000001', sequence: 2, observed_at: 'bad', kind: 'unknown', state: 'done', correlation_id: 'message-0000000000000001', payload: {} }] }] }]) assert.throws(() => validateChatSnapshot(bad), /invalid_snapshot|trap/)
})

test('all reserved kinds and finite states validate without fabricating events', () => {
  const kinds = ['user_message', 'assistant_message', 'commentary', 'plan', 'tool_call', 'tool_result', 'file_change', 'diff', 'test_result', 'approval_request', 'waiting_user', 'error', 'connection']
  const states = ['queued', 'responding', 'tool_running', 'verifying', 'waiting_approval', 'waiting_user', 'completed', 'failed', 'cancelled', 'reconnecting']
  for (const [index, kind] of kinds.entries()) {
    const message = 'ordinary session discussion', event = { event_id: `event-${String(index + 1).padStart(16, '0')}`, sequence: 1, observed_at: '2026-09-03T00:00:00.000Z', kind, state: states[index % states.length], correlation_id: 'message-0000000000000001', payload: kind === 'user_message' ? { private_content: { text: message } } : {} }
    const idempotency = kind === 'user_message' ? [{ project_id: 'outcome', binding_version: index + 1, key: 'message-0000000000000001', fingerprint: fingerprint('outcome', index + 1, message), result: { accepted: true, sequence: 1, event_id: event.event_id, dispatch_state: 'not_invoked', delivery: 'delivery_unknown', execution_started: false, result_attached: false, evidence_attached: false } }] : []
    assert.equal(validateChatSnapshot({ schema_version: 1, streams: [{ project_id: 'outcome', role: 'planner', binding_version: index + 1, events: [event] }], idempotency }).streams[0].events[0].kind, kind)
  }
})

test('sequence gaps duplicates and reordered timestamps fail closed', () => {
  const event = (event_id, sequence, observed_at) => ({ event_id, sequence, observed_at, kind: 'user_message', state: 'queued', correlation_id: 'message-0000000000000001', payload: { private_content: { text: 'safe' } } })
  for (const events of [
    [event('event-0000000000000001', 2, '2026-09-03T00:00:00.000Z')],
    [event('event-0000000000000001', 1, '2026-09-03T00:00:00.000Z'), event('event-0000000000000001', 2, '2026-09-03T00:00:01.000Z')],
    [event('event-0000000000000001', 1, '2026-09-03T00:00:01.000Z'), event('event-0000000000000002', 2, '2026-09-03T00:00:00.000Z')],
  ]) assert.throws(() => validateChatSnapshot({ schema_version: 1, streams: [{ project_id: 'outcome', role: 'planner', binding_version: 1, events }], idempotency: [] }), /invalid_snapshot/)
})

test('throwing coercion and hostile destination are rejected without transport', async () => {
  const hostileText = { [Symbol.toPrimitive]() { throw new Error('trap') } }
  const { service, repository, calls } = fixture(); await assert.rejects(service.submitPlannerMessage({ ...input, message: hostileText }), /invalid_message/); assert.equal(calls.transport, 0); assert.equal(repository.snapshot().streams.length, 0)
  const proxy = new Proxy({}, { ownKeys() { throw new Error('trap') } }); const hostile = fixture({ bindingResolver: async () => ({ ...binding, destination: proxy }) }); await assert.rejects(hostile.service.submitPlannerMessage(input), /binding_unavailable/); assert.equal(hostile.calls.transport, 0)
})

test('actual credential values never survive repository validation', async () => {
  for (const message of ['Bearer abcdefgh', 'token=x', 'OUTCOME_SESSION_SECRET value']) { const { service, repository, calls } = fixture(); await assert.rejects(service.submitPlannerMessage({ ...input, message }), /invalid_message/); assert.equal(repository.snapshot().streams.length, 0); assert.equal(calls.transport, 0) }
})

test('V2 supersedes blanket shape rejection without weakening actual credential rejection', async () => {
  for (const message of ['https://example.invalid/x', '018f4f7d-7b8a-7c6d-8e5f-123456789abc', 'a'.repeat(64), '/etc/private-file']) { const { service, calls } = fixture(); assert.equal((await service.submitPlannerMessage({ ...input, message })).accepted, true); assert.equal(calls.transport, 1) }
  for (const message of ['sk_test_abcdefgh', 'Bearer abcdefgh', 'OUTCOME_SESSION_SECRET=value']) { const { service, repository, calls } = fixture(); await assert.rejects(service.submitPlannerMessage({ ...input, message }), /invalid_message/); assert.equal(repository.snapshot().streams.length, 0); assert.equal(calls.transport, 0) }
})

test('QA correction preserves useful prose punctuation line breaks and safe code-like text', async () => {
  for (const message of ['한국어 문장입니다.', 'Ordinary English prose!', '첫 줄\n둘째 줄', 'const answer = value + 1', 'GET /api/health']) { const { service, calls } = fixture(); assert.equal((await service.submitPlannerMessage({ ...input, message })).accepted, true); assert.equal(calls.transport, 1) }
})

test('dispatch write-ahead remains truthful when post-call materialization fails', async () => {
  let materializations = 0, transports = 0
  const repository = createInMemoryChatRepository({ materialize: (draft) => { materializations += 1; if (materializations === 4) throw new Error('after-transport'); return structuredClone(draft) } })
  const service = createOutcomeChatService({ repository, bindingResolver: async () => binding, transport: async () => { transports += 1; return { delivery: 'acknowledged' } }, ownerVerifier: async () => owner })
  const result = await service.submitPlannerMessage(input); assert.equal(transports, 1); assert.equal(result.dispatch_state, 'invoked'); assert.equal(result.delivery, 'delivery_unknown')
  const stored = repository.snapshot().idempotency[0].result; assert.equal(stored.dispatch_state, 'invoked'); assert.equal(stored.delivery, 'delivery_unknown')
})

test('failed invoked-state materialization retains intent without a false negative', async () => {
  let materializations = 0, transports = 0
  const repository = createInMemoryChatRepository({ materialize: (draft) => { materializations += 1; if (materializations === 3) throw new Error('invoked-state-private'); return structuredClone(draft) } })
  const service = createOutcomeChatService({ repository, bindingResolver: async () => binding, transport: async () => { transports += 1; return { delivery: 'acknowledged' } }, ownerVerifier: async () => owner })
  const result = await service.submitPlannerMessage(input); assert.equal(transports, 1); assert.equal(result.dispatch_state, 'dispatch_intent_recorded'); assert.equal(result.delivery, 'delivery_unknown')
  assert.equal(repository.snapshot().idempotency[0].result.dispatch_state, 'dispatch_intent_recorded')
})

test('failure before durable dispatch attempt invokes transport zero and retains false', async () => {
  let materializations = 0, transports = 0
  const repository = createInMemoryChatRepository({ materialize: (draft) => { materializations += 1; if (materializations === 2) throw new Error('before-transport'); return structuredClone(draft) } })
  const service = createOutcomeChatService({ repository, bindingResolver: async () => binding, transport: async () => { transports += 1 }, ownerVerifier: async () => owner })
  await assert.rejects(service.submitPlannerMessage(input), /materialization_failed/); assert.equal(transports, 0); assert.equal(repository.snapshot().idempotency[0].result.dispatch_state, 'not_invoked')
})

test('bounded timeout releases ownership and late settlement cannot mutate state', async () => {
  const timers = [], pending = []; let transports = 0
  const repository = createInMemoryChatRepository(); const service = createOutcomeChatService({ repository, bindingResolver: async () => binding, transport: () => { transports += 1; return new Promise((resolve) => pending.push(resolve)) }, ownerVerifier: async () => owner, timeoutMs: 10, setTimer: (fn) => { timers.push(fn); return timers.length }, clearTimer: () => {} })
  const first = service.submitPlannerMessage(input); for (let index = 0; index < 20 && transports === 0; index += 1) await Promise.resolve(); assert.equal(transports, 1); timers[0](); const result = await first; assert.equal(result.delivery, 'delivery_unknown'); assert.equal(result.dispatch_state, 'invoked')
  const before = repository.snapshot(); pending[0]({ delivery: 'acknowledged' }); await Promise.resolve(); assert.deepEqual(repository.snapshot(), before)
  const second = service.submitPlannerMessage({ ...input, idempotency_key: 'message-0000000000000002' }); for (let index = 0; index < 20 && transports < 2; index += 1) await Promise.resolve(); assert.equal(transports, 2); timers[1](); assert.equal((await second).delivery, 'delivery_unknown')
})

test('concurrent identical submissions join one append and one transport', async () => {
  let release, transports = 0; const repository = createInMemoryChatRepository(); const service = createOutcomeChatService({ repository, bindingResolver: async () => binding, transport: async () => { transports += 1; return new Promise((resolve) => { release = resolve }) }, ownerVerifier: async () => owner })
  const first = service.submitPlannerMessage(input), second = service.submitPlannerMessage(input); for (let index = 0; index < 20 && !release; index += 1) await Promise.resolve(); assert.equal(typeof release, 'function'); release({ delivery: 'acknowledged' })
  assert.deepEqual(await second, await first); assert.equal(transports, 1); assert.equal(repository.snapshot().streams[0].events.length, 1)
})

test('concurrent changed bytes conflict and a different key remains bounded', async () => {
  let release; const { service } = fixture({ transport: async () => new Promise((resolve) => { release = resolve }) })
  const first = service.submitPlannerMessage(input); await assert.rejects(service.submitPlannerMessage({ ...input, message: 'different' }), /idempotency_conflict/); await assert.rejects(service.submitPlannerMessage({ ...input, idempotency_key: 'message-0000000000000002' }), /submit_reentry/); for (let index = 0; index < 20 && !release; index += 1) await Promise.resolve(); release({ delivery: 'acknowledged' }); await first
})

test('V2 RED benign owner content accepts URLs paths digests UUIDs and code', async () => {
  const benign = ['https://example.invalid/a%20b', 'ssh://host/path', '018f4f7d-7b8a-7c6d-8e5f-123456789abc', 'a'.repeat(64), '/Users/cherry/Notes/file.md', 'file:///tmp/note.txt', String.raw`\\server\share\note.txt`, 'const tokenName = "discussion"']
  for (const message of benign) { const { service, calls } = fixture(); assert.equal((await service.submitPlannerMessage({ ...input, message })).accepted, true); assert.equal(calls.transport, 1) }
})

test('V2 RED actual credential values reject before persistence and transport', async () => {
  const credentials = ['Bearer abcdefgh', 'Basic Y2hlcnJ5OnNlY3JldA==', '-----BEGIN PRIVATE KEY-----\nopaque\n-----END PRIVATE KEY-----', 'sk_test_abcdefgh', 'Cookie: session=abcdefgh', 'OUTCOME_SESSION_SECRET abcdefgh', 'password = abcdefgh']
  for (const message of credentials) { const { service, repository, calls } = fixture(); await assert.rejects(service.submitPlannerMessage({ ...input, message }), /invalid_message/); assert.equal(repository.snapshot().streams.length, 0); assert.equal(calls.transport, 0) }
})

test('V2 RED rejects locator-shaped nominal IDs and orphan result linkage', () => {
  const event = { event_id: 'session-abcdefgh', sequence: 1, observed_at: '2026-09-03T00:00:00.000Z', kind: 'user_message', state: 'queued', correlation_id: 'thread-abcdefgh', payload: { private_content: { text: 'ordinary' } } }
  assert.throws(() => validateChatSnapshot({ schema_version: 1, streams: [{ project_id: 'outcome', role: 'planner', binding_version: 1, events: [event] }], idempotency: [] }), /invalid_snapshot/)
  const result = { accepted: true, sequence: 1, event_id: 'event-0000000000000001', dispatch_state: 'invoked', delivery: 'acknowledged', execution_started: false, result_attached: false, evidence_attached: false }
  assert.throws(() => validateChatSnapshot({ schema_version: 1, streams: [], idempotency: [{ project_id: 'outcome', binding_version: 1, key: 'message-0000000000000001', fingerprint: 'a'.repeat(64), result }] }), /invalid_snapshot/)
})

test('V2 snapshot rejects cross-stream and duplicate result linkage', () => {
  const message = 'ordinary', event = { event_id: 'event-0000000000000001', sequence: 1, observed_at: '2026-09-03T00:00:00.000Z', kind: 'user_message', state: 'queued', correlation_id: 'message-0000000000000001', payload: { private_content: { text: message } } }
  const result = { accepted: true, sequence: 1, event_id: event.event_id, dispatch_state: 'invoked', delivery: 'acknowledged', execution_started: false, result_attached: false, evidence_attached: false }
  const stream = { project_id: 'outcome', role: 'planner', binding_version: 1, events: [event] }
  const linked = { project_id: 'outcome', binding_version: 1, key: 'message-0000000000000001', fingerprint: fingerprint('outcome', 1, message), result }
  assert.throws(() => validateChatSnapshot({ schema_version: 1, streams: [stream], idempotency: [{ ...linked, binding_version: 2, fingerprint: fingerprint('outcome', 2, message) }] }), /invalid_snapshot/)
  assert.throws(() => validateChatSnapshot({ schema_version: 1, streams: [stream], idempotency: [linked, { ...linked, key: 'message-0000000000000002' }] }), /invalid_snapshot/)
})

test('V2 RED timer setup failure retains a durable not-invoked fact and calls transport zero', async () => {
  let transports = 0; const repository = createInMemoryChatRepository(); const service = createOutcomeChatService({ repository, bindingResolver: async () => binding, transport: async () => { transports += 1 }, ownerVerifier: async () => owner, setTimer: () => { throw new Error('timer-private') } })
  await assert.rejects(service.submitPlannerMessage(input)); assert.equal(transports, 0); assert.equal(repository.snapshot().idempotency[0].result.dispatch_state, 'not_invoked')
})

test('V3 RED rejects escaped provider credential families before persistence and transport', async () => {
  const escaped = ['sk-ant-api03-abcdefgh12345678', 'xoxb-12345678-abcdefgh', 'AKIA1234567890ABCDEF']
  for (const message of escaped) { const { service, repository, calls } = fixture(); await assert.rejects(service.submitPlannerMessage({ ...input, message }), /invalid_message/); assert.equal(repository.snapshot().streams.length, 0); assert.equal(calls.transport, 0) }
})

test('V3 finite provider registry rejects values and preserves paired discussion controls', async () => {
  const matrix = [
    ['sk-proj-abcdefgh12345678', 'OpenAI key formats are under discussion.'],
    ['sk_ant_api03_abcdefgh12345678', 'Anthropic key rotation is planned.'],
    ['ghp_abcdefgh12345678', 'GitHub token permissions need review.'],
    ['xoxb-12345678-abcdefgh', 'Slack token handling is documented.'],
    ['AKIA1234567890ABCDEF', 'AWS access keys should never be pasted.'],
    [`AIza${'a'.repeat(30)}`, 'Google API key policy is being reviewed.'],
    ['vercel_abcdefgh12345678', 'Vercel token scope is a product topic.'],
    ['sb_secret_abcdefgh12345678', 'Supabase service role security is discussed.'],
    ['sk_live_abcdefgh12345678', 'Clerk secret key rotation is planned.'],
  ]
  for (const [credential, discussion] of matrix) {
    const denied = fixture(); await assert.rejects(denied.service.submitPlannerMessage({ ...input, message: credential }), /invalid_message/); assert.equal(denied.repository.snapshot().streams.length, 0); assert.equal(denied.calls.transport, 0)
    const allowed = fixture(); assert.equal((await allowed.service.submitPlannerMessage({ ...input, message: discussion })).accepted, true); assert.equal(allowed.calls.transport, 1)
  }
})

test('V3 RED correlation identity rejects locator decoration and accepts one opaque positive form', async () => {
  const hostile = ['message-session-abcdefgh', 'message-thread-abcdefgh', 'message-task-abcdefgh', 'message-turn-abcdefgh', 'message-locator-abcdefgh']
  for (const idempotency_key of hostile) { const { service, repository, calls } = fixture(); await assert.rejects(service.submitPlannerMessage({ ...input, idempotency_key }), /invalid_input/); assert.equal(repository.snapshot().streams.length, 0); assert.equal(calls.transport, 0) }
  const { service } = fixture(); assert.equal((await service.submitPlannerMessage({ ...input, idempotency_key: 'message-0123456789abcdef' })).accepted, true)
})

test('V3 correlation grammar rejects every near miss before mutation', async () => {
  const invalid = ['message-0123456789abcde', 'message-0123456789abcdef0', 'message-0123456789abcdeg', 'message-01234567-89abcdef', 'prefix-message-0123456789abcdef', 'message-0123456789abcdef-suffix', 'message_0123456789abcdef', 'message-０123456789abcdef', 'message-0123456789abcde\u0000']
  for (const idempotency_key of invalid) { const { service, repository, calls } = fixture(); await assert.rejects(service.submitPlannerMessage({ ...input, idempotency_key }), /invalid_input/); assert.equal(repository.snapshot().streams.length, 0); assert.equal(calls.transport, 0) }
})

test('V4 RED rejects a GitHub fine-grained actual value before persistence and transport', async () => {
  const { service, repository, calls } = fixture(); await assert.rejects(service.submitPlannerMessage({ ...input, message: `github_pat_${'a'.repeat(24)}` }), /invalid_message/)
  assert.equal(repository.snapshot().streams.length, 0); assert.equal(calls.transport, 0)
})

test('V4 GitHub fine-grained boundaries reject plausible values and preserve discussion', async () => {
  const actual = [`github_pat_${'a'.repeat(20)}`, `Please revoke github-pat-${'b'.repeat(24)} now.`, `github＿pat＿${'c'.repeat(24)}`]
  for (const message of actual) { const { service, repository, calls } = fixture(); await assert.rejects(service.submitPlannerMessage({ ...input, message }), /invalid_message/); assert.equal(repository.snapshot().streams.length, 0); assert.equal(calls.transport, 0) }
  const controls = ['github_pat_', `github_pat_${'a'.repeat(19)}`, `github_pat_${'a'.repeat(10)}!${'b'.repeat(10)}`, 'GitHub fine-grained personal access token documentation', `GITHUB_PAT_${'a'.repeat(24)}`]
  for (const message of controls) { const { service, calls } = fixture(); assert.equal((await service.submitPlannerMessage({ ...input, message })).accepted, true); assert.equal(calls.transport, 1) }
})
