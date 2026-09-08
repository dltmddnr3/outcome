import {randomUUID} from 'node:crypto'
import {parseDiscoveryContext,discoveryContextDigest} from './outcome-destination-discovery-repository.mjs'
const fail=()=>{throw Error('discovery_request_unavailable')}
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(v)
const project=row=>row?{requestId:row.request_id,draftId:row.draft_id,contextDigest:row.context_digest,contextRevision:row.context_revision,state:row.state,completionAuthority:false}:null
export function createDiscoveryQuestionRequests({transact}={}){
 if(typeof transact!=='function')fail()
 const run=(input,work)=>{
  if(!input||!['workspaceId','accountRef'].every(k=>typeof input[k]==='string'&&/^[A-Za-z0-9:_-]{1,128}$/.test(input[k]))||!uuid(input.draftId)||typeof input.contextDigest!=='string'||!/^[a-f0-9]{64}$/.test(input.contextDigest))fail()
  const scope=[input.workspaceId,input.accountRef,input.draftId,input.contextDigest]
  return transact(async({query})=>{
   await query("select set_config('outcome.destination_workspace',$1,true),set_config('outcome.destination_account',$2,true)",scope.slice(0,2))
   return work(query,scope)
  })
 }
 const read=async(query,scope)=>(await query('select * from outcome_destination_private.discovery_question_requests where workspace_id=$1 and account_ref=$2 and draft_id=$3 and context_digest=$4',scope)).rows[0]
 const current=async(query,scope)=>{
  const row=(await query('select * from outcome_destination_private.discovery_drafts where workspace_id=$1 and account_ref=$2 and draft_id=$3 for update',scope.slice(0,3))).rows[0]
  if(!row||row.context_digest!==scope[3])fail()
  const intake=(await query('select revision from outcome_destination_private.drafts where workspace_id=$1 and account_ref=$2 and draft_id=$3 for share',scope.slice(0,3))).rows[0]
  const context=parseDiscoveryContext(JSON.stringify(row.context))
  if(!intake||intake.revision!==row.intake_revision||context.revision!==row.revision||discoveryContextDigest(context)!==scope[3])fail()
  return row
 }
 return Object.freeze({
  load:input=>run(input,async(query,scope)=>project(await read(query,scope))),
  readClaim:input=>run(input,async(query,scope)=>{
   if(!uuid(input.dispatchToken))fail()
   const row=await read(query,scope)
   return row?.state==='dispatch_started'&&row.dispatch_token===input.dispatchToken?project(row):null
  }),
  // Internal collection-only reconciliation; never exposed in the public projection.
  readPendingClaim:input=>run(input,async(query,scope)=>{
   if(!uuid(input.requestId))fail()
   const source=await current(query,scope),row=await read(query,scope)
   if(row?.state!=='dispatch_started'||row.request_id!==input.requestId||row.context_revision!==source.revision||!uuid(row.dispatch_token))return null
   return {...project(row),dispatchToken:row.dispatch_token}
  }),
  enqueue:input=>run(input,async(query,scope)=>{
   const row=await current(query,scope)
   await query('insert into outcome_destination_private.discovery_question_requests(workspace_id,account_ref,draft_id,context_digest,context_revision,request_id) values($1,$2,$3,$4,$5,$6) on conflict do nothing',[...scope,row.revision,randomUUID()])
   return project(await read(query,scope))
  }),
  claim:input=>run(input,async(query,scope)=>{
   if(!uuid(input.dispatchToken))fail()
   const source=await current(query,scope)
   const row=(await query("update outcome_destination_private.discovery_question_requests set state='dispatch_started',dispatch_token=$5 where workspace_id=$1 and account_ref=$2 and draft_id=$3 and context_digest=$4 and state='queued' returning *",[...scope,input.dispatchToken])).rows[0]
   return row?{...project(row),serializedContext:JSON.stringify(source.context)}:null
  }),
  finish:input=>run(input,async(query,scope)=>{
   if(!uuid(input.dispatchToken)||!['completed','failed','delivery_unknown'].includes(input.state))fail()
   const row=(await query("update outcome_destination_private.discovery_question_requests set state=$6 where workspace_id=$1 and account_ref=$2 and draft_id=$3 and context_digest=$4 and dispatch_token=$5 and state='dispatch_started' returning *",[...scope,input.dispatchToken,input.state])).rows[0]
   return project(row)
  }),
 })
}
