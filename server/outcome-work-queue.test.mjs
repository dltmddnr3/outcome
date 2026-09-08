import test from 'node:test'
import assert from 'node:assert/strict'
import {createWorkQueueDispatch} from './outcome-work-queue.mjs'
const input={scopeJson:JSON.stringify({projectId:'outcome',sessionRef:'a'.repeat(64),bindingVersion:1}),reservationDigest:'b'.repeat(64),authorityRef:'c'.repeat(64),candidateCommit:'d'.repeat(40),candidateTree:'e'.repeat(40),action:'qa_verifying'}
test('exact scope dispatch carries bounded references and reports only acknowledgement',async()=>{
  let calls=0
  const send=createWorkQueueDispatch({bindingResolver:async()=>({destination:'opaque'}),matchesWorkScope:()=>true,transport:async({message,correlation_id})=>{
    calls++;const value=JSON.parse(message);assert.equal(value.action,'qa_verifying');assert.equal(value.reservationDigest,input.reservationDigest)
    assert.equal(correlation_id,'message-bbbbbbbbbbbbbbbb');assert.equal(value.authorityRef,input.authorityRef);return {delivery:'acknowledged'}
  }})
  const r=JSON.parse(await send(input));assert.equal(r.delivery,'acknowledged');assert.match(r.sourceDigest,/^[a-f0-9]{64}$/);assert.equal(calls,1)
})
test('mismatch, cancellation, missing binding and unsupported action never send',async()=>{
  for(const mode of ['mismatch','cancel','missing','action']){
    let sends=0;const abort=new AbortController()
    const send=createWorkQueueDispatch({bindingResolver:async()=>{if(mode==='missing')throw Error();if(mode==='cancel')abort.abort();return {destination:'opaque'}},matchesWorkScope:()=>mode!=='mismatch',transport:async()=>{sends++;return {delivery:'acknowledged'}}})
    assert.equal(JSON.parse(await send({...input,...(mode==='action'?{action:'deploy'}:{})},{signal:abort.signal})).delivery,'delivery_unknown');assert.equal(sends,0)
  }
})
