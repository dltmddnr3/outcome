import {randomUUID} from 'node:crypto'

// Called for an explicitly authorized request. No polling, scheduling or retries.
// The injected transport is Planner analysis only, never an execution tool bridge.
export async function runDestinationAnalysisOnce({repository,dispatch,request,dispatchToken=randomUUID()}={}) {
 if(!repository||typeof repository.claim!=='function'||typeof repository.finish!=='function'||typeof dispatch!=='function')throw Error('destination_analysis_unavailable')
 const identity={...request,dispatchToken}
 const claimed=await repository.claim(identity)
 if(!claimed)return {state:'not_claimed',dispatched:false,completionAuthority:false}
 let response
 try {
  response=await dispatch(Object.freeze({requestId:claimed.requestId,draftId:claimed.draftId,draftRevision:claimed.draftRevision,documentDigest:claimed.documentDigest,serializedDocument:claimed.serializedDocument,purpose:'destination_analysis_only',executionAuthority:false}))
 } catch {
  // A transport error cannot prove the remote request was not accepted.
  await repository.finish({...identity,state:'delivery_unknown'})
  return {state:'delivery_unknown',dispatched:true,completionAuthority:false}
 }
 // Private coordinator handoff only: never expose destination/message/token
 // through the public analysis HTTP projection.
 if(response?.delivery==='acknowledged'&&response.result===undefined)return {state:'awaiting_result',dispatched:true,completionAuthority:false,...(response.readReceipt?{collection:{request:identity,readReceipt:response.readReceipt}}:{})}
 if(response?.delivery!=='acknowledged') {
  await repository.finish({...identity,state:'delivery_unknown'})
  return {state:'delivery_unknown',dispatched:true,completionAuthority:false}
 }
 try {
  const completed=await repository.finish({...identity,state:'completed',result:response.result})
  if(!completed)return {state:'result_not_recorded',dispatched:true,completionAuthority:false}
  return {state:'result_recorded',dispatched:true,completionAuthority:false}
 } catch {
  // Never resend because result validation/storage failed. An uncertain commit
  // may already be terminal; CAS prevents this fallback from overwriting it.
  await repository.finish({...identity,state:'failed'})
  return {state:'result_not_recorded',dispatched:true,completionAuthority:false}
 }
}
