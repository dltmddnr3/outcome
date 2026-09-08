import {createHash} from 'node:crypto'

const exact=(v,keys)=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k))
const id=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,128}$/.test(v)
const hash=(v,n)=>typeof v==='string'&&new RegExp(`^[a-f0-9]{${n}}$`).test(v)
const stages=['implementing','qa_verifying','release_verifying']
const identity=['projectId','workId','runId','sessionRef','bindingVersion','ownerRef','candidateCommit','candidateTree']
const result=matches=>Object.freeze({matches,executionAuthority:false,completionAuthority:false})
const relativePath=v=>typeof v==='string'&&v.length<=512&&/^[a-zA-Z0-9_-][a-zA-Z0-9_./-]*$/.test(v)
  &&v.split('/').every(part=>part!==''&&part!=='.'&&part!=='..'&&!part.startsWith('.'))
const executionContract=(v,allowed)=>{
  if(!exact(v,['checkoutRef','writePaths','commands'])||!hash(v.checkoutRef,64)
    ||!Array.isArray(v.writePaths)||v.writePaths.length>128||!v.writePaths.every(relativePath)||new Set(v.writePaths).size!==v.writePaths.length
    ||!Array.isArray(v.commands)||v.commands.length<1||v.commands.length>32)return false
  const seen=new Set()
  for(const command of v.commands){
    if(!exact(command,['id','stage','program','args','timeoutMs'])||!id(command.id)||seen.has(command.id)
      ||!allowed.includes(command.stage)||!['node','npm','git'].includes(command.program)
      ||!Array.isArray(command.args)||command.args.length>64||!command.args.every(arg=>typeof arg==='string'&&arg.length<=2048&&!/[\u0000-\u001f\u007f]/.test(arg))
      ||!Number.isSafeInteger(command.timeoutMs)||command.timeoutMs<1||command.timeoutMs>3600000)return false
    seen.add(command.id)
  }
  return allowed.every(stage=>v.commands.some(command=>command.stage===stage))
}

// Pure local contract check, not an issuer or eligibility resolver. Expected
// state must come from trusted current owner/revocation storage, never HTTP input.
export function verifyWorkExecutionGrant(grantJson,expectedJson,now){
  try{
    if(typeof grantJson!=='string'||typeof expectedJson!=='string'||Buffer.byteLength(grantJson)>8192
      ||Buffer.byteLength(expectedJson)>8192||!Number.isSafeInteger(now)||now<0)return result(false)
    const g=JSON.parse(grantJson),e=JSON.parse(expectedJson)
    if(![1,2].includes(g?.schemaVersion)||!exact(g,['schemaVersion',...identity,'allowedStages','issuedAt','expiresAt',...(g.schemaVersion===2?['execution']:[])])
      ||!exact(e,[...identity,'authorityRef','action','status'])||e.status!=='active'
      ||!hash(e.authorityRef,64)||createHash('sha256').update(grantJson).digest('hex')!==e.authorityRef
      ||!identity.every(k=>g[k]===e[k])||!identity.slice(0,4).every(k=>id(g[k]))
      ||!hash(g.ownerRef,64)||!hash(g.candidateCommit,40)||!hash(g.candidateTree,40)
      ||!Number.isSafeInteger(g.bindingVersion)||g.bindingVersion<1
      ||!Number.isSafeInteger(g.issuedAt)||g.issuedAt<0||!Number.isSafeInteger(g.expiresAt)
      ||g.issuedAt>now||g.expiresAt<=now||g.expiresAt<=g.issuedAt
      ||!Array.isArray(g.allowedStages)||g.allowedStages.length<1||g.allowedStages.length>3
      ||!g.allowedStages.every(s=>stages.includes(s))||new Set(g.allowedStages).size!==g.allowedStages.length
      ||!g.allowedStages.includes(e.action)
      ||(g.schemaVersion===2&&!executionContract(g.execution,g.allowedStages)))return result(false)
    return result(true)
  }catch{return result(false)}
}
