import test from 'node:test'
import assert from 'node:assert/strict'
import {createDiscoveryQuestionDispatch} from './outcome-destination-question-dispatch.mjs'
import {discoveryContextDigest} from './outcome-destination-discovery-repository.mjs'
const context={source:'',mode:'guided_200q',seedAnswers:{problem:'private synthetic intake'},unknowns:['검증 필요'],revision:1,answers:[],askedQuestionIds:[]}
const input={requestId:'00000000-0000-4000-8000-000000000001',draftId:'00000000-0000-4000-8000-000000000002',contextRevision:1,contextDigest:discoveryContextDigest(context),serializedContext:JSON.stringify(context),purpose:'destination_questions_only',executionAuthority:false}
test('question dispatch reuses current Planner and sends only a bounded opaque reference',async()=>{
 let sent
 const binding={project_id:'outcome',role:'planner',binding_version:1,status:'active',freshness:'fresh',destination:{opaque:true}}
 const dispatch=createDiscoveryQuestionDispatch({queueAdapter:{bindingResolver:async()=>binding,transport:async value=>{sent=value;return {delivery:'acknowledged'}}},publishInput:async value=>{assert.deepEqual(value,input);return {state:'ready',reference:`analysis-${'a'.repeat(64)}`,requestId:input.requestId,contextDigest:input.contextDigest,contextRevision:1}}})
 const result=await dispatch(input)
 assert.equal(result.delivery,'acknowledged');assert.equal(result.readReceipt.destination,binding.destination)
 assert.equal(sent.message.includes('private synthetic intake'),false);assert.equal(sent.message.includes(input.serializedContext),false)
 assert.ok([...sent.message].length<=4000);assert.ok(Buffer.byteLength(sent.message)<=16000)
 assert.match(sent.correlation_id,/^message-[a-f0-9]{16}$/)
})
test('invalid context or stale binding never publishes or dispatches',async()=>{
 let publishes=0,sends=0
 const dispatch=createDiscoveryQuestionDispatch({queueAdapter:{bindingResolver:async()=>({freshness:'stale'}),transport:async()=>{sends++}},publishInput:async()=>{publishes++}})
 assert.deepEqual(await dispatch({...input,contextDigest:'b'.repeat(64)}),{delivery:'delivery_unknown'})
 assert.deepEqual(await dispatch(input),{delivery:'delivery_unknown'})
 assert.equal(publishes,0);assert.equal(sends,0);assert.equal(createDiscoveryQuestionDispatch({}),null)
})
