import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {PGlite} from '@electric-sql/pglite'
import {createDiscoveryRepository} from './outcome-destination-discovery-repository.mjs'
import {createDestinationDraftRepository} from './outcome-destination-postgres.mjs'
import {createDiscoveryQuestionRepository} from './outcome-destination-question-repository.mjs'
test('question receipts persist once for exact active context and remain owner-private',async()=>{
 const db=await PGlite.create('memory://')
 try{
  await db.exec('create role anon nologin;create role authenticated nologin')
  for(const file of ['20260908011009_outcome_destination_private_drafts.sql','20260908042838_outcome_destination_discovery_drafts.sql','20260908044800_outcome_discovery_question_receipts.sql'])await db.exec(await readFile(new URL(`../supabase/migrations/${file}`,import.meta.url),'utf8'))
  const transact=work=>db.transaction(async tx=>{await tx.exec('set local role outcome_destination_backend');return work({query:(sql,args)=>tx.query(sql,args)})})
  const scope={workspaceId:'workspace',accountRef:'owner',draftId:'00000000-0000-4000-8000-000000000001'}
  const document={schemaVersion:1,mode:'guided_200q',source:'',answers:{problem:'문제'},unknowns:['검증 필요']}
  await createDestinationDraftRepository({transact}).save({...scope,requestId:scope.draftId,expectedRevision:0,document:JSON.stringify(document)})
  const context={source:'',mode:'guided_200q',seedAnswers:document.answers,unknowns:document.unknowns,revision:1,answers:[],askedQuestionIds:[]}
  const discoveries=createDiscoveryRepository({transact})
  const saved=await discoveries.save({...scope,requestId:scope.draftId,expectedRevision:0,intakeRevision:1,context:JSON.stringify(context)})
  const receipt={schemaVersion:1,contextDigest:saved.contextDigest,coverage:[],questions:[{id:'q-1',gapId:'owner',domain:'system_boundary',prompt:'누가 사용하나요?',choices:['소유자','팀'],recommendation:'소유자',reason:'사용자 범위를 정합니다.',material:true}],completionAuthority:false}
  const input={...scope,contextDigest:saved.contextDigest,bindingVersion:1,responseSourceDigest:'a'.repeat(64),receipt:JSON.stringify(receipt)}
  const repo=createDiscoveryQuestionRepository({transact})
  const recorded=await repo.record(input)
  assert.equal(recorded.completionAuthority,false);assert.equal(recorded.sourceVerification,'required')
  assert.deepEqual(await repo.record(input),recorded)
  assert.deepEqual(await createDiscoveryQuestionRepository({transact}).load(scope),recorded)
  assert.equal(await repo.load({...scope,accountRef:'other'}),null)
  await assert.rejects(()=>repo.record({...input,responseSourceDigest:'b'.repeat(64)}))
  assert.deepEqual(await repo.load(scope),recorded)
  for(const action of ['update outcome_destination_private.discovery_question_receipts set binding_version=2','delete from outcome_destination_private.discovery_question_receipts'])await assert.rejects(()=>transact(({query})=>query(action)))
  await discoveries.save({...scope,requestId:'00000000-0000-4000-8000-000000000002',expectedRevision:1,intakeRevision:1,context:JSON.stringify({...context,revision:2,askedQuestionIds:['q-1'],answers:[{questionId:'q-1',gapId:'owner',value:'소유자'}]})})
  assert.equal(await repo.load(scope),null)
  await assert.rejects(()=>repo.record(input),/discovery_questions_unavailable/)
  await createDestinationDraftRepository({transact}).save({...scope,requestId:'00000000-0000-4000-8000-000000000003',expectedRevision:1,document:JSON.stringify({...document,source:'changed intake'})})
  await assert.rejects(()=>repo.load(scope),/discovery_questions_unavailable/)
 }finally{await db.close()}
})
