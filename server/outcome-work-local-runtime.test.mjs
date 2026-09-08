import test from 'node:test'
import assert from 'node:assert/strict'
import {DatabaseSync} from 'node:sqlite'
import {createHash} from 'node:crypto'
import {mkdtempSync,realpathSync,writeFileSync,rmSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {createAccountAccessService,createInMemoryAccountStore} from './account-access.mjs'
import fixture from '../test/fixtures/account-access.json' with {type:'json'}
import {createWorkJournal} from './outcome-work-journal.mjs'
import {createWorkGrantStore} from './outcome-work-grant-store.mjs'
import {createLocalWorkRuntime} from './outcome-work-local-runtime.mjs'
const time=20000,commit='a'.repeat(40),tree='b'.repeat(40)
const scope={projectId:'outcome',workId:'w',runId:'r',sessionRef:'s',bindingVersion:1}
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
  for(const mode of ['valid','revoked-session','revoked-grant','missing-dependency','wrong-receipt','changed-policy','disabled']){
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
      const result=await createLocalWorkRuntime(options).runOnce()
      assert.equal(result.outcome==='acknowledged',mode==='valid',mode)
      assert.equal(sends,mode==='valid'?1:0,mode)
      if(mode==='valid'){assert.equal((await createLocalWorkRuntime(options).runOnce()).outcome,'acknowledged');assert.equal(sends,1)}
      assert.equal(result.completionAuthority,false)
    }finally{db.close();rmSync(directory,{recursive:true,force:true})}
  }
})
