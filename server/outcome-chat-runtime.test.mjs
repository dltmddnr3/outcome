import assert from 'node:assert/strict'
import test from 'node:test'
import { createInMemoryChatRepository } from './outcome-chat.mjs'
import { createOutcomeChatConsumerRuntime, createOutcomeChatRuntime } from './outcome-chat-runtime.mjs'

test('runtime is default-off and never substitutes an in-process repository', () => {
  assert.equal(createOutcomeChatRuntime(), null)
  assert.equal(createOutcomeChatRuntime({ transportEnabled: true }), null)
})

test('explicit injected boundaries construct the private runtime without invoking transport', () => {
  let transports = 0
  const runtime = createOutcomeChatRuntime({ transportEnabled: true, repository: createInMemoryChatRepository(), bindingResolver: async () => ({ project_id: 'outcome', role: 'planner', binding_version: 1, status: 'active', freshness: 'fresh', destination: { opaque: true } }), transport: async () => { transports += 1 }, ownerVerifier: async () => ({ authenticated: true, actor: 'cherry_owner' }) })
  assert.equal(typeof runtime?.submitPlannerMessage, 'function'); assert.equal(transports, 0)
})

test('official queue adapter can be injected without invoking it during construction', () => {
  let calls = 0
  const queueAdapter = { bindingResolver: async () => ({}), transport: async () => { calls += 1 } }
  const runtime = createOutcomeChatRuntime({ transportEnabled: true, repository: createInMemoryChatRepository(), queueAdapter, ownerVerifier: async () => ({ authenticated: true, actor: 'cherry_owner' }) })
  assert.equal(typeof runtime?.submitPlannerMessage, 'function'); assert.equal(calls, 0)
})

test('consumer runtime is default-off and accepts only the audited queue adapter boundary', () => {
  const repository = { claim() {}, recordIntent() {}, recordInvoked() {}, finalize() {} }
  const queueAdapter = { bindingResolver() {}, transport() {} }
  assert.equal(createOutcomeChatConsumerRuntime({ repository, queueAdapter, consumerId: 'consumer-main' }), null)
  assert.equal(createOutcomeChatConsumerRuntime({ consumerEnabled: true, repository, queueAdapter: { transport() {} }, consumerId: 'consumer-main' }), null)
  const runtime = createOutcomeChatConsumerRuntime({ consumerEnabled: true, repository, queueAdapter, consumerId: 'consumer-main' })
  assert.equal(typeof runtime.runOnce, 'function')
  assert.equal(JSON.stringify(runtime).includes('locator'), false)
})
