import {parseDestinationDraft} from './outcome-destination-postgres.mjs'
import {destinationDocumentDigest} from './outcome-destination-analysis-source.mjs'
const fields=['problem','targetUser','outcome','scope','nonGoals','constraints','acceptance','failureRecovery']
const fail=()=>{throw Error('destination_analysis_result_invalid')}
const exact=(v,keys)=>{
 if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).sort().join(',')!==[...keys].sort().join(','))fail()
 return v
}
const safeText=value=>{
 if(typeof value!=='string'||!value.trim()||value.length>4000)fail()
 parseDestinationDraft(JSON.stringify({schemaVersion:1,mode:'brief_gap',source:'',answers:{problem:value},unknowns:[]}))
 return value
}

// Proves source identity and exact citations, not semantic entailment or acceptance.
export async function validateDestinationAnalysisResult({source,draftRevision,documentDigest,result}={}) {
 try{
  const document=parseDestinationDraft(source)
  if(!Number.isSafeInteger(draftRevision)||draftRevision<1||destinationDocumentDigest(document)!==documentDigest||typeof result!=='string'||Buffer.byteLength(result)>131072)fail()
  const root=exact(JSON.parse(result),['schemaVersion','documentDigest','draftRevision','proposals','completionAuthority'])
  if(root.schemaVersion!==1||root.documentDigest!==documentDigest||root.draftRevision!==draftRevision||root.completionAuthority!==false||!Array.isArray(root.proposals)||root.proposals.length>8)fail()
  const lines=document.source.split(/\r?\n/),counts=new Map(),proposals=[]
  for(const raw of root.proposals){
   const p=exact(raw,['field','value','startLine','endLine','quote'])
   if(!fields.includes(p.field)||!Number.isSafeInteger(p.startLine)||!Number.isSafeInteger(p.endLine)||p.startLine<1||p.endLine<p.startLine||p.endLine>lines.length)fail()
   const quote=safeText(p.quote),value=safeText(p.value)
   if(lines.slice(p.startLine-1,p.endLine).join('\n')!==quote)fail()
   counts.set(p.field,(counts.get(p.field)??0)+1)
   proposals.push({...p,value,quote,status:'needs_confirmation'})
  }
  const conflicts=[...counts].filter(([,n])=>n>1).map(([field])=>field)
  return {schemaVersion:1,documentDigest,draftRevision,proposals,conflicts,gaps:fields.filter(field=>!counts.has(field)||conflicts.includes(field)),confirmedAnswers:{},semanticVerification:'owner_review_required',completionAuthority:false}
 }catch{fail()}
}
