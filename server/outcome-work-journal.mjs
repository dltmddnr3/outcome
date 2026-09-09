import {createHash} from 'node:crypto'
import {projectSingleSessionWork} from './outcome-work-observer.mjs'
import {verifyWorkExecutionGrant} from './outcome-work-execution-grant.mjs'
import {verifyStoredWorkStageReceipt} from './outcome-work-stage-receipt.mjs'

const digest = text => createHash('sha256').update(text).digest('hex')
const fail = () => {throw new Error('work_journal_unavailable')}
const sha = (value,length) => typeof value==='string' && new RegExp(`^[a-f0-9]{${length}}$`).test(value)
const scopeKeys=['projectId','workId','runId','sessionRef','bindingVersion']
const eventKeys=['sequence','observedAt','stage','attempt','activity','candidateCommit','candidateTree','evidenceRef','nextAction','blocker']
const initialEvent=last=>last?.stage==='queued'&&last.activity==='waiting'&&last.blocker===null&&last.nextAction===null
const actionFor=(scopeJson,last,commit,tree,authority)=>[scopeJson,last.stage,last.attempt,initialEvent(last)?'implementing':last.nextAction,initialEvent(last)?commit:last.candidateCommit,initialEvent(last)?tree:last.candidateTree,authority]
const dispatchable=(last,projection)=>initialEvent(last)?projection.freshness==='fresh':last?.activity==='terminal'&&projection.continuation==='next_action_recorded'

// Explicit local companion composition only. The caller owns a dedicated,
// protected SQLite connection and its lifetime; no path, daemon or network default.
export function createWorkJournal(db) {
  const guarded=operation=>{try{return operation()}catch{fail()}}
  const transact=operation=>guarded(()=>{
    db.exec('BEGIN IMMEDIATE')
    try {const result=operation();db.exec('COMMIT');return result}
    catch(error){try{db.exec('ROLLBACK')}catch{};throw error}
  })
  transact(()=>db.exec(`
    CREATE TABLE IF NOT EXISTS outcome_work_journals (
      project_id TEXT NOT NULL, work_id TEXT NOT NULL, scope_json TEXT NOT NULL,
      sequence INTEGER NOT NULL, journal_json TEXT NOT NULL,
      PRIMARY KEY(project_id,work_id)
    ) STRICT;
    CREATE TABLE IF NOT EXISTS outcome_work_reservations (
      project_id TEXT NOT NULL, work_id TEXT NOT NULL, stage TEXT NOT NULL,
      attempt INTEGER NOT NULL, reservation_digest TEXT NOT NULL,
      action_json TEXT NOT NULL, PRIMARY KEY(project_id,work_id,stage,attempt)
    ) STRICT;
    CREATE TABLE IF NOT EXISTS outcome_work_dispatches (
      reservation_digest TEXT PRIMARY KEY, state TEXT NOT NULL
        CHECK(state IN ('dispatch_started','acknowledged','delivery_unknown')),
      receipt_digest TEXT
    ) STRICT;
    CREATE TABLE IF NOT EXISTS outcome_work_execution_claims (
      reservation_digest TEXT PRIMARY KEY, owner_ref TEXT NOT NULL,
      claimed_at INTEGER NOT NULL
    ) STRICT;
    CREATE TABLE IF NOT EXISTS outcome_work_activity (
      reservation_digest TEXT PRIMARY KEY, observation_json TEXT NOT NULL
    ) STRICT;
    CREATE TABLE IF NOT EXISTS outcome_work_starts (
      reservation_digest TEXT PRIMARY KEY, sequence INTEGER NOT NULL, source_digest TEXT NOT NULL
    ) STRICT;
  `))
  const normalize=(scopeJson,nowMs)=>{
    if(typeof scopeJson!=='string' || Buffer.byteLength(scopeJson)>2048) fail()
    const scope=JSON.parse(scopeJson)
    const empty=JSON.stringify({schemaVersion:1,scope,events:[]})
    projectSingleSessionWork(empty,scopeJson,nowMs)
    return {scope,scopeJson:JSON.stringify(Object.fromEntries(scopeKeys.map(key=>[key,scope[key]])))}
  }
  const load=(bound,nowMs)=>{
    const row=db.prepare('SELECT scope_json,sequence,journal_json FROM outcome_work_journals WHERE project_id=? AND work_id=?').get(bound.scope.projectId,bound.scope.workId)
    if(!row) return {sequence:0,journal:{schemaVersion:1,scope:bound.scope,events:[]}}
    if(row.scope_json!==bound.scopeJson) fail() // Rotation needs an explicit future CAS, never implicit replacement.
    projectSingleSessionWork(row.journal_json,bound.scopeJson,nowMs)
    const journal=JSON.parse(row.journal_json)
    if(journal.events.length!==row.sequence || journal.events.some((event,index)=>event.sequence!==index+1)) fail()
    return {sequence:row.sequence,journal}
  }
  const reservation=(bound,reservationDigest)=>{
    if(!sha(reservationDigest,64)) fail()
    const row=db.prepare('SELECT action_json FROM outcome_work_reservations WHERE project_id=? AND work_id=? AND reservation_digest=?')
      .get(bound.scope.projectId,bound.scope.workId,reservationDigest)
    if(!row || digest(row.action_json)!==reservationDigest) fail()
    const action=JSON.parse(row.action_json)
    if(!Array.isArray(action)||action.length!==7||action[0]!==bound.scopeJson||!sha(action[6],64)) fail()
    return action
  }
  return Object.freeze({
    recordVerifiedTerminal(scopeJson,reservationDigest,ownerRef,receiptDirectory,expectedJson,nowMs){return transact(()=>{
      const bound=normalize(scopeJson,nowMs),current=load(bound,nowMs),action=reservation(bound,reservationDigest)
      const claim=db.prepare('SELECT owner_ref FROM outcome_work_execution_claims WHERE reservation_digest=?').get(reservationDigest)
      const start=db.prepare('SELECT sequence FROM outcome_work_starts WHERE reservation_digest=?').get(reservationDigest)
      if(!sha(ownerRef,64)||claim?.owner_ref!==ownerRef||!start||!verifyStoredWorkStageReceipt(receiptDirectory,expectedJson).matches)fail()
      const expected=JSON.parse(expectedJson),first=current.journal.events[start.sequence-1],last=current.journal.events.at(-1)
      if(expected.projectId!==bound.scope.projectId||expected.workId!==bound.scope.workId||expected.runId!==bound.scope.runId
        ||expected.stage!==action[3]||expected.verificationMode!=='same-session verification'||!first||first.stage!==action[3]
        ||last.stage!==first.stage||last.attempt!==first.attempt)fail()
      if(action[3]!=='implementing'&&(expected.candidateCommit!==action[4]||expected.candidateTree!==action[5]))fail()
      const grant=db.prepare('SELECT grant_json,owner_ref,revoked_at FROM outcome_execution_grants WHERE digest=?').get(action[6])
      const grantExpected=JSON.stringify({...bound.scope,ownerRef,candidateCommit:action[4],candidateTree:action[5],authorityRef:action[6],action:action[3],status:'active'})
      if(!grant||grant.owner_ref!==ownerRef||grant.revoked_at!==null||!verifyWorkExecutionGrant(grant.grant_json,grantExpected,nowMs).matches)fail()
      const nextAction={implementing:'qa_verifying',qa_verifying:'release_verifying',release_verifying:'awaiting_owner'}[action[3]]
      if(last.activity==='terminal'){
        if(last.evidenceRef!==expected.digest||last.candidateCommit!==expected.candidateCommit||last.candidateTree!==expected.candidateTree||last.nextAction!==nextAction)fail()
        return Object.freeze({outcome:'terminal_already_recorded',executionAuthority:false,completionAuthority:false})
      }
      const row=db.prepare('SELECT observation_json FROM outcome_work_activity WHERE reservation_digest=?').get(reservationDigest)
      if(!row)fail()
      const observation=JSON.parse(row.observation_json)
      if(observation.activity!=='terminal'||observation.providerStatus!=='completed'||last.activity!=='running')fail()
      const event={sequence:current.sequence+1,observedAt:new Date(nowMs).toISOString(),stage:last.stage,attempt:last.attempt,activity:'terminal',
        candidateCommit:expected.candidateCommit,candidateTree:expected.candidateTree,evidenceRef:expected.digest,nextAction,blocker:null}
      const next={...current.journal,events:[...current.journal.events,event]}
      projectSingleSessionWork(JSON.stringify(next),bound.scopeJson,nowMs)
      if(db.prepare('UPDATE outcome_work_journals SET sequence=?,journal_json=? WHERE project_id=? AND work_id=? AND sequence=?')
        .run(event.sequence,JSON.stringify(next),bound.scope.projectId,bound.scope.workId,current.sequence).changes!==1)fail()
      return Object.freeze({outcome:'terminal_recorded',executionAuthority:false,completionAuthority:false})
    })},
    recordObservedStart(scopeJson,reservationDigest,ownerRef,nowMs){return transact(()=>{
      const bound=normalize(scopeJson,nowMs),current=load(bound,nowMs),action=reservation(bound,reservationDigest)
      const claim=db.prepare('SELECT owner_ref FROM outcome_work_execution_claims WHERE reservation_digest=?').get(reservationDigest)
      if(!sha(ownerRef,64)||claim?.owner_ref!==ownerRef)fail()
      const old=db.prepare('SELECT sequence,source_digest FROM outcome_work_starts WHERE reservation_digest=?').get(reservationDigest)
      if(old){
        if(!Number.isSafeInteger(old.sequence)||old.sequence<1||old.sequence>current.sequence||!sha(old.source_digest,64))fail()
        return Object.freeze({outcome:'start_already_recorded',executionAuthority:false,completionAuthority:false})
      }
      const row=db.prepare('SELECT observation_json FROM outcome_work_activity WHERE reservation_digest=?').get(reservationDigest)
      if(!row)fail()
      const observation=JSON.parse(row.observation_json),last=current.journal.events.at(-1)
      if(observation.activity!=='running'||observation.providerStatus!=='inProgress'||!sha(observation.sourceDigest,64)
        ||JSON.stringify(actionFor(bound.scopeJson,last,action[4],action[5],action[6]))!==JSON.stringify(action)
        ||!(initialEvent(last)||last?.activity==='terminal'&&last.blocker===null))fail()
      const event={sequence:current.sequence+1,observedAt:observation.observedAt,stage:action[3],
        attempt:action[2]+(action[1]!=='queued'&&action[3]==='implementing'?1:0),activity:'running',
        candidateCommit:action[3]==='implementing'?null:action[4],candidateTree:action[3]==='implementing'?null:action[5],evidenceRef:null,nextAction:null,blocker:null}
      const next={...current.journal,events:[...current.journal.events,event]}
      projectSingleSessionWork(JSON.stringify(next),bound.scopeJson,nowMs)
      const updated=db.prepare('UPDATE outcome_work_journals SET sequence=?,journal_json=? WHERE project_id=? AND work_id=? AND sequence=?')
        .run(event.sequence,JSON.stringify(next),bound.scope.projectId,bound.scope.workId,current.sequence)
      if(updated.changes!==1)fail()
      db.prepare('INSERT INTO outcome_work_starts VALUES(?,?,?)').run(reservationDigest,event.sequence,observation.sourceDigest)
      return Object.freeze({outcome:'start_recorded',executionAuthority:false,completionAuthority:false})
    })},
    readObservationRequest(scopeJson,reservationDigest,ownerRef,nowMs){return guarded(()=>{
      const bound=normalize(scopeJson,nowMs);load(bound,nowMs)
      const action=reservation(bound,reservationDigest)
      const claim=db.prepare('SELECT owner_ref FROM outcome_work_execution_claims WHERE reservation_digest=?').get(reservationDigest)
      if(!sha(ownerRef,64)||claim?.owner_ref!==ownerRef)fail()
      return Object.freeze({scopeJson:bound.scopeJson,candidateCommit:action[4],candidateTree:action[5],authorityRef:action[6],action:action[3],reservationDigest})
    })},
    recordActivity(scopeJson,reservationDigest,ownerRef,observationJson,nowMs){return transact(()=>{
      const bound=normalize(scopeJson,nowMs);load(bound,nowMs);reservation(bound,reservationDigest)
      const claim=db.prepare('SELECT owner_ref FROM outcome_work_execution_claims WHERE reservation_digest=?').get(reservationDigest)
      if(!sha(ownerRef,64)||claim?.owner_ref!==ownerRef||typeof observationJson!=='string'||Buffer.byteLength(observationJson)>2048)fail()
      const value=JSON.parse(observationJson),keys=['outcome','activity','providerStatus','observedAt','terminalAt','sourceDigest','turnRef','executionAuthority','completionAuthority']
      if(!value||Array.isArray(value)||Object.keys(value).length!==keys.length||!keys.every(k=>Object.hasOwn(value,k))
        ||value.outcome!=='observed'||value.executionAuthority!==false||value.completionAuthority!==false||!sha(value.sourceDigest,64)||!sha(value.turnRef,64))fail()
      const observed=Date.parse(value.observedAt),terminal=value.activity==='terminal'
      if(!Number.isFinite(observed)||new Date(observed).toISOString()!==value.observedAt||observed>nowMs
        ||(!terminal&&(value.activity!=='running'||value.providerStatus!=='inProgress'||value.terminalAt!==null))
        ||(terminal&&(!['completed','failed','interrupted'].includes(value.providerStatus)||!Number.isFinite(Date.parse(value.terminalAt))||new Date(Date.parse(value.terminalAt)).toISOString()!==value.terminalAt||Date.parse(value.terminalAt)>observed)))fail()
      const previous=db.prepare('SELECT observation_json FROM outcome_work_activity WHERE reservation_digest=?').get(reservationDigest)
      if(previous){
        const old=JSON.parse(previous.observation_json)
        if(old.turnRef!==value.turnRef||Date.parse(old.observedAt)>observed||old.activity==='terminal'&&(value.activity!=='terminal'||value.providerStatus!==old.providerStatus||value.terminalAt!==old.terminalAt))fail()
        if(old.sourceDigest===value.sourceDigest){
          if(keys.filter(k=>k!=='observedAt').some(k=>old[k]!==value[k]))fail()
          return Object.freeze({outcome:'already_observed',executionAuthority:false,completionAuthority:false})
        }
      }
      db.prepare('INSERT INTO outcome_work_activity VALUES(?,?) ON CONFLICT(reservation_digest) DO UPDATE SET observation_json=excluded.observation_json').run(reservationDigest,JSON.stringify(Object.fromEntries(keys.map(k=>[k,value[k]]))))
      return Object.freeze({outcome:'observation_recorded',executionAuthority:false,completionAuthority:false})
    })},
    // Caller authenticates current owner and verifies current binding/dependencies/
    // receipt coverage first. Claim is not start evidence or a mutation capability.
    // Grant store MUST share this database; no cross-database fallback is allowed.
    claimContinuationExecution(scopeJson,expectedSequence,reservationDigest,ownerRef,nowMs,expectedAuthorityRef){return transact(()=>{
      if(!sha(ownerRef,64)||!Number.isSafeInteger(nowMs)||nowMs<0)fail()
      const bound=normalize(scopeJson,nowMs),current=load(bound,nowMs),last=current.journal.events.at(-1),action=reservation(bound,reservationDigest)
      if(!sha(expectedAuthorityRef,64)||action[6]!==expectedAuthorityRef)fail()
      const projection=projectSingleSessionWork(JSON.stringify(current.journal),bound.scopeJson,nowMs)
      if(current.sequence!==expectedSequence||!dispatchable(last,projection)||(!initialEvent(last)&&!sha(last.evidenceRef,64))
        ||JSON.stringify(actionFor(bound.scopeJson,last,action[4],action[5],action[6]))!==JSON.stringify(action))fail()
      const delivery=db.prepare('SELECT state FROM outcome_work_dispatches WHERE reservation_digest=?').get(reservationDigest)
      if(!delivery||!['dispatch_started','acknowledged'].includes(delivery.state))fail()
      const grant=db.prepare('SELECT grant_json,owner_ref,revoked_at FROM outcome_execution_grants WHERE digest=?').get(action[6])
      if(!grant||grant.owner_ref!==ownerRef||grant.revoked_at!==null)fail()
      const expected=JSON.stringify({...bound.scope,ownerRef,candidateCommit:action[4],candidateTree:action[5],authorityRef:action[6],action:action[3],status:'active'})
      if(!verifyWorkExecutionGrant(grant.grant_json,expected,nowMs).matches)fail()
      const old=db.prepare('SELECT owner_ref FROM outcome_work_execution_claims WHERE reservation_digest=?').get(reservationDigest)
      if(old&&old.owner_ref!==ownerRef)fail()
      if(!old)db.prepare('INSERT INTO outcome_work_execution_claims VALUES(?,?,?)').run(reservationDigest,ownerRef,nowMs)
      return Object.freeze({outcome:old?'already_claimed':'claimed',completionAuthority:false,executionAuthority:false})
    })},
    readTerminal(scopeJson,nowMs){return guarded(()=>{
      const bound=normalize(scopeJson,nowMs),current=load(bound,nowMs),last=current.journal.events.at(-1)
      if(!last||last.activity!=='terminal')fail()
      return Object.freeze({sequence:current.sequence,...last})
    })},
    readDispatchSource(scopeJson,nowMs){return guarded(()=>{
      const bound=normalize(scopeJson,nowMs),current=load(bound,nowMs),last=current.journal.events.at(-1)
      const projection=projectSingleSessionWork(JSON.stringify(current.journal),bound.scopeJson,nowMs)
      if(!dispatchable(last,projection))fail()
      return Object.freeze({sequence:current.sequence,...last,initial:initialEvent(last)})
    })},
    read(scopeJson,nowMs){return guarded(()=>{
      const bound=normalize(scopeJson,nowMs),current=load(bound,nowMs)
      return Object.freeze({sequence:current.sequence,projection:projectSingleSessionWork(JSON.stringify(current.journal),bound.scopeJson,nowMs)})
    })},
    append(scopeJson,eventJson,expectedSequence,nowMs){return transact(()=>{
      if(!Number.isSafeInteger(expectedSequence)||expectedSequence<0 || typeof eventJson!=='string'||Buffer.byteLength(eventJson)>2048) fail()
      const bound=normalize(scopeJson,nowMs),current=load(bound,nowMs),event=JSON.parse(eventJson)
      if(current.sequence!==expectedSequence) fail()
      const next={...current.journal,events:[...current.journal.events,event]}
      projectSingleSessionWork(JSON.stringify(next),bound.scopeJson,nowMs)
      if(event.sequence<=current.sequence) return Object.freeze({outcome:'already_recorded',sequence:current.sequence})
      // Canonical primitive key order avoids mutation from property-order-only replay.
      next.events[next.events.length-1]=Object.fromEntries(eventKeys.map(key=>[key,event[key]]))
      db.prepare(`INSERT INTO outcome_work_journals(project_id,work_id,scope_json,sequence,journal_json)
        VALUES(?,?,?,?,?) ON CONFLICT(project_id,work_id) DO UPDATE SET sequence=excluded.sequence,journal_json=excluded.journal_json`)
        .run(bound.scope.projectId,bound.scope.workId,bound.scopeJson,event.sequence,JSON.stringify(next))
      return Object.freeze({outcome:'recorded',sequence:event.sequence})
    })},
    // A durable reservation prevents repeated dispatch ownership. It is NOT a
    // dispatch receipt or authority proof; a controller must still verify both.
    reserveContinuation(scopeJson,expectedSequence,candidateCommit,candidateTree,authorityRef,nowMs){return transact(()=>{
      if(!Number.isSafeInteger(expectedSequence)||expectedSequence<1 || !sha(candidateCommit,40)||!sha(candidateTree,40)||!sha(authorityRef,64)) fail()
      const bound=normalize(scopeJson,nowMs),current=load(bound,nowMs),last=current.journal.events.at(-1)
      const projection=projectSingleSessionWork(JSON.stringify(current.journal),bound.scopeJson,nowMs)
      if(current.sequence!==expectedSequence || !dispatchable(last,projection)
        || !initialEvent(last)&&(last.candidateCommit!==candidateCommit || last.candidateTree!==candidateTree)) fail()
      if(['qa_verifying','release_verifying'].includes(last.nextAction) && !sha(last.evidenceRef,64)) fail()
      const actionJson=JSON.stringify(actionFor(bound.scopeJson,last,candidateCommit,candidateTree,authorityRef))
      const reservationDigest=digest(actionJson)
      const existing=db.prepare('SELECT reservation_digest,action_json FROM outcome_work_reservations WHERE project_id=? AND work_id=? AND stage=? AND attempt=?')
        .get(bound.scope.projectId,bound.scope.workId,last.stage,last.attempt)
      if(existing && (existing.reservation_digest!==reservationDigest || existing.action_json!==actionJson)) fail()
      if(!existing) db.prepare('INSERT INTO outcome_work_reservations VALUES(?,?,?,?,?,?)').run(bound.scope.projectId,bound.scope.workId,last.stage,last.attempt,reservationDigest,actionJson)
      return Object.freeze({outcome:existing?'already_reserved':'reserved',reservationDigest,completionAuthority:false,executionAuthority:false})
    })},
    beginContinuationDispatch(scopeJson,expectedSequence,reservationDigest,nowMs){return transact(()=>{
      const bound=normalize(scopeJson,nowMs),current=load(bound,nowMs),action=reservation(bound,reservationDigest),last=current.journal.events.at(-1)
      const projection=projectSingleSessionWork(JSON.stringify(current.journal),bound.scopeJson,nowMs)
      if(current.sequence!==expectedSequence || !dispatchable(last,projection) || last.nextAction==='awaiting_owner'
        || JSON.stringify(actionFor(bound.scopeJson,last,action[4],action[5],action[6]))!==JSON.stringify(action)) fail()
      if(['qa_verifying','release_verifying'].includes(last.nextAction) && !sha(last.evidenceRef,64)) fail()
      const existing=db.prepare('SELECT state FROM outcome_work_dispatches WHERE reservation_digest=?').get(reservationDigest)
      if(existing) return Object.freeze({outcome:'already_started'})
      db.prepare("INSERT INTO outcome_work_dispatches VALUES(?,'dispatch_started',NULL)").run(reservationDigest)
      return Object.freeze({outcome:'dispatch_started'})
    })},
    readContinuationDispatch(scopeJson,reservationDigest,nowMs){return guarded(()=>{
      const bound=normalize(scopeJson,nowMs);load(bound,nowMs);reservation(bound,reservationDigest)
      const row=db.prepare('SELECT state,receipt_digest FROM outcome_work_dispatches WHERE reservation_digest=?').get(reservationDigest)
      if(!row) return Object.freeze({state:'reserved',receiptDigest:null})
      if(!['dispatch_started','acknowledged','delivery_unknown'].includes(row.state)
        || (row.state==='acknowledged'?!sha(row.receipt_digest,64):row.receipt_digest!==null)) fail()
      return Object.freeze({state:row.state,receiptDigest:row.receipt_digest})
    })},
    recordContinuationResult(scopeJson,reservationDigest,state,receiptDigest,nowMs){return transact(()=>{
      if(!['acknowledged','delivery_unknown'].includes(state)||(state==='acknowledged'?!sha(receiptDigest,64):receiptDigest!==null)) fail()
      const bound=normalize(scopeJson,nowMs);load(bound,nowMs);reservation(bound,reservationDigest)
      const row=db.prepare('SELECT state,receipt_digest FROM outcome_work_dispatches WHERE reservation_digest=?').get(reservationDigest)
      if(!row || row.state!=='dispatch_started' && (row.state!==state||row.receipt_digest!==receiptDigest)) fail()
      if(row.state==='dispatch_started') db.prepare('UPDATE outcome_work_dispatches SET state=?,receipt_digest=? WHERE reservation_digest=? AND state=\'dispatch_started\'')
        .run(state,receiptDigest,reservationDigest)
      return Object.freeze({state,receiptDigest})
    })},
  })
}
