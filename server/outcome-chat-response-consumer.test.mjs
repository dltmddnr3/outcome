import assert from 'node:assert/strict'
import test from 'node:test'
import {createPlannerResponseConsumer} from './outcome-chat-response-consumer.mjs'

const scope={workspace_id:'workspace-one',project_id:'outcome',binding_version:3}
const request={correlation_id:'message-0123456789abcdef',message:'question'}
function fixture({outcome='completed',version=3,correlation=request.correlation_id,failWrite=false}={}){
  const writes=[];let reads=0
  const repository={pendingPlannerResponses:async value=>{assert.deepEqual(value,scope);return [request]},appendPlannerResponse:async value=>{if(failWrite)throw Error('private');writes.push(value)}}
  const queueAdapter={bindingResolver:async()=>({project_id:'outcome',role:'planner',binding_version:version,status:'active',freshness:'fresh',destination:{}}),
    readPlannerResponse:async()=>{reads++;return {outcome,response:{correlation_id:correlation,source_digest:'a'.repeat(64),message:'answer',observed_at:'2026-09-08T00:00:00.000Z'}}},
    transport:()=>{throw Error('must not dispatch')}}
  return {consumer:createPlannerResponseConsumer({repository,queueAdapter,scope}),writes,reads:()=>reads}
}
test('matching completion is stored under server scope once without dispatch',async()=>{
  const f=fixture();assert.deepEqual(await f.consumer.runOnce(),{outcome:'checked',stored:1,pending:0,unavailable:0})
  assert.equal(f.writes.length,1);assert.equal(f.writes[0].workspace_id,scope.workspace_id)
  assert.deepEqual(await f.consumer.runOnce(),{outcome:'unavailable'});assert.equal(f.reads(),1)
})
test('pending, failed source, binding drift and correlation mismatch never store answers',async()=>{
  for(const options of [{outcome:'pending'},{outcome:'unavailable'},{version:4},{correlation:'message-0000000000000000'},{failWrite:true}]){
    const f=fixture(options),result=await f.consumer.runOnce()
    assert.equal(result.stored,0);assert.equal(f.writes.length,0)
    assert.equal(result.pending,options.outcome==='pending'?1:0)
    if(options.version)assert.equal(f.reads(),0)
    assert.equal(JSON.stringify(result).includes('private'),false)
  }
})
