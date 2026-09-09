import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {projectCodexRuntimeObservation as project,projectObservedSingleSessionWork as compose} from './outcome-codex-work-observation.mjs'
const id='11111111-1111-4111-8111-111111111111',now=20000
const read=status=>JSON.stringify({thread:{id,status,updatedAt:9999999999,turns:[{status:'completed',items:[{text:'QA PASS release done'}]}]}})
test('local opaque session reference matches exact private runtime identity without disclosure',()=>{
  const ref=createHash('sha256').update('outcome-work-session-v1\0').update(id).digest('hex')
  const raw=read({type:'active',activeFlags:[]})
  const result=project(raw,ref,now,now)
  assert.equal(result.state,'active')
  assert(!JSON.stringify(result).includes(id));assert(!JSON.stringify(result).includes(ref))
  for(const foreign of ['a'.repeat(64),createHash('sha256').update(id).digest('hex'),ref.toUpperCase()])
    assert.equal(project(raw,foreign,now,now).state,'unknown')
  assert.equal(project(JSON.stringify({thread:{id:ref,status:{type:'active',activeFlags:[]}}}),ref,now,now).state,'unknown')
})
test('actual runtime vocabulary distinguishes active, waiting flags, idle and unavailable',()=>{
  for(const [status,state,reason] of [
    [{type:'active',activeFlags:[]},'active',null],
    [{type:'active',activeFlags:['waitingOnApproval']},'waiting_approval',null],
    [{type:'active',activeFlags:['waitingOnUserInput']},'waiting_user',null],
    [{type:'active',activeFlags:['waitingOnUserInput','waitingOnApproval']},'waiting_approval_and_user',null],
    [{type:'idle'},'idle',null],[{type:'notLoaded'},'unknown','source_not_loaded'],[{type:'systemError'},'unknown','source_error'],
  ]){
    const result=project(read(status),id,now,now)
    assert.equal(result.state,state);assert.equal(result.reason,reason)
    assert.deepEqual(project(JSON.stringify({method:'thread/status/changed',params:{threadId:id,status}}),id,now,now),result)
    assert(!JSON.stringify(result).includes(id));assert(!JSON.stringify(result).includes('PASS'))
  }
})
test('stored notLoaded plus apparently running turn cannot masquerade as a live source',()=>{
  const raw=JSON.stringify({thread:{id,status:{type:'notLoaded'},turns:[{status:'inProgress'}]}})
  assert.equal(project(raw,id,now,now).state,'unknown')
  assert.equal(project(read({type:'active',activeFlags:[]}),id,0,now).reason,'observation_stale')
  for(const t of [-1,NaN,Infinity,now+1]) assert.equal(project(read({type:'active',activeFlags:[]}),id,t,now).state,'unknown')
})
test('foreign identity malformed flags unknown protocol and hostile values fail without disclosure',()=>{
  for(const status of [{type:'active'},{type:'active',activeFlags:['futureFlag']},{type:'active',activeFlags:['waitingOnApproval','waitingOnApproval']},{type:'idle',private:'secret'},{type:'completed'},null])
    assert.equal(project(read(status),id,now,now).state,'unknown')
  for(const json of ['null','{',' '.repeat(262145),JSON.stringify({method:'turn/completed',params:{threadId:id}})]) assert.equal(project(json,id,now,now).state,'unknown')
  assert.equal(project(read({type:'active',activeFlags:[]}),id.replace(/^1/,'2'),now,now).state,'unknown')
  let touched=false;const proxy=new Proxy({}, {get(){touched=true;throw Error('secret')}})
  assert.equal(project(proxy,id,now,now).state,'unknown');assert.equal(touched,false)
})
test('composition requires both observed work stage and actual source; neither axis fabricates completion',()=>{
  const scope={projectId:'outcome',workId:'work-a',runId:'run-a',sessionRef:id,bindingVersion:1},scopeJson=JSON.stringify(scope)
  const first={sequence:1,observedAt:new Date(now-100).toISOString(),stage:'queued',attempt:1,activity:'waiting',candidateCommit:null,candidateTree:null,evidenceRef:null,nextAction:null,blocker:null}
  const second={...first,sequence:2,stage:'implementing',activity:'running',observedAt:new Date(now).toISOString()}
  const journal=events=>JSON.stringify({schemaVersion:1,scope,events})
  for(const [status,state] of [[{type:'active',activeFlags:[]},'running'],[{type:'idle'},'idle'],[{type:'notLoaded'},'unknown'],[{type:'active',activeFlags:['waitingOnApproval']},'waiting_approval']]){
    const result=compose(journal([first,second]),scopeJson,read(status),now,now)
    assert.equal(result.executionState,state);assert.equal(result.work.stage,'implementing')
    assert.equal(result.schemaVersion,1);assert.equal(result.observedAtMs,now)
    assert.equal(result.completionAuthority,false);assert.equal(result.executionAuthority,false);assert(Object.isFrozen(result))
  }
  assert.equal(compose(journal([first]),scopeJson,read({type:'active',activeFlags:[]}),now,now).executionState,'stage_unconfirmed')
  assert.equal(compose(journal([first,second]),scopeJson,read({type:'active',activeFlags:[]}),now+20000,now+20000).executionState,'stage_unconfirmed')
  assert.equal(compose(journal([first,second]),scopeJson,read({type:'active',activeFlags:[]}),now+20000,now+20000).observedAtMs,now)
})
