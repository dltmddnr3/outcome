import assert from 'node:assert/strict'
import test from 'node:test'
import { execFileSync, spawn } from 'node:child_process'
import { chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, statSync, symlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createEmptyRegistry, doctorRegistry, loadRegistry, migrateLegacyRegistry, mutateRegistry, publicRegistryProjection, recoverRegistryLock } from './outcome-session-registry-persistence.mjs'

const tempPath = () => join(mkdtempSync(join(tmpdir(), 'outcome-session-v2-')), 'registry.json')
const meta = { actorClass: 'builder', reasonClass: 'approved_local_test', occurredAt: '2026-08-27T00:00:00.000Z', publicAlias: 'builder-primary' }

test('synchronized initial creators publish exactly one complete private registry', async () => {
  const path = tempPath(); const moduleUrl = new URL('./outcome-session-registry-persistence.mjs', import.meta.url).href
  const attempts = Array.from({ length: 12 }, (_, index) => {
    const child = spawn(process.execPath, ['--input-type=module', '--eval', `import { createEmptyRegistry } from ${JSON.stringify(moduleUrl)}; process.stdout.write('ready\\n'); process.stdin.once('data', () => { try { createEmptyRegistry(${JSON.stringify(path)}, [${JSON.stringify(`project-${index}`)}]); process.stdout.write('success') } catch (error) { process.stdout.write(error.message) } })`])
    let output = ''; let markReady
    const ready = new Promise((resolve) => { markReady = resolve })
    child.stdout.on('data', (chunk) => { output += chunk; if (output.includes('ready\n')) markReady() })
    const done = new Promise((resolve) => child.on('close', () => resolve({ index, output: output.replace('ready\n', '') })))
    return { child, ready, done }
  })
  await Promise.all(attempts.map(({ ready }) => ready)); for (const { child } of attempts) child.stdin.end('create')
  const results = await Promise.all(attempts.map(({ done }) => done)); const winners = results.filter(({ output }) => output === 'success')
  assert.equal(winners.length, 1)
  assert.equal(results.filter(({ output }) => output === 'registry_exists').length, 11)
  assert.deepEqual(loadRegistry(path).project_ids, [`project-${winners[0].index}`])
  assert.equal(statSync(path).mode & 0o777, 0o600)
})

test('direct Planner replace cannot bypass continuity guards and archive eligibility requires the control read-back', () => {
  const path = tempPath(); createEmptyRegistry(path, ['outcome'])
  mutateRegistry(path, { action: 'assign', projectId: 'outcome', role: 'planner', expectedVersion: 0, locator: 'one', ...meta, publicAlias: 'planner-primary' })
  const base = { action: 'replace', projectId: 'outcome', role: 'planner', expectedVersion: 1, locator: 'two', handoffSha256: 'a'.repeat(64), routingFreeze: true, handoffVerified: true, started: true, continuityReady: true, ...meta, publicAlias: 'planner-successor' }
  for (const [prerequisite, value] of [['routingFreeze', false], ['handoffVerified', false], ['started', false], ['continuityReady', false], ['handoffSha256', 'invalid']]) {
    const before = readFileSync(path); assert.throws(() => mutateRegistry(path, { ...base, [prerequisite]: value }), /planner_rotation_unsafe/); assert.deepEqual(readFileSync(path), before)
  }
  const successor = mutateRegistry(path, base)
  assert.equal(successor.predecessor_archive_eligible, false)
})

test('replacement successor starts unobserved without predecessor volatile activity', () => {
  const path = tempPath(); createEmptyRegistry(path, ['outcome'])
  mutateRegistry(path, { action: 'assign', projectId: 'outcome', role: 'builder', expectedVersion: 0, locator: 'one', publicAlias: 'builder-primary', ...meta })
  mutateRegistry(path, { action: 'observe', projectId: 'outcome', role: 'builder', expectedVersion: 1, status: 'active', observedAt: '2026-08-27T00:01:00.000Z', activity: 'predecessor NOW', ...meta })
  mutateRegistry(path, { action: 'replace', projectId: 'outcome', role: 'builder', expectedVersion: 1, locator: 'two', ...meta, publicAlias: 'builder-successor' })
  const successor = loadRegistry(path).bindings[1]
  assert.equal(successor.observed_at, null)
  assert.equal(Object.hasOwn(successor, 'activity'), false)
  assert.equal(publicRegistryProjection(loadRegistry(path), 'outcome').find(({ role }) => role === 'builder').activity, null)
})

test('atomic registry persists assign, observation and checkpoint across restart with append-only events', () => {
  const path = tempPath(); createEmptyRegistry(path, ['outcome'])
  const assigned = mutateRegistry(path, { action: 'assign', projectId: 'outcome', role: 'builder', expectedVersion: 0, locator: 'private-locator-value', stageId: 'stage-one', ...meta })
  assert.equal(assigned.binding_version, 1)
  mutateRegistry(path, { action: 'observe', projectId: 'outcome', role: 'builder', expectedVersion: 1, status: 'idle', observedAt: '2026-08-27T00:01:00.000Z', activity: 'bounded work', ...meta })
  mutateRegistry(path, { action: 'checkpoint', projectId: 'outcome', role: 'builder', expectedVersion: 1, handoffSha256: 'a'.repeat(64), checkpointRef: 'checkpoint-1', ...meta })
  const restarted = loadRegistry(path)
  assert.equal(restarted.revision, 3)
  assert.deepEqual(restarted.events.map(({ action, sequence }) => [action, sequence]), [['assign', 1], ['observe', 2], ['checkpoint', 3]])
  assert.equal(restarted.bindings[0].locator_ref, 'private-locator-value')
})

test('one-active, stale CAS and concurrent replace loser fail with zero partial mutation', () => {
  const path = tempPath(); createEmptyRegistry(path, ['outcome'])
  mutateRegistry(path, { action: 'assign', projectId: 'outcome', role: 'builder', expectedVersion: 0, locator: 'one', ...meta })
  const beforeDuplicate = readFileSync(path)
  assert.throws(() => mutateRegistry(path, { action: 'assign', projectId: 'outcome', role: 'builder', expectedVersion: 1, locator: 'two', ...meta }), /duplicate_active_binding/)
  assert.deepEqual(readFileSync(path), beforeDuplicate)
  mutateRegistry(path, { action: 'replace', projectId: 'outcome', role: 'builder', expectedVersion: 1, locator: 'two', ...meta, publicAlias: 'builder-successor' })
  const afterWinner = readFileSync(path)
  assert.throws(() => mutateRegistry(path, { action: 'replace', projectId: 'outcome', role: 'builder', expectedVersion: 1, locator: 'three', ...meta, publicAlias: 'builder-loser' }), /stale_version/)
  assert.deepEqual(readFileSync(path), afterWinner)
})

test('partial main fails closed and a leftover temp file cannot replace the committed registry', () => {
  const path = tempPath(); createEmptyRegistry(path, ['outcome'])
  writeFileSync(`${path}.tmp-orphan`, '{')
  assert.equal(loadRegistry(path).revision, 0)
  writeFileSync(path, '{')
  assert.throws(() => loadRegistry(path), /registry_unavailable/)
})

test('duplicate active and event history gaps fail closed on restart', () => {
  for (const corrupt of [
    (value) => { value.bindings.push({ ...value.bindings[0], binding_ref: 'duplicate-active-ref', binding_version: 2 }) },
    (value) => { value.events[0].sequence = 2 },
  ]) {
    const path = tempPath(); createEmptyRegistry(path, ['outcome'])
    mutateRegistry(path, { action: 'assign', projectId: 'outcome', role: 'builder', expectedVersion: 0, locator: 'one', ...meta })
    const value = JSON.parse(readFileSync(path, 'utf8')); corrupt(value); writeFileSync(path, JSON.stringify(value))
    assert.throws(() => loadRegistry(path), /registry_conflict/)
  }
})

test('restart rejects causal binding and event lifecycle mismatches', () => {
  const cases = [
    (value) => { value.events[0].action = 'replace' },
    (value) => { value.bindings[0].status = 'revoked'; value.bindings[0].revoked_at = meta.occurredAt },
    (value) => { value.bindings[0].status = 'replaced'; value.bindings[0].replaced_at = meta.occurredAt },
    (value) => { value.bindings[0].predecessor_binding_ref = value.bindings[0].binding_ref },
  ]
  for (const corrupt of cases) {
    const path = tempPath(); createEmptyRegistry(path, ['outcome'])
    mutateRegistry(path, { action: 'assign', projectId: 'outcome', role: 'builder', expectedVersion: 0, locator: 'one', ...meta })
    const value = JSON.parse(readFileSync(path, 'utf8')); corrupt(value); writeFileSync(path, JSON.stringify(value))
    assert.throws(() => loadRegistry(path), /registry_conflict/)
  }
  const path = tempPath(); createEmptyRegistry(path, ['outcome'])
  mutateRegistry(path, { action: 'assign', projectId: 'outcome', role: 'builder', expectedVersion: 0, locator: 'one', ...meta })
  mutateRegistry(path, { action: 'observe', projectId: 'outcome', role: 'builder', expectedVersion: 1, status: 'idle', observedAt: '2026-08-27T00:01:00.000Z', ...meta })
  const value = JSON.parse(readFileSync(path, 'utf8')); value.bindings[0].status = 'active'; writeFileSync(path, JSON.stringify(value))
  assert.throws(() => loadRegistry(path), /registry_conflict/)
})

test('private registry mode is exactly 0600 on create replacement load and doctor', () => {
  const path = tempPath(); createEmptyRegistry(path, ['outcome'])
  assert.equal(statSync(path).mode & 0o777, 0o600)
  mutateRegistry(path, { action: 'assign', projectId: 'outcome', role: 'builder', expectedVersion: 0, locator: 'private', ...meta })
  assert.equal(statSync(path).mode & 0o777, 0o600)
  for (const mode of [0o000, 0o100, 0o200, 0o300, 0o400, 0o500, 0o700, 0o640, 0o604, 0o644, 0o660]) {
    chmodSync(path, mode)
    assert.throws(() => loadRegistry(path), /registry_unavailable/)
    const diagnosis = doctorRegistry(path, ['outcome'])
    assert.equal(diagnosis.ok, false)
    assert.deepEqual(diagnosis.issues, ['registry_permissions_invalid'])
  }
  chmodSync(path, 0o600)
  assert.equal(loadRegistry(path).schema_version, 2)
  assert.equal(doctorRegistry(path, ['outcome']).ok, true)
})

test('registry directories and dangling or non-dangling symlinks fail closed', () => {
  const source = tempPath(); createEmptyRegistry(source, ['outcome'])
  for (const makePath of [
    (path) => mkdirSync(path),
    (path) => symlinkSync(`${path}.missing-target`, path),
    (path) => symlinkSync(source, path),
  ]) {
    const path = tempPath(); makePath(path)
    assert.throws(() => loadRegistry(path), /registry_unavailable/)
    const diagnosis = doctorRegistry(path, ['outcome'])
    assert.equal(diagnosis.ok, false); assert.deepEqual(diagnosis.issues, ['registry_unavailable'])
  }
  const dangling = tempPath(); symlinkSync(`${dangling}.missing-target`, dangling)
  assert.throws(() => createEmptyRegistry(dangling, ['outcome']), /registry_exists/)
  assert.equal(lstatSync(dangling).isSymbolicLink(), true)
})

test('doctor protects live locks and explicitly recovers only old identity-bound orphan locks', () => {
  const path = tempPath(); createEmptyRegistry(path, ['outcome'])
  const lockPath = `${path}.lock`
  const uid = typeof process.getuid === 'function' ? process.getuid() : null
  const processStart = execFileSync('ps', ['-p', String(process.pid), '-o', 'uid=', '-o', 'lstart='], { encoding: 'utf8' }).trim().replace(/\s+/g, ' ')
  const base = { schema_version: 1, owner_pid: process.pid, owner_uid: uid, process_start_identity: processStart, created_at: '2026-08-27T00:00:00.000Z', owner_nonce: '11111111-1111-4111-8111-111111111111' }
  writeFileSync(lockPath, `${JSON.stringify(base)}\n`, { mode: 0o600 })
  const live = doctorRegistry(path, ['outcome'], { now: new Date('2026-08-27T00:10:00.000Z') })
  assert.equal(live.ok, false); assert.equal(live.lock.state, 'live'); assert.deepEqual(live.issues, ['registry_lock_live'])
  assert.throws(() => recoverRegistryLock(path, { recoveryRef: live.lock.recoveryRef, now: new Date('2026-08-27T00:10:00.000Z') }), /registry_lock_live/)
  assert.equal(existsSync(lockPath), true)

  const dead = { ...base, owner_pid: 99_999_999, process_start_identity: 'missing process', owner_nonce: '22222222-2222-4222-8222-222222222222' }
  writeFileSync(lockPath, `${JSON.stringify({ ...dead, created_at: '2026-08-27T00:09:45.000Z' })}\n`, { mode: 0o600 })
  const young = doctorRegistry(path, ['outcome'], { now: new Date('2026-08-27T00:10:00.000Z') })
  assert.equal(young.lock.state, 'unconfirmed')
  assert.throws(() => recoverRegistryLock(path, { recoveryRef: young.lock.recoveryRef, now: new Date('2026-08-27T00:10:00.000Z') }), /registry_lock_unconfirmed/)

  writeFileSync(lockPath, `${JSON.stringify({ ...dead, owner_uid: uid === null ? 1 : uid + 1 })}\n`, { mode: 0o600 })
  const wrongOwner = doctorRegistry(path, ['outcome'], { now: new Date('2026-08-27T00:10:00.000Z') })
  assert.equal(wrongOwner.lock.state, 'invalid')
  assert.throws(() => recoverRegistryLock(path, { recoveryRef: wrongOwner.lock.recoveryRef, now: new Date('2026-08-27T00:10:00.000Z') }), /registry_lock_invalid/)

  writeFileSync(lockPath, `${JSON.stringify(dead)}\n`, { mode: 0o600 })
  const orphan = doctorRegistry(path, ['outcome'], { now: new Date('2026-08-27T00:10:00.000Z') })
  assert.equal(orphan.ok, false); assert.equal(orphan.lock.state, 'orphaned'); assert.deepEqual(orphan.issues, ['registry_lock_orphaned'])
  assert.throws(() => recoverRegistryLock(path, { recoveryRef: '0'.repeat(64), now: new Date('2026-08-27T00:10:00.000Z') }), /registry_lock_changed/)
  assert.deepEqual(recoverRegistryLock(path, { recoveryRef: orphan.lock.recoveryRef, now: new Date('2026-08-27T00:10:00.000Z') }), { ok: true, recovered: true })
  assert.equal(existsSync(lockPath), false)
  assert.equal(doctorRegistry(path, ['outcome']).ok, true)
  assert.doesNotMatch(readFileSync(new URL('./outcome-session-registry-persistence.mjs', import.meta.url), 'utf8'), /process\.kill\s*\(/)
})

test('dangling and non-regular lock entries are invalid, stay protected, and block mutation', () => {
  for (const makeLock of [
    (lockPath) => symlinkSync(`${lockPath}.missing-target`, lockPath),
    (lockPath) => { const target = `${lockPath}.target`; writeFileSync(target, '{}', { mode: 0o600 }); symlinkSync(target, lockPath) },
    (lockPath) => mkdirSync(lockPath),
  ]) {
    const path = tempPath(); createEmptyRegistry(path, ['outcome']); const lockPath = `${path}.lock`; makeLock(lockPath)
    const diagnosis = doctorRegistry(path, ['outcome'])
    assert.equal(diagnosis.ok, false); assert.equal(diagnosis.lock.state, 'invalid'); assert.deepEqual(diagnosis.issues, ['registry_lock_invalid'])
    assert.throws(() => recoverRegistryLock(path, { recoveryRef: diagnosis.lock.recoveryRef }), /registry_lock_invalid/)
    assert.equal(lstatSync(lockPath).isSymbolicLink() || lstatSync(lockPath).isDirectory(), true)
    assert.throws(() => mutateRegistry(path, { action: 'assign', projectId: 'outcome', role: 'builder', expectedVersion: 0, locator: 'private', ...meta }), /registry_busy/)
    assert.equal(lstatSync(lockPath).isSymbolicLink() || lstatSync(lockPath).isDirectory(), true)
  }
})

test('replacement followed by checkpoint remains a causally valid restart history', () => {
  const path = tempPath(); createEmptyRegistry(path, ['outcome'])
  mutateRegistry(path, { action: 'assign', projectId: 'outcome', role: 'builder', expectedVersion: 0, locator: 'one', stageId: 'stage-one', ...meta })
  mutateRegistry(path, { action: 'replace', projectId: 'outcome', role: 'builder', expectedVersion: 1, locator: 'two', stageId: 'stage-two', handoffSha256: 'a'.repeat(64), ...meta, publicAlias: 'builder-successor' })
  mutateRegistry(path, { action: 'checkpoint', projectId: 'outcome', role: 'builder', expectedVersion: 2, handoffSha256: 'b'.repeat(64), checkpointRef: 'checkpoint-two', ...meta })
  const restarted = loadRegistry(path)
  assert.equal(restarted.bindings[1].stage_id, 'stage-two')
  assert.equal(restarted.bindings[1].continuity_handoff_sha256, 'b'.repeat(64))
})

test('persisted public metadata rejects locator credential path UUID and provider identifier values', () => {
  const hostile = [
    'codex://tenant-alpha/private-conversation/short',
    'token=private-value',
    '/Users/cherry/private-registry',
    '123e4567-e89b-12d3-a456-426614174000',
    'session_id=private-value',
    'thread_private_value',
    'task_private_value',
    'turn_private_value',
  ]
  const targets = [
    (value, marker) => { value.project_ids[0] = marker; value.bindings[0].project_id = marker; value.events[0].project_id = marker },
    (value, marker) => { value.bindings[0].provider_class = marker },
    (value, marker) => { value.bindings[0].status = marker },
    (value, marker) => { value.bindings[0].phase_id = marker },
    (value, marker) => { value.bindings[0].scope_id = marker },
    (value, marker) => { value.bindings[0].stage_id = marker },
    (value, marker) => { value.bindings[0].bound_at = marker },
    (value, marker) => { value.bindings[0].observed_at = marker },
    (value, marker) => { value.bindings[0].activity = marker },
    (value, marker) => { value.events[0].actor_class = marker },
    (value, marker) => { value.events[0].action = marker },
    (value, marker) => { value.events[0].reason_class = marker },
    (value, marker) => { value.events[0].stage_id = marker },
    (value, marker) => { value.events[0].occurred_at = marker },
  ]
  for (const marker of hostile) for (const inject of targets) {
    const path = tempPath(); createEmptyRegistry(path, ['outcome'])
    mutateRegistry(path, { action: 'assign', projectId: 'outcome', role: 'builder', expectedVersion: 0, locator: 'private', stageId: 'stage-one', ...meta })
    const value = JSON.parse(readFileSync(path, 'utf8')); inject(value, marker); writeFileSync(path, JSON.stringify(value))
    assert.throws(() => loadRegistry(path), /registry_conflict/, `${marker}:${inject}`)
  }
})

test('persisted bindings and events reject unknown keys', () => {
  for (const inject of [(value) => { value.bindings[0].unexpected_public = 'value' }, (value) => { value.events[0].unexpected_public = 'value' }]) {
    const path = tempPath(); createEmptyRegistry(path, ['outcome'])
    mutateRegistry(path, { action: 'assign', projectId: 'outcome', role: 'builder', expectedVersion: 0, locator: 'private', ...meta })
    const value = JSON.parse(readFileSync(path, 'utf8')); inject(value); writeFileSync(path, JSON.stringify(value))
    assert.throws(() => loadRegistry(path), /registry_conflict/)
  }
})

test('versionless bindings migrate with byte hash and mode receipt, stale defaults, and no raw public identifiers', () => {
  const legacyPath = tempPath(); const targetPath = tempPath()
  writeFileSync(legacyPath, JSON.stringify({ bindings: [{ project_id: 'outcome', role: 'planner', status: 'active', locator_ref: 'private-old', observed_at: '2026-08-01T00:00:00.000Z' }] }))
  chmodSync(legacyPath, 0o600)
  const receipt = migrateLegacyRegistry({ legacyPath, registryPath: targetPath, projectIds: ['outcome'], occurredAt: '2026-08-27T00:00:00.000Z' })
  assert.match(receipt.source_sha256, /^[a-f0-9]{64}$/)
  assert.equal(receipt.source_mode, '0600')
  const migrated = loadRegistry(targetPath)
  assert.equal(migrated.bindings[0].status, 'stale')
  const text = JSON.stringify(publicRegistryProjection(migrated, 'outcome'))
  for (const token of ['private-old', 'locator_ref', 'binding_ref', 'event_ref']) assert.equal(text.includes(token), false, token)
})
