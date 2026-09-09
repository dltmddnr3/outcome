import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,realpathSync,writeFileSync,rmSync,chmodSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {execFileSync} from 'node:child_process'
import {DatabaseSync} from 'node:sqlite'
import {runOutcomeWorkOnce} from '../scripts/run-outcome-work.mjs'
import {createWorkJournal} from './outcome-work-journal.mjs'
import {createWorkGrantStore} from './outcome-work-grant-store.mjs'

test('one-shot work CLI fails closed without explicit protected configuration',async()=>{
  for(const argv of [[],['--run','/missing'],['--receive','/missing','bad'],['--dispatch','/missing']]){
    let output=''
    assert.equal(await runOutcomeWorkOnce({argv,write:text=>output+=text}),70)
    assert.deepEqual(JSON.parse(output),{outcome:'configuration_hold',executionAuthority:false,completionAuthority:false})
    assert(!output.includes('/missing'))
  }
})

test('configured CLI composes existing initial journal, grant and queue once without stage start',async()=>{
  const root=realpathSync(mkdtempSync(join(tmpdir(),'outcome-work-cli-')))
  const databasePath=join(root,'work.sqlite'),db=new DatabaseSync(databasePath)
  chmodSync(databasePath,0o600)
  const now=Date.now(),ownerRef='a'.repeat(64),candidateCommit='b'.repeat(40),candidateTree='c'.repeat(40)
  const scope={projectId:'outcome',workId:'cli-work',runId:'cli-run',sessionRef:'d'.repeat(64),bindingVersion:1}
  const scopeJson=JSON.stringify(scope),journal=createWorkJournal(db),store=createWorkGrantStore(db)
  const grantJson=JSON.stringify({schemaVersion:1,...scope,ownerRef,candidateCommit,candidateTree,allowedStages:['implementing'],issuedAt:now-1,expiresAt:now+60000})
  const {authorityRef}=store.record(grantJson,ownerRef,now)
  journal.append(scopeJson,JSON.stringify({sequence:1,observedAt:new Date(now).toISOString(),stage:'queued',attempt:1,activity:'waiting',candidateCommit:null,candidateTree:null,evidenceRef:null,nextAction:null,blocker:null}),0,now)
  const save=(name,value)=>{const path=join(root,name);writeFileSync(path,value,{mode:0o600});return path}
  const policyPath=save('policy.json',JSON.stringify({request:{scopeJson,expectedSequence:1,candidateCommit,candidateTree,authorityRef,action:'implementing'},priorReceipt:null,dependencyReceipts:[]}))
  const config={schemaVersion:1,candidatePin:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),databasePath,receiptDirectory:root,policyPath,
    tokenPath:save('token','test-private-token'),identityPath:save('identity.json','{}'),snapshotPath:save('snapshot.json','{}'),registryPath:join(root,'.outcome-runtime','bindings.json'),ownerCwd:root,codexExecutable:process.execPath}
  const path=save('config.json',JSON.stringify(config));let sends=0,output=''
  const options={now:()=>now,write:text=>output=text,identityFactory:()=>({service:{resolveBridgeAuthority:async({token})=>{assert.equal(token,'test-private-token');return {account_ref:ownerRef,project_ids:['outcome']}}}}),
    queueFactory:()=>({bindingResolver:async()=>({status:'active',freshness:'fresh',project_id:'outcome',role:'planner',destination:{}}),matchesWorkScope:()=>true,transport:async()=>{sends++;return {delivery:'acknowledged'}}})}
  try{
    assert.equal(await runOutcomeWorkOnce({...options,argv:['--dispatch',path]}),0,output)
    assert.equal(await runOutcomeWorkOnce({...options,argv:['--dispatch',path]}),0,output)
    assert.equal(sends,1)
    assert.equal(journal.read(scopeJson,now).projection.stage,'queued')
    const digest=db.prepare('SELECT reservation_digest FROM outcome_work_reservations').get().reservation_digest
    assert.equal(await runOutcomeWorkOnce({...options,argv:['--receive',path,digest]}),0,output)
    assert.equal(JSON.parse(output).outcome,'claimed')
    assert.equal(await runOutcomeWorkOnce({...options,argv:['--receive',path,digest]}),0,output)
    assert.equal(JSON.parse(output).outcome,'already_claimed')
    store.revoke(authorityRef,ownerRef,now)
    assert.equal(await runOutcomeWorkOnce({...options,argv:['--dispatch',path]}),70)
    assert.equal(sends,1)
    assert(!output.includes(root));assert(!output.includes('test-private-token'))
  }finally{db.close();rmSync(root,{recursive:true,force:true})}
})
