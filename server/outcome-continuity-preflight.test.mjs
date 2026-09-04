import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { verifyOutcomeContinuityPreflight } from './outcome-continuity-preflight.mjs'

const commit = '1'.repeat(40)
const tree = '2'.repeat(40)
const parent = '3'.repeat(40)
const sharedHead = '4'.repeat(40)
const builderReceipt = 'a'.repeat(64)
const qaReceipt = 'b'.repeat(64)

const request = (overrides = {}) => ({
  candidateRoot: '/candidate',
  sharedRoot: '/shared',
  expectedSharedIndexPath: '/shared/.git/index',
  remoteRef: 'refs/remotes/origin/codex/candidate',
  builderReceiptPath: '/receipts/builder.md',
  qaReceiptPath: '/receipts/qa.md',
  registryPath: '/runtime/bindings.json',
  projectId: 'outcome',
  role: 'builder',
  expectedCandidateCommit: commit,
  expectedCandidateTree: tree,
  expectedCandidateParent: parent,
  expectedRemoteCommit: commit,
  expectedSharedHead: sharedHead,
  expectedBuilderReceiptSha256: builderReceipt,
  expectedQaReceiptSha256: qaReceipt,
  expectedAppSelfMatchCount: 1,
  expectedRegistrySchemaVersion: 2,
  expectedRegistryRevision: 159,
  expectedBindingVersion: 26,
  expectedHistoryCount: 26,
  expectedBindingStatus: 'active',
  expectedProtectedSelfMatchCount: 1,
  ...overrides,
})

const makeAdapters = (overrides = {}) => {
  const calls = []
  const value = (key, fallback) => Object.hasOwn(overrides, key) ? overrides[key] : fallback
  const adapters = {
    readCandidate(candidateRoot, remoteRef) {
      calls.push('candidate')
      return value('candidate', { commit, tree, parent, cleanCount: 0, remoteCommit: commit, headKind: 'detached' })
    },
    readSharedRoot(sharedRoot) {
      calls.push('shared')
      return value('shared', { head: sharedHead, indexPath: '/shared/.git/index', dirtyEntryCount: 7, dirtyFingerprint: 'c'.repeat(64) })
    },
    hashReceipt(path) {
      calls.push(path === '/receipts/builder.md' ? 'builder-receipt' : 'qa-receipt')
      return path === '/receipts/builder.md' ? value('builderReceipt', builderReceipt) : value('qaReceipt', qaReceipt)
    },
    readAppSelfMatchCount() {
      calls.push('app')
      return value('appCount', 1)
    },
    readRegistryPublic(registryPath, projectId, role) {
      calls.push('registry')
      return value('registry', { schemaVersion: 2, revision: 159, role: 'builder', bindingVersion: 26, historyCount: 26, status: 'active' })
    },
    readDoctor(registryPath, projectId) {
      calls.push('doctor')
      return value('doctor', { ok: true, schemaVersion: 2, revision: 159, issuesCount: 0, lockState: 'clear' })
    },
    readProtectedSelfMatchCount() {
      calls.push('self-match')
      return value('selfCount', 1)
    },
  }
  return { adapters, calls }
}

const verify = (requestOverrides = {}, adapterOverrides = {}) => {
  const fixture = makeAdapters(adapterOverrides)
  return { ...fixture, result: verifyOutcomeContinuityPreflight(request(requestOverrides), fixture.adapters) }
}

test('exact detached-head fixture is continuity ready', () => {
  const { result, calls } = verify()
  assert.equal(result.ready, true)
  assert.equal(result.status, 'continuity_ready')
  assert.deepEqual(result.candidate, { commit, tree, parent, remote_commit: commit, clean_count: 0, head_kind: 'detached' })
  assert.deepEqual(calls, ['candidate', 'shared', 'builder-receipt', 'qa-receipt', 'app', 'registry', 'doctor', 'self-match'])
})

test('branch-attached equivalent fixture is continuity ready without a symbolic-branch requirement', () => {
  const { result } = verify({}, { candidate: { commit, tree, parent, cleanCount: 0, remoteCommit: commit, headKind: 'branch' } })
  assert.equal(result.ready, true)
  assert.equal(result.candidate.head_kind, 'branch')
})

test('concurrent shared-root dirty drift stays ready when HEAD and index identity match', () => {
  for (const shared of [
    { head: sharedHead, indexPath: '/shared/.git/index', dirtyEntryCount: 0, dirtyFingerprint: null },
    { head: sharedHead, indexPath: '/shared/.git/index', dirtyEntryCount: 99, dirtyFingerprint: 'd'.repeat(64) },
  ]) {
    const { result } = verify({}, { shared })
    assert.equal(result.ready, true)
    assert.equal(result.shared_dirty_entry_count, shared.dirtyEntryCount)
  }
})

test('shared-root identity mismatches fail closed at the first mismatch', () => {
  const head = verify({}, { shared: { head: '9'.repeat(40), indexPath: '/wrong/index', dirtyEntryCount: 7, dirtyFingerprint: 'c'.repeat(64) } })
  assert.equal(head.result.reason, 'shared_root_head_mismatch')
  assert.deepEqual(head.calls, ['candidate', 'shared'])
  const index = verify({}, { shared: { head: sharedHead, indexPath: '/wrong/index', dirtyEntryCount: 7, dirtyFingerprint: 'c'.repeat(64) } })
  assert.equal(index.result.reason, 'shared_root_index_mismatch')
  assert.deepEqual(index.calls, ['candidate', 'shared'])
})

test('every pinned carrier mismatch fails closed with a stable class', () => {
  const cases = [
    [{ candidate: { commit: '9'.repeat(40), tree, parent, cleanCount: 0, remoteCommit: commit, headKind: 'detached' } }, 'candidate_commit_mismatch'],
    [{ candidate: { commit, tree: '9'.repeat(40), parent, cleanCount: 0, remoteCommit: commit, headKind: 'detached' } }, 'candidate_tree_mismatch'],
    [{ candidate: { commit, tree, parent: '9'.repeat(40), cleanCount: 0, remoteCommit: commit, headKind: 'detached' } }, 'candidate_parent_mismatch'],
    [{ candidate: { commit, tree, parent, cleanCount: 1, remoteCommit: commit, headKind: 'detached' } }, 'candidate_not_clean'],
    [{ candidate: { commit, tree, parent, cleanCount: 0, remoteCommit: '9'.repeat(40), headKind: 'detached' } }, 'remote_ref_mismatch'],
    [{ builderReceipt: '9'.repeat(64) }, 'builder_receipt_hash_mismatch'],
    [{ qaReceipt: '9'.repeat(64) }, 'qa_receipt_hash_mismatch'],
    [{ appCount: 0 }, 'app_inventory_self_match_mismatch'],
    [{ registry: { schemaVersion: 3, revision: 159, role: 'builder', bindingVersion: 26, historyCount: 26, status: 'active' } }, 'registry_schema_mismatch'],
    [{ registry: { schemaVersion: 2, revision: 160, role: 'builder', bindingVersion: 26, historyCount: 26, status: 'active' } }, 'registry_revision_mismatch'],
    [{ registry: { schemaVersion: 2, revision: 159, role: 'release_audit', bindingVersion: 26, historyCount: 26, status: 'active' } }, 'registry_role_mismatch'],
    [{ registry: { schemaVersion: 2, revision: 159, role: 'builder', bindingVersion: 25, historyCount: 26, status: 'active' } }, 'registry_binding_version_mismatch'],
    [{ registry: { schemaVersion: 2, revision: 159, role: 'builder', bindingVersion: 26, historyCount: 25, status: 'active' } }, 'registry_history_count_mismatch'],
    [{ registry: { schemaVersion: 2, revision: 159, role: 'builder', bindingVersion: 26, historyCount: 26, status: 'idle' } }, 'registry_status_mismatch'],
    [{ doctor: { ok: false, schemaVersion: 2, revision: 159, issuesCount: 1, lockState: 'clear' } }, 'doctor_not_clean'],
    [{ doctor: { ok: true, schemaVersion: 3, revision: 159, issuesCount: 0, lockState: 'clear' } }, 'doctor_schema_mismatch'],
    [{ doctor: { ok: true, schemaVersion: 2, revision: 160, issuesCount: 0, lockState: 'clear' } }, 'doctor_revision_mismatch'],
    [{ doctor: { ok: true, schemaVersion: 2, revision: 159, issuesCount: 1, lockState: 'clear' } }, 'doctor_issues_present'],
    [{ doctor: { ok: true, schemaVersion: 2, revision: 159, issuesCount: 0, lockState: 'live' } }, 'registry_lock_not_clear'],
    [{ selfCount: 0 }, 'protected_self_match_mismatch'],
  ]
  for (const [adapterOverrides, reason] of cases) {
    const { result } = verify({}, adapterOverrides)
    assert.deepEqual(result, { ready: false, reason, mutation_count: 0, automatic_retry_count: 0 }, reason)
  }
})

test('missing registry carrier and malformed adapter outputs fail closed', () => {
  assert.equal(verify({}, { registry: null }).result.reason, 'registry_carrier_missing')
  const malformed = [
    { ...makeAdapters().adapters, readCandidate: () => ({ commit, tree, parent, cleanCount: 0, remoteCommit: commit, headKind: 'detached', extra: true }) },
    { ...makeAdapters().adapters, readCandidate: () => new Proxy({ commit, tree, parent, cleanCount: 0, remoteCommit: commit, headKind: 'detached' }, {}) },
    { ...makeAdapters().adapters, readCandidate: () => Object.defineProperty({ commit, tree, parent, cleanCount: 0, remoteCommit: commit }, 'headKind', { enumerable: true, get: () => 'detached' }) },
  ]
  for (const adapters of malformed) {
    assert.equal(verifyOutcomeContinuityPreflight(request(), adapters).reason, 'candidate_carrier_invalid')
  }
  assert.equal(verify({}, { appCount: '1' }).result.reason, 'app_inventory_carrier_invalid')
  assert.equal(verify({}, { doctor: { ok: true } }).result.reason, 'doctor_carrier_invalid')
})

test('hostile request shapes are rejected before any adapter invocation', () => {
  const accessor = request()
  Object.defineProperty(accessor, 'candidateRoot', { enumerable: true, get: () => '/candidate' })
  const extra = { ...request(), locator: 'private-locator-value' }
  const symbolExtra = request()
  symbolExtra[Symbol('extra')] = true
  const nullPrototype = Object.assign(Object.create(null), request())
  for (const input of [
    [],
    new Proxy(request(), {}),
    accessor,
    extra,
    symbolExtra,
    nullPrototype,
    request({ expectedCandidateCommit: 'bad' }),
    request({ expectedBindingVersion: 0 }),
    request({ expectedHistoryCount: -1 }),
    request({ candidateRoot: 'relative' }),
    request({ expectedAppSelfMatchCount: 2 }),
    request({ remoteRef: 'refs/remotes/origin/../candidate' }),
  ]) {
    const { adapters, calls } = makeAdapters()
    assert.deepEqual(verifyOutcomeContinuityPreflight(input, adapters), { ready: false, reason: 'invalid_request', mutation_count: 0, automatic_retry_count: 0 })
    assert.deepEqual(calls, [])
  }
})

test('a mismatch never invokes adapters that belong to later stages', () => {
  const candidate = verify({}, { candidate: { commit: '9'.repeat(40), tree, parent, cleanCount: 0, remoteCommit: commit, headKind: 'detached' } })
  assert.deepEqual(candidate.calls, ['candidate'])
  const builderHash = verify({}, { builderReceipt: '9'.repeat(64) })
  assert.deepEqual(builderHash.calls, ['candidate', 'shared', 'builder-receipt'])
  const registry = verify({}, { registry: null })
  assert.deepEqual(registry.calls, ['candidate', 'shared', 'builder-receipt', 'qa-receipt', 'app', 'registry'])
  const doctor = verify({}, { doctor: { ok: false, schemaVersion: 2, revision: 159, issuesCount: 1, lockState: 'clear' } })
  assert.deepEqual(doctor.calls, ['candidate', 'shared', 'builder-receipt', 'qa-receipt', 'app', 'registry', 'doctor'])
})

test('privacy sweep excludes private locators and task identifiers from every result', () => {
  const privateMarkers = ['private-locator-value', 'locator_ref', 'CODEX_THREAD_ID', 'session_id', 'thread_id', 'task_id', 'turn_id']
  const results = [
    verify().result,
    verifyOutcomeContinuityPreflight({ ...request(), locator: 'private-locator-value' }, makeAdapters().adapters),
    verifyOutcomeContinuityPreflight(request(), { ...makeAdapters().adapters, readCandidate: () => ({ commit, tree, parent, cleanCount: 0, remoteCommit: commit, headKind: 'detached', locator_ref: 'private-locator-value' }) }),
  ]
  for (const result of results) {
    const text = JSON.stringify(result)
    for (const marker of privateMarkers) assert.equal(text.includes(marker), false, marker)
  }
  const source = readFileSync(new URL('./outcome-continuity-preflight.mjs', import.meta.url), 'utf8')
  for (const forbidden of [/node:fs/, /node:child_process/, /process\.env/, /locator_ref/, /CODEX_THREAD_ID/, /session_id/, /thread_id/, /task_id/, /turn_id/, /privateInput/, /\bfetch\s*\(/]) {
    assert.doesNotMatch(source, forbidden)
  }
})

test('success and every failure report zero mutation and automatic retry counts', () => {
  for (const result of [verify().result, verify({}, { selfCount: 0 }).result, verifyOutcomeContinuityPreflight(null, makeAdapters().adapters)]) {
    assert.equal(result.mutation_count, 0)
    assert.equal(result.automatic_retry_count, 0)
  }
})
