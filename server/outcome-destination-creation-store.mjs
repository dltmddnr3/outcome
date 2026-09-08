import {createHash} from 'node:crypto'
const fail=()=>{throw Error('destination_creation_unavailable')}
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(v)
const digest=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v)
const scopeOf=input=>{
 if(!input||!['workspaceId','accountRef'].every(key=>typeof input[key]==='string'&&/^[A-Za-z0-9:_-]{1,128}$/.test(input[key]))||!uuid(input.draftId))fail()
 return [input.workspaceId,input.accountRef,input.draftId]
}
const projectId=scope=>`destination-${createHash('sha256').update(JSON.stringify(scope)).digest('hex')}`
const selectResult=`select r.*,c.request_id,c.review_digest,c.evidence_digest from outcome_destination_private.creation_results r
 join outcome_destination_private.creation_claims c using(workspace_id,account_ref,draft_id,claim_id)
 join outcome_destination_private.confirmations f on f.workspace_id=c.workspace_id and f.account_ref=c.account_ref and f.draft_id=c.draft_id and f.request_id=c.request_id and f.review_digest=c.review_digest and f.evidence_digest=c.evidence_digest
 where r.workspace_id=$1 and r.account_ref=$2 and r.draft_id=$3`
function project(row,scope){
 if(!row)return null
 if(row.project_id!==projectId(scope)||!uuid(row.request_id)||!digest(row.review_digest)||!digest(row.evidence_digest)||!digest(row.publication_digest)||row.completion_authority!==false||row.execution_authority!==false)fail()
 return {projectId:row.project_id,requestId:row.request_id,reviewDigest:row.review_digest,state:'package_registered',completionAuthority:false,executionAuthority:false}
}
// Trusted host storage only. Browser runtimes receive {load}, not claim/record.
// Each transact must commit before resolving; uncertainty never retries here.
export function createDestinationCreationStore({transact}={}){
 if(typeof transact!=='function')fail()
 const run=(input,work)=>{const scope=scopeOf(input);return transact(async({query})=>{
  await query("select set_config('outcome.destination_workspace',$1,true),set_config('outcome.destination_account',$2,true)",scope.slice(0,2))
  return work(query,scope)
 })}
 const load=input=>run(input,async(query,scope)=>project((await query(selectResult,scope)).rows[0],scope))
 return Object.freeze({load,
  claim:input=>run(input,async(query,scope)=>{
   if(!uuid(input.requestId)||!uuid(input.claimId)||!digest(input.reviewDigest)||!digest(input.evidenceDigest))fail()
   const args=[...scope,input.requestId,input.reviewDigest,input.evidenceDigest]
   if((await query('select 1 from outcome_destination_private.confirmations where workspace_id=$1 and account_ref=$2 and draft_id=$3 and request_id=$4 and review_digest=$5 and evidence_digest=$6',args)).rows.length!==1)fail()
   const rows=(await query('insert into outcome_destination_private.creation_claims(workspace_id,account_ref,draft_id,request_id,review_digest,evidence_digest,claim_id) values($1,$2,$3,$4,$5,$6,$7) on conflict(workspace_id,account_ref,draft_id) do nothing returning claim_id',[...args,input.claimId])).rows
   return {acquired:rows.length===1}
  }),
  record:input=>run(input,async(query,scope)=>{
   if(!uuid(input.claimId)||input.projectId!==projectId(scope)||!digest(input.publicationDigest))fail()
   await query('insert into outcome_destination_private.creation_results(workspace_id,account_ref,draft_id,claim_id,project_id,publication_digest) values($1,$2,$3,$4,$5,$6) on conflict(workspace_id,account_ref,draft_id) do nothing',[...scope,input.claimId,input.projectId,input.publicationDigest])
   const row=(await query(selectResult,scope)).rows[0]
   if(!row||row.claim_id!==input.claimId||row.publication_digest!==input.publicationDigest)fail()
   return project(row,scope)
  }),
 })
}
