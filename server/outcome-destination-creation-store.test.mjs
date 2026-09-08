import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {mkdtempSync,readdirSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {PGlite} from '@electric-sql/pglite'
import {createDestinationDraftRepository} from './outcome-destination-postgres.mjs'
import {createDiscoveryRepository} from './outcome-destination-discovery-repository.mjs'
import {createDiscoveryQuestionRepository} from './outcome-destination-question-repository.mjs'
import {createDestinationConfirmationRepository} from './outcome-destination-confirmation-repository.mjs'
import {createDestinationCreationStore} from './outcome-destination-creation-store.mjs'
import {createDestinationCreationWorker} from './outcome-destination-creation-worker.mjs'
import {runDestinationCreationOnce} from '../scripts/run-destination-creation.mjs'
import {createConfirmedPackagePublisher} from './outcome-creation-catalog.mjs'
import {createDestinationRuntime} from './outcome-destination-runtime.mjs'
import {handleDestinationDraftRequest} from './outcome-destination-api.mjs'
import {discoveryDomains} from '../src/lib/destination-question-policy.mjs'

const scope={workspaceId:'workspace',accountRef:'owner',draftId:'00000000-0000-4000-8000-000000000001',requestId:'00000000-0000-4000-8000-000000000002'}
const claimId='00000000-0000-4000-8000-000000000003'
async function fixture(){
 const db=await PGlite.create('memory://');await db.exec('create role anon nologin;create role authenticated nologin')
 for(const file of ['20260908011009_outcome_destination_private_drafts.sql','20260908042838_outcome_destination_discovery_drafts.sql','20260908044800_outcome_discovery_question_receipts.sql','20260908072037_outcome_destination_confirmations.sql','20260908122836_outcome_destination_creation_results.sql'])await db.exec(await readFile(new URL(`../supabase/migrations/${file}`,import.meta.url),'utf8'))
 const transact=work=>db.transaction(async tx=>{await tx.exec('set local role outcome_destination_backend');return work({query:(sql,args)=>tx.query(sql,args)})})
 const document={schemaVersion:1,mode:'guided_200q',source:'',answers:Object.fromEntries(['problem','targetUser','outcome','scope','nonGoals','constraints','acceptance','failureRecovery'].map(key=>[key,`synthetic ${key}`])),unknowns:[]}
 await createDestinationDraftRepository({transact}).save({...scope,expectedRevision:0,document:JSON.stringify(document)})
 const context={mode:document.mode,source:'',seedAnswers:document.answers,unknowns:[],answers:[],askedQuestionIds:[],revision:1}
 const discovery=await createDiscoveryRepository({transact}).save({...scope,expectedRevision:0,intakeRevision:1,context:JSON.stringify(context)})
 await createDiscoveryQuestionRepository({transact}).record({...scope,contextDigest:discovery.contextDigest,bindingVersion:1,responseSourceDigest:'a'.repeat(64),receipt:JSON.stringify({schemaVersion:1,contextDigest:discovery.contextDigest,coverage:discoveryDomains.map(domain=>({domain,state:'contract_ready',evidenceRefs:['synthetic-contract']})),questions:[],completionAuthority:false})})
 // Synthetic semantic verifier; real restricted SQL and local filesystem only.
 const confirmationRepository=createDestinationConfirmationRepository({transact,verifyReview:async({reviewDigest})=>JSON.stringify({reviewDigest,evidenceDigest:'b'.repeat(64),verified:true,completionAuthority:false})})
 const store=createDestinationCreationStore({transact}),catalog=mkdtempSync(join(tmpdir(),'outcome-creation-transport-'))
 const publisher=createConfirmedPackagePublisher({catalog,confirmationRepository})
 const confirm=async()=>{const review=await confirmationRepository.review(scope);await confirmationRepository.confirm({...scope,confirmed:true,reviewDigest:review.reviewDigest});return {...scope,claimId,reviewDigest:review.reviewDigest,evidenceDigest:'b'.repeat(64)}}
 return {db,transact,store,catalog,publisher,confirmationRepository,confirm}
}
test('one-shot runner check and execution use restricted SQL and actual package publication',async()=>{
 const f=await fixture()
 try{
  const confirmation=await f.confirm(),output=[],options={...f,...confirmation,scope,mode:'--check',ready:async()=>true,signal:new AbortController().signal,write:line=>output.push(JSON.parse(line))}
  const before=readdirSync(f.catalog).sort()
  assert.equal(await runDestinationCreationOnce(options),0)
  assert.deepEqual(readdirSync(f.catalog).sort(),before)
  for(const table of ['creation_claims','creation_results'])assert.equal(Number((await f.db.query(`select count(*) as n from outcome_destination_private.${table}`)).rows[0].n),0)
  assert.equal(await runDestinationCreationOnce({...options,mode:'--run-once'}),0)
  const files=readdirSync(f.catalog).sort()
  assert.equal(await runDestinationCreationOnce({...options,mode:'--run-once'}),0)
  assert.deepEqual(readdirSync(f.catalog).sort(),files)
  assert.deepEqual(output.map(row=>row.state),['CHECKED_NO_MUTATION','PACKAGE_RECORDED','ALREADY_RECORDED'])
  assert.equal((await f.store.load(scope)).state,'package_registered')
 }finally{await f.db.close()}
})
test('confirmed one-shot local publication becomes durable owner-scoped hosted readback without replay',async()=>{
 const f=await fixture();try{
  const worker=createDestinationCreationWorker(f)
  assert.equal((await worker.runOnce(scope)).state,'CONFIRMATION_UNVERIFIED');assert.deepEqual(readdirSync(f.catalog),[])
  await f.confirm();assert.equal(await f.store.load(scope),null)
  const result=await worker.runOnce(scope);assert.equal(result.state,'PACKAGE_RECORDED')
  assert.equal((await createDestinationCreationWorker({...f,store:{...f.store,load:async()=>({...result.creation,executionAuthority:true})}}).runOnce(scope)).state,'RESULT_CONFLICT')
  assert.deepEqual(await f.store.load(scope),result.creation)
  const files=readdirSync(f.catalog).sort();assert.equal((await worker.runOnce(scope)).state,'ALREADY_RECORDED');assert.deepEqual(readdirSync(f.catalog).sort(),files)
  assert.equal(await f.store.load({...scope,accountRef:'foreign'}),null)
  const identityService={authenticate:async()=>({}),resolveBridgeAuthority:async()=>({workspace_id:scope.workspaceId,account_ref:scope.accountRef,project_ids:['outcome']})}
  const reply=await handleDestinationDraftRequest({pathname:`/api/private/destination/creations/${scope.draftId}`,token:'synthetic',identityService,runtime:{creationRepository:{load:f.store.load}}})
  assert.deepEqual(reply,{status:200,body:{creation:result.creation,completionAuthority:false}})
  for(const table of ['creation_claims','creation_results'])assert.equal(Number((await f.db.query(`select count(*) as n from outcome_destination_private.${table}`)).rows[0].n),1)
 }finally{await f.db.close()}
})
test('uncertain claim never publishes; uncertain publication or recording never automatically retries',async()=>{
 for(const boundary of ['claim','publish','record']){
  const f=await fixture();try{
   await f.confirm();let publications=0
   const store={...f.store,[boundary]:async input=>{if(boundary!=='publish')await f.store[boundary](input);throw Error('simulated lost reply')}}
   const publisher={...f.publisher,publish:async input=>{publications++;await f.publisher.publish(input);if(boundary==='publish')throw Error('simulated lost reply')}}
   const first=await createDestinationCreationWorker({...f,store,publisher}).runOnce(scope)
   assert.ok(['CREATION_UNKNOWN','CLAIM_OR_CONFIRMATION_UNVERIFIED'].includes(first.state));assert.equal(publications,boundary==='claim'?0:1)
   const before=readdirSync(f.catalog).sort()
   const second=await createDestinationCreationWorker({...f,publisher:{...f.publisher,publish:()=>{throw Error('must not republish')}}}).runOnce(scope)
   assert.equal(second.state,boundary==='record'?'ALREADY_RECORDED':'CLAIM_NOT_ACQUIRED');assert.deepEqual(readdirSync(f.catalog).sort(),before)
  }finally{await f.db.close()}
 }
})
test('claim is unique, requires exact confirmation and rejects foreign or unconfirmed source',async()=>{
 const f=await fixture();try{
  await assert.rejects(()=>f.store.claim({...scope,claimId,reviewDigest:'a'.repeat(64),evidenceDigest:'b'.repeat(64)}))
  const input=await f.confirm()
  await assert.rejects(()=>f.store.claim({...input,reviewDigest:'c'.repeat(64)}));await assert.rejects(()=>f.store.claim({...input,accountRef:'foreign'}))
  const claims=await Promise.all([f.store.claim(input),f.store.claim({...input,claimId:'00000000-0000-4000-8000-000000000004'})])
  assert.equal(claims.filter(value=>value.acquired).length,1)
  assert.equal((await f.store.claim(input)).acquired,false)
  await assert.rejects(()=>f.store.record({...scope,claimId,projectId:'destination-'+ 'd'.repeat(64),publicationDigest:'e'.repeat(64)}))
 }finally{await f.db.close()}
})
test('effective private SQL grants/RLS deny public access, foreign scope and UPDATE/DELETE',async()=>{
 const f=await fixture();try{
  const input=await f.confirm();await f.store.claim(input)
  await assert.rejects(()=>f.transact(async({query})=>{
   await query("select set_config('outcome.destination_workspace',$1,true),set_config('outcome.destination_account',$2,true)",[scope.workspaceId,scope.accountRef])
   await query('insert into outcome_destination_private.creation_results(workspace_id,account_ref,draft_id,claim_id,project_id,publication_digest) values($1,$2,$3,$4,$5,$6)',[scope.workspaceId,scope.accountRef,scope.draftId,claimId,'destination-'+ 'd'.repeat(64),'e'.repeat(64)])
  }))
  for(const role of ['anon','authenticated'])for(const table of ['creation_claims','creation_results'])await assert.rejects(()=>f.db.transaction(async tx=>{await tx.exec(`set local role ${role}`);await tx.query(`select * from outcome_destination_private.${table}`)}))
  for(const role of ['anon','authenticated','outcome_destination_backend'])for(const table of ['creation_claims','creation_results'])for(const privilege of ['SELECT','INSERT','UPDATE','DELETE']){
   const allowed=(await f.db.query('select has_table_privilege($1,$2,$3) as allowed',[role,`outcome_destination_private.${table}`,privilege])).rows[0].allowed
   assert.equal(allowed,role==='outcome_destination_backend'&&['SELECT','INSERT'].includes(privilege))
  }
  await assert.rejects(()=>f.transact(async({query})=>{
   await query("select set_config('outcome.destination_workspace','workspace',true),set_config('outcome.destination_account','foreign',true)")
   await query('insert into outcome_destination_private.creation_claims(workspace_id,account_ref,draft_id,request_id,claim_id,review_digest,evidence_digest) values($1,$2,$3,$4,$5,$6,$7)',[scope.workspaceId,scope.accountRef,scope.draftId,scope.requestId,claimId,input.reviewDigest,input.evidenceDigest])
  }),error=>error.code==='42501')
  for(const table of ['creation_claims','creation_results'])for(const verb of ['update','delete'])await assert.rejects(()=>f.transact(async({query})=>{await query("select set_config('outcome.destination_workspace',$1,true),set_config('outcome.destination_account',$2,true)",[scope.workspaceId,scope.accountRef]);await query(verb==='delete'?`delete from outcome_destination_private.${table}`:`update outcome_destination_private.${table} set claim_id=claim_id`)}))
  const rows=await f.transact(async({query})=>{await query("select set_config('outcome.destination_workspace','workspace',true),set_config('outcome.destination_account','foreign',true)");return query('select * from outcome_destination_private.creation_claims')})
  assert.equal(rows.rows.length,0)
  const flags=(await f.db.query("select relrowsecurity,relforcerowsecurity from pg_class where relname in ('creation_claims','creation_results')")).rows
  assert.equal(flags.length,2);assert.ok(flags.every(row=>row.relrowsecurity&&row.relforcerowsecurity))
  const runtime=createDestinationRuntime({pool:{connect:()=>{throw Error('must not connect during construction')}},allowedOrigin:'https://preview.invalid',csrfSecret:'synthetic-csrf-value'})
  assert.deepEqual(Object.keys(runtime.creationRepository),['load'])
 }finally{await f.db.close()}
})
test('failed catalog evidence never records success and a claimed attempt is not replayed',async()=>{
 const f=await fixture();try{
  await f.confirm()
  const publisher={...f.publisher,publicationEvidence:async()=>null}
  assert.equal((await createDestinationCreationWorker({...f,publisher}).runOnce(scope)).state,'PUBLICATION_UNVERIFIED')
  assert.equal(await f.store.load(scope),null)
  assert.equal((await createDestinationCreationWorker(f).runOnce(scope)).state,'CLAIM_NOT_ACQUIRED')
  assert.equal(Number((await f.db.query('select count(*) as n from outcome_destination_private.creation_results')).rows[0].n),0)
 }finally{await f.db.close()}
})
