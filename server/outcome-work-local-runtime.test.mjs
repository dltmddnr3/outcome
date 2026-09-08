import test from 'node:test'
import assert from 'node:assert/strict'
import {DatabaseSync} from 'node:sqlite'
import {createHash} from 'node:crypto'
import {EventEmitter} from 'node:events'
import {createCodexQueueAdapter} from './outcome-chat-codex-queue.mjs'
import {createEmptyRegistry,mutateRegistry} from './outcome-session-registry-persistence.mjs'
import {mkdtempSync,realpathSync,writeFileSync,rmSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {createAccountAccessService,createInMemoryAccountStore} from './account-access.mjs'
import fixture from '../test/fixtures/account-access.json' with {type:'json'}
import {createWorkJournal} from './outcome-work-journal.mjs'
import {createWorkGrantStore} from './outcome-work-grant-store.mjs'
import {createLocalWorkRuntime} from './outcome-work-local-runtime.mjs'
const time=Date.parse('2026-09-03T01:00:00.000Z'),commit='a'.repeat(40),tree='b'.repeat(40)
const scope={projectId:'outcome',workId:'w',runId:'r',sessionRef:createHash('sha256').update('outcome-work-session-v1\0synthetic-private-destination').digest('hex'),bindingVersion:1}
test('unconfigured, oversized or stalled current policy never invokes transport',async()=>{
  let sends=0
  const dispatch=async()=>{sends++}
  assert.equal((await createLocalWorkRuntime({dispatch}).runOnce()).outcome,'disabled')
  assert.equal((await createLocalWorkRuntime({enabled:true,dispatch}).runOnce()).outcome,'configuration_hold')
  for(const readCurrentPolicy of [async()=>'x'.repeat(32769),async()=>new Promise(()=>{})]){
    assert.equal((await createLocalWorkRuntime({enabled:true,dispatch,readCurrentPolicy,timeoutMs:5}).runOnce()).outcome,'configuration_hold')
  }
  assert.equal(sends,0)
})
test('integrated local runtime checks account, durable grant, exact terminal receipt and dependencies',async()=>{
  for(const mode of ['valid','queue','revoked-session','revoked-grant','missing-dependency','wrong-receipt','changed-policy','disabled']){
    const directory=realpathSync(mkdtempSync(join(tmpdir(),'outcome-local-runtime-'))),db=new DatabaseSync(join(directory,'journal.sqlite'))
    const journal=createWorkJournal(db),grantStore=createWorkGrantStore(db);let sends=0,reads=0,revoked=false
    const accountService=createAccountAccessService({ownerSubject:'synthetic-owner',now:()=>time,store:createInMemoryAccountStore(fixture),authProvider:{verify:async()=>({subject:'synthetic-owner',issuedAt:time-1,expiresAt:time+1000,revoked})}})
    try{
      const {account_ref:ownerRef}=await accountService.resolveBridgeAuthority({token:'fixture-only'})
      const grant=JSON.stringify({schemaVersion:1,...scope,ownerRef,candidateCommit:commit,candidateTree:tree,allowedStages:['qa_verifying'],issuedAt:time-1,expiresAt:time+1000})
      const {authorityRef}=grantStore.record(grant,ownerRef,time)
      const receipt={schemaVersion:1,projectId:scope.projectId,workId:scope.workId,runId:scope.runId,candidateCommit:commit,candidateTree:tree,stage:'implementing',verificationMode:'same-session verification',checks:[{id:'regression',outcome:'pass',evidenceDigest:'c'.repeat(64)}]}
      const bytes=JSON.stringify(receipt),digest=createHash('sha256').update(bytes).digest('hex')
      writeFileSync(join(directory,`${digest}.json`),bytes,{mode:0o400})
      const {schemaVersion,checks,...fields}=receipt
      const priorReceipt={...fields,digest,requiredChecks:['regression']}
      const first={sequence:1,observedAt:new Date(time).toISOString(),stage:'queued',attempt:1,activity:'waiting',candidateCommit:null,candidateTree:null,evidenceRef:null,nextAction:null,blocker:null}
      const scopeJson=JSON.stringify(scope)
      journal.append(scopeJson,JSON.stringify(first),0,time)
      journal.append(scopeJson,JSON.stringify({...first,sequence:2,stage:'implementing',activity:'running'}),1,time)
      journal.append(scopeJson,JSON.stringify({...first,sequence:3,stage:'implementing',activity:'terminal',candidateCommit:commit,candidateTree:tree,evidenceRef:digest,nextAction:'qa_verifying'}),2,time)
      if(mode==='revoked-session')revoked=true
      if(mode==='revoked-grant')grantStore.revoke(authorityRef,ownerRef,time)
      const policy=JSON.stringify({request:{scopeJson,expectedSequence:3,candidateCommit:commit,candidateTree:tree,authorityRef,action:'qa_verifying'},priorReceipt:mode==='wrong-receipt'?{...priorReceipt,digest:'d'.repeat(64)}:priorReceipt,dependencyReceipts:mode==='missing-dependency'?[{...priorReceipt,digest:'e'.repeat(64)}]:[]})
      const options={enabled:mode!=='disabled',accountService,readToken:async()=>'fixture-only',grantStore,journal,receiptDirectory:directory,readCurrentPolicy:async()=>++reads>1&&mode==='changed-policy'?'{}':policy,now:()=>time,dispatch:async()=>{sends++;return JSON.stringify({delivery:'acknowledged',sourceDigest:'f'.repeat(64)})}}
      if(mode==='queue'){
        const registryPath=join(directory,'bindings.json'),occurredAt=new Date(time).toISOString()
        createEmptyRegistry(registryPath,['outcome'])
        mutateRegistry(registryPath,{action:'assign',projectId:'outcome',role:'planner',expectedVersion:0,actorClass:'planner',reasonClass:'chat_queue_test',occurredAt,publicAlias:'planner-current',providerClass:'codex',locator:'synthetic-private-destination',phaseId:null,scopeId:null,stageId:null})
        delete options.dispatch
        options.queueAdapter=createCodexQueueAdapter({enabled:true,registryPath,now:()=>occurredAt,expectedCwd:'/synthetic/project',ownerProbe:async()=>true,readThread:async id=>JSON.stringify({thread:{id,cwd:'/synthetic/project'}}),spawnProcess:(executable,args,settings)=>{
          sends++;assert.equal(settings.shell,false);assert.deepEqual(args.slice(0,3),['queue','--thread','synthetic-private-destination'])
          assert(args[4].includes('outcome-stage-request'));assert(args[4].includes(authorityRef));assert(args[4].includes(commit))
          const child=new EventEmitter();child.stdout=new EventEmitter();child.stderr=new EventEmitter();child.kill=()=>true
          queueMicrotask(()=>{child.stdout.emit('data','acknowledged');child.emit('close',0,null)})
          return child
        }})
      }
      const result=await createLocalWorkRuntime(options).runOnce()
      const passes=['valid','queue'].includes(mode)
      assert.equal(result.outcome==='acknowledged',passes,mode)
      assert.equal(sends,passes?1:0,mode)
      if(passes){
        assert.equal((await createLocalWorkRuntime(options).runOnce()).outcome,'acknowledged');assert.equal(sends,1)
        const reservation=db.prepare('SELECT reservation_digest FROM outcome_work_reservations').get().reservation_digest
        assert.equal((await createLocalWorkRuntime(options).receiveOnce('f'.repeat(64))).outcome,'configuration_hold')
        assert.equal((await createLocalWorkRuntime(options).receiveOnce(reservation)).outcome,'claimed')
        assert.equal((await createLocalWorkRuntime(options).receiveOnce(reservation)).outcome,'already_claimed')
        grantStore.revoke(authorityRef,ownerRef,time)
        assert.equal((await createLocalWorkRuntime(options).receiveOnce(reservation)).outcome,'configuration_hold')
        assert.equal(sends,1)
        assert.equal(db.prepare('SELECT count(*) AS n FROM outcome_work_execution_claims').get().n,1)
      }
      assert.equal(result.completionAuthority,false)
    }finally{db.close();rmSync(directory,{recursive:true,force:true})}
  }
})
