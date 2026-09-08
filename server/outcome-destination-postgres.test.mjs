import assert from 'node:assert/strict'
import test from 'node:test'
import {once} from 'node:events'
import {createOutcomeServer} from './index.mjs'
import {readFile} from 'node:fs/promises'
import {PGlite} from '@electric-sql/pglite'
import {createDestinationDraftRepository,parseDestinationDraft} from './outcome-destination-postgres.mjs'
import {handleDestinationDraftRequest} from './outcome-destination-api.mjs'

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
  // Exercise the public-safe handler against the actual restricted SQL repository.
  const identityService={authenticate:async()=>({subject:'synthetic-owner'}),resolveBridgeAuthority:async()=>({workspace_id:scope.workspaceId,account_ref:scope.accountRef,project_ids:['outcome']})}
  const headers={'content-type':'application/json',origin:'https://preview.invalid','x-outcome-csrf':'synthetic-only-csrf'}
  const request={pathname:`/api/private/destination/drafts/${scope.draftId}`,token:'synthetic',identityService,runtime:{repository:make(),allowedOrigin:headers.origin,csrfSecret:headers['x-outcome-csrf']},headers}
  const payload={requestId:'00000000-0000-4000-8000-000000000005',expectedRevision:2,document:document()}
  const saved=await handleDestinationDraftRequest({...request,method:'PUT',body:JSON.stringify(payload)})
  assert.equal(saved.status,200);assert.equal(saved.body.draft.revision,3);assert.equal(saved.body.completionAuthority,false)
  assert.deepEqual(await handleDestinationDraftRequest({...request,method:'PUT',body:JSON.stringify(payload)}),saved)
  assert.deepEqual(await handleDestinationDraftRequest({...request,runtime:{repository:make()}}),saved)
  const stale=await handleDestinationDraftRequest({...request,method:'PUT',body:JSON.stringify({...payload,requestId:'00000000-0000-4000-8000-000000000006'})})
  assert.equal(stale.status,409)
  const foreign=await handleDestinationDraftRequest({...request,identityService:{...identityService,resolveBridgeAuthority:async()=>({workspace_id:scope.workspaceId,account_ref:'another-owner',project_ids:['outcome']})}})
  assert.deepEqual(foreign.body,{draft:null,completionAuthority:false})
  assert.equal((await make().load(scope)).revision,3)
  const httpIdentity={...identityService,readWorkspace:async()=>({projects:[]}),resolveBridgeAuthority:async({token})=>({workspace_id:scope.workspaceId,account_ref:token==='other'? 'other-owner':scope.accountRef,project_ids:['outcome']})}
  const http=createOutcomeServer({publicReadOnly:true,accountAccess:httpIdentity,destinationRuntime:{...request.runtime,repository:make()}})
  http.listen(0,'127.0.0.1');await once(http,'listening')
  const base=`http://127.0.0.1:${http.address().port}`
  try{
   const workspace=await fetch(`${base}/api/private/workspace`,{headers:{cookie:'__session=owner'}})
   assert.equal(workspace.status,200)
   assert.equal(workspace.headers.get('x-outcome-destination-csrf'),headers['x-outcome-csrf'])
   const nextBody=JSON.stringify({...payload,expectedRevision:3,requestId:'00000000-0000-4000-8000-000000000007'})
   const send=()=>fetch(base+request.pathname,{method:'PUT',headers:{...headers,cookie:'__session=owner'},body:nextBody})
   const write=await send();assert.equal(write.status,200)
   const receipt=await write.json();assert.equal(receipt.draft.revision,4)
   assert.deepEqual(await (await send()).json(),receipt)
   assert.deepEqual(await (await fetch(base+request.pathname,{headers:{cookie:'__session=owner'}})).json(),receipt)
   assert.deepEqual(await (await fetch(base+request.pathname,{headers:{cookie:'__session=other'}})).json(),{draft:null,completionAuthority:false})
   assert.equal((await fetch(base+request.pathname)).status,401)
   assert.equal((await make().load(scope)).revision,4)
   assert.equal((await db.query('select count(*)::int n from outcome_destination_private.drafts')).rows[0].n,1)
  }finally{http.closeAllConnections();await new Promise(resolve=>http.close(resolve))}
 }finally{await db.close()}
})
