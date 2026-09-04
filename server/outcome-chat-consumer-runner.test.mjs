import assert from 'node:assert/strict'
import { chmodSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { OUTCOME_CHAT_CONSUMER_ENV, readOutcomeChatConsumerConfiguration, runOutcomeChatConsumerOnce } from './outcome-chat-consumer-runner.mjs'

const registry = () => { const path=join(mkdtempSync(join(tmpdir(),'chat-runner-')),'registry.json'); writeFileSync(path,'{}',{mode:0o600}); chmodSync(path,0o600); return path }
const environment = (overrides={}) => ({
  [OUTCOME_CHAT_CONSUMER_ENV.enabled]:'1',
  [OUTCOME_CHAT_CONSUMER_ENV.databaseUrl]:'postgresql://outcome_chat_runtime.abcdefghijklmnopqrst:secret@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=verify-full',
  [OUTCOME_CHAT_CONSUMER_ENV.databaseCaPem]:'-----BEGIN CERTIFICATE-----\nfixture\n-----END CERTIFICATE-----',
  [OUTCOME_CHAT_CONSUMER_ENV.consumerId]:'consumer-main',
  [OUTCOME_CHAT_CONSUMER_ENV.registryPath]:registry(),
  [OUTCOME_CHAT_CONSUMER_ENV.leaseMs]:'30000',
  [OUTCOME_CHAT_CONSUMER_ENV.timeoutMs]:'5000',
  ...overrides,
})

test('configuration is default-off and rejects hostile partial inherited accessor proxy TLS and argv input', () => {
  assert.deepEqual(readOutcomeChatConsumerConfiguration({}),{enabled:false})
  for (const value of [environment({[OUTCOME_CHAT_CONSUMER_ENV.databaseCaPem]:''}),Object.create(environment()),new Proxy(environment(),{}),environment({NODE_TLS_REJECT_UNAUTHORIZED:'1'})]) assert.deepEqual(readOutcomeChatConsumerConfiguration(value),{enabled:false})
  const accessor=environment(); Object.defineProperty(accessor,OUTCOME_CHAT_CONSUMER_ENV.consumerId,{get(){throw new Error('private')}}); assert.deepEqual(readOutcomeChatConsumerConfiguration(accessor),{enabled:false})
})

test('configuration accepts only bounded canonical values and a protected regular registry', () => {
  const value=readOutcomeChatConsumerConfiguration(environment())
  assert.equal(value.enabled,true); assert.equal(value.consumerId,'consumer-main'); assert.equal(value.leaseMs,30000); assert.equal(value.timeoutMs,5000)
  for (const overrides of [{[OUTCOME_CHAT_CONSUMER_ENV.databaseUrl]:'postgresql://other:secret@db.invalid/postgres?sslmode=verify-full'},{[OUTCOME_CHAT_CONSUMER_ENV.consumerId]:'x'},{[OUTCOME_CHAT_CONSUMER_ENV.leaseMs]:'999'},{[OUTCOME_CHAT_CONSUMER_ENV.timeoutMs]:'60001'},{[OUTCOME_CHAT_CONSUMER_ENV.registryPath]:'relative.json'}]) assert.deepEqual(readOutcomeChatConsumerConfiguration(environment(overrides)),{enabled:false})
})

test('configuration rejects every alternate role pool mode host database TLS and encoding shape', () => {
  const valid=environment()[OUTCOME_CHAT_CONSUMER_ENV.databaseUrl]
  for (const databaseUrl of [
    valid.replace('outcome_chat_runtime.', 'postgres.'),
    valid.replace('outcome_chat_runtime.', 'other.'),
    valid.replace('outcome_chat_runtime.', 'outcome_chat_runtime%2E'),
    valid.replace('abcdefghijklmnopqrst', 'ABCDEFGHIJKLMNOPQRST'),
    valid.replace('aws-0-us-east-1.pooler.supabase.com', 'db.abcdefghijklmnopqrst.supabase.co'),
    valid.replace(':6543', ':5432'),
    valid.replace('/postgres', '/outcome'),
    valid.replace('?sslmode=verify-full', ''),
    `${valid}&extra=1`,
  ]) assert.deepEqual(readOutcomeChatConsumerConfiguration(environment({[OUTCOME_CHAT_CONSUMER_ENV.databaseUrl]:databaseUrl})),{enabled:false})
})

test('actual process.env own-data carrier reaches exactly one run and one close', async () => {
  const fixture=environment(),names=[...Object.values(OUTCOME_CHAT_CONSUMER_ENV),'NODE_TLS_REJECT_UNAUTHORIZED'],prior=new Map(names.map((name)=>[name,Object.getOwnPropertyDescriptor(process.env,name)]))
  try {
    for (const [name,value] of Object.entries(fixture)) process.env[name]=value
    delete process.env.NODE_TLS_REJECT_UNAUTHORIZED
    assert.equal(readOutcomeChatConsumerConfiguration(process.env).enabled,true)
    let runs=0,ends=0;const writes=[]
    const code=await runOutcomeChatConsumerOnce({environment:process.env,argv:[],driverLoader:async()=>({Pool:class {async end(){ends+=1}}}),transactionFactory:()=>async()=>{},repositoryFactory:()=>({}),queueAdapterFactory:()=>({bindingResolver(){},transport(){}}),runtimeFactory:()=>({async runOnce(){runs+=1;return {outcome:'idle'}}}),write:(text)=>writes.push(text)})
    assert.equal(code,0);assert.equal(runs,1);assert.equal(ends,1);assert.deepEqual(writes,['OUTCOME_CHAT_CONSUMER_IDLE\n'])
  } finally {
    for (const [name,descriptor] of prior) { if(descriptor)Object.defineProperty(process.env,name,descriptor);else delete process.env[name] }
  }
})

const execute = async (outcome, overrides={}) => {
  const calls={load:0,pool:0,end:0,run:0,queue:0,write:[]}
  const result=await runOutcomeChatConsumerOnce({environment:environment(),argv:[],driverLoader:async()=>{calls.load+=1;return {Pool:class {constructor(options){calls.pool+=1;calls.options=options}async end(){calls.end+=1}}}},transactionFactory:()=>async()=>{},repositoryFactory:()=>({}),queueAdapterFactory:()=>{calls.queue+=1;return {bindingResolver(){},transport(){}}},runtimeFactory:()=>({async runOnce(){calls.run+=1;if(outcome instanceof Error)throw outcome;return {outcome}}}),write:(text)=>calls.write.push(text),...overrides})
  return {result,calls}
}

test('valid idle acknowledged and ambiguous outcomes are fixed finite terminals', async () => {
  for (const [outcome,code,text] of [['idle',0,'OUTCOME_CHAT_CONSUMER_IDLE\n'],['acknowledged',0,'OUTCOME_CHAT_CONSUMER_ACKNOWLEDGED\n'],['delivery_unknown',2,'OUTCOME_CHAT_CONSUMER_DELIVERY_UNKNOWN\n']]) { const {result,calls}=await execute(outcome); assert.equal(result,code); assert.deepEqual(calls.write,[text]); assert.equal(calls.run,1); assert.equal(calls.end,1) }
})

test('rejected and failed outcomes preserve truth with deterministic exit codes', async () => {
  for (const [outcome,code] of [['rejected',3],['failed',4]]) { const {result,calls}=await execute(outcome); assert.equal(result,code); assert.equal(calls.run,1); assert.equal(calls.end,1) }
})

test('invalid config and argv payload stop before driver pool queue or runtime', async () => {
  for (const options of [{environment:{}},{environment:environment(),argv:['private']}]) { let calls=0; const writes=[]; const result=await runOutcomeChatConsumerOnce({...options,driverLoader:async()=>{calls+=1},write:(text)=>writes.push(text)}); assert.equal(result,64); assert.equal(calls,0); assert.deepEqual(writes,['OUTCOME_CHAT_CONSUMER_CONFIG_SAFE_HOLD\n']) }
})

test('load construction runtime and close failures are redacted and never retry', async () => {
  let loads=0; const writes=[]; assert.equal(await runOutcomeChatConsumerOnce({environment:environment(),argv:[],driverLoader:async()=>{loads+=1;throw new Error('private-url')},write:(text)=>writes.push(text)}),70); assert.equal(loads,1); assert.deepEqual(writes,['OUTCOME_CHAT_CONSUMER_RUNTIME_SAFE_HOLD\n'])
  let constructions=0; const constructionWrites=[]; assert.equal(await runOutcomeChatConsumerOnce({environment:environment(),argv:[],driverLoader:async()=>({Pool:class {constructor(){constructions+=1;throw new Error('private-pool')}}}),write:(text)=>constructionWrites.push(text)}),70); assert.equal(constructions,1); assert.deepEqual(constructionWrites,['OUTCOME_CHAT_CONSUMER_RUNTIME_SAFE_HOLD\n'])
  const thrown=await execute(new Error('private-message')); assert.equal(thrown.result,70); assert.equal(thrown.calls.run,1); assert.equal(thrown.calls.end,1); assert.deepEqual(thrown.calls.write,['OUTCOME_CHAT_CONSUMER_RUNTIME_SAFE_HOLD\n'])
  const close=await execute('idle',{driverLoader:async()=>({Pool:class {async end(){throw new Error('private-close')}}})}); assert.equal(close.result,70); assert.deepEqual(close.calls.write,['OUTCOME_CHAT_CONSUMER_RUNTIME_SAFE_HOLD\n'])
})

test('pool connect failure runs once, closes once and exposes no exception', async () => {
  let connects=0,ends=0; const writes=[]
  const result=await runOutcomeChatConsumerOnce({environment:environment(),argv:[],driverLoader:async()=>({Pool:class {async connect(){connects+=1;throw new Error('private-connect')}async end(){ends+=1}}}),queueAdapterFactory:()=>({bindingResolver(){},transport(){}}),write:(text)=>writes.push(text)})
  assert.equal(result,4); assert.equal(connects,1); assert.equal(ends,1); assert.deepEqual(writes,['OUTCOME_CHAT_CONSUMER_FAILED\n'])
})

test('pool uses exact bounded verified TLS and composition factories once', async () => {
  const {calls}=await execute('idle'); assert.equal(calls.load,1); assert.equal(calls.pool,1); assert.equal(calls.queue,1); assert.equal(calls.options.max,1); assert.equal(calls.options.allowExitOnIdle,true); assert.equal(calls.options.ssl.rejectUnauthorized,true)
})
