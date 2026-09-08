import test from 'node:test'
import assert from 'node:assert/strict'
import {DatabaseSync} from 'node:sqlite'
import {mkdtempSync,chmodSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {createWorkJournal} from './outcome-work-journal.mjs'
const scope={projectId:'outcome',workId:'work-a',runId:'run-a',sessionRef:'session-a',bindingVersion:1},scopeJson=JSON.stringify(scope)
const now=20000,commit='a'.repeat(40),tree='b'.repeat(40),authority='c'.repeat(64)
const event=(sequence,change={})=>JSON.stringify({sequence,observedAt:new Date(now-1000+sequence).toISOString(),stage:'queued',attempt:1,activity:'waiting',candidateCommit:null,candidateTree:null,evidenceRef:null,nextAction:null,blocker:null,...change})
const seed=store=>{
  store.append(scopeJson,event(1),0,now)
  store.append(scopeJson,event(2,{stage:'implementing',activity:'running'}),1,now)
  store.append(scopeJson,event(3,{stage:'implementing',activity:'terminal',candidateCommit:commit,candidateTree:tree,evidenceRef:'d'.repeat(64),nextAction:'qa_verifying'}),2,now)
}
const reserve=store=>store.reserveContinuation(scopeJson,3,commit,tree,authority,now)
test('disk journal and reservation survive close/reopen; second connection cannot own same action',()=>{
  const dir=mkdtempSync(join(tmpdir(),'outcome-work-journal-test-'));chmodSync(dir,0o700)
  const path=join(dir,'work.sqlite');let a,b
  try{
    a=new DatabaseSync(path);chmodSync(path,0o600);const first=createWorkJournal(a);seed(first)
    b=new DatabaseSync(path);const second=createWorkJournal(b)
    a.exec('BEGIN IMMEDIATE')
    assert.throws(()=>reserve(second),/^Error: work_journal_unavailable$/)
    a.exec('ROLLBACK')
    assert.equal(reserve(first).outcome,'reserved');assert.equal(reserve(second).outcome,'already_reserved')
    assert.equal(second.read(scopeJson,now).sequence,3)
    a.close();a=null;b.close();b=null
    a=new DatabaseSync(path);const reopened=createWorkJournal(a)
    assert.equal(reserve(reopened).outcome,'already_reserved');assert.equal(reopened.read(scopeJson,now).projection.stage,'implementing')
    assert.equal(a.prepare('SELECT count(*) AS n FROM outcome_work_reservations').get().n,1)
    assert.equal(reserve(reopened).executionAuthority,false)
  }finally{a?.close();b?.close();rmSync(dir,{recursive:true,force:true})}
})
test('stale writer duplicate and conflicting append preserve original journal',()=>{
  const db=new DatabaseSync(':memory:');try{
    const store=createWorkJournal(db);store.append(scopeJson,event(1),0,now)
    assert.throws(()=>store.append(scopeJson,event(2,{stage:'implementing',activity:'running'}),0,now),/work_journal_unavailable/)
    assert.equal(store.append(scopeJson,event(1),1,now).outcome,'already_recorded')
    assert.throws(()=>store.append(scopeJson,event(1,{blocker:'needs_owner'}),1,now),/work_journal_unavailable/)
    assert.equal(store.read(scopeJson,now).sequence,1)
  }finally{db.close()}
})
test('same work cannot silently rotate run session or binding; wrong candidate authority conflict and stale reservation reject',()=>{
  const db=new DatabaseSync(':memory:');try{
    const store=createWorkJournal(db);seed(store)
    for(const key of ['runId','sessionRef','bindingVersion']){
      const altered=JSON.stringify({...scope,[key]:key==='bindingVersion'?2:'other'})
      assert.throws(()=>store.read(altered,now),/work_journal_unavailable/)
      assert.throws(()=>store.append(altered,event(1),0,now),/work_journal_unavailable/)
    }
    assert.throws(()=>store.reserveContinuation(scopeJson,3,'e'.repeat(40),tree,authority,now),/work_journal_unavailable/)
    assert.throws(()=>store.reserveContinuation(scopeJson,3,commit,tree,authority,now+20000),/work_journal_unavailable/)
    assert.equal(db.prepare('SELECT count(*) AS n FROM outcome_work_reservations').get().n,0)
    reserve(store)
    assert.throws(()=>store.reserveContinuation(scopeJson,3,commit,tree,'e'.repeat(64),now),/work_journal_unavailable/)
    assert.equal(reserve(store).outcome,'already_reserved')
  }finally{db.close()}
})
test('stored corruption and errors fail closed without raw private SQL or partial append',()=>{
  const db=new DatabaseSync(':memory:');try{
    const store=createWorkJournal(db);seed(store)
    const before=db.prepare('SELECT journal_json FROM outcome_work_journals').get().journal_json
    assert.throws(()=>store.append(scopeJson,event(4,{stage:'release_verifying',activity:'running',candidateCommit:commit,candidateTree:tree}),3,now),/^Error: work_journal_unavailable$/)
    assert.equal(db.prepare('SELECT journal_json FROM outcome_work_journals').get().journal_json,before)
    db.prepare('UPDATE outcome_work_journals SET sequence=100').run()
    assert.throws(()=>store.read(scopeJson,now),/^Error: work_journal_unavailable$/)
  }finally{db.close()}
})
