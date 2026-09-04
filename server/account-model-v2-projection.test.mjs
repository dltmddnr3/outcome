import assert from 'node:assert/strict'
import test from 'node:test'
import { ACCOUNT_MODEL_V2_STATES, accountModelV2CherryActionLabel, accountModelV2NextActionLabel, createAccountModelV2Projection } from './account-model-v2-projection.mjs'

const observedAt = '2026-08-31T00:00:00.000Z'
const project = (id = 'outcome') => ({
  project: { id, name: id === 'outcome' ? 'OUTCOME' : 'Cherry Note', outcome: 'One safe outcome' },
  current: { phaseId: 'destination-one' },
  phases: [{ id: 'destination-one', title: 'Destination', purpose: 'Safe outcome', scopes: [{ stages: [{ id: 'milestone-one', title: 'Milestone', purpose: 'User result', dependsOn: [], gate: { sourceRef: 'GATES.md', gates: [{ id: 'B1', title: 'Server projection', closed: false }] } }] }] }],
})
const event = (overrides = {}) => ({ id: 'event-planner-1', sequence: 1, role: 'planner', type: 'work_observed', summary: 'Planner가 다음 경계를 확인했습니다.', observedAt: '2026-08-31T00:01:00.000Z', status: 'active', ...overrides })

test('authorized project projection is versioned, deterministic and exact-allowlisted', () => {
  const projection = createAccountModelV2Projection(project(), { observedAt })
  assert.deepEqual(Object.keys(projection), ['schemaVersion', 'modelVersion', 'project', 'destination', 'remainingAcceptanceGap', 'now', 'readyBoundaryLabels', 'nextActionLabel', 'cherryActionLabel', 'state', 'events'])
  assert.deepEqual(projection.project, { id: 'outcome', label: 'OUTCOME' })
  assert.deepEqual(projection.destination, { id: 'destination-one', label: 'Destination' })
  assert.deepEqual(projection.remainingAcceptanceGap, { remaining: 1, total: 1 })
  assert.deepEqual(projection.now, { observedAt, state: 'ready' })
  assert.deepEqual(projection.readyBoundaryLabels, ['Milestone'])
  assert.equal(projection.nextActionLabel, null)
  assert.equal(projection.cherryActionLabel, '차단 원인의 해결 방향을 결정한다')
  assert.equal(projection.modelVersion, 2)
  assert.equal(JSON.stringify(projection), JSON.stringify(createAccountModelV2Projection(project(), { observedAt })))
  assert.deepEqual(ACCOUNT_MODEL_V2_STATES, ['loading', 'stale', 'conflict', 'blocked', 'delivery_unknown', 'no_active_work', 'ready'])
})

test('server-owned action labels are closed, Korean, and omit unknown values', () => {
  assert.equal(accountModelV2NextActionLabel('verify-coherent-slice'), '일관된 Q2 화면을 독립 검증한다')
  assert.equal(accountModelV2CherryActionLabel('resolve_blocker'), '차단 원인의 해결 방향을 결정한다')
  for (const value of ['unknown-action', '검증한다', null, undefined]) {
    assert.equal(accountModelV2NextActionLabel(value), null)
    assert.equal(accountModelV2CherryActionLabel(value), null)
  }
})

test('milestone display labels omit schema-valid slugs without replacing approved human titles', () => {
  const approved = createAccountModelV2Projection(project(), { observedAt })
  const hostileSource = project()
  hostileSource.phases[0].scopes[0].stages[0].title = 'q2-independent-qa'
  const hostile = createAccountModelV2Projection(hostileSource, { observedAt })
  assert.deepEqual(approved.readyBoundaryLabels, ['Milestone'])
  assert.deepEqual(hostile.readyBoundaryLabels, [])
  assert.equal(JSON.stringify(hostile).includes('q2-independent-qa'), false)
  for (const title of ['milestone_one', 'a'.repeat(40), '<script>alert</script>', '12345', 'x']) {
    const source = project()
    source.phases[0].scopes[0].stages[0].title = title
    assert.deepEqual(createAccountModelV2Projection(source, { observedAt }).readyBoundaryLabels, [])
  }
})

test('minimal legacy project fails safe to no active work without client calculation', () => {
  const projection = createAccountModelV2Projection({ project: { id: 'outcome', name: 'OUTCOME' } }, { observedAt })
  assert.equal(projection.state, 'no_active_work')
  assert.equal(projection.destination, null)
  assert.deepEqual(projection.readyBoundaryLabels, [])
  assert.deepEqual(projection.remainingAcceptanceGap, { remaining: 0, total: 0 })
})

test('all seven server-owned states are independently reachable without conflation', () => {
  const variants = [
    ['loading', { ...project(), loading: true }],
    ['stale', { ...project(), stale: true }],
    ['conflict', { ...project(), conflict: true }],
    ['blocked', { ...project(), blocked: true }],
    ['delivery_unknown', { ...project(), delivery_unknown: true }],
    ['no_active_work', { project: { id: 'outcome', name: 'OUTCOME' } }],
    ['ready', project()],
  ]
  assert.deepEqual(variants.map(([expected, value]) => [expected, createAccountModelV2Projection(value, { observedAt }).state]), variants.map(([expected]) => [expected, expected]))
})

test('observed role events are exact-allowlisted and deterministically sequence ordered', () => {
  const projection = createAccountModelV2Projection({ ...project(), events: [event({ sequence: 2 }), event({ id: 'event-audit-1', sequence: 1, role: 'release_audit', type: 'result_observed', summary: '검증 결과가 관측됐습니다.', observedAt: '2026-08-31T00:00:30.000Z', status: 'observed' })] }, { observedAt })
  assert.deepEqual(projection.events, [
    { id: 'event-audit-1', sequence: 1, role: 'release_audit', type: 'result_observed', summary: '검증 결과가 관측됐습니다.', observedAt: '2026-08-31T00:00:30.000Z', status: 'observed', completionAuthority: false },
    { ...event({ sequence: 2 }), completionAuthority: false },
  ])
  assert.deepEqual(createAccountModelV2Projection(project(), { observedAt }).events, [])
})

test('terminal Planner events remain explicit and never become active or completed', () => {
  const statuses = ['blocked', 'delivery_unknown', 'failed', 'rejected', 'safe_hold']
  const projection = createAccountModelV2Projection({ ...project(), events: statuses.map((status, index) => event({ id: `event-terminal-${index + 1}`, sequence: index + 1, type: 'result_observed', summary: `${status} 상태가 관측됐습니다.`, observedAt: `2026-08-31T00:0${index + 1}:00.000Z`, status })) }, { observedAt })
  assert.deepEqual(projection.events.map((row) => row.status), statuses)
  assert.equal(projection.events.some((row) => ['active', 'completed'].includes(row.status)), false)
})

test('role event projection preserves exact allowed roles stable public identity sequence and server authority', () => {
  const roles = ['planner', 'builder', 'ux_product_qa', 'release_audit']
  const sourceEvents = roles.map((role, index) => event({ id: `event-role-${index + 1}`, sequence: roles.length - index, role, status: 'observed' }))
  const projection = createAccountModelV2Projection({ ...project(), events: sourceEvents }, { observedAt })
  assert.deepEqual(projection.events.map(({ id, sequence, role, completionAuthority }) => ({ id, sequence, role, completionAuthority })), [
    { id: 'event-role-4', sequence: 1, role: 'release_audit', completionAuthority: false },
    { id: 'event-role-3', sequence: 2, role: 'ux_product_qa', completionAuthority: false },
    { id: 'event-role-2', sequence: 3, role: 'builder', completionAuthority: false },
    { id: 'event-role-1', sequence: 4, role: 'planner', completionAuthority: false },
  ])
})

test('role event identity fails closed on missing unknown duplicate unstable and caller-owned authority', () => {
  const missing = (key) => { const value = event(); delete value[key]; return value }
  for (const value of [missing('id'), missing('sequence'), missing('role'), event({ role: 'operator' }), event({ id: 'unstable' }), event({ id: 'a'.repeat(40) }), event({ sequence: 0 }), event({ sequence: 1.5 }), event({ completionAuthority: true })]) {
    assert.throws(() => createAccountModelV2Projection({ ...project(), events: [value] }, { observedAt }), /account_model_v2_event|account_model_v2_unexpected_key/)
  }
  for (const events of [[event(), event({ role: 'builder' })], [event(), event({ id: 'event-builder-2', role: 'builder' })]]) {
    assert.throws(() => createAccountModelV2Projection({ ...project(), events }, { observedAt }), /account_model_v2_event_(?:id|sequence)_duplicate/)
  }
})

test('role event identity and summaries reject private locators credentials paths and provider identifiers', () => {
  for (const value of [event({ locator_ref: 'hidden' }), event({ provider_id: 'hidden' }), event({ credential: 'hidden' }), event({ id: '/Users/private/event' }), event({ id: 'event-64988a70f677b7ae162dd595235e35359373c34c' }), event({ summary: 'provider_id=hidden' })]) {
    assert.throws(() => createAccountModelV2Projection({ ...project(), events: [value] }, { observedAt }), /account_model_v2_/)
  }
})

test('Planner event schema rejects invalid type status timestamp active inference and extra keys', () => {
  for (const value of [
    event({ type: 'tool_call' }), event({ status: 'completed' }), event({ observedAt: 'not-a-date' }), event({ type: 'result_observed', status: 'active' }), { ...event(), extra: true },
  ]) assert.throws(() => createAccountModelV2Projection({ ...project(), events: [value] }, { observedAt }), /account_model_v2_event|account_model_v2_unexpected_key/)
})

test('Planner events reject proxies accessors private identifiers paths prompts results and nested values before traps', () => {
  let traps = 0
  const proxy = new Proxy(event(), { get() { traps += 1 }, ownKeys() { traps += 1 }, getOwnPropertyDescriptor() { traps += 1 }, getPrototypeOf() { traps += 1 } })
  const values = [proxy, Object.defineProperty({}, 'type', { get() { traps += 1 }, enumerable: true }), event({ summary: '/Users/private/result' }), event({ summary: 'raw_prompt=hidden' }), event({ summary: 'raw_result=hidden' }), event({ summary: 'task e38a17e5-7c5c-4a13-b3cf-ce8557dea226' }), { ...event(), detail: { token: 'secret' } }]
  for (const value of values) assert.throws(() => createAccountModelV2Projection({ ...project(), events: [value] }, { observedAt }), /account_model_v2_/)
  assert.equal(traps, 0)
})

test('Planner public summaries reject content identifiers named private identifiers and every local path family', () => {
  const values = [
    'a'.repeat(40), 'b'.repeat(64), 'thread_private_identifier_123', 'task-private-identifier-123', 'session_private_identifier_123', 'turn-private-identifier-123',
    '/Users/cherry/result', '/home/cherry/result', '/tmp/private-result', '/private/var/result', '/var/folders/aa/result', 'C:\\Users\\cherry\\result', '\\\\server\\share\\result',
    'raw_prompt=hidden', 'raw_result=hidden', 'registry_payload=hidden', 'provider_payload=hidden', 'credential=hidden',
  ]
  for (const summary of values) assert.throws(() => createAccountModelV2Projection({ ...project(), events: [event({ summary })] }, { observedAt }), /account_model_v2_private_value|account_model_v2_public_text_invalid|account_model_v2_event_private_value/)
})

test('role event timestamps normalize to canonical UTC while sequence owns order', () => {
  const sourceEvents = [event({ id: 'event-later-1', sequence: 2, summary: 'actual later', observedAt: '2026-08-30T23:30:00.000Z' }), event({ id: 'event-earlier-1', sequence: 1, summary: 'actual earlier', observedAt: '2026-08-31T01:00:00+02:00' })]
  const projection = createAccountModelV2Projection({ ...project(), events: sourceEvents }, { observedAt })
  assert.deepEqual(projection.events.map((row) => [row.summary, row.observedAt]), [['actual earlier', '2026-08-30T23:00:00.000Z'], ['actual later', '2026-08-30T23:30:00.000Z']])
  assert.equal(JSON.stringify(projection), JSON.stringify(createAccountModelV2Projection({ ...project(), events: sourceEvents }, { observedAt })))
})

test('duplicate role event identities fail closed even when timestamps normalize equally', () => {
  assert.throws(() => createAccountModelV2Projection({ ...project(), events: [event({ observedAt: '2026-08-31T01:00:00+02:00' }), event({ observedAt: '2026-08-30T23:00:00.000Z' })] }, { observedAt }), /account_model_v2_event_(?:id|sequence)_duplicate/)
})

test('recursive source allowlist rejects every unexpected own data key', () => {
  const variants = [
    { ...project(), unexpected: { foo: 'bar' } },
    { ...project(), project: { ...project().project, unexpected: {} } },
    { ...project(), current: { ...project().current, unexpected: {} } },
    { ...project(), phases: [{ ...project().phases[0], unexpected: {} }] },
    { ...project(), phases: [{ ...project().phases[0], scopes: [{ ...project().phases[0].scopes[0], unexpected: {} }] }] },
    { ...project(), phases: [{ ...project().phases[0], scopes: [{ ...project().phases[0].scopes[0], stages: [{ ...project().phases[0].scopes[0].stages[0], unexpected: {} }] }] }] },
    { ...project(), phases: [{ ...project().phases[0], scopes: [{ ...project().phases[0].scopes[0], stages: [{ ...project().phases[0].scopes[0].stages[0], gate: { ...project().phases[0].scopes[0].stages[0].gate, unexpected: {} } }] }] }] },
    { ...project(), phases: [{ ...project().phases[0], scopes: [{ ...project().phases[0].scopes[0], stages: [{ ...project().phases[0].scopes[0].stages[0], gate: { ...project().phases[0].scopes[0].stages[0].gate, gates: [{ ...project().phases[0].scopes[0].stages[0].gate.gates[0], unexpected: {} }] } }] }] }] },
  ]
  for (const value of variants) assert.throws(() => createAccountModelV2Projection(value, { observedAt }), /account_model_v2_unexpected_key/)
})

test('state hints are exact booleans and mutually exclusive', () => {
  assert.throws(() => createAccountModelV2Projection({ ...project(), stale: 'true' }, { observedAt }), /account_model_v2_state_invalid/)
  assert.throws(() => createAccountModelV2Projection({ ...project(), stale: true, conflict: true }, { observedAt }), /account_model_v2_state_conflict/)
})

test('hostile nested input fails closed before traps or private serialization', () => {
  let traps = 0
  const proxy = new Proxy(project(), { get() { traps += 1 }, ownKeys() { traps += 1 }, getOwnPropertyDescriptor() { traps += 1 }, getPrototypeOf() { traps += 1 } })
  assert.throws(() => createAccountModelV2Projection(proxy, { observedAt }), /proxy_forbidden/)
  assert.equal(traps, 0)
  const cycle = project(); cycle.current.self = cycle
  const variants = [
    { ...project(), raw_prompt: 'safe' },
    { ...project(), raw_result: 'safe' },
    { ...project(), registry: {} },
    { ...project(), extra: { locator: 'private' } },
    { ...project(), extra: { path: '/Users/private/result' } },
    { ...project(), extra: { credential: 'value' } },
    { ...project(), extra: { task: 'e38a17e5-7c5c-4a13-b3cf-ce8557dea226' } },
    { ...project(), extra: Object.defineProperty({}, 'hidden', { value: 'private', enumerable: false }) },
    { ...project(), extra: Object.defineProperty({}, 'value', { get() { throw new Error('trap') }, enumerable: true }) },
    { ...project(), extra: { [Symbol('private')]: 'value' } },
    { ...project(), phases: Object.defineProperty([], '0', { get() { traps += 1; return {} }, enumerable: true }) },
    cycle,
    Object.assign(Object.create({ inherited: true }), project()),
  ]
  for (const value of variants) assert.throws(() => createAccountModelV2Projection(value, { observedAt }), /account_model_v2_/)
  assert.equal(traps, 0)
})
