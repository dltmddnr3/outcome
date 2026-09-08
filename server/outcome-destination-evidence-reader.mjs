import {createDestinationSourceVerifier} from './outcome-destination-source-verifier.mjs'
const fail=()=>{throw Error('destination_evidence_unavailable')}

// Reuses the confirmation transaction's scoped connection: no nested pool
// checkout, no untrusted URL/path resolver, no write capability or cache.
export function createDestinationEvidenceReaders({query}={}){
 if(typeof query!=='function')fail()
 const read=async(input,source)=>{
  try{
   const {workspaceId,accountRef,reviewDigest,signal}=input??{}
   if(![workspaceId,accountRef].every(v=>typeof v==='string'&&/^[A-Za-z0-9:_-]{1,128}$/.test(v))||typeof reviewDigest!=='string'||!/^[a-f0-9]{64}$/.test(reviewDigest))fail()
   const args=[workspaceId,accountRef,reviewDigest]
   if(source){if(typeof input.ref!=='string'||!/^[a-z0-9][a-z0-9_-]{0,79}$/.test(input.ref))fail();args.push(input.ref)}
   if(signal?.aborted)fail()
   const sql=source
    ? "select sources ->> $4 as content from outcome_destination_private.verification_evidence where workspace_id=$1 and account_ref=$2 and review_digest=$3 and jsonb_typeof(sources -> $4)='string'"
    : 'select assessment as content from outcome_destination_private.verification_evidence where workspace_id=$1 and account_ref=$2 and review_digest=$3'
   const result=await query(sql,args)
   if(signal?.aborted||result?.rows?.length!==1)fail()
   const content=result.rows[0].content
   if(typeof content!=='string'||Buffer.byteLength(content)>(source?524288:131072))fail()
   return content
  }catch{fail()}
 }
 return Object.freeze({readAssessment:input=>read(input,false),readSource:input=>read(input,true)})
}
export const verifyStoredDestinationReview=async input=>createDestinationSourceVerifier(createDestinationEvidenceReaders({query:input?.query}))(input)
