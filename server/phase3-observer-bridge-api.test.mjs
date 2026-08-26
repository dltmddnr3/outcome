import assert from 'node:assert/strict'
import test from 'node:test'
import { generateKeyPairSync, sign } from 'node:crypto'
import { createHostedObserverBridge, canonicalEnrollmentBytes, canonicalHostedRequestBytes } from './phase3-observer-bridge-hosted.mjs'
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

test('feature off and public routes fail closed without project presence', () => {
  assert.deepEqual(handleHostedObserverBridgeRequest({ method: 'POST', path: '/api/dashboard', headers: {}, rawBody: '{}', authContext: null }), { status: 405, body: { error: 'read_only' } })
  assert.deepEqual(handleHostedObserverBridgeRequest({ method: 'GET', path: '/api/private/bridge/projection', headers: {}, authContext: null }), { status: 404, body: { error: 'bridge_unavailable' } })
})

test('owner enrollment requires exact origin, CSRF pair, account and JSON body', () => {
  const bridge = service()
  const body = { ...binding, mode: 'enroll', idempotency_key: 'enroll-key-01' }
  const base = { method: 'POST', path: '/api/private/bridge/enrollments', headers: { 'content-type': 'application/json', origin: 'https://preview.example', 'x-outcome-csrf': 'csrf-safe-value' }, rawBody: JSON.stringify(body), authContext: { token: 'owner' } }
  assert.equal(call(bridge, base).status, 201)
  for (const input of [
    { ...base, headers: { ...base.headers, origin: 'https://evil.example' } },
    { ...base, headers: { ...base.headers, 'x-outcome-csrf': 'wrong' } },
    { ...base, authContext: { token: 'wrong' } },
    { ...base, headers: { ...base.headers, 'content-type': 'text/plain' } },
    { ...base, rawBody: JSON.stringify({ ...body, auth_context: { token: 'owner' } }), authContext: { token: 'wrong' } },
  ]) assert.notEqual(call(service(), input).status, 201)
})

test('companion completion ignores ambient auth and viewer requires server authorization', () => {
  const bridge = service()
  const begin = call(bridge, { method: 'POST', path: '/api/private/bridge/enrollments', headers: { 'content-type': 'application/json', origin: 'https://preview.example', 'x-outcome-csrf': 'csrf-safe-value' }, rawBody: JSON.stringify({ ...binding, mode: 'enroll', idempotency_key: 'enroll-key-01' }), authContext: { token: 'owner' } })
  const keys = generateKeyPairSync('ed25519')
  const spki = keys.publicKey.export({ format: 'der', type: 'spki' }).toString('base64url')
  const proof = sign(null, canonicalEnrollmentBytes({ ...begin.body.enrollment_scope, challenge_ref: begin.body.challenge_ref, challenge_nonce: begin.body.challenge_nonce, public_key_spki: spki }), keys.privateKey).toString('base64url')
  const complete = call(bridge, { method: 'POST', path: '/api/private/bridge/enrollments/complete', headers: { 'content-type': 'application/json', cookie: '__session=attacker', authorization: 'Bearer attacker' }, rawBody: JSON.stringify({ challenge_ref: begin.body.challenge_ref, public_key_spki: spki, proof_signature: proof }), authContext: { token: 'wrong' } })
  assert.equal(complete.status, 200)
  const unsignedEvent = { schema_version: 1, project_id: 'outcome', role: 'builder', binding_version: 1, source_ref: 'source_alpha_01', source_version: 1, key_version: 1, sequence: 1, observed_at: new Date(BASE).toISOString(), expires_at: new Date(BASE + 60_000).toISOString(), status_code: '구현 진행 중' }
  const event = { ...unsignedEvent, signature: sign(null, canonicalObserverBridgeBytes(unsignedEvent), keys.privateKey).toString('base64url') }
  const request = { certificate_ref: complete.body.certificate_ref, request_id: 'request_alpha_01', nonce: 'nonce_alpha_01', event }
  const ingest = call(bridge, { method: 'POST', path: '/api/private/bridge/events', headers: { 'content-type': 'application/json', cookie: '__session=attacker', authorization: 'Bearer attacker' }, rawBody: JSON.stringify({ ...request, request_signature: sign(null, canonicalHostedRequestBytes(request), keys.privateKey).toString('base64url') }), authContext: { token: 'wrong' } })
  assert.deepEqual(ingest, { status: 200, body: { status: 'accepted', ledger_revision: 1 } })
  assert.equal(call(bridge, { method: 'GET', path: '/api/private/bridge/projection', headers: {}, authContext: null }).status, 404)
  const projection = call(bridge, { method: 'GET', path: '/api/private/bridge/projection', headers: {}, authContext: { token: 'owner' }, query: { viewer_ref: 'viewer_workstation_01', viewer_class: 'workstation', project_id: 'outcome' } })
  assert.equal(projection.status, 200)
  assert.equal(projection.body.projections[0].status_code, '구현 진행 중')
  const cookieOnly = call(bridge, { method: 'POST', path: '/api/private/bridge/events', headers: { 'content-type': 'application/json', cookie: '__session=owner', authorization: 'Bearer owner' }, rawBody: '{}', authContext: { token: 'owner' } })
  assert.equal(cookieOnly.status, 400)
})

test('unknown private paths and methods are finite, non-enumerating and secret-free', () => {
  const bridge = service()
  const responses = [
    call(bridge, { method: 'GET', path: '/api/private/bridge/missing', headers: {}, authContext: null }),
    call(bridge, { method: 'PATCH', path: '/api/private/bridge/projection', headers: {}, authContext: { token: 'owner' } }),
  ]
  assert.deepEqual(responses.map((value) => value.status), [404, 405])
  assert.doesNotMatch(JSON.stringify(responses), /outcome|workspace|account|token|cookie|signature|certificate|session|thread|path/i)
})

test('Proxy and accessor request bodies are rejected without trap or getter execution', () => {
  const bridge = service()
  let hits = 0
  const proxy = new Proxy({}, { ownKeys() { hits += 1; return [] }, get() { hits += 1 } })
  const proxyResponse = call(bridge, { method: 'POST', path: '/api/private/bridge/enrollments', headers: { 'content-type': 'application/json', origin: 'https://preview.example', 'x-outcome-csrf': 'csrf-safe-value' }, rawBody: proxy, authContext: { token: 'owner' } })
  assert.equal(proxyResponse.status, 400)
  assert.equal(hits, 0)
  const accessor = {}
  Object.defineProperty(accessor, 'project_id', { enumerable: true, get() { hits += 1; return 'outcome' } })
  const accessorResponse = call(bridge, { method: 'POST', path: '/api/private/bridge/enrollments', headers: { 'content-type': 'application/json', origin: 'https://preview.example', 'x-outcome-csrf': 'csrf-safe-value' }, rawBody: accessor, authContext: { token: 'owner' } })
  assert.equal(accessorResponse.status, 400)
  assert.equal(hits, 0)
})

test('QA RED F3 counts actual raw padded UTF-8 bytes before parsing', () => {
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
  assert.equal(call(bridge, { method: 'POST', path: '/api/private/bridge/enrollments', headers, rawBody: compact, authContext: { token: 'owner' } }).status, 201)
  const commitsBeforeOversize = storeCommits
  const result = call(bridge, { method: 'POST', path: '/api/private/bridge/enrollments', headers, rawBody: padded, authContext: { token: 'owner' } })
  assert.equal(result.status, 400)
  assert.equal(storeCommits, commitsBeforeOversize)
})

test('F1 API does not reveal same-named project across workspace boundaries', () => {
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
  const denied = call(bridge, { method: 'GET', path: '/api/private/bridge/projection', headers: {}, authContext: { token: 'other' }, query: { viewer_ref: 'viewer_other_workstation_01', viewer_class: 'workstation', project_id: 'outcome' } })
  assert.deepEqual(denied, { status: 404, body: { error: 'bridge_unavailable' } })
  assert.doesNotMatch(JSON.stringify(denied), /outcome|workspace|source|project/i)
})

test('F2 JSON pollution and client authority fail before authorization or storage', () => {
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
    const denied = call(bridge, { method: 'POST', path: '/api/private/bridge/enrollments', headers, rawBody, authContext: { token: 'wrong' } })
    assert.equal(denied.status, 400)
  }
  assert.equal(authCalls, 0)
  assert.equal(storeCommits, 0)
})

test('F3 raw parser enforces UTF-8 byte boundary and rejects malformed or duplicate JSON pre-auth', () => {
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
  assert.equal(call(bridge, { method: 'POST', path: '/api/private/bridge/enrollments', headers, rawBody: Buffer.from(compact), authContext: { token: 'owner' } }).status, 201)
  const before = { authCalls, storeCommits }
  const rejected = [
    `${compact} `,
    `${compact.slice(0, -1)},"메모":"가"}`,
    '{"project_id":"outcome",',
    '{"project_id":"outcome","project_id":"outcome"}',
    '{"nested":{"__proto__":true}}',
    Buffer.from([0xff, 0xfe, 0xfd]),
  ]
  for (const rawBody of rejected) assert.equal(call(bridge, { method: 'POST', path: '/api/private/bridge/enrollments', headers, rawBody, authContext: { token: 'owner' } }).status, 400)
  assert.deepEqual({ authCalls, storeCommits }, before)
})
