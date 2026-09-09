import {createHash} from 'node:crypto'
import {parseDestinationDraft} from './outcome-destination-postgres.mjs'

const fail=(code='discovery_invalid')=>{throw Error(code)}
const hash=value=>createHash('sha256').update(value).digest('hex')
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(v)
const id=v=>typeof v==='string'&&/^[a-z0-9][a-z0-9_-]{0,79}$/.test(v)
const exact=(v,keys)=>{
 if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).sort().join(',')!==[...keys].sort().join(','))fail()
}
export function parseDiscoveryContext(serialized) {
 if(typeof serialized!=='string'||Buffer.byteLength(serialized)>8388608)fail()
 let context
 try{context=JSON.parse(serialized)}catch{fail()}
 exact(context,['source','mode','seedAnswers','unknowns','answers','askedQuestionIds','revision'])
 if(context.mode==='file_import')fail() // File review is not a question session.
 const intake=parseDestinationDraft(JSON.stringify({schemaVersion:1,mode:context.mode,source:context.source,answers:context.seedAnswers,unknowns:context.unknowns}))
 if(!Number.isSafeInteger(context.revision)||context.revision<0||!Array.isArray(context.answers)||context.answers.length>200||!Array.isArray(context.askedQuestionIds)||context.askedQuestionIds.length>200||context.askedQuestionIds.some(v=>!id(v))||new Set(context.askedQuestionIds).size!==context.askedQuestionIds.length)fail()
 const answered=new Set(),gaps=new Set()
 for(const answer of context.answers){
  exact(answer,['questionId','gapId','value'])
  if(!id(answer.questionId)||!id(answer.gapId)||!context.askedQuestionIds.includes(answer.questionId)||answered.has(answer.questionId)||gaps.has(answer.gapId)||typeof answer.value!=='string'||!answer.value.trim()||answer.value.length>4000)fail()
  // Reuse the existing private draft privacy boundary for each full answer.
  parseDestinationDraft(JSON.stringify({schemaVersion:1,mode:'guided_200q',source:'',answers:{problem:answer.value},unknowns:[]}))
  answered.add(answer.questionId);gaps.add(answer.gapId)
 }
 return {...context,seedAnswers:intake.answers}
}
export function discoveryContextDigest(context) {
 const seeds=Object.entries(context.seedAnswers).sort(([a],[b])=>a.localeCompare(b))
 return hash(JSON.stringify([hash(context.source),context.mode,seeds,context.unknowns,context.revision,context.answers.map(a=>[a.questionId,a.gapId,a.value]).sort(([a],[b])=>a.localeCompare(b)),[...context.askedQuestionIds].sort()]))
}
const scope=input=>{
 if(!input||!['workspaceId','accountRef'].every(k=>typeof input[k]==='string'&&/^[A-Za-z0-9:_-]{1,128}$/.test(input[k]))||!uuid(input.draftId))fail()
 return [input.workspaceId,input.accountRef,input.draftId]
}
const project=row=>{
 if(!row)return null
 const context=parseDiscoveryContext(JSON.stringify(row.context))
 if(discoveryContextDigest(context)!==row.context_digest||context.revision!==row.revision||row.state!=='draft'||row.completion_authority!==false)fail('discovery_unavailable')
 return {draftId:row.draft_id,revision:row.revision,intakeRevision:row.intake_revision,context,contextDigest:row.context_digest,state:'draft',completionAuthority:false}
}
export function createDiscoveryRepository({transact}={}) {
 if(typeof transact!=='function')fail()
 const run=(input,work)=>{
  const values=scope(input)
  return transact(async({query})=>{
   await query("select set_config('outcome.destination_workspace',$1,true),set_config('outcome.destination_account',$2,true)",values.slice(0,2))
   return work(query,values)
  })
 }
 return Object.freeze({
  load:input=>run(input,async(query,values)=>project((await query('select * from outcome_destination_private.discovery_drafts where workspace_id=$1 and account_ref=$2 and draft_id=$3',values)).rows[0])),
  save:input=>run(input,async(query,values)=>{
   if(!uuid(input.requestId)||!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<0||input.expectedRevision>=2147483647||!Number.isSafeInteger(input.intakeRevision)||input.intakeRevision<1)fail()
   const context=parseDiscoveryContext(input.context)
   if(context.revision!==input.expectedRevision+1)fail()
   const digest=discoveryContextDigest(context),fingerprint=hash(JSON.stringify([input.expectedRevision,input.intakeRevision,digest]))
   await query('select pg_advisory_xact_lock(hashtextextended($1,0))',[JSON.stringify(['discovery',...values])])
   const prior=(await query('select * from outcome_destination_private.discovery_drafts where workspace_id=$1 and account_ref=$2 and draft_id=$3 for update',values)).rows[0]
   if(prior?.last_request_id===input.requestId){if(prior.request_fingerprint!==fingerprint)fail('discovery_request_conflict');return project(prior)}
   if((prior?.revision??0)!==input.expectedRevision)fail('discovery_revision_conflict')
   const intake=(await query('select revision,document from outcome_destination_private.drafts where workspace_id=$1 and account_ref=$2 and draft_id=$3 for update',values)).rows[0]
   if(!intake||intake.revision!==input.intakeRevision)fail('discovery_intake_stale')
   const pinned=parseDestinationDraft(JSON.stringify(intake.document))
   const supplied=parseDestinationDraft(JSON.stringify({schemaVersion:1,mode:context.mode,source:context.source,answers:context.seedAnswers,unknowns:context.unknowns}))
   if(JSON.stringify(pinned)!==JSON.stringify(supplied))fail('discovery_intake_stale')
   // The browser cannot reset the question budget or invent a source question.
   // Initial discovery starts from intake evidence, never caller-made followups.
   if(!prior){if(context.answers.length||context.askedQuestionIds.length)fail()}
   else{
    const previous=project(prior).context
    const receipt=(await query('select * from outcome_destination_private.discovery_question_receipts where workspace_id=$1 and account_ref=$2 and draft_id=$3 and context_digest=$4',[...values,prior.context_digest])).rows[0]
    let offered=[]
    if(receipt){
     if(receipt.context_revision!==previous.revision)fail()
     // Deferred import avoids the validator/parser module initialization cycle.
     const {validateDestinationQuestionReceipt}=await import('./outcome-destination-question-receipt.mjs')
     offered=validateDestinationQuestionReceipt({serializedContext:JSON.stringify(previous),serializedReceipt:JSON.stringify(receipt.receipt)}).plan.batch
    }
    const expectedIds=new Set([...previous.askedQuestionIds,...offered.map(q=>q.id)])
    if(context.askedQuestionIds.length!==expectedIds.size||context.askedQuestionIds.some(id=>!expectedIds.has(id)))fail()
    const known=new Map(previous.answers.map(a=>[a.questionId,a.gapId]))
    for(const question of offered)known.set(question.id,question.gapId)
    if(previous.answers.some(old=>!context.answers.some(a=>a.questionId===old.questionId&&a.gapId===old.gapId)))fail()
    if(context.answers.some(a=>known.get(a.questionId)!==a.gapId))fail()
    // The currently supported batch save is atomic: every offered decision is
    // answered explicitly, rather than silently adopting a recommended value.
    if(offered.some(q=>!context.answers.some(a=>a.questionId===q.id&&a.gapId===q.gapId)))fail()
   }
   const params=[...values,input.expectedRevision+1,input.intakeRevision,input.requestId,fingerprint,digest,JSON.stringify(context)]
   const result=prior?await query('update outcome_destination_private.discovery_drafts set revision=$4,intake_revision=$5,last_request_id=$6,request_fingerprint=$7,context_digest=$8,context=$9 where workspace_id=$1 and account_ref=$2 and draft_id=$3 returning *',params):await query('insert into outcome_destination_private.discovery_drafts(workspace_id,account_ref,draft_id,revision,intake_revision,last_request_id,request_fingerprint,context_digest,context) values($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *',params)
   if(result.rows.length!==1)fail('discovery_unavailable')
   return project(result.rows[0])
  }),
 })
}
