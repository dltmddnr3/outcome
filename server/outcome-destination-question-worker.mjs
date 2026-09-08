import {randomUUID,createHash} from 'node:crypto'
import {discoveryQuestionMessage} from './outcome-destination-question-dispatch.mjs'

// Explicit recovery of an already-started request. No claim, publish or transport.
// The existing durable claim plus an exact completed source turn replace the lost
// process-local capability; we do not invent an acknowledgement or reset the request.
export async function reconcileDiscoveryQuestionOnce({requests,questions,queueAdapter,inputStore,scope,reference}={}){
 const unavailable={state:'unavailable',completionAuthority:false}
 try{
  const input=await inputStore.read(reference)
  if(input.draftId!==scope.draftId)return unavailable
  const message=discoveryQuestionMessage(input,reference)
  const identity={...scope,contextDigest:input.contextDigest,requestId:input.requestId}
  const row=await requests.readPendingClaim(identity)
  if(!row||row.contextRevision!==input.contextRevision)return unavailable
  const binding=await queueAdapter.bindingResolver({project_id:'outcome',role:'planner'})
  if(binding?.project_id!=='outcome'||binding.role!=='planner'||binding.status!=='active'||binding.freshness!=='fresh'||!Number.isSafeInteger(binding.binding_version)||binding.binding_version<1||!binding.destination)return unavailable
  const correlation_id=`message-${createHash('sha256').update(JSON.stringify(['destination-questions',input.requestId,input.contextDigest])).digest('hex').slice(0,16)}`
  // The regular collector performs fresh binding and full source verification,
  // then records an idempotent receipt before the original-token terminal update.
  return await collectDiscoveryQuestionOnce({requests,questions,queueAdapter,request:{...identity,dispatchToken:row.dispatchToken},readReceipt:{requestId:row.requestId,contextDigest:row.contextDigest,contextRevision:row.contextRevision,bindingVersion:binding.binding_version,destination:binding.destination,correlation_id,message}})
 }catch{return unavailable}
}

export async function runDiscoveryQuestionOnce({requests,dispatch,request,dispatchToken=randomUUID()}={}){
 if(typeof requests?.claim!=='function'||typeof requests?.finish!=='function'||typeof dispatch!=='function')throw Error('discovery_request_unavailable')
 const identity={...request,dispatchToken}
 const claimed=await requests.claim(identity)
 if(!claimed)return {state:'not_claimed',completionAuthority:false}
 let response
 try{response=await dispatch({requestId:claimed.requestId,draftId:claimed.draftId,contextRevision:claimed.contextRevision,contextDigest:claimed.contextDigest,serializedContext:claimed.serializedContext,purpose:'destination_questions_only',executionAuthority:false})}catch{}
 if(response?.delivery!=='acknowledged'){
  await requests.finish({...identity,state:'delivery_unknown'})
  return {state:'delivery_unknown',completionAuthority:false}
 }
 // Process-local original queue capability only; never a public HTTP response.
 return {state:'awaiting_result',collection:{request:identity,readReceipt:response.readReceipt},completionAuthority:false}
}

export async function collectDiscoveryQuestionOnce({requests,questions,queueAdapter,request,readReceipt}={}){
 const unavailable={state:'unavailable',completionAuthority:false}
 try{
  const row=await requests.readClaim(request)
  if(!row||row.state!=='dispatch_started')return {state:'not_pending',completionAuthority:false}
  const correlation=`message-${createHash('sha256').update(JSON.stringify(['destination-questions',row.requestId,row.contextDigest])).digest('hex').slice(0,16)}`
  const receipt=readReceipt
  if(receipt?.requestId!==row.requestId||receipt.contextDigest!==row.contextDigest||receipt.contextRevision!==row.contextRevision||receipt.correlation_id!==correlation||typeof receipt.message!=='string'||!receipt.message||receipt.message.length>4000)return unavailable
  const binding=await queueAdapter.bindingResolver({project_id:'outcome',role:'planner'})
  if(binding?.project_id!=='outcome'||binding.role!=='planner'||binding.status!=='active'||binding.freshness!=='fresh'||binding.binding_version!==receipt.bindingVersion||!receipt.destination)return unavailable
  const value=await queueAdapter.readPlannerResponse({destination:receipt.destination,message:receipt.message,correlation_id:correlation})
  if(value?.outcome==='pending')return {state:'pending',completionAuthority:false}
  const response=value?.response
  if(value?.outcome!=='completed'||response?.correlation_id!==correlation||typeof response.message!=='string'||typeof response.source_digest!=='string'||!/^[a-f0-9]{64}$/.test(response.source_digest))return unavailable
  const recorded=await questions.record({...request,contextDigest:row.contextDigest,bindingVersion:receipt.bindingVersion,responseSourceDigest:response.source_digest,receipt:response.message})
  if(!recorded)return unavailable
  const finished=await requests.finish({...request,state:'completed'})
  return {state:finished?'result_recorded':'result_not_recorded',completionAuthority:false}
 }catch{return unavailable}
}
