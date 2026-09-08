import test from 'node:test'
import assert from 'node:assert/strict'
import {DatabaseSync} from 'node:sqlite'
import {mkdtempSync,rmSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {createWorkJournal} from './outcome-work-journal.mjs'
import {createWorkContinuationController as create} from './outcome-work-continuation.mjs'
const time=20000,scope={projectId:'outcome',workId:'work-a',runId:'run-a',sessionRef:'session-a',bindingVersion:1},scopeJson=JSON.stringify(scope)
const commit='a'.repeat(40),tree='b'.repeat(40),authority='c'.repeat(64),receipt='d'.repeat(64)
const input=JSON.stringify({scopeJson,expectedSequence:3,candidateCommit:commit,candidateTree:tree,authorityRef:authority,action:'qa_verifying'})
const ack=JSON.stringify({delivery:'acknowledged',sourceDigest:receipt})
function setup(){
  const db=new DatabaseSync(':memory:'),journal=createWorkJournal(db)
  const first={sequence:1,observedAt:new Date(time-1000).toISOString(),stage:'queued',attempt:1,activity:'waiting',candidateCommit:null,candidateTree:null,evidenceRef:null,nextAction:null,blocker:null}
  const last={...first,sequence:3,stage:'implementing',activity:'terminal',candidateCommit:commit,candidateTree:tree,evidenceRef:receipt,nextAction:'qa_verifying'}
  journal.append(scopeJson,JSON.stringify(first),0,time)
  journal.append(scopeJson,JSON.stringify({...first,sequence:2,stage:'implementing',activity:'running'}),1,time)
  journal.append(scopeJson,JSON.stringify(last),2,time)
  return {db,journal,last,options:{enabled:true,journal,verifyEligibility:async()=>true,dispatch:async()=>ack,now:()=>time}}
}
test('parallel controllers and reconstructed controller dispatch once; start is durable before transport',async()=>{
  const s=setup();let sends=0
  try{
    const options={...s.options,dispatch:async context=>{
      sends++;assert(Object.isFrozen(context));assert.equal(s.journal.readContinuationDispatch(scopeJson,context.reservationDigest,time).state,'dispatch_started');return ack
    }}
    const results=await Promise.all([create(options).runOnce(input),create(options).runOnce(input)])
    assert.deepEqual(results.map(x=>x.outcome).sort(),['acknowledged','reconciliation_required'])
    assert.equal((await create(options).runOnce(input)).outcome,'acknowledged');assert.equal(sends,1)
    const row=s.db.prepare('SELECT * FROM outcome_work_dispatches').get()
    assert.equal(row.state,'acknowledged');assert.equal(row.receipt_digest,receipt)
    assert(results.every(x=>x.completionAuthority===false&&x.executionAuthority===false))
  }finally{s.db.close()}
})
test('revocation during reservation, changed source and default-off cause no dispatch',async()=>{
  for(const mode of ['disabled','denied','revoked','changed','invalid']){
    const s=setup();let sends=0,verifications=0
    try{
      const c=create({...s.options,enabled:mode!=='disabled',verifyEligibility:async()=>{
        verifications++
        if(mode==='changed'&&verifications===2)s.journal.append(scopeJson,JSON.stringify({...s.last,sequence:4,nextAction:null,blocker:'authority_missing'}),3,time)
        return mode==='denied'?false:mode==='revoked'?verifications===1:true
      },dispatch:async()=>{sends++;return ack}})
      const r=await c.runOnce(mode==='invalid'?'{}':input)
      assert.notEqual(r.outcome,'acknowledged');assert.equal(sends,0)
      assert.equal(s.db.prepare('SELECT count(*) AS n FROM outcome_work_dispatches').get().n,0)
    }finally{s.db.close()}
  }
})
test('thrown malformed and timed-out delivery stay unknown and are never automatically repeated',async()=>{
  for(const mode of ['throw','malformed','timeout']){
    const s=setup();let sends=0,signal
    try{
      const options={...s.options,timeoutMs:10,dispatch:async(_,context)=>{
        sends++;signal=context.signal
        if(mode==='throw')throw Error('private error')
        if(mode==='timeout')return new Promise(()=>{})
        return JSON.stringify({delivery:'acknowledged'})
      }}
      assert.equal((await create(options).runOnce(input)).outcome,'delivery_unknown')
      assert.equal((await create(options).runOnce(input)).outcome,'delivery_unknown')
      assert.equal(sends,1);assert.equal(s.db.prepare('SELECT state FROM outcome_work_dispatches').get().state,'delivery_unknown')
      if(mode==='timeout')assert(signal.aborted)
    }finally{s.db.close()}
  }
})
test('result persistence ambiguity is not retried or rewritten as a second outcome',async()=>{
  const s=setup();let writes=0,sends=0
  try{
    const journal={...s.journal,recordContinuationResult(...args){writes++;s.journal.recordContinuationResult(...args);throw Error('lost response')}}
    const options={...s.options,journal,dispatch:async()=>{sends++;return ack}}
    assert.equal((await create(options).runOnce(input)).outcome,'delivery_unknown')
    assert.equal(writes,1);assert.equal(s.db.prepare('SELECT state FROM outcome_work_dispatches').get().state,'acknowledged')
    assert.equal((await create(options).runOnce(input)).outcome,'acknowledged');assert.equal(sends,1)
  }finally{s.db.close()}
})
test('restart readback never sends or writes a result for reserved or started actions',async()=>{
  for(const state of ['reserved','dispatch_started','acknowledged','delivery_unknown']) {
    const s=setup();let sends=0,writes=0
    try {
      const reserved=s.journal.reserveContinuation(scopeJson,3,commit,tree,authority,time)
      if(state!=='reserved')s.journal.beginContinuationDispatch(scopeJson,3,reserved.reservationDigest,time)
      if(['acknowledged','delivery_unknown'].includes(state))s.journal.recordContinuationResult(scopeJson,reserved.reservationDigest,state,state==='acknowledged'?receipt:null,time)
      const before=s.db.prepare('SELECT * FROM outcome_work_dispatches').all()
      const journal={...s.journal,recordContinuationResult(){writes++;throw Error('unexpected write')}}
      const recovered=await create({...s.options,journal,dispatch:async()=>{sends++;return ack}}).runOnce(input)
      assert.equal(recovered.outcome,['reserved','dispatch_started'].includes(state)?'reconciliation_required':state)
      assert.equal(sends,0);assert.equal(writes,0)
      assert.equal(recovered.completionAuthority,false);assert.equal(recovered.executionAuthority,false)
      assert.deepEqual(s.db.prepare('SELECT * FROM outcome_work_dispatches').all(),before)
    }finally{s.db.close()}
  }
})
test('a closed disk journal recovers acknowledged delivery without invoking transport',async()=>{
  const directory=mkdtempSync(join(tmpdir(),'outcome-continuation-recovery-'))
  let db
  try {
    db=new DatabaseSync(join(directory,'journal.sqlite'))
    const journal=createWorkJournal(db),seed=setup()
    try {
      const row=seed.db.prepare('SELECT journal_json FROM outcome_work_journals').get()
      for(const event of JSON.parse(row.journal_json).events)journal.append(scopeJson,JSON.stringify(event),event.sequence-1,time)
    }finally{seed.db.close()}
    let sends=0
    const options={enabled:true,verifyEligibility:async()=>true,now:()=>time,dispatch:async()=>{sends++;return ack}}
    assert.equal((await create({...options,journal}).runOnce(input)).outcome,'acknowledged')
    db.close();db=new DatabaseSync(join(directory,'journal.sqlite'))
    const reopened=createWorkJournal(db)
    const recovered=await create({...options,journal:reopened}).runOnce(input)
    assert.equal(recovered.outcome,'acknowledged');assert.equal(sends,1)
    assert.equal(recovered.completionAuthority,false);assert.equal(recovered.executionAuthority,false)
    assert.equal((await create({...options,journal:reopened,verifyEligibility:async()=>false}).runOnce(input)).outcome,'authority_hold')
    assert.equal(sends,1)
  }finally{db?.close();rmSync(directory,{recursive:true,force:true})}
})
test('expired/stuck eligibility is bounded and cannot later dispatch',async()=>{
  const s=setup();let sends=0,complete
  try{
    const controller=create({...s.options,timeoutMs:10,verifyEligibility:()=>new Promise(resolve=>{complete=resolve}),dispatch:async()=>{sends++;return ack}})
    assert.equal((await controller.runOnce(input)).outcome,'safe_hold')
    complete(true);await Promise.resolve();assert.equal(sends,0)
    assert.equal(s.db.prepare('SELECT count(*) AS n FROM outcome_work_reservations').get().n,0)
  }finally{s.db.close()}
})
test('owner acceptance boundary never queues a new agent message',async()=>{
  const s=setup();let sends=0,checks=0
  try{
    for(const [sequence,stage,activity,nextAction] of [[4,'qa_verifying','running',null],[5,'qa_verifying','terminal','release_verifying'],[6,'release_verifying','running',null],[7,'release_verifying','terminal','awaiting_owner']])
      s.journal.append(scopeJson,JSON.stringify({...s.last,sequence,stage,activity,nextAction,evidenceRef:activity==='terminal'?receipt:null}),sequence-1,time)
    const request=JSON.stringify({...JSON.parse(input),expectedSequence:7,action:'awaiting_owner'})
    const c=create({...s.options,verifyEligibility:async()=>{checks++;return true},dispatch:async()=>{sends++;return ack}})
    assert.equal((await c.runOnce(request)).outcome,'needs_owner');assert.equal(sends,0);assert.equal(checks,0)
    assert.equal(s.db.prepare('SELECT count(*) AS n FROM outcome_work_reservations').get().n,0)
  }finally{s.db.close()}
})
