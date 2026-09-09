import {runBoundedWorkCommand} from './outcome-work-command.mjs'
import {createHash} from 'node:crypto'
import {realpathSync} from 'node:fs'
import {resolve,sep} from 'node:path'

// Trusted local composition supplies canonical paths and freshly authenticated
// scope. A durable claim precedes launch; an uncertain launch is never retried.
export async function executeClaimedWorkCommand({journal,scopeJson,reservationDigest,ownerRef,commandId,cwd,now=Date.now,signal}={}){
  if(realpathSync(cwd)!==cwd)throw Error('command_checkout_unavailable')
  const checkoutRef=createHash('sha256').update('outcome-work-checkout-v1\0').update(cwd).digest('hex')
  const claim=journal.claimCommandExecution(scopeJson,reservationDigest,ownerRef,commandId,checkoutRef,now())
  if(claim.outcome==='command_result_recovered')return {...claim.result,recovered:true}
  if(claim.outcome!=='command_claimed')return {outcome:'command_reconciliation_required',executionAuthority:false,completionAuthority:false}
  const resolvePath=path=>{
    const absolute=resolve(cwd,path)
    if(!absolute.startsWith(cwd+sep)||realpathSync(absolute)!==absolute)throw Error('command_path_unavailable')
    return absolute
  }
  const writePaths=claim.writePaths.map(resolvePath)
  const readPaths=[...new Set([...claim.readPaths,...claim.writePaths])].map(resolvePath)
  const controller=new AbortController(),cancel=()=>controller.abort()
  signal?.addEventListener('abort',cancel,{once:true})
  if(signal?.aborted)cancel()
  // Re-check local revocation/expiry and running-stage ownership during the
  // process lifetime. No re-claim can launch a process; it only validates state.
  const monitor=setInterval(()=>{
    try{journal.claimCommandExecution(scopeJson,reservationDigest,ownerRef,commandId,checkoutRef,now())}
    catch{cancel()}
  },100)
  try{
    const result=await runBoundedWorkCommand({...claim.command,cwd,readPaths,writePaths,signal:controller.signal})
    journal.recordCommandResult(reservationDigest,commandId,ownerRef,result)
    return result
  }finally{clearInterval(monitor);signal?.removeEventListener('abort',cancel)}
}
