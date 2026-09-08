import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,realpath,writeFile,chmod,symlink,link,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {readDestinationServiceConfiguration,readDestinationProtectedBytes,readDestinationRegistryBytes,runConfiguredDestinationQuestions} from '../scripts/run-destination-questions.mjs'
const config=()=>({schemaVersion:1,candidatePin:'a'.repeat(40),environment:{VERCEL_ENV:'preview',VERCEL_TARGET_ENV:'preview',VERCEL_URL:'outcome-synthetic-unique.vercel.app',OUTCOME_DESTINATION_DURABLE_ENABLED:'1',OUTCOME_DESTINATION_DATABASE_URL:'postgresql://outcome_destination_runtime.abcdefghijklmnopqrst:synthetic%2Dpassword@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=verify-full',OUTCOME_DESTINATION_DATABASE_CA_PEM:'-----BEGIN CERTIFICATE-----\nQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVo=\n-----END CERTIFICATE-----',OUTCOME_DESTINATION_CSRF_SECRET:'synthetic-csrf-destination-123456789',OUTCOME_SUPABASE_URL:'https://abcdefghijklmnopqrst.supabase.co'},scope:{workspaceId:'account-only-preview',accountRef:'b'.repeat(64),draftId:'00000000-0000-4000-8000-000000000001'},registryPath:'/private/tmp/synthetic-owner/.outcome-runtime/bindings.json',ownerCwd:'/private/tmp/synthetic-owner',inputDirectory:'/private/tmp/synthetic-inputs',inputScopeSha256:'c'.repeat(64),readerEntrySha256:'d'.repeat(64),codexExecutable:'codex'})
test('registry carrier has its own bounded history size without relaxing private config guards',async()=>{
 const directory=await realpath(await mkdtemp(join(tmpdir(),'outcome-registry-size-test-'))),path=join(directory,'bindings.json')
 try{
  await writeFile(path,' '.repeat(205676),{mode:0o600})
  await assert.rejects(()=>readDestinationProtectedBytes(path),/destination_service_unavailable/)
  assert.equal((await readDestinationRegistryBytes(path)).length,205676)
  await chmod(path,0o644);await assert.rejects(()=>readDestinationRegistryBytes(path),/destination_service_unavailable/);await chmod(path,0o600)
  await symlink(path,join(directory,'alias.json'));await assert.rejects(()=>readDestinationRegistryBytes(join(directory,'alias.json')),/destination_service_unavailable/)
  await link(path,join(directory,'hard.json'));await assert.rejects(()=>readDestinationRegistryBytes(path),/destination_service_unavailable/);await rm(join(directory,'hard.json'))
  await writeFile(path,' '.repeat(2*1024*1024+1));await assert.rejects(()=>readDestinationRegistryBytes(path),/destination_service_unavailable/)
 }finally{await rm(directory,{recursive:true,force:true})}
})
test('private destination configuration rejects wide permissions, links and authority expansion',async()=>{
 const directory=await realpath(await mkdtemp(join(tmpdir(),'outcome-destination-config-test-'))),path=join(directory,'config.json')
 try{
  const save=async value=>{await writeFile(path,JSON.stringify(value),{mode:0o600});await chmod(path,0o600)}
  await save(config());assert.deepEqual(await readDestinationServiceConfiguration(path),config())
  await chmod(path,0o644);await assert.rejects(()=>readDestinationServiceConfiguration(path),/^Error: destination_service_unavailable$/);await chmod(path,0o600)
  await symlink(path,join(directory,'alias.json'));await assert.rejects(()=>readDestinationProtectedBytes(join(directory,'alias.json')),/destination_service_unavailable/)
  await link(path,join(directory,'hard.json'));await assert.rejects(()=>readDestinationProtectedBytes(path),/destination_service_unavailable/);await rm(join(directory,'hard.json'))
  for(const change of [{environment:{...config().environment,VERCEL_ENV:'production'}},{environment:{...config().environment,OUTCOME_CHAT_DATABASE_URL:'extra'}},{scope:{...config().scope,accountRef:'unknown'}},{registryPath:'/private/tmp/other/bindings.json'},{execute:true}]){
   await save({...config(),...change});await assert.rejects(()=>readDestinationServiceConfiguration(path),/^Error: destination_service_unavailable$/)
  }
  await save(config());await chmod(directory,0o755);await assert.rejects(()=>readDestinationServiceConfiguration(path),/destination_service_unavailable/);await chmod(directory,0o700)
  const output=[]
  assert.equal(await runConfiguredDestinationQuestions({configPath:path,mode:'--check',signal:new AbortController().signal,write:line=>output.push(line)}),70) // Wrong exact pin, no DB/queue call.
  assert.deepEqual(output,['OUTCOME_DESTINATION_QUESTIONS_CONFIG_SAFE_HOLD\n'])
 }finally{await chmod(directory,0o700);await rm(directory,{recursive:true,force:true})}
})
