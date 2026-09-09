import {lstat,realpath} from 'node:fs/promises'
import {dirname,isAbsolute,join} from 'node:path'
import {homedir} from 'node:os'
import {fileURLToPath,pathToFileURL} from 'node:url'
import {execFileSync} from 'node:child_process'
import {DatabaseSync} from 'node:sqlite'
import {createHash} from 'node:crypto'
import {verifyWorkExecutionGrant} from '../server/outcome-work-execution-grant.mjs'
import {workQueueEnvelope} from '../server/outcome-work-queue.mjs'
import {verifyWorkOutputCandidate} from '../server/outcome-work-output-candidate.mjs'
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
export function readWorkSessionInput(stream,{timeoutMs=5000,maxBytes=16384}={}){
  return new Promise((resolve,reject)=>{
    let timer,done=false;const chunks=[];let size=0
    const finish=(error,value)=>{
      if(done)return;done=true;clearTimeout(timer)
      stream?.removeListener?.('data',data);stream?.removeListener?.('end',end);stream?.removeListener?.('error',errorHandler);stream?.removeListener?.('close',close)
      stream?.pause?.();chunks.length=0
      if(error)reject(Error('session_input_unavailable'));else resolve(value)
    }
    const data=chunk=>{
      try{
        if(!Buffer.isBuffer(chunk)&&typeof chunk!=='string')return finish(true)
        const bytes=Buffer.from(chunk);size+=bytes.length;if(size>maxBytes)finish(true);else chunks.push(bytes)
      }catch{finish(true)}
    }
    const end=()=>{
      const bytes=Buffer.concat(chunks),decoded=bytes.toString('utf8')
      if(!Buffer.from(decoded,'utf8').equals(bytes))return finish(true)
      const text=decoded.replace(/\r?\n$/,'')
      if(!text||/\s|[\u0000-\u001f\u007f]/.test(text)||Buffer.byteLength(text)>maxBytes)return finish(true)
      finish(false,text)
    }
    const errorHandler=()=>finish(true),close=()=>{if(!done)finish(true)}
    if(typeof stream?.on!=='function'||!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>5000||!Number.isSafeInteger(maxBytes)||maxBytes<1||maxBytes>16384){finish(true);return}
    timer=setTimeout(()=>finish(true),timeoutMs)
    stream.on('data',data);stream.once('end',end);stream.once('error',errorHandler);stream.once('close',close)
  })
}
const privateDirectory=async path=>{
  if(typeof path!=='string'||!isAbsolute(path)||await realpath(path)!==path)fail()
  const s=await lstat(path)
  if(!s.isDirectory()||s.isSymbolicLink()||s.uid!==process.getuid()||(s.mode&0o777)!==0o700)fail()
}

// Explicit one-shot composition, never a daemon or implicit grant issuer. Production uses
// the defaults; injected ports exist only for isolated integration reproduction.
export async function runOutcomeWorkOnce({argv=process.argv.slice(2),write=text=>process.stdout.write(text),
  identityFactory=createHostedIdentityRuntime,queueFactory=createCodexQueueAdapter,now=Date.now,sessionTokenReader}={}){
  let db
  try{
    if(!Array.isArray(argv)||!['--dispatch','--receive','--approve','--observe','--finalize'].includes(argv[0])||argv.length!==(argv[0]==='--dispatch'?2:3)
      ||argv[0]!=='--dispatch'&&!hash(argv[2],64))fail()
    const read=async path=>(await readDestinationProtectedBytes(path)).toString('utf8')
    const config=JSON.parse(await read(argv[1]))
    const configKeys=config?.schemaVersion===4?[...keys.filter(key=>key!=='tokenPath'),'approvalPath','terminalPath']:config?.schemaVersion===3?[...keys,'approvalPath','terminalPath']:config?.schemaVersion===2?[...keys,'approvalPath']:keys
    if(!config||Array.isArray(config)||Object.keys(config).length!==configKeys.length||!configKeys.every(key=>Object.hasOwn(config,key))
      ||![1,2,3,4].includes(config.schemaVersion)||!hash(config.candidatePin,40)||argv[0]==='--approve'&&config.schemaVersion<2||argv[0]==='--finalize'&&config.schemaVersion<3)fail()
    if(config.schemaVersion===4&&typeof sessionTokenReader!=='function')fail()
    const readToken=()=>config.schemaVersion===4?sessionTokenReader():read(config.tokenPath)
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
    const required=['outcome_execution_grants','outcome_work_journals','outcome_work_reservations','outcome_work_dispatches','outcome_work_execution_claims','outcome_work_activity','outcome_work_starts','outcome_work_commands']
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
      if(!hash(request.candidateCommit,40)||!hash(request.candidateTree,40))fail()
      const candidateTree=execFileSync('git',['rev-parse',`${request.candidateCommit}^{tree}`],{cwd:checkout,encoding:'utf8',timeout:5000,stdio:['ignore','pipe','ignore']}).trim()
      if(candidateTree!==request.candidateTree)fail()
      const binding=await queueAdapter.bindingResolver({project_id:scope.projectId,role:'planner'})
      if(queueAdapter.matchesWorkScope(binding?.destination,request.scopeJson)!==true)fail()
      return latest
    }
    const runtime=createLocalWorkRuntime({enabled:true,accountService:identity.service,readToken,grantStore,journal,
      receiptDirectory:config.receiptDirectory,queueAdapter,now,readCurrentPolicy})
    if(argv[0]==='--finalize'){
      let timer
      const inspect=async()=>{
        const {request}=JSON.parse(await readCurrentPolicy()),scope=JSON.parse(request.scopeJson)
        const owner=await identity.service.resolveBridgeAuthority({token:await readToken()})
        if(!owner?.project_ids?.includes(scope.projectId))fail()
        const reserved=journal.readObservationRequest(request.scopeJson,argv[2],owner.account_ref,now())
        if(['candidateCommit','candidateTree','authorityRef','action'].some(key=>request[key]!==reserved[key]))fail()
        const expectedJson=await read(config.terminalPath),expected=JSON.parse(expectedJson)
        if(!hash(expected.candidateCommit,40)||!hash(expected.candidateTree,40))fail()
        const saved=JSON.parse(grantStore.read(request.authorityRef,owner.account_ref)),grant=JSON.parse(saved.grantJson)
        if(saved.status!=='active'||expected.candidateCommit!==request.candidateCommit&&grant.schemaVersion!==2)fail()
        if(!verifyWorkOutputCandidate({checkout,sourceCommit:request.candidateCommit,sourceTree:request.candidateTree,
          outputCommit:expected.candidateCommit,outputTree:expected.candidateTree,stage:request.action,writePaths:grant.execution?.writePaths??[]}))fail()
        await readCurrentPolicy()
        if(await read(config.terminalPath)!==expectedJson)fail()
        const fresh=await identity.service.resolveBridgeAuthority({token:await readToken()})
        if(fresh?.account_ref!==owner.account_ref||!fresh.project_ids?.includes(scope.projectId))fail()
        return {request,ownerRef:owner.account_ref,expectedJson}
      }
      let found
      try{found=await Promise.race([inspect(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('finalize_timeout')),5000)})])}finally{clearTimeout(timer)}
      const result=journal.recordVerifiedTerminal(found.request.scopeJson,argv[2],found.ownerRef,config.receiptDirectory,found.expectedJson,now())
      write(JSON.stringify(result)+'\n');return 0
    }
    if(argv[0]==='--observe'){
      let timer
      const inspect=async()=>{
        const {request}=JSON.parse(await readCurrentPolicy()),scope=JSON.parse(request.scopeJson)
        const owner=await identity.service.resolveBridgeAuthority({token:await readToken()})
        if(!owner?.project_ids?.includes(scope.projectId))fail()
        const reserved=journal.readObservationRequest(request.scopeJson,argv[2],owner.account_ref,now())
        if(['candidateCommit','candidateTree','authorityRef','action'].some(key=>request[key]!==reserved[key]))fail()
        const binding=await queueAdapter.bindingResolver({project_id:scope.projectId,role:'planner'})
        if(!queueAdapter.matchesWorkScope(binding?.destination,request.scopeJson))fail()
        const observation=await queueAdapter.readPlannerActivity({destination:binding.destination,...workQueueEnvelope(reserved)})
        await readCurrentPolicy()
        const fresh=await identity.service.resolveBridgeAuthority({token:await readToken()})
        if(fresh?.account_ref!==owner.account_ref||!fresh.project_ids?.includes(scope.projectId))fail()
        return {request,ownerRef:owner.account_ref,observation}
      }
      let found
      try{found=await Promise.race([inspect(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('observation_timeout')),5000)})])}finally{clearTimeout(timer)}
      if(found.observation?.outcome!=='observed'){
        write('{"outcome":"observation_unavailable","executionAuthority":false,"completionAuthority":false}\n');return 70
      }
      let result=journal.recordActivity(found.request.scopeJson,argv[2],found.ownerRef,JSON.stringify(found.observation),now())
      if(found.observation.activity==='running')result=journal.recordObservedStart(found.request.scopeJson,argv[2],found.ownerRef,now())
      write(JSON.stringify(result)+'\n');return 0
    }
    if(argv[0]==='--approve'){
      // The explicit argument is the digest of the exact plan the owner approves.
      // Login, generic decision cards and dispatch requests never enter this branch.
      let timer
      const inspect=async()=>{
        const grantJson=await read(config.approvalPath)
        if(createHash('sha256').update(grantJson).digest('hex')!==argv[2]||JSON.parse(grantJson).schemaVersion!==2)fail()
        const {request}=JSON.parse(await readCurrentPolicy()),scope=JSON.parse(request.scopeJson)
        if(request.authorityRef!==argv[2])fail()
        const owner=await identity.service.resolveBridgeAuthority({token:await readToken()})
        if(!owner?.project_ids?.includes(scope.projectId)||!hash(owner.account_ref,64))fail()
        const expected=JSON.stringify({...scope,ownerRef:owner.account_ref,candidateCommit:request.candidateCommit,candidateTree:request.candidateTree,authorityRef:argv[2],action:request.action,status:'active'})
        if(!verifyWorkExecutionGrant(grantJson,expected,now()).matches)fail()
        await readCurrentPolicy()
        if(await read(config.approvalPath)!==grantJson)fail()
        const fresh=await identity.service.resolveBridgeAuthority({token:await readToken()})
        if(fresh?.account_ref!==owner.account_ref||!fresh.project_ids?.includes(scope.projectId))fail()
        return {grantJson,ownerRef:owner.account_ref,expected}
      }
      let approved
      try{approved=await Promise.race([inspect(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('approval_timeout')),5000)})])}finally{clearTimeout(timer)}
      if(!verifyWorkExecutionGrant(approved.grantJson,approved.expected,now()).matches)fail()
      const saved=grantStore.record(approved.grantJson,approved.ownerRef,now())
      const confirmed=JSON.parse(grantStore.read(argv[2],approved.ownerRef))
      if(saved.status!=='active'||confirmed.status!=='active'||confirmed.grantJson!==approved.grantJson)fail()
      write('{"outcome":"approval_recorded","executionAuthority":false,"completionAuthority":false}\n')
      return 0
    }
    const result=argv[0]==='--dispatch'?await runtime.runOnce():await runtime.receiveOnce(argv[2])
    const permitted=['acknowledged','claimed','already_claimed','delivery_unknown','reconciliation_required','needs_owner']
    const outcome=permitted.includes(result.outcome)?result.outcome:'configuration_hold'
    write(JSON.stringify({outcome,executionAuthority:false,completionAuthority:false})+'\n')
    return ['acknowledged','claimed','already_claimed','needs_owner'].includes(outcome)?0:70
  }catch{try{write('{"outcome":"configuration_hold","executionAuthority":false,"completionAuthority":false}\n')}catch{};return 70}
  finally{if(db)try{db.close()}catch{}}
}
if(typeof process.argv[1]==='string'&&pathToFileURL(process.argv[1]).href===import.meta.url){
  const argv=process.argv.slice(2),useInput=argv[0]==='--session-stdin'
  let token
  process.exitCode=await runOutcomeWorkOnce({argv:useInput?argv.slice(1):argv,
    sessionTokenReader:useInput?()=>token??=readWorkSessionInput(process.stdin):undefined})
  token=undefined
}
