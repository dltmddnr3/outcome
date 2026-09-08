import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {PGlite} from '@electric-sql/pglite'
import {once} from 'node:events'
import {createOutcomeServer} from './index.mjs'
import {createDiscoveryRepository} from './outcome-destination-discovery-repository.mjs'
import {createDestinationDraftRepository} from './outcome-destination-postgres.mjs'
import {createDiscoveryQuestionRepository} from './outcome-destination-question-repository.mjs'
import {createDiscoveryQuestionRequests} from './outcome-destination-question-requests.mjs'
import {createDiscoveryQuestionDispatch} from './outcome-destination-question-dispatch.mjs'
import {runDiscoveryQuestionOnce,collectDiscoveryQuestionOnce,reconcileDiscoveryQuestionOnce} from './outcome-destination-question-worker.mjs'
import {createDestinationQuestionCoordinator} from './outcome-destination-question-coordinator.mjs'
test('durable question claim and real receipt ingestion prevent duplicate transport and false completion',async()=>{
 const db=await PGlite.create('memory://')
 let http
 try{
  await db.exec('create role anon nologin;create role authenticated nologin')
  for(const file of ['20260908011009_outcome_destination_private_drafts.sql','20260908042838_outcome_destination_discovery_drafts.sql','20260908044800_outcome_discovery_question_receipts.sql','20260908050252_outcome_discovery_question_requests.sql'])await db.exec(await readFile(new URL(`../supabase/migrations/${file}`,import.meta.url),'utf8'))
  const transact=work=>db.transaction(async tx=>{await tx.exec('set local role outcome_destination_backend');return work({query:(sql,args)=>tx.query(sql,args)})})
  const scope={workspaceId:'workspace',accountRef:'owner',draftId:'00000000-0000-4000-8000-000000000001'}
  const document={schemaVersion:1,mode:'guided_200q',source:'',answers:{problem:'문제'},unknowns:['검증 필요']}
  await createDestinationDraftRepository({transact}).save({...scope,requestId:scope.draftId,expectedRevision:0,document:JSON.stringify(document)})
  const context={source:'',mode:'guided_200q',seedAnswers:document.answers,unknowns:document.unknowns,revision:1,answers:[],askedQuestionIds:[]}
  const discovery=await createDiscoveryRepository({transact}).save({...scope,requestId:scope.draftId,expectedRevision:0,intakeRevision:1,context:JSON.stringify(context)})
  const request={...scope,contextDigest:discovery.contextDigest},requests=createDiscoveryQuestionRequests({transact}),questions=createDiscoveryQuestionRepository({transact})
  const headers={cookie:'__session=owner',origin:'https://preview.invalid','content-type':'application/json','x-outcome-csrf':'synthetic-question-request'}
  http=createOutcomeServer({publicReadOnly:true,accountAccess:{authenticate:async token=>{if(!['owner','other'].includes(token))throw Error('invalid')},resolveBridgeAuthority:async({token})=>({workspace_id:'workspace',account_ref:token,project_ids:['outcome']})},destinationRuntime:{allowedOrigin:headers.origin,csrfSecret:headers['x-outcome-csrf'],questionRequests:requests,questionRepository:questions,discoveryRepository:createDiscoveryRepository({transact})}})
  http.listen(0,'127.0.0.1');await once(http,'listening')
  const url=`http://127.0.0.1:${http.address().port}/api/private/destination/question-requests/${scope.draftId}`
  const body=JSON.stringify({contextDigest:request.contextDigest})
  const enqueue=async()=>{const response=await fetch(url,{method:'POST',headers,body});assert.equal(response.status,202);assert.equal(response.headers.get('cache-control'),'no-store');return (await response.json()).questionRequest}
  const queued=await Promise.all([enqueue(),enqueue()])
  assert.deepEqual(queued[0],queued[1]);assert.equal(queued[0].state,'queued')
  assert.deepEqual((await (await fetch(url,{headers})).json()).questionRequest,queued[0])
  assert.equal((await fetch(url)).status,401)
  assert.equal((await (await fetch(url,{headers:{cookie:'__session=other'}})).json()).questionRequest,null)
  assert.equal((await fetch(url,{method:'POST',headers:{...headers,origin:'https://wrong.invalid'},body})).status,403)
  assert.equal((await fetch(url,{method:'POST',headers,body:JSON.stringify({contextDigest:request.contextDigest,accountRef:'other'})})).status,400)
  assert.equal((await fetch(url,{method:'POST',headers,body:'x'.repeat(4097)})).status,413)
  let sends=0,mode='pending',original,responseDigest=discovery.contextDigest
  const activeDestination={opaque:true}
  const queueAdapter={bindingResolver:async()=>({project_id:'outcome',role:'planner',binding_version:1,status:'active',freshness:'fresh',destination:activeDestination}),transport:async({destination})=>{original=destination;sends++;return {delivery:'acknowledged'}},readPlannerResponse:async({destination,correlation_id})=>{
   assert.equal(destination,original)
   if(mode==='pending')return {outcome:'pending'}
   return {outcome:'completed',response:{correlation_id,source_digest:'a'.repeat(64),message:JSON.stringify({schemaVersion:1,contextDigest:mode==='wrong'?'wrong':responseDigest,coverage:[],questions:[],completionAuthority:false})}}
  }}
  const publishInput=async input=>({state:'ready',reference:`analysis-${'a'.repeat(64)}`,requestId:input.requestId,contextDigest:input.contextDigest,contextRevision:input.contextRevision})
  const dispatch=createDiscoveryQuestionDispatch({queueAdapter,publishInput})
  const started=await Promise.all([runDiscoveryQuestionOnce({requests,dispatch,request}),runDiscoveryQuestionOnce({requests:createDiscoveryQuestionRequests({transact}),dispatch,request})])
  assert.equal(sends,1);assert.equal(started.filter(v=>v.state==='not_claimed').length,1)
  const collection=started.find(v=>v.collection).collection
  await assert.rejects(()=>requests.finish({...collection.request,state:'completed'}),/question_receipt_required/)
  const collect=()=>collectDiscoveryQuestionOnce({requests,questions,queueAdapter,...collection})
  assert.equal((await collectDiscoveryQuestionOnce({requests,questions,queueAdapter,...collection,request:{...collection.request,dispatchToken:'00000000-0000-4000-8000-000000000099'}})).state,'not_pending')
  assert.equal(await questions.load(scope),null)
  assert.equal((await collect()).state,'pending')
  mode='wrong';assert.equal((await collect()).state,'unavailable');assert.equal(await questions.load(scope),null)
  mode='valid';assert.equal((await collect()).state,'result_recorded')
  assert.equal((await requests.load(request)).state,'completed');assert.equal((await questions.load(scope)).completionAuthority,false)
  assert.equal((await (await fetch(url,{headers})).json()).questionRequest.state,'completed')
  assert.equal((await (await fetch(url.replace('/question-requests/','/questions/'),{headers})).json()).questions.contextDigest,request.contextDigest)
  assert.equal((await collect()).state,'not_pending')
  assert.equal((await runDiscoveryQuestionOnce({requests,dispatch,request})).state,'not_claimed');assert.equal(sends,1)
  assert.equal(await requests.load({...request,accountRef:'other'}),null)
  assert.equal(await requests.finish({...collection.request,state:'failed'}),null)
  await assert.rejects(()=>transact(async({query})=>{await query("select set_config('outcome.destination_workspace','workspace',true),set_config('outcome.destination_account','owner',true)");return query("update outcome_destination_private.discovery_question_requests set state='queued',dispatch_token=null")}),/question_transition_forbidden/)
  await assert.rejects(()=>transact(({query})=>query('delete from outcome_destination_private.discovery_question_requests')))
  const next=await createDiscoveryRepository({transact}).save({...scope,requestId:'00000000-0000-4000-8000-000000000003',expectedRevision:1,intakeRevision:1,context:JSON.stringify({...context,revision:2})})
  const nextRequest={...scope,contextDigest:next.contextDigest};await requests.enqueue(nextRequest)
  let uncertainSends=0
  const uncertainDispatch=async()=>{uncertainSends++;throw Error('synthetic transport uncertainty')}
  assert.equal((await runDiscoveryQuestionOnce({requests,dispatch:uncertainDispatch,request:nextRequest})).state,'delivery_unknown')
  assert.equal((await runDiscoveryQuestionOnce({requests:createDiscoveryQuestionRequests({transact}),dispatch:uncertainDispatch,request:nextRequest})).state,'not_claimed')
  assert.equal(uncertainSends,1);assert.equal((await requests.load(nextRequest)).state,'delivery_unknown')
  const coordinator=()=>createDestinationQuestionCoordinator({scope,discovery:createDiscoveryRepository({transact}),requests,questions,queueAdapter,publishInput,ready:async()=>true})
  assert.equal((await coordinator().runOnce()).state,'safe_hold');assert.equal(sends,1)
  const live=coordinator()
  for(const revision of [3,4]){
   const changed=await createDiscoveryRepository({transact}).save({...scope,requestId:`00000000-0000-4000-8000-00000000000${revision+1}`,expectedRevision:revision-1,intakeRevision:1,context:JSON.stringify({...context,revision})})
   responseDigest=changed.contextDigest;mode='pending'
   assert.equal((await live.runOnce()).state,'idle')
   const accepted=await fetch(url,{method:'POST',headers,body:JSON.stringify({contextDigest:responseDigest})});assert.equal(accepted.status,202)
   assert.equal((await live.runOnce()).state,'awaiting_result')
   assert.equal((await coordinator().runOnce()).state,'safe_hold') // Restart cannot reclaim a started request.
   assert.equal((await live.runOnce()).state,'awaiting_result');assert.equal(sends,revision-1)
   mode='valid'
   if(revision===4){
    const row=await requests.load({...scope,contextDigest:responseDigest})
    const source={requestId:row.requestId,draftId:scope.draftId,contextRevision:revision,contextDigest:responseDigest,serializedContext:JSON.stringify({...context,revision}),purpose:'destination_questions_only',executionAuthority:false}
    const inputStore={read:async()=>source},reference=`analysis-${'a'.repeat(64)}`
    const recovered=()=>reconcileDiscoveryQuestionOnce({requests:createDiscoveryQuestionRequests({transact}),questions,queueAdapter,inputStore,scope,reference})
    assert.equal((await reconcileDiscoveryQuestionOnce({requests,questions,queueAdapter,inputStore,scope:{...scope,accountRef:'other'},reference})).state,'unavailable')
    assert.equal(await questions.load(scope),null)
    mode='pending';assert.equal((await recovered()).state,'pending');assert.equal((await requests.load({...scope,contextDigest:responseDigest})).state,'dispatch_started')
    mode='valid';assert.equal((await recovered()).state,'result_recorded')
    assert.equal((await recovered()).state,'unavailable') // No terminal reset or replay.
    assert.equal((await coordinator().runOnce()).state,'idle')
   }else{
    assert.equal((await live.runOnce()).state,'result_recorded')
    assert.equal((await live.runOnce()).state,'idle')
   }
   assert.equal((await (await fetch(url,{headers})).json()).questionRequest.state,'completed')
   assert.equal((await (await fetch(url.replace('/question-requests/','/questions/'),{headers})).json()).questions.contextDigest,responseDigest)
  }
  assert.equal(sends,3)
 }finally{if(http){http.closeAllConnections();await new Promise(resolve=>http.close(resolve))}await db.close()}
})
