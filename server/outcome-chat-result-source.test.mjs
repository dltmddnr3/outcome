import assert from 'node:assert/strict'
import test from 'node:test'
import { plannerRequestEnvelope, projectCompletedPlannerResponse, projectPlannerActivity } from './outcome-chat-result-source.mjs'

const request = { threadId:'synthetic-thread-identity', message:'Please review the result', correlationId:'message-0123456789abcdef' }
const fixture = () => ({ thread:{ id:request.threadId, cwd:'/Users/private/workspace', turns:[{
  id:'synthetic-turn',status:'completed',completedAt:1788825600,itemsView:'full',error:null,
  items:[{ type:'userMessage',id:'user-1',content:[{ type:'text',text:plannerRequestEnvelope(request.message,request.correlationId) }] },
    { type:'agentMessage',id:'comment-1',phase:'commentary',text:'working' },
    { type:'agentMessage',id:'answer-1',phase:'final_answer',text:'The result is ready for review.' }],
}] } })
const project = data => projectCompletedPlannerResponse({ ...request, observedAt:'2030-01-01T00:00:00.000Z', json:JSON.stringify(data) })

test('provider activity is correlated, private and separate from stage success',()=>{
  const observe=data=>projectPlannerActivity({...request,observedAt:'2030-01-01T00:00:00.000Z',json:JSON.stringify(data)})
  for(const status of ['inProgress','completed','failed','interrupted']){
    const data=fixture(),turn=data.thread.turns[0];turn.status=status
    if(status==='inProgress')turn.completedAt=null
    const result=observe(data)
    assert.equal(result.outcome,'observed');assert.equal(result.activity,status==='inProgress'?'running':'terminal')
    assert.equal(result.providerStatus,status);assert.equal(result.completionAuthority,false)
    assert.match(result.sourceDigest,/^[a-f0-9]{64}$/)
    assert.doesNotMatch(JSON.stringify(result),/synthetic-thread|synthetic-turn|Users|ready for review|working/)
  }
  for(const mutate of [d=>d.thread.id='other',d=>d.thread.turns.push(d.thread.turns[0]),d=>d.thread.turns[0].itemsView='summary',d=>d.thread.turns[0].status='unknown',d=>d.thread.turns[0].completedAt=9999999999]){
    const data=fixture();mutate(data);assert.equal(observe(data).outcome,'unavailable')
  }
  const absent=fixture();absent.thread.turns=[];assert.equal(observe(absent).outcome,'pending')
})

test('one completed correlated full turn yields only the final reply and opaque source digest', () => {
  const result = project(fixture())
  assert.equal(result.outcome,'completed')
  assert.equal(result.response.message,'The result is ready for review.')
  assert.equal(result.response.correlation_id,request.correlationId)
  assert.equal(result.response.observed_at,'2030-01-01T00:00:00.000Z')
  assert.match(result.response.source_digest,/^[a-f0-9]{64}$/)
  assert.deepEqual(project(fixture()),result)
  assert.doesNotMatch(JSON.stringify(result),/synthetic-thread|synthetic-turn|Users|working/)
})

test('incomplete turns never become answers and failed turns are not pending', () => {
  for (const [status,outcome] of [['inProgress','pending'],['failed','unavailable'],['interrupted','unavailable']]) {
    const data=fixture(); data.thread.turns[0].status=status
    assert.deepEqual(project(data),{outcome})
  }
})

test('queued request absent from the readable turn window remains pending without inventing an answer', () => {
  const data=fixture(); data.thread.turns=[]
  assert.deepEqual(project(data),{outcome:'pending'})
  const unrelated=fixture(); unrelated.thread.turns[0].items[0].content[0].text='unrelated owner request'
  assert.deepEqual(project(unrelated),{outcome:'pending'})
})

test('ambiguous, mismatched and partially loaded source evidence fails closed', () => {
  for (const mutate of [
    d => { d.thread.id='different' },
    d => { d.thread.turns.push(structuredClone(d.thread.turns[0])) },
    d => { d.thread.turns[0].itemsView='summary' },
    d => { d.thread.turns[0].error={message:'failure'} },
    d => { d.thread.turns[0].completedAt=null },
    d => { d.thread.turns[0].items.push(structuredClone(d.thread.turns[0].items[2])) },
    d => { d.thread.turns[0].items[2].phase=null },
    d => { d.thread.turns[0].items.push({type:'userMessage',content:[]}) },
  ]) { const data=fixture(); mutate(data); assert.deepEqual(project(data),{outcome:'unavailable'}) }
})

test('private identifiers, paths and credentials never enter a projected answer', () => {
  for (const text of [request.threadId,'Open /Users/private/workspace/file','Open /tmp/private-receipt','token=secret-value']) {
    const data=fixture(); data.thread.turns[0].items[2].text=text
    assert.deepEqual(project(data),{outcome:'unavailable'})
  }
  assert.deepEqual(projectCompletedPlannerResponse({...request,json:'{broken'}),{outcome:'unavailable'})
})
