import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {createLocalSessionReceiver} from './outcome-local-session-receiver.mjs'

const previewOrigin='https://outcome-fixture-white-castle.vercel.app'
const send=(receiver,body,origin=previewOrigin)=>fetch(receiver.invitation.endpoint,{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)})
test('approval pairing requires authenticated plan review and exact digest confirmation; login alone does not approve',async()=>{
 const grantJson=JSON.stringify({schemaVersion:2,projectId:'outcome',workId:'work-a',runId:'run-a',sessionRef:'session-a',bindingVersion:1,ownerRef:'d'.repeat(64),candidateCommit:'a'.repeat(40),candidateTree:'b'.repeat(40),allowedStages:['qa_verifying'],issuedAt:Date.now()-1000,expiresAt:Date.now()+60000,execution:{checkoutRef:'e'.repeat(64),readPaths:['src/main.ts'],writePaths:[],commands:[{id:'check',stage:'qa_verifying',program:'node',args:['--version'],timeoutMs:1000}]}})
 const digest=createHash('sha256').update(grantJson).digest('hex')
 const receiver=await createLocalSessionReceiver({previewOrigin,verifySession:async token=>token==='fixture-session',approval:{grantJson,digest}})
 const body={challenge:receiver.invitation.challenge,token:'fixture-session'}
 try{
  assert.equal(receiver.invitation.schemaVersion,2)
  assert.equal(JSON.stringify(receiver.invitation).includes('src/main.ts'),false)
  assert.equal((await send(receiver,body)).status,403)
  assert.equal((await send(receiver,{...body,approvalDigest:digest})).status,403)
  const reviewed=await (await send(receiver,{...body,action:'review'})).json()
  assert.equal(reviewed.grantJson,grantJson);assert.equal(reviewed.executionAuthority,false)
  assert.throws(()=>receiver.readToken())
  assert.equal((await send(receiver,{...body,approvalDigest:'f'.repeat(64)})).status,403)
  assert.equal((await send(receiver,{...body,approvalDigest:digest})).status,200)
  assert.equal((await receiver.ready).outcome,'session_connected')
  assert.equal(receiver.readToken(),'fixture-session')
 }finally{receiver.dispose()}
})
test('real loopback receiver validates one invitation and keeps credentials out of responses',async()=>{
  let verified=0
  const receiver=await createLocalSessionReceiver({previewOrigin,verifySession:async token=>{verified++;return token==='fixture-session'},timeoutMs:3000})
  try{
    assert.throws(()=>receiver.readToken(),/session_unavailable/)
    const wrong=await send(receiver,{challenge:receiver.invitation.challenge,token:'fixture-session'},'https://other.example')
    assert.equal(wrong.status,403);assert.equal(verified,0)
    assert.equal((await send(receiver,{challenge:'0'.repeat(64),token:'fixture-session'})).status,403)
    const preflight=await fetch(receiver.invitation.endpoint,{method:'OPTIONS',headers:{origin:previewOrigin,'access-control-request-method':'POST','access-control-request-headers':'content-type'}})
    assert.equal(preflight.status,204)
    const response=await send(receiver,{challenge:receiver.invitation.challenge,token:'fixture-session'})
    assert.equal(response.status,200)
    assert(!JSON.stringify(await response.json()).includes('fixture-session'))
    assert.deepEqual(await receiver.ready,{outcome:'session_connected',executionAuthority:false,completionAuthority:false})
    assert.equal(verified,1);assert.equal(receiver.readToken(),'fixture-session')
    await assert.rejects(send(receiver,{challenge:receiver.invitation.challenge,token:'fixture-session'}))
    receiver.dispose();assert.throws(()=>receiver.readToken(),/session_unavailable/)
  }finally{receiver.dispose()}
})
test('failed verification consumes invitation; timeout cannot expose late credentials',async()=>{
  const failed=await createLocalSessionReceiver({previewOrigin,verifySession:async()=>false,timeoutMs:1000})
  try{
    assert.equal((await send(failed,{challenge:failed.invitation.challenge,token:'fixture-session'})).status,403)
    assert.equal((await failed.ready).outcome,'session_unavailable')
    assert.throws(()=>failed.readToken(),/session_unavailable/)
  }finally{failed.dispose()}
  let release
  const expired=await createLocalSessionReceiver({previewOrigin,verifySession:()=>new Promise(resolve=>{release=resolve}),timeoutMs:60})
  const pending=send(expired,{challenge:expired.invitation.challenge,token:'fixture-session'}).catch(()=>null)
  try{
    assert.equal((await expired.ready).outcome,'session_expired')
    release?.(true);await pending
    assert.throws(()=>expired.readToken(),/session_unavailable/)
  }finally{expired.dispose()}
})
