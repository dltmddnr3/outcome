import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { chmodSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { createCodexQueueAdapter } from './outcome-chat-codex-queue.mjs'
import { plannerRequestEnvelope } from './outcome-chat-result-source.mjs'
import { createEmptyRegistry, mutateRegistry } from './outcome-session-registry-persistence.mjs'

const now = '2026-09-03T01:00:00.000Z'

test('live ownership and metadata refresh binding proof without rewriting registry', async () => {
  const path = registry(), before = readFileSync(path), cwd = '/synthetic/project'; let probes = 0
  const adapter = createCodexQueueAdapter({ enabled: true, registryPath: path, now: () => '2026-09-04T01:00:00.000Z', expectedCwd: cwd,
    ownerProbe: async () => { probes++; return true }, readThread: async (id, options) => {
      assert.deepEqual(options, { includeTurns: false }); return JSON.stringify({ thread: { id, cwd, status: { type: 'notLoaded' } } })
    },
  })
  const binding = await adapter.bindingResolver({ project_id: 'outcome', role: 'planner' })
  assert.equal(binding.freshness, 'fresh'); assert.equal(probes, 2)
  assert.equal(Object.hasOwn(binding, 'execution_started'), false)
  assert.deepEqual(readFileSync(path), before)
})

test('live proof fails on missing owner, metadata mismatch or binding drift', async () => {
  for (const mode of ['owner', 'cwd', 'id', 'drift', 'late-owner']) {
    const path = registry(); let calls = 0, probes = 0
    const adapter = createCodexQueueAdapter({ enabled: true, registryPath: path, now: () => now, expectedCwd: '/synthetic/project',
      spawnProcess: () => { calls++ }, ownerProbe: async () => { probes++; return mode !== 'owner' && !(mode === 'late-owner' && probes === 2) },
      readThread: async id => {
        if (mode === 'drift') mutateRegistry(path, { action: 'observe', projectId: 'outcome', role: 'planner', expectedVersion: 1, actorClass: 'observer', reasonClass: 'test_stale', occurredAt: now, observedAt: now, status: 'stale' })
        return JSON.stringify({ thread: { id: mode === 'id' ? 'other' : id, cwd: mode === 'cwd' ? '/other' : '/synthetic/project' } })
      },
    })
    await assert.rejects(adapter.bindingResolver({ project_id: 'outcome', role: 'planner' }), /binding_unavailable/)
    assert.equal(calls, 0)
  }
})

test('loss of live owner after resolution prevents the queue invocation', async () => {
  let available = true, calls = 0
  const adapter = createCodexQueueAdapter({ enabled: true, registryPath: registry(), now: () => now, expectedCwd: '/synthetic/project',
    ownerProbe: async () => available, readThread: async id => JSON.stringify({ thread: { id, cwd: '/synthetic/project' } }),
    spawnProcess: () => { calls++ },
  })
  const binding = await adapter.bindingResolver({ project_id: 'outcome', role: 'planner' }); available = false
  assert.deepEqual(await adapter.transport({ destination: binding.destination, message: 'ordinary', correlation_id: 'message-0123456789abcdef' }), { delivery: 'delivery_unknown' })
  assert.equal(calls, 0)
})
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

test('transport rechecks binding status and freshness immediately before spawn', async () => {
  for (const mode of ['stale', 'expired', 'future']) {
    const path = registry(); let calls = 0, clock = now
    const adapter = createCodexQueueAdapter({ enabled:true, registryPath:path, now:()=>clock, spawnProcess:()=>{ calls++ } })
    const binding = await adapter.bindingResolver({project_id:'outcome',role:'planner'})
    if (mode === 'stale') mutateRegistry(path,{action:'observe',projectId:'outcome',role:'planner',expectedVersion:1,actorClass:'observer',reasonClass:'test_stale',occurredAt:now,observedAt:now,status:'stale'})
    if (mode === 'expired') clock = '2026-09-03T01:16:00.000Z'
    if (mode === 'future') clock = '2026-09-03T00:59:00.000Z'
    assert.deepEqual(await adapter.transport({destination:binding.destination,message:'ordinary',correlation_id:'message-0123456789abcdef'}),{delivery:'delivery_unknown'})
    assert.equal(calls,0)
  }
})

test('response reader uses only opaque current binding and never dispatches work', async () => {
  let reads=0,spawns=0
  const correlation_id='message-0123456789abcdef', message='question'
  const adapter=createCodexQueueAdapter({enabled:true,registryPath:registry(),now:()=>now,spawnProcess:()=>{spawns++},readThread:async threadId=>{
    reads++;return JSON.stringify({thread:{id:threadId,turns:[{id:'turn-test',status:'completed',completedAt:1700000000,items:[
      {type:'userMessage',content:[{type:'text',text:plannerRequestEnvelope(message,correlation_id)}]},
      {type:'agentMessage',id:'answer-test',phase:'final_answer',text:'answer'},
    ]}]}})
  }})
  const binding=await adapter.bindingResolver({project_id:'outcome',role:'planner'})
  assert.equal((await adapter.readPlannerResponse({destination:binding.destination,message,correlation_id})).outcome,'completed')
  assert.deepEqual(await adapter.readPlannerResponse({destination:{opaque:true},message,correlation_id}),{outcome:'unavailable'})
  assert.equal(reads,1);assert.equal(spawns,0)
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
  assert.deepEqual(call.args, ['codex', ['queue', '--thread', 'synthetic-private-destination', '--message', plannerRequestEnvelope(message, 'message-0123456789abcdef')], { shell: false, stdio: ['ignore', 'pipe', 'pipe'] }])
  assert.deepEqual(result, { delivery: 'acknowledged' }); assert.equal(JSON.stringify({ binding, result }).includes('synthetic-private-destination'), false)
  assert.equal(Object.hasOwn(result, 'execution_started'), false); assert.equal(Object.hasOwn(result, 'completed'), false)
})

test('public locator injection and stale or non-Planner targets fail before spawn', async () => {
  let calls = 0; const adapter = createCodexQueueAdapter({ enabled: true, registryPath: registry(), now: () => now, spawnProcess: () => { calls += 1 } })
  await assert.rejects(adapter.bindingResolver({ project_id: 'outcome', role: 'planner', locator: 'attacker' }), /binding_unavailable/)
  await assert.rejects(adapter.bindingResolver({ project_id: 'outcome', role: 'builder' }), /binding_unavailable/)
  assert.equal(calls, 0)
})

test('CLI receipt requires exact destination and UUID, with no extra text or nonzero exit', async () => {
  const valid='Queued message 11111111-1111-4111-8111-111111111111 for thread synthetic-private-destination.'
  for(const [output,code,delivery] of [[valid,0,'acknowledged'],[valid,1,'delivery_unknown'],[valid.replace('synthetic-private-destination','other'),0,'delivery_unknown'],[valid.replace('11111111-1111-4111-8111-111111111111','invalid'),0,'delivery_unknown'],[valid+' extra',0,'delivery_unknown'],['warning\n'+valid,0,'delivery_unknown']]) {
    const spawnProcess=childFixture(()=>{})
    const adapter=createCodexQueueAdapter({enabled:true,registryPath:registry(),now:()=>now,spawnProcess:(...args)=>{
      const child=spawnProcess(...args);queueMicrotask(()=>{child.stdout.emit('data',Buffer.from(output+'\n'));child.emit('close',code,null)});return child
    }})
    const binding=await adapter.bindingResolver({project_id:'outcome',role:'planner'})
    assert.deepEqual(await adapter.transport({destination:binding.destination,message:'receipt check',correlation_id:'message-0123456789abcdef'}),{delivery})
  }
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
