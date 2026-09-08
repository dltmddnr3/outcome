import test from 'node:test'
import assert from 'node:assert/strict'
import {runDestinationAnalysisOnce as run} from './outcome-destination-analysis-worker.mjs'
const fixture=()=>{
 let state='queued',dispatches=0
 const transitions=[]
 const repository={claim:async()=>{if(state!=='queued')return null;state='dispatch_started';return {requestId:'synthetic-request',draftId:'synthetic-draft',draftRevision:1,documentDigest:'a'.repeat(64),serializedDocument:'{"source":"private synthetic"}'}},finish:async input=>{transitions.push(input.state);if(state!=='dispatch_started')return null;state=input.state;return {state}}}
 return {repository,transitions,count:()=>dispatches,state:()=>state,dispatch:async response=>{dispatches++;assert.equal(state,'dispatch_started');return response}}
}
test('analysis worker claims before dispatch and acknowledgement is not completion',async()=>{
 const f=fixture();const args={repository:f.repository,dispatch:()=>f.dispatch({delivery:'acknowledged'}),request:{}}
 assert.equal((await run(args)).state,'awaiting_result')
 assert.equal((await run(args)).state,'not_claimed')
 assert.equal(f.count(),1);assert.equal(f.state(),'dispatch_started');assert.deepEqual(f.transitions,[])
})
test('transport exception and unknown reply become terminal unknown without replay',async()=>{
 for(const throws of [true,false]){
  const f=fixture();const args={repository:f.repository,dispatch:async()=>{await f.dispatch(null);if(throws)throw Error('private transport detail');return {delivery:'unknown'}},request:{}}
  assert.equal((await run(args)).state,'delivery_unknown')
  await run(args);assert.equal(f.count(),1);assert.equal(f.state(),'delivery_unknown')
 }
})
test('only repository-validated result can be recorded and validation failure never resends',async()=>{
 const f=fixture()
 const result=await run({repository:f.repository,request:{},dispatch:async input=>{assert.equal(input.executionAuthority,false);assert.equal(input.purpose,'destination_analysis_only');return f.dispatch({delivery:'acknowledged',result:{completionAuthority:false}})}})
 assert.equal(result.state,'result_recorded');assert.equal(result.completionAuthority,false)
 const bad=fixture();const finish=bad.repository.finish
 bad.repository.finish=async input=>{if(input.state==='completed')throw Error('invalid result');return finish(input)}
 const args={repository:bad.repository,request:{},dispatch:()=>bad.dispatch({delivery:'acknowledged',result:{forged:true}})}
 assert.equal((await run(args)).state,'result_not_recorded');await run(args)
 assert.equal(bad.count(),1);assert.equal(bad.state(),'failed')
})
test('missing transport and lost claim never invoke external work',async()=>{
 const f=fixture()
 await assert.rejects(()=>run({repository:f.repository}),/destination_analysis_unavailable/)
 assert.equal(f.state(),'queued')
 let dispatches=0
 await assert.rejects(()=>run({repository:{...f.repository,claim:async()=>{throw Error('claim unknown')}},dispatch:async()=>{dispatches++}}))
 assert.equal(dispatches,0)
})

test('acknowledged async analysis retains private collection identity without another dispatch',async()=>{
 const f=fixture(),readReceipt={bindingVersion:1,message:'synthetic',destination:'private-synthetic'}
 const result=await run({repository:f.repository,request:{requestId:'synthetic-request'},dispatchToken:'original-token',dispatch:()=>f.dispatch({delivery:'acknowledged',readReceipt})})
 assert.deepEqual(result.collection,{request:{requestId:'synthetic-request',dispatchToken:'original-token'},readReceipt})
 assert.equal(result.state,'awaiting_result');assert.equal(f.count(),1)
})
