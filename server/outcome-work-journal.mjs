import {createHash} from 'node:crypto'
import {projectSingleSessionWork} from './outcome-work-observer.mjs'

const digest = text => createHash('sha256').update(text).digest('hex')
const fail = () => {throw new Error('work_journal_unavailable')}
const sha = (value,length) => typeof value==='string' && new RegExp(`^[a-f0-9]{${length}}$`).test(value)
const scopeKeys=['projectId','workId','runId','sessionRef','bindingVersion']
const eventKeys=['sequence','observedAt','stage','attempt','activity','candidateCommit','candidateTree','evidenceRef','nextAction','blocker']

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
  return Object.freeze({
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
      if(current.sequence!==expectedSequence || projection.continuation!=='next_action_recorded'
        || last?.activity!=='terminal' || last.candidateCommit!==candidateCommit || last.candidateTree!==candidateTree) fail()
      const actionJson=JSON.stringify([bound.scopeJson,last.stage,last.attempt,last.nextAction,candidateCommit,candidateTree,authorityRef])
      const reservationDigest=digest(actionJson)
      const existing=db.prepare('SELECT reservation_digest,action_json FROM outcome_work_reservations WHERE project_id=? AND work_id=? AND stage=? AND attempt=?')
        .get(bound.scope.projectId,bound.scope.workId,last.stage,last.attempt)
      if(existing && (existing.reservation_digest!==reservationDigest || existing.action_json!==actionJson)) fail()
      if(!existing) db.prepare('INSERT INTO outcome_work_reservations VALUES(?,?,?,?,?,?)').run(bound.scope.projectId,bound.scope.workId,last.stage,last.attempt,reservationDigest,actionJson)
      return Object.freeze({outcome:existing?'already_reserved':'reserved',reservationDigest,completionAuthority:false,executionAuthority:false})
    })},
  })
}
