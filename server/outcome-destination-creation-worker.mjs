import {createHash,randomUUID} from 'node:crypto'
const terminal=state=>({state,completionAuthority:false,executionAuthority:false})
const validResult=(row,scope,confirmation)=>row&&row.projectId===`destination-${createHash('sha256').update(JSON.stringify([scope.workspaceId,scope.accountRef,scope.draftId])).digest('hex')}`&&row.state==='package_registered'&&row.requestId===confirmation.requestId&&row.reviewDigest===confirmation.reviewDigest&&row.completionAuthority===false&&row.executionAuthority===false
// One explicit existing-owner request only: no discovery loop, timers, provider
// changes, session creation, membership grant, or automatic recovery/retry.
export function createDestinationCreationWorker({confirmationRepository,store,publisher}={}){
 if(typeof confirmationRepository?.readConfirmedCreation!=='function'||!['load','claim','record'].every(key=>typeof store?.[key]==='function')||!['publish','publicationEvidence'].every(key=>typeof publisher?.[key]==='function'))throw Error('destination_creation_unavailable')
 return Object.freeze({async runOnce(input){
  let claimed=false
  try{
   const scope=Object.freeze({workspaceId:input?.workspaceId,accountRef:input?.accountRef,draftId:input?.draftId,requestId:input?.requestId})
   const confirmation=await confirmationRepository.readConfirmedCreation(scope)
   if(!confirmation||confirmation.requestId!==scope.requestId||confirmation.draftId!==scope.draftId||confirmation.executionAuthority!==false||confirmation.completionAuthority!==false)return terminal('CONFIRMATION_UNVERIFIED')
   const prior=await store.load(scope)
   if(prior){if(!validResult(prior,scope,confirmation))return terminal('RESULT_CONFLICT');return {...terminal('ALREADY_RECORDED'),creation:prior}}
   const claimId=randomUUID(),claim=await store.claim({...scope,claimId,reviewDigest:confirmation.reviewDigest,evidenceDigest:confirmation.evidenceDigest})
   if(claim?.acquired!==true)return terminal('CLAIM_NOT_ACQUIRED')
   claimed=true
   await publisher.publish(scope)
   const evidence=await publisher.publicationEvidence(scope)
   if(!evidence||evidence.state!=='package_registered'||evidence.completionAuthority!==false||evidence.executionAuthority!==false)return terminal('PUBLICATION_UNVERIFIED')
   const recorded=await store.record({...scope,claimId,projectId:evidence.projectId,publicationDigest:evidence.publicationDigest})
   const observed=await store.load(scope)
   if(!validResult(observed,scope,confirmation)||JSON.stringify(observed)!==JSON.stringify(recorded))return terminal('CREATION_UNKNOWN')
   return {...terminal('PACKAGE_RECORDED'),creation:observed}
  }catch{return terminal(claimed?'CREATION_UNKNOWN':'CLAIM_OR_CONFIRMATION_UNVERIFIED')}
 }})
}
