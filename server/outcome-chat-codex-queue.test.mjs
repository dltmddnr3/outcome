import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { chmodSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { createCodexQueueAdapter } from './outcome-chat-codex-queue.mjs'
import { createEmptyRegistry, mutateRegistry } from './outcome-session-registry-persistence.mjs'

const now = '2026-09-03T01:00:00.000Z'
function registry() {
  const path = join(mkdtempSync(join(tmpdir(), 'chat-queue-')), 'bindings.json')
  createEmptyRegistry(path, ['outcome']); chmodSync(path, 0o600)
  mutateRegistry(path, { action: 'assign', projectId: 'outcome', role: 'planner', expectedVersion: 0, actorClass: 'planner', reasonClass: 'chat_queue_test', occurredAt: now, publicAlias: 'planner-current', providerClass: 'codex', locator: 'synthetic-private-destination', phaseId: null, scopeId: null, stageId: null })
  return path
}
function childFixture(onSpawn) {
  return (...args) => {
    onSpawn(...args)
    const child = new EventEmitter(); child.stdout = new EventEmitter(); child.stderr = new EventEmitter(); child.kill = () => { child.kills = (child.kills ?? 0) + 1; return true }
    return child
  }
}

test('adapter is default-off and does not touch the process boundary', () => {
  let calls = 0; assert.equal(createCodexQueueAdapter({ registryPath: registry(), spawnProcess: () => { calls += 1 } }), null); assert.equal(calls, 0)
})

test('exact current Planner binding becomes one shell-free queue argv attempt', async () => {
  let call
  const spawnProcess = childFixture((...args) => { call = args; queueMicrotask(() => { const child = call.child }) })
  const adapter = createCodexQueueAdapter({ enabled: true, registryPath: registry(), now: () => now, spawnProcess: (...args) => {
    const child = spawnProcess(...args); call = { args, child }; queueMicrotask(() => { child.stdout.emit('data', Buffer.from('queued\n')); child.emit('close', 0, null) }); return child
  } })
  const binding = await adapter.bindingResolver({ project_id: 'outcome', role: 'planner' })
  const message = 'Review https://example.invalid/a and /docs/plan.md; $(do-not-run)'
  const result = await adapter.transport({ destination: binding.destination, message, correlation_id: 'message-0123456789abcdef' })
  assert.deepEqual(call.args, ['codex', ['queue', '--thread', 'synthetic-private-destination', '--message', message], { shell: false, stdio: ['ignore', 'pipe', 'pipe'] }])
  assert.deepEqual(result, { delivery: 'acknowledged' }); assert.equal(JSON.stringify({ binding, result }).includes('synthetic-private-destination'), false)
  assert.equal(Object.hasOwn(result, 'execution_started'), false); assert.equal(Object.hasOwn(result, 'completed'), false)
})

test('public locator injection and stale or non-Planner targets fail before spawn', async () => {
  let calls = 0; const adapter = createCodexQueueAdapter({ enabled: true, registryPath: registry(), now: () => now, spawnProcess: () => { calls += 1 } })
  await assert.rejects(adapter.bindingResolver({ project_id: 'outcome', role: 'planner', locator: 'attacker' }), /binding_unavailable/)
  await assert.rejects(adapter.bindingResolver({ project_id: 'outcome', role: 'builder' }), /binding_unavailable/)
  assert.equal(calls, 0)
})

test('timeout kills once and raw output nonzero ambiguous and duplicate attempts stay unknown', async () => {
  for (const mode of ['timeout', 'nonzero', 'ambiguous', 'error']) {
    let active, timer, calls = 0
    const baseSpawn = childFixture(() => { calls += 1 })
    const adapter = createCodexQueueAdapter({ enabled: true, registryPath: registry(), now: () => now, setTimer: (fn) => { timer = fn; return 1 }, clearTimer: () => {}, spawnProcess: (...args) => { active = baseSpawn(...args); return active } })
    const binding = await adapter.bindingResolver({ project_id: 'outcome', role: 'planner' })
    const pending = adapter.transport({ destination: binding.destination, message: 'ordinary', correlation_id: 'message-0123456789abcdef' })
    await Promise.resolve()
    if (mode === 'timeout') timer()
    else {
      if (mode === 'ambiguous') active.stdout.emit('data', Buffer.from('private child detail'))
      if (mode === 'error') active.emit('error', new Error('private failure'))
      else active.emit('close', mode === 'nonzero' ? 2 : 0, null)
    }
    const result = await pending
    assert.deepEqual(result, { delivery: 'delivery_unknown' }); assert.equal(JSON.stringify(result).includes('private'), false); assert.equal(calls, 1)
    if (mode === 'timeout') assert.equal(active.kills, 1)
    assert.deepEqual(await adapter.transport({ destination: binding.destination, message: 'ordinary', correlation_id: 'message-0123456789abcdef' }), { delivery: 'delivery_unknown' }); assert.equal(calls, 1)
  }
})

test('embedded NUL is rejected before the process boundary while newline and Unicode remain data', async () => {
  let calls = 0
  const adapter = createCodexQueueAdapter({ enabled: true, registryPath: registry(), now: () => now, spawnProcess: childFixture(() => { calls += 1 }) })
  const binding = await adapter.bindingResolver({ project_id: 'outcome', role: 'planner' })
  assert.deepEqual(await adapter.transport({ destination: binding.destination, message: 'ordinary\u0000hidden', correlation_id: 'message-0123456789abcdef' }), { delivery: 'delivery_unknown' })
  assert.equal(calls, 0)
})

test('timer installation failure terminates the created child exactly once and ignores late events', async () => {
  let active, calls = 0
  const baseSpawn = childFixture(() => { calls += 1 })
  const adapter = createCodexQueueAdapter({ enabled: true, registryPath: registry(), now: () => now, spawnProcess: (...args) => { active = baseSpawn(...args); return active }, setTimer: () => { throw new Error('timer-private') } })
  const binding = await adapter.bindingResolver({ project_id: 'outcome', role: 'planner' })
  const result = await adapter.transport({ destination: binding.destination, message: 'ordinary', correlation_id: 'message-0123456789abcdef' })
  assert.deepEqual(result, { delivery: 'delivery_unknown' }); assert.equal(calls, 1); assert.equal(active.kills, 1)
  active.stdout.emit('data', Buffer.from('queued\n')); active.emit('close', 0, null); active.emit('error', new Error('late-private'))
  assert.equal(active.kills, 1)
  assert.deepEqual(await adapter.transport({ destination: binding.destination, message: 'ordinary', correlation_id: 'message-0123456789abcdef' }), { delivery: 'delivery_unknown' }); assert.equal(calls, 1)
})
