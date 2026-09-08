import {validateDestinationQuestionReceipt} from './outcome-destination-question-receipt.mjs'
import {discoveryContextDigest,parseDiscoveryContext} from './outcome-destination-discovery-repository.mjs'
const fail=()=>{throw Error('discovery_questions_unavailable')}
const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v)
export function createDiscoveryQuestionRepository({transact}={}) {
 if(typeof transact!=='function')fail()
 const run=(input,work)=>{
  if(!input||!['workspaceId','accountRef'].every(k=>typeof input[k]==='string'&&/^[A-Za-z0-9:_-]{1,128}$/.test(input[k]))||typeof input.draftId!=='string'||!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(input.draftId))fail()
  const scope=[input.workspaceId,input.accountRef,input.draftId]
  return transact(async({query})=>{
   await query("select set_config('outcome.destination_workspace',$1,true),set_config('outcome.destination_account',$2,true)",scope.slice(0,2))
   const current=(await query('select * from outcome_destination_private.discovery_drafts where workspace_id=$1 and account_ref=$2 and draft_id=$3 for update',scope)).rows[0]
   if(!current)return null
   const intake=(await query('select revision from outcome_destination_private.drafts where workspace_id=$1 and account_ref=$2 and draft_id=$3 for share',scope)).rows[0]
   if(!intake||intake.revision!==current.intake_revision)fail()
   const context=parseDiscoveryContext(JSON.stringify(current.context))
   if(context.revision!==current.revision||discoveryContextDigest(context)!==current.context_digest)fail()
   return work(query,scope,current)
  })
 }
 const validate=(row,current)=>{
  if(!row)return null
  if(row.context_revision!==current.revision)fail()
  const value=validateDestinationQuestionReceipt({serializedContext:JSON.stringify(current.context),serializedReceipt:JSON.stringify(row.receipt)})
  return {contextDigest:current.context_digest,contextRevision:current.revision,receipt:JSON.stringify(value.receipt),sourceVerification:'required',completionAuthority:false}
 }
 return Object.freeze({
  load:input=>run(input,async(query,scope,current)=>validate((await query('select * from outcome_destination_private.discovery_question_receipts where workspace_id=$1 and account_ref=$2 and draft_id=$3 and context_digest=$4',[...scope,current.context_digest])).rows[0],current)),
  // Trusted internal ingestion only. Metadata is not independent proof of origin.
  record:input=>run(input,async(query,scope,current)=>{
   if(input.contextDigest!==current.context_digest||!Number.isSafeInteger(input.bindingVersion)||input.bindingVersion<1||!hash(input.responseSourceDigest))fail()
   const checked=validateDestinationQuestionReceipt({serializedContext:JSON.stringify(current.context),serializedReceipt:input.receipt})
   await query('insert into outcome_destination_private.discovery_question_receipts(workspace_id,account_ref,draft_id,context_digest,context_revision,binding_version,response_source_digest,receipt) values($1,$2,$3,$4,$5,$6,$7,$8) on conflict do nothing',[...scope,current.context_digest,current.revision,input.bindingVersion,input.responseSourceDigest,JSON.stringify(checked.receipt)])
   const row=(await query('select * from outcome_destination_private.discovery_question_receipts where workspace_id=$1 and account_ref=$2 and draft_id=$3 and context_digest=$4',[...scope,current.context_digest])).rows[0]
   // jsonb reorders object keys; arrays and every value remain significant.
   if(!row||row.binding_version!==input.bindingVersion||row.response_source_digest!==input.responseSourceDigest||canonical(row.receipt)!==canonical(checked.receipt))fail()
   return validate(row,current)
  }),
 })
}
function canonical(value){return JSON.stringify(sort(value))}
function sort(value){return Array.isArray(value)?value.map(sort):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,sort(value[key])])):value}
