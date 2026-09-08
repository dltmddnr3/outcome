import {createDestinationConfirmationRepository} from './outcome-destination-confirmation-repository.mjs'
import {createDestinationSourceVerifier} from './outcome-destination-source-verifier.mjs'
const fail=()=>{throw Error('destination_evidence_publication_unavailable')}
const canonicalSources=value=>JSON.stringify(Object.fromEntries(Object.keys(value).sort().map(key=>[key,value[key]])))

// Trusted, separately authorized operational capability only. Never composed
// into the web runtime. No credentials, connection creation or retries here.
// The caller supplies an already reviewed semantic assessment, not a model
// response assumed trustworthy because its citations happen to match.
export function createDestinationEvidencePublisher({transact}={}){
 if(typeof transact!=='function')fail()
 return Object.freeze({publish:async input=>{
  try{
   const {workspaceId,accountRef,draftId,expectedReviewDigest,assessment,serializedSources}=input??{}
   if(typeof expectedReviewDigest!=='string'||!/^[a-f0-9]{64}$/.test(expectedReviewDigest)||typeof assessment!=='string'||Buffer.byteLength(assessment)>131072||typeof serializedSources!=='string'||Buffer.byteLength(serializedSources)>4194304)fail()
   const sources=JSON.parse(serializedSources)
   if(!sources||Array.isArray(sources)||typeof sources!=='object'||!Object.keys(sources).length||Object.keys(sources).length>64||Object.entries(sources).some(([key,value])=>!(/^[a-z0-9][a-z0-9_-]{0,79}$/).test(key)||typeof value!=='string'||Buffer.byteLength(value)>524288))fail()
   const requested=new Set(),serialized=canonicalSources(sources)
   return await transact(async({query})=>{
    const scope={workspaceId,accountRef,draftId}
    const inspection=await createDestinationConfirmationRepository({transact:work=>work({query})}).inspect(scope)
    if(inspection.reviewDigest!==expectedReviewDigest||inspection.blockers.length)fail()
    const verify=createDestinationSourceVerifier({readAssessment:async()=>assessment,readSource:async({ref})=>{if(!Object.hasOwn(sources,ref))fail();requested.add(ref);return sources[ref]}})
    const proof=JSON.parse(await verify({workspaceId,accountRef,reviewDigest:expectedReviewDigest,serializedSnapshot:inspection.serializedSnapshot}))
    if(requested.size!==Object.keys(sources).length)fail()
    const keys=[workspaceId,accountRef,expectedReviewDigest]
    const read=()=>query('select assessment,sources from outcome_destination_private.verification_evidence where workspace_id=$1 and account_ref=$2 and review_digest=$3',keys)
    const prior=(await read()).rows
    if(prior.length>1)fail()
    if(!prior.length)await query('insert into outcome_destination_private.verification_evidence(workspace_id,account_ref,review_digest,assessment,sources) values($1,$2,$3,$4,$5)',[...keys,assessment,serialized])
    const rows=prior.length?prior:(await read()).rows
    if(rows.length!==1||rows[0].assessment!==assessment||canonicalSources(rows[0].sources)!==serialized)fail()
    return Object.freeze({schemaVersion:1,reviewDigest:expectedReviewDigest,evidenceDigest:proof.evidenceDigest,state:'evidence_recorded',completionAuthority:false,executionAuthority:false})
   })
  }catch{fail()}
 }})
}
