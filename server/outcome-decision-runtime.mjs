import { createDecisionPostgresStore } from './outcome-decision-postgres.mjs'
import { createDecisionRecordService } from './outcome-decision-record.mjs'

// Internal composition only. The HTTP handler supplies owner-resolved scope.
// This constructor neither obtains credentials nor activates hosted configuration.
export function createDecisionRuntime({transact,allowedOrigin,csrfSecret}={}) {
  if(typeof transact!=='function'||typeof csrfSecret!=='string'||csrfSecret.length<16)throw new Error('decision_store_unavailable')
  let origin
  try { origin=new URL(allowedOrigin);if(origin.protocol!=='https:'||origin.origin!==allowedOrigin)throw Error() } catch {throw new Error('decision_store_unavailable')}
  const serviceFor=(workspaceId,projectId)=>createDecisionRecordService({store:createDecisionPostgresStore({transact,workspaceId,projectId})})
  const safe=async operation=>{try{return await operation()}catch{throw new Error('decision_store_unavailable')}}
  return Object.freeze({allowedOrigin,csrfSecret,service:Object.freeze({
    record:input=>safe(()=>serviceFor(input.workspaceId,input.target.projectId).record(input)),
    withdraw:input=>safe(()=>serviceFor(input.workspaceId,input.projectId).withdraw(input)),
    history:input=>safe(async()=>{
      if(!Array.isArray(input.projectIds)||input.projectIds.length!==new Set(input.projectIds).size)throw Error()
      const decisions=[]
      for(const projectId of input.projectIds){
        const result=await serviceFor(input.workspaceId,projectId).history({...input,projectIds:[projectId]})
        if(result.status!==200)return result
        decisions.push(...result.body.decisions)
      }
      return {status:200,body:{decisions,completionAuthority:false}}
    }),
  })})
}
