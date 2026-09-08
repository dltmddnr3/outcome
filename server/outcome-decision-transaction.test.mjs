import assert from 'node:assert/strict'
import test from 'node:test'
import { createDecisionTransactionPort } from './outcome-decision-postgres.mjs'

const fixture = ({ identity = {session_user:'outcome_decision_runtime',current_user:'outcome_decision_backend'}, failOn } = {}) => {
  const calls = []
  const client = { query: async (sql,args) => { calls.push([sql,args]); if(sql === failOn) throw new Error('private connection detail'); return sql === 'select session_user, current_user' ? {rows:[identity]} : {rows:[]} }, release: () => calls.push(['release']) }
  return { calls, port:createDecisionTransactionPort({pool:{connect:async()=>client}}) }
}

test('decision transaction checks exact login and effective role before work and commits once', async () => {
  const {port,calls} = fixture()
  assert.equal(await port(async ({query}) => { await query('select $1::text',['bound']); return 'recorded' }), 'recorded')
  assert.deepEqual(calls.map(([sql])=>sql),['BEGIN','SET LOCAL ROLE outcome_decision_backend','select session_user, current_user','select $1::text','COMMIT','release'])
  assert.deepEqual(calls[3][1],['bound'])
})

for (const identity of [{session_user:'postgres',current_user:'outcome_decision_backend'},{session_user:'outcome_decision_runtime',current_user:'postgres'},null]) test(`invalid runtime identity blocks work ${JSON.stringify(identity)}`,async()=>{
  const {port,calls}=fixture({identity})
  let work=0
  await assert.rejects(()=>port(async()=>{work+=1}),/^Error: decision_store_unavailable$/)
  assert.equal(work,0)
  assert.deepEqual(calls.slice(-2).map(([sql])=>sql),['ROLLBACK','release'])
})

for (const failOn of ['BEGIN','SET LOCAL ROLE outcome_decision_backend','select session_user, current_user','COMMIT']) test(`failure at ${failOn} is sanitized without retry`,async()=>{
  const {port,calls}=fixture({failOn})
  await assert.rejects(()=>port(async()=>({completionAuthority:false})),/^Error: decision_store_unavailable$/)
  assert.equal(calls.filter(([sql])=>sql===failOn).length,1)
  assert.deepEqual(calls.slice(-2).map(([sql])=>sql),['ROLLBACK','release'])
})

test('work failure rolls back and never commits or leaks private details',async()=>{
  const {port,calls}=fixture()
  await assert.rejects(()=>port(async()=>{throw new Error('private SQL value')}),/^Error: decision_store_unavailable$/)
  assert.equal(calls.some(([sql])=>sql==='COMMIT'),false)
  assert.deepEqual(calls.slice(-2).map(([sql])=>sql),['ROLLBACK','release'])
})
