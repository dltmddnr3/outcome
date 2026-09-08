import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {PGlite} from '@electric-sql/pglite'

test('discovery retains 200 answers with owner isolation and no completion authority',async()=>{
 const db=await PGlite.create('memory://')
 try {
  await db.exec('create role anon nologin; create role authenticated nologin')
  for(const file of ['20260908011009_outcome_destination_private_drafts.sql','20260908042838_outcome_destination_discovery_drafts.sql'])await db.exec(await readFile(new URL(`../supabase/migrations/${file}`,import.meta.url),'utf8'))
  const scoped=(account,work)=>db.transaction(async tx=>{
   await tx.exec('set local role outcome_destination_backend')
   await tx.query("select set_config('outcome.destination_workspace','workspace',true),set_config('outcome.destination_account',$1,true)",[account])
   return work(tx)
  })
  const id='00000000-0000-4000-8000-000000000001',hash='a'.repeat(64)
  await scoped('owner',tx=>tx.query("insert into outcome_destination_private.drafts values('workspace','owner',$1,1,$1,$2,'{}')",[id,hash]))
  const context={answers:Array.from({length:200},(_,i)=>({questionId:`q-${i}`,gapId:`gap-${i}`,value:'가'.repeat(4000)}))}
  await scoped('owner',tx=>tx.query("insert into outcome_destination_private.discovery_drafts(workspace_id,account_ref,draft_id,revision,intake_revision,last_request_id,request_fingerprint,context_digest,context) values('workspace','owner',$1,1,1,$1,$2,$2,$3)",[id,hash,JSON.stringify(context)]))
  const read=account=>scoped(account,tx=>tx.query('select * from outcome_destination_private.discovery_drafts'))
  const row=(await read('owner')).rows[0]
  assert.deepEqual(row.context,context);assert.equal(row.state,'draft');assert.equal(row.completion_authority,false)
  assert.equal((await read('other')).rows.length,0)
  await assert.rejects(()=>scoped('owner',tx=>tx.query("update outcome_destination_private.discovery_drafts set account_ref='other'")))
  await assert.rejects(()=>scoped('owner',tx=>tx.query("update outcome_destination_private.discovery_drafts set completion_authority=true")))
  await assert.rejects(()=>scoped('owner',tx=>tx.query("update outcome_destination_private.discovery_drafts set state='confirmed'")))
  await assert.rejects(()=>scoped('owner',tx=>tx.query('delete from outcome_destination_private.discovery_drafts')))
  for(const role of ['anon','authenticated'])await assert.rejects(()=>db.transaction(async tx=>{await tx.exec(`set local role ${role}`);return tx.query('select * from outcome_destination_private.discovery_drafts')}))
  assert.deepEqual((await read('owner')).rows[0].context,context)
 }finally{await db.close()}
})
