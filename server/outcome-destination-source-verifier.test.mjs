import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {createDestinationSourceVerifier} from './outcome-destination-source-verifier.mjs'
import {discoveryDomains} from '../src/lib/destination-question-policy.mjs'
import {discoveryContextDigest} from './outcome-destination-discovery-repository.mjs'
const hash=text=>createHash('sha256').update(text).digest('hex')
function fixture(){
 const context={mode:'guided_200q',source:'',seedAnswers:{problem:'synthetic'},unknowns:[],revision:1,answers:[],askedQuestionIds:[]}
 const coverage=discoveryDomains.map(domain=>({domain,state:'contract_ready',evidenceRefs:['contract']}))
 const serializedSnapshot=JSON.stringify({context,questionReceipt:{schemaVersion:1,contextDigest:discoveryContextDigest(context),coverage,questions:[],completionAuthority:false},completionAuthority:false,executionAuthority:false})
 const input={workspaceId:'workspace',accountRef:'owner',reviewDigest:hash(serializedSnapshot),serializedSnapshot}
 const content='Synthetic contract\nNormal, failure, recovery and verification are covered.'
 const assessment={schemaVersion:1,workspaceId:input.workspaceId,accountRef:input.accountRef,reviewDigest:input.reviewDigest,verdict:'supported_for_owner_review',domains:coverage.map(c=>({domain:c.domain,state:c.state,assessment:'supported',evidence:[{ref:'contract',contentDigest:hash(content),startLine:2,endLine:2,quote:content.split('\n')[1]}]})),completionAuthority:false}
 return {input,content,assessment}
}
test('trusted semantic assessment and exact source excerpts produce a review-bound proof, not completion',async()=>{
 const f=fixture();let reads=0
 const verify=createDestinationSourceVerifier({readAssessment:async input=>{assert.equal(input.accountRef,'owner');return JSON.stringify(f.assessment)},readSource:async input=>{assert.equal(input.ref,'contract');reads++;return f.content}})
 const result=JSON.parse(await verify(f.input));assert.equal(result.reviewDigest,f.input.reviewDigest);assert.equal(result.evidenceDigest,hash(JSON.stringify(f.assessment)));assert.equal(result.completionAuthority,false);assert.equal(reads,1)
})
test('wrong scope, review, state, duplicate domains and missing support reject',async()=>{
 for(const mutate of [a=>a.accountRef='other',a=>a.reviewDigest='f'.repeat(64),a=>a.verdict='unreviewed',a=>a.completionAuthority=true,a=>a.domains.pop(),a=>a.domains[1]=a.domains[0],a=>a.domains[0].state='non_goal',a=>a.domains[0].assessment='unknown',a=>a.domains[0].evidence[0].ref='../private']){
  const f=fixture();mutate(f.assessment)
  const verify=createDestinationSourceVerifier({readAssessment:async()=>JSON.stringify(f.assessment),readSource:async()=>f.content})
  await assert.rejects(()=>verify(f.input),/destination_source_verification_unavailable/)
 }
})
test('stale source bytes, fabricated quote, private quote and unavailable readers fail closed',async()=>{
 for(const mutate of [f=>f.content+=' changed',f=>f.assessment.domains[0].evidence[0].quote='invented',f=>f.assessment.domains[0].evidence[0].quote='password=synthetic-private',f=>f.assessment.domains[0].evidence[0].endLine=999]){
  const f=fixture();mutate(f)
  await assert.rejects(()=>createDestinationSourceVerifier({readAssessment:async()=>JSON.stringify(f.assessment),readSource:async()=>f.content})(f.input))
 }
 for(const raw of [null,'invalid','x'.repeat(131073)]){
  const f=fixture();await assert.rejects(()=>createDestinationSourceVerifier({readAssessment:async()=>raw,readSource:async()=>f.content})(f.input))
 }
})
test('bounded timeout aborts readers without retry',async()=>{
 const f=fixture();let calls=0,signal
 const verify=createDestinationSourceVerifier({timeoutMs:10,readAssessment:async input=>{calls++;signal=input.signal;return new Promise(()=>{})},readSource:async()=>{throw Error('must not read')}})
 await assert.rejects(()=>verify(f.input));assert.equal(calls,1);assert.equal(signal.aborted,true)
})
test('source count, individual size and aggregate byte limits are enforced',async()=>{
 for(const mode of ['count','individual','aggregate']){
  const f=fixture(),snapshot=JSON.parse(f.input.serializedSnapshot)
  const content=mode==='individual'?'x'.repeat(524289):mode==='aggregate'?'quote\n'+'x'.repeat(300000):'quote'
  const count=mode==='count'?10:1
  for(let i=0;i<8;i++){
   const refs=Array.from({length:count},(_,j)=>`source-${i}-${j}`)
   snapshot.questionReceipt.coverage[i].evidenceRefs=refs
   f.assessment.domains[i].evidence=refs.map(ref=>({ref,contentDigest:hash(content),startLine:1,endLine:1,quote:'quote'}))
  }
  f.input.serializedSnapshot=JSON.stringify(snapshot);f.input.reviewDigest=hash(f.input.serializedSnapshot);f.assessment.reviewDigest=f.input.reviewDigest
  let reads=0
  const verify=createDestinationSourceVerifier({readAssessment:async()=>JSON.stringify(f.assessment),readSource:async()=>{reads++;return content}})
  await assert.rejects(()=>verify(f.input))
  assert.equal(reads,mode==='count'?64:mode==='individual'?1:7)
 }
})
