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
import {once} from 'node:events'
import {createOutcomeServer} from './index.mjs'
import {createDestinationSourceVerifier} from './outcome-destination-source-verifier.mjs'
import {createDestinationHostedRuntimeFactory} from './outcome-destination-hosted-runtime.mjs'

const scope={workspaceId:'workspace',accountRef:'owner',draftId:'00000000-0000-4000-8000-000000000001'}
const requestId='00000000-0000-4000-8000-000000000010'
test('trusted inspection reads pending snapshot without verification, writes or inferred readiness',async()=>{
 const f=await fixture({unknowns:['technical review pending'],coverage:[]});try{
  const repo=createDestinationConfirmationRepository({transact:f.transact})
  const inspected=await repo.inspect(scope)
  assert.deepEqual(inspected.blockers,['residual_unknowns','coverage_or_material_gap'])
  assert.equal(inspected.verificationState,'unverified');assert.equal(inspected.completionAuthority,false);assert.equal(inspected.executionAuthority,false)
  assert.equal(createHash('sha256').update(inspected.serializedSnapshot).digest('hex'),inspected.reviewDigest)
  const snapshot=JSON.parse(inspected.serializedSnapshot)
  assert.deepEqual(snapshot.document.unknowns,['technical review pending']);assert.deepEqual(snapshot.questionReceipt.coverage,[])
  assert.equal(await f.count(),0);assert.equal(f.verifications(),0)
  await assert.rejects(()=>repo.review(scope));await assert.rejects(()=>repo.confirm({...scope,requestId,confirmed:true,reviewDigest:inspected.reviewDigest}))
  await assert.rejects(()=>repo.inspect({...scope,accountRef:'other'}))
  assert.equal(await f.count(),0)
 }finally{await f.db.close()}
})
test('inspection digest is identical to verified review but cannot substitute for the verifier',async()=>{
 const f=await fixture();try{
  const repo=createDestinationConfirmationRepository(f),inspected=await repo.inspect(scope)
  assert.deepEqual(inspected.blockers,[]);assert.equal(inspected.verificationState,'unverified');assert.equal(f.verifications(),0)
  const review=await repo.review(scope)
  assert.equal(review.reviewDigest,inspected.reviewDigest);assert.equal(f.verifications(),1);assert.equal(await f.count(),0)
  await f.db.query('delete from outcome_destination_private.discovery_question_receipts')
  const missing=await repo.inspect(scope)
  assert.deepEqual(missing.blockers,['question_receipt_missing']);assert.equal(JSON.parse(missing.serializedSnapshot).questionReceipt,null)
  await assert.rejects(()=>repo.review(scope));assert.equal(f.verifications(),1)
  await f.drafts.save({...scope,requestId:'00000000-0000-4000-8000-000000000099',expectedRevision:1,document:JSON.stringify({...f.document,answers:{...f.document.answers,scope:'changed'}})})
  await assert.rejects(()=>repo.inspect(scope));assert.equal(await f.count(),0)
 }finally{await f.db.close()}
})
test('hosted factory composes explicit source readers with restricted confirmation SQL',async()=>{
 const f=await fixture();try{
  const original='Synthetic checked technical contract',contentDigest=createHash('sha256').update(original).digest('hex')
  let content=original,assessments=0,sourceReads=0
  const sourceReaders={
   readAssessment:async({workspaceId,accountRef,reviewDigest})=>{
    assessments++;assert.equal(workspaceId,scope.workspaceId);assert.equal(accountRef,scope.accountRef)
    return JSON.stringify({schemaVersion:1,workspaceId,accountRef,reviewDigest,verdict:'supported_for_owner_review',domains:discoveryDomains.map(domain=>({domain,state:'contract_ready',assessment:'supported',evidence:[{ref:'synthetic-contract',contentDigest,startLine:1,endLine:1,quote:original}]})),completionAuthority:false})
   },
   readSource:async({workspaceId,accountRef,ref})=>{sourceReads++;assert.equal(workspaceId,scope.workspaceId);assert.equal(accountRef,scope.accountRef);assert.equal(ref,'synthetic-contract');return content},
  }
  // Driver identity is synthetic; all domain queries use real restricted PGlite
  // SQL. This verifies factory composition, not hosted TLS or actual owner use.
  let connections=0
  class Pool{on(){}async connect(){connections++;return{query:async(sql,args)=>sql==='select session_user, current_user'?{rows:[{session_user:'outcome_destination_runtime',current_user:'outcome_destination_backend'}]}:f.db.query(sql,args),release(){}}}}
  const environment={VERCEL_ENV:'preview',VERCEL_URL:'outcome-synthetic-unique.vercel.app',OUTCOME_DESTINATION_DURABLE_ENABLED:'1',OUTCOME_DESTINATION_DATABASE_URL:'postgresql://outcome_destination_runtime.abcdefghijklmnopqrst:synthetic@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=verify-full',OUTCOME_DESTINATION_DATABASE_CA_PEM:'-----BEGIN CERTIFICATE-----\nQUJD\n-----END CERTIFICATE-----',OUTCOME_DESTINATION_CSRF_SECRET:'synthetic-csrf-destination-123456789',OUTCOME_SUPABASE_URL:'https://abcdefghijklmnopqrst.supabase.co'}
  const host={allowedOrigin:`https://${environment.VERCEL_URL}`,accountRuntime:{service:{resolveBridgeAuthority(){}}}}
  const originalAssessmentReader=sourceReaders.readAssessment
  const factory=createDestinationHostedRuntimeFactory({environment,sourceReaders,driverLoader:async()=>({Pool})})
  sourceReaders.readAssessment=async()=>{throw Error('changed capability must not be used')}
  const runtime=await factory(host);assert.ok(runtime)
  const review=await runtime.confirmationRepository.review(scope)
  assert.equal(assessments,1);assert.equal(sourceReads,1);assert.equal(await f.count(),0)
  content+=' drift'
  const input={...scope,requestId,reviewDigest:review.reviewDigest,confirmed:true}
  await assert.rejects(()=>runtime.confirmationRepository.confirm(input),/destination_unavailable/)
  assert.equal(await f.count(),0)
  content=original
  const saved=await runtime.confirmationRepository.confirm(input)
  assert.equal(saved.state,'creation_requested');assert.equal(saved.executionAuthority,false);assert.equal(await f.count(),1)
  const unavailable=await createDestinationHostedRuntimeFactory({environment,driverLoader:async()=>({Pool})})(host)
  await assert.rejects(()=>unavailable.confirmationRepository.review(scope),/destination_unavailable/)
  assert.deepEqual(await unavailable.confirmationRepository.load(scope),saved)
  assert.equal(await f.count(),1)
  // Trusted fixture publication is outside the read-only web runtime.
  await f.db.exec(await readFile(new URL('../supabase/migrations/20260908075808_outcome_destination_verification_evidence.sql',import.meta.url),'utf8'))
  const assessment=await originalAssessmentReader({...scope,reviewDigest:review.reviewDigest})
  await f.db.query('insert into outcome_destination_private.verification_evidence values($1,$2,$3,$4,$5)',[scope.workspaceId,scope.accountRef,review.reviewDigest,assessment,JSON.stringify({'synthetic-contract':original})])
  const priorConnections=connections
  assert.deepEqual(await unavailable.confirmationRepository.review(scope),review)
  assert.equal(connections,priorConnections+1)
  assert.deepEqual(await unavailable.confirmationRepository.confirm(input),saved)
  await f.db.query('update outcome_destination_private.verification_evidence set sources=$1',[JSON.stringify({'synthetic-contract':'changed source'})])
  await assert.rejects(()=>unavailable.confirmationRepository.review(scope),/destination_unavailable/)
  assert.equal(await f.count(),1)
 }finally{await f.db.close()}
})
test('content-verified assessment composes with confirmation SQL and source drift leaves no record',async()=>{
 const f=await fixture();try{
  const original='Synthetic checked technical contract';let content=original
  const contentDigest=createHash('sha256').update(original).digest('hex')
  const verifyReview=createDestinationSourceVerifier({
   readAssessment:async({workspaceId,accountRef,reviewDigest})=>JSON.stringify({schemaVersion:1,workspaceId,accountRef,reviewDigest,verdict:'supported_for_owner_review',domains:discoveryDomains.map(domain=>({domain,state:'contract_ready',assessment:'supported',evidence:[{ref:'synthetic-contract',contentDigest,startLine:1,endLine:1,quote:original}]})),completionAuthority:false}),
   readSource:async()=>content,
  })
  const repo=createDestinationConfirmationRepository({transact:f.transact,verifyReview})
  const review=await repo.review(scope);assert.equal(await f.count(),0)
  content+=' changed'
  const input={...scope,requestId,reviewDigest:review.reviewDigest,confirmed:true}
  await assert.rejects(()=>repo.confirm(input));assert.equal(await f.count(),0)
  content=original
  const saved=await repo.confirm(input);assert.equal(saved.state,'creation_requested');assert.equal(saved.executionAuthority,false)
  assert.deepEqual(await repo.confirm(input),saved);assert.equal(await f.count(),1)
 }finally{await f.db.close()}
})
test('owner HTTP confirmation composes real restricted SQL, CSRF, exact body and durable readback',async()=>{
 const f=await fixture()
 const runtime={allowedOrigin:'https://preview.invalid',csrfSecret:'synthetic-confirmation-csrf',confirmationRepository:createDestinationConfirmationRepository(f)}
 const identity={authenticate:async token=>{if(token!=='valid')throw Error('denied')},resolveBridgeAuthority:async()=>({workspace_id:scope.workspaceId,account_ref:scope.accountRef,project_ids:['outcome']})}
 const server=createOutcomeServer({publicReadOnly:true,accountAccess:identity,destinationRuntime:runtime})
 server.listen(0,'127.0.0.1');await once(server,'listening')
 const root=`http://127.0.0.1:${server.address().port}/api/private/destination`,url=`${root}/confirmations/${scope.draftId}`,reviewUrl=`${root}/confirmation-review/${scope.draftId}`
 const headers={cookie:'__session=valid',origin:runtime.allowedOrigin,'x-outcome-csrf':runtime.csrfSecret,'content-type':'application/json'}
 try{
  assert.equal((await fetch(reviewUrl)).status,401)
  assert.equal((await fetch(url,{headers:{cookie:'__session=wrong'}})).status,403)
  assert.equal((await fetch(reviewUrl,{method:'POST',headers})).status,405)
  const response=await fetch(reviewUrl,{headers});assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store')
  const {confirmationReview:review}=await response.json();assert.equal(await f.count(),0)
  const body={requestId,reviewDigest:review.reviewDigest,confirmed:true}
  for(const changed of [{confirmed:false},{confirmed:'true'},{reviewDigest:'invalid'},{evidenceDigest:'forged'},{accountRef:'other'}]){
   assert.equal((await fetch(url,{method:'POST',headers,body:JSON.stringify({...body,...changed})})).status,400)
  }
  for(const changed of [{origin:'https://other.invalid'},{'x-outcome-csrf':'wrong'}])assert.equal((await fetch(url,{method:'POST',headers:{...headers,...changed},body:JSON.stringify(body)})).status,403)
  assert.equal((await fetch(url,{method:'POST',headers,body:'x'.repeat(4097)})).status,413)
  assert.equal((await fetch(url,{method:'POST',headers,body:JSON.stringify({...body,reviewDigest:'f'.repeat(64)})})).status,503)
  assert.equal(await f.count(),0)
  const confirmed=await fetch(url,{method:'POST',headers,body:JSON.stringify(body)});assert.equal(confirmed.status,202)
  const saved=await confirmed.json();assert.equal(saved.confirmation.executionAuthority,false)
  assert.deepEqual(await (await fetch(url,{headers})).json(),saved)
  assert.deepEqual(await (await fetch(url,{method:'POST',headers,body:JSON.stringify(body)})).json(),saved)
  assert.equal(await f.count(),1)
  runtime.confirmationRepository=createDestinationConfirmationRepository({transact:f.transact})
  assert.equal((await fetch(reviewUrl,{headers})).status,503)
  assert.equal((await fetch(url,{method:'POST',headers,body:JSON.stringify(body)})).status,503)
  assert.equal(await f.count(),1)
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await f.db.close()}
})
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
   const repo=createDestinationConfirmationRepository(f),inspection=await repo.inspect(scope)
   assert.ok(inspection.blockers.length>0);assert.equal(inspection.verificationState,'unverified')
   assert.deepEqual(JSON.parse(inspection.serializedSnapshot).questionReceipt.questions,options.questions??[])
   await assert.rejects(()=>repo.review(scope))
   assert.equal(f.verifications(),0);assert.equal(await f.count(),0)
  }finally{await f.db.close()}
 }
})
