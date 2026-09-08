import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {PGlite} from '@electric-sql/pglite'
import {createDestinationAnalysisRepository} from './outcome-destination-analysis-repository.mjs'
import {createDestinationDraftRepository} from './outcome-destination-postgres.mjs'
import {destinationDocumentDigest} from './outcome-destination-analysis-source.mjs'
import {runDestinationAnalysisOnce} from './outcome-destination-analysis-worker.mjs'
import {createOutcomeServer} from './index.mjs'
import {once} from 'node:events'
import {validateDestinationAnalysisResult} from './outcome-destination-analysis-result.mjs'
import {createDestinationPlannerDispatch} from './outcome-destination-planner-dispatch.mjs'
import {collectDestinationAnalysisOnce} from './outcome-destination-analysis-collector.mjs'
test('analysis SQL pins source, enforces one claim and terminal hold, and isolates owners',async()=>{
 const db=await PGlite.create('memory://')
 try{
  await db.exec('create role anon nologin;create role authenticated nologin')
  for(const name of ['20260908011009_outcome_destination_private_drafts.sql','20260908035039_outcome_destination_analysis_requests.sql'])await db.exec(await readFile(new URL(`../supabase/migrations/${name}`,import.meta.url),'utf8'))
  const run=(sql,args=[],account='owner')=>db.transaction(async tx=>{
   await tx.exec('set local role outcome_destination_backend')
   await tx.query("select set_config('outcome.destination_workspace','workspace',true),set_config('outcome.destination_account',$1,true)",[account])
   return tx.query(sql,args)
  })
  const table='outcome_destination_private.analysis_requests'
  await run(`insert into ${table}(workspace_id,account_ref,request_id,draft_id,draft_revision,document_digest,document) values('workspace','owner',$1,$1,1,$2,$3)`,['00000000-0000-4000-8000-000000000001','a'.repeat(64),JSON.stringify({source:'private synthetic source'})])
  assert.equal((await run(`select * from ${table}`,[],'other')).rows.length,0)
  await assert.rejects(()=>run(`update ${table} set document='{}'`),/analysis_source_immutable/)
  const claim=`update ${table} set state='dispatch_started',dispatch_token='00000000-0000-4000-8000-000000000002' where state='queued' returning request_id`
  const claims=await Promise.all([run(claim),run(claim)])
  assert.equal(claims.reduce((n,r)=>n+r.rows.length,0),1)
  await assert.rejects(()=>run(`update ${table} set state='queued',dispatch_token=null`),/analysis_transition_forbidden/)
  await assert.rejects(()=>run(`update ${table} set state='failed',dispatch_token='00000000-0000-4000-8000-000000000003'`),/analysis_transition_forbidden/)
  await run(`update ${table} set state='delivery_unknown'`)
  await assert.rejects(()=>run(`update ${table} set state='dispatch_started'`),/analysis_transition_forbidden/)
  await assert.rejects(()=>run(`delete from ${table}`),/permission denied/)
  for(const role of ['anon','authenticated'])await assert.rejects(()=>db.transaction(async tx=>{await tx.exec(`set local role ${role}`);return tx.query(`select * from ${table}`)}),/permission denied/)
  assert.equal((await run(`select state from ${table}`)).rows[0].state,'delivery_unknown')
  const transact=work=>db.transaction(async tx=>{await tx.exec('set local role outcome_destination_backend');return work({query:(sql,args)=>tx.query(sql,args)})})
  const draftScope={workspaceId:'workspace',accountRef:'owner',draftId:'00000000-0000-4000-8000-000000000010'}
  const document={schemaVersion:1,mode:'guided_200q',source:'',answers:{problem:'synthetic problem'},unknowns:['verification needed']}
  await createDestinationDraftRepository({transact}).save({...draftScope,requestId:'00000000-0000-4000-8000-000000000011',expectedRevision:0,document:JSON.stringify(document)})
  const request={...draftScope,requestId:'00000000-0000-4000-8000-000000000012',draftRevision:1,documentDigest:destinationDocumentDigest(document)}
  const repo=createDestinationAnalysisRepository({transact})
  const queued=await repo.enqueue(request)
  assert.equal(queued.state,'queued')
  assert.deepEqual(await createDestinationAnalysisRepository({transact}).enqueue(request),queued)
  await assert.rejects(()=>repo.enqueue({...request,draftRevision:2}),/destination_analysis_unavailable/)
  const claimInput={...request,dispatchToken:'00000000-0000-4000-8000-000000000013'}
  const claimed=await Promise.all([repo.claim(claimInput),repo.claim(claimInput)])
  assert.equal(claimed.filter(Boolean).length,1)
  assert.deepEqual(JSON.parse(claimed.find(Boolean).serializedDocument),document)
  await assert.rejects(()=>repo.finish({...claimInput,state:'completed',result:{completionAuthority:false}}),/destination_analysis_unavailable/)
  assert.equal((await repo.load(request)).state,'dispatch_started')
  assert.equal(await repo.load({...request,accountRef:'other'}),null)
  assert.equal(await repo.finish({...claimInput,dispatchToken:'00000000-0000-4000-8000-000000000014',state:'failed'}),null)
  const validated=createDestinationAnalysisRepository({transact,validateResult:async input=>{assert.equal(input.documentDigest,request.documentDigest);return {completionAuthority:false,proposals:[]}}})
  const completed=await validated.finish({...claimInput,state:'completed',result:'synthetic'})
  assert.equal(completed.state,'completed');assert.deepEqual(completed.result,{completionAuthority:false,proposals:[]})
  assert.equal(await repo.claim(claimInput),null)
  assert.equal(await repo.finish({...claimInput,state:'failed'}),null)
  const nextRequest={...request,requestId:'00000000-0000-4000-8000-000000000020'}
  await repo.enqueue(nextRequest)
  let dispatches=0
  const worker={repository:repo,request:nextRequest,dispatch:async input=>{dispatches++;assert.deepEqual(JSON.parse(input.serializedDocument),document);return {delivery:'acknowledged'}}}
  assert.equal((await runDestinationAnalysisOnce(worker)).state,'awaiting_result')
  assert.equal((await runDestinationAnalysisOnce({...worker,repository:createDestinationAnalysisRepository({transact})})).state,'not_claimed')
  assert.equal(dispatches,1);assert.equal((await repo.load(nextRequest)).state,'dispatch_started')
  const http=createOutcomeServer({publicReadOnly:true,accountAccess:{authenticate:async token=>{if(token!=='owner'&&token!=='other')throw Error('invalid')},resolveBridgeAuthority:async({token})=>({workspace_id:'workspace',account_ref:token,project_ids:['outcome']})},destinationRuntime:{allowedOrigin:'https://preview.invalid',csrfSecret:'synthetic-analysis-csrf',analysisRepository:repo}})
  http.listen(0,'127.0.0.1');await once(http,'listening')
  try{
   const submitted={...request,requestId:'00000000-0000-4000-8000-000000000030'}
   const url=`http://127.0.0.1:${http.address().port}/api/private/destination/analysis/${submitted.requestId}`
   const headers={cookie:'__session=owner','content-type':'application/json',origin:'https://preview.invalid','x-outcome-csrf':'synthetic-analysis-csrf'}
   const payload=JSON.stringify({draftId:request.draftId,draftRevision:1,documentDigest:request.documentDigest})
   const enqueue=()=>fetch(url,{method:'POST',headers,body:payload})
   const first=await enqueue();assert.equal(first.status,202)
   const receipt=await first.json();assert.equal(receipt.analysis.state,'queued')
   assert.equal(JSON.stringify(receipt).includes('synthetic problem'),false)
   assert.deepEqual(await (await enqueue()).json(),receipt)
   assert.equal((await fetch(url)).status,401)
   assert.deepEqual(await (await fetch(url,{headers:{cookie:'__session=other'}})).json(),{analysis:null,completionAuthority:false})
   let actualDispatches=0
   const execute={repository:createDestinationAnalysisRepository({transact,validateResult:validateDestinationAnalysisResult}),request:submitted,dispatch:async()=>{actualDispatches++;return {delivery:'acknowledged',result:JSON.stringify({schemaVersion:1,documentDigest:request.documentDigest,draftRevision:1,proposals:[],completionAuthority:false})}}}
   assert.equal((await runDestinationAnalysisOnce(execute)).state,'result_recorded')
   assert.equal((await runDestinationAnalysisOnce(execute)).state,'not_claimed')
   const readback=await (await fetch(url,{headers})).json()
   assert.equal(readback.analysis.state,'completed');assert.equal(readback.completionAuthority,false)
   assert.deepEqual(readback.analysis.result.proposals,[]);assert.deepEqual(readback.analysis.result.confirmedAnswers,{})
   assert.equal(readback.analysis.result.semanticVerification,'owner_review_required');assert.equal(readback.analysis.result.gaps.length,8);assert.equal(actualDispatches,1)
   assert.equal((await fetch(url,{method:'POST',headers,body:'x'.repeat(4097)})).status,413)
   const asyncRequest={...submitted,requestId:'00000000-0000-4000-8000-000000000040'}
   const asyncUrl=url.replace(submitted.requestId,asyncRequest.requestId)
   const asyncRepo=createDestinationAnalysisRepository({transact,validateResult:validateDestinationAnalysisResult})
   await asyncRepo.enqueue(asyncRequest)
   let sends=0,responseMode='pending',originalDestination
   const queueAdapter={
    bindingResolver:async()=>({project_id:'outcome',role:'planner',binding_version:1,status:'active',freshness:'fresh',destination:Object.freeze({opaque:true})}),
    transport:async({destination})=>{originalDestination=destination;sends++;return {delivery:'acknowledged'}},
    readPlannerResponse:async({destination,correlation_id})=>{
     assert.equal(destination,originalDestination)
     if(responseMode==='pending')return {outcome:'pending'}
     return {outcome:'completed',response:{correlation_id,message:JSON.stringify({schemaVersion:1,documentDigest:request.documentDigest,draftRevision:1,proposals:responseMode==='forged'?[{field:'problem',value:'invented',startLine:1,endLine:1,quote:'not in source'}]:[],completionAuthority:false})}}
    },
   }
   const dispatch=createDestinationPlannerDispatch({queueAdapter,publishInput:async input=>({...input,state:'ready',reference:`analysis-${'c'.repeat(64)}`})})
   const asyncWorker={repository:asyncRepo,request:asyncRequest,dispatch}
   const started=await runDestinationAnalysisOnce(asyncWorker)
   assert.equal(started.state,'awaiting_result');assert.ok(started.collection)
   const collect=()=>collectDestinationAnalysisOnce({repository:asyncRepo,queueAdapter,...started.collection})
   assert.equal((await collect()).state,'pending')
   responseMode='forged';assert.equal((await collect()).state,'unavailable')
   assert.equal((await asyncRepo.load(asyncRequest)).state,'dispatch_started')
   responseMode='valid';assert.equal((await collect()).state,'result_recorded')
   const asyncReadback=await (await fetch(asyncUrl,{headers})).json()
   assert.equal(asyncReadback.analysis.state,'completed')
   assert.equal(asyncReadback.analysis.result.completionAuthority,false)
   assert.equal(asyncReadback.analysis.result.gaps.length,8)
   assert.deepEqual(asyncReadback.analysis.result.confirmedAnswers,{})
   assert.equal((await collect()).state,'not_pending')
   assert.equal((await runDestinationAnalysisOnce(asyncWorker)).state,'not_claimed')
   assert.equal(sends,1)
  }finally{http.closeAllConnections();await new Promise(resolve=>http.close(resolve))}
 }finally{await db.close()}
})
