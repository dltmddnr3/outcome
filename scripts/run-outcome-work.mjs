import {lstat,realpath} from 'node:fs/promises'
import {dirname,isAbsolute,join} from 'node:path'
import {homedir} from 'node:os'
import {fileURLToPath,pathToFileURL} from 'node:url'
import {execFileSync} from 'node:child_process'
import {DatabaseSync} from 'node:sqlite'
import {readDestinationProtectedBytes} from './run-destination-questions.mjs'
import {createHostedIdentityRuntime} from '../server/account-access-hosted.mjs'
import {createWorkJournal} from '../server/outcome-work-journal.mjs'
import {createWorkGrantStore} from '../server/outcome-work-grant-store.mjs'
import {createLocalWorkRuntime} from '../server/outcome-work-local-runtime.mjs'
import {createCodexQueueAdapter} from '../server/outcome-chat-codex-queue.mjs'
import {createPlannerOwnerProbe} from '../server/outcome-chat-owner-probe.mjs'

const fail=()=>{throw Error('work_configuration_unavailable')}
const hash=(value,n)=>typeof value==='string'&&new RegExp(`^[a-f0-9]{${n}}$`).test(value)
const keys=['schemaVersion','candidatePin','databasePath','receiptDirectory','policyPath','tokenPath','identityPath','snapshotPath','registryPath','ownerCwd','codexExecutable']
const privateDirectory=async path=>{
  if(typeof path!=='string'||!isAbsolute(path)||await realpath(path)!==path)fail()
  const s=await lstat(path)
  if(!s.isDirectory()||s.isSymbolicLink()||s.uid!==process.getuid()||(s.mode&0o777)!==0o700)fail()
}

// Explicit one-shot composition, never a daemon or grant issuer. Production uses
// the defaults; injected ports exist only for isolated integration reproduction.
export async function runOutcomeWorkOnce({argv=process.argv.slice(2),write=text=>process.stdout.write(text),
  identityFactory=createHostedIdentityRuntime,queueFactory=createCodexQueueAdapter,now=Date.now}={}){
  let db
  try{
    if(!Array.isArray(argv)||!['--dispatch','--receive'].includes(argv[0])||argv.length!==(argv[0]==='--dispatch'?2:3)
      ||argv[0]==='--receive'&&!hash(argv[2],64))fail()
    const read=async path=>(await readDestinationProtectedBytes(path)).toString('utf8')
    const config=JSON.parse(await read(argv[1]))
    if(!config||Array.isArray(config)||Object.keys(config).length!==keys.length||!keys.every(key=>Object.hasOwn(config,key))
      ||config.schemaVersion!==1||!hash(config.candidatePin,40))fail()
    const checkout=await realpath(fileURLToPath(new URL('..',import.meta.url)))
    const head=execFileSync('git',['rev-parse','HEAD'],{cwd:checkout,encoding:'utf8',timeout:5000,stdio:['ignore','pipe','ignore']}).trim()
    if(head!==config.candidatePin)fail()
    execFileSync('git',['diff','--exit-code','HEAD','--','scripts','server','package.json','package-lock.json'],{cwd:checkout,timeout:5000,stdio:'ignore'})
    if(typeof config.ownerCwd!=='string'||!isAbsolute(config.ownerCwd)||await realpath(config.ownerCwd)!==config.ownerCwd
      ||config.registryPath!==join(config.ownerCwd,'.outcome-runtime','bindings.json')
      ||typeof config.codexExecutable!=='string'||!isAbsolute(config.codexExecutable)||/[\u0000-\u001f\u007f]/.test(config.codexExecutable))fail()
    await privateDirectory(config.receiptDirectory)
    if(typeof config.databasePath!=='string'||!isAbsolute(config.databasePath)||await realpath(config.databasePath)!==config.databasePath)fail()
    await privateDirectory(dirname(config.databasePath))
    const before=await lstat(config.databasePath)
    if(!before.isFile()||before.isSymbolicLink()||before.uid!==process.getuid()||(before.mode&0o777)!==0o600||before.nlink!==1)fail()
    const environment=JSON.parse(await read(config.identityPath)),sealedSnapshot=JSON.parse(await read(config.snapshotPath))
    const identity=identityFactory({environment,sealedSnapshot,now})
    if(typeof identity?.service?.resolveBridgeAuthority!=='function')fail()
    const policy=await read(config.policyPath)
    JSON.parse(policy) // Reject malformed input before opening the database.
    // readOnly preflight must prove schema exists; do not bootstrap an empty DB.
    db=new DatabaseSync(config.databasePath,{readOnly:true})
    const required=['outcome_execution_grants','outcome_work_journals','outcome_work_reservations','outcome_work_dispatches','outcome_work_execution_claims']
    const tables=new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(row=>row.name))
    if(!required.every(name=>tables.has(name)))fail()
    db.close();db=null
    const after=await lstat(config.databasePath)
    if(after.ino!==before.ino||after.dev!==before.dev)fail()
    db=new DatabaseSync(config.databasePath)
    db.exec('PRAGMA busy_timeout=1000')
    const journal=createWorkJournal(db),grantStore=createWorkGrantStore(db)
    const queueAdapter=queueFactory({enabled:true,registryPath:config.registryPath,codexExecutable:config.codexExecutable,expectedCwd:config.ownerCwd,
      ownerProbe:createPlannerOwnerProbe({socketPath:join(homedir(),'.codex','ipc','ipc.sock')})})
    const readCurrentPolicy=async()=>{
      const latest=await read(config.policyPath);if(latest!==policy)fail()
      const {request}=JSON.parse(latest),scope=JSON.parse(request.scopeJson)
      const binding=await queueAdapter.bindingResolver({project_id:scope.projectId,role:'planner'})
      if(queueAdapter.matchesWorkScope(binding?.destination,request.scopeJson)!==true)fail()
      return latest
    }
    const runtime=createLocalWorkRuntime({enabled:true,accountService:identity.service,readToken:()=>read(config.tokenPath),grantStore,journal,
      receiptDirectory:config.receiptDirectory,queueAdapter,now,readCurrentPolicy})
    const result=argv[0]==='--dispatch'?await runtime.runOnce():await runtime.receiveOnce(argv[2])
    const permitted=['acknowledged','claimed','already_claimed','delivery_unknown','reconciliation_required']
    const outcome=permitted.includes(result.outcome)?result.outcome:'configuration_hold'
    write(JSON.stringify({outcome,executionAuthority:false,completionAuthority:false})+'\n')
    return ['acknowledged','claimed','already_claimed'].includes(outcome)?0:70
  }catch{try{write('{"outcome":"configuration_hold","executionAuthority":false,"completionAuthority":false}\n')}catch{};return 70}
  finally{if(db)try{db.close()}catch{}}
}
if(typeof process.argv[1]==='string'&&pathToFileURL(process.argv[1]).href===import.meta.url)process.exitCode=await runOutcomeWorkOnce()
