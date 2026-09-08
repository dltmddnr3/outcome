import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {PGlite} from '@electric-sql/pglite'
import {createDestinationEvidenceReaders} from './outcome-destination-evidence-reader.mjs'
const scope={workspaceId:'workspace',accountRef:'owner',reviewDigest:'a'.repeat(64)}
const assessment=JSON.stringify({...scope,completionAuthority:false})
async function fixture(){
 const db=await PGlite.create('memory://')
 await db.exec('create role anon nologin;create role authenticated nologin')
 for(const file of ['20260908011009_outcome_destination_private_drafts.sql','20260908075808_outcome_destination_verification_evidence.sql'])await db.exec(await readFile(new URL(`../supabase/migrations/${file}`,import.meta.url),'utf8'))
 await db.query('insert into outcome_destination_private.verification_evidence values($1,$2,$3,$4,$5)',[scope.workspaceId,scope.accountRef,scope.reviewDigest,assessment,JSON.stringify({contract:'exact source',numeric:123})])
 const run=(work,owner=scope.accountRef)=>db.transaction(async tx=>{
  await tx.exec('set local role outcome_destination_backend')
  await tx.query("select set_config('outcome.destination_workspace',$1,true),set_config('outcome.destination_account',$2,true)",[scope.workspaceId,owner])
  return work((sql,args)=>tx.query(sql,args))
 })
 return {db,run}
}
test('evidence reader returns exact owner/review bytes and rejects missing, foreign and non-text sources',async()=>{
 const f=await fixture();try{
  await f.run(async query=>{
   const readers=createDestinationEvidenceReaders({query})
   assert.equal(await readers.readAssessment(scope),assessment)
   assert.equal(await readers.readSource({...scope,ref:'contract'}),'exact source')
   for(const input of [{...scope,ref:'missing'},{...scope,ref:'numeric'},{...scope,ref:'../file'},{...scope,ref:'contract',reviewDigest:'b'.repeat(64)},{...scope,ref:'contract',accountRef:'other'}])await assert.rejects(()=>readers.readSource(input),/destination_evidence_unavailable/)
  })
  await f.run(async query=>{await assert.rejects(()=>createDestinationEvidenceReaders({query}).readAssessment(scope),/destination_evidence_unavailable/)},'other')
  const rows=await f.db.transaction(async tx=>{await tx.exec('set local role outcome_destination_backend');return tx.query('select * from outcome_destination_private.verification_evidence')})
  assert.equal(rows.rows.length,0)
  const flags=(await f.db.query("select relrowsecurity,relforcerowsecurity from pg_class where oid='outcome_destination_private.verification_evidence'::regclass")).rows[0]
  assert.deepEqual(flags,{relrowsecurity:true,relforcerowsecurity:true})
 }finally{await f.db.close()}
})
test('web runtime cannot publish, overwrite or delete evidence; client roles cannot read it',async()=>{
 const f=await fixture();try{
  for(const sql of ["insert into outcome_destination_private.verification_evidence select * from outcome_destination_private.verification_evidence","update outcome_destination_private.verification_evidence set sources='{}'","delete from outcome_destination_private.verification_evidence"]){
   await assert.rejects(()=>f.run(query=>query(sql)),error=>error.code==='42501')
  }
  for(const role of ['anon','authenticated'])await assert.rejects(()=>f.db.transaction(async tx=>{await tx.exec(`set local role ${role}`);return tx.query('select * from outcome_destination_private.verification_evidence')}),error=>error.code==='42501')
  assert.equal(Number((await f.db.query('select count(*) n from outcome_destination_private.verification_evidence')).rows[0].n),1)
  await assert.rejects(()=>f.db.query('insert into outcome_destination_private.verification_evidence values($1,$2,$3,$4,$5)',[scope.workspaceId,'different',scope.reviewDigest,assessment,'{}']))
 }finally{await f.db.close()}
})
test('reader aborts without calls and redacts failures and oversized output',async()=>{
 let calls=0
 const controller=new AbortController();controller.abort()
 const readers=createDestinationEvidenceReaders({query:async()=>{calls++;throw Error('private database details')}})
 await assert.rejects(()=>readers.readAssessment({...scope,signal:controller.signal}),/^Error: destination_evidence_unavailable$/)
 assert.equal(calls,0)
 await assert.rejects(()=>readers.readAssessment(scope),/^Error: destination_evidence_unavailable$/);assert.equal(calls,1)
 for(const content of [null,{},'x'.repeat(131073)])await assert.rejects(()=>createDestinationEvidenceReaders({query:async()=>({rows:[{content}]})}).readAssessment(scope),/destination_evidence_unavailable/)
})
