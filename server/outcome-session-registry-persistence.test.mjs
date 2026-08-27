import assert from 'node:assert/strict'
import test from 'node:test'
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createEmptyRegistry, loadRegistry, migrateLegacyRegistry, mutateRegistry, publicRegistryProjection } from './outcome-session-registry-persistence.mjs'

const tempPath = () => join(mkdtempSync(join(tmpdir(), 'outcome-session-v2-')), 'registry.json')
const meta = { actorClass: 'builder', reasonClass: 'approved_local_test', occurredAt: '2026-08-27T00:00:00.000Z' }

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
  mutateRegistry(path, { action: 'replace', projectId: 'outcome', role: 'builder', expectedVersion: 1, locator: 'two', ...meta })
  const afterWinner = readFileSync(path)
  assert.throws(() => mutateRegistry(path, { action: 'replace', projectId: 'outcome', role: 'builder', expectedVersion: 1, locator: 'three', ...meta }), /stale_version/)
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
