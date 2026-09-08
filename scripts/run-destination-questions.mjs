import {constants} from 'node:fs'
import {open,lstat,realpath} from 'node:fs/promises'
import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {dirname,isAbsolute,join} from 'node:path'
import {homedir} from 'node:os'
import {fileURLToPath,pathToFileURL} from 'node:url'
import {types} from 'node:util'
import {readDestinationHostedConfiguration} from '../server/outcome-destination-hosted-runtime.mjs'
import {createDestinationRuntime,createDestinationTransactionPort} from '../server/outcome-destination-runtime.mjs'
import {createDestinationInputStore} from '../server/outcome-destination-input-store.mjs'
import {createCodexQueueAdapter} from '../server/outcome-chat-codex-queue.mjs'
import {createPlannerOwnerProbe} from '../server/outcome-chat-owner-probe.mjs'
import {createDestinationQuestionCoordinator} from '../server/outcome-destination-question-coordinator.mjs'
import {runDestinationQuestionService} from '../server/outcome-destination-question-service.mjs'

const fail=()=>{throw Error('destination_service_unavailable')}
const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&!types.isProxy(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key))
const privateDirectory=async directory=>{
 if(typeof directory!=='string'||!isAbsolute(directory))fail()
 const stat=await lstat(directory)
 if(!stat.isDirectory()||stat.isSymbolicLink()||(stat.mode&0o777)!==0o700||stat.uid!==process.getuid()||await realpath(directory)!==directory)fail()
}
export async function readDestinationProtectedBytes(path){
 try{
  if(typeof path!=='string'||!isAbsolute(path)||await realpath(path)!==path)fail()
  await privateDirectory(dirname(path))
  const file=await open(path,constants.O_RDONLY|constants.O_NOFOLLOW)
  try{const stat=await file.stat();if(!stat.isFile()||(stat.mode&0o777)!==0o600||stat.uid!==process.getuid()||stat.nlink!==1||stat.size>65536)fail();return await file.readFile()}finally{await file.close()}
 }catch{fail()}
}
export async function readDestinationServiceConfiguration(path){
 try{
  const value=JSON.parse((await readDestinationProtectedBytes(path)).toString('utf8'))
  if(!exact(value,['schemaVersion','candidatePin','environment','scope','registryPath','ownerCwd','inputDirectory','inputScopeSha256','readerEntrySha256','codexExecutable'])||value.schemaVersion!==1||!/^[a-f0-9]{40}$/.test(value.candidatePin)||!/^[a-f0-9]{64}$/.test(value.inputScopeSha256)||!/^[a-f0-9]{64}$/.test(value.readerEntrySha256))fail()
  if(!exact(value.environment,['VERCEL_ENV','VERCEL_TARGET_ENV','VERCEL_URL','OUTCOME_DESTINATION_DURABLE_ENABLED','OUTCOME_DESTINATION_DATABASE_URL','OUTCOME_DESTINATION_DATABASE_CA_PEM','OUTCOME_DESTINATION_CSRF_SECRET','OUTCOME_SUPABASE_URL'])||!readDestinationHostedConfiguration(value.environment).enabled)fail()
  if(!exact(value.scope,['workspaceId','accountRef','draftId'])||!/^[-a-z0-9]{1,128}$/.test(value.scope.workspaceId)||!/^[a-f0-9]{64}$/.test(value.scope.accountRef)||value.scope.draftId!=='00000000-0000-4000-8000-000000000001')fail()
  if(!['registryPath','ownerCwd','inputDirectory'].every(key=>typeof value[key]==='string'&&isAbsolute(value[key]))||value.registryPath!==join(value.ownerCwd,'.outcome-runtime','bindings.json'))fail()
  if(typeof value.codexExecutable!=='string'||!(value.codexExecutable==='codex'||isAbsolute(value.codexExecutable))||/[\u0000-\u001f\u007f]/.test(value.codexExecutable))fail()
  return value
 }catch{fail()}
}

export async function runConfiguredDestinationQuestions({configPath,mode,signal,write=line=>process.stdout.write(line)}={}){
 let pool
 try{
  if(!['--check','--run'].includes(mode)||!signal)fail()
  const config=await readDestinationServiceConfiguration(configPath)
  const checkout=await realpath(fileURLToPath(new URL('..',import.meta.url)))
  const git=args=>execFileSync('git',args,{cwd:checkout,encoding:'utf8',stdio:['ignore','pipe','ignore'],timeout:5000,maxBuffer:100000}).trim()
  if(git(['rev-parse','HEAD'])!==config.candidatePin||git(['status','--porcelain','--untracked-files=all']))fail()
  if(await realpath(config.ownerCwd)!==config.ownerCwd)fail()
  await readDestinationProtectedBytes(config.registryPath)
  const readerPath=join(config.ownerCwd,'.outcome-runtime','read-destination-input.mjs')
  const readerReady=async()=>{
   await privateDirectory(config.inputDirectory)
   return createHash('sha256').update(await readDestinationProtectedBytes(readerPath)).digest('hex')===config.readerEntrySha256
  }
  if(!await readerReady())fail()
  const queueAdapter=createCodexQueueAdapter({enabled:true,registryPath:config.registryPath,codexExecutable:config.codexExecutable,expectedCwd:config.ownerCwd,ownerProbe:createPlannerOwnerProbe({socketPath:join(homedir(),'.codex','ipc','ipc.sock')})})
  const ready=async()=>{
   if(!await readerReady())return false
   const binding=await queueAdapter.bindingResolver({project_id:'outcome',role:'planner'})
   return binding?.status==='active'&&binding.freshness==='fresh'&&binding.project_id==='outcome'&&binding.role==='planner'
  }
  if(!await ready())fail()
  const {Pool}=await import('pg'),environment=config.environment
  const url=new URL(environment.OUTCOME_DESTINATION_DATABASE_URL);url.search=''
  pool=new Pool({connectionString:url.toString(),ssl:{ca:environment.OUTCOME_DESTINATION_DATABASE_CA_PEM,rejectUnauthorized:true},max:1,allowExitOnIdle:true,connectionTimeoutMillis:5000,statement_timeout:10000,query_timeout:15000})
  pool.on('error',()=>{})
  const allowedOrigin=readDestinationHostedConfiguration(environment).allowedOrigin
  const runtime=createDestinationRuntime({pool,allowedOrigin,csrfSecret:environment.OUTCOME_DESTINATION_CSRF_SECRET})
  // Dedicated login/SET LOCAL ROLE are checked by the existing transaction port.
  await createDestinationTransactionPort({pool})(async({query})=>{await query('select 1')})
  if(mode==='--check'){write('OUTCOME_DESTINATION_QUESTIONS_READY_NO_DISPATCH\n');return 0}
  const store=createDestinationInputStore({directory:config.inputDirectory,scopeKey:config.inputScopeSha256})
  const coordinator=createDestinationQuestionCoordinator({scope:config.scope,discovery:runtime.discoveryRepository,requests:runtime.questionRequests,questions:runtime.questionRepository,queueAdapter,publishInput:store.publish,ready})
  return await runDestinationQuestionService({enabled:true,coordinator,signal,write})
 }catch{try{write('OUTCOME_DESTINATION_QUESTIONS_CONFIG_SAFE_HOLD\n')}catch{};return 70}
 finally{if(pool)try{await pool.end()}catch{}}
}

if(typeof process.argv[1]==='string'&&pathToFileURL(process.argv[1]).href===import.meta.url){
 const controller=new AbortController(),stop=()=>controller.abort()
 process.once('SIGINT',stop);process.once('SIGTERM',stop)
 try{process.exitCode=await runConfiguredDestinationQuestions({configPath:process.argv.length===4?process.argv[3]:null,mode:process.argv[2],signal:controller.signal})}
 finally{process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop)}
}
