import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,realpath,writeFile,chmod,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {createHash} from 'node:crypto'
import {readDestinationCreationConfiguration,runDestinationCreationOnce,runConfiguredDestinationCreation} from '../scripts/run-destination-creation.mjs'

const scope={workspaceId:'account-only-preview',accountRef:'b'.repeat(64),draftId:'00000000-0000-4000-8000-000000000001',requestId:'00000000-0000-4000-8000-000000000002'}
const config=()=>({schemaVersion:1,purpose:'destination_creation_once',candidatePin:'a'.repeat(40),environment:{VERCEL_ENV:'preview',VERCEL_TARGET_ENV:'preview',VERCEL_URL:'outcome-synthetic-unique.vercel.app',OUTCOME_DESTINATION_DURABLE_ENABLED:'1',OUTCOME_DESTINATION_DATABASE_URL:'postgresql://outcome_destination_runtime.abcdefghijklmnopqrst:synthetic%2Dpassword@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=verify-full',OUTCOME_DESTINATION_DATABASE_CA_PEM:'-----BEGIN CERTIFICATE-----\nQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVo=\n-----END CERTIFICATE-----',OUTCOME_DESTINATION_CSRF_SECRET:'synthetic-csrf-destination-123456789',OUTCOME_SUPABASE_URL:'https://abcdefghijklmnopqrst.supabase.co'},scope,reviewDigest:'c'.repeat(64),evidenceDigest:'d'.repeat(64),ownerCwd:'/private/tmp/synthetic-owner',bindingRegistryPath:'/private/tmp/synthetic-owner/.outcome-runtime/bindings.json',projectRegistryPath:'/private/tmp/synthetic-private/projects.json',projectRegistrySha256:'e'.repeat(64),catalog:'/private/tmp/synthetic-catalog',codexExecutable:'codex'})
test('creation configuration is explicit, exact and separate from question authority',async()=>{
 const directory=await realpath(await mkdtemp(join(tmpdir(),'outcome-creation-runner-test-'))),path=join(directory,'config.json')
 try{
  const save=async value=>{await writeFile(path,JSON.stringify(value),{mode:0o600});await chmod(path,0o600)}
  await save(config());const loaded=await readDestinationCreationConfiguration(path)
  assert.deepEqual(loaded.config,config());assert.ok(Object.isFrozen(loaded.config.scope));assert.match(loaded.configurationDigest,/^[a-f0-9]{64}$/)
  for(const change of [{purpose:'destination_questions_only'},{execute:true},{candidatePin:['a'.repeat(40)]},{environment:{...config().environment,VERCEL_ENV:'production'}},{scope:{...scope,requestId:'*'}},{scope:{...scope,workspaceId:['workspace']}},{reviewDigest:null},{bindingRegistryPath:'/private/tmp/another/bindings.json'},{catalog:'relative'},{projectRegistrySha256:'unknown'}]){
   await save({...config(),...change});await assert.rejects(()=>readDestinationCreationConfiguration(path),/^Error: destination_creation_unavailable$/)
  }
  await save(config());await chmod(path,0o644);await assert.rejects(()=>readDestinationCreationConfiguration(path));await chmod(path,0o600)
  const output=[]
  assert.equal(await runConfiguredDestinationCreation({configPath:path,mode:'--run-once',signal:new AbortController().signal,write:line=>output.push(JSON.parse(line))}),70)
  assert.deepEqual(output,[{state:'CONFIG_SAFE_HOLD',completionAuthority:false,executionAuthority:false}]) // wrong pin: before owner/DB access
 }finally{await rm(directory,{recursive:true,force:true})}
})
function fixture(){
 const calls=[],output=[],controller=new AbortController(),c=config()
 let result=null
 const confirmation={...scope,reviewDigest:c.reviewDigest,evidenceDigest:c.evidenceDigest,completionAuthority:false,executionAuthority:false}
 const projectId='destination-'+createHash('sha256').update(JSON.stringify([scope.workspaceId,scope.accountRef,scope.draftId])).digest('hex')
 const input={mode:'--run-once',scope,reviewDigest:c.reviewDigest,evidenceDigest:c.evidenceDigest,signal:controller.signal,write:line=>output.push(JSON.parse(line)),ready:async()=>true,
  confirmationRepository:{readConfirmedCreation:async()=>confirmation},
  store:{load:async()=>result,claim:async()=>{calls.push('claim');return {acquired:true}},record:async()=>{calls.push('record');return result={projectId,requestId:scope.requestId,reviewDigest:c.reviewDigest,state:'package_registered',completionAuthority:false,executionAuthority:false}}},
  publisher:{publish:async()=>{calls.push('publish')},publicationEvidence:async()=>({projectId,publicationDigest:'e'.repeat(64),state:'package_registered',completionAuthority:false,executionAuthority:false})}}
 return {input,calls,output,controller,confirmation}
}
test('check reads only; one explicit run records once and reentry reads without publishing',async()=>{
 const f=fixture()
 assert.equal(await runDestinationCreationOnce({...f.input,mode:'--check'}),0);assert.deepEqual(f.calls,[]);assert.equal(f.output[0].state,'CHECKED_NO_MUTATION')
 assert.equal(await runDestinationCreationOnce(f.input),0);assert.deepEqual(f.calls,['claim','publish','record']);assert.equal(f.output[1].state,'PACKAGE_RECORDED')
 assert.equal(await runDestinationCreationOnce(f.input),0);assert.deepEqual(f.calls,['claim','publish','record']);assert.equal(f.output[2].state,'ALREADY_RECORDED')
 assert.ok(f.output.every(row=>Object.keys(row).sort().join(',')==='completionAuthority,executionAuthority,state'&&row.completionAuthority===false&&row.executionAuthority===false))
})
test('unconfirmed, wrong exact source, cancelled and unsupported modes do not mutate',async()=>{
 for(const kind of ['missing','request','review','evidence','authority','cancel','mode']){
  const f=fixture()
  if(kind==='missing')f.input.confirmationRepository.readConfirmedCreation=async()=>null
  if(kind==='request')f.confirmation.requestId='00000000-0000-4000-8000-000000000099'
  if(kind==='review')f.confirmation.reviewDigest='f'.repeat(64)
  if(kind==='evidence')f.confirmation.evidenceDigest='f'.repeat(64)
  if(kind==='authority')f.confirmation.executionAuthority=true
  if(kind==='cancel')f.controller.abort()
  if(kind==='mode')f.input.mode='--run'
  assert.equal(await runDestinationCreationOnce(f.input),70,kind);assert.deepEqual(f.calls,[],kind)
 }
})
test('readiness drift and cancellation are checked before every mutation without retry',async()=>{
 for(const boundary of ['claim','publish','record'])for(const kind of ['drift','cancel','throw']){
  const f=fixture(),before={claim:0,publish:1,record:2}[boundary]
  f.input.ready=async()=>{
   if(f.calls.length!==before)return true
   // For claim, fail at preflight too: neither stage may acquire a claim.
   if(kind==='cancel'){f.controller.abort();return true}
   if(kind==='throw')throw Error('private locator must not be printed')
   return false
  }
  assert.equal(await runDestinationCreationOnce(f.input),70)
  assert.deepEqual(f.calls,['claim','publish','record'].slice(0,before))
  assert.ok(!JSON.stringify(f.output).includes('private locator'))
 }
})
test('a lost mutation reply is not retried and no raw error or receipt is emitted',async()=>{
 for(const boundary of ['claim','publish','record']){
  const f=fixture(),port=boundary==='publish'?f.input.publisher:f.input.store,original=port[boundary]
  port[boundary]=async value=>{await original(value);throw Error('/private/synthetic-sensitive-locator')}
  assert.equal(await runDestinationCreationOnce(f.input),70)
  assert.equal(f.calls.filter(value=>value===boundary).length,1)
  assert.ok(!JSON.stringify(f.output).includes('/private/'))
 }
})
test('stdout failure after mutation is not reported as success or retried',async()=>{
 const f=fixture();let writes=0
 f.input.write=()=>{writes++;throw Error('broken output')}
 assert.equal(await runDestinationCreationOnce(f.input),70)
 assert.equal(writes,1);assert.deepEqual(f.calls,['claim','publish','record'])
})
test('confirmation drift after preflight cannot switch the pinned review before claim',async()=>{
 const f=fixture();let reads=0
 f.input.confirmationRepository.readConfirmedCreation=async()=>({...f.confirmation,reviewDigest:++reads===1?f.input.reviewDigest:'f'.repeat(64)})
 assert.equal(await runDestinationCreationOnce(f.input),70)
 assert.deepEqual(f.calls,[])
})
