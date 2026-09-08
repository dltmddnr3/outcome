import {createHash} from 'node:crypto'

const exact=(v,keys)=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k))
const id=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,128}$/.test(v)
const hash=(v,n)=>typeof v==='string'&&new RegExp(`^[a-f0-9]{${n}}$`).test(v)
const stages=['implementing','qa_verifying','release_verifying']
const identity=['projectId','workId','runId','sessionRef','bindingVersion','ownerRef','candidateCommit','candidateTree']
const result=matches=>Object.freeze({matches,executionAuthority:false,completionAuthority:false})

// Pure local contract check, not an issuer or eligibility resolver. Expected
// state must come from trusted current owner/revocation storage, never HTTP input.
export function verifyWorkExecutionGrant(grantJson,expectedJson,now){
  try{
    if(typeof grantJson!=='string'||typeof expectedJson!=='string'||Buffer.byteLength(grantJson)>8192
      ||Buffer.byteLength(expectedJson)>8192||!Number.isSafeInteger(now)||now<0)return result(false)
    const g=JSON.parse(grantJson),e=JSON.parse(expectedJson)
    if(!exact(g,['schemaVersion',...identity,'allowedStages','issuedAt','expiresAt'])||g.schemaVersion!==1
      ||!exact(e,[...identity,'authorityRef','action','status'])||e.status!=='active'
      ||!hash(e.authorityRef,64)||createHash('sha256').update(grantJson).digest('hex')!==e.authorityRef
      ||!identity.every(k=>g[k]===e[k])||!identity.slice(0,4).every(k=>id(g[k]))
      ||!hash(g.ownerRef,64)||!hash(g.candidateCommit,40)||!hash(g.candidateTree,40)
      ||!Number.isSafeInteger(g.bindingVersion)||g.bindingVersion<1
      ||!Number.isSafeInteger(g.issuedAt)||g.issuedAt<0||!Number.isSafeInteger(g.expiresAt)
      ||g.issuedAt>now||g.expiresAt<=now||g.expiresAt<=g.issuedAt
      ||!Array.isArray(g.allowedStages)||g.allowedStages.length<1||g.allowedStages.length>3
      ||!g.allowedStages.every(s=>stages.includes(s))||new Set(g.allowedStages).size!==g.allowedStages.length
      ||!g.allowedStages.includes(e.action))return result(false)
    return result(true)
  }catch{return result(false)}
}
