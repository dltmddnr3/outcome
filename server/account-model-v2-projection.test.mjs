import assert from 'node:assert/strict'
import test from 'node:test'
import { ACCOUNT_MODEL_V2_STATES, createAccountModelV2Projection } from './account-model-v2-projection.mjs'

const observedAt = '2026-08-31T00:00:00.000Z'
const project = (id = 'outcome') => ({
  project: { id, name: id === 'outcome' ? 'OUTCOME' : 'Cherry Note', outcome: 'One safe outcome' },
  current: { phaseId: 'destination-one' },
  phases: [{ id: 'destination-one', title: 'Destination', purpose: 'Safe outcome', scopes: [{ stages: [{ id: 'milestone-one', title: 'Milestone', purpose: 'User result', dependsOn: [], gate: { sourceRef: 'GATES.md', gates: [{ id: 'B1', title: 'Server projection', closed: false }] } }] }] }],
})
const event = (overrides = {}) => ({ type: 'work_observed', summary: 'Planner가 다음 경계를 확인했습니다.', observedAt: '2026-08-31T00:01:00.000Z', status: 'active', ...overrides })

test('authorized project projection is versioned, deterministic and exact-allowlisted', () => {
  const projection = createAccountModelV2Projection(project(), { observedAt })
  assert.deepEqual(Object.keys(projection), ['schemaVersion', 'modelVersion', 'project', 'destination', 'remainingAcceptanceGap', 'now', 'readyBoundary', 'nextAction', 'cherryAction', 'state', 'events'])
  assert.deepEqual(projection.project, { id: 'outcome', label: 'OUTCOME' })
  assert.deepEqual(projection.destination, { id: 'destination-one', label: 'Destination' })
  assert.deepEqual(projection.remainingAcceptanceGap, { remaining: 1, total: 1 })
  assert.deepEqual(projection.now, { observedAt, state: 'ready' })
  assert.deepEqual(projection.readyBoundary, ['milestone-one'])
  assert.equal(projection.modelVersion, 2)
  assert.equal(JSON.stringify(projection), JSON.stringify(createAccountModelV2Projection(project(), { observedAt })))
  assert.deepEqual(ACCOUNT_MODEL_V2_STATES, ['loading', 'stale', 'conflict', 'blocked', 'delivery_unknown', 'no_active_work', 'ready'])
})

test('minimal legacy project fails safe to no active work without client calculation', () => {
  const projection = createAccountModelV2Projection({ project: { id: 'outcome', name: 'OUTCOME' } }, { observedAt })
  assert.equal(projection.state, 'no_active_work')
  assert.equal(projection.destination, null)
  assert.deepEqual(projection.readyBoundary, [])
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

test('observed Planner events are exact-allowlisted and deterministically chronological', () => {
  const projection = createAccountModelV2Projection({ ...project(), events: [event(), event({ type: 'result_observed', summary: '검증 결과가 관측됐습니다.', observedAt: '2026-08-31T00:00:30.000Z', status: 'observed' })] }, { observedAt })
  assert.deepEqual(projection.events, [
    { type: 'result_observed', summary: '검증 결과가 관측됐습니다.', observedAt: '2026-08-31T00:00:30.000Z', status: 'observed' },
    event(),
  ])
  assert.deepEqual(createAccountModelV2Projection(project(), { observedAt }).events, [])
})

test('terminal Planner events remain explicit and never become active or completed', () => {
  const statuses = ['blocked', 'delivery_unknown', 'failed', 'rejected', 'safe_hold']
  const projection = createAccountModelV2Projection({ ...project(), events: statuses.map((status, index) => event({ type: 'result_observed', summary: `${status} 상태가 관측됐습니다.`, observedAt: `2026-08-31T00:0${index + 1}:00.000Z`, status })) }, { observedAt })
  assert.deepEqual(projection.events.map((row) => row.status), statuses)
  assert.equal(projection.events.some((row) => ['active', 'completed'].includes(row.status)), false)
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
