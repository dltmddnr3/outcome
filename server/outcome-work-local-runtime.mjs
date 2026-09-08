import {createAuthenticatedWorkGrantResolver} from './outcome-work-grant-store.mjs'
import {createAuthorizedWorkContinuationController} from './outcome-work-continuation.mjs'
import {verifyStoredWorkStageReceipt} from './outcome-work-stage-receipt.mjs'

const hold=()=>Object.freeze({outcome:'configuration_hold',executionAuthority:false,completionAuthority:false})
const exact=(v,keys)=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k))

// Trusted local ports only. readCurrentPolicy resolves the current binding,
// dependency requirements and check coverage from the approved work contract.
// Never populate it from a browser payload or infer it from completed chat turns.
export function createLocalWorkRuntime({enabled=false,accountService,readToken,grantStore,journal,receiptDirectory,readCurrentPolicy,dispatch,now=Date.now,timeoutMs=5000}={}){
  const resolveExecutionGrant=createAuthenticatedWorkGrantResolver({accountService,readToken,store:grantStore})
  return Object.freeze({async runOnce(){
    if(enabled!==true)return Object.freeze({...hold(),outcome:'disabled'})
    if(typeof readCurrentPolicy!=='function'||typeof dispatch!=='function'||typeof now!=='function'
      ||!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>60000)return hold()
    let timer;const abort=new AbortController()
    try{
      const raw=await Promise.race([Promise.resolve().then(()=>readCurrentPolicy({signal:abort.signal})),new Promise((_,reject)=>{timer=setTimeout(()=>{abort.abort();reject(Error())},timeoutMs)})])
      clearTimeout(timer)
      if(typeof raw!=='string'||Buffer.byteLength(raw)>32768)return hold()
      const policy=JSON.parse(raw)
      if(!exact(policy,['request','priorReceipt','dependencyReceipts'])||!Array.isArray(policy.dependencyReceipts)||policy.dependencyReceipts.length>64)return hold()
      const controller=createAuthorizedWorkContinuationController({enabled:true,journal,now,timeoutMs,resolveExecutionGrant,dispatch,
        verifyEligibility:async(request,{signal})=>{
          const latest=await readCurrentPolicy({signal})
          if(signal.aborted||latest!==raw)return false
          const scope=JSON.parse(request.scopeJson),terminal=journal.readTerminal(request.scopeJson,now())
          if(terminal.sequence!==request.expectedSequence||terminal.candidateCommit!==request.candidateCommit||terminal.candidateTree!==request.candidateTree)return false
          const expected=policy.priorReceipt
          if(!expected||expected.projectId!==scope.projectId||expected.workId!==scope.workId||expected.runId!==scope.runId
            ||expected.candidateCommit!==request.candidateCommit||expected.candidateTree!==request.candidateTree
            ||expected.stage!==terminal.stage||expected.digest!==terminal.evidenceRef)return false
          for(const receipt of [expected,...policy.dependencyReceipts]){
            if(!verifyStoredWorkStageReceipt(receiptDirectory,JSON.stringify(receipt)).matches)return false
          }
          return !signal.aborted
        }})
      return await controller.runOnce(JSON.stringify(policy.request))
    }catch{return hold()}finally{clearTimeout(timer);abort.abort()}
  }})
}
