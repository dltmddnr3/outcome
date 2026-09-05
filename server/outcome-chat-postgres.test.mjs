import assert from 'node:assert/strict'

test('T4 common reachable memory and Postgres row fixtures project identical statuses', async () => {
  const { createInMemoryChatRepository } = await import('./outcome-chat.mjs')
  const memory = createInMemoryChatRepository(), scope = { project_id: 'outcome', binding_version: 7, idempotency_key: 'message-0000000000000001' }
  memory.reserve({ ...scope, message: 'persisted', observed_at: '2026-09-03T00:00:00.000Z' })
  const compare = async () => {
    const snapshot = memory.snapshot(), event = snapshot.streams[0].events[0], status = snapshot.idempotency[0].result
    const calls = []
    const pg = createOutcomeChatPostgresRepository({ transact: async operation => operation({ query: async (sql, params) => { calls.push({ sql, params }); return { rows: [{ ...event, sequence: String(event.sequence), private_message: event.payload.private_content.text, delivery: status.delivery, dispatch_state: status.dispatch_state }] } } }) })
    const projected = await pg.timeline({ workspace_id: 'workspace-one', project_id: 'outcome', binding_version: 7, after_sequence: 0 })
    assert.deepEqual(projected, createInMemoryChatRepository({ snapshot }).timeline({ project_id: 'outcome', binding_version: 7, after_sequence: 0 }))
    assert.equal(calls.length, 1); assert.deepEqual(calls[0].params, ['workspace-one', 'outcome', 7, 0])
    assert.match(calls[0].sql, /where workspace_id=\$1 and project_id=\$2 and binding_version=\$3 and sequence>\$4 order by sequence asc/)
  }
  await compare(); memory.markDispatch(scope); await compare(); memory.markInvoked(scope); await compare()
  for (const delivery of ['acknowledged', 'delivery_unknown', 'rejected', 'failed']) { memory.finalize({ ...scope, delivery }); await compare() }
})

test('T4 T6 Postgres preserves pre-invocation failure history and every caller scope parameter', async () => {
  for (const delivery of ['failed', 'rejected']) {
    const calls = [], row = { event_id: 'event-0000000000000001', sequence: 4, observed_at: '2026-09-03T00:00:00.000Z', correlation_id: 'message-0000000000000001', private_message: 'persisted', delivery, dispatch_state: 'dispatch_intent_recorded' }
    const pg = createOutcomeChatPostgresRepository({ transact: async operation => operation({ query: async (sql, params) => { calls.push({ sql, params }); return { rows: [row] } } }) })
    for (const scope of [{ workspace_id: 'workspace-one', project_id: 'outcome', binding_version: 7, after_sequence: 3 }, { workspace_id: 'workspace-two', project_id: 'other', binding_version: 8, after_sequence: 2 }]) {
      const [event] = await pg.timeline(scope)
      assert.equal(event.delivery, delivery); assert.equal(event.dispatch_state, 'dispatch_intent_recorded'); assert.equal(event.state, 'queued')
      assert.deepEqual(calls.at(-1).params, [scope.workspace_id, scope.project_id, scope.binding_version, scope.after_sequence])
    }
    assert.equal(calls.length, 2)
  }
})
import { readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('TIMELINE-RED Postgres selects same-row status with exact read scope', async () => {
  const calls = []
  const item = { event_id: 'event-0000000000000001', sequence: '2', observed_at: '2026-09-03T00:00:00.000Z', correlation_id: 'message-0000000000000001', private_message: 'persisted', delivery: 'rejected', dispatch_state: 'dispatch_intent_recorded' }
  const repository = createOutcomeChatPostgresRepository({ transact: async (operation) => operation({ query: async (sql, params) => { calls.push({ sql, params }); return { rows: [item] } } }) })
  const events = await repository.timeline({ workspace_id: 'workspace-one', project_id: 'outcome', binding_version: 7, after_sequence: 1 })
  assert.equal(calls.length, 1)
  assert.match(calls[0].sql, /correlation_id,private_message,delivery,dispatch_state\s+from outcome_private\.chat_messages/)
  assert.deepEqual(calls[0].params, ['workspace-one', 'outcome', 7, 1])
  assert.doesNotMatch(calls[0].sql, /\b(join|insert|update|delete)\b/i)
  assert.equal(events[0].delivery, 'rejected'); assert.equal(events[0].dispatch_state, 'dispatch_intent_recorded')
})
import { PGlite } from '@electric-sql/pglite'
import { createOutcomeChatPostgresRepository, createOutcomeChatTransactionPort } from './outcome-chat-postgres.mjs'

const migration = new URL('../supabase/migrations/20260903030000_outcome_chat_durable_relay.sql', import.meta.url)
const orderedMigrations = [
  '202608250001_account_access_foundation.sql',
  '20260827000756_observer_bridge.sql',
  '20260901082821_observer_bridge_durable_v2.sql',
  '20260902100000_observer_bridge_workspace_bootstrap_v2.sql',
  '20260903030000_outcome_chat_durable_relay.sql',
  '202609040001_decision_records.sql',
].map((name) => new URL(`../supabase/migrations/${name}`, import.meta.url))

test('ordered account, observer, chat and decision migrations coexist with isolated effective roles', async () => {
  const db = await PGlite.create('memory://')
  try {
    await db.exec(`
      create role anon nologin;
      create role authenticated nologin;
      create schema auth;
      create function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;
      grant usage on schema auth to authenticated;
      grant execute on function auth.jwt() to authenticated;
    `)
    for (const migrationUrl of orderedMigrations) await db.exec(await readFile(migrationUrl, 'utf8'))
    const roles = (await db.query("select rolname from pg_roles where rolname like 'outcome_%_backend' order by rolname")).rows.map(({ rolname }) => rolname)
    assert.deepEqual(roles, ['outcome_bridge_backend', 'outcome_chat_backend', 'outcome_decision_backend'])
    const protectedTables = (await db.query("select relname, relrowsecurity, relforcerowsecurity from pg_class join pg_namespace on pg_namespace.oid=pg_class.relnamespace where nspname='outcome_private' and (relname like 'chat_%' or relname like 'decision_%') and relkind='r' order by relname")).rows
    assert.equal(protectedTables.length, 6)
    assert.equal(protectedTables.every(({ relrowsecurity, relforcerowsecurity }) => relrowsecurity && relforcerowsecurity), true)
    const crossGrants = (await db.query("select grantee, table_name from information_schema.role_table_grants where table_schema='outcome_private' and ((grantee='outcome_chat_backend' and table_name like 'decision_%') or (grantee='outcome_decision_backend' and table_name like 'chat_%'))")).rows
    assert.deepEqual(crossGrants, [])
  } finally { await db.close() }
})

test('migration seals private least-privilege roles, RLS, idempotency, leases and lifecycle cascades', () => {
  const sql = readFileSync(migration, 'utf8')
  for (const fragment of ['create role outcome_chat_backend nologin noinherit', 'create role outcome_chat_runtime login noinherit', 'grant outcome_chat_backend to outcome_chat_runtime', 'enable row level security', 'force row level security', 'revoke all on schema outcome_private from public, anon, authenticated, outcome_chat_runtime', 'unique (workspace_id, project_id, binding_version, idempotency_key)', 'transport_invoked boolean not null default false', 'execution_started boolean not null default false', 'completion_authority boolean not null default false', 'on delete cascade']) assert.match(sql.toLowerCase(), new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  assert.doesNotMatch(sql, /password\s+['"]/i)
  assert.doesNotMatch(sql, /pgmq|realtime|supabase_realtime/i)
})

test('migration removes membership admin authority and seals migration-owner default privileges', () => {
  const sql = readFileSync(migration, 'utf8').toLowerCase()
  assert.match(sql, /grant outcome_chat_backend to outcome_chat_runtime with admin false, inherit false, set true;/)
  for (const objectType of ['tables', 'sequences', 'functions']) {
    assert.match(sql, new RegExp(`alter default privileges in schema outcome_private\\s+revoke all on ${objectType} from public, anon, authenticated, outcome_bridge_backend, outcome_bridge_runtime, outcome_chat_backend, outcome_chat_runtime;`))
  }
  assert.match(sql, /granted\.rolname='outcome_chat_backend' and not m\.admin_option and not m\.inherit_option and m\.set_option/)
  assert.match(sql, /granted\.rolname='outcome_chat_backend' and \(m\.admin_option or m\.inherit_option or not m\.set_option\)/)
})

test('managed non-superuser migration never alters superuser-class role attributes', () => {
  const sql = readFileSync(migration, 'utf8').toLowerCase()
  const alterations = [...sql.matchAll(/alter role outcome_chat_(?:backend|runtime) ([^;]+);/g)].map((match) => match[1])
  assert.equal(alterations.length, 2)
  for (const alteration of alterations) {
    assert.doesNotMatch(alteration, /\b(?:no)?superuser\b/)
    assert.doesNotMatch(alteration, /\b(?:no)?replication\b/)
    assert.doesNotMatch(alteration, /\b(?:no)?bypassrls\b/)
  }
  for (const role of ['backend', 'runtime']) {
    assert.match(sql, new RegExp(`create role outcome_chat_${role} [^;]+nosuperuser [^;]+noreplication nobypassrls;`))
  }
  assert.match(sql, /if backend\.rolsuper or backend\.rolinherit or backend\.rolcanlogin or backend\.rolcreatedb or backend\.rolcreaterole or backend\.rolreplication or backend\.rolbypassrls then raise exception 'outcome_chat_backend_role_drift'; end if;/)
  assert.match(sql, /if runtime\.rolsuper or runtime\.rolinherit or not runtime\.rolcanlogin or runtime\.rolcreatedb or runtime\.rolcreaterole or runtime\.rolreplication or runtime\.rolbypassrls then raise exception 'outcome_chat_runtime_role_drift'; end if;/)
})

test('same idempotency key with a different fingerprint fails closed without allocation', async () => {
  let allocations = 0
  const transact = async (operation) => operation({ async query(text) { if (text.startsWith('select *')) return { rows: [{ request_fingerprint: 'b'.repeat(64) }] }; if (text.startsWith('update outcome_private.chat_streams')) allocations += 1; return { rows: [{}] } } })
  const repository = createOutcomeChatPostgresRepository({ transact })
  await assert.rejects(() => repository.reserve({ workspace_id: 'account-only-preview', project_id: 'outcome', binding_version: 3, idempotency_key: 'message-0000000000000001', request_fingerprint: 'a'.repeat(64), message: 'hello', observed_at: '2026-09-03T00:00:00.000Z' }), /idempotency_conflict/)
  assert.equal(allocations, 0)
})

test('transaction port sets the backend role and verifies exact identities before callback', async () => {
  const calls = []
  const client = { async query(sql) { calls.push(sql); if (sql === 'select session_user, current_user') return { rows: [{ session_user: 'outcome_chat_runtime', current_user: 'outcome_chat_backend' }] }; return { rows: [] } }, release() { calls.push('release') } }
  const transact = createOutcomeChatTransactionPort({ pool: { async connect() { return client } } })
  assert.equal(await transact(async () => 'ok'), 'ok')
  assert.deepEqual(calls, ['BEGIN', 'SET LOCAL ROLE outcome_chat_backend', 'select session_user, current_user', 'COMMIT', 'release'])
})

test('transaction identity drift rolls back before repository work and never reconnects', async () => {
  let connects = 0, callbacks = 0
  const transact = createOutcomeChatTransactionPort({ pool: { async connect() { connects += 1; return { async query(sql) { if (sql === 'select session_user, current_user') return { rows: [{ session_user: 'postgres', current_user: 'outcome_chat_backend' }] }; return { rows: [] } }, release() {} } } } })
  await assert.rejects(() => transact(async () => { callbacks += 1 }), /chat_unavailable/)
  assert.equal(connects, 1); assert.equal(callbacks, 0)
})

test('repository uses atomic SQL boundaries for reserve, ordered claim and no-replay terminal writes', async () => {
  const queries = []
  const transact = async (operation) => operation({ async query(text, values) { queries.push({ text, values }); if (text.startsWith('select *')) return { rows: [] }; if (text.startsWith('update outcome_private.chat_streams')) return { rows: [{ sequence: 1 }] }; return { rows: text.includes('returning *') ? [{ sequence: 1, message_id: 'event-0000000000000001', dispatch_state: 'not_invoked', delivery: 'delivery_unknown' }] : [{ message_id: 'event-0000000000000001' }] } } })
  const repository = createOutcomeChatPostgresRepository({ transact })
  await repository.reserve({ workspace_id: 'account-only-preview', project_id: 'outcome', binding_version: 3, idempotency_key: 'message-0000000000000001', request_fingerprint: 'a'.repeat(64), message: 'hello', observed_at: '2026-09-03T00:00:00.000Z' })
  await repository.claim({ consumer_id: 'consumer-main', claimed_at: '2026-09-03T00:00:01.000Z', lease_expires_at: '2026-09-03T00:00:31.000Z' })
  await repository.recordIntent({ message_id: 'event-0000000000000001', claim_token: 'claim-0000000000000001', observed_at: '2026-09-03T00:00:02.000Z' })
  await repository.recordInvoked({ message_id: 'event-0000000000000001', claim_token: 'claim-0000000000000001', observed_at: '2026-09-03T00:00:03.000Z' })
  assert.equal(queries.length, 8)
  assert.match(queries[0].text, /pg_advisory_xact_lock/i)
  assert.match(queries[1].text, /on conflict/i)
  assert.match(queries[5].text, /for update skip locked/i)
  assert.match(queries[5].text, /transport_invoked = false/i)
  assert.match(queries[6].text, /dispatch_intent_recorded/i)
  assert.match(queries[7].text, /transport_invoked = true/i)
})
