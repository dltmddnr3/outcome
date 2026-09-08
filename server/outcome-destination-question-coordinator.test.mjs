import assert from 'node:assert/strict'
import test from 'node:test'
import {createDestinationQuestionCoordinator} from './outcome-destination-question-coordinator.mjs'
import {runDestinationQuestionService} from './outcome-destination-question-service.mjs'
const scope={workspaceId:'workspace',accountRef:'owner',draftId:'00000000-0000-4000-8000-000000000001'}
const current={draftId:scope.draftId,revision:1,contextDigest:'a'.repeat(64),state:'draft',completionAuthority:false}
const fixture=({state=null,ready=true}={})=>{
 let claims=0,reads=0
 const input={scope,discovery:{load:async()=>{reads++;return current}},requests:{load:async()=>state?{...current,contextRevision:1,state}:null,claim:async()=>{claims++;throw Error('synthetic unavailable')},finish:async()=>{},readClaim:async()=>null},questions:{record:async()=>{}},queueAdapter:{bindingResolver:async()=>{},transport:async()=>{},readPlannerResponse:async()=>{}},publishInput:async()=>{},ready:async()=>ready}
 return {input,counts:()=>({claims,reads})}
}
test('coordinator never invents a request and preserves disabled or terminal claim boundaries',async()=>{
 for(const state of [null,'completed','dispatch_started','failed','delivery_unknown']){
  const f=fixture({state}),runner=createDestinationQuestionCoordinator(f.input)
  assert.equal((await runner.runOnce()).state,[null,'completed'].includes(state)?'idle':'safe_hold')
  await runner.runOnce();assert.equal(f.counts().claims,0)
 }
 const f=fixture({state:'queued',ready:false}),runner=createDestinationQuestionCoordinator(f.input)
 assert.equal((await runner.runOnce()).state,'safe_hold');assert.equal((await runner.runOnce()).state,'safe_hold')
 assert.deepEqual(f.counts(),{claims:0,reads:1})
})
test('one coordinator serializes checks and latches ambiguous claim without replay',async()=>{
 const f=fixture({state:'queued'});let release
 f.input.discovery.load=()=>new Promise(resolve=>{release=()=>resolve(current)})
 const runner=createDestinationQuestionCoordinator(f.input),first=runner.runOnce()
 assert.equal((await runner.runOnce()).state,'busy');release()
 assert.equal((await first).state,'safe_hold');assert.equal((await runner.runOnce()).state,'safe_hold');assert.equal(f.counts().claims,1)
})
test('coordinator rejects changed owner/context and accessor scope before claim',async()=>{
 const f=fixture({state:'queued'});f.input.requests.load=async()=>({...current,contextRevision:2,state:'queued'})
 assert.equal((await createDestinationQuestionCoordinator(f.input).runOnce()).state,'safe_hold');assert.equal(f.counts().claims,0)
 let hits=0;const bad={...scope};Object.defineProperty(bad,'accountRef',{get(){hits++;return 'other'}})
 assert.throws(()=>createDestinationQuestionCoordinator({...f.input,scope:bad}),/destination_coordinator_invalid/);assert.equal(hits,0)
 assert.throws(()=>createDestinationQuestionCoordinator({...f.input,scope:new Proxy(scope,{getOwnPropertyDescriptor(){hits++;throw Error()}})}),/destination_coordinator_invalid/);assert.equal(hits,0)
})
test('question service continuously checks completions and subsequent work without noisy repeated idle output',async()=>{
 const signal=new AbortController(),output=[];let steps=0,waits=0,releases=0
 const states=['idle','idle','awaiting_result','awaiting_result','result_recorded','idle']
 const code=await runDestinationQuestionService({enabled:true,signal:signal.signal,coordinator:{runOnce:async()=>({state:states[steps++],completionAuthority:false})},acquireLease:async()=>async()=>{releases++},write:line=>output.push(line),wait:async()=>{if(++waits===states.length)signal.abort()}})
 assert.equal(code,0);assert.equal(steps,6);assert.equal(releases,1)
 assert.equal(output.filter(line=>line.includes('AWAITING_RESULT')).length,1)
 assert.equal(output.filter(line=>line.includes('IDLE')).length,2)
 assert.equal(output.at(-1),'OUTCOME_DESTINATION_QUESTIONS_STOPPED\n')
})
test('question service stops after one unclear operation and never evicts an occupied lease',async()=>{
 for(const lease of [false,true]){
  let steps=0,waits=0,releases=0
  const code=await runDestinationQuestionService({enabled:true,signal:new AbortController().signal,coordinator:{runOnce:async()=>{steps++;return{state:'safe_hold',completionAuthority:false}}},acquireLease:async()=>lease?async()=>{releases++}:null,write:()=>{},wait:async()=>{waits++}})
  assert.equal(code,70);assert.equal(steps,lease?1:0);assert.equal(waits,0);assert.equal(releases,lease?1:0)
 }
 assert.equal(await runDestinationQuestionService(),64)
})
