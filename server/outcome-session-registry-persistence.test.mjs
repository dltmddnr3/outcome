import assert from 'node:assert/strict'
import test from 'node:test'
import { execFileSync, spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { chmodSync, closeSync, constants, existsSync, fsyncSync, linkSync, lstatSync, mkdirSync, mkdtempSync, openSync, readFileSync, readdirSync, renameSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { createEmptyRegistry, doctorRegistry, loadRegistry, migrateLegacyRegistry, mutateRegistry, publicRegistryProjection, recoverRegistryLock } from './outcome-session-registry-persistence.mjs'
import * as registryModule from './outcome-session-registry-persistence.mjs'

const tempPath = () => join(mkdtempSync(join(tmpdir(), 'outcome-session-v2-')), 'registry.json')
const meta = { actorClass: 'builder', reasonClass: 'approved_local_test', occurredAt: '2026-08-27T00:00:00.000Z', publicAlias: 'builder-primary' }

const synchronizedChildren = async (scripts) => {
  const attempts = scripts.map((script, index) => {
    const child = spawn(process.execPath, ['--input-type=module', '--eval', script]); let output = ''; let markReady
    const ready = new Promise((resolve) => { markReady = resolve })
    child.stdout.on('data', (chunk) => { output += chunk; if (output.includes('ready\n')) markReady() })
    const done = new Promise((resolve) => child.on('close', () => resolve({ index, output: output.replace('ready\n', '') })))
    return { child, ready, done }
  })
  await Promise.all(attempts.map(({ ready }) => ready)); for (const { child } of attempts) child.stdin.end('start')
  return Promise.all(attempts.map(({ done }) => done))
}

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

test('synchronized legacy migrations publish one receipt and leave 23 deterministic losers', async () => {
  const root = mkdtempSync(join(tmpdir(), 'outcome-migration-race-')); const target = join(root, 'registry.json')
  const moduleUrl = new URL('./outcome-session-registry-persistence.mjs', import.meta.url).href; const sources = []
  const scripts = Array.from({ length: 24 }, (_, index) => {
    const projectId = `race-${index}`; const source = join(root, `legacy-${index}.json`)
    const bytes = `${JSON.stringify({ bindings: [{ project_id: projectId, role: 'builder', locator_ref: `private-${index}` }] })}\n`
    writeFileSync(source, bytes, { mode: 0o600 }); sources.push({ source, bytes, projectId })
    return `import { migrateLegacyRegistry } from ${JSON.stringify(moduleUrl)}; process.stdout.write('ready\\n'); process.stdin.once('data', () => { try { const receipt = migrateLegacyRegistry({ legacyPath: ${JSON.stringify(source)}, registryPath: ${JSON.stringify(target)}, projectIds: [${JSON.stringify(projectId)}], occurredAt: '2026-08-27T00:00:00.000Z' }); process.stdout.write(JSON.stringify({ ok: true, receipt })) } catch (error) { process.stdout.write(JSON.stringify({ ok: false, error: error.message })) } })`
  })
  const results = (await synchronizedChildren(scripts)).map(({ index, output }) => ({ index, ...JSON.parse(output) }))
  const winners = results.filter(({ ok }) => ok); const losers = results.filter(({ ok }) => !ok)
  assert.equal(winners.length, 1); assert.equal(losers.length, 23); assert.equal(losers.every(({ error }) => error === 'registry_exists'), true); assert.equal(losers.every((row) => !Object.hasOwn(row, 'receipt')), true)
  const winner = sources[winners[0].index]
  assert.equal(winners[0].receipt.source_sha256, createHash('sha256').update(winner.bytes).digest('hex')); assert.equal(winners[0].receipt.source_mode, '0600')
  assert.deepEqual(loadRegistry(target).project_ids, [winner.projectId]); assert.equal(statSync(target).mode & 0o777, 0o600)
  for (const { source, bytes } of sources) assert.equal(readFileSync(source, 'utf8'), bytes)
  assert.deepEqual(readdirSync(dirname(target)).filter((name) => name.startsWith(`${basename(target)}.`)), [])
})

test('root publication collision allows only create or migrate to acknowledge one target', async () => {
  const root = mkdtempSync(join(tmpdir(), 'outcome-root-collision-')); const target = join(root, 'registry.json'); const source = join(root, 'legacy.json')
  const bindings = Array.from({ length: 200 }, (_, index) => ({ project_id: `migration-${index}`, role: 'builder', locator_ref: `private-${index}` }))
  const sourceBytes = `${JSON.stringify({ bindings })}\n`; writeFileSync(source, sourceBytes, { mode: 0o600 })
  const moduleUrl = new URL('./outcome-session-registry-persistence.mjs', import.meta.url).href
  const scripts = [
    `import { createEmptyRegistry } from ${JSON.stringify(moduleUrl)}; process.stdout.write('ready\\n'); process.stdin.once('data', () => { try { createEmptyRegistry(${JSON.stringify(target)}, ['create-winner']); process.stdout.write('success') } catch (error) { process.stdout.write(error.message) } })`,
    `import { migrateLegacyRegistry } from ${JSON.stringify(moduleUrl)}; process.stdout.write('ready\\n'); process.stdin.once('data', () => { try { migrateLegacyRegistry({ legacyPath: ${JSON.stringify(source)}, registryPath: ${JSON.stringify(target)}, projectIds: ${JSON.stringify(bindings.map(({ project_id }) => project_id))}, occurredAt: '2026-08-27T00:00:00.000Z' }); process.stdout.write('success') } catch (error) { process.stdout.write(error.message) } })`,
  ]
  const results = await synchronizedChildren(scripts); assert.equal(results.filter(({ output }) => output === 'success').length, 1)
  assert.equal(results.filter(({ output }) => output === 'registry_exists').length, 1)
  const registry = loadRegistry(target); assert.equal(registry.project_ids.length === 1 || registry.project_ids.length === 200, true)
  assert.equal(statSync(target).mode & 0o777, 0o600); assert.equal(readFileSync(source, 'utf8'), sourceBytes)
  assert.deepEqual(readdirSync(root).filter((name) => name.startsWith(`${basename(target)}.`)), [])
})

test('migration target object variants fail closed without follow overwrite or residue', () => {
  for (const makeTarget of [
    (target) => writeFileSync(target, 'existing', { mode: 0o600 }),
    (target) => symlinkSync(`${target}.missing`, target),
    (target) => { writeFileSync(`${target}.real`, 'existing', { mode: 0o600 }); symlinkSync(`${target}.real`, target) },
    (target) => mkdirSync(target),
  ]) {
    const root = mkdtempSync(join(tmpdir(), 'outcome-migration-target-')); const source = join(root, 'legacy.json'); const target = join(root, 'registry.json')
    const sourceBytes = `${JSON.stringify({ bindings: [{ project_id: 'outcome', role: 'builder', locator_ref: 'private' }] })}\n`; writeFileSync(source, sourceBytes, { mode: 0o600 }); makeTarget(target)
    const targetMetadata = lstatSync(target); const targetBytes = targetMetadata.isFile() && !targetMetadata.isSymbolicLink() ? readFileSync(target) : null
    assert.throws(() => migrateLegacyRegistry({ legacyPath: source, registryPath: target, projectIds: ['outcome'], occurredAt: '2026-08-27T00:00:00.000Z' }), /registry_exists/)
    assert.equal(readFileSync(source, 'utf8'), sourceBytes); assert.equal(lstatSync(target).isSymbolicLink(), targetMetadata.isSymbolicLink()); assert.equal(lstatSync(target).isDirectory(), targetMetadata.isDirectory())
    if (targetBytes) assert.deepEqual(readFileSync(target), targetBytes)
    assert.deepEqual(readdirSync(root).filter((name) => name.startsWith(`${basename(target)}.tmp-`) || name === `${basename(target)}.lock`), [])
  }
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
  const orphaned = doctorRegistry(path, ['outcome'], { now: new Date('2026-08-27T00:10:00.000Z') })
  assert.equal(orphaned.ok, false); assert.equal(orphaned.lock.state, 'orphaned'); assert.deepEqual(orphaned.issues, ['registry_lock_orphaned'])
  assert.deepEqual(recoverRegistryLock(path, { recoveryRef: orphaned.lock.recoveryRef, now: new Date('2026-08-27T00:10:00.000Z') }), { ok: true, recovered: true })
  assert.equal(existsSync(lockPath), false)
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

const seamForbiddenPatterns = [
  /\bsetTimeout\b/g, /\bsetInterval\b/g, /\bsetImmediate\b/g, /\bqueueMicrotask\b/g,
  /\bprocess\.nextTick\b/g, /\bPromise\b/g, /\basync\b/g, /\bawait\b/g,
]

// D10_SEAM_TESTS_START
const hasSeam = () => typeof registryModule.__withPorts === 'function'
const requireSeam = () => { assert.equal(typeof registryModule.__withPorts, 'function'); return registryModule.__withPorts }
const requireClassifier = () => { assert.equal(typeof registryModule.__classifyProbeOutcome, 'function'); return registryModule.__classifyProbeOutcome }
const errorWithCode = (code) => Object.assign(new Error(`hostile-${code}`), { code })
const currentIdentity = () => execFileSync('ps', ['-p', String(process.pid), '-o', 'uid=', '-o', 'lstart='], { encoding: 'utf8' }).trim().replace(/\s+/g, ' ')
const assignInput = (overrides = {}) => ({ action: 'assign', projectId: 'outcome', role: 'builder', expectedVersion: 0, locator: 'private', ...meta, ...overrides })
const registryFixture = () => { const path = tempPath(); createEmptyRegistry(path, ['outcome']); return path }
const entriesFor = (path) => readdirSync(dirname(path)).filter((name) => name.startsWith(basename(path)))
const lockValue = (path) => JSON.parse(readFileSync(`${path}.lock`, 'utf8'))
const delegateRemove = (entryPath, options) => options === undefined ? rmSync(entryPath) : rmSync(entryPath, options)
const delegateSyncDirectory = (directoryPath) => { const descriptor = openSync(directoryPath, 'r'); try { fsyncSync(descriptor) } finally { closeSync(descriptor) } }
const publicBaseline = () => { const path = registryFixture(); const result = mutateRegistry(path, assignInput()); assert.equal(result.status, 'active'); assert.equal(statSync(path).mode & 0o777, 0o600); return path }
const registryTempExists = (path) => entriesFor(path).some((name) => name.startsWith(`${basename(path)}.tmp-`))
const lockCandidateExists = (path) => entriesFor(path).some((name) => name.startsWith(`${basename(path)}.lock.candidate-`))
const mutateWithPorts = (path, overrides, input = assignInput()) => requireSeam()(overrides, () => mutateRegistry(path, input))
const sourceText = () => readFileSync(new URL('./outcome-session-registry-persistence.mjs', import.meta.url), 'utf8')

for (const [id, outcome, expected] of [
  ['R-16', { threw: true, status: 1, signal: null, code: null, killed: false, stdout: '' }, { kind: 'absent' }],
  ['R-17', { threw: true, status: 1, signal: null, code: null, killed: false, stdout: '   \n' }, { kind: 'absent' }],
  ['R-18', { threw: true, status: 1, signal: null, code: null, killed: false, stdout: 'x' }, { kind: 'unknown' }],
  ['R-19', { threw: true, status: null, signal: 'SIGTERM', killed: true }, { kind: 'unknown' }],
  ['R-20', { threw: true, code: 'ENOENT' }, { kind: 'unknown' }],
  ['R-21', { threw: true, status: 2, signal: null, code: null, stdout: '' }, { kind: 'unknown' }],
  ['R-22', { threw: false, stdout: '  ' }, { kind: 'unknown' }],
  ['R-23', { threw: false, stdout: '501 Sun Sep  6 13:20:59 2026' }, { kind: 'alive', identity: '501 Sun Sep 6 13:20:59 2026' }],
  ['R-24', { threw: true, status: 1, signal: null, code: null, killed: false, stdout: '', stderr: 'ps: No such process' }, { kind: 'absent' }],
]) test(`${id} classifies one total process-probe outcome`, () => {
  assert.deepEqual(requireClassifier()(outcome), expected)
})

const writeProbeLock = (path, overrides = {}) => {
  const value = { schema_version: 1, owner_pid: 99_999_999, owner_uid: typeof process.getuid === 'function' ? process.getuid() : null, process_start_identity: 'recorded identity', created_at: '2026-08-27T00:00:00.000Z', owner_nonce: '11111111-1111-4111-8111-111111111111', ...overrides }
  writeFileSync(`${path}.lock`, `${JSON.stringify(value)}\n`, { mode: 0o600 })
  return readFileSync(`${path}.lock`)
}
const probeDiagnosis = (path, result, now = '2026-08-27T00:10:00.000Z') => requireSeam()({ processIdentity: () => result }, () => doctorRegistry(path, ['outcome'], { now: new Date(now) }))

test('R-01 stale absent owner is orphaned', () => {
  const path = registryFixture(); writeProbeLock(path)
  assert.equal(probeDiagnosis(path, { kind: 'absent' }).lock.state, 'orphaned')
  assert.match(sourceText(), /observedIdentity\.kind === 'absent'/)
})

test('R-02 orphaned lock is recoverable', () => {
  const path = registryFixture(); writeProbeLock(path); const diagnosis = probeDiagnosis(path, { kind: 'absent' })
  assert.deepEqual(requireSeam()({ processIdentity: () => ({ kind: 'absent' }) }, () => recoverRegistryLock(path, { recoveryRef: diagnosis.lock.recoveryRef, now: new Date('2026-08-27T00:10:00.000Z') })), { ok: true, recovered: true })
  assert.equal(existsSync(`${path}.lock`), false)
  assert.match(sourceText(), /\['orphaned', 'pid_reused'\]\.includes\(diagnosis\.state\)/)
})

test('R-03 stale alive mismatched identity is pid_reused', () => {
  const path = registryFixture(); writeProbeLock(path)
  assert.equal(probeDiagnosis(path, { kind: 'alive', identity: 'replacement identity' }).lock.state, 'pid_reused')
})

test('R-04 pid_reused lock is recoverable', () => {
  const path = registryFixture(); writeProbeLock(path); const result = { kind: 'alive', identity: 'replacement identity' }; const diagnosis = probeDiagnosis(path, result)
  assert.equal(diagnosis.lock.state, 'pid_reused')
  assert.deepEqual(requireSeam()({ processIdentity: () => result }, () => recoverRegistryLock(path, { recoveryRef: diagnosis.lock.recoveryRef, now: new Date('2026-08-27T00:10:00.000Z') })), { ok: true, recovered: true })
})

test('R-05 stale unknown identity stays fail-closed', () => {
  const path = registryFixture(); writeProbeLock(path)
  assert.equal(probeDiagnosis(path, { kind: 'unknown' }).lock.state, 'identity_unknown')
})

test('R-06 identity_unknown recovery preserves exact lock bytes', () => {
  const path = registryFixture(); const before = writeProbeLock(path); const diagnosis = probeDiagnosis(path, { kind: 'unknown' })
  assert.throws(() => requireSeam()({ processIdentity: () => ({ kind: 'unknown' }) }, () => recoverRegistryLock(path, { recoveryRef: diagnosis.lock.recoveryRef, now: new Date('2026-08-27T00:10:00.000Z') })), /registry_lock_identity_unknown/)
  assert.deepEqual(readFileSync(`${path}.lock`), before)
})

test('R-07 a young unknown lock remains unconfirmed', () => {
  const path = registryFixture(); writeProbeLock(path, { created_at: '2026-08-27T00:09:45.001Z' })
  assert.equal(probeDiagnosis(path, { kind: 'unknown' }).lock.state, 'unconfirmed')
})

test('R-08 unknown self identity creates no lock artifact', () => {
  const path = registryFixture(); const before = readFileSync(path)
  assert.throws(() => mutateWithPorts(path, { processIdentity: () => ({ kind: 'unknown' }) }), /registry_lock_self_identity_unavailable/)
  assert.deepEqual(readFileSync(path), before); assert.equal(entriesFor(path).some((name) => name.includes('.lock')), false)
})

test('R-09 release does not probe and removes its unchanged lock', () => {
  const path = registryFixture(); let calls = 0
  const result = mutateWithPorts(path, { processIdentity: () => { calls += 1; return calls === 1 ? { kind: 'alive', identity: 'owner identity' } : { kind: 'unknown' } } })
  assert.equal(result.status, 'active'); assert.equal(calls, 1); assert.equal(existsSync(`${path}.lock`), false)
})

test('R-10 precommit ownership check does not probe', () => {
  const path = registryFixture(); let calls = 0; let entries = 0
  const result = mutateWithPorts(path, { processIdentity: () => { calls += 1; return calls === 1 ? { kind: 'alive', identity: 'owner identity' } : { kind: 'unknown' } }, renameEntry: (from, to) => { entries += 1; renameSync(from, to) } })
  assert.equal(result.status, 'active'); assert.equal(calls, 1); assert.equal(entries, 1)
})

test('R-13 doctor emits only the three new public-safe lock tokens', () => {
  for (const [probe, state] of [[{ kind: 'absent' }, 'orphaned'], [{ kind: 'alive', identity: 'replacement identity' }, 'pid_reused'], [{ kind: 'unknown' }, 'identity_unknown']]) {
    const path = registryFixture(); writeProbeLock(path); const diagnosis = probeDiagnosis(path, probe)
    assert.equal(diagnosis.lock.state, state); assert.deepEqual(diagnosis.issues, [`registry_lock_${state}`]); assert.equal(JSON.stringify(diagnosis).includes(['identity', 'unavailable'].join('_')), false)
  }
})

test('R-14 public lock states expose no owner identity nonce pid or path', () => {
  for (const probe of [{ kind: 'absent' }, { kind: 'alive', identity: 'replacement identity' }, { kind: 'unknown' }]) {
    const path = registryFixture(); const bytes = writeProbeLock(path); const lock = probeDiagnosis(path, probe).lock; const output = JSON.stringify(lock)
    for (const secret of ['recorded identity', '11111111-1111-4111-8111-111111111111', '99999999', path, bytes.toString('utf8')]) assert.equal(output.includes(secret), false)
  }
})

test('R-15 one mutation has one injected probe call and one default ps call site', () => {
  const path = registryFixture(); const calls = []
  mutateWithPorts(path, { processIdentity: (pid) => { calls.push(pid); return { kind: 'alive', identity: 'owner identity' } } })
  assert.deepEqual(calls, [process.pid]); assert.equal((sourceText().match(/execFileSync\(/g) ?? []).length, 1)
  assert.equal((sourceText().match(/export function __classifyProbeOutcome/g) ?? []).length, 1)
  const productionReferences = readdirSync(new URL('.', import.meta.url), { withFileTypes: true }).filter((entry) => entry.isFile() && entry.name.endsWith('.mjs') && entry.name !== 'outcome-session-registry-persistence.mjs' && !entry.name.endsWith('.test.mjs')).flatMap((entry) => (readFileSync(new URL(entry.name, import.meta.url), 'utf8').match(/__classifyProbeOutcome/g) ?? []))
  assert.equal(productionReferences.length, 0)
})

test('file fsync precedes every entry operation', () => {
  if (!hasSeam()) { publicBaseline(); return }
  const created = tempPath(); const publication = []
  registryModule.__withPorts({ fsyncFile: (descriptor) => { publication.push('fsyncFile'); fsyncSync(descriptor) }, linkEntry: (from, to) => { publication.push('linkEntry'); linkSync(from, to) } }, () => createEmptyRegistry(created, ['outcome']))
  assert.deepEqual(publication, ['fsyncFile', 'linkEntry'])
  const mutation = []; mutateWithPorts(created, { fsyncFile: (descriptor) => { if (registryTempExists(created)) mutation.push('fsyncFile'); fsyncSync(descriptor) }, renameEntry: (from, to) => { mutation.push('renameEntry'); renameSync(from, to) } })
  assert.deepEqual(mutation, ['fsyncFile', 'renameEntry'])
})

test('file fsync denial touches no target entry', () => {
  const withPorts = requireSeam(); const path = tempPath(); let links = 0; let calls = 0
  assert.throws(() => withPorts({ fsyncFile: () => { calls += 1; throw errorWithCode('EIO') }, linkEntry: () => { links += 1 } }, () => createEmptyRegistry(path, ['outcome'])), /registry_durability_precommit_failed/)
  assert.equal(calls, 1); assert.equal(links, 0); assert.equal(existsSync(path), false); assert.equal(registryTempExists(path), false)
})

test('directory sync receives the target parent after entry', () => {
  if (!hasSeam()) { publicBaseline(); return }
  const path = tempPath(); const order = []
  registryModule.__withPorts({ linkEntry: (from, to) => { order.push('entry'); linkSync(from, to) }, syncDirectory: (dir) => { order.push(dir); delegateSyncDirectory(dir) } }, () => createEmptyRegistry(path, ['outcome']))
  assert.deepEqual(order, ['entry', dirname(path)])
})

test('directory sync failure is commit indeterminate', () => {
  const path = tempPath(); let calls = 0
  assert.throws(() => requireSeam()({ syncDirectory: () => { calls += 1; throw errorWithCode('EIO') } }, () => createEmptyRegistry(path, ['outcome'])), /registry_commit_indeterminate/)
  assert.equal(calls, 1); assert.equal(loadRegistry(path).revision, 0)
})

test('publication cleanup follows directory sync', () => {
  const path = tempPath(); const order = []
  requireSeam()({
    fsyncFile: (descriptor) => { order.push('fsyncFile'); fsyncSync(descriptor) },
    linkEntry: (from, to) => { order.push('linkEntry'); linkSync(from, to) },
    syncDirectory: (dir) => { order.push('syncDirectory'); delegateSyncDirectory(dir) },
    removeEntry: (entry, options) => { order.push('removeEntry'); delegateRemove(entry, options) },
  }, () => createEmptyRegistry(path, ['outcome']))
  assert.deepEqual(order, ['fsyncFile', 'linkEntry', 'syncDirectory', 'removeEntry'])
})

test('publication link success creates one complete target', () => {
  if (!hasSeam()) { const path = tempPath(); createEmptyRegistry(path, ['outcome']); assert.equal(loadRegistry(path).revision, 0); return }
  const path = tempPath(); let calls = 0
  registryModule.__withPorts({ linkEntry: (from, to) => { calls += 1; linkSync(from, to) } }, () => createEmptyRegistry(path, ['outcome']))
  assert.equal(calls, 1); assert.equal(loadRegistry(path).revision, 0); assert.equal(statSync(path).mode & 0o777, 0o600)
})

test('publication EEXIST preserves authoritative target', () => {
  const path = tempPath(); writeFileSync(path, 'authoritative', { mode: 0o600 }); const before = readFileSync(path); const mode = statSync(path).mode & 0o777
  assert.throws(() => createEmptyRegistry(path, ['outcome']), /registry_exists/)
  assert.deepEqual(readFileSync(path), before); assert.equal(statSync(path).mode & 0o777, mode)
})

for (const code of ['EMLINK', 'EPERM', 'EXDEV']) test('known publication link denials are distinguished', () => {
  const path = tempPath(); let calls = 0
  assert.throws(() => requireSeam()({ linkEntry: () => { calls += 1; throw errorWithCode(code) } }, () => createEmptyRegistry(path, ['outcome'])), /registry_publication_precommit_failed/)
  assert.equal(calls, 1); assert.equal(existsSync(path), false); assert.equal(registryTempExists(path), false)
})

test('atomic rename consumes the original temp name', () => {
  if (!hasSeam()) { publicBaseline(); return }
  const path = registryFixture(); let from
  mutateWithPorts(path, { renameEntry: (oldPath, newPath) => { from = oldPath; renameSync(oldPath, newPath) } })
  assert.equal(from.startsWith(`${path}.tmp-`), true); assert.equal(existsSync(from), false)
})

test('rename failure keeps indeterminate primary and removes temp', () => {
  const path = registryFixture(); const before = readFileSync(path); let calls = 0
  assert.throws(() => mutateWithPorts(path, { renameEntry: () => { calls += 1; throw errorWithCode('ENOSPC') } }), /registry_commit_indeterminate/)
  assert.equal(calls, 1); assert.deepEqual(readFileSync(path), before); assert.equal(registryTempExists(path), false)
})

test('removal never targets the registry document', () => {
  if (!hasSeam()) { publicBaseline(); return }
  const path = registryFixture(); const removed = []
  mutateWithPorts(path, { removeEntry: (entry, options) => { removed.push(entry); delegateRemove(entry, options) } })
  assert.equal(removed.includes(path), false); assert.equal(removed.every((entry) => entry === `${path}.lock` || entry.includes('.candidate-') || entry.includes('.tmp-')), true)
})

test('durable publication cleanup failure returns success with residue', () => {
  const path = tempPath(); let calls = 0
  const result = requireSeam()({ removeEntry: (entry, options) => { if (entry.startsWith(`${path}.tmp-`)) { calls += 1; throw errorWithCode('EPERM') } delegateRemove(entry, options) } }, () => createEmptyRegistry(path, ['outcome']))
  assert.equal(result.revision, 0); assert.equal(calls, 1); assert.equal(registryTempExists(path), true); assert.equal(loadRegistry(path).revision, 0)
})

test('owned lock cleanup failure returns success with residue', () => {
  const path = registryFixture(); let calls = 0
  const result = mutateWithPorts(path, { removeEntry: (entry, options) => { if (entry === `${path}.lock`) { calls += 1; throw errorWithCode('EPERM') } delegateRemove(entry, options) } })
  assert.equal(result.status, 'active'); assert.equal(calls, 1); assert.equal(existsSync(`${path}.lock`), true)
})

test('available process identity permits lock acquisition', () => {
  if (!hasSeam()) { publicBaseline(); return }
  const path = registryFixture(); let calls = 0
  mutateWithPorts(path, { processIdentity: () => { calls += 1; return { kind: 'alive', identity: 'stable identity' } }, fsyncFile: (descriptor) => { if (registryTempExists(path)) assert.equal(lockValue(path).process_start_identity, 'stable identity'); fsyncSync(descriptor) } })
  assert.equal(calls, 1)
})

test('missing current identity creates no lock artifacts', () => {
  if (!hasSeam()) { assert.throws(() => mutateRegistry(registryFixture(), assignInput({ expectedVersion: 2 })), /stale_version/); return }
  const path = registryFixture(); const before = readFileSync(path)
  assert.throws(() => mutateWithPorts(path, { processIdentity: () => ({ kind: 'unknown' }) }), /registry_lock_self_identity_unavailable/)
  assert.deepEqual(readFileSync(path), before); assert.equal(entriesFor(path).some((name) => name.includes('.lock')), false)
})

for (const boundary of ['pre-entry', 'release']) test('probe drift is irrelevant at both file-ownership boundaries', () => {
  const path = registryFixture(); let identity = { kind: 'alive', identity: 'owner identity' }; let entries = 0; let lockRemoval = 0
  const overrides = {
    processIdentity: () => identity,
    renameEntry: (from, to) => { entries += 1; renameSync(from, to) },
    removeEntry: (entry, options) => { if (entry === `${path}.lock`) lockRemoval += 1; delegateRemove(entry, options) },
  }
  if (boundary === 'pre-entry') overrides.fsyncFile = (descriptor) => { if (registryTempExists(path)) identity = { kind: 'unknown' }; fsyncSync(descriptor) }
  else overrides.syncDirectory = (dir) => { identity = { kind: 'unknown' }; delegateSyncDirectory(dir) }
  assert.equal(mutateWithPorts(path, overrides).status, 'active')
  assert.equal(entries, 1); assert.equal(lockRemoval, 1)
})

test('supported POSIX no-follow path remains usable', () => { const path = publicBaseline(); assert.equal(loadRegistry(path).bindings.length, 1) })

test('win32 guard denies before directory entry growth', () => {
  const source = sourceText(); const writeAt = source.indexOf('function atomicWrite'); const publishAt = source.indexOf('function atomicPublishNewRegistry')
  const guard = hasSeam() ? "environment.platform === 'win32'" : "process.platform === 'win32'"
  assert.equal(source.indexOf(guard, writeAt) < source.indexOf('mkdirSync', writeAt), true)
  assert.equal(source.indexOf(guard, publishAt) < source.indexOf('mkdirSync', publishAt), true)
})

test('missing no-follow support denies before entry growth', () => {
  const source = sourceText(); const writeAt = source.indexOf('function atomicWrite'); const publishAt = source.indexOf('function atomicPublishNewRegistry')
  const guard = hasSeam() ? '!environment.hasNoFollow' : '!Number.isInteger(constants.O_NOFOLLOW)'
  assert.equal(source.indexOf(guard, writeAt) < source.indexOf('mkdirSync', writeAt), true)
  assert.equal(source.indexOf(guard, publishAt) < source.indexOf('mkdirSync', publishAt), true)
})

test('direct nonce generation remains unique and valid', () => {
  if (!hasSeam()) { assert.match(createHash('sha256').update('nonce').digest('hex'), /^[a-f0-9]{64}$/); return }
  const nonces = []
  for (let index = 0; index < 2; index += 1) { const path = registryFixture(); mutateWithPorts(path, { fsyncFile: (descriptor) => { if (registryTempExists(path)) nonces.push(lockValue(path).owner_nonce); fsyncSync(descriptor) } }) }
  assert.match(nonces[0], /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i); assert.notEqual(nonces[0], nonces[1])
})

test('copied nonce alone never establishes ownership', () => {
  if (!hasSeam()) { publicBaseline(); return }
  const path = registryFixture(); let observed
  mutateWithPorts(path, { fsyncFile: (descriptor) => { if (registryTempExists(path)) observed = lockValue(path).owner_nonce; fsyncSync(descriptor) } })
  const forged = { schema_version: 1, owner_pid: 99999999, owner_uid: typeof process.getuid === 'function' ? process.getuid() : null, process_start_identity: 'other', created_at: '2026-08-27T00:00:00.000Z', owner_nonce: observed }
  writeFileSync(`${path}.lock`, `${JSON.stringify(forged)}\n`, { mode: 0o600 }); const before = readFileSync(`${path}.lock`)
  assert.notEqual(doctorRegistry(path, ['outcome'], { now: new Date('2026-08-27T00:10:00.000Z') }).lock.state, 'live'); assert.deepEqual(readFileSync(`${path}.lock`), before)
})

test('ordinary acquisitions produce distinct UUID nonces', () => {
  if (!hasSeam()) { publicBaseline(); return }
  const values = []
  for (let index = 0; index < 2; index += 1) { const path = registryFixture(); mutateWithPorts(path, { fsyncFile: (descriptor) => { if (registryTempExists(path)) values.push(lockValue(path).owner_nonce); fsyncSync(descriptor) } }) }
  assert.equal(values.length, 2); assert.notEqual(values[0], values[1])
})

test('same nonce with different PID and identity is foreign at release', () => {
  const path = registryFixture(); let removals = 0; let forged
  const result = mutateWithPorts(path, { syncDirectory: (dir) => { const value = lockValue(path); forged = { ...value, owner_pid: value.owner_pid + 1, process_start_identity: 'foreign' }; writeFileSync(`${path}.lock`, `${JSON.stringify(forged)}\n`, { mode: 0o600 }); delegateSyncDirectory(dir) }, removeEntry: (entry, options) => { if (entry === `${path}.lock`) removals += 1; delegateRemove(entry, options) } })
  assert.equal(result.status, 'active'); assert.equal(removals, 0); assert.deepEqual(JSON.parse(readFileSync(`${path}.lock`, 'utf8')), forged)
})

test('acquisition captures one exact three-field ownership value', () => {
  if (!hasSeam()) { assert.match(sourceText(), /owner_nonce:\s*randomUUID\(\)/); return }
  const path = registryFixture(); let captured
  mutateWithPorts(path, { fsyncFile: (descriptor) => { if (registryTempExists(path)) captured = lockValue(path); fsyncSync(descriptor) } })
  assert.deepEqual(Object.keys(captured).filter((key) => ['owner_pid', 'process_start_identity', 'owner_nonce'].includes(key)), ['owner_pid', 'process_start_identity', 'owner_nonce'])
})

test('nonce-only replacement is foreign at release', () => {
  const path = registryFixture(); let replacement; let removals = 0
  const result = mutateWithPorts(path, { syncDirectory: (dir) => { const value = lockValue(path); replacement = { ...value, owner_nonce: '99999999-9999-4999-8999-999999999999' }; writeFileSync(`${path}.lock`, `${JSON.stringify(replacement)}\n`, { mode: 0o600 }); delegateSyncDirectory(dir) }, removeEntry: (entry, options) => { if (entry === `${path}.lock`) removals += 1; delegateRemove(entry, options) } })
  assert.equal(result.status, 'active'); assert.equal(removals, 0); assert.deepEqual(JSON.parse(readFileSync(`${path}.lock`, 'utf8')), replacement)
})

test('new lock contains all six exact fields', () => {
  if (!hasSeam()) { publicBaseline(); return }
  const path = registryFixture(); let keys
  mutateWithPorts(path, { fsyncFile: (descriptor) => { if (registryTempExists(path)) keys = Object.keys(lockValue(path)); fsyncSync(descriptor) } })
  assert.deepEqual(keys, ['schema_version', 'owner_pid', 'owner_uid', 'process_start_identity', 'created_at', 'owner_nonce'])
})

test('missing nonce makes a forged lock invalid', () => {
  const path = registryFixture(); const value = { schema_version: 1, owner_pid: process.pid, owner_uid: typeof process.getuid === 'function' ? process.getuid() : null, process_start_identity: currentIdentity(), created_at: '2026-08-27T00:00:00.000Z' }
  writeFileSync(`${path}.lock`, `${JSON.stringify(value)}\n`, { mode: 0o600 }); const before = readFileSync(`${path}.lock`)
  assert.equal(doctorRegistry(path, ['outcome'], { now: new Date('2026-08-27T00:10:00.000Z') }).lock.state, 'invalid'); assert.throws(() => recoverRegistryLock(path), /registry_lock_invalid/); assert.deepEqual(readFileSync(`${path}.lock`), before)
})

test('unchanged exact owner permits one commit', () => {
  if (!hasSeam()) { publicBaseline(); return }
  const path = registryFixture(); let entries = 0; let seen = 0
  mutateWithPorts(path, { fsyncFile: (descriptor) => { if (registryTempExists(path)) { lockValue(path); seen += 1 } fsyncSync(descriptor) }, renameEntry: (from, to) => { entries += 1; renameSync(from, to) } })
  assert.equal(seen, 1); assert.equal(entries, 1)
})

test('R-11 precommit nonce replacement writes zero entries', () => {
  const path = registryFixture(); let entries = 0
  assert.throws(() => mutateWithPorts(path, { fsyncFile: (descriptor) => { if (registryTempExists(path)) { const value = lockValue(path); writeFileSync(`${path}.lock`, `${JSON.stringify({ ...value, owner_nonce: '88888888-8888-4888-8888-888888888888' })}\n`, { mode: 0o600 }) } fsyncSync(descriptor) }, renameEntry: () => { entries += 1 } }), /registry_lock_ownership_lost/)
  assert.equal(entries, 0)
})

test('unchanged exact owner removes one lock', () => {
  if (!hasSeam()) { publicBaseline(); return }
  const path = registryFixture(); let removals = 0
  mutateWithPorts(path, { removeEntry: (entry, options) => { if (entry === `${path}.lock`) removals += 1; delegateRemove(entry, options) } })
  assert.equal(removals, 1); assert.equal(existsSync(`${path}.lock`), false); assert.equal(mutateRegistry(path, { ...assignInput(), expectedVersion: 1, action: 'observe', status: 'idle', observedAt: meta.occurredAt }).status, 'idle')
})

test('R-12 release nonce replacement preserves foreign lock', () => {
  const path = registryFixture(); let bytes; let removals = 0
  assert.equal(mutateWithPorts(path, { syncDirectory: (dir) => { const value = lockValue(path); bytes = Buffer.from(`${JSON.stringify({ ...value, owner_nonce: '77777777-7777-4777-8777-777777777777' })}\n`); writeFileSync(`${path}.lock`, bytes, { mode: 0o600 }); delegateSyncDirectory(dir) }, removeEntry: (entry, options) => { if (entry === `${path}.lock`) removals += 1; delegateRemove(entry, options) } }).status, 'active')
  assert.equal(removals, 0); assert.deepEqual(readFileSync(`${path}.lock`), bytes)
})

test('successful result exposes no ownership nonce', () => {
  const result = mutateRegistry(registryFixture(), assignInput()); assert.equal(JSON.stringify(result).includes('owner_nonce'), false)
})

test('classified failures expose no nonce PID path or raw message', () => {
  if (!hasSeam()) { assert.throws(() => createEmptyRegistry(tempPath(), []), /invalid_project_registry/); return }
  const path = tempPath(); let caught
  try { registryModule.__withPorts({ linkEntry: () => { throw Object.assign(new Error('secret-path-123'), { code: 'EACCES' }) } }, () => createEmptyRegistry(path, ['outcome'])) } catch (error) { caught = error }
  assert.equal(caught.message, 'registry_publication_precommit_failed'); assert.equal(JSON.stringify(caught).includes('secret-path-123'), false); assert.equal(JSON.stringify(caught).includes(path), false)
})

test('publication collision is denied as registry exists', () => {
  const path = tempPath(); writeFileSync(path, 'fixed', { mode: 0o600 }); const before = readFileSync(path)
  assert.throws(() => createEmptyRegistry(path, ['outcome']), /registry_exists/); assert.deepEqual(readFileSync(path), before)
})

test('lock collision is denied as registry busy', () => {
  const path = registryFixture(); writeFileSync(`${path}.lock`, 'fixed', { mode: 0o600 }); const before = readFileSync(`${path}.lock`)
  assert.throws(() => mutateRegistry(path, assignInput()), /registry_busy/); assert.deepEqual(readFileSync(`${path}.lock`), before); assert.equal(loadRegistry(path).revision, 0)
})

test('non-EEXIST publication errno has an explicit certainty class', () => {
  const withPorts = requireSeam()
  for (const [code, expected] of [['EACCES', 'registry_publication_precommit_failed'], ['EPERM', 'registry_publication_precommit_failed'], ['EXDEV', 'registry_publication_precommit_failed'], ['EMLINK', 'registry_publication_precommit_failed'], ['EROFS', 'registry_publication_precommit_failed'], ['ENOSPC', 'registry_commit_indeterminate'], [undefined, 'registry_commit_indeterminate']]) {
    const path = tempPath(); let calls = 0; let caught
    try { withPorts({ linkEntry: () => { calls += 1; throw code === undefined ? new Error('hostile') : errorWithCode(code) } }, () => createEmptyRegistry(path, ['outcome'])) } catch (error) { caught = error }
    assert.equal(caught.message, expected); assert.equal(calls, 1); assert.notEqual(caught.message, 'registry_unavailable')
  }
})

test('pre-entry file fsync failure is denied', () => {
  const path = registryFixture(); const before = readFileSync(path); let calls = 0
  assert.throws(() => mutateWithPorts(path, { fsyncFile: (descriptor) => { if (registryTempExists(path)) { calls += 1; throw errorWithCode('EIO') } fsyncSync(descriptor) } }), /registry_durability_precommit_failed/)
  assert.equal(calls, 1); assert.deepEqual(readFileSync(path), before)
})

test('post-entry directory fsync failure is indeterminate', () => {
  const path = registryFixture(); let calls = 0
  assert.throws(() => mutateWithPorts(path, { syncDirectory: () => { calls += 1; throw errorWithCode('EIO') } }), /registry_commit_indeterminate/); assert.equal(calls, 1); assert.equal(loadRegistry(path).revision, 1)
})

test('postcommit cleanup failure is nonfatal and observable', () => {
  const path = tempPath(); let calls = 0
  const result = requireSeam()({ removeEntry: (entry, options) => { if (entry.startsWith(`${path}.tmp-`)) { calls += 1; throw errorWithCode('EPERM') } delegateRemove(entry, options) } }, () => createEmptyRegistry(path, ['outcome']))
  assert.equal(result.revision, 0); assert.equal(calls, 1); assert.equal(registryTempExists(path), true)
})

test('precommit ownership loss is denied', () => {
  const path = registryFixture(); let entries = 0
  assert.throws(() => mutateWithPorts(path, { fsyncFile: (descriptor) => { if (registryTempExists(path)) { const value = lockValue(path); writeFileSync(`${path}.lock`, `${JSON.stringify({ ...value, owner_pid: value.owner_pid + 1 })}\n`, { mode: 0o600 }) } fsyncSync(descriptor) }, renameEntry: () => { entries += 1 } }), /registry_lock_ownership_lost/); assert.equal(entries, 0)
})

test('postcommit ownership loss preserves truth and foreign lock', () => {
  const path = registryFixture(); let bytes; let removals = 0
  const result = mutateWithPorts(path, { syncDirectory: (dir) => { const value = lockValue(path); bytes = Buffer.from(`${JSON.stringify({ ...value, process_start_identity: 'foreign' })}\n`); writeFileSync(`${path}.lock`, bytes, { mode: 0o600 }); delegateSyncDirectory(dir) }, removeEntry: (entry, options) => { if (entry === `${path}.lock`) removals += 1; delegateRemove(entry, options) } })
  assert.equal(result.status, 'active'); assert.equal(removals, 0); assert.deepEqual(readFileSync(`${path}.lock`), bytes)
})

test('normal synchronous override preserves default-equivalent behavior', () => {
  const first = publicBaseline(); if (!hasSeam()) { assert.equal(loadRegistry(first).revision, 1); return }
  const second = registryFixture(); let calls = 0; const result = mutateWithPorts(second, { renameEntry: (from, to) => { calls += 1; renameSync(from, to) } })
  assert.equal(result.status, 'active'); assert.equal(calls, 1); assert.equal(loadRegistry(second).revision, 1); publicBaseline(); assert.equal(calls, 1)
})

test('synchronous callback throw restores and rethrows by identity', () => {
  const sentinel = { marker: 'sentinel' }; let caught; let calls = 0
  try { requireSeam()({ linkEntry: () => { calls += 1 } }, () => { throw sentinel }) } catch (error) { caught = error }
  assert.equal(caught, sentinel); createEmptyRegistry(tempPath(), ['outcome']); assert.equal(calls, 0)
})

test('nested overrides compose and restore in LIFO order', () => {
  const withPorts = requireSeam(); const path = registryFixture(); const calls = []
  withPorts({ removeEntry: (entry, options) => { calls.push('outer-remove'); delegateRemove(entry, options) } }, (outerPorts) => {
    assert.equal(typeof outerPorts.removeEntry, 'function')
    withPorts({ fsyncFile: (descriptor) => { calls.push('inner-fsync'); fsyncSync(descriptor) } }, (innerPorts) => { assert.notEqual(innerPorts, outerPorts); mutateRegistry(path, assignInput()) })
    const second = registryFixture(); mutateRegistry(second, assignInput())
  })
  const before = calls.length; publicBaseline(); assert.equal(calls.length, before); assert.equal(calls.includes('inner-fsync'), true); assert.equal(calls.includes('outer-remove'), true)
})

test('environment remains fixed and cannot expand capability', () => {
  const source = sourceText(); assert.throws(() => requireSeam()({ environment: () => ({ platform: 'win32' }) }, () => {}), /test_ports_invalid_override/)
  assert.match(source, /const environment = Object\.freeze/); assert.match(source, /environment\.platform/); assert.match(source, /environment\.hasNoFollow/)
})

test('production remains synchronous and never calls the test seam', () => {
  const source = sourceText(); const occurrences = source.match(/__withPorts/g) ?? []
  assert.equal(occurrences.length, hasSeam() ? 1 : 0); assert.doesNotMatch(source, /\basync\b|\bawait\b|\bPromise\b/); publicBaseline()
})

test('deferred work inside the seam is rejected', () => {
  let handle
  // D10_S07_GUARD_START
  assert.throws(() => requireSeam()({}, () => { handle = setTimeout(() => {}, 60_000) }), /test_ports_deferred_work_detected/)
  // D10_S07_GUARD_END
  clearTimeout(handle); publicBaseline()
})

test('escaped port reference cannot be invoked after restoration', () => {
  let escaped; let calls = 0
  requireSeam()({ linkEntry: () => { calls += 1 } }, (currentPorts) => { escaped = currentPorts.linkEntry })
  assert.throws(() => escaped('from', 'to'), /test_ports_escaped_scope/); assert.equal(calls, 0)
})

test('seam test file contains no asynchronous primitive', () => {
  const text = readFileSync(new URL('./outcome-session-registry-persistence.test.mjs', import.meta.url), 'utf8')
  const start = text.indexOf('// D10_SEAM_TESTS_START'); const end = text.indexOf('// D10_SEAM_TESTS_END')
  const body = text.slice(start, end).replace(/\/\/ D10_S07_GUARD_START[\s\S]*?\/\/ D10_S07_GUARD_END/, '')
  for (const pattern of seamForbiddenPatterns) assert.equal((body.match(pattern) ?? []).length, 0, pattern.source)
})

const identityUnavailableFixture = (path) => {
  const value = { schema_version: 1, owner_pid: 99999999, owner_uid: typeof process.getuid === 'function' ? process.getuid() : null, process_start_identity: 'missing process', created_at: '2026-08-27T00:00:00.000Z', owner_nonce: '11111111-1111-4111-8111-111111111111' }
  writeFileSync(`${path}.lock`, `${JSON.stringify(value)}\n`, { mode: 0o600 }); return readFileSync(`${path}.lock`)
}

test('identity-unknown lock is never classified orphaned', () => {
  const path = registryFixture(); identityUnavailableFixture(path)
  const diagnosis = requireSeam()({ processIdentity: () => ({ kind: 'unknown' }) }, () => doctorRegistry(path, ['outcome'], { now: new Date('2026-08-27T00:10:00.000Z') }).lock)
  assert.deepEqual(diagnosis, { state: 'identity_unknown', recoveryRef: diagnosis.recoveryRef, ageSeconds: 600 }); assert.match(diagnosis.recoveryRef, /^[a-f0-9]{64}$/)
})

test('identity-unknown lock recovery is denied without mutation', () => {
  const path = registryFixture(); const before = identityUnavailableFixture(path)
  assert.throws(() => requireSeam()({ processIdentity: () => ({ kind: 'unknown' }) }, () => recoverRegistryLock(path, { recoveryRef: createHash('sha256').update(before).digest('hex'), now: new Date('2026-08-27T00:10:00.000Z') })), /registry_lock_identity_unknown/)
  assert.deepEqual(readFileSync(`${path}.lock`), before); assert.equal(entriesFor(path).some((name) => name.includes('.recovery-')), false)
})

test('doctor reports identity-unknown lock without recovery', () => {
  const path = registryFixture(); const before = identityUnavailableFixture(path)
  const result = requireSeam()({ processIdentity: () => ({ kind: 'unknown' }) }, () => doctorRegistry(path, ['outcome'], { now: new Date('2026-08-27T00:10:00.000Z') }))
  assert.equal(result.ok, false); assert.deepEqual(result.issues, ['registry_lock_identity_unknown']); assert.equal(result.lock.state, 'identity_unknown'); assert.match(result.lock.recoveryRef, /^[a-f0-9]{64}$/); assert.equal(result.lock.ageSeconds, 600); assert.deepEqual(readFileSync(`${path}.lock`), before)
})
// D10_SEAM_TESTS_END
