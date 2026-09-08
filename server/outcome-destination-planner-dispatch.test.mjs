import test from 'node:test'
import assert from 'node:assert/strict'
import {createDestinationPlannerDispatch as create} from './outcome-destination-planner-dispatch.mjs'
const input={requestId:'00000000-0000-4000-8000-000000000001',draftRevision:1,documentDigest:'a'.repeat(64),serializedDocument:'private-source-not-for-chat',purpose:'destination_analysis_only',executionAuthority:false}
const binding={project_id:'outcome',role:'planner',status:'active',freshness:'fresh',destination:'opaque-destination'}
const publication={requestId:input.requestId,draftRevision:1,documentDigest:input.documentDigest,state:'ready',reference:`analysis-${'b'.repeat(64)}`}
test('reuses existing Planner binding and sends only opaque analysis reference',async()=>{
 const sent=[]
 const dispatch=create({queueAdapter:{bindingResolver:async()=>binding,transport:async value=>{sent.push(value);return {delivery:'acknowledged'}}},publishInput:async value=>{assert.equal(value.serializedDocument,input.serializedDocument);return publication}})
 assert.deepEqual(await dispatch(input),{delivery:'acknowledged'})
 assert.equal(sent.length,1);assert.equal(sent[0].destination,binding.destination)
 assert.match(sent[0].correlation_id,/^message-[a-f0-9]{16}$/)
 assert.equal(sent[0].message.includes(input.serializedDocument),false)
 assert.equal(sent[0].message.includes(publication.reference),true)
})
test('stale binding or unverified publication never reaches transport',async()=>{
 for(const stale of [true,false]){
  let sent=0,published=0
  const dispatch=create({queueAdapter:{bindingResolver:async()=>({...binding,freshness:stale?'stale':'fresh'}),transport:async()=>{sent++}},publishInput:async()=>{published++;return {...publication,reference:'/private/forbidden'}}})
  assert.deepEqual(await dispatch(input),{delivery:'delivery_unknown'})
  assert.equal(sent,0);assert.equal(published,stale?0:1)
 }
 assert.equal(create({}),null)
})
