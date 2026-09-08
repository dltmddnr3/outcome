import test from 'node:test'
import assert from 'node:assert/strict'
import {createDestinationPlannerDispatch} from './outcome-destination-planner-dispatch.mjs'
import {collectDestinationAnalysisOnce} from './outcome-destination-analysis-collector.mjs'

test('original dispatch receipt connects bounded response read without another send',async()=>{
 const input={requestId:'00000000-0000-4000-8000-000000000001',draftRevision:1,documentDigest:'a'.repeat(64),purpose:'destination_analysis_only',executionAuthority:false}
 const binding={project_id:'outcome',role:'planner',status:'active',freshness:'fresh',destination:'synthetic-destination',binding_version:3}
 let sends=0,reads=0,saves=0,mode='pending',state='dispatch_started',drift=false
 let originalDestination
 const queueAdapter={bindingResolver:async()=>({...binding,destination:Object.freeze({opaque:true}),binding_version:drift?4:3}),transport:async ({destination})=>{originalDestination=destination;sends++;return {delivery:'acknowledged'}},readPlannerResponse:async ({correlation_id,destination})=>{
  assert.equal(destination,originalDestination)
  reads++
  if(mode==='throw')throw Error('private detail')
  return mode==='pending'?{outcome:'pending'}:{outcome:'completed',response:{correlation_id:mode==='wrong'?'wrong':correlation_id,message:'{"completionAuthority":false}'}}
 }}
 const dispatch=createDestinationPlannerDispatch({queueAdapter,publishInput:async()=>({...input,state:'ready',reference:`analysis-${'b'.repeat(64)}`})})
 const {readReceipt}=await dispatch(input)
 const request={workspaceId:'synthetic',accountRef:'owner',requestId:input.requestId,dispatchToken:'original-token'}
 const repository={load:async()=>({...input,state}),finish:async value=>{
  assert.equal(value.dispatchToken,request.dispatchToken)
  assert.equal(value.result,'{"completionAuthority":false}')
  saves++;state='completed';return {state}
 }}
 const collect=()=>collectDestinationAnalysisOnce({repository,queueAdapter,request,readReceipt})
 assert.equal((await collect()).state,'pending');assert.equal(saves,0)
 drift=true;assert.equal((await collect()).state,'unavailable');assert.equal(reads,1)
 drift=false;mode='wrong';assert.equal((await collect()).state,'unavailable');assert.equal(saves,0)
 mode='throw';assert.deepEqual(await collect(),{state:'unavailable',completionAuthority:false})
 mode='valid';assert.equal((await collect()).state,'result_recorded')
 assert.equal((await collect()).state,'not_pending');assert.equal(saves,1);assert.equal(sends,1)
})
