import {createHash} from 'node:crypto'

// Internal, explicitly wired bounded read. Never dispatches or changes bindings.
// Caller retains the original claim token and exact dispatch receipt privately.
export async function collectDestinationAnalysisOnce({repository,queueAdapter,request,readReceipt}={}) {
 const unavailable={state:'unavailable',completionAuthority:false}
 try {
  if(typeof repository?.load!=='function'||typeof repository?.finish!=='function'||typeof queueAdapter?.bindingResolver!=='function'||typeof queueAdapter?.readPlannerResponse!=='function')return unavailable
  const row=await repository.load(request)
  if(!row||row.state!=='dispatch_started')return {state:'not_pending',completionAuthority:false}
  const receipt=readReceipt
  const correlation=`message-${createHash('sha256').update(JSON.stringify(['destination-analysis',row.requestId,row.documentDigest])).digest('hex').slice(0,16)}`
  if(receipt?.requestId!==row.requestId||receipt.documentDigest!==row.documentDigest||receipt.correlation_id!==correlation||typeof receipt.message!=='string'||!receipt.message||receipt.message.length>4000||!Number.isSafeInteger(receipt.bindingVersion)||receipt.bindingVersion<1)return unavailable
  const binding=await queueAdapter.bindingResolver({project_id:'outcome',role:'planner'})
  if(binding?.project_id!=='outcome'||binding.role!=='planner'||binding.status!=='active'||binding.freshness!=='fresh'||binding.binding_version!==receipt.bindingVersion||!receipt.destination)return unavailable
  // Resolver issues a new opaque capability on each call. Read with the
  // original capability; adapter rechecks its exact locator before/after read.
  // This capability is process-local and cannot be recovered by JSON parsing.
  const response=await queueAdapter.readPlannerResponse({destination:receipt.destination,correlation_id:correlation,message:receipt.message})
  if(response?.outcome==='pending')return {state:'pending',completionAuthority:false}
  if(response?.outcome!=='completed'||response.response?.correlation_id!==correlation||typeof response.response.message!=='string')return unavailable
  // The repository validates pinned source/revision, citations and authority.
  const saved=await repository.finish({...request,state:'completed',result:response.response.message})
  return {state:saved?'result_recorded':'result_not_recorded',completionAuthority:false}
 } catch {return unavailable}
}
