import assert from 'node:assert/strict'
import test from 'node:test'
import {handleDestinationDraftRequest as handle} from './outcome-destination-api.mjs'
const path='/api/private/destination/drafts/00000000-0000-4000-8000-000000000001'
const identityService={authenticate:async()=>({subject:'owner'}),resolveBridgeAuthority:async()=>({workspace_id:'workspace',account_ref:'account',project_ids:['outcome']})}
const headers={'content-type':'application/json',origin:'https://preview.invalid','x-outcome-csrf':'synthetic-csrf'}
const body=JSON.stringify({requestId:'00000000-0000-4000-8000-000000000002',expectedRevision:0,document:'{}'})
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
