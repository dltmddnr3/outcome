import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {PGlite} from '@electric-sql/pglite'
import {createDestinationDraftRepository} from './outcome-destination-postgres.mjs'
import {createDiscoveryRepository} from './outcome-destination-discovery-repository.mjs'
import {createDiscoveryQuestionRepository} from './outcome-destination-question-repository.mjs'
import {createDestinationConfirmationRepository} from './outcome-destination-confirmation-repository.mjs'
import {discoveryDomains} from '../src/lib/destination-question-policy.mjs'

const scope={workspaceId:'workspace',accountRef:'owner',draftId:'00000000-0000-4000-8000-000000000001'}
const requestId='00000000-0000-4000-8000-000000000010'
async function fixture({unknowns=[],questions=[],coverage=discoveryDomains.map(domain=>({domain,state:'contract_ready',evidenceRefs:['synthetic-contract']}))}={}){
 const db=await PGlite.create('memory://')
 await db.exec('create role anon nologin;create role authenticated nologin')
 for(const file of ['20260908011009_outcome_destination_private_drafts.sql','20260908042838_outcome_destination_discovery_drafts.sql','20260908044800_outcome_discovery_question_receipts.sql','20260908072037_outcome_destination_confirmations.sql'])await db.exec(await readFile(new URL(`../supabase/migrations/${file}`,import.meta.url),'utf8'))
 const transact=work=>db.transaction(async tx=>{await tx.exec('set local role outcome_destination_backend');return work({query:(sql,args)=>tx.query(sql,args)})})
 const document={schemaVersion:1,mode:'guided_200q',source:'',answers:Object.fromEntries(['problem','targetUser','outcome','scope','nonGoals','constraints','acceptance','failureRecovery'].map(k=>[k,`synthetic ${k}`])),unknowns}
 const drafts=createDestinationDraftRepository({transact})
 await drafts.save({...scope,requestId,expectedRevision:0,document:JSON.stringify(document)})
 const context={source:'',mode:'guided_200q',seedAnswers:document.answers,unknowns,revision:1,answers:[],askedQuestionIds:[]}
 const discovery=await createDiscoveryRepository({transact}).save({...scope,requestId,expectedRevision:0,intakeRevision:1,context:JSON.stringify(context)})
 await createDiscoveryQuestionRepository({transact}).record({...scope,contextDigest:discovery.contextDigest,bindingVersion:1,responseSourceDigest:'a'.repeat(64),receipt:JSON.stringify({schemaVersion:1,contextDigest:discovery.contextDigest,coverage,questions,completionAuthority:false})})
 // A synthetic trusted verifier for SQL integration tests only, never runtime.
 let verifications=0
 const verifyReview=async({workspaceId,accountRef,reviewDigest,serializedSnapshot})=>{
  verifications++;assert.equal(workspaceId,scope.workspaceId);assert.equal(accountRef,scope.accountRef)
  assert.equal(createHash('sha256').update(serializedSnapshot).digest('hex'),reviewDigest)
  return JSON.stringify({reviewDigest,evidenceDigest:'b'.repeat(64),verified:true,completionAuthority:false})
 }
 return {db,transact,document,drafts,verifyReview,count:async()=>Number((await db.query('select count(*) as n from outcome_destination_private.confirmations')).rows[0].n),verifications:()=>verifications}
}
test('explicit current confirmation persists once, survives reconstruction and never creates execution authority',async()=>{
 const f=await fixture();try{
  const repo=createDestinationConfirmationRepository(f)
  assert.equal(await repo.load(scope),null)
  const review=await repo.review(scope);assert.equal(await f.count(),0)
  for(const confirmed of [undefined,false,'true'])await assert.rejects(()=>repo.confirm({...scope,requestId,reviewDigest:review.reviewDigest,confirmed}))
  await assert.rejects(()=>repo.confirm({...scope,requestId,reviewDigest:'f'.repeat(64),confirmed:true}))
  assert.equal(await f.count(),0)
  const input={...scope,requestId,reviewDigest:review.reviewDigest,confirmed:true}
  const saved=await repo.confirm(input)
  assert.equal(saved.state,'creation_requested');assert.equal(saved.executionAuthority,false);assert.equal(saved.completionAuthority,false)
  assert.deepEqual(await createDestinationConfirmationRepository(f).load(scope),saved)
  assert.deepEqual(await repo.confirm(input),saved)
  assert.deepEqual(await repo.confirm({...input,requestId:'00000000-0000-4000-8000-000000000011'}),saved)
  assert.deepEqual(await Promise.all([repo.confirm(input),repo.confirm(input)]),[saved,saved])
  assert.equal(await f.count(),1);assert.ok(f.verifications()>1)
  assert.equal(await repo.load({...scope,accountRef:'other'}),null)
  await assert.rejects(()=>repo.review({...scope,accountRef:'other'}))
  for(const sql of ['update outcome_destination_private.confirmations set state=state','delete from outcome_destination_private.confirmations'])await assert.rejects(()=>f.transact(({query})=>query(sql)))
  for(const role of ['anon','authenticated'])await assert.rejects(()=>f.db.transaction(async tx=>{await tx.exec(`set local role ${role}`);await tx.query('select * from outcome_destination_private.confirmations')}))
  const immutableRow=(await f.db.query('select * from outcome_destination_private.confirmations')).rows[0]
  await assert.rejects(()=>f.transact(async({query})=>{
   await query("select set_config('outcome.destination_workspace','workspace',true),set_config('outcome.destination_account','other',true)")
   await query("insert into outcome_destination_private.confirmations select workspace_id,account_ref,draft_id,request_id,review_digest,evidence_digest,intake_revision,context_revision,snapshot,state,completion_authority,execution_authority from jsonb_populate_record(null::outcome_destination_private.confirmations,$1::jsonb)",[JSON.stringify(immutableRow)])
  }),/row-level security/)
  const flags=(await f.db.query("select relrowsecurity,relforcerowsecurity from pg_class where oid='outcome_destination_private.confirmations'::regclass")).rows[0]
  assert.equal(flags.relrowsecurity,true);assert.equal(flags.relforcerowsecurity,true)
  await f.drafts.save({...scope,requestId:'00000000-0000-4000-8000-000000000012',expectedRevision:1,document:JSON.stringify({...f.document,answers:{...f.document.answers,scope:'changed'}})})
  await assert.rejects(()=>repo.confirm(input));assert.equal(await f.count(),1)
  assert.deepEqual(await repo.load(scope),saved)
 }finally{await f.db.close()}
})
test('absent, failed or mismatched trusted evidence never accepts a ready label',async()=>{
 const f=await fixture();try{
  for(const verifyReview of [undefined,async()=>null,async()=>'{bad',async()=>JSON.stringify({reviewDigest:'f'.repeat(64),evidenceDigest:'b'.repeat(64),verified:true,completionAuthority:false}),async({reviewDigest})=>JSON.stringify({reviewDigest,evidenceDigest:'b'.repeat(64),verified:false,completionAuthority:false}),async()=>{throw Error('source unavailable')}]){
   await assert.rejects(()=>createDestinationConfirmationRepository({transact:f.transact,verifyReview}).review(scope))
   assert.equal(await f.count(),0)
  }
 }finally{await f.db.close()}
})
test('unknowns, missing technical coverage and unanswered material contradictions hold before source verification',async()=>{
 const question={id:'q-1',gapId:'owner',domain:'system_boundary',prompt:'누가 사용하나요?',choices:['소유자','팀'],recommendation:'소유자',reason:'사용자 결정',material:true}
 for(const options of [{unknowns:['미결정']},{coverage:[]},{questions:[question]}]){
  const f=await fixture(options);try{
   await assert.rejects(()=>createDestinationConfirmationRepository(f).review(scope))
   assert.equal(f.verifications(),0);assert.equal(await f.count(),0)
  }finally{await f.db.close()}
 }
})
