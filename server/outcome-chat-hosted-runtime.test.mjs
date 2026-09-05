import assert from 'node:assert/strict'
import test from 'node:test'
import { OUTCOME_CHAT_HOSTED_ENV, createOutcomeChatHostedRuntimeFactory, createOutcomeChatHostedService, createOutcomeChatRateLimiter, readOutcomeChatHostedConfiguration } from './outcome-chat-hosted-runtime.mjs'

const environment = () => ({
  [OUTCOME_CHAT_HOSTED_ENV.enabled]: '1',
  [OUTCOME_CHAT_HOSTED_ENV.databaseUrl]: 'postgresql://outcome_chat_runtime.abcdefghijklmnopqrst:synthetic%2Dpassword@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=verify-full',
  [OUTCOME_CHAT_HOSTED_ENV.databaseCaPem]: '-----BEGIN CERTIFICATE-----\nQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVo=\n-----END CERTIFICATE-----',
  [OUTCOME_CHAT_HOSTED_ENV.csrfSecret]: 'synthetic-csrf-boundary-value-123456',
  [OUTCOME_CHAT_HOSTED_ENV.supabaseUrl]: 'https://abcdefghijklmnopqrst.supabase.co',
  VERCEL_ENV: 'preview', VERCEL_URL: 'preview.invalid.vercel.app',
})

test('hosted configuration is default-off and rejects TLS weakening, missing values and hostile carriers', () => {
  assert.equal(readOutcomeChatHostedConfiguration({}).enabled, false)
  for (const change of [{ NODE_TLS_REJECT_UNAUTHORIZED: '0' }, { [OUTCOME_CHAT_HOSTED_ENV.enabled]: '0' }, { [OUTCOME_CHAT_HOSTED_ENV.databaseCaPem]: '' }, { [OUTCOME_CHAT_HOSTED_ENV.databaseUrl]: 'postgresql://outcome_chat_runtime:x@db.invalid/outcome?sslmode=no-verify' }]) assert.equal(readOutcomeChatHostedConfiguration({ ...environment(), ...change }).enabled, false)
  let hits = 0
  const accessor = environment(); Object.defineProperty(accessor, OUTCOME_CHAT_HOSTED_ENV.databaseUrl, { enumerable: true, get() { hits += 1; return 'private' } })
  assert.equal(readOutcomeChatHostedConfiguration(accessor).enabled, false); assert.equal(hits, 0)
  assert.equal(readOutcomeChatHostedConfiguration(new Proxy(environment(), { getOwnPropertyDescriptor() { hits += 1; throw new Error('trap') } })).enabled, false); assert.equal(hits, 0)
})

test('malformed and non-canonical database URL encoding always disables without throwing', () => {
  for (const databaseUrl of ['postgresql://outcome_chat_runtime%E0%A4%A:x@db.invalid/outcome?sslmode=verify-full', 'postgresql://outcome_chat_runtime:x%E0%A4%A@db.invalid/outcome?sslmode=verify-full', 'postgresql://outcome_chat_runtime:x%2f@db.invalid/outcome?sslmode=verify-full', 'postgresql://outcome%5Fchat_runtime:x@db.invalid/outcome?sslmode=verify-full', 'postgresql://outcome_chat_runtime:x@db.invalid/outcome?sslmode=verify%2Dfull', environment()[OUTCOME_CHAT_HOSTED_ENV.databaseUrl] + '&application_name=expanded', environment()[OUTCOME_CHAT_HOSTED_ENV.databaseUrl].replace('sslmode=verify-full', 'sslmode=verify-full&sslmode=verify-full')]) {
    assert.doesNotThrow(() => assert.deepEqual(readOutcomeChatHostedConfiguration({ ...environment(), [OUTCOME_CHAT_HOSTED_ENV.databaseUrl]: databaseUrl }), { enabled: false }))
  }
})

test('hosted pooler username suffix is bound to the exact canonical Supabase project ref', () => {
  assert.equal(readOutcomeChatHostedConfiguration(environment()).enabled, true)
  for (const change of [
    { [OUTCOME_CHAT_HOSTED_ENV.supabaseUrl]: '' },
    { [OUTCOME_CHAT_HOSTED_ENV.supabaseUrl]: 'https://bcdefghijklmnopqrstu.supabase.co' },
    { [OUTCOME_CHAT_HOSTED_ENV.supabaseUrl]: 'https://ABCDEFGHIJKLMNOPQRST.supabase.co' },
    { [OUTCOME_CHAT_HOSTED_ENV.supabaseUrl]: 'https://abcdefghijklmnopqrst.extra.supabase.co' },
    { [OUTCOME_CHAT_HOSTED_ENV.supabaseUrl]: 'https://abcdefghijklmnopqrst.supabase.co?x=1' },
    { [OUTCOME_CHAT_HOSTED_ENV.databaseUrl]: environment()[OUTCOME_CHAT_HOSTED_ENV.databaseUrl].replace('abcdefghijklmnopqrst', 'bcdefghijklmnopqrstu') },
  ]) assert.deepEqual(readOutcomeChatHostedConfiguration({ ...environment(), ...change }), { enabled: false })
})

test('rate limiter has separate owner-scoped route buckets, bounded memory, expiry and finite denial', () => {
  let clock = 0
  const limiter = createOutcomeChatRateLimiter({ now: () => clock, windowMs: 1_000, timelineLimit: 2, submitLimit: 1, maxEntries: 2 })
  const scope = (account_ref, route_class = 'submit') => ({ account_ref, workspace_id: 'account-only-preview', project_id: 'outcome', route_class })
  assert.deepEqual(limiter.check(scope('a'.repeat(64))), { allowed: true })
  const denied = limiter.check(scope('a'.repeat(64))); assert.equal(denied.allowed, false); assert.equal(denied.retryAfter, 1); assert.equal(JSON.stringify(denied).includes('account-only-preview'), false)
  assert.deepEqual(limiter.check(scope('b'.repeat(64))), { allowed: true })
  assert.deepEqual(limiter.check(scope('a'.repeat(64), 'timeline')), { allowed: false, retryAfter: 1 })
  assert.deepEqual(limiter.check(scope('a'.repeat(64))), { allowed: false, retryAfter: 1 })
  assert.equal(limiter.inspect().entry_count <= 2, true)
  clock = 1_001; assert.deepEqual(limiter.check(scope('a'.repeat(64))), { allowed: true })
  assert.deepEqual(limiter.check({}), { allowed: false, retryAfter: 1 })
  let hits = 0
  const proxy = new Proxy(scope('c'.repeat(64)), { getOwnPropertyDescriptor() { hits += 1; throw new Error('trap') } })
  assert.deepEqual(limiter.check(proxy), { allowed: false, retryAfter: 1 }); assert.equal(hits, 0)
  assert.deepEqual(createOutcomeChatRateLimiter({ now: () => { throw new Error('clock') }, windowMs: 1_000 }).check(scope('c'.repeat(64))), { allowed: false, retryAfter: 1 })
})

test('capacity never evicts active buckets at one or N and admits only after expiry', () => {
  for (const maxEntries of [1, 3]) {
    let clock = 0
    const limiter = createOutcomeChatRateLimiter({ now: () => clock, windowMs: 2_000, timelineLimit: 2, submitLimit: 1, maxEntries })
    const scope = (index, route_class = 'submit') => ({ account_ref: index.toString(16).padStart(64, '0'), workspace_id: 'account-only-preview', project_id: 'outcome', route_class })
    for (let index = 1; index <= maxEntries; index += 1) assert.deepEqual(limiter.check(scope(index, index === 1 ? 'timeline' : 'submit')), { allowed: true })
    for (let index = maxEntries + 1; index <= maxEntries + 20; index += 1) assert.deepEqual(limiter.check(scope(index)), { allowed: false, retryAfter: 2 })
    assert.deepEqual(limiter.check(scope(1, 'timeline')), { allowed: true })
    assert.deepEqual(limiter.check(scope(1, 'timeline')), { allowed: false, retryAfter: 2 })
    assert.equal(limiter.inspect().entry_count, maxEntries)
    clock = 2_001
    assert.deepEqual(limiter.check(scope(maxEntries + 1)), { allowed: true })
    assert.equal(limiter.inspect().entry_count, 1)
  }
})

test('hosted submit authorizes exact owner workspace and persists only a queued record', async () => {
  const calls = []
  const repository = { async reserve(value) { calls.push(value); return { accepted: true, sequence: 1, event_id: 'event-0000000000000001', dispatch_state: 'not_invoked', delivery: 'delivery_unknown', execution_started: false, result_attached: false, evidence_attached: false } }, async timeline() { return [] } }
  const service = createOutcomeChatHostedService({ repository, bindingVersion: 3, workspaceId: 'account-only-preview', projectId: 'outcome', now: () => '2026-09-03T00:00:00.000Z' })
  const owner = { authenticated: true, actor: 'cherry_owner', workspace_id: 'account-only-preview', account_ref: 'a'.repeat(64), project_ids: ['outcome'] }
  const result = await service.submitPlannerMessage({ project_id: 'outcome', message: 'durable hello', idempotency_key: 'message-0000000000000001', owner })
  assert.equal(result.dispatch_state, 'not_invoked'); assert.equal(calls.length, 1)
  assert.equal(JSON.stringify(calls).includes('locator'), false)
  await assert.rejects(() => service.submitPlannerMessage({ project_id: 'other', message: 'no', idempotency_key: 'message-0000000000000002', owner }), /access_denied/)
})

test('fresh service instance reads the same server-authoritative ordered timeline', async () => {
  const events = [{ event_id: 'event-0000000000000001', sequence: 1, observed_at: '2026-09-03T00:00:00.000Z', kind: 'user_message', state: 'queued', correlation_id: 'message-0000000000000001', payload: { private_content: { text: 'persisted' } }, delivery: 'failed', dispatch_state: 'dispatch_intent_recorded' }]
  const calls = []
  const repository = { async reserve() {}, async timeline(scope) { calls.push(scope); return structuredClone(events) } }
  const options = { repository, bindingVersion: 3, workspaceId: 'account-only-preview', projectId: 'outcome' }
  const owner = { authenticated: true, actor: 'cherry_owner', workspace_id: 'account-only-preview', account_ref: 'a'.repeat(64), project_ids: ['outcome'] }
  for (const service of [createOutcomeChatHostedService(options), createOutcomeChatHostedService(options)]) {
    const result = await service.timeline({ project_id: 'outcome', binding_version: 99, after_sequence: 0, owner })
    assert.deepEqual(result.events, events); assert.equal(result.target.binding_version, 3)
    assert.deepEqual(calls.at(-1), { workspace_id: 'account-only-preview', project_id: 'outcome', binding_version: 3, after_sequence: 0 })
    const before = calls.length
    for (const patch of [{ authenticated: false }, { actor: 'other' }, { workspace_id: 'other' }, { project_ids: ['other'] }, { account_ref: 'invalid' }]) await assert.rejects(service.timeline({ project_id: 'outcome', after_sequence: 0, owner: { ...owner, ...patch } }), /access_denied/)
    await assert.rejects(service.timeline({ project_id: 'other', after_sequence: 0, owner }), /access_denied/)
    assert.equal(calls.length, before)
  }
  assert.equal(calls.length, 2)
})

test('hosted runtime factory pins verified TLS and the runtime login without exposing configuration values', async () => {
  let options
  class Pool { constructor(value) { options = value } async connect() { throw new Error('unused') } }
  const repository = { reserve() {}, timeline() {} }
  const runtime = await createOutcomeChatHostedRuntimeFactory({ environment: environment(), driverLoader: async () => ({ Pool }), repositoryFactory: () => repository })({ accountRuntime: { service: { resolveBridgeAuthority() {} } }, allowedOrigin: 'https://preview.invalid.vercel.app' })
  assert.ok(runtime)
  assert.equal(options.connectionString, 'postgresql://outcome_chat_runtime.abcdefghijklmnopqrst:synthetic%2Dpassword@aws-0-us-east-1.pooler.supabase.com:6543/postgres')
  assert.deepEqual(options.ssl, { ca: environment()[OUTCOME_CHAT_HOSTED_ENV.databaseCaPem], rejectUnauthorized: true })
  assert.equal(JSON.stringify(readOutcomeChatHostedConfiguration(environment())).includes('synthetic'), false)
  assert.equal(runtime.createService('account-only-preview') !== null, true)
  const scope = { account_ref: 'a'.repeat(64), workspace_id: 'account-only-preview', project_id: 'outcome', route_class: 'submit' }
  for (let index = 0; index < 10; index += 1) assert.deepEqual(runtime.rateLimit(scope), { allowed: true })
  assert.deepEqual(runtime.rateLimit(scope), { allowed: false, retryAfter: 60 })
})
