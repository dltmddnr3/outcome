import test from 'node:test'
import assert from 'node:assert/strict'
import {DatabaseSync} from 'node:sqlite'
import {createWorkJournal} from './outcome-work-journal.mjs'
import {createWorkGrantStore} from './outcome-work-grant-store.mjs'
import {executeClaimedWorkCommand} from './outcome-work-command-execution.mjs'
import {createHash} from 'node:crypto'
import {realpathSync,mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'

const now=20000, owner='a'.repeat(64), cwd=realpathSync(process.cwd()),checkout=createHash('sha256').update('outcome-work-checkout-v1\0').update(cwd).digest('hex')
const scope={projectId:'outcome',workId:'work-a',runId:'run-a',sessionRef:'session-a',bindingVersion:1}
const raw=JSON.stringify(scope)
function setup({start=true,multiple=false,args=['--version'],workCwd=cwd,readPaths=[],writePaths=[],commands}={}){
  const db=new DatabaseSync(':memory:'), journal=createWorkJournal(db), grants=createWorkGrantStore(db)
  const command={id:'check',stage:'implementing',program:'node',args,timeoutMs:1000}
  const grant=JSON.stringify({schemaVersion:2,...scope,ownerRef:owner,candidateCommit:'c'.repeat(40),candidateTree:'d'.repeat(40),allowedStages:['implementing'],issuedAt:now-1,expiresAt:now+1000,execution:{checkoutRef:createHash('sha256').update('outcome-work-checkout-v1\0').update(workCwd).digest('hex'),readPaths,writePaths,commands:commands??(multiple?[command,{...command,id:'second'}]:[command])}})
  const {authorityRef}=grants.record(grant,owner,now)
  journal.append(raw,JSON.stringify({sequence:1,observedAt:new Date(now).toISOString(),stage:'queued',attempt:1,activity:'waiting',candidateCommit:null,candidateTree:null,evidenceRef:null,nextAction:null,blocker:null}),0,now)
  const {reservationDigest}=journal.reserveContinuation(raw,1,'c'.repeat(40),'d'.repeat(40),authorityRef,now)
  journal.beginContinuationDispatch(raw,1,reservationDigest,now)
  journal.claimContinuationExecution(raw,1,reservationDigest,owner,now,authorityRef)
  if(start){
    journal.recordActivity(raw,reservationDigest,owner,JSON.stringify({outcome:'observed',activity:'running',providerStatus:'inProgress',observedAt:new Date(now).toISOString(),terminalAt:null,sourceDigest:'f'.repeat(64),turnRef:'1'.repeat(64),executionAuthority:false,completionAuthority:false}),now)
    journal.recordObservedStart(raw,reservationDigest,owner,now)
  }
  return {db,journal,grants,authorityRef,reservationDigest,claim:(who=owner,where=checkout,time=now)=>journal.claimCommandExecution(raw,reservationDigest,who,'check',where,time)}
}
test('exact command is durably claimed once across journal reopen',()=>{
  const s=setup()
  try{
    const result=s.claim()
    assert.equal(result.outcome,'command_claimed')
    assert.deepEqual(result.command.args,['--version'])
    assert.equal(result.completionAuthority,false)
    createWorkJournal(s.db)
    assert.equal(s.claim().outcome,'command_already_claimed')
    assert.equal(s.claim().command,undefined)
    assert.equal(s.db.prepare('SELECT count(*) AS n FROM outcome_work_commands').get().n,1)
  }finally{s.db.close()}
})
test('real bounded process result persists and replay cannot launch again',async()=>{
  const s=setup()
  try{
    const input={journal:s.journal,scopeJson:raw,reservationDigest:s.reservationDigest,ownerRef:owner,commandId:'check',cwd,readPaths:[],now:()=>now}
    const result=await executeClaimedWorkCommand(input)
    assert.equal(result.outcome,'command_exited_zero')
    assert.equal(result.completionAuthority,false)
    const row=s.db.prepare('SELECT result_json FROM outcome_work_command_results').get()
    assert.equal(JSON.parse(row.result_json).outputDigest,result.outputDigest)
    assert.equal((await executeClaimedWorkCommand(input)).recovered,true)
    assert.equal(s.db.prepare('SELECT count(*) AS n FROM outcome_work_commands').get().n,1)
    assert.throws(()=>s.journal.recordCommandResult(s.reservationDigest,'check',owner,{...result,exitCode:1}),/work_journal_unavailable/)
    assert.equal(s.journal.read(raw,now).sequence,2)
  }finally{s.db.close()}
})
test('grant revocation during execution cancels process and preserves non-success result',async()=>{
  const s=setup({args:['--eval','setInterval(()=>{},1000)']})
  let timer
  try{
    timer=setTimeout(()=>s.grants.revoke(s.authorityRef,owner,now),40)
    const result=await executeClaimedWorkCommand({journal:s.journal,scopeJson:raw,reservationDigest:s.reservationDigest,ownerRef:owner,commandId:'check',cwd,readPaths:[],now:()=>now})
    assert.equal(result.outcome,'command_cancelled')
    assert.equal(JSON.parse(s.db.prepare('SELECT result_json FROM outcome_work_command_results').get().result_json).outcome,'command_cancelled')
    assert.equal(s.journal.read(raw,now).sequence,2)
  }finally{clearTimeout(timer);s.db.close()}
})
test('missing start, wrong owner/checkout, expiry and revocation fail closed',()=>{
  for(const variant of ['start','owner','checkout','expiry','revoked']){
    const s=setup({start:variant!=='start'})
    try{
      if(variant==='revoked')s.grants.revoke(s.authorityRef,owner,now)
      assert.throws(()=>s.claim(variant==='owner'?'e'.repeat(64):owner,variant==='checkout'?'e'.repeat(64):checkout,variant==='expiry'?now+2000:now),/work_journal_unavailable/,variant)
      assert.equal(s.db.prepare('SELECT count(*) AS n FROM outcome_work_commands').get().n,0)
    }finally{s.db.close()}
  }
})
test('ordered commands require prior success and recover completed results without relaunch',async()=>{
  for(const args of [['--version'],['--eval','process.exit(7)']]){
    const s=setup({multiple:true,args})
    const input={journal:s.journal,scopeJson:raw,reservationDigest:s.reservationDigest,ownerRef:owner,cwd,readPaths:[],now:()=>now}
    try{
      await assert.rejects(executeClaimedWorkCommand({...input,commandId:'second'}),/work_journal_unavailable/)
      const first=await executeClaimedWorkCommand({...input,commandId:'check'})
      if(first.outcome==='command_exited_zero'){
        assert.equal((await executeClaimedWorkCommand({...input,commandId:'second'})).outcome,'command_exited_zero')
        assert.equal((await executeClaimedWorkCommand({...input,commandId:'check'})).recovered,true)
        assert.equal((await executeClaimedWorkCommand({...input,commandId:'second'})).recovered,true)
        assert.equal(s.db.prepare('SELECT count(*) AS n FROM outcome_work_commands').get().n,2)
      }else{
        await assert.rejects(executeClaimedWorkCommand({...input,commandId:'second'}),/work_journal_unavailable/)
        assert.equal(s.db.prepare('SELECT count(*) AS n FROM outcome_work_commands').get().n,1)
      }
    }finally{s.db.close()}
  }
})
test('approved source edit and behavioral verification run with exact manifests',async()=>{
  const root=realpathSync(mkdtempSync(join(tmpdir(),'outcome-source-command-')))
  writeFileSync(join(root,'result.cjs'),'module.exports = 0\n')
  writeFileSync(join(root,'verify.cjs'),"const assert=require('node:assert/strict'),fs=require('node:fs');assert.equal(require('./result.cjs'),42);assert.throws(()=>fs.readFileSync('outside.txt'));assert.throws(()=>fs.writeFileSync('verify.cjs','changed'))\n")
  writeFileSync(join(root,'outside.txt'),'private sentinel')
  writeFileSync(join(root,'package.json'),'{"type":"commonjs"}')
  const command=(id,args)=>({id,stage:'implementing',program:'node',args,timeoutMs:1000})
  const s=setup({workCwd:root,readPaths:['verify.cjs','package.json'],writePaths:['result.cjs'],commands:[
    command('edit',['--eval',"require('node:fs').writeFileSync('result.cjs','module.exports = 42\\n')"]),
    command('verify',['verify.cjs'])
  ]})
  const input={journal:s.journal,scopeJson:raw,reservationDigest:s.reservationDigest,ownerRef:owner,cwd:root,now:()=>now}
  try{
    assert.equal((await executeClaimedWorkCommand({...input,commandId:'edit'})).outcome,'command_exited_zero')
    assert.equal(readFileSync(join(root,'result.cjs'),'utf8'),'module.exports = 42\n')
    assert.equal((await executeClaimedWorkCommand({...input,commandId:'verify'})).outcome,'command_exited_zero')
    assert.equal(readFileSync(join(root,'outside.txt'),'utf8'),'private sentinel')
    assert.equal((await executeClaimedWorkCommand({...input,commandId:'edit'})).recovered,true)
  }finally{s.db.close();rmSync(root,{recursive:true,force:true})}
})
