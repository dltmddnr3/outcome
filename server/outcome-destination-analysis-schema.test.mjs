import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {PGlite} from '@electric-sql/pglite'
test('analysis SQL pins source, enforces one claim and terminal hold, and isolates owners',async()=>{
 const db=await PGlite.create('memory://')
 try{
  await db.exec('create role anon nologin;create role authenticated nologin')
  for(const name of ['20260908011009_outcome_destination_private_drafts.sql','20260908035039_outcome_destination_analysis_requests.sql'])await db.exec(await readFile(new URL(`../supabase/migrations/${name}`,import.meta.url),'utf8'))
  const run=(sql,args=[],account='owner')=>db.transaction(async tx=>{
   await tx.exec('set local role outcome_destination_backend')
   await tx.query("select set_config('outcome.destination_workspace','workspace',true),set_config('outcome.destination_account',$1,true)",[account])
   return tx.query(sql,args)
  })
  const table='outcome_destination_private.analysis_requests'
  await run(`insert into ${table}(workspace_id,account_ref,request_id,draft_id,draft_revision,document_digest,document) values('workspace','owner',$1,$1,1,$2,$3)`,['00000000-0000-4000-8000-000000000001','a'.repeat(64),JSON.stringify({source:'private synthetic source'})])
  assert.equal((await run(`select * from ${table}`,[],'other')).rows.length,0)
  await assert.rejects(()=>run(`update ${table} set document='{}'`),/analysis_source_immutable/)
  const claim=`update ${table} set state='dispatch_started',dispatch_token='00000000-0000-4000-8000-000000000002' where state='queued' returning request_id`
  const claims=await Promise.all([run(claim),run(claim)])
  assert.equal(claims.reduce((n,r)=>n+r.rows.length,0),1)
  await assert.rejects(()=>run(`update ${table} set state='queued',dispatch_token=null`),/analysis_transition_forbidden/)
  await assert.rejects(()=>run(`update ${table} set state='failed',dispatch_token='00000000-0000-4000-8000-000000000003'`),/analysis_transition_forbidden/)
  await run(`update ${table} set state='delivery_unknown'`)
  await assert.rejects(()=>run(`update ${table} set state='dispatch_started'`),/analysis_transition_forbidden/)
  await assert.rejects(()=>run(`delete from ${table}`),/permission denied/)
  for(const role of ['anon','authenticated'])await assert.rejects(()=>db.transaction(async tx=>{await tx.exec(`set local role ${role}`);return tx.query(`select * from ${table}`)}),/permission denied/)
  assert.equal((await run(`select state from ${table}`)).rows[0].state,'delivery_unknown')
 }finally{await db.close()}
})
