import assert from 'node:assert/strict'
import test from 'node:test'
import { createOutcomeChatConsumer } from './outcome-chat-consumer.mjs'

const message = { message_id: 'event-0000000000000001', claim_token: 'claim-0000000000000001', project_id: 'outcome', binding_version: 3, idempotency_key: 'message-0000000000000001', message: 'durable hello' }

test('consumer claims one ordered item, resolves binding immediately before transport and persists acknowledgement truth', async () => {
  const calls = []
  const repository = { async claim() { calls.push('claim'); return message }, async recordIntent() { calls.push('intent') }, async recordInvoked() { calls.push('invoked') }, async finalize(value) { calls.push(['finalize', value.delivery]) } }
  const destination = Object.freeze({ opaque: true })
  const consumer = createOutcomeChatConsumer({ repository, bindingResolver: async () => { calls.push('resolve'); return { project_id: 'outcome', role: 'planner', binding_version: 3, status: 'active', freshness: 'fresh', destination } }, transport: async (value) => { calls.push(['transport', value.destination === destination]); return { delivery: 'acknowledged' } }, consumerId: 'consumer-main', now: () => '2026-09-03T00:00:00.000Z' })
  assert.deepEqual(await consumer.runOnce(), { outcome: 'acknowledged' })
  assert.deepEqual(calls, ['claim', 'intent', 'resolve', 'invoked', ['transport', true], ['finalize', 'acknowledged']])
})

test('consumer never accepts a hosted locator and binding drift fails before transport without replay', async () => {
  let transport = 0
  const repository = { async claim() { return { ...message, locator: 'forbidden' } }, async recordIntent() {}, async recordInvoked() {}, async finalize() {} }
  const consumer = createOutcomeChatConsumer({ repository, bindingResolver: async () => ({ project_id: 'outcome', role: 'planner', binding_version: 4, status: 'active', freshness: 'fresh', destination: Object.freeze({ opaque: true }) }), transport: async () => { transport += 1 }, consumerId: 'consumer-main' })
  assert.deepEqual(await consumer.runOnce(), { outcome: 'failed' }); assert.equal(transport, 0)
})

test('post-intent resolver failure and transport ambiguity are terminal and never retried', async () => {
  for (const scenario of ['resolver', 'transport']) {
    const calls = { claim: 0, transport: 0, finalize: [] }
    const repository = { async claim() { calls.claim += 1; return message }, async recordIntent() {}, async recordInvoked() {}, async finalize(value) { calls.finalize.push(value.delivery) } }
    const consumer = createOutcomeChatConsumer({ repository, bindingResolver: async () => { if (scenario === 'resolver') throw new Error('private'); return { project_id: 'outcome', role: 'planner', binding_version: 3, status: 'active', freshness: 'fresh', destination: Object.freeze({ opaque: true }) } }, transport: async () => { calls.transport += 1; throw new Error('ambiguous') }, consumerId: 'consumer-main' })
    assert.deepEqual(await consumer.runOnce(), { outcome: scenario === 'resolver' ? 'failed' : 'delivery_unknown' })
    assert.equal(calls.claim, 1); assert.equal(calls.transport, scenario === 'transport' ? 1 : 0); assert.deepEqual(calls.finalize, [scenario === 'resolver' ? 'failed' : 'delivery_unknown'])
  }
})

test('crash boundaries before intent, before invocation and after invocation never call transport twice', async () => {
  for (const boundary of ['intent', 'invoked', 'finalize']) {
    let transport = 0
    const repository = {
      async claim() { return message },
      async recordIntent() { if (boundary === 'intent') throw new Error('crash') },
      async recordInvoked() { if (boundary === 'invoked') throw new Error('crash') },
      async finalize() { if (boundary === 'finalize') throw new Error('crash') },
    }
    const consumer = createOutcomeChatConsumer({ repository, bindingResolver: async () => ({ project_id: 'outcome', role: 'planner', binding_version: 3, status: 'active', freshness: 'fresh', destination: Object.freeze({ opaque: true }) }), transport: async () => { transport += 1; return { delivery: 'acknowledged' } }, consumerId: 'consumer-main' })
    await consumer.runOnce(); assert.equal(transport, boundary === 'finalize' ? 1 : 0)
    assert.deepEqual(await consumer.runOnce(), { outcome: 'failed' }); assert.equal(transport, boundary === 'finalize' ? 1 : 0)
  }
})
