import {destinationDocumentDigest} from './outcome-destination-analysis-source.mjs'
const fail=()=>{throw Error('destination_analysis_unavailable')}
const uuid=value=>typeof value==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(value)
const scope=input=>{
 if(!input||!['workspaceId','accountRef'].every(k=>typeof input[k]==='string'&&/^[A-Za-z0-9:_-]{1,128}$/.test(input[k]))||!uuid(input.requestId))fail()
 return [input.workspaceId,input.accountRef,input.requestId]
}
const project=row=>row?{requestId:row.request_id,draftId:row.draft_id,draftRevision:row.draft_revision,documentDigest:row.document_digest,state:row.state,result:row.result,completionAuthority:false}:null
export function createDestinationAnalysisRepository({transact,validateResult}={}) {
 if(typeof transact!=='function')fail()
 const run=(input,work)=>transact(async({query})=>{
  const values=scope(input)
  await query("select set_config('outcome.destination_workspace',$1,true),set_config('outcome.destination_account',$2,true)",values.slice(0,2))
  return work(query,values)
 })
 const read=(query,values)=>query('select * from outcome_destination_private.analysis_requests where workspace_id=$1 and account_ref=$2 and request_id=$3',values).then(r=>r.rows[0]??null)
 return Object.freeze({
  load:input=>run(input,async(query,values)=>project(await read(query,values))),
  enqueue:input=>run(input,async(query,values)=>{
   if(!uuid(input.draftId)||!Number.isSafeInteger(input.draftRevision)||input.draftRevision<1||typeof input.documentDigest!=='string'||!/^[a-f0-9]{64}$/.test(input.documentDigest))fail()
   await query('select pg_advisory_xact_lock(hashtextextended($1,0))',[JSON.stringify(values)])
   let row=await read(query,values)
   if(!row){
    const draft=(await query('select revision,document from outcome_destination_private.drafts where workspace_id=$1 and account_ref=$2 and draft_id=$3', [...values.slice(0,2),input.draftId])).rows[0]
    if(!draft||draft.revision!==input.draftRevision||destinationDocumentDigest(draft.document)!==input.documentDigest)fail()
    row=(await query("insert into outcome_destination_private.analysis_requests(workspace_id,account_ref,request_id,draft_id,draft_revision,document_digest,document) values($1,$2,$3,$4,$5,$6,$7) returning *",[...values,input.draftId,input.draftRevision,input.documentDigest,JSON.stringify(draft.document)])).rows[0]
   }
   if(row.draft_id!==input.draftId||row.draft_revision!==input.draftRevision||row.document_digest!==input.documentDigest)fail()
   return project(row)
  }),
  claim:input=>run(input,async(query,values)=>{
   if(!uuid(input.dispatchToken))fail()
   const row=(await query("update outcome_destination_private.analysis_requests set state='dispatch_started',dispatch_token=$4 where workspace_id=$1 and account_ref=$2 and request_id=$3 and state='queued' returning *",[...values,input.dispatchToken])).rows[0]
   return row?{...project(row),serializedDocument:JSON.stringify(row.document)}:null
  }),
  finish:input=>run(input,async(query,values)=>{
   if(!uuid(input.dispatchToken)||!['completed','failed','delivery_unknown'].includes(input.state))fail()
   const row=await read(query,values)
   if(!row||row.state!=='dispatch_started'||row.dispatch_token!==input.dispatchToken)return null
   let result=null
   if(input.state==='completed'){
    if(typeof validateResult!=='function')fail()
    result=await validateResult({source:JSON.stringify(row.document),draftRevision:row.draft_revision,documentDigest:row.document_digest,result:input.result})
    if(!result||typeof result!=='object'||Array.isArray(result)||result.completionAuthority!==false||Buffer.byteLength(JSON.stringify(result))>131072)fail()
   }
   const updated=(await query('update outcome_destination_private.analysis_requests set state=$5,result=$6 where workspace_id=$1 and account_ref=$2 and request_id=$3 and dispatch_token=$4 and state=\'dispatch_started\' returning *',[...values,input.dispatchToken,input.state,result===null?null:JSON.stringify(result)])).rows[0]
   return project(updated)
  }),
 })
}
