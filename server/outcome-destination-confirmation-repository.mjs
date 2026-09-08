import {createHash} from 'node:crypto'
import {parseDestinationDraft} from './outcome-destination-postgres.mjs'
import {parseDiscoveryContext,discoveryContextDigest} from './outcome-destination-discovery-repository.mjs'
import {validateDestinationQuestionReceipt} from './outcome-destination-question-receipt.mjs'

const fail=()=>{throw Error('destination_confirmation_unavailable')}
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(v)
const hash=v=>createHash('sha256').update(v).digest('hex')
const digest=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v)
const canonical=v=>JSON.stringify(sort(v))
const sort=v=>Array.isArray(v)?v.map(sort):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,sort(v[k])])):v
const fields=['problem','targetUser','outcome','scope','nonGoals','constraints','acceptance','failureRecovery']
const project=row=>row?{requestId:row.request_id,draftId:row.draft_id,reviewDigest:row.review_digest,intakeRevision:row.intake_revision,contextRevision:row.context_revision,state:'creation_requested',completionAuthority:false,executionAuthority:false}:null

// verifyReview is a trusted host capability, NOT a browser-supplied validator.
// It must verify every referenced source/claim against the exact serialized
// snapshot. A question response or syntactically valid reference is not proof.
// No default verifier: unavailable verification never enables confirmation.
export function createDestinationConfirmationRepository({transact,verifyReview}={}){
 if(typeof transact!=='function')fail()
 const run=(input,work)=>{
  if(!input||!['workspaceId','accountRef'].every(k=>typeof input[k]==='string'&&/^[A-Za-z0-9:_-]{1,128}$/.test(input[k]))||!uuid(input.draftId))fail()
  const scope=[input.workspaceId,input.accountRef,input.draftId]
  return transact(async({query})=>{
   await query("select set_config('outcome.destination_workspace',$1,true),set_config('outcome.destination_account',$2,true)",scope.slice(0,2))
   return work(query,scope)
  })
 }
 const readSnapshot=async(query,scope)=>{
  const discovery=(await query('select * from outcome_destination_private.discovery_drafts where workspace_id=$1 and account_ref=$2 and draft_id=$3 for update',scope)).rows[0]
  const intake=(await query('select * from outcome_destination_private.drafts where workspace_id=$1 and account_ref=$2 and draft_id=$3 for share',scope)).rows[0]
  if(!discovery||!intake||discovery.intake_revision!==intake.revision||discovery.state!=='draft'||discovery.completion_authority!==false)fail()
  const document=parseDestinationDraft(JSON.stringify(intake.document)),context=parseDiscoveryContext(JSON.stringify(discovery.context))
  if(context.revision!==discovery.revision||discoveryContextDigest(context)!==discovery.context_digest)fail()
  if(canonical(document)!==canonical({schemaVersion:1,mode:context.mode,source:context.source,answers:context.seedAnswers,unknowns:context.unknowns}))fail()
  const row=(await query('select * from outcome_destination_private.discovery_question_receipts where workspace_id=$1 and account_ref=$2 and draft_id=$3 and context_digest=$4',[...scope,discovery.context_digest])).rows[0]
  if(row&&(row.context_revision!==discovery.revision||!digest(row.response_source_digest)))fail()
  const checked=row?validateDestinationQuestionReceipt({serializedContext:JSON.stringify(context),serializedReceipt:JSON.stringify(row.receipt)}):null
  const blockers=[]
  if(fields.some(k=>!document.answers[k]))blockers.push('intake_incomplete')
  if(document.unknowns.length||context.unknowns.length)blockers.push('residual_unknowns')
  if(context.askedQuestionIds.some(id=>!context.answers.some(answer=>answer.questionId===id)))blockers.push('issued_answers_missing')
  if(!checked)blockers.push('question_receipt_missing')
  else if(checked.plan.state!=='coverage_ready_for_review'||checked.plan.unresolvedDomains.length||checked.plan.batch.length)blockers.push('coverage_or_material_gap')
  const snapshot={schemaVersion:1,draftId:scope[2],intakeRevision:intake.revision,contextRevision:discovery.revision,contextDigest:discovery.context_digest,document,context,questionReceipt:checked?.receipt??null,responseSourceDigest:row?.response_source_digest??null,completionAuthority:false,executionAuthority:false}
  const serialized=canonical(snapshot),reviewDigest=hash(serialized)
  return {snapshot,serialized,reviewDigest,blockers}
 }
 const prepare=async(query,scope)=>{
  const {snapshot,serialized,reviewDigest,blockers}=await readSnapshot(query,scope)
  if(blockers.length)throw Error(`destination_confirmation_${blockers[0]}`)
  if(typeof verifyReview!=='function')throw Error('destination_confirmation_verification_pending')
  const raw=await verifyReview({workspaceId:scope[0],accountRef:scope[1],reviewDigest,serializedSnapshot:serialized,query})
  if(typeof raw!=='string'||Buffer.byteLength(raw)>2048)fail()
  let proof;try{proof=JSON.parse(raw)}catch{fail()}
  if(!proof||Object.keys(proof).sort().join(',')!=='completionAuthority,evidenceDigest,reviewDigest,verified'||proof.verified!==true||proof.completionAuthority!==false||proof.reviewDigest!==reviewDigest||!digest(proof.evidenceDigest))fail()
  return {snapshot,reviewDigest,evidenceDigest:proof.evidenceDigest}
 }
 return Object.freeze({
  // Private assessment input only; never route this method to a browser API.
  // Empty structural blockers still mean unverified, not source-ready.
  inspect:input=>run(input,async(query,scope)=>{
   const value=await readSnapshot(query,scope)
   return {serializedSnapshot:value.serialized,reviewDigest:value.reviewDigest,blockers:value.blockers,verificationState:'unverified',completionAuthority:false,executionAuthority:false}
  }),
  load:input=>run(input,async(query,scope)=>project((await query('select * from outcome_destination_private.confirmations where workspace_id=$1 and account_ref=$2 and draft_id=$3',scope)).rows[0])),
  review:input=>run(input,async(query,scope)=>{
   const ready=await prepare(query,scope)
   return {reviewDigest:ready.reviewDigest,intakeRevision:ready.snapshot.intakeRevision,contextRevision:ready.snapshot.contextRevision,completionAuthority:false,executionAuthority:false}
  }),
  confirm:input=>run(input,async(query,scope)=>{
   if(input.confirmed!==true||!uuid(input.requestId)||!digest(input.reviewDigest))fail()
   const ready=await prepare(query,scope)
   if(ready.reviewDigest!==input.reviewDigest)fail()
   const prior=(await query('select * from outcome_destination_private.confirmations where workspace_id=$1 and account_ref=$2 and draft_id=$3',scope)).rows[0]
   if(prior){if(prior.review_digest!==ready.reviewDigest||prior.evidence_digest!==ready.evidenceDigest)fail();return project(prior)}
   const row=(await query('insert into outcome_destination_private.confirmations(workspace_id,account_ref,draft_id,request_id,review_digest,evidence_digest,intake_revision,context_revision,snapshot) values($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *',[...scope,input.requestId,ready.reviewDigest,ready.evidenceDigest,ready.snapshot.intakeRevision,ready.snapshot.contextRevision,JSON.stringify(ready.snapshot)])).rows[0]
   if(!row)fail()
   return project(row)
  }),
 })
}
