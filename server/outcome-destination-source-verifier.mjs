import {createHash} from 'node:crypto'
import {discoveryDomains} from '../src/lib/destination-question-policy.mjs'
import {validateDestinationQuestionReceipt} from './outcome-destination-question-receipt.mjs'
import {parseDestinationDraft} from './outcome-destination-postgres.mjs'

const fail=()=>{throw Error('destination_source_verification_unavailable')}
const hash=text=>createHash('sha256').update(text).digest('hex')
const exact=(v,keys)=>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).sort().join(',')!==[...keys].sort().join(','))fail()}
const parse=(raw,max)=>{if(typeof raw!=='string'||Buffer.byteLength(raw)>max)fail();try{return JSON.parse(raw)}catch{fail()}}
const ref=value=>typeof value==='string'&&/^[a-z0-9][a-z0-9_-]{0,79}$/.test(value)
const digest=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value)

// Both readers are trusted, owner-scoped, read-only host capabilities. They
// resolve opaque IDs, never URLs/paths supplied by a browser. The assessment
// attests semantic support; matching quoted bytes alone never proves support.
// This module creates no assessment, key, permission, file or network client.
export function createDestinationSourceVerifier({readAssessment,readSource,timeoutMs=5000}={}){
 if(typeof readAssessment!=='function'||typeof readSource!=='function'||!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>30000)fail()
 return async({workspaceId,accountRef,reviewDigest,serializedSnapshot}={})=>{
  const controller=new AbortController();let timer
  try{
   return await Promise.race([
    new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('destination_source_verification_unavailable'))},timeoutMs)}),
    (async()=>{
     if(![workspaceId,accountRef].every(v=>typeof v==='string'&&/^[A-Za-z0-9:_-]{1,128}$/.test(v))||!digest(reviewDigest))fail()
     const snapshot=parse(serializedSnapshot,10485760)
     if(hash(serializedSnapshot)!==reviewDigest||snapshot.completionAuthority!==false||snapshot.executionAuthority!==false)fail()
     const fileInput=snapshot.schemaVersion===2
     let checked=null
     if(fileInput){
      exact(snapshot,['schemaVersion','inputKind','draftId','intakeRevision','contextRevision','document','completionAuthority','executionAuthority'])
      const document=parseDestinationDraft(JSON.stringify(snapshot.document))
      if(snapshot.inputKind!=='file_import'||document.mode!=='file_import'||document.unknowns.length||!Number.isSafeInteger(snapshot.intakeRevision)||snapshot.intakeRevision<1||snapshot.contextRevision!==snapshot.intakeRevision||['problem','targetUser','outcome','scope','nonGoals','constraints','acceptance','failureRecovery'].some(field=>!document.answers[field]))fail()
     }else{
      checked=validateDestinationQuestionReceipt({serializedContext:JSON.stringify(snapshot.context),serializedReceipt:JSON.stringify(snapshot.questionReceipt)})
      if(checked.plan.state!=='coverage_ready_for_review')fail()
     }
     const raw=await readAssessment({workspaceId,accountRef,reviewDigest,signal:controller.signal})
     if(controller.signal.aborted)fail()
     const assessment=parse(raw,131072)
     exact(assessment,['schemaVersion','workspaceId','accountRef','reviewDigest','verdict','domains','completionAuthority'])
     if(assessment.schemaVersion!==1||assessment.workspaceId!==workspaceId||assessment.accountRef!==accountRef||assessment.reviewDigest!==reviewDigest||assessment.verdict!=='supported_for_owner_review'||assessment.completionAuthority!==false||!Array.isArray(assessment.domains)||assessment.domains.length!==8)fail()
     const seen=new Set(),sources=new Map();let totalBytes=0
     for(const item of assessment.domains){
      exact(item,['domain','state','assessment','evidence'])
      if(!discoveryDomains.includes(item.domain)||seen.has(item.domain)||item.assessment!=='supported'||!['contract_ready','non_goal'].includes(item.state)||!Array.isArray(item.evidence)||!item.evidence.length||item.evidence.length>50)fail()
      seen.add(item.domain)
      const coverage=checked?.receipt.coverage.find(entry=>entry.domain===item.domain)
      const refs=item.evidence.map(e=>e?.ref)
      if(new Set(refs).size!==refs.length||refs.some(r=>!ref(r)))fail()
      if(!fileInput&&(!coverage||coverage.state!==item.state||JSON.stringify([...refs].sort())!==JSON.stringify([...coverage.evidenceRefs].sort())))fail()
      for(const evidence of item.evidence){
       exact(evidence,['ref','contentDigest','startLine','endLine','quote'])
       if(!digest(evidence.contentDigest)||!Number.isSafeInteger(evidence.startLine)||!Number.isSafeInteger(evidence.endLine)||evidence.startLine<1||evidence.endLine<evidence.startLine||typeof evidence.quote!=='string'||!evidence.quote.trim()||Buffer.byteLength(evidence.quote)>16000)fail()
       parseDestinationDraft(JSON.stringify({schemaVersion:1,mode:'guided_200q',source:'',answers:{problem:evidence.quote},unknowns:[]}))
       if(controller.signal.aborted)fail()
       if(!sources.has(evidence.ref)){
        if(sources.size>=64)fail()
        const content=await readSource({workspaceId,accountRef,reviewDigest,ref:evidence.ref,signal:controller.signal})
        if(controller.signal.aborted||typeof content!=='string'||Buffer.byteLength(content)>524288)fail()
        totalBytes+=Buffer.byteLength(content);if(totalBytes>2097152)fail()
        sources.set(evidence.ref,{digest:hash(content),lines:content.split(/\r?\n/)})
       }
       const source=sources.get(evidence.ref)
       if(source.digest!==evidence.contentDigest||evidence.endLine>source.lines.length||source.lines.slice(evidence.startLine-1,evidence.endLine).join('\n')!==evidence.quote)fail()
      }
     }
     if(controller.signal.aborted)fail()
     return JSON.stringify({reviewDigest,evidenceDigest:hash(raw),verified:true,completionAuthority:false})
    })(),
   ])
  }catch{fail()}finally{clearTimeout(timer);controller.abort()}
 }
}
