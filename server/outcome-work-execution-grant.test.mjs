import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {verifyWorkExecutionGrant as verify} from './outcome-work-execution-grant.mjs'
const identity={projectId:'outcome',workId:'work-a',runId:'run-a',sessionRef:'session-a',bindingVersion:1,ownerRef:'d'.repeat(64),candidateCommit:'a'.repeat(40),candidateTree:'b'.repeat(40)}
const grant={schemaVersion:1,...identity,allowedStages:['implementing','qa_verifying','release_verifying'],issuedAt:100,expiresAt:300}
function check(g=grant,patch={},now=200){const raw=JSON.stringify(g);return verify(raw,JSON.stringify({...identity,authorityRef:createHash('sha256').update(raw).digest('hex'),action:'qa_verifying',status:'active',...patch}),now)}
test('exact local grant matches without granting execution or completion',()=>{
  assert.deepEqual(check(),{matches:true,executionAuthority:false,completionAuthority:false})
  assert.equal(check(grant,{},100).matches,true)
})
test('v2 binds explicit commands and paths without converting v1 or granting execution',()=>{
  const scoped={...grant,schemaVersion:2,allowedStages:['qa_verifying'],execution:{checkoutRef:'e'.repeat(64),writePaths:[],commands:[{id:'regression',stage:'qa_verifying',program:'node',args:['--test','server/outcome-work-execution-grant.test.mjs'],timeoutMs:10000}]}}
  assert.deepEqual(check(scoped),{matches:true,executionAuthority:false,completionAuthority:false})
  assert.equal(check({...scoped,execution:{...scoped.execution,readPaths:['server/check.mjs']}}).matches,true)
  const originalDigest=createHash('sha256').update(JSON.stringify(scoped)).digest('hex')
  for(const mutate of [g=>g.execution.readPaths=['server/check.mjs'],g=>g.execution.commands[0].args.push('--help'),g=>g.execution.writePaths.push('src/main.ts'),g=>g.execution.checkoutRef='f'.repeat(64)]){
    const value=structuredClone(scoped);mutate(value);assert.equal(check(value,{authorityRef:originalDigest}).matches,false)
  }
  for(const paths of [['../outside'],['/tmp/test'],['.env'],['src/../private'],['src//x'],['src/*'],['src/x','src/x']])assert.equal(check({...scoped,execution:{...scoped.execution,writePaths:paths}}).matches,false)
  for(const paths of [['../outside'],['/tmp/test'],['.env'],['src//x'],['src/*'],['src/x','src/x'],null])assert.equal(check({...scoped,execution:{...scoped.execution,readPaths:paths}}).matches,false)
  for(const mutate of [g=>g.execution.commands=[],g=>g.execution.commands[0].stage='implementing',g=>g.execution.commands[0].program='sh',g=>g.execution.commands[0].timeoutMs=0,g=>g.execution.commands[0].args=['bad\nargument'],g=>g.execution.commands.push(g.execution.commands[0]),g=>delete g.execution]){
    const value=structuredClone(scoped);mutate(value);assert.equal(check(value).matches,false)
  }
  assert.equal(check({...scoped,schemaVersion:1}).matches,false)
})
test('expiry, future grant, revocation and current identity drift fail closed',()=>{
  for(const now of [99,300,301,-1,NaN,Infinity])assert.equal(check(grant,{},now).matches,false)
  for(const status of ['revoked','unknown',null])assert.equal(check(grant,{status}).matches,false)
  for(const key of Object.keys(identity))assert.equal(check(grant,{[key]:key==='bindingVersion'?2:'changed'}).matches,false,key)
  assert.equal(check(grant,{authorityRef:'e'.repeat(64)}).matches,false)
})
test('no broader actions, malformed grants, legacy decisions or duplicate permissions',()=>{
  for(const allowedStages of [[],['deploy'],['qa_verifying','qa_verifying'],['implementing']])assert.equal(check({...grant,allowedStages}).matches,false)
  for(const action of ['deploy','awaiting_owner','accept','release'])assert.equal(check(grant,{action}).matches,false)
  for(const g of [{decision:'approved'},null,{...grant,extra:true},{...grant,expiresAt:100},{...grant,issuedAt:-1},{...grant,bindingVersion:0}])assert.equal(check(g).matches,false)
  for(const raw of ['{','x'.repeat(8193),null,{}])assert.equal(verify(raw,'{}',200).matches,false)
  assert.equal(verify(JSON.stringify(grant),'x'.repeat(8193),200).matches,false)
})
