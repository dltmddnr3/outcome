import assert from 'node:assert/strict'
import test from 'node:test'
import { plannerRequestEnvelope, projectCompletedPlannerResponse } from './outcome-chat-result-source.mjs'

const request = { threadId:'synthetic-thread-identity', message:'Please review the result', correlationId:'message-0123456789abcdef' }
const fixture = () => ({ thread:{ id:request.threadId, cwd:'/Users/private/workspace', turns:[{
  id:'synthetic-turn',status:'completed',completedAt:1788825600,itemsView:'full',error:null,
  items:[{ type:'userMessage',id:'user-1',content:[{ type:'text',text:plannerRequestEnvelope(request.message,request.correlationId) }] },
    { type:'agentMessage',id:'comment-1',phase:'commentary',text:'working' },
    { type:'agentMessage',id:'answer-1',phase:'final_answer',text:'The result is ready for review.' }],
}] } })
const project = data => projectCompletedPlannerResponse({ ...request, observedAt:'2030-01-01T00:00:00.000Z', json:JSON.stringify(data) })

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

test('ambiguous, mismatched and partially loaded source evidence fails closed', () => {
  for (const mutate of [
    d => { d.thread.id='different' },
    d => { d.thread.turns.push(structuredClone(d.thread.turns[0])) },
    d => { d.thread.turns[0].itemsView='summary' },
    d => { d.thread.turns[0].error={message:'failure'} },
    d => { d.thread.turns[0].completedAt=null },
    d => { d.thread.turns[0].items[0].content[0].text=request.message },
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
