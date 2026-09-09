import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,realpathSync,writeFileSync,rmSync,chmodSync,existsSync} from 'node:fs'
import {PassThrough} from 'node:stream'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {execFileSync} from 'node:child_process'
import {DatabaseSync} from 'node:sqlite'
import {createHash} from 'node:crypto'
import {runOutcomeWorkOnce,readWorkSessionInput} from '../scripts/run-outcome-work.mjs'
import {createWorkJournal} from './outcome-work-journal.mjs'
import {createWorkGrantStore} from './outcome-work-grant-store.mjs'
import {createPreviewWorkIdentity} from './outcome-preview-work-identity.mjs'

test('session input is bounded, one-shot and never exposes rejected bytes',async()=>{
  const stream=new PassThrough(),ready=readWorkSessionInput(stream);stream.end('fixture-token\n')
  assert.equal(await ready,'fixture-token');assert.equal(stream.listenerCount('data'),0)
  for(const bytes of ['','private secret','x'.repeat(16385),Buffer.from([0xff])]){
    const stream=new PassThrough(),result=readWorkSessionInput(stream)
    stream.end(bytes)
    await assert.rejects(result,/^Error: session_input_unavailable$/)
    assert.equal(stream.listenerCount('data'),0)
  }
  await assert.rejects(readWorkSessionInput(new PassThrough(),{timeoutMs:1}),/session_input_unavailable/)
})

test('one-shot work CLI fails closed without explicit protected configuration',async()=>{
  for(const argv of [[],['--run','/missing'],['--receive','/missing','bad'],['--dispatch','/missing']]){
    let output=''
    assert.equal(await runOutcomeWorkOnce({argv,write:text=>output+=text}),70)
    assert.deepEqual(JSON.parse(output),{outcome:'configuration_hold',executionAuthority:false,completionAuthority:false})
    assert(!output.includes('/missing'))
  }
})

test('configured CLI starts once only after correlated running observation, never on acknowledgement',async()=>{
  const root=realpathSync(mkdtempSync(join(tmpdir(),'outcome-work-cli-')))
  const databasePath=join(root,'work.sqlite'),db=new DatabaseSync(databasePath)
  chmodSync(databasePath,0o600)
  const now=Date.now(),ownerRef=createHash('sha256').update('outcome-bridge-account-v1\0fixture-owner').digest('hex'),candidateCommit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),candidateTree=execFileSync('git',['rev-parse','HEAD^{tree}'],{encoding:'utf8'}).trim()
  const scope={projectId:'outcome',workId:'cli-work',runId:'cli-run',sessionRef:'d'.repeat(64),bindingVersion:1}
  const scopeJson=JSON.stringify(scope),journal=createWorkJournal(db),store=createWorkGrantStore(db)
  const grantJson=JSON.stringify({schemaVersion:2,...scope,ownerRef,candidateCommit,candidateTree,allowedStages:['implementing'],issuedAt:now-1,expiresAt:now+60000,
    execution:{checkoutRef:createHash('sha256').update('outcome-work-checkout-v1\0').update(realpathSync(process.cwd())).digest('hex'),writePaths:[],commands:[{id:'check',stage:'implementing',program:'node',args:['--version'],timeoutMs:1000}]}})
  const authorityRef=createHash('sha256').update(grantJson).digest('hex')
  journal.append(scopeJson,JSON.stringify({sequence:1,observedAt:new Date(now).toISOString(),stage:'queued',attempt:1,activity:'waiting',candidateCommit:null,candidateTree:null,evidenceRef:null,nextAction:null,blocker:null}),0,now)
  const save=(name,value)=>{const path=join(root,name);writeFileSync(path,value,{mode:0o600});return path}
  const policyPath=save('policy.json',JSON.stringify({request:{scopeJson,expectedSequence:1,candidateCommit,candidateTree,authorityRef,action:'implementing'},priorReceipt:null,dependencyReceipts:[]}))
  const receipt={schemaVersion:1,projectId:scope.projectId,workId:scope.workId,runId:scope.runId,candidateCommit,candidateTree,stage:'implementing',verificationMode:'same-session verification',checks:[{id:'check',outcome:'pass',evidenceDigest:'a'.repeat(64)}]}
  const receiptJson=JSON.stringify(receipt),receiptDigest=createHash('sha256').update(receiptJson).digest('hex')
  const receiptPath=save(`${receiptDigest}.json`,receiptJson);chmodSync(receiptPath,0o400)
  const {schemaVersion,checks,...receiptFields}=receipt
  const terminalPath=save('terminal.json',JSON.stringify({...receiptFields,digest:receiptDigest,requiredChecks:['check']}))
  const config={schemaVersion:4,terminalPath,approvalPath:save('approval.json',grantJson),candidatePin:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),databasePath,receiptDirectory:root,policyPath,
    identityPath:save('identity.json','{}'),snapshotPath:save('snapshot.json','{}'),registryPath:join(root,'.outcome-runtime','bindings.json'),ownerCwd:root,codexExecutable:process.execPath}
  const path=save('config.json',JSON.stringify(config));let sends=0,output='',bindingValid=true
  let activeAuthority=authorityRef
  let observation={outcome:'observed',activity:'running',providerStatus:'inProgress',observedAt:new Date(now).toISOString(),terminalAt:null,sourceDigest:'8'.repeat(64),turnRef:'9'.repeat(64),executionAuthority:false,completionAuthority:false}
  const options={sessionTokenReader:async()=>'test-private-token',now:()=>now,write:text=>output=text,identityFactory:()=>({service:{resolveBridgeAuthority:async({token})=>{assert.equal(token,'test-private-token');return {account_ref:ownerRef,project_ids:['outcome']}}}}),
    queueFactory:()=>({bindingResolver:async()=>({status:'active',freshness:'fresh',project_id:'outcome',role:'planner',destination:{}}),matchesWorkScope:()=>bindingValid,transport:async()=>{sends++;return {delivery:'acknowledged'}},readPlannerActivity:async({message})=>{assert(message.includes(activeAuthority));return observation}})}
  try{
    assert.equal(await runOutcomeWorkOnce({...options,argv:['--dispatch',path]}),70)
    assert.equal(sends,0)
    assert.equal(await runOutcomeWorkOnce({...options,argv:['--approve',path,'f'.repeat(64)]}),70)
    assert.equal(db.prepare('SELECT count(*) AS n FROM outcome_execution_grants').get().n,0)
    const wrongOwner=()=>({service:{resolveBridgeAuthority:async()=>({account_ref:'f'.repeat(64),project_ids:['outcome']})}})
    assert.equal(await runOutcomeWorkOnce({...options,identityFactory:wrongOwner,argv:['--approve',path,authorityRef]}),70)
    assert.equal(db.prepare('SELECT count(*) AS n FROM outcome_execution_grants').get().n,0)
    bindingValid=false
    assert.equal(await runOutcomeWorkOnce({...options,argv:['--approve',path,authorityRef]}),70)
    assert.equal(db.prepare('SELECT count(*) AS n FROM outcome_execution_grants').get().n,0)
    bindingValid=true
    assert.equal(await runOutcomeWorkOnce({...options,argv:['--approve',path,authorityRef]}),0,output)
    assert.equal(JSON.parse(output).outcome,'approval_recorded')
    assert.equal(sends,0)
    assert.equal(await runOutcomeWorkOnce({...options,argv:['--dispatch',path]}),0,output)
    assert.equal(await runOutcomeWorkOnce({...options,argv:['--dispatch',path]}),0,output)
    assert.equal(sends,1)
    assert.equal(journal.read(scopeJson,now).projection.stage,'queued')
    const digest=db.prepare('SELECT reservation_digest FROM outcome_work_reservations').get().reservation_digest
    assert.equal(await runOutcomeWorkOnce({...options,argv:['--observe',path,digest]}),70)
    bindingValid=false
    assert.equal(await runOutcomeWorkOnce({...options,argv:['--receive',path,digest]}),70)
    assert.equal(db.prepare('SELECT count(*) AS n FROM outcome_work_execution_claims').get().n,0)
    bindingValid=true
    assert.equal(await runOutcomeWorkOnce({...options,argv:['--receive',path,digest]}),0,output)
    assert.equal(JSON.parse(output).outcome,'claimed')
    assert.equal(await runOutcomeWorkOnce({...options,argv:['--receive',path,digest]}),0,output)
    assert.equal(JSON.parse(output).outcome,'already_claimed')
    assert.equal(await runOutcomeWorkOnce({...options,argv:['--observe',path,digest]}),0,output)
    assert.equal(JSON.parse(output).outcome,'start_recorded')
    assert.equal(journal.read(scopeJson,now).projection.stage,'implementing')
    bindingValid=false
    assert.equal(await runOutcomeWorkOnce({...options,argv:['--execute',path,digest]}),70)
    assert.equal(db.prepare('SELECT count(*) AS n FROM outcome_work_commands').get().n,0)
    bindingValid=true
    assert.equal(await runOutcomeWorkOnce({...options,identityFactory:wrongOwner,argv:['--execute',path,digest]}),70)
    assert.equal(db.prepare('SELECT count(*) AS n FROM outcome_work_commands').get().n,0)
    assert.equal(await runOutcomeWorkOnce({...options,argv:['--execute',path,digest]}),0,output)
    assert.equal(JSON.parse(output).outcome,'commands_completed')
    assert.equal(db.prepare('SELECT count(*) AS n FROM outcome_work_command_results').get().n,1)
    assert.equal(await runOutcomeWorkOnce({...options,argv:['--execute',path,digest]}),0)
    assert.equal(JSON.parse(output).outcome,'commands_completed')
    assert.equal(db.prepare('SELECT count(*) AS n FROM outcome_work_commands').get().n,1)
    assert.equal(journal.read(scopeJson,now).projection.stage,'implementing')
    const {identityPath,snapshotPath,...baseConfig}=config
    const previewConfig={...baseConfig,schemaVersion:5,previewOrigin:'https://outcome-fixture-white-castle.vercel.app',accountRef:ownerRef,workspaceId:'workspace-a'}
    writeFileSync(path,JSON.stringify(previewConfig))
    const sessionToken=`e30.${Buffer.from(JSON.stringify({sub:'fixture-owner',exp:Math.floor(now/1000)+60})).toString('base64url')}.signature`
    let remoteStatus=200,remoteChecks=0
    const remoteOptions={...options,sessionTokenReader:async()=>sessionToken,identityFactory:()=>{throw Error('local identity must not be read')},
      previewIdentityFactory:input=>createPreviewWorkIdentity({...input,fetchImpl:async(url,request)=>{
        remoteChecks++;assert.equal(url,previewConfig.previewOrigin+'/api/private/workspace');assert.equal(request.headers.authorization,`Bearer ${sessionToken}`)
        return new Response(JSON.stringify({workspace:{access:'private_read_only',workspace:{id:'workspace-a',role:'owner-viewer'},completionAuthority:false,projects:[{project:{id:'outcome'}}],session:{expiresAt:new Date(now+60000).toISOString()}}}),{status:remoteStatus,headers:{'content-type':'application/json','cache-control':'no-store'}})
      }})}
    assert.equal(await runOutcomeWorkOnce({...remoteOptions,argv:['--execute',path,digest]}),0,output)
    assert(remoteChecks>=2)
    assert.equal(db.prepare('SELECT count(*) AS n FROM outcome_work_commands').get().n,1)
    remoteStatus=401
    assert.equal(await runOutcomeWorkOnce({...remoteOptions,argv:['--execute',path,digest]}),70)
    assert(!output.includes(sessionToken))
    assert.equal(db.prepare('SELECT count(*) AS n FROM outcome_work_commands').get().n,1)
    writeFileSync(path,JSON.stringify(config))
    assert.equal(await runOutcomeWorkOnce({...options,argv:['--finalize',path,digest]}),70) // Running is not completed.
    assert.equal(await runOutcomeWorkOnce({...options,argv:['--observe',path,digest]}),0,output)
    assert.equal(JSON.parse(output).outcome,'start_already_recorded')
    assert.equal(db.prepare('SELECT count(*) AS n FROM outcome_work_starts').get().n,1)
    const running=observation
    for(const change of [{turnRef:'0'.repeat(64)},{observedAt:new Date(now+1000).toISOString()},{privateText:'must-not-store'}]){
      observation={...running,...change}
      assert.equal(await runOutcomeWorkOnce({...options,argv:['--observe',path,digest]}),70)
      assert(!db.prepare('SELECT observation_json FROM outcome_work_activity').get().observation_json.includes('must-not-store'))
    }
    observation={...running,activity:'terminal',providerStatus:'completed',terminalAt:new Date(now).toISOString(),sourceDigest:'7'.repeat(64)}
    assert.equal(await runOutcomeWorkOnce({...options,argv:['--observe',path,digest]}),0,output)
    observation={...running,sourceDigest:'6'.repeat(64)}
    assert.equal(await runOutcomeWorkOnce({...options,argv:['--observe',path,digest]}),70)
    assert.equal(JSON.parse(db.prepare('SELECT observation_json FROM outcome_work_activity').get().observation_json).activity,'terminal')
    assert.equal(journal.read(scopeJson,now).sequence,2) // Terminal activity is not stage acceptance.
    assert.equal(journal.read(scopeJson,now).projection.nextAction,null)
    chmodSync(receiptPath,0o600)
    assert.equal(await runOutcomeWorkOnce({...options,argv:['--finalize',path,digest]}),70)
    chmodSync(receiptPath,0o400)
    const commandResult=db.prepare('SELECT * FROM outcome_work_command_results WHERE reservation_digest=?').get(digest)
    db.prepare('DELETE FROM outcome_work_command_results WHERE reservation_digest=?').run(digest)
    assert.equal(await runOutcomeWorkOnce({...options,argv:['--finalize',path,digest]}),70) // Passing receipt cannot replace missing execution evidence.
    assert.equal(journal.read(scopeJson,now).sequence,2)
    db.prepare('INSERT INTO outcome_work_command_results VALUES(?,?,?)').run(commandResult.reservation_digest,commandResult.command_id,commandResult.result_json)
    assert.equal(await runOutcomeWorkOnce({...options,argv:['--finalize',path,digest]}),0,output)
    assert.equal(JSON.parse(output).outcome,'terminal_recorded')
    assert.equal(journal.read(scopeJson,now).projection.nextAction,'qa_verifying')
    assert.equal(await runOutcomeWorkOnce({...options,argv:['--finalize',path,digest]}),0,output)
    assert.equal(JSON.parse(output).outcome,'terminal_already_recorded')
    assert.equal(journal.read(scopeJson,now).sequence,3)
    assert.equal(sends,1) // Recording a next action never automatically dispatches it.
    writeFileSync(path,JSON.stringify({...config,candidatePin:'0'.repeat(40)}))
    assert.equal(await runOutcomeWorkOnce({...options,argv:['--dispatch',path]}),70)
    writeFileSync(path,JSON.stringify(config));chmodSync(path,0o644)
    assert.equal(await runOutcomeWorkOnce({...options,argv:['--dispatch',path]}),70)
    chmodSync(path,0o600)
    store.revoke(authorityRef,ownerRef,now)
    assert.equal(await runOutcomeWorkOnce({...options,argv:['--approve',path,authorityRef]}),70)
    assert.equal(await runOutcomeWorkOnce({...options,argv:['--dispatch',path]}),70)
    assert.equal(sends,1)
    assert(!output.includes(root));assert(!output.includes('test-private-token'))
    let priorReceipt={...receiptFields,digest:receiptDigest,requiredChecks:['check']}
    for(const [index,stage] of ['qa_verifying','release_verifying'].entries()){
      const stageGrant=JSON.stringify({...JSON.parse(grantJson),allowedStages:[stage],execution:{...JSON.parse(grantJson).execution,commands:[{id:'check',stage,program:'node',args:['--version'],timeoutMs:1000}]}})
      activeAuthority=createHash('sha256').update(stageGrant).digest('hex')
      writeFileSync(config.approvalPath,stageGrant)
      const stagePolicy={request:{scopeJson,expectedSequence:journal.read(scopeJson,now).sequence,candidateCommit,candidateTree,authorityRef:activeAuthority,action:stage},priorReceipt,dependencyReceipts:[]}
      writeFileSync(policyPath,JSON.stringify(stagePolicy))
      assert.equal(await runOutcomeWorkOnce({...options,argv:['--dispatch',path]}),70) // No inherited approval.
      assert.equal(await runOutcomeWorkOnce({...options,argv:['--approve',path,activeAuthority]}),0,output)
      writeFileSync(policyPath,JSON.stringify({...stagePolicy,priorReceipt:{...priorReceipt,digest:'0'.repeat(64)}}))
      assert.equal(await runOutcomeWorkOnce({...options,argv:['--dispatch',path]}),70) // Exact prior evidence required.
      writeFileSync(policyPath,JSON.stringify(stagePolicy))
      assert.equal(await runOutcomeWorkOnce({...options,argv:['--dispatch',path]}),0,output)
      const reservation=db.prepare('SELECT reservation_digest FROM outcome_work_reservations WHERE stage=?').get(index===0?'implementing':'qa_verifying').reservation_digest
      assert.equal(await runOutcomeWorkOnce({...options,argv:['--receive',path,reservation]}),0,output)
      observation={...running,sourceDigest:String(index+2).repeat(64),turnRef:String(index+3).repeat(64)}
      assert.equal(await runOutcomeWorkOnce({...options,argv:['--observe',path,reservation]}),0,output)
      assert.equal(journal.read(scopeJson,now).projection.stage,stage)
      assert.equal(await runOutcomeWorkOnce({...options,argv:['--execute',path,reservation]}),0,output)
      assert.equal(JSON.parse(output).outcome,'commands_completed')
      const stageReceipt={...receipt,stage},bytes=JSON.stringify(stageReceipt),stageDigest=createHash('sha256').update(bytes).digest('hex')
      const stored=save(`${stageDigest}.json`,bytes);chmodSync(stored,0o400)
      priorReceipt={...receiptFields,stage,digest:stageDigest,requiredChecks:['check']}
      writeFileSync(terminalPath,JSON.stringify(priorReceipt))
      observation={...observation,activity:'terminal',providerStatus:'completed',terminalAt:new Date(now).toISOString(),sourceDigest:String(index+4).repeat(64)}
      assert.equal(await runOutcomeWorkOnce({...options,argv:['--observe',path,reservation]}),0,output)
      assert.equal(await runOutcomeWorkOnce({...options,argv:['--finalize',path,reservation]}),0,output)
      assert.equal(await runOutcomeWorkOnce({...options,argv:['--finalize',path,reservation]}),0,output)
      assert.equal(JSON.parse(output).outcome,'terminal_already_recorded')
      assert.equal(sends,index+2)
    }
    assert.equal(journal.read(scopeJson,now).sequence,7)
    assert.equal(journal.read(scopeJson,now).projection.nextAction,'awaiting_owner')
    writeFileSync(policyPath,JSON.stringify({request:{scopeJson,expectedSequence:7,candidateCommit,candidateTree,authorityRef:activeAuthority,action:'awaiting_owner'},priorReceipt,dependencyReceipts:[]}))
    assert.equal(await runOutcomeWorkOnce({...options,argv:['--dispatch',path]}),0,output)
    assert.equal(JSON.parse(output).outcome,'needs_owner')
    assert.equal(sends,3)
    assert.equal(existsSync(join(root,'token')),false)
  }finally{db.close();rmSync(root,{recursive:true,force:true})}
})
