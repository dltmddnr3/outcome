import test from 'node:test'
import assert from 'node:assert/strict'
import { projectSingleSessionWork as project } from './outcome-work-observer.mjs'

const scope = {projectId:'outcome',workId:'work-a',runId:'run-a',sessionRef:'private-session',bindingVersion:1}
const expected = JSON.stringify(scope), base = Date.parse('2030-01-01T00:00:00.000Z')
const commit = 'a'.repeat(40), tree = 'b'.repeat(40), evidence = 'c'.repeat(64)
const event = (sequence, change = {}) => ({sequence,observedAt:new Date(base + sequence * 100).toISOString(),
  stage:'queued',attempt:1,activity:'waiting',candidateCommit:null,candidateTree:null,evidenceRef:null,nextAction:null,blocker:null,...change})
const running = {stage:'implementing',activity:'running'}
const pinned = {candidateCommit:commit,candidateTree:tree}
const done = {activity:'terminal',evidenceRef:evidence}
const journal = events => JSON.stringify({schemaVersion:1,scope,events})
const fold = (events, now=base+1000) => project(journal(events),expected,now)
const chain = () => [event(1),event(2,running),event(3,{...running,...pinned,...done,nextAction:'qa_verifying'}),
  event(4,{stage:'qa_verifying',activity:'running',...pinned}),
  event(5,{stage:'qa_verifying',...pinned,...done,nextAction:'release_verifying'}),
  event(6,{stage:'release_verifying',activity:'running',...pinned}),
  event(7,{stage:'release_verifying',...pinned,...done,nextAction:'awaiting_owner'}),
  event(8,{stage:'awaiting_owner',activity:'waiting',blocker:'needs_owner',...pinned})]

test('one session traverses implementation QA Release and owner wait without gaining authority',()=>{
  const events=chain()
  for(let size=1;size<=events.length;size++){
    const result=fold(events.slice(0,size))
    assert.equal(result.stage,events[size-1].stage)
    assert.equal(result.completionAuthority,false);assert.equal(result.executionAuthority,false)
    assert.equal(result.verificationMode,'same-session verification')
    for(const secret of [scope.sessionRef,commit,tree,evidence,'progress','health','confidence']) assert(!JSON.stringify(result).includes(secret))
  }
  assert.equal(fold(events).continuation,'needs_owner')
  assert.equal(fold(events.slice(0,3)).evidenceStatus,'reference_only_unverified')
})
test('terminal without next action is detected; duplicates and repeated observations cannot reset its age',()=>{
  const events=chain().slice(0,3);events[2].nextAction=null
  assert.equal(fold(events,base+5299).continuation,'observing')
  assert.equal(fold(events,base+5300).continuation,'next_action_missing')
  events.push({...events[2],sequence:4,observedAt:new Date(base+5000).toISOString()},events[2])
  assert.equal(fold(events,base+5500).continuation,'next_action_missing')
  const blocked=events.slice(0,3);blocked[2].blocker='authority_missing'
  assert.equal(fold(blocked,base+5500).continuation,'authority_missing')
})
test('stale and clock rollback do not fabricate stopped/running or authorize the recorded next action',()=>{
  const events=chain().slice(0,3)
  const stale=fold(events,base+15301)
  assert.equal(stale.freshness,'stale');assert.equal(stale.activity,'unknown')
  assert.equal(stale.continuation,'observation_stale');assert.equal(stale.nextAction,null)
  assert.equal(fold([],base).freshness,'unobserved')
  assert.throws(()=>fold(events,base),/work_observation_invalid/)
  for(const now of [NaN,Infinity,-1,8640000000000001]) assert.throws(()=>fold(events,now),/work_observation_invalid/)
})
test('exact replay is deterministic; gaps conflicting duplicates and out-of-order new events reject',()=>{
  const events=chain()
  assert.deepEqual(fold([...events,...events]),fold(events))
  for(const bad of [[events[1]], [events[0],events[2]], [...events,{...events[0],activity:'running'}], [events[0],event(2,{...running,observedAt:new Date(base).toISOString()})]])
    assert.throws(()=>fold(bad),/work_observation_invalid/)
})
test('new candidate requires implementation correction attempt and fresh downstream references',()=>{
  const events=chain().slice(0,5);events[4].nextAction='implementing'
  events.push(event(6,{...running,attempt:2}),event(7,{...running,attempt:2,candidateCommit:'d'.repeat(40),candidateTree:'e'.repeat(40),...done,nextAction:'qa_verifying'}),
    event(8,{stage:'qa_verifying',activity:'running',attempt:2,candidateCommit:'d'.repeat(40),candidateTree:'e'.repeat(40)}))
  assert.equal(fold(events).stage,'qa_verifying');assert.equal(fold(events).evidenceStatus,'missing')
  const invalid=chain();invalid[5].candidateCommit='d'.repeat(40)
  assert.throws(()=>fold(invalid),/work_observation_invalid/)
  const noAttempt=events.map(x=>({...x,attempt:1}));assert.throws(()=>fold(noAttempt),/work_observation_invalid/)
})
test('missing candidate/evidence and skipped or resurrected stages fail closed',()=>{
  for(const mutate of [
    events=>events[2].evidenceRef=null,
    events=>events[3].candidateCommit=null,
    events=>events[2].nextAction='release_verifying',
    events=>events[3].stage='implementing',
    events=>events[3].attempt=2,
    events=>events[7].blocker=null,
  ]){const events=chain();mutate(events);assert.throws(()=>fold(events),/work_observation_invalid/)}
})
test('scope mismatch, forged authority, private payloads, malformed or oversized inputs reject',()=>{
  for(const key of Object.keys(scope)) {
    const wrong={...scope,[key]:key==='bindingVersion'?2:'other'}
    assert.throws(()=>project(journal(chain()),JSON.stringify(wrong),base+1000),/work_observation_invalid/)
  }
  for(const extra of [{completionAuthority:true},{executionAuthority:true},{message:'private text'},{role:'builder'}]) {
    const events=chain();Object.assign(events[0],extra);assert.throws(()=>fold(events),/work_observation_invalid/)
  }
  for(const input of ['null','{}','{',' '.repeat(262145),JSON.stringify({schemaVersion:1,scope,events:Array(513).fill(event(1))})])
    assert.throws(()=>project(input,expected,base+1000),/work_observation_invalid/)
  let touched=false
  const hostile=new Proxy({}, {get(){touched=true;throw Error('private')}})
  assert.throws(()=>project(hostile,expected,base),/work_observation_invalid/);assert.equal(touched,false)
})
test('projection is immutable and independent; local observer calls have no dispatch capability',()=>{
  const data=journal(chain()), first=project(data,expected,base+1000)
  assert(Object.isFrozen(first));assert.throws(()=>{first.completionAuthority=true})
  assert.deepEqual(project(data,expected,base+1000),first)
  assert.deepEqual(Object.keys(first),['schemaVersion','stage','activity','freshness','observationAgeMs','verificationMode','evidenceStatus','continuation','nextAction','completionAuthority','executionAuthority'])
})
