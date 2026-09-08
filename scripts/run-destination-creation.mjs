import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {lstat,realpath} from 'node:fs/promises'
import {isAbsolute,join,resolve} from 'node:path'
import {homedir} from 'node:os'
import {fileURLToPath,pathToFileURL} from 'node:url'
import {readDestinationProtectedBytes,readDestinationRegistryBytes} from './run-destination-questions.mjs'
import {readDestinationHostedConfiguration} from '../server/outcome-destination-hosted-runtime.mjs'
import {createDestinationRuntime,createDestinationTransactionPort} from '../server/outcome-destination-runtime.mjs'
import {createDestinationCreationStore} from '../server/outcome-destination-creation-store.mjs'
import {createDestinationCreationWorker} from '../server/outcome-destination-creation-worker.mjs'
import {createConfirmedPackagePublisher} from '../server/outcome-creation-catalog.mjs'
import {loadProjectRegistry} from '../server/outcome-package.mjs'
import {createCodexQueueAdapter} from '../server/outcome-chat-codex-queue.mjs'
import {createPlannerOwnerProbe} from '../server/outcome-chat-owner-probe.mjs'

const fail=()=>{throw Error('destination_creation_unavailable')}
const hash=value=>createHash('sha256').update(value).digest('hex')
const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join(',')===[...keys].sort().join(',')
const digest=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value)
const uuid=value=>typeof value==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(value)
const emit=(write,state)=>{try{write(JSON.stringify({state,completionAuthority:false,executionAuthority:false})+'\n');return true}catch{return false}}
const matchesConfirmation=(value,scope,reviewDigest,evidenceDigest)=>value&&value.requestId===scope.requestId&&value.draftId===scope.draftId&&value.reviewDigest===reviewDigest&&value.evidenceDigest===evidenceDigest&&value.completionAuthority===false&&value.executionAuthority===false

// Separate authority carrier: a questions-only config cannot activate creation.
export async function readDestinationCreationConfiguration(path){
 try{
  const bytes=await readDestinationProtectedBytes(path),value=JSON.parse(bytes.toString('utf8'))
  if(!exact(value,['schemaVersion','purpose','candidatePin','environment','scope','reviewDigest','evidenceDigest','ownerCwd','bindingRegistryPath','projectRegistryPath','projectRegistrySha256','catalog','codexExecutable'])||value.schemaVersion!==1||value.purpose!=='destination_creation_once'||typeof value.candidatePin!=='string'||!/^[a-f0-9]{40}$/.test(value.candidatePin))fail()
  if(!['reviewDigest','evidenceDigest','projectRegistrySha256'].every(key=>digest(value[key])))fail()
  if(!exact(value.environment,['VERCEL_ENV','VERCEL_TARGET_ENV','VERCEL_URL','OUTCOME_DESTINATION_DURABLE_ENABLED','OUTCOME_DESTINATION_DATABASE_URL','OUTCOME_DESTINATION_DATABASE_CA_PEM','OUTCOME_DESTINATION_CSRF_SECRET','OUTCOME_SUPABASE_URL'])||!readDestinationHostedConfiguration(value.environment).enabled)fail()
  if(!exact(value.scope,['workspaceId','accountRef','draftId','requestId'])||typeof value.scope.workspaceId!=='string'||!/^[-a-z0-9]{1,128}$/.test(value.scope.workspaceId)||!digest(value.scope.accountRef)||!uuid(value.scope.draftId)||!uuid(value.scope.requestId))fail()
  if(!['ownerCwd','bindingRegistryPath','projectRegistryPath','catalog'].every(key=>typeof value[key]==='string'&&isAbsolute(value[key])&&!/[\u0000-\u001f\u007f]/.test(value[key]))||value.bindingRegistryPath!==join(value.ownerCwd,'.outcome-runtime','bindings.json'))fail()
  if(typeof value.codexExecutable!=='string'||!(value.codexExecutable==='codex'||isAbsolute(value.codexExecutable))||/[\u0000-\u001f\u007f]/.test(value.codexExecutable))fail()
  Object.freeze(value.scope);Object.freeze(value.environment)
  return {config:Object.freeze(value),configurationDigest:hash(bytes)}
 }catch{fail()}
}

// Trusted host ports only; never installed on an HTTP route. No timers or scan.
export async function runDestinationCreationOnce({mode,scope,reviewDigest,evidenceDigest,confirmationRepository,store,publisher,ready,signal,write=line=>process.stdout.write(line)}={}){
 let mutationAttempted=false
 const guard=async()=>{if(signal?.aborted||await ready()!==true||signal?.aborted)fail()}
 try{
  if(!['--check','--run-once'].includes(mode)||!signal)fail()
  await guard()
  const pinnedConfirmation={readConfirmedCreation:async input=>{
   const value=await confirmationRepository.readConfirmedCreation(input)
   if(!matchesConfirmation(value,scope,reviewDigest,evidenceDigest))fail()
   return value
  }}
  await pinnedConfirmation.readConfirmedCreation(scope)
  // Reads the migrated result chain; neither a read nor this check grants writes.
  await store.load(scope)
  await guard()
  if(mode==='--check')return emit(write,'CHECKED_NO_MUTATION')?0:70
  const guarded=fn=>async input=>{await guard();mutationAttempted=true;return fn(input)}
  const worker=createDestinationCreationWorker({confirmationRepository:pinnedConfirmation,store:{...store,claim:guarded(store.claim),record:guarded(store.record)},publisher:{...publisher,publish:guarded(publisher.publish)}})
  const result=await worker.runOnce(scope)
  // Do not serialize a dependency's arbitrary object, private error or locator.
  const known=['PACKAGE_RECORDED','ALREADY_RECORDED','CONFIRMATION_UNVERIFIED','RESULT_CONFLICT','CLAIM_NOT_ACQUIRED','PUBLICATION_UNVERIFIED','CREATION_UNKNOWN','CLAIM_OR_CONFIRMATION_UNVERIFIED']
  if(!known.includes(result.state))fail()
  const emitted=emit(write,result.state)
  return emitted&&['PACKAGE_RECORDED','ALREADY_RECORDED'].includes(result.state)?0:70
 }catch{emit(write,mutationAttempted?'CREATION_UNKNOWN':'PREFLIGHT_SAFE_HOLD');return 70}
}

export async function runConfiguredDestinationCreation({configPath,mode,signal,write=line=>process.stdout.write(line)}={}){
 let pool
 try{
  if(!['--check','--run-once'].includes(mode)||!signal)fail()
  const {config,configurationDigest}=await readDestinationCreationConfiguration(configPath)
  const checkout=await realpath(fileURLToPath(new URL('..',import.meta.url)))
  const git=args=>execFileSync('git',args,{cwd:checkout,encoding:'utf8',stdio:['ignore','pipe','ignore'],timeout:5000,maxBuffer:100000}).trim()
  let bindingRegistryDigest
  const localReady=async()=>{
   if(hash(await readDestinationProtectedBytes(configPath))!==configurationDigest||git(['rev-parse','HEAD'])!==config.candidatePin||git(['status','--porcelain','--untracked-files=all']))return false
   if(await realpath(config.ownerCwd)!==config.ownerCwd||await realpath(config.catalog)!==config.catalog)return false
   const stat=await lstat(config.catalog)
   if(!stat.isDirectory()||stat.isSymbolicLink()||stat.uid!==process.getuid()||(stat.mode&0o777)!==0o700)return false
   const bytes=await readDestinationRegistryBytes(config.projectRegistryPath)
   if(hash(bytes)!==config.projectRegistrySha256)return false
   const registry=JSON.parse(bytes.toString('utf8'))
   if(typeof registry.creation_catalog!=='string'||resolve(config.ownerCwd,registry.creation_catalog)!==config.catalog)return false
   // Validate the same registry loader the local product consumes; no registry writes.
   loadProjectRegistry({environment:{OUTCOME_PROJECT_REGISTRY:config.projectRegistryPath},repositoryRoot:config.ownerCwd})
   const bindingDigest=hash(await readDestinationRegistryBytes(config.bindingRegistryPath))
   if(bindingRegistryDigest===undefined)bindingRegistryDigest=bindingDigest
   if(bindingDigest!==bindingRegistryDigest)return false
   return true
  }
  if(!await localReady())fail()
  const adapter=createCodexQueueAdapter({enabled:true,registryPath:config.bindingRegistryPath,codexExecutable:config.codexExecutable,expectedCwd:config.ownerCwd,ownerProbe:createPlannerOwnerProbe({socketPath:join(homedir(),'.codex','ipc','ipc.sock')})})
  let bindingVersion
  const ready=async()=>{
   if(!await localReady())return false
   const binding=await adapter.bindingResolver({project_id:'outcome',role:'planner'})
   if(binding?.status!=='active'||binding.freshness!=='fresh'||binding.project_id!=='outcome'||binding.role!=='planner')return false
   if(bindingVersion===undefined)bindingVersion=binding.binding_version
   return binding.binding_version===bindingVersion&&await localReady()
  }
  if(signal.aborted||!await ready())fail()
  const {Pool}=await import('pg'),environment=config.environment,url=new URL(environment.OUTCOME_DESTINATION_DATABASE_URL);url.search=''
  pool=new Pool({connectionString:url.toString(),ssl:{ca:environment.OUTCOME_DESTINATION_DATABASE_CA_PEM,rejectUnauthorized:true},max:1,allowExitOnIdle:true,connectionTimeoutMillis:5000,statement_timeout:10000,query_timeout:15000})
  pool.on('error',()=>{})
  const runtime=createDestinationRuntime({pool,allowedOrigin:readDestinationHostedConfiguration(environment).allowedOrigin,csrfSecret:environment.OUTCOME_DESTINATION_CSRF_SECRET})
  const store=createDestinationCreationStore({transact:createDestinationTransactionPort({pool})})
  // Publisher rereads confirmation after claim: retain the same configured pins.
  const confirmationRepository={readConfirmedCreation:async input=>{
   const value=await runtime.confirmationRepository.readConfirmedCreation(input)
   if(!matchesConfirmation(value,config.scope,config.reviewDigest,config.evidenceDigest))fail()
   return value
  }}
  const publisher=createConfirmedPackagePublisher({catalog:config.catalog,confirmationRepository,checkpoint:async stage=>{
   if(['before_files_write','before_publish'].includes(stage)&&(signal.aborted||!await ready()||signal.aborted))fail()
  }})
  return await runDestinationCreationOnce({mode,scope:config.scope,reviewDigest:config.reviewDigest,evidenceDigest:config.evidenceDigest,confirmationRepository,store,publisher,ready,signal,write})
 }catch{emit(write,'CONFIG_SAFE_HOLD');return 70}
 finally{if(pool)try{await pool.end()}catch{}}
}

if(typeof process.argv[1]==='string'&&pathToFileURL(process.argv[1]).href===import.meta.url){
 const controller=new AbortController(),stop=()=>controller.abort()
 process.once('SIGINT',stop);process.once('SIGTERM',stop)
 try{process.exitCode=await runConfiguredDestinationCreation({configPath:process.argv.length===4?process.argv[3]:null,mode:process.argv[2],signal:controller.signal})}
 finally{process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop)}
}
