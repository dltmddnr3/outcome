import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {PGlite} from '@electric-sql/pglite'
import {createDestinationDraftRepository} from './outcome-destination-postgres.mjs'
import {createDiscoveryRepository} from './outcome-destination-discovery-repository.mjs'
import {createDiscoveryQuestionRepository} from './outcome-destination-question-repository.mjs'
import {createDestinationConfirmationRepository} from './outcome-destination-confirmation-repository.mjs'
import {verifyStoredDestinationReview} from './outcome-destination-evidence-reader.mjs'
import {createDestinationEvidencePublisher} from './outcome-destination-evidence-publisher.mjs'
import {discoveryDomains} from '../src/lib/destination-question-policy.mjs'

async function fixture(unknowns=[]){
 const db=await PGlite.create('memory://')
 await db.exec('create role anon nologin;create role authenticated nologin')
 for(const file of ['20260908011009_outcome_destination_private_drafts.sql','20260908042838_outcome_destination_discovery_drafts.sql','20260908044800_outcome_discovery_question_receipts.sql','20260908072037_outcome_destination_confirmations.sql','20260908075808_outcome_destination_verification_evidence.sql'])await db.exec(await readFile(new URL(`../supabase/migrations/${file}`,import.meta.url),'utf8'))
 const transact=work=>db.transaction(tx=>work({query:(sql,args)=>tx.query(sql,args)}))
 const restricted=work=>transact(async({query})=>{await query('set local role outcome_destination_backend');return work({query})})
 const scope={workspaceId:'workspace',accountRef:'owner',draftId:'00000000-0000-4000-8000-000000000001'}
 const document={schemaVersion:1,mode:'guided_200q',source:'',answers:Object.fromEntries(['problem','targetUser','outcome','scope','nonGoals','constraints','acceptance','failureRecovery'].map(k=>[k,'synthetic requirement'])),unknowns}
 const drafts=createDestinationDraftRepository({transact:restricted})
 await drafts.save({...scope,requestId:'00000000-0000-4000-8000-000000000002',expectedRevision:0,document:JSON.stringify(document)})
 const context={mode:document.mode,source:'',seedAnswers:document.answers,unknowns,revision:1,askedQuestionIds:[],answers:[]}
 const discovery=await createDiscoveryRepository({transact:restricted}).save({...scope,requestId:'00000000-0000-4000-8000-000000000003',expectedRevision:0,intakeRevision:1,context:JSON.stringify(context)})
 const coverage=discoveryDomains.map(domain=>({domain,state:'contract_ready',evidenceRefs:['synthetic-contract']}))
 await createDiscoveryQuestionRepository({transact:restricted}).record({...scope,contextDigest:discovery.contextDigest,bindingVersion:1,responseSourceDigest:'a'.repeat(64),receipt:JSON.stringify({schemaVersion:1,contextDigest:discovery.contextDigest,coverage,questions:[],completionAuthority:false})})
 const confirmation=createDestinationConfirmationRepository({transact:restricted,verifyReview:verifyStoredDestinationReview})
 const snapshot=await confirmation.inspect(scope)
 const source='Synthetic technical assessment evidence only',contentDigest=createHash('sha256').update(source).digest('hex')
 const assessment=JSON.stringify({schemaVersion:1,...{workspaceId:scope.workspaceId,accountRef:scope.accountRef},reviewDigest:snapshot.reviewDigest,verdict:'supported_for_owner_review',domains:discoveryDomains.map(domain=>({domain,state:'contract_ready',assessment:'supported',evidence:[{ref:'synthetic-contract',contentDigest,startLine:1,endLine:1,quote:source}]})),completionAuthority:false})
 const input={...scope,expectedReviewDigest:snapshot.reviewDigest,assessment,serializedSources:JSON.stringify({'synthetic-contract':source})}
 const count=async table=>(await db.query(`select count(*)::int as n from outcome_destination_private.${table}`)).rows[0].n
 return {db,transact,restricted,scope,document,drafts,confirmation,input,count}
}
test('trusted publication is exact once, readable by web verifier, never confirms or overwrites',async()=>{
 const f=await fixture();try{
  const publisher=createDestinationEvidencePublisher(f)
  await assert.rejects(()=>f.confirmation.review(f.scope))
  const [receipt,concurrent]=await Promise.all([publisher.publish(f.input),publisher.publish(f.input)])
  assert.deepEqual(concurrent,receipt)
  assert.deepEqual(Object.keys(receipt).sort(),['completionAuthority','evidenceDigest','executionAuthority','reviewDigest','schemaVersion','state'])
  assert.equal(receipt.state,'evidence_recorded');assert.equal(receipt.completionAuthority,false);assert.equal(receipt.executionAuthority,false)
  assert.deepEqual(await publisher.publish(f.input),receipt);assert.equal(await f.count('verification_evidence'),1)
  assert.equal((await f.confirmation.review(f.scope)).reviewDigest,receipt.reviewDigest)
  await assert.rejects(()=>publisher.publish({...f.input,assessment:JSON.stringify(JSON.parse(f.input.assessment),null,2)}),/^Error: destination_evidence_publication_unavailable$/)
  assert.equal(await f.count('verification_evidence'),1);assert.equal(await f.count('confirmations'),0)
  await f.drafts.save({...f.scope,requestId:'00000000-0000-4000-8000-000000000004',expectedRevision:1,document:JSON.stringify({...f.document,source:'owner changed'})})
  await assert.rejects(()=>publisher.publish(f.input));assert.equal(await f.count('verification_evidence'),1)
 }finally{await f.db.close()}
})
test('invalid evidence, stale digest, foreign owner and ordinary runtime cannot publish',async()=>{
 const f=await fixture();try{
  const publisher=createDestinationEvidencePublisher(f)
  for(const change of [{expectedReviewDigest:'0'.repeat(64)},{accountRef:'other'},{assessment:'{}'},{serializedSources:'{}'},{serializedSources:JSON.stringify({'synthetic-contract':'wrong source'})},{serializedSources:JSON.stringify({...JSON.parse(f.input.serializedSources),extra:'unreferenced'})}]){
   await assert.rejects(()=>publisher.publish({...f.input,...change}),/^Error: destination_evidence_publication_unavailable$/)
   assert.equal(await f.count('verification_evidence'),0)
  }
  await assert.rejects(()=>createDestinationEvidencePublisher({transact:f.restricted}).publish(f.input),/^Error: destination_evidence_publication_unavailable$/)
  assert.equal(await f.count('verification_evidence'),0)
  // Simulate failed readback after insert: the trusted transaction must roll back.
  let reads=0
  const broken=work=>f.transact(({query})=>work({query:async(sql,args)=>{if(sql.startsWith('select assessment,sources')&&++reads===2)throw Error('private driver error');return query(sql,args)}}))
  await assert.rejects(()=>createDestinationEvidencePublisher({transact:broken}).publish(f.input),/^Error: destination_evidence_publication_unavailable$/)
  assert.equal(await f.count('verification_evidence'),0);assert.equal(await f.count('confirmations'),0)
 }finally{await f.db.close()}
})
test('unresolved unknowns cannot become publishable through synthetic ready labels',async()=>{
 const f=await fixture(['still unknown']);try{
  await assert.rejects(()=>createDestinationEvidencePublisher(f).publish(f.input))
  assert.equal(await f.count('verification_evidence'),0)
 }finally{await f.db.close()}
})
