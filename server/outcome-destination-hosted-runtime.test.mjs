import assert from 'node:assert/strict'
import test from 'node:test'
import {createDestinationHostedRuntimeFactory,readDestinationHostedConfiguration} from './outcome-destination-hosted-runtime.mjs'
const environment=()=>({VERCEL_ENV:'preview',VERCEL_URL:'outcome-synthetic-unique.vercel.app',OUTCOME_DESTINATION_DURABLE_ENABLED:'1',OUTCOME_DESTINATION_DATABASE_URL:'postgresql://outcome_destination_runtime.abcdefghijklmnopqrst:synthetic%2Dpassword@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=verify-full',OUTCOME_DESTINATION_DATABASE_CA_PEM:'-----BEGIN CERTIFICATE-----\nQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVo=\n-----END CERTIFICATE-----',OUTCOME_DESTINATION_CSRF_SECRET:'synthetic-csrf-destination-123456789',OUTCOME_SUPABASE_URL:'https://abcdefghijklmnopqrst.supabase.co'})
const context=()=>({allowedOrigin:'https://outcome-synthetic-unique.vercel.app',accountRuntime:{service:{resolveBridgeAuthority(){}}}})
test('destination hosted factory is Preview-only, default-off and no fallback to shared credentials',async()=>{
 let loads=0
 const driverLoader=async()=>{loads++;throw Error('must_not_load')}
 const env=environment()
 for(const patch of [{OUTCOME_DESTINATION_DURABLE_ENABLED:''},{OUTCOME_DESTINATION_DURABLE_ENABLED:'true'},{VERCEL_ENV:'production'},{VERCEL_ENV:'development'},{VERCEL_ENV:''},{VERCEL_TARGET_ENV:'staging'},{VERCEL_URL:'custom.example'},{VERCEL_URL:'user@outcome.vercel.app'},{VERCEL_URL:'outcome.vercel.app/path'},{NODE_TLS_REJECT_UNAUTHORIZED:'0'},{OUTCOME_DESTINATION_DATABASE_CA_PEM:''},{OUTCOME_DESTINATION_CSRF_SECRET:'short'},{OUTCOME_SUPABASE_URL:'https://bcdefghijklmnopqrstua.supabase.co'},{OUTCOME_DESTINATION_DATABASE_URL:env.OUTCOME_DESTINATION_DATABASE_URL.replace('outcome_destination_runtime','outcome_chat_runtime')},{OUTCOME_DESTINATION_DATABASE_URL:env.OUTCOME_DESTINATION_DATABASE_URL.replace('verify-full','no-verify')},{OUTCOME_DESTINATION_DATABASE_URL:env.OUTCOME_DESTINATION_DATABASE_URL+'&sslmode=disable'},{OUTCOME_DESTINATION_DATABASE_URL:env.OUTCOME_DESTINATION_DATABASE_URL.replace('synthetic%2Dpassword','%E0%A4%A')},{OUTCOME_DESTINATION_DATABASE_URL:''}]){
  const current={...env,...patch,OUTCOME_CHAT_DATABASE_URL:env.OUTCOME_DESTINATION_DATABASE_URL}
  assert.deepEqual(readDestinationHostedConfiguration(current),{enabled:false})
  assert.equal(await createDestinationHostedRuntimeFactory({environment:current,driverLoader})(context()),null)
 }
 assert.equal(await createDestinationHostedRuntimeFactory({environment:{},driverLoader})(context()),null)
 assert.equal(loads,0)
})
test('destination configuration rejects Proxy and accessors without executing them',()=>{
 let hits=0
 const env=environment();Object.defineProperty(env,'OUTCOME_DESTINATION_DATABASE_URL',{get(){hits++;throw Error('private')}})
 assert.deepEqual(readDestinationHostedConfiguration(env),{enabled:false})
 assert.deepEqual(readDestinationHostedConfiguration(new Proxy(environment(),{getOwnPropertyDescriptor(){hits++;throw Error('private')}})),{enabled:false})
 assert.equal(hits,0)
})
test('dedicated pool snapshots secret input, verifies TLS and keeps original transaction identity checks',async()=>{
 const env=environment(),calls=[];let options,loads=0
 class Pool{constructor(value){options=value}on(){}async connect(){return{query:async(sql,args)=>{calls.push([sql,args]);return{rows:sql==='select session_user, current_user'?[{session_user:'outcome_destination_runtime',current_user:'outcome_destination_backend'}]:[]}},release(){}}}}
 const factory=createDestinationHostedRuntimeFactory({environment:env,driverLoader:async()=>{loads++;return{Pool}}})
 env.OUTCOME_DESTINATION_DATABASE_URL='invalid';env.OUTCOME_DESTINATION_CSRF_SECRET='changed'
 assert.equal(await factory({...context(),allowedOrigin:'https://branch-alias.vercel.app'}),null)
 assert.equal(loads,0)
 const runtime=await factory(context());assert.ok(runtime)
 assert.equal(options.ssl.rejectUnauthorized,true);assert.equal(options.ssl.ca,environment().OUTCOME_DESTINATION_DATABASE_CA_PEM)
 assert.equal(new URL(options.connectionString).search,'')
 assert.equal(new URL(options.connectionString).username,'outcome_destination_runtime.abcdefghijklmnopqrst')
 assert.equal(options.max,2);assert.equal(options.connectionTimeoutMillis,5000)
 assert.equal(runtime.csrfSecret,environment().OUTCOME_DESTINATION_CSRF_SECRET)
 assert.equal(await runtime.repository.load({workspaceId:'workspace',accountRef:'owner',draftId:'00000000-0000-4000-8000-000000000001'}),null)
 assert.equal(calls[0][0],'BEGIN');assert.equal(calls[1][0],'SET LOCAL ROLE outcome_destination_backend');assert.equal(calls.at(-1)[0],'COMMIT')
 assert.deepEqual(Object.keys(readDestinationHostedConfiguration(environment())).sort(),['allowedOrigin','enabled'])
 assert.equal(JSON.stringify(runtime).includes('password'),false)
})
test('destination runtime pool failure returns only unavailable without retry',async()=>{
 let loads=0
 const factory=createDestinationHostedRuntimeFactory({environment:environment(),driverLoader:async()=>{loads++;return{Pool:class{constructor(){throw Error('secret connection details')}}}}})
 assert.equal(await factory(context()),null);assert.equal(loads,1)
})
