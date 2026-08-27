import assert from 'node:assert/strict'
import test from 'node:test'
import { generateKeyPairSync, sign } from 'node:crypto'
import { createContext, runInContext } from 'node:vm'
import { createHostedObserverBridge, canonicalEnrollmentBytes, canonicalHostedRequestBytes, HostedObserverBridgeError } from './phase3-observer-bridge-hosted.mjs'
import { canonicalObserverBridgeBytes } from './phase3-observer-bridge.mjs'
import { handleHostedObserverBridgeRequest } from './phase3-observer-bridge-api.mjs'

const BASE = Date.parse('2026-08-27T00:00:00.000Z')
const binding = { workspace_id: 'workspace_main', project_id: 'outcome', role: 'builder', binding_version: 1, source_ref: 'source_alpha_01' }
const viewers = [
  { workspace_id: 'workspace_main', viewer_ref: 'viewer_workstation_01', viewer_class: 'workstation', project_ids: ['outcome'] },
  { workspace_id: 'workspace_main', viewer_ref: 'viewer_remote_01', viewer_class: 'remote_device', project_ids: ['outcome'] },
]
const owner = { account_ref: 'account_owner_01', workspace_id: 'workspace_main', project_ids: ['outcome'] }
const service = () => createHostedObserverBridge({
  feature_enabled: true, ingest_enabled: true, bindings: [binding], viewers,
  authorize_owner: (context) => context?.token === 'owner' ? owner : null,
  authorize_viewer: (context) => context?.token === 'owner' ? owner : null,
  now: () => BASE, random_bytes: (length) => Buffer.alloc(length, 7),
})
const call = (bridge, input) => handleHostedObserverBridgeRequest({ bridge, allowed_origin: 'https://preview.example', csrf_secret: 'csrf-safe-value', ...input })

const seamCases = [
  { name: 'projection', path: '/api/private/bridge/projection', method: 'GET', bridgeMethod: 'read', status: 200, headers: {}, query: {} },
  { name: 'enroll', path: '/api/private/bridge/enrollments', method: 'POST', bridgeMethod: 'createEnrollment', status: 201, headers: { 'content-type': 'application/json', origin: 'https://preview.example', 'x-outcome-csrf': 'csrf-safe-value' }, rawBody: '{}' },
  { name: 'complete', path: '/api/private/bridge/enrollments/complete', method: 'POST', bridgeMethod: 'completeEnrollment', status: 200, headers: { 'content-type': 'application/json' }, rawBody: '{}' },
  { name: 'revoke', path: '/api/private/bridge/sources/revoke', method: 'POST', bridgeMethod: 'revokeSource', status: 200, headers: { 'content-type': 'application/json', origin: 'https://preview.example', 'x-outcome-csrf': 'csrf-safe-value' }, rawBody: '{}' },
  { name: 'rotate', path: '/api/private/bridge/sources/rotate', method: 'POST', bridgeMethod: 'createEnrollment', status: 201, headers: { 'content-type': 'application/json', origin: 'https://preview.example', 'x-outcome-csrf': 'csrf-safe-value' }, rawBody: '{}' },
  { name: 'events', path: '/api/private/bridge/events', method: 'POST', bridgeMethod: 'ingest', status: 200, headers: { 'content-type': 'application/json' }, rawBody: '{}' },
]
const seamInput = ({ path, method, headers, query, rawBody }) => ({ path, method, headers, query, rawBody, authContext: { token: 'owner' } })
const fixedStatuses = {
  unavailable: 404, access_denied: 404, auth_unavailable: 503,
  enrollment_invalid: 409, enrollment_conflict: 409, idempotency_conflict: 409,
  request_conflict: 409, sequence_conflict: 409, signature_invalid: 401,
  csrf_invalid: 403, rate_limited: 429, body_too_large: 400,
  bad_request: 400, input_invalid: 400,
}
const brandHostileFactories = (trap) => [
  () => { const value = new Error('rate_limited'); Object.setPrototypeOf(value, HostedObserverBridgeError.prototype); Object.defineProperties(value, { name: { value: 'HostedObserverBridgeError', enumerable: true, writable: true, configurable: true }, code: { value: 'rate_limited', enumerable: true, writable: true, configurable: true } }); return value },
  () => { const value = new HostedObserverBridgeError('rate_limited'); Object.setPrototypeOf(value, Error.prototype); return value },
  () => { class Subclass extends HostedObserverBridgeError {}; return new Subclass('rate_limited') },
  () => { const value = new HostedObserverBridgeError('rate_limited'); value[Symbol('extra')] = true; return value },
  () => Object.assign(new HostedObserverBridgeError('rate_limited'), { extra: true }),
  () => { const value = new HostedObserverBridgeError('rate_limited'); Object.defineProperty(value, 'code', { get: trap }); return value },
  () => { const value = new HostedObserverBridgeError('rate_limited'); value.code = 'bad_request'; return value },
  () => { const value = new HostedObserverBridgeError('rate_limited'); delete value.code; return value },
  () => new Proxy(new HostedObserverBridgeError('rate_limited'), {}),
  () => { const value = Proxy.revocable(new HostedObserverBridgeError('rate_limited'), {}); value.revoke(); return value.proxy },
  () => { const value = runInContext('new Error("rate_limited")', createContext({})); Object.setPrototypeOf(value, HostedObserverBridgeError.prototype); Object.defineProperties(value, { name: { value: 'HostedObserverBridgeError', enumerable: true, writable: true, configurable: true }, code: { value: 'rate_limited', enumerable: true, writable: true, configurable: true } }); return value },
  () => Object.freeze(new HostedObserverBridgeError('rate_limited')),
  () => Object.seal(new HostedObserverBridgeError('rate_limited')),
  () => new Proxy(new HostedObserverBridgeError('rate_limited'), { getPrototypeOf: trap }),
  () => new Proxy(new HostedObserverBridgeError('rate_limited'), { ownKeys: trap }),
  () => new Proxy(new HostedObserverBridgeError('rate_limited'), { getOwnPropertyDescriptor: trap }),
  () => new HostedObserverBridgeError('unknown'),
  () => { const value = {}; value.self = value; return value },
]
const alternateNewTargetError = () => {
  function AlternateNewTarget() {}
  AlternateNewTarget.prototype = HostedObserverBridgeError.prototype
  return Reflect.construct(HostedObserverBridgeError, ['rate_limited'], AlternateNewTarget)
}
const newTargetVariantFactories = [
  alternateNewTargetError,
  () => { class Subclass extends HostedObserverBridgeError {}; return new Subclass('rate_limited') },
  () => Reflect.construct(HostedObserverBridgeError, ['rate_limited'], HostedObserverBridgeError.bind(null)),
  () => new (new Proxy(HostedObserverBridgeError, {}))('rate_limited'),
  () => { const target = new Proxy(HostedObserverBridgeError, {}); return Reflect.construct(HostedObserverBridgeError, ['rate_limited'], target) },
  () => { const value = new HostedObserverBridgeError('rate_limited'); Object.setPrototypeOf(value, Error.prototype); return value },
]

test('QA alternate newTarget blocker is generic for every direct API endpoint and settlement mode', async () => {
  let calls = 0
  for (const item of seamCases) for (const asynchronous of [false, true]) {
    const failure = asynchronous
      ? async () => { calls += 1; throw alternateNewTargetError() }
      : () => { calls += 1; throw alternateNewTargetError() }
    assert.deepEqual(await call({ maxBodyBytes: 1024, [item.bridgeMethod]: failure }, seamInput(item)), { status: 503, body: { error: 'bridge_unavailable' } })
  }
  assert.equal(calls, 12)
})

test('newTarget construction matrix is generic for every direct API endpoint and settlement mode', async () => {
  let calls = 0
  for (const item of seamCases) for (const factory of newTargetVariantFactories) for (const asynchronous of [false, true]) {
    const failure = asynchronous
      ? async () => { calls += 1; throw factory() }
      : () => { calls += 1; throw factory() }
    assert.deepEqual(await call({ maxBodyBytes: 1024, [item.bridgeMethod]: failure }, seamInput(item)), { status: 503, body: { error: 'bridge_unavailable' } })
  }
  assert.equal(calls, 72)
})

test('re-QA brand blocker is generic for every direct API endpoint and settlement mode', async () => {
  const reasons = [
    () => {
      const forged = new Error('private raw identifier')
      Object.setPrototypeOf(forged, HostedObserverBridgeError.prototype)
      Object.defineProperty(forged, 'code', { value: 'rate_limited', enumerable: true, writable: true, configurable: true })
      return forged
    },
    () => {
      const decorated = new HostedObserverBridgeError('rate_limited')
      decorated[Symbol('private decoration')] = true
      return decorated
    },
  ]
  for (const item of seamCases) for (const reason of reasons) for (const asynchronous of [false, true]) {
    let calls = 0
    const failure = asynchronous
      ? async () => { calls += 1; throw reason() }
      : () => { calls += 1; throw reason() }
    const actual = await call({ maxBodyBytes: 1024, [item.bridgeMethod]: failure }, seamInput(item))
    assert.deepEqual(actual, { status: 503, body: { error: 'bridge_unavailable' } })
    assert.equal(calls, 1)
  }
})

test('brand mutation matrix is generic for every direct API endpoint and settlement mode', async () => {
  let trapHits = 0
  const trap = () => { trapHits += 1; throw new Error('private trap detail') }
  let calls = 0
  for (const item of seamCases) for (const reason of brandHostileFactories(trap)) for (const asynchronous of [false, true]) {
    const failure = asynchronous
      ? async () => { calls += 1; throw reason() }
      : () => { calls += 1; throw reason() }
    assert.deepEqual(await call({ maxBodyBytes: 1024, [item.bridgeMethod]: failure }, seamInput(item)), { status: 503, body: { error: 'bridge_unavailable' } })
  }
  assert.equal(calls, 216)
  assert.equal(trapHits, 0)
})

test('genuine brand mappings cover every direct API endpoint and settlement mode', async () => {
  let calls = 0
  for (const item of seamCases) for (const [code, status] of Object.entries(fixedStatuses)) for (const asynchronous of [false, true]) {
    const failure = asynchronous
      ? async () => { calls += 1; throw new HostedObserverBridgeError(code) }
      : () => { calls += 1; throw new HostedObserverBridgeError(code) }
    assert.deepEqual(await call({ maxBodyBytes: 1024, [item.bridgeMethod]: failure }, seamInput(item)), { status, body: { error: status === 404 || status === 503 ? 'bridge_unavailable' : code } })
  }
  assert.equal(calls, 168)
})

test('Audit hostile rejection reasons: throwing getPrototypeOf Proxy is contained', async () => {
  const hostile = new Proxy(new HostedObserverBridgeError('rate_limited'), { getPrototypeOf() { throw new Error('private getPrototypeOf stack') } })
  const bridge = { maxBodyBytes: 1024, read: async () => { throw hostile } }
  assert.deepEqual(await call(bridge, seamInput(seamCases[0])), { status: 503, body: { error: 'bridge_unavailable' } })
})

test('Audit hostile rejection reasons: throwing code accessor is contained', async () => {
  const hostile = new HostedObserverBridgeError('rate_limited')
  Object.defineProperty(hostile, 'code', { get() { throw new Error('private code accessor stack') } })
  const bridge = { maxBodyBytes: 1024, read: async () => { throw hostile } }
  assert.deepEqual(await call(bridge, seamInput(seamCases[0])), { status: 503, body: { error: 'bridge_unavailable' } })
})

test('hostile rejection corpus is total for every endpoint with one call and no unhandled rejection', async () => {
  let trapHits = 0
  const trap = () => { trapHits += 1; throw new Error('private trap detail') }
  const trappedProxy = new Proxy({}, {
    get: trap, getPrototypeOf: trap, ownKeys: trap, getOwnPropertyDescriptor: trap,
    has: trap, set: trap, setPrototypeOf: trap, defineProperty: trap, deleteProperty: trap,
  })
  const revocable = Proxy.revocable({}, {})
  revocable.revoke()
  const accessorError = new HostedObserverBridgeError('rate_limited')
  Object.defineProperty(accessorError, 'code', { get: trap })
  const cyclic = {}
  cyclic.self = cyclic
  const hostileObject = {
    code: 'rate_limited',
    toString: trap,
    valueOf: trap,
    [Symbol.iterator]: trap,
    [Symbol.for('nodejs.util.inspect.custom')]: trap,
    self: cyclic,
  }
  const reasons = [undefined, null, 'private string', 1, 1n, Symbol('private'), cyclic, hostileObject, trappedProxy, revocable.proxy, accessorError]
  const unhandled = []
  const listener = (reason) => unhandled.push(reason)
  process.on('unhandledRejection', listener)
  try {
    for (const item of seamCases) for (const reason of reasons) {
      let invocations = 0
      const bridge = { maxBodyBytes: 1024, [item.bridgeMethod]: async () => { invocations += 1; throw reason } }
      const actual = await call(bridge, seamInput(item))
      assert.deepEqual(actual, { status: 503, body: { error: 'bridge_unavailable' } }, item.name)
      assert.equal(invocations, 1, item.name)
      assert.equal(JSON.stringify(actual).includes('private'), false)
    }
    await new Promise((resolve) => setImmediate(resolve))
    assert.deepEqual(unhandled, [])
    assert.equal(trapHits, 0)
  } finally {
    process.off('unhandledRejection', listener)
  }
})

test('safe known error classification requires exact native type and own data code', async () => {
  for (const [code, status] of Object.entries(fixedStatuses)) for (const asynchronous of [false, true]) {
    const error = new HostedObserverBridgeError(code)
    const failure = asynchronous ? async () => { throw error } : () => { throw error }
    const actual = await call({ maxBodyBytes: 1024, read: failure }, seamInput(seamCases[0]))
    assert.deepEqual(actual, { status, body: { error: status === 404 || status === 503 ? 'bridge_unavailable' : code } })
  }
  class ForgedSubclass extends HostedObserverBridgeError {}
  const inherited = Object.create({ code: 'rate_limited' })
  const accessor = new HostedObserverBridgeError('rate_limited')
  Object.defineProperty(accessor, 'code', { get() { throw new Error('private accessor') } })
  const forged = [{ code: 'rate_limited' }, inherited, Object.assign(new Error('plain'), { code: 'rate_limited' }), new ForgedSubclass('rate_limited'), new HostedObserverBridgeError('unknown'), accessor]
  for (const reason of forged) {
    const actual = await call({ maxBodyBytes: 1024, read: async () => { throw reason } }, seamInput(seamCases[0]))
    assert.deepEqual(actual, { status: 503, body: { error: 'bridge_unavailable' } })
  }
})

test('sync and async bridge methods produce identical finite responses for all six endpoints', async () => {
  for (const item of seamCases) {
    for (const asynchronous of [false, true]) {
      let invocations = 0
      const body = { endpoint: item.name }
      const method = asynchronous
        ? async () => { invocations += 1; return body }
        : () => { invocations += 1; return body }
      const bridge = { maxBodyBytes: 1024, [item.bridgeMethod]: method }
      const actual = await call(bridge, seamInput(item))
      assert.deepEqual(actual, { status: item.status, body }, `${item.name}:${asynchronous ? 'async' : 'sync'}`)
      assert.equal(invocations, 1)
      assert.equal(typeof actual.body?.then, 'undefined')
    }
  }
})

test('sync throws and async rejections retain known mapping and hide unknown detail', async () => {
  const cases = [
    { failure: () => { throw new HostedObserverBridgeError('rate_limited') }, expected: { status: 429, body: { error: 'rate_limited' } } },
    { failure: async () => { throw new HostedObserverBridgeError('rate_limited') }, expected: { status: 429, body: { error: 'rate_limited' } } },
    { failure: () => { throw new Error('private sync identifier') }, expected: { status: 503, body: { error: 'bridge_unavailable' } } },
    { failure: async () => { throw new Error('private async identifier') }, expected: { status: 503, body: { error: 'bridge_unavailable' } } },
  ]
  for (const item of seamCases) for (const { failure, expected } of cases) {
    const bridge = { maxBodyBytes: 1024, [item.bridgeMethod]: failure }
    const actual = await call(bridge, seamInput(item))
    assert.deepEqual(actual, expected, item.name)
    assert.doesNotMatch(JSON.stringify(actual), /private|identifier|stack|promise/i)
  }
})

test('async rejection has one invocation no retry and no unhandled rejection', async () => {
  const unhandled = []
  const listener = (reason) => unhandled.push(reason)
  process.on('unhandledRejection', listener)
  try {
    for (const item of seamCases) {
      let invocations = 0
      const bridge = { maxBodyBytes: 1024, [item.bridgeMethod]: async () => { invocations += 1; throw new Error('uncertain completion') } }
      assert.deepEqual(await call(bridge, seamInput(item)), { status: 503, body: { error: 'bridge_unavailable' } })
      assert.equal(invocations, 1, item.name)
    }
    await new Promise((resolve) => setImmediate(resolve))
    assert.deepEqual(unhandled, [])
  } finally {
    process.off('unhandledRejection', listener)
  }
})

test('hostile thenable accessor fails closed after one invocation', async () => {
  let invocations = 0
  let accessorHits = 0
  const hostile = Object.create(null)
  Object.defineProperty(hostile, 'then', { get() { accessorHits += 1; throw new Error('private then accessor') } })
  const bridge = { maxBodyBytes: 1024, read: () => { invocations += 1; return hostile } }
  assert.deepEqual(await call(bridge, seamInput(seamCases[0])), { status: 503, body: { error: 'bridge_unavailable' } })
  assert.equal(invocations, 1)
  assert.equal(accessorHits, 1)
})

test('feature off and public routes fail closed without project presence', async () => {
  assert.deepEqual(await handleHostedObserverBridgeRequest({ method: 'POST', path: '/api/dashboard', headers: {}, rawBody: '{}', authContext: null }), { status: 405, body: { error: 'read_only' } })
  assert.deepEqual(await handleHostedObserverBridgeRequest({ method: 'GET', path: '/api/private/bridge/projection', headers: {}, authContext: null }), { status: 404, body: { error: 'bridge_unavailable' } })
})

test('owner enrollment requires exact origin, CSRF pair, account and JSON body', async () => {
  const bridge = service()
  const body = { ...binding, mode: 'enroll', idempotency_key: 'enroll-key-01' }
  const base = { method: 'POST', path: '/api/private/bridge/enrollments', headers: { 'content-type': 'application/json', origin: 'https://preview.example', 'x-outcome-csrf': 'csrf-safe-value' }, rawBody: JSON.stringify(body), authContext: { token: 'owner' } }
  assert.equal((await call(bridge, base)).status, 201)
  for (const input of [
    { ...base, headers: { ...base.headers, origin: 'https://evil.example' } },
    { ...base, headers: { ...base.headers, 'x-outcome-csrf': 'wrong' } },
    { ...base, authContext: { token: 'wrong' } },
    { ...base, headers: { ...base.headers, 'content-type': 'text/plain' } },
    { ...base, rawBody: JSON.stringify({ ...body, auth_context: { token: 'owner' } }), authContext: { token: 'wrong' } },
  ]) assert.notEqual((await call(service(), input)).status, 201)
})

test('companion completion ignores ambient auth and viewer requires server authorization', async () => {
  const bridge = service()
  const begin = await call(bridge, { method: 'POST', path: '/api/private/bridge/enrollments', headers: { 'content-type': 'application/json', origin: 'https://preview.example', 'x-outcome-csrf': 'csrf-safe-value' }, rawBody: JSON.stringify({ ...binding, mode: 'enroll', idempotency_key: 'enroll-key-01' }), authContext: { token: 'owner' } })
  const keys = generateKeyPairSync('ed25519')
  const spki = keys.publicKey.export({ format: 'der', type: 'spki' }).toString('base64url')
  const proof = sign(null, canonicalEnrollmentBytes({ ...begin.body.enrollment_scope, challenge_ref: begin.body.challenge_ref, challenge_nonce: begin.body.challenge_nonce, public_key_spki: spki }), keys.privateKey).toString('base64url')
  const complete = await call(bridge, { method: 'POST', path: '/api/private/bridge/enrollments/complete', headers: { 'content-type': 'application/json', cookie: '__session=attacker', authorization: 'Bearer attacker' }, rawBody: JSON.stringify({ challenge_ref: begin.body.challenge_ref, public_key_spki: spki, proof_signature: proof }), authContext: { token: 'wrong' } })
  assert.equal(complete.status, 200)
  const unsignedEvent = { schema_version: 1, project_id: 'outcome', role: 'builder', binding_version: 1, source_ref: 'source_alpha_01', source_version: 1, key_version: 1, sequence: 1, observed_at: new Date(BASE).toISOString(), expires_at: new Date(BASE + 60_000).toISOString(), status_code: '구현 진행 중' }
  const event = { ...unsignedEvent, signature: sign(null, canonicalObserverBridgeBytes(unsignedEvent), keys.privateKey).toString('base64url') }
  const request = { certificate_ref: complete.body.certificate_ref, request_id: 'request_alpha_01', nonce: 'nonce_alpha_01', event }
  const ingest = await call(bridge, { method: 'POST', path: '/api/private/bridge/events', headers: { 'content-type': 'application/json', cookie: '__session=attacker', authorization: 'Bearer attacker' }, rawBody: JSON.stringify({ ...request, request_signature: sign(null, canonicalHostedRequestBytes(request), keys.privateKey).toString('base64url') }), authContext: { token: 'wrong' } })
  assert.deepEqual(ingest, { status: 200, body: { status: 'accepted', ledger_revision: 1 } })
  assert.equal((await call(bridge, { method: 'GET', path: '/api/private/bridge/projection', headers: {}, authContext: null })).status, 404)
  const projection = await call(bridge, { method: 'GET', path: '/api/private/bridge/projection', headers: {}, authContext: { token: 'owner' }, query: { viewer_ref: 'viewer_workstation_01', viewer_class: 'workstation', project_id: 'outcome' } })
  assert.equal(projection.status, 200)
  assert.equal(projection.body.projections[0].status_code, '구현 진행 중')
  const cookieOnly = await call(bridge, { method: 'POST', path: '/api/private/bridge/events', headers: { 'content-type': 'application/json', cookie: '__session=owner', authorization: 'Bearer owner' }, rawBody: '{}', authContext: { token: 'owner' } })
  assert.equal(cookieOnly.status, 400)
})

test('unknown private paths and methods are finite, non-enumerating and secret-free', async () => {
  const bridge = service()
  const responses = [
    await call(bridge, { method: 'GET', path: '/api/private/bridge/missing', headers: {}, authContext: null }),
    await call(bridge, { method: 'PATCH', path: '/api/private/bridge/projection', headers: {}, authContext: { token: 'owner' } }),
  ]
  assert.deepEqual(responses.map((value) => value.status), [404, 405])
  assert.doesNotMatch(JSON.stringify(responses), /outcome|workspace|account|token|cookie|signature|certificate|session|thread|path/i)
})

test('Proxy and accessor request bodies are rejected without trap or getter execution', async () => {
  const bridge = service()
  let hits = 0
  const proxy = new Proxy({}, { ownKeys() { hits += 1; return [] }, get() { hits += 1 } })
  const proxyResponse = await call(bridge, { method: 'POST', path: '/api/private/bridge/enrollments', headers: { 'content-type': 'application/json', origin: 'https://preview.example', 'x-outcome-csrf': 'csrf-safe-value' }, rawBody: proxy, authContext: { token: 'owner' } })
  assert.equal(proxyResponse.status, 400)
  assert.equal(hits, 0)
  const accessor = {}
  Object.defineProperty(accessor, 'project_id', { enumerable: true, get() { hits += 1; return 'outcome' } })
  const accessorResponse = await call(bridge, { method: 'POST', path: '/api/private/bridge/enrollments', headers: { 'content-type': 'application/json', origin: 'https://preview.example', 'x-outcome-csrf': 'csrf-safe-value' }, rawBody: accessor, authContext: { token: 'owner' } })
  assert.equal(accessorResponse.status, 400)
  assert.equal(hits, 0)
})

test('QA RED F3 counts actual raw padded UTF-8 bytes before parsing', async () => {
  let storeCommits = 0
  const bridge = createHostedObserverBridge({
    feature_enabled: true, ingest_enabled: true, bindings: [binding], viewers,
    authorize_owner: () => owner, authorize_viewer: () => owner,
    now: () => BASE, random_bytes: (length) => Buffer.alloc(length, 8), max_body_bytes: 900,
    transaction_store: { commit: () => { storeCommits += 1; return true } },
  })
  const compact = JSON.stringify({ ...binding, mode: 'enroll', idempotency_key: 'raw-byte-key-01' })
  const padded = `${' '.repeat(1_000)}${compact}`
  const headers = { 'content-type': 'application/json', origin: 'https://preview.example', 'x-outcome-csrf': 'csrf-safe-value' }
  assert.equal((await call(bridge, { method: 'POST', path: '/api/private/bridge/enrollments', headers, rawBody: compact, authContext: { token: 'owner' } })).status, 201)
  const commitsBeforeOversize = storeCommits
  const result = await call(bridge, { method: 'POST', path: '/api/private/bridge/enrollments', headers, rawBody: padded, authContext: { token: 'owner' } })
  assert.equal(result.status, 400)
  assert.equal(storeCommits, commitsBeforeOversize)
})

test('F1 API does not reveal same-named project across workspace boundaries', async () => {
  const otherBinding = { ...binding, workspace_id: 'workspace_other', source_ref: 'source_other_01' }
  const bridge = createHostedObserverBridge({
    feature_enabled: true, ingest_enabled: true, bindings: [binding, otherBinding],
    viewers: [
      ...viewers,
      { workspace_id: 'workspace_other', viewer_ref: 'viewer_other_workstation_01', viewer_class: 'workstation', project_ids: ['outcome'] },
      { workspace_id: 'workspace_other', viewer_ref: 'viewer_other_remote_01', viewer_class: 'remote_device', project_ids: ['outcome'] },
    ],
    authorize_owner: () => owner,
    authorize_viewer: (context) => context?.token === 'other'
      ? { account_ref: 'account_other_01', workspace_id: 'workspace_other', project_ids: ['outcome'] }
      : owner,
    now: () => BASE, random_bytes: (length) => Buffer.alloc(length, 9),
  })
  const denied = await call(bridge, { method: 'GET', path: '/api/private/bridge/projection', headers: {}, authContext: { token: 'other' }, query: { viewer_ref: 'viewer_other_workstation_01', viewer_class: 'workstation', project_id: 'outcome' } })
  assert.deepEqual(denied, { status: 404, body: { error: 'bridge_unavailable' } })
  assert.doesNotMatch(JSON.stringify(denied), /outcome|workspace|source|project/i)
})

test('F2 JSON pollution and client authority fail before authorization or storage', async () => {
  let authCalls = 0
  let storeCommits = 0
  const bridge = createHostedObserverBridge({
    feature_enabled: true, ingest_enabled: true, bindings: [binding], viewers,
    authorize_owner: () => { authCalls += 1; return owner }, authorize_viewer: () => owner,
    now: () => BASE, random_bytes: (length) => Buffer.alloc(length, 10),
    transaction_store: { commit: () => { storeCommits += 1; return true } },
  })
  const headers = { 'content-type': 'application/json', origin: 'https://preview.example', 'x-outcome-csrf': 'csrf-safe-value' }
  const bodies = [
    '{"__proto__":{"token":"owner"}}',
    '{"constructor":{"token":"owner"}}',
    '{"project_id":"outcome","nested":{"prototype":{"token":"owner"}}}',
    JSON.stringify({ ...binding, mode: 'enroll', idempotency_key: 'authority-key-01', auth_context: { token: 'owner' } }),
  ]
  for (const rawBody of bodies) {
    const denied = await call(bridge, { method: 'POST', path: '/api/private/bridge/enrollments', headers, rawBody, authContext: { token: 'wrong' } })
    assert.equal(denied.status, 400)
  }
  assert.equal(authCalls, 0)
  assert.equal(storeCommits, 0)
})

test('F3 raw parser enforces UTF-8 byte boundary and rejects malformed or duplicate JSON pre-auth', async () => {
  let authCalls = 0
  let storeCommits = 0
  const compact = JSON.stringify({ ...binding, mode: 'enroll', idempotency_key: 'byte-boundary-01' })
  const maxBytes = Buffer.byteLength(compact, 'utf8')
  const bridge = createHostedObserverBridge({
    feature_enabled: true, ingest_enabled: true, bindings: [binding], viewers,
    authorize_owner: () => { authCalls += 1; return owner }, authorize_viewer: () => owner,
    now: () => BASE, random_bytes: (length) => Buffer.alloc(length, 11), max_body_bytes: maxBytes,
    transaction_store: { commit: () => { storeCommits += 1; return true } },
  })
  const headers = { 'content-type': 'application/json', origin: 'https://preview.example', 'x-outcome-csrf': 'csrf-safe-value' }
  assert.equal((await call(bridge, { method: 'POST', path: '/api/private/bridge/enrollments', headers, rawBody: Buffer.from(compact), authContext: { token: 'owner' } })).status, 201)
  const before = { authCalls, storeCommits }
  const rejected = [
    `${compact} `,
    `${compact.slice(0, -1)},"메모":"가"}`,
    '{"project_id":"outcome",',
    '{"project_id":"outcome","project_id":"outcome"}',
    '{"nested":{"__proto__":true}}',
    Buffer.from([0xff, 0xfe, 0xfd]),
  ]
  for (const rawBody of rejected) assert.equal((await call(bridge, { method: 'POST', path: '/api/private/bridge/enrollments', headers, rawBody, authContext: { token: 'owner' } })).status, 400)
  assert.deepEqual({ authCalls, storeCommits }, before)
})
