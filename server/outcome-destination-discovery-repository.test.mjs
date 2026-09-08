import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {PGlite} from '@electric-sql/pglite'
import {once} from 'node:events'
import {createOutcomeServer} from './index.mjs'
import {createDestinationDraftRepository} from './outcome-destination-postgres.mjs'
import {createDiscoveryRepository,parseDiscoveryContext,discoveryContextDigest} from './outcome-destination-discovery-repository.mjs'

test('server context digest matches the browser Unicode and ordering golden vector',()=>{
 const context={source:'운영 상태를 쉽게 확인하고 싶습니다.',mode:'guided_200q',seedAnswers:{outcome:'결과',problem:'문제'},unknowns:['검증 필요'],revision:1,answers:[{questionId:'q-2',gapId:'g-2',value:'나'},{questionId:'q-1',gapId:'g-1',value:'가'}],askedQuestionIds:['q-2','q-1']}
 assert.equal(discoveryContextDigest(parseDiscoveryContext(JSON.stringify(context))),'5785cb3038097cfdb6950deafbb7e842ab9c1a800510e2dfb92b92bbe8e97f72')
})

test('full discovery save/load survives repository reconstruction, replay and stale writers',async()=>{
 const db=await PGlite.create('memory://')
 let http
 try {
  await db.exec('create role anon nologin;create role authenticated nologin')
  for(const file of ['20260908011009_outcome_destination_private_drafts.sql','20260908042838_outcome_destination_discovery_drafts.sql','20260908044800_outcome_discovery_question_receipts.sql'])await db.exec(await readFile(new URL(`../supabase/migrations/${file}`,import.meta.url),'utf8'))
  const transact=work=>db.transaction(async tx=>{await tx.exec('set local role outcome_destination_backend');return work({query:(sql,args)=>tx.query(sql,args)})})
  const scope={workspaceId:'workspace',accountRef:'owner',draftId:'00000000-0000-4000-8000-000000000001'}
  const document={schemaVersion:1,mode:'guided_200q',source:'',answers:{problem:'synthetic problem'},unknowns:['검증 필요']}
  const drafts=createDestinationDraftRepository({transact})
  await drafts.save({...scope,requestId:'00000000-0000-4000-8000-000000000002',expectedRevision:0,document:JSON.stringify(document)})
  const answers=Array.from({length:200},(_,i)=>({questionId:`q-${i}`,gapId:`gap-${i}`,value:'가'.repeat(4000)}))
  const context={source:document.source,mode:document.mode,seedAnswers:document.answers,unknowns:document.unknowns,answers:[],askedQuestionIds:[],revision:1}
  assert.equal(parseDiscoveryContext(JSON.stringify({...context,answers,askedQuestionIds:answers.map(a=>a.questionId)})).answers.length,200)
  const input={...scope,requestId:'00000000-0000-4000-8000-000000000003',expectedRevision:0,intakeRevision:1,context:JSON.stringify(context)}
  const repo=createDiscoveryRepository({transact})
  const headers={cookie:'__session=owner',origin:'https://preview.invalid','content-type':'application/json','x-outcome-csrf':'synthetic-discovery-csrf'}
  http=createOutcomeServer({publicReadOnly:true,accountAccess:{authenticate:async token=>{if(!['owner','other'].includes(token))throw Error('unauthorized')},resolveBridgeAuthority:async({token})=>({workspace_id:'workspace',account_ref:token,project_ids:['outcome']})},destinationRuntime:{allowedOrigin:headers.origin,csrfSecret:headers['x-outcome-csrf'],discoveryRepository:repo}})
  http.listen(0,'127.0.0.1');await once(http,'listening')
  const url=`http://127.0.0.1:${http.address().port}/api/private/destination/discovery/${scope.draftId}`
  const body=JSON.stringify({requestId:input.requestId,expectedRevision:input.expectedRevision,intakeRevision:input.intakeRevision,context:input.context})
  assert.equal((await fetch(url)).status,401)
  const put=await fetch(url,{method:'PUT',headers,body})
  assert.equal(put.status,200);assert.equal(put.headers.get('cache-control'),'no-store')
  const saved=(await put.json()).discovery
  const forged={...JSON.parse(body),requestId:'00000000-0000-4000-8000-000000000099',expectedRevision:1,context:JSON.stringify({...context,revision:2,askedQuestionIds:['fabricated'],answers:[{questionId:'fabricated',gapId:'fake-gap',value:'invented decision'}]})}
  assert.equal((await fetch(url,{method:'PUT',headers,body:JSON.stringify(forged)})).status,400)
  assert.deepEqual((await (await fetch(url,{headers})).json()).discovery,saved)
  assert.equal((await (await fetch(url,{headers:{cookie:'__session=other'}})).json()).discovery,null)
  for(const changed of [{origin:'https://wrong.invalid'},{'x-outcome-csrf':'wrong'}])assert.equal((await fetch(url,{method:'PUT',headers:{...headers,...changed},body})).status,403)
  assert.equal((await fetch(url,{method:'PUT',headers,body:JSON.stringify({...JSON.parse(body),accountRef:'other'})})).status,400)
  assert.equal((await fetch(url,{method:'PUT',headers,body:'x'.repeat(4194305)})).status,413)
  assert.deepEqual(saved.context,context);assert.equal(saved.completionAuthority,false)
  assert.deepEqual(await createDiscoveryRepository({transact}).load(scope),saved)
  assert.deepEqual(await repo.save(input),saved)
  assert.equal(await repo.load({...scope,accountRef:'other'}),null)
  await assert.rejects(()=>repo.save({...input,context:JSON.stringify({...context,unknowns:['changed']})}),/discovery_request_conflict/)
  await assert.rejects(()=>repo.save({...input,requestId:'00000000-0000-4000-8000-000000000004'}),/discovery_revision_conflict/)
  const second={...input,requestId:'00000000-0000-4000-8000-000000000005',expectedRevision:1,context:JSON.stringify({...context,revision:2})}
  const simultaneous=await Promise.all([repo.save(second),repo.save(second)])
  assert.equal(simultaneous[0].revision,2);assert.deepEqual(simultaneous[0],simultaneous[1])
  await drafts.save({...scope,requestId:'00000000-0000-4000-8000-000000000006',expectedRevision:1,document:JSON.stringify({...document,source:'changed source'})})
  await assert.rejects(()=>repo.save({...input,requestId:'00000000-0000-4000-8000-000000000007',expectedRevision:2,context:JSON.stringify({...context,revision:3})}),/discovery_intake_stale/)
  assert.equal((await repo.load(scope)).revision,2)
  for(const invalid of [{...context,completionAuthority:true},{...context,answers:[{questionId:'not-issued',gapId:'new',value:'answer'}]},{...context,answers:[{...answers[0],value:'password=private-value'}]},{...context,answers:[answers[0],answers[0]]}])assert.throws(()=>parseDiscoveryContext(JSON.stringify(invalid)))
 }finally{if(http){http.closeAllConnections();await new Promise(resolve=>http.close(resolve))}await db.close()}
})
