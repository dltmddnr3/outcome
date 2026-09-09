import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, realpathSync, writeFileSync, chmodSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import fixture from '../test/fixtures/account-access.json' with { type: 'json' }
import { createAccountAccessService, createInMemoryAccountStore } from './account-access.mjs'
import { readOutcomeWorkObservation } from '../scripts/read-outcome-work-observation.mjs'
test('operational observation reads protected SQLite through account service without dispatch or storage writes', async t => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'oc-read-work-'))), databasePath = join(root, 'work.db'), configPath = join(root, 'config.json')
  const now = 20000, threadId = '11111111-1111-4111-8111-111111111111'
  const identityFactory = ({ workObservationSource }) => ({ service: createAccountAccessService({ ownerSubject: 'synthetic-owner', now: () => now, workObservationSource,
    store: createInMemoryAccountStore(fixture), authProvider: { verify: async token => token === 'synthetic-session' ? { subject: 'synthetic-owner', issuedAt: 19000, expiresAt: 100000 } : null } }) })
  const owner = await identityFactory({}).service.resolveBridgeAuthority({ token: 'synthetic-session' })
  const scope = { projectId: 'outcome', workId: 'work-one', runId: 'run-one', sessionRef: createHash('sha256').update('outcome-work-session-v1\0').update(threadId).digest('hex'), bindingVersion: 1 }
  const event = { sequence: 1, observedAt: new Date(now).toISOString(), stage: 'queued', attempt: 1, activity: 'waiting', candidateCommit: null, candidateTree: null, evidenceRef: null, nextAction: null, blocker: null }
  const scopeJson = JSON.stringify(scope), db = new DatabaseSync(databasePath)
  db.exec('CREATE TABLE outcome_work_journals(project_id TEXT,work_id TEXT,scope_json TEXT,sequence INTEGER,journal_json TEXT)')
  db.prepare('INSERT INTO outcome_work_journals VALUES(?,?,?,?,?)').run(scope.projectId, scope.workId, scopeJson, 1, JSON.stringify({ schemaVersion: 1, scope, events: [event] }))
  db.close(); chmodSync(databasePath, 0o600)
  const config = { schemaVersion: 1, candidatePin: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), databasePath, scopeJson, accountRef: owner.account_ref, workspaceId: owner.workspace_id, ownerCwd: root }
  const save = value => writeFileSync(configPath, JSON.stringify(value), { mode: 0o600 })
  save(config)
  let output = '', runtimeReads = 0
  const options = { configPath, now: () => now, identityFactory, tokenReader: async () => 'synthetic-session', write: text => { output = text },
    registryReader: () => ({ bindings: [{ project_id: 'outcome', role: 'planner', status: 'active', binding_version: 1, locator_ref: threadId }] }),
    runtimeReader: async () => { runtimeReads++; return { runtimeJson: JSON.stringify({ thread: { id: threadId, status: { type: 'active', activeFlags: [] } } }), observedAtMs: now } } }
  const before = readFileSync(databasePath)
  try {
    assert.equal(await readOutcomeWorkObservation(options), 0, output)
    assert.equal(JSON.parse(output).observation.executionState, 'stage_unconfirmed')
    for (const value of [threadId, scope.sessionRef, root, 'synthetic-session']) assert(!output.includes(value))
    assert.deepEqual(readFileSync(databasePath), before)
    assert.equal(await readOutcomeWorkObservation({ ...options, tokenReader: async () => 'invalid' }), 70)
    assert.equal(runtimeReads, 1)
    save({ ...config, accountRef: 'f'.repeat(64) })
    assert.equal(await readOutcomeWorkObservation(options), 70); assert.equal(runtimeReads, 1)
    save({ ...config, candidatePin: 'f'.repeat(40) })
    assert.equal(await readOutcomeWorkObservation(options), 70)
    assert.equal(await readOutcomeWorkObservation({ ...options, configPath: '/nonexistent/outcome.json' }), 70)
    assert.deepEqual(readFileSync(databasePath), before)
    const previewOrigin = 'https://outcome-test-white-castle.vercel.app'
    save({ ...config, schemaVersion: 2, previewOrigin })
    const token = `e30.${Buffer.from(JSON.stringify({ sub: 'synthetic-owner', exp: 1000 })).toString('base64url')}.c2ln`
    let calls = 0, denied = false
    t.mock.method(globalThis, 'fetch', async (url, input) => {
      calls++; assert.equal(url, previewOrigin + '/api/private/workspace')
      assert.equal(input.headers.authorization, `Bearer ${token}`)
      assert.equal(input.redirect, 'error')
      if (denied) return new Response('{}', { status: 401 })
      return new Response(JSON.stringify({ workspace: { access: 'private_read_only', workspace: { id: owner.workspace_id, role: 'owner-viewer' }, projects: [{ project: { id: 'outcome' } }], completionAuthority: false, session: { expiresAt: new Date(100000).toISOString() } } }), { headers: { 'content-type': 'application/json', 'cache-control': 'private, no-store' } })
    })
    const remoteOptions = { ...options, tokenReader: async () => token, identityFactory: () => { throw Error('must not require local secret') }, environment: {} }
    assert.equal(await readOutcomeWorkObservation(remoteOptions), 0, output)
    assert.equal(JSON.parse(output).observation.executionState, 'stage_unconfirmed')
    assert.equal(calls, 1); assert.equal(runtimeReads, 2)
    denied = true
    assert.equal(await readOutcomeWorkObservation(remoteOptions), 70)
    assert.equal(calls, 2); assert.equal(runtimeReads, 2)
    for (const value of [token, threadId, root, owner.account_ref]) assert(!output.includes(value))
    assert.deepEqual(readFileSync(databasePath), before)
  } finally { rmSync(root, { recursive: true, force: true }) }
})
