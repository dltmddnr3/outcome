import test from 'node:test'
import assert from 'node:assert/strict'
import {DatabaseSync} from 'node:sqlite'
import {mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {createWorkGrantStore as create} from './outcome-work-grant-store.mjs'
const owner='a'.repeat(64),grant=JSON.stringify({schemaVersion:1,projectId:'outcome',workId:'w',runId:'r',sessionRef:'s',bindingVersion:1,ownerRef:owner,candidateCommit:'b'.repeat(40),candidateTree:'c'.repeat(40),allowedStages:['qa_verifying'],issuedAt:100,expiresAt:300})
test('disk restart retains approval and irreversible same-grant revocation',()=>{
  const dir=mkdtempSync(join(tmpdir(),'outcome-grant-test-'));let db
  try{
    db=new DatabaseSync(join(dir,'test.sqlite'));let store=create(db)
    const first=store.record(grant,owner,150)
    assert.equal(first.status,'active');assert.equal(store.record(grant,owner,150).authorityRef,first.authorityRef)
    db.close();db=new DatabaseSync(join(dir,'test.sqlite'));store=create(db)
    assert.equal(JSON.parse(store.read(first.authorityRef,owner)).status,'active')
    store.revoke(first.authorityRef,owner,160);db.close()
    db=new DatabaseSync(join(dir,'test.sqlite'));store=create(db)
    assert.equal(JSON.parse(store.read(first.authorityRef,owner)).status,'revoked')
    assert.equal(store.record(grant,owner,170).status,'revoked')
    store.revoke(first.authorityRef,owner,180)
    assert.equal(db.prepare('SELECT revoked_at FROM outcome_execution_grants').get().revoked_at,160)
  }finally{db?.close();rmSync(dir,{recursive:true,force:true})}
})
test('wrong owner, expired or malformed grant, missing row and tampered content fail closed',()=>{
  const db=new DatabaseSync(':memory:');const store=create(db)
  try{
    for(const [raw,actor,time] of [[grant,'d'.repeat(64),150],[grant,owner,300],['{}',owner,150],['x'.repeat(8193),owner,150]])assert.throws(()=>store.record(raw,actor,time),/execution_grant_unavailable/)
    const {authorityRef}=store.record(grant,owner,150)
    assert.throws(()=>store.read(authorityRef,'d'.repeat(64)))
    assert.throws(()=>store.revoke(authorityRef,'d'.repeat(64),160))
    assert.throws(()=>store.read('f'.repeat(64),owner))
    assert.equal(JSON.parse(store.read(authorityRef,owner)).status,'active')
    db.prepare('UPDATE outcome_execution_grants SET grant_json=?').run('{}')
    assert.throws(()=>store.read(authorityRef,owner),/execution_grant_unavailable/)
  }finally{db.close()}
})
