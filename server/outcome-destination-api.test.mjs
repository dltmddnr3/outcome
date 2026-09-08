import assert from 'node:assert/strict'
import test from 'node:test'
import {once} from 'node:events'
import {createOutcomeServer} from './index.mjs'
import {handleDestinationDraftRequest as handle} from './outcome-destination-api.mjs'
const path='/api/private/destination/drafts/00000000-0000-4000-8000-000000000001'
const identityService={authenticate:async()=>({subject:'owner'}),resolveBridgeAuthority:async()=>({workspace_id:'workspace',account_ref:'account',project_ids:['outcome']})}
const headers={'content-type':'application/json',origin:'https://preview.invalid','x-outcome-csrf':'synthetic-csrf'}
const body=JSON.stringify({requestId:'00000000-0000-4000-8000-000000000002',expectedRevision:0,document:'{}'})
test('local HTTP draft route preserves long JSON, authentication, origin and size boundaries',async()=>{
 let saved=null;let writes=0
 const runtime={allowedOrigin:headers.origin,csrfSecret:headers['x-outcome-csrf'],repository:{load:async()=>saved,save:async input=>{writes++;saved={document:input.document,state:'draft',completionAuthority:false};return saved}}}
 const server=createOutcomeServer({publicReadOnly:true,accountAccess:identityService,destinationRuntime:runtime})
 server.listen(0,'127.0.0.1');await once(server,'listening')
 const url=`http://127.0.0.1:${server.address().port}${path}`
 try{
  assert.equal((await fetch(url)).status,401)
  const longBody=JSON.stringify({...JSON.parse(body),document:JSON.stringify({source:'가'.repeat(10000)})})
  const response=await fetch(url,{method:'PUT',headers:{...headers,cookie:'__session=valid'},body:longBody})
  assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store')
  const result=await response.json()
  assert.equal(result.draft.document,JSON.parse(longBody).document)
  assert.deepEqual(await (await fetch(url,{headers:{cookie:'__session=valid'}})).json(),result)
  assert.equal((await fetch(url,{method:'PUT',headers:{...headers,cookie:'__session=valid',origin:'https://other.invalid'},body:longBody})).status,403)
  assert.equal((await fetch(url,{method:'PUT',headers:{...headers,cookie:'__session=valid'},body:'x'.repeat(262145)})).status,413)
  assert.equal(writes,1)
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve))}
})
test('draft request scope comes only from authenticated owner authority',async()=>{
 const calls=[];const draft={state:'draft',completionAuthority:false}
 const runtime={allowedOrigin:headers.origin,csrfSecret:headers['x-outcome-csrf'],repository:{load:async input=>{calls.push(input);return draft},save:async input=>{calls.push(input);return draft}}}
 assert.equal((await handle({pathname:path,token:'valid',identityService,runtime})).status,200)
 assert.equal((await handle({method:'PUT',pathname:path,token:'valid',identityService,runtime,headers,body})).status,200)
 assert.deepEqual(calls[0],{workspaceId:'workspace',accountRef:'account',draftId:path.split('/').at(-1)})
 assert.equal(calls[1].workspaceId,'workspace')
 for(const extra of ['workspaceId','accountRef','completionAuthority'])assert.equal((await handle({method:'PUT',pathname:path,token:'valid',identityService,runtime,headers,body:JSON.stringify({...JSON.parse(body),[extra]:'forged'})})).status,400)
 assert.equal(calls.length,2)
 for(const changed of [{origin:'https://evil.invalid'},{'x-outcome-csrf':'bad'}])assert.equal((await handle({method:'PUT',pathname:path,token:'valid',identityService,runtime,headers:{...headers,...changed},body})).status,403)
})
test('draft request fails closed before runtime on anonymous or unauthorized scope',async()=>{
 let reads=0;const runtime=new Proxy({},{get(){reads++;throw Error('private')}})
 assert.equal((await handle({pathname:path,runtime})).status,401)
 assert.equal((await handle({pathname:path,token:'valid',identityService:{...identityService,resolveBridgeAuthority:async()=>({project_ids:[]})},runtime})).status,403)
 assert.equal(reads,0)
 assert.equal((await handle({pathname:path+'/extra',token:'valid',identityService})).status,404)
 assert.equal((await handle({method:'POST',pathname:path,token:'valid',identityService})).status,405)
 assert.equal((await handle({pathname:path,token:'valid',identityService})).status,503)
})
test('draft conflicts stay distinct while unexpected errors disclose no private details',async()=>{
 for(const [message,status] of [['destination_revision_conflict',409],['destination_request_conflict',409],['destination_invalid',400],['private connection detail',503]]){
  const runtime={repository:{load:async()=>{throw Error(message)},save:async()=>{}}}
  const result=await handle({pathname:path,token:'valid',identityService,runtime})
  assert.equal(result.status,status);assert.equal(JSON.stringify(result).includes('private connection detail'),false)
 }
})
