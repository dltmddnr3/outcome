import assert from 'node:assert/strict'
import test from 'node:test'
import {
  INVENTORY,
  PROHIBITED_PUBLIC_PATTERN,
  SyntheticDispatchAdapter,
  buildNoopTurnStart,
  decideCapability,
  normalizeBinding,
  observeSynthetic,
  sanitizePublic,
  validateInventory,
} from './codex-adapter.mjs'

const expected = { projectId: 'outcome', role: 'builder' }
const binding = { state: 'bound', projectId: 'outcome', role: 'builder', targetRef: 'private-synthetic-target' }
const request = { binding, projectId: 'outcome', role: 'builder', instruction: 'synthetic instruction', idempotencyKey: 'attempt-a' }

test('S1 inventory fixes supported unsupported and unknown official capabilities', () => {
  assert.equal(validateInventory(), true)
  assert.equal(INVENTORY.capabilities.observeExactThread.status, 'supported')
  assert.equal(INVENTORY.capabilities.authenticationSurface.status, 'supported')
  assert.equal(INVENTORY.capabilities.nativeProjectRoleBinding.status, 'unsupported')
  assert.equal(INVENTORY.capabilities.incrementalCost.status, 'unknown')
  assert.equal(INVENTORY.capabilities.websocketProduction.status, 'unsupported')
})

test('S2 observation maps an exact synthetic binding without exposing its private target', () => {
  const result = observeSynthetic({ binding, expected, observation: { state: 'idle', observedAt: '2026-08-26T00:00:00Z' } })
  assert.deepEqual(result, { source: 'codex_app_server', state: 'idle', reason: null, observedAt: '2026-08-26T00:00:00Z' })
  assert.equal(JSON.stringify(result).includes(binding.targetRef), false)
})

test('S2 observation fails closed for wrong project role and missing binding', () => {
  assert.equal(normalizeBinding({ ...binding, projectId: 'other' }, expected).state, 'conflict')
  assert.equal(observeSynthetic({ binding: { state: 'unbound' }, expected, observation: { state: 'active' } }).state, 'unbound')
  assert.equal(observeSynthetic({ binding: null, expected, observation: { state: 'active' } }).state, 'unknown')
})

test('S3 dispatch builds exact turn start envelope but never transmits it', () => {
  const envelope = buildNoopTurnStart({ privateTarget: binding.targetRef, instruction: request.instruction })
  assert.equal(envelope.method, 'turn/start')
  assert.equal(envelope.params.threadId, binding.targetRef)
  assert.equal(envelope.transmitted, false)
})

test('S3 dispatch denies wrong project role binding and unconfirmed high risk', () => {
  const adapter = new SyntheticDispatchAdapter(expected)
  assert.equal(adapter.submit({ ...request, projectId: 'other' }).reason, 'wrong_project')
  assert.equal(adapter.submit({ ...request, role: 'planner' }).reason, 'wrong_role')
  assert.equal(adapter.submit({ ...request, binding: { state: 'unbound' } }).state, 'denied')
  assert.equal(adapter.submit({ ...request, highRisk: true }).reason, 'confirmation_required')
  assert.equal(adapter.actualExecutionCount, 0)
})

test('S3 dispatch treats timeout as unknown and forbids automatic retry', () => {
  const adapter = new SyntheticDispatchAdapter(expected)
  const receipt = adapter.submit({ ...request, outcome: 'timeout' })
  assert.equal(receipt.state, 'delivery_unknown')
  assert.equal(receipt.retryAllowed, false)
  assert.equal(receipt.transmitted, false)
})

test('S3 dispatch deduplicates locally and distinguishes accepted from completed', () => {
  const adapter = new SyntheticDispatchAdapter(expected)
  const first = adapter.submit(request)
  const duplicate = adapter.submit(request)
  assert.equal(first.state, 'accepted_not_complete')
  assert.equal(duplicate.duplicate, true)
  assert.equal(adapter.syntheticAttemptCount, 1)
  assert.equal(adapter.acknowledge('turn/started').terminal, false)
  assert.equal(adapter.acknowledge('turn/completed').terminal, true)
  assert.equal(adapter.actualExecutionCount, 0)
})

test('S4 mapping preserves unsupported null and conflict semantics', () => {
  assert.deepEqual(normalizeBinding(null, expected), { state: 'unknown', reason: 'invalid_binding' })
  assert.deepEqual(normalizeBinding({ state: 'conflict' }, expected), { state: 'conflict', reason: 'binding_conflict' })
  assert.equal(INVENTORY.capabilities.nativeProjectRoleBinding.status, 'unsupported')
})

test('S4 mapping never converts activity or protocol acceptance into completion', () => {
  const adapter = new SyntheticDispatchAdapter(expected)
  assert.equal(adapter.submit(request).terminal, false)
  assert.equal(adapter.acknowledge('response').state, 'accepted_not_complete')
  assert.equal(adapter.acknowledge('unexpected').state, 'unknown')
})

test('S5 boundary strips identifiers paths credentials prompt and result', () => {
  const privateFixture = {
    sessionId: 'synthetic-session',
    thread_id: 'synthetic-thread',
    prompt: 'private prompt',
    result: 'private result',
    nested: {
      targetRef: 'private-target',
      note: 'path /tmp/private-file and token sk-synthetic-value',
      digest: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    },
  }
  const publicText = JSON.stringify(sanitizePublic(privateFixture))
  assert.equal(PROHIBITED_PUBLIC_PATTERN.test(publicText), false)
})

test('S5 boundary keeps safe URLs and state copy while execution remains zero', () => {
  const adapter = new SyntheticDispatchAdapter(expected)
  const safe = sanitizePublic({ source: 'https://developers.openai.com/codex/app-server', state: 'unknown' })
  assert.equal(safe.source, 'https://developers.openai.com/codex/app-server')
  assert.equal(adapter.actualExecutionCount, 0)
})

test('S5 boundary denies high risk without exact confirmation', () => {
  const adapter = new SyntheticDispatchAdapter(expected)
  const receipt = adapter.submit({ ...request, highRisk: true, exactConfirmation: false })
  assert.equal(receipt.state, 'denied')
  assert.equal(receipt.transmitted, false)
  assert.equal(adapter.actualExecutionCount, 0)
})

test('S6 decision is NO_GO with unbound manual navigation fallback', () => {
  const decision = decideCapability()
  assert.equal(decision.decision, 'NO_GO')
  assert.equal(decision.fallback, 'UNBOUND_MANUAL_NAVIGATION')
  assert.deepEqual(decision.blockers, [
    'duplicateIdempotency',
    'timeoutRetry',
    'productRateLimit',
    'incrementalCost',
    'unattendedMacMiniPermission',
    'integrationTerms',
    'credentialLifecycle',
  ])
})
