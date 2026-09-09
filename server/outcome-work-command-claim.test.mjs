import test from 'node:test'
import assert from 'node:assert/strict'
import {DatabaseSync} from 'node:sqlite'
import {createWorkJournal} from './outcome-work-journal.mjs'
import {createWorkGrantStore} from './outcome-work-grant-store.mjs'

const now=20000, owner='a'.repeat(64), checkout='b'.repeat(64)
const scope={projectId:'outcome',workId:'work-a',runId:'run-a',sessionRef:'session-a',bindingVersion:1}
const raw=JSON.stringify(scope)
function setup({start=true,multiple=false}={}){
  const db=new DatabaseSync(':memory:'), journal=createWorkJournal(db), grants=createWorkGrantStore(db)
  const command={id:'check',stage:'implementing',program:'node',args:['--version'],timeoutMs:1000}
  const grant=JSON.stringify({schemaVersion:2,...scope,ownerRef:owner,candidateCommit:'c'.repeat(40),candidateTree:'d'.repeat(40),allowedStages:['implementing'],issuedAt:now-1,expiresAt:now+1000,execution:{checkoutRef:checkout,writePaths:[],commands:multiple?[command,{...command,id:'second'}]:[command]}})
  const {authorityRef}=grants.record(grant,owner,now)
  journal.append(raw,JSON.stringify({sequence:1,observedAt:new Date(now).toISOString(),stage:'queued',attempt:1,activity:'waiting',candidateCommit:null,candidateTree:null,evidenceRef:null,nextAction:null,blocker:null}),0,now)
  const {reservationDigest}=journal.reserveContinuation(raw,1,'c'.repeat(40),'d'.repeat(40),authorityRef,now)
  journal.beginContinuationDispatch(raw,1,reservationDigest,now)
  journal.claimContinuationExecution(raw,1,reservationDigest,owner,now,authorityRef)
  if(start){
    journal.recordActivity(raw,reservationDigest,owner,JSON.stringify({outcome:'observed',activity:'running',providerStatus:'inProgress',observedAt:new Date(now).toISOString(),terminalAt:null,sourceDigest:'f'.repeat(64),turnRef:'1'.repeat(64),executionAuthority:false,completionAuthority:false}),now)
    journal.recordObservedStart(raw,reservationDigest,owner,now)
  }
  return {db,journal,grants,authorityRef,claim:(who=owner,where=checkout,time=now)=>journal.claimCommandExecution(raw,reservationDigest,who,'check',where,time)}
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
test('missing start, wrong owner/checkout, expiry, revocation and multi-command fail closed',()=>{
  for(const variant of ['start','owner','checkout','expiry','revoked','multiple']){
    const s=setup({start:variant!=='start',multiple:variant==='multiple'})
    try{
      if(variant==='revoked')s.grants.revoke(s.authorityRef,owner,now)
      assert.throws(()=>s.claim(variant==='owner'?'e'.repeat(64):owner,variant==='checkout'?'e'.repeat(64):checkout,variant==='expiry'?now+2000:now),/work_journal_unavailable/,variant)
      assert.equal(s.db.prepare('SELECT count(*) AS n FROM outcome_work_commands').get().n,0)
    }finally{s.db.close()}
  }
})
