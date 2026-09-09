import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createLocalWorkObservationSource } from './outcome-local-work-source.mjs'
import { readScopedWorkObservation } from './outcome-work-observation-access.mjs'
const now = 20000, threadId = '11111111-1111-4111-8111-111111111111'
const account = { accountRef: 'a'.repeat(64), workspaceId: 'workspace-one', projectId: 'outcome' }
const scope = { projectId: 'outcome', workId: 'work-one', runId: 'run-one', sessionRef: createHash('sha256').update('outcome-work-session-v1\0').update(threadId).digest('hex'), bindingVersion: 1 }
const scopeJson = JSON.stringify(scope)
const binding = JSON.stringify({ ...account, scopeJson, threadId })
const queued = { sequence: 1, observedAt: new Date(now - 100).toISOString(), stage: 'queued', attempt: 1, activity: 'waiting', candidateCommit: null, candidateTree: null, evidenceRef: null, nextAction: null, blocker: null }
const journal = JSON.stringify({ schemaVersion: 1, scope, events: [queued, { ...queued, sequence: 2, stage: 'implementing', activity: 'running' }] })
const snapshot = { runtimeJson: JSON.stringify({ thread: { id: threadId, status: { type: 'active', activeFlags: [] } } }), observedAtMs: now - 50 }
const options = () => ({ resolveBinding: async () => binding, readJournal: async () => journal, readRuntime: async () => snapshot, now: () => now })
test('local journal and private runtime compose into scoped public observation with original times', async () => {
  let reads = 0
  const source = createLocalWorkObservationSource({ ...options(), readRuntime: async id => { reads++; assert.equal(id, threadId); return snapshot } })
  const result = await readScopedWorkObservation({ ...account, now: () => now, readSource: source })
  assert.equal(result.executionState, 'running'); assert.equal(result.observedAtMs, now - 100)
  assert.equal(result.completionAuthority, false); assert.equal(result.executionAuthority, false)
  assert.equal(reads, 1)
  for (const value of [threadId, scope.sessionRef, account.accountRef, account.workspaceId]) assert(!JSON.stringify(result).includes(value))
})
test('revocation, cross-owner, wrong runtime, invalid journal and cancellation fail closed', async () => {
  let resolutions = 0, runtimeReads = 0
  const changed = createLocalWorkObservationSource({ ...options(), resolveBinding: async () => ++resolutions === 1 ? binding : null })
  assert.equal(await changed(account), null)
  const foreign = createLocalWorkObservationSource({ ...options(), readRuntime: async () => { runtimeReads++; return snapshot } })
  assert.equal(await foreign({ ...account, accountRef: 'b'.repeat(64) }), null); assert.equal(runtimeReads, 0)
  for (const replacement of [
    { readRuntime: async () => ({ ...snapshot, runtimeJson: snapshot.runtimeJson.replace(threadId, '22222222-2222-4222-8222-222222222222') }) },
    { readRuntime: async () => ({ ...snapshot, observedAtMs: now + 1 }) },
    { readJournal: async () => '{}' },
    { resolveBinding: async () => '{' },
  ]) assert.equal(await createLocalWorkObservationSource({ ...options(), ...replacement })(account), null)
  const abort = new AbortController()
  const cancelled = createLocalWorkObservationSource({ ...options(), readRuntime: async () => { abort.abort(); return snapshot } })
  assert.equal(await cancelled(account, { signal: abort.signal }), null)
  assert.equal(await foreign(account, { signal: abort.signal }), null); assert.equal(runtimeReads, 0)
})
