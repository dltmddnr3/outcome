import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { PGlite } from '@electric-sql/pglite'
import { createDecisionPostgresStore } from './outcome-decision-postgres.mjs'
import { createDecisionRecordService } from './outcome-decision-record.mjs'
import { createDecisionRuntime } from './outcome-decision-runtime.mjs'
import { createOutcomeServer } from './index.mjs'
import { createAccountModelV2Projection } from './account-model-v2-projection.mjs'
import { once } from 'node:events'

test('real SQL decision store preserves replay and history across service reconstruction under backend role', async () => {
  const db = await PGlite.create('memory://')
  try {
    await db.exec("create role anon nologin; create role authenticated nologin; create schema auth; create function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;")
    for (const file of ['202608250001_account_access_foundation.sql','202609040001_decision_records.sql']) await db.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8'))
    await db.exec("insert into outcome_private.workspaces(id,state) values('workspace-a','active'),('workspace-b','active'); insert into outcome_private.projects(id,package_id,state) values('outcome','outcome','active'); insert into outcome_private.project_bindings(workspace_id,project_id,state) values('workspace-a','outcome','active'),('workspace-b','outcome','active');")
    const transact = (work) => db.transaction(async (tx) => {
      await tx.exec('set local role outcome_decision_backend')
      return work({ query: (sql, args) => tx.query(sql, args) })
    })
    const make = (workspaceId) => createDecisionRecordService({ store: createDecisionPostgresStore({ transact, workspaceId, projectId: 'outcome' }) })
    const input = { actorSubject:'owner',workspaceId:'workspace-a',decision:'approved',rejectionReason:null,nonce:'nonce-value-that-is-long-enough-123',sourcePrecondition:'revision',currentSourcePrecondition:'revision',target:{projectId:'outcome',state:'blocked',eventId:'event-blocked',sequence:7,role:'planner',status:'safe_hold',sourceRevision:'a'.repeat(64)} }
    const first = await make('workspace-a').record(input)
    assert.equal(first.status,201)
    assert.deepEqual(await make('workspace-a').record(input),first)
    const other = await make('workspace-b').record({...input,workspaceId:'workspace-b'})
    assert.equal(other.status,201)
    assert.notEqual(other.body.decisionId,first.body.decisionId)
    const history = await make('workspace-a').list({actorSubject:'owner',workspaceId:'workspace-a'})
    assert.deepEqual(history.body.decisions,[first.body])
    const withdrawal = {actorSubject:'owner',workspaceId:'workspace-a',projectId:'outcome',decisionId:first.body.decisionId,nonce:'withdrawal-nonce-that-is-long-enough-123',sourcePrecondition:'revision',currentSourcePrecondition:'revision'}
    assert.equal((await make('workspace-a').withdraw(withdrawal)).status,201)
    const refreshed = await make('workspace-a').history({actorSubject:'owner',workspaceId:'workspace-a',projectIds:['outcome']})
    assert.deepEqual(refreshed.body.decisions,[{receipt:first.body,target:{projectId:'outcome',eventId:'event-blocked',sequence:7},withdrawn:true}])
    assert.equal((await make('workspace-b').withdraw({...withdrawal,workspaceId:'workspace-b'})).status,409)
    assert.equal((await db.query('select count(*)::int n from outcome_private.decision_records')).rows[0].n,2)
    assert.equal((await db.query('select count(*)::int n from outcome_private.decision_tombstones')).rows[0].n,1)
    await assert.rejects(() => make('workspace-b').record({...input,nonce:'another-nonce-that-is-long-enough-123'}),/decision_store_unavailable/)
    await assert.rejects(() => transact(({query}) => query('delete from outcome_private.decision_records')),/permission denied/)
    const failingTransact = (work) => transact(({query}) => work({ query: (sql,args) => {
      if (sql.startsWith('insert into outcome_private.decision_audit')) throw new Error('synthetic audit failure')
      return query(sql,args)
    } }))
    const failing = createDecisionRecordService({store:createDecisionPostgresStore({transact:failingTransact,workspaceId:'workspace-a',projectId:'outcome'})})
    await assert.rejects(() => failing.record({...input,nonce:'rollback-nonce-that-is-long-enough-123',target:{...input.target,eventId:'event-next',sequence:8}}),/decision_store_unavailable/)
    assert.equal((await db.query('select count(*)::int n from outcome_private.decision_records')).rows[0].n,2)
    assert.equal((await db.query('select count(*)::int n from outcome_private.decision_request_replay')).rows[0].n,3)
    const runtime=createDecisionRuntime({transact,allowedOrigin:'https://preview.invalid',csrfSecret:'synthetic-csrf-token'})
    const recorded=await runtime.service.record({...input,nonce:'runtime-nonce-that-is-long-enough-123',target:{...input.target,eventId:'event-runtime',sequence:9}})
    assert.equal(recorded.status,201)
    const reconstructed=createDecisionRuntime({transact,allowedOrigin:'https://preview.invalid',csrfSecret:'synthetic-csrf-token'})
    const runtimeHistory=await reconstructed.service.history({actorSubject:'owner',workspaceId:'workspace-a',projectIds:['outcome']})
    assert.deepEqual(runtimeHistory.body.decisions.map(entry=>[entry.target.eventId,entry.withdrawn]),[['event-blocked',true],['event-runtime',false]])
    assert.deepEqual((await reconstructed.service.history({actorSubject:'owner',workspaceId:'workspace-b',projectIds:['outcome']})).body.decisions.map(entry=>entry.target.eventId),['event-blocked'])
    const projection=createAccountModelV2Projection({project:{id:'outcome',name:'OUTCOME',outcome:'safe result'},blocked:true,events:[{id:'event-http',sequence:10,role:'planner',type:'result_observed',summary:'검토 필요',observedAt:'2026-09-08T00:00:00.000Z',status:'safe_hold'}]},{observedAt:'2026-09-08T00:00:00.000Z'})
    const identity={authenticate:async token=>{if(token!=='valid')throw Error('invalid');return {subject:'owner'}},readWorkspace:async()=>({workspace:{id:'workspace-a'},projects:[{project:{id:'outcome'},modelV2:projection}],completionAuthority:false})}
    const http=createOutcomeServer({publicReadOnly:true,accountAccess:identity,decisionRuntime:reconstructed})
    http.listen(0,'127.0.0.1');await once(http,'listening')
    try{
      const base=`http://127.0.0.1:${http.address().port}`
      const workspace=await fetch(`${base}/api/private/workspace`,{headers:{cookie:'__session=valid'}})
      assert.equal(workspace.status,200)
      const posted=await fetch(`${base}/api/private/decisions`,{method:'POST',headers:{cookie:'__session=valid','content-type':'application/json',origin:'https://preview.invalid','x-outcome-csrf':workspace.headers.get('x-outcome-csrf'),'if-match':workspace.headers.get('etag')},body:JSON.stringify({projectId:'outcome',eventId:'event-http',sequence:10,decision:'approved',nonce:'http-nonce-that-is-long-enough-123'})})
      assert.equal(posted.status,201)
      const receipt=await posted.json()
      const history=await fetch(`${base}/api/private/decisions`,{headers:{cookie:'__session=valid'}})
      assert.equal(history.status,200)
      assert.deepEqual((await history.json()).decisions.find(entry=>entry.target.eventId==='event-http').receipt,receipt)
      assert.equal((await db.query("select count(*)::int n from outcome_private.decision_records where event_id='event-http'")).rows[0].n,1)
    }finally{http.close();await once(http,'close')}
  } finally { await db.close() }
})
