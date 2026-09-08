import assert from 'node:assert/strict'
import test from 'node:test'
import {createDestinationTransactionPort,createDestinationRuntime} from './outcome-destination-runtime.mjs'
const fixture=(options={})=>{
 const calls=[];let connections=0,discards=0,releases=0
 const pool={connect:async()=>{connections++;if(options.connect)throw Error('private');return {query:async(sql,args)=>{calls.push([sql,args]);if(sql===options.fail||sql==='ROLLBACK'&&options.rollback)throw Error('private');return {rows:sql==='select session_user, current_user'?[{session_user:options.identity??'outcome_destination_runtime',current_user:'outcome_destination_backend'}]:[]}},release:error=>{releases++;if(error)discards++}}}}
 return {pool,calls,stats:()=>({connections,releases,discards})}
}
test('dedicated destination transaction checks roles, forwards parameters and commits once',async()=>{
 const f=fixture(),transact=createDestinationTransactionPort(f)
 assert.equal(await transact(async({query})=>{await query('synthetic query',['value']);return 'saved'}),'saved')
 assert.deepEqual(f.calls.map(([sql])=>sql),['BEGIN','SET LOCAL ROLE outcome_destination_backend','select session_user, current_user','synthetic query','COMMIT'])
 assert.deepEqual(f.calls[3][1],['value']);assert.deepEqual(f.stats(),{connections:1,releases:1,discards:0})
})
test('destination runtime refuses shared role and connection/transaction failures without retries',async()=>{
 for(const options of [{connect:true},{identity:'outcome_decision_runtime'},{fail:'BEGIN'},{fail:'SET LOCAL ROLE outcome_destination_backend'},{fail:'select session_user, current_user'},{fail:'COMMIT'}]){
  const f=fixture(options);let work=0
  await assert.rejects(()=>createDestinationTransactionPort(f)(async()=>{work++;return 'value'}),/^Error: destination_unavailable$/)
  assert.equal(f.stats().connections,1);assert.equal(work,options.fail==='COMMIT'?1:0)
 }
})
test('known application conflicts survive successful rollback; failed rollback discards client',async()=>{
 for(const rollback of [false,true]){
  const f=fixture({rollback})
  await assert.rejects(()=>createDestinationTransactionPort(f)(async()=>{throw Error('destination_revision_conflict')}),new RegExp(rollback?'destination_unavailable':'destination_revision_conflict'))
  assert.equal(f.calls.some(([sql])=>sql==='COMMIT'),false)
  assert.deepEqual(f.stats(),{connections:1,releases:1,discards:rollback?1:0})
 }
 const f=fixture();await assert.rejects(()=>createDestinationTransactionPort(f)(async()=>{throw Error('secret SQL payload')}),/^Error: destination_unavailable$/)
})
test('destination runtime construction is inert and rejects noncanonical origin or missing CSRF',()=>{
 const f=fixture()
 const runtime=createDestinationRuntime({...f,allowedOrigin:'https://preview.invalid',csrfSecret:'synthetic-csrf-long'})
 assert.equal(typeof runtime.repository.save,'function');assert.equal(f.stats().connections,0)
 for(const allowedOrigin of ['http://preview.invalid','https://preview.invalid/path','https://user:pass@preview.invalid'])assert.throws(()=>createDestinationRuntime({...f,allowedOrigin,csrfSecret:'synthetic-csrf-long'}),/destination_unavailable/)
 assert.throws(()=>createDestinationRuntime({...f,allowedOrigin:'https://preview.invalid',csrfSecret:''}),/destination_unavailable/)
})
