import {runBoundedWorkCommand} from './outcome-work-command.mjs'
import {createHash} from 'node:crypto'
import {realpathSync} from 'node:fs'
import {resolve,sep} from 'node:path'

// Trusted local composition supplies canonical paths and freshly authenticated
// scope. A durable claim precedes launch; an uncertain launch is never retried.
export async function executeClaimedWorkCommand({journal,scopeJson,reservationDigest,ownerRef,commandId,cwd,readPaths,now=Date.now,signal}={}){
  if(realpathSync(cwd)!==cwd)throw Error('command_checkout_unavailable')
  const checkoutRef=createHash('sha256').update('outcome-work-checkout-v1\0').update(cwd).digest('hex')
  const claim=journal.claimCommandExecution(scopeJson,reservationDigest,ownerRef,commandId,checkoutRef,now())
  if(claim.outcome!=='command_claimed')return {outcome:'command_reconciliation_required',executionAuthority:false,completionAuthority:false}
  const writePaths=claim.writePaths.map(path=>{
    const absolute=resolve(cwd,path)
    if(!absolute.startsWith(cwd+sep)||realpathSync(absolute)!==absolute)throw Error('command_path_unavailable')
    return absolute
  })
  const result=await runBoundedWorkCommand({...claim.command,cwd,readPaths,writePaths,signal})
  journal.recordCommandResult(reservationDigest,commandId,ownerRef,result)
  return result
}
