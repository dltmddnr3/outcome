import test from 'node:test'
import assert from 'node:assert/strict'
import { runOutcomeChatService } from './outcome-chat-service.mjs'
import { plannerRequestEnvelope, projectCompletedPlannerResponse } from './outcome-chat-result-source.mjs'

test('default off and invalid intervals never invoke the runner', async () => {
  for (const options of [{}, { enabled: true, intervalMs: 0 }, { enabled: true, intervalMs: 60001 }]) {
    let calls = 0
    assert.equal(await runOutcomeChatService({ ...options, signal: new AbortController().signal, runOnce: async () => { calls++; return 0 } }), 64)
    assert.equal(calls, 0)
  }
})
test('serial dispatch and response passes repeat until stopped without overlap', async () => {
  const controller = new AbortController(), calls = []; let active = false, ticks = 0
  const result = await runOutcomeChatService({ enabled: true, signal: controller.signal, write() {},
    runOnce: async ({ argv }) => { assert.equal(active, false); active = true; await Promise.resolve(); calls.push(argv.length ? 'collect' : 'dispatch'); active = false; return 0 },
    wait: async () => { if (++ticks === 3) controller.abort() },
  })
  assert.equal(result, 0); assert.deepEqual(calls, ['dispatch', 'collect', 'dispatch', 'collect', 'dispatch', 'collect'])
})
test('ambiguous dispatch never sends again while response collection continues', async () => {
  const controller = new AbortController(), calls = [], logs = []; let ticks = 0
  assert.equal(await runOutcomeChatService({ enabled: true, signal: controller.signal, write: x => logs.push(x),
    runOnce: async ({ argv }) => { calls.push(argv.length ? 'collect' : 'dispatch'); return argv.length ? 0 : 2 },
    wait: async () => { if (++ticks === 3) controller.abort() },
  }), 0)
  assert.deepEqual(calls, ['dispatch', 'collect', 'collect', 'collect'])
  assert(logs.includes('OUTCOME_CHAT_SERVICE_DISPATCH_UNKNOWN_RESPONSE_ONLY\n'))
})
test('fatal or malformed result stops without retry or error detail disclosure', async () => {
  for (const value of [3, 4, 64, 70, undefined, '0', new Error('private secret')]) {
    const logs = []; let calls = 0
    assert.equal(await runOutcomeChatService({ enabled: true, signal: new AbortController().signal, write: x => logs.push(x),
      runOnce: async () => { calls++; if (value instanceof Error) throw value; return value },
    }), 70)
    assert.equal(calls, 1); assert(!logs.join('').includes('private'))
  }
})
test('response failure stops before a second dispatch', async () => {
  let calls = 0
  assert.equal(await runOutcomeChatService({ enabled: true, signal: new AbortController().signal, write() {}, wait:async()=>{}, runOnce: async () => ++calls === 1 ? 0 : 70 }), 70)
  assert.equal(calls, 4)
})
test('transient response failure recovers without another dispatch or unbounded retries', async () => {
  const controller=new AbortController(),calls=[],waits=[],logs=[];let responses=0
  assert.equal(await runOutcomeChatService({enabled:true,signal:controller.signal,write:x=>logs.push(x),wait:async ms=>waits.push(ms),
    runOnce:async({argv})=>{calls.push(argv.length?'responses':'dispatch');if(!argv.length)return 0;if(++responses===1)return 70;controller.abort();return 0},
  }),0)
  assert.deepEqual(calls,['dispatch','responses','responses']);assert.deepEqual(waits,[4000]);assert(logs.includes('OUTCOME_CHAT_SERVICE_RESPONSES_RECOVERED\n'))
})
test('response configuration failure is not retried',async()=>{
  let calls=0
  assert.equal(await runOutcomeChatService({enabled:true,signal:new AbortController().signal,write(){},runOnce:async()=>++calls===1?0:64}),70)
  assert.equal(calls,2)
})
test('abort during a pass or sleep does not begin another pass', async () => {
  for (const boundary of ['dispatch', 'sleep']) {
    const controller = new AbortController(); let calls = 0
    assert.equal(await runOutcomeChatService({ enabled: true, signal: controller.signal, write() {},
      runOnce: async () => { calls++; if (boundary === 'dispatch') controller.abort(); return 0 },
      wait: async () => { controller.abort(); throw new Error('abort') },
    }), 0)
    assert.equal(calls, boundary === 'dispatch' ? 1 : 2)
  }
})

test('delayed queued turn progresses through pending to exact answer with one dispatch', async () => {
  const controller=new AbortController(), outcomes=[]; let sends=0, reads=0
  const request={threadId:'synthetic-thread',message:'confirm receipt',correlationId:'message-0123456789abcdef'}
  const turn={id:'turn-1',status:'completed',completedAt:1,error:null,itemsView:'full',items:[
    {type:'userMessage',content:[{type:'text',text:plannerRequestEnvelope(request.message,request.correlationId)}]},
    {type:'agentMessage',id:'reply-1',phase:'final_answer',text:'confirmed'},
  ]}
  assert.equal(await runOutcomeChatService({enabled:true,signal:controller.signal,write(){},wait:async()=>{},
    runOnce:async({argv})=>{
      if(!argv.length){sends++;return 2}
      reads++
      const result=projectCompletedPlannerResponse({...request,observedAt:'2030-01-01T00:00:00.000Z',json:JSON.stringify({thread:{id:request.threadId,turns:reads<3?[]:[turn]}})})
      outcomes.push(result.outcome)
      if(result.outcome==='completed'){assert.equal(result.response.message,'confirmed');controller.abort()}
      return ['pending','completed'].includes(result.outcome)?0:70
    },
  }),0)
  assert.equal(sends,1);assert.deepEqual(outcomes,['pending','pending','completed'])
})
