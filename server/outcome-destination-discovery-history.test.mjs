import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {PGlite} from '@electric-sql/pglite'
import {createDestinationDraftRepository} from './outcome-destination-postgres.mjs'
import {createDiscoveryRepository} from './outcome-destination-discovery-repository.mjs'
import {createDiscoveryQuestionRepository} from './outcome-destination-question-repository.mjs'

test('server preserves issued history and accepts only receipt-grounded answer identities',async()=>{
 const db=await PGlite.create('memory://')
 try{
  await db.exec('create role anon nologin;create role authenticated nologin')
  for(const name of ['20260908011009_outcome_destination_private_drafts.sql','20260908042838_outcome_destination_discovery_drafts.sql','20260908044800_outcome_discovery_question_receipts.sql'])await db.exec(await readFile(new URL(`../supabase/migrations/${name}`,import.meta.url),'utf8'))
  const transact=fn=>db.transaction(async tx=>{await tx.exec('set local role outcome_destination_backend');return fn({query:(sql,args)=>tx.query(sql,args)})})
  const scope={workspaceId:'test',accountRef:'owner',draftId:'00000000-0000-4000-8000-000000000001'}
  let sequence=1
  const requestId=()=>`00000000-0000-4000-8000-${String(++sequence).padStart(12,'0')}`
  const document={schemaVersion:1,mode:'guided_200q',source:'',answers:{problem:'정확한 목적지'},unknowns:['검증 필요']}
  await createDestinationDraftRepository({transact}).save({...scope,requestId:requestId(),expectedRevision:0,document:JSON.stringify(document)})
  const context={source:'',mode:document.mode,seedAnswers:document.answers,unknowns:document.unknowns,answers:[],askedQuestionIds:[],revision:1}
  const repo=createDiscoveryRepository({transact})
  const save=(value,expectedRevision)=>repo.save({...scope,requestId:requestId(),expectedRevision,intakeRevision:1,context:JSON.stringify(value)})
  const answer={questionId:'q-1',gapId:'g-1',value:'소유자'}
  await assert.rejects(()=>save({...context,answers:[answer],askedQuestionIds:['q-1']},0),/discovery_invalid/)
  const initial=await save(context,0)
  await assert.rejects(()=>save({...context,revision:2,answers:[answer],askedQuestionIds:['q-1']},1),/discovery_invalid/)
  const question={id:'q-1',gapId:'g-1',domain:'system_boundary',prompt:'누가 확인하나요?',choices:['소유자','팀'],recommendation:'소유자',reason:'검증 주체',material:true}
  await createDiscoveryQuestionRepository({transact}).record({...scope,contextDigest:initial.contextDigest,bindingVersion:1,responseSourceDigest:'a'.repeat(64),receipt:JSON.stringify({schemaVersion:1,contextDigest:initial.contextDigest,coverage:[],questions:[question],completionAuthority:false})})
  await assert.rejects(()=>save({...context,revision:2},1),/discovery_invalid/)
  await assert.rejects(()=>save({...context,revision:2,askedQuestionIds:['q-1','fake']},1),/discovery_invalid/)
  await assert.rejects(()=>save({...context,revision:2,askedQuestionIds:['q-1'],answers:[{...answer,gapId:'invented'}]},1),/discovery_invalid/)
  const next={...context,revision:2,askedQuestionIds:['q-1'],answers:[answer]}
  await save(next,1)
  assert.deepEqual((await createDiscoveryRepository({transact}).load(scope)).context.answers,[answer])
  for(const changed of [{askedQuestionIds:[],answers:[]},{answers:[]},{answers:[{...answer,gapId:'another'}]}])await assert.rejects(()=>save({...next,...changed,revision:3},2),/discovery_invalid/)
  const edited=await save({...next,revision:3,answers:[{...answer,value:'내부 팀과 함께 확인'}]},2)
  assert.equal(edited.context.answers[0].value,'내부 팀과 함께 확인')
  assert.deepEqual(edited.context.askedQuestionIds,['q-1'])
  // Preserve the original full-size durable-storage coverage through genuine
  // offered batches, rather than allowing a fabricated initial 200-answer import.
  let full=edited
  const questions=createDiscoveryQuestionRepository({transact})
  for(let start=2;start<=200;start+=3){
   const batch=Array.from({length:Math.min(3,201-start)},(_,n)=>({...question,id:`q-${start+n}`,gapId:`g-${start+n}`}))
   await questions.record({...scope,contextDigest:full.contextDigest,bindingVersion:1,responseSourceDigest:'b'.repeat(64),receipt:JSON.stringify({schemaVersion:1,contextDigest:full.contextDigest,coverage:[],questions:batch,completionAuthority:false})})
   const next={...full.context,revision:full.revision+1,askedQuestionIds:[...full.context.askedQuestionIds,...batch.map(q=>q.id)],answers:[...full.context.answers,...batch.map(q=>({questionId:q.id,gapId:q.gapId,value:'가'.repeat(4000)}))]}
   full=await save(next,full.revision)
  }
  assert.equal(full.context.answers.length,200)
  assert.equal(full.context.askedQuestionIds.length,200)
  assert.deepEqual((await createDiscoveryRepository({transact}).load(scope)).context,full.context)
  await assert.rejects(()=>save({...full.context,revision:full.revision+1,askedQuestionIds:[],answers:[]},full.revision),/discovery_invalid/)
  await assert.rejects(()=>save({...full.context,revision:full.revision+1,askedQuestionIds:[...full.context.askedQuestionIds,'q-201'],answers:[...full.context.answers,{questionId:'q-201',gapId:'g-201',value:'추가'}]},full.revision),/discovery_invalid/)
 }finally{await db.close()}
})
