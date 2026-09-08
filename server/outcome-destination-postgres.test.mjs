import assert from 'node:assert/strict'
import test from 'node:test'
import {readFile} from 'node:fs/promises'
import {PGlite} from '@electric-sql/pglite'
import {createDestinationDraftRepository,parseDestinationDraft} from './outcome-destination-postgres.mjs'

const document=()=>JSON.stringify({schemaVersion:1,mode:'brief_gap',source:'목적: 실행 결과 확인',answers:{problem:'작업 결과를 확인하기 어렵다'},unknowns:['수용 기준 확인 필요']})
test('destination draft parser preserves unknowns and rejects secret-like or oversized content',()=>{
 assert.equal(parseDestinationDraft(document()).unknowns.length,1)
 for(const source of ['password=private-value','/Users/person/private','x'.repeat(65537)])assert.throws(()=>parseDestinationDraft(JSON.stringify({schemaVersion:1,mode:'brief_gap',source,answers:{},unknowns:[]})),/destination_invalid/)
 assert.throws(()=>parseDestinationDraft(JSON.stringify({...JSON.parse(document()),confirmed:true})),/destination_invalid/)
})

test('private draft SQL preserves revisions, rejects stale saves and isolates account scope',async()=>{
 const db=await PGlite.create('memory://')
 try{
  await db.exec('create role anon nologin;create role authenticated nologin;')
  await db.exec(await readFile(new URL('../supabase/migrations/20260908011009_outcome_destination_private_drafts.sql',import.meta.url),'utf8'))
  const transact=work=>db.transaction(async tx=>{await tx.exec('set local role outcome_destination_backend');return work({query:(sql,args)=>tx.query(sql,args)})})
  const make=()=>createDestinationDraftRepository({transact})
  const scope={workspaceId:'workspace-a',accountRef:'account-a',draftId:'00000000-0000-4000-8000-000000000001'}
  const input={...scope,requestId:'00000000-0000-4000-8000-000000000002',expectedRevision:0,document:document()}
  assert.equal(await make().load(scope),null)
  const first=await make().save(input)
  assert.equal(first.revision,1);assert.equal(first.state,'draft');assert.equal(first.completionAuthority,false)
  assert.deepEqual(await make().load(scope),first)
  assert.deepEqual(await make().save(input),first)
  await assert.rejects(()=>make().save({...input,document:document().replace('어렵다','힘들다')}),/destination_request_conflict/)
  const next={...input,requestId:'00000000-0000-4000-8000-000000000003',expectedRevision:1,document:document().replace('어렵다','힘들다')}
  const concurrent=await Promise.all([make().save(next),make().save(next)])
  assert.deepEqual(concurrent[0],concurrent[1]);assert.equal(concurrent[0].revision,2)
  await assert.rejects(()=>make().save(input),/destination_revision_conflict/)
  assert.equal(await make().load({...scope,accountRef:'account-b'}),null)
  assert.equal(await make().load({...scope,workspaceId:'workspace-b'}),null)
  const visible=await transact(async({query})=>{
   await query("select set_config('outcome.destination_workspace','workspace-a',true),set_config('outcome.destination_account','account-b',true)")
   return (await query('select * from outcome_destination_private.drafts')).rows
  })
  assert.deepEqual(visible,[])
  for(const role of ['anon','authenticated'])await assert.rejects(()=>db.transaction(async tx=>{await tx.exec(`set local role ${role}`);await tx.query('select * from outcome_destination_private.drafts')}),/permission denied/)
  assert.equal((await db.query('select count(*)::int n from outcome_destination_private.drafts')).rows[0].n,1)
  const failing=createDestinationDraftRepository({transact:work=>transact(async port=>{await work(port);throw Error('synthetic_rollback')})})
  await assert.rejects(()=>failing.save({...next,requestId:'00000000-0000-4000-8000-000000000004',expectedRevision:2}),/synthetic_rollback/)
  assert.equal((await make().load(scope)).revision,2)
 }finally{await db.close()}
})
