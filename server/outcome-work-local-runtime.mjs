import {createAuthenticatedWorkGrantResolver} from './outcome-work-grant-store.mjs'
import {createAuthorizedWorkContinuationController} from './outcome-work-continuation.mjs'
import {verifyStoredWorkStageReceipt} from './outcome-work-stage-receipt.mjs'
import {createWorkQueueDispatch} from './outcome-work-queue.mjs'

const hold=()=>Object.freeze({outcome:'configuration_hold',executionAuthority:false,completionAuthority:false})
const exact=(v,keys)=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k))

// Trusted local ports only. readCurrentPolicy resolves the current binding,
// dependency requirements and check coverage from the approved work contract.
// Never populate it from a browser payload or infer it from completed chat turns.
export function createLocalWorkRuntime({enabled=false,accountService,readToken,grantStore,journal,receiptDirectory,readCurrentPolicy,dispatch,queueAdapter,now=Date.now,timeoutMs=5000}={}){
  const resolveExecutionGrant=createAuthenticatedWorkGrantResolver({accountService,readToken,store:grantStore})
  const send=dispatch??(queueAdapter?createWorkQueueDispatch(queueAdapter):undefined)
  const run=async(reservationDigest=null)=>{
    if(enabled!==true)return Object.freeze({...hold(),outcome:'disabled'})
    if((dispatch!==undefined&&queueAdapter!==undefined)||typeof readCurrentPolicy!=='function'||(reservationDigest===null&&typeof send!=='function')||typeof now!=='function'
      ||!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>60000)return hold()
    let timer;const abort=new AbortController()
    try{
      const raw=await Promise.race([Promise.resolve().then(()=>readCurrentPolicy({signal:abort.signal})),new Promise((_,reject)=>{timer=setTimeout(()=>{abort.abort();reject(Error())},timeoutMs)})])
      clearTimeout(timer)
      if(typeof raw!=='string'||Buffer.byteLength(raw)>32768)return hold()
      const policy=JSON.parse(raw)
      if(!exact(policy,['request','priorReceipt','dependencyReceipts'])||!Array.isArray(policy.dependencyReceipts)||policy.dependencyReceipts.length>64)return hold()
      const verifyEligibility=async(request,{signal})=>{
          const latest=await readCurrentPolicy({signal})
          if(signal.aborted||latest!==raw)return false
          const scope=JSON.parse(request.scopeJson),terminal=journal.readDispatchSource(request.scopeJson,now())
          if(terminal.sequence!==request.expectedSequence)return false
          const expected=policy.priorReceipt
          if(terminal.initial){
            if(request.action!=='implementing'||expected!==null)return false
          }else{
            if(terminal.nextAction!==request.action||terminal.candidateCommit!==request.candidateCommit||terminal.candidateTree!==request.candidateTree)return false
            if(!expected||expected.projectId!==scope.projectId||expected.workId!==scope.workId||expected.runId!==scope.runId
              ||expected.candidateCommit!==request.candidateCommit||expected.candidateTree!==request.candidateTree
              ||expected.stage!==terminal.stage||expected.digest!==terminal.evidenceRef)return false
          }
          for(const receipt of [...(terminal.initial?[]:[expected]),...policy.dependencyReceipts]){
            if(!verifyStoredWorkStageReceipt(receiptDirectory,JSON.stringify(receipt)).matches)return false
          }
          return !signal.aborted
        }
      if(reservationDigest!==null){
        const request=policy.request
        if(typeof reservationDigest!=='string'||!/^[a-f0-9]{64}$/.test(reservationDigest)
          ||!exact(request,['scopeJson','expectedSequence','candidateCommit','candidateTree','authorityRef','action'])
          ||!['implementing','qa_verifying','release_verifying'].includes(request.action))return hold()
        const receive=async()=>{
          if(!await verifyEligibility(request,{signal:abort.signal}))return hold()
          const resolved=JSON.parse(await resolveExecutionGrant(request,{signal:abort.signal}))
          if(abort.signal.aborted||resolved.status!=='active')return hold()
          // Recheck evidence; the following claim atomically rechecks the grant.
          if(!await verifyEligibility(request,{signal:abort.signal})||abort.signal.aborted)return hold()
          return journal.claimContinuationExecution(request.scopeJson,request.expectedSequence,reservationDigest,resolved.ownerRef,now(),request.authorityRef)
        }
        return await Promise.race([receive(),new Promise((_,reject)=>{timer=setTimeout(()=>{abort.abort();reject(Error())},timeoutMs)})])
      }
      const controller=createAuthorizedWorkContinuationController({enabled:true,journal,now,timeoutMs,resolveExecutionGrant,dispatch:send,verifyEligibility})
      return await controller.runOnce(JSON.stringify(policy.request))
    }catch{return hold()}finally{clearTimeout(timer);abort.abort()}
  }
  return Object.freeze({runOnce:()=>run(),receiveOnce:reservationDigest=>typeof reservationDigest==='string'?run(reservationDigest):Promise.resolve(hold())})
}
