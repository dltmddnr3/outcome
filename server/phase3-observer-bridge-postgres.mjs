import { isProxy } from 'node:util/types'
import { createCipheriv, createDecipheriv, createHash, createPublicKey, randomBytes, verify as verifySignature } from 'node:crypto'
import { canonicalEnrollmentBytes, canonicalHostedRequestBytes } from './phase3-observer-bridge-hosted.mjs'

const ROLES = new Set(['planner', 'builder', 'ux_product_qa', 'release_audit'])
const STATUS_CODES = new Set(['작업 준비 중', '구현 진행 중', '테스트 실행 중', '검수 진행 중', '결과 정리 중', '응답 대기 중'])
const SAFE_ID = /^[a-z][a-z0-9_-]{0,63}$/
const PRIVATE_REF = /^[a-z][A-Za-z0-9_-]{7,95}$/
const DIGEST = /^[0-9a-f]{64}$/
const CONFIG_FIELDS = new Set(['with_transaction', 'clone', 'expected_schema_version', 'new_row_id', 'now', 'future_skew_ms'])
const EVENT_FIELDS = new Set(['workspace_id', 'project_id', 'role', 'binding_version', 'source_ref', 'source_version', 'key_version', 'request_digest', 'nonce_digest', 'event_digest', 'sequence', 'status_code', 'observed_at', 'expires_at', 'expected_ledger_revision'])
const ACTIVATE_FIELDS = new Set(['workspace_id', 'project_id', 'role', 'binding_version', 'source_ref', 'source_version', 'key_version', 'challenge_digest', 'expected_challenge_revision', 'certificate_digest', 'public_key_spki', 'public_key_digest', 'activated_at'])
const ROTATE_FIELDS = new Set(['workspace_id', 'project_id', 'role', 'binding_version', 'source_ref', 'source_version', 'expected_source_revision', 'expected_key_version', 'new_key_version', 'public_key_spki', 'public_key_digest', 'rotated_at'])
const REVOKE_FIELDS = new Set(['workspace_id', 'project_id', 'role', 'binding_version', 'source_ref', 'source_version', 'expected_source_revision', 'revoked_at'])
const TOMBSTONE_FIELDS = new Set(['workspace_id', 'project_id', 'role', 'binding_version', 'source_ref', 'source_version', 'deletion_revision', 'deletion_receipt_digest', 'purge_before', 'tombstoned_at', 'expected_durable_revision'])
const MANIFEST_FIELDS = new Set(['manifest_ref', 'workspace_id', 'project_id', 'role', 'binding_version', 'source_ref', 'source_version', 'deletion_revision', 'manifest_schema_version', 'bridge_schema_version', 'durable_revision', 'tombstone_count', 'tombstone_coverage_digest', 'stored_at'])
const RESTORE_FIELDS = new Set(['restore_receipt_ref', 'manifest_ref', 'manifest_digest', 'workspace_id', 'project_id', 'role', 'binding_version', 'source_ref', 'source_version', 'deletion_revision', 'expected_schema_version', 'expected_durable_revision', 'restored_at'])
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
export const OBSERVER_BRIDGE_POSTGRES_FUTURE_SKEW_MS = 5_000
export const OBSERVER_BRIDGE_EFFECTIVE_ROLE = 'outcome_bridge_backend'

export class ObserverBridgePostgresError extends Error {
  constructor(code) {
    super(code)
    this.name = 'ObserverBridgePostgresError'
    this.code = code
  }
}

const fail = (code) => { throw new ObserverBridgePostgresError(code) }
const positive = (value) => typeof value === 'number' && Number.isSafeInteger(value) && value > 0
const nonNegative = (value) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
const safeId = (value) => typeof value === 'string' && SAFE_ID.test(value)
const privateRef = (value) => typeof value === 'string' && PRIVATE_REF.test(value)
const digest = (value) => typeof value === 'string' && DIGEST.test(value)
const iso = (value) => typeof value === 'string' && new Date(value).toISOString() === value
const sha256 = (value) => createHash('sha256').update(value).digest('hex')

export function createOpaqueLedgerId(now = Date.now()) {
  if (!Number.isSafeInteger(now) || now < 0 || now > 0xffffffffffff) fail('identity_unavailable')
  const bytes = randomBytes(16)
  let timestamp = BigInt(now)
  for (let index = 5; index >= 0; index -= 1) { bytes[index] = Number(timestamp & 0xffn); timestamp >>= 8n }
  bytes[6] = (bytes[6] & 0x0f) | 0x70
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = bytes.toString('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export function computeTombstoneCoverageDigest(rows) {
  if (!Array.isArray(rows)) fail('restore_denied')
  const canonical = rows.map((row) => {
    if (!safeId(row.workspace_id) || !safeId(row.project_id) || !ROLES.has(row.role) || !positive(Number(row.binding_version)) || !privateRef(row.source_ref) || !positive(Number(row.source_version)) || !positive(Number(row.deletion_revision)) || !digest(row.deletion_receipt_digest)) fail('restore_denied')
    return `${row.workspace_id}\u001f${row.project_id}\u001f${row.role}\u001f${Number(row.binding_version)}\u001f${row.source_ref}\u001f${Number(row.source_version)}\u001f${Number(row.deletion_revision)}\u001f${row.deletion_receipt_digest}`
  }).sort()
  return sha256(canonical.join('\n'))
}

const manifestDigest = (value) => sha256([value.manifest_ref, value.workspace_id, value.project_id, value.role, value.binding_version, value.source_ref, value.source_version, value.deletion_revision, value.manifest_schema_version, value.bridge_schema_version, value.durable_revision, value.tombstone_count, value.tombstone_coverage_digest, value.stored_at].join('\u001f'))

function ownRecord(value, allowed, required = allowed, code = 'input_invalid') {
  if (typeof value !== 'object' || value === null || Array.isArray(value) || isProxy(value)) fail(code)
  let descriptors
  let prototype
  try { descriptors = Object.getOwnPropertyDescriptors(value); prototype = Object.getPrototypeOf(value) } catch { fail(code) }
  if (prototype !== Object.prototype && prototype !== null) fail(code)
  const keys = Reflect.ownKeys(descriptors)
  if (keys.some((key) => typeof key !== 'string' || !allowed.has(key)) || [...required].some((key) => !Object.hasOwn(descriptors, key))) fail(code)
  const output = Object.create(null)
  for (const key of keys) {
    const descriptor = descriptors[key]
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) fail(code)
    Object.defineProperty(output, key, { value: descriptor.value, enumerable: true })
  }
  return output
}

function exactClone(source, output, seen = new Map()) {
  if (source === null || typeof source !== 'object') {
    if (!Object.is(source, output)) fail('materialization_failed')
    return
  }
  if (typeof output !== 'object' || output === null || output === source || isProxy(output)) fail('materialization_failed')
  if (seen.has(source)) {
    if (seen.get(source) !== output) fail('materialization_failed')
    return
  }
  seen.set(source, output)
  const left = Object.getOwnPropertyDescriptors(source)
  const right = Object.getOwnPropertyDescriptors(output)
  const keys = Reflect.ownKeys(left)
  if (keys.length !== Reflect.ownKeys(right).length || keys.some((key) => typeof key !== 'string' || !Object.hasOwn(right, key))) fail('materialization_failed')
  for (const key of keys) {
    if (!Object.hasOwn(left[key], 'value') || !Object.hasOwn(right[key], 'value') || left[key].enumerable !== right[key].enumerable) fail('materialization_failed')
    exactClone(left[key].value, right[key].value, seen)
  }
}

function mapDatabaseError(error) {
  if (error instanceof ObserverBridgePostgresError) throw error
  const message = String(error?.message ?? '')
  if (/unique|duplicate/i.test(message)) fail('conflict')
  if (/row-level security|permission denied/i.test(message)) fail('access_denied')
  if (/serialization|deadlock|cas/i.test(message)) fail('revision_conflict')
  fail('storage_unavailable')
}

export function createObserverBridgePostgresAdapter(options = {}) {
  const config = ownRecord(options, CONFIG_FIELDS, new Set(['with_transaction']), 'configuration_invalid')
  if (typeof config.with_transaction !== 'function' || isProxy(config.with_transaction)) fail('configuration_invalid')
  const clone = config.clone ?? structuredClone
  const newRowId = config.new_row_id ?? createOpaqueLedgerId
  const now = config.now ?? Date.now
  const futureSkewMs = config.future_skew_ms ?? OBSERVER_BRIDGE_POSTGRES_FUTURE_SKEW_MS
  const expectedSchemaVersion = config.expected_schema_version ?? 1
  if (typeof clone !== 'function' || isProxy(clone) || typeof newRowId !== 'function' || isProxy(newRowId) || typeof now !== 'function' || isProxy(now) || !nonNegative(futureSkewMs) || expectedSchemaVersion !== 1) fail('configuration_invalid')
  let busy = false

  const rowIds = (count) => {
    const values = []
    try { for (let index = 0; index < count; index += 1) values.push(newRowId()) } catch { fail('identity_unavailable') }
    if (values.some((value) => typeof value !== 'string' || !UUID.test(value)) || new Set(values).size !== values.length) fail('identity_unavailable')
    return values
  }
  const clock = () => {
    let value
    try { value = now() } catch { fail('clock_unavailable') }
    if (typeof value !== 'number' || !Number.isFinite(value)) fail('clock_unavailable')
    try { new Date(value).toISOString() } catch { fail('clock_unavailable') }
    return value
  }

  const transaction = async (operation) => {
    if (busy) fail('reentrant_operation')
    busy = true
    try {
      let response
      try {
        response = await config.with_transaction(Object.freeze({ effective_role: OBSERVER_BRIDGE_EFFECTIVE_ROLE }), async (client) => {
          const port = ownRecord(client, new Set(['query']), new Set(['query']), 'storage_unavailable')
          if (typeof port.query !== 'function' || isProxy(port.query)) fail('storage_unavailable')
          const outcome = await operation(port)
          let materialized
          try { materialized = clone(outcome) } catch { fail('materialization_failed') }
          exactClone(outcome, materialized)
          return materialized
        })
      } catch (error) { mapDatabaseError(error) }
      return response
    } finally { busy = false }
  }

  const ensureSchema = async (client, workspaceId) => {
    const result = await client.query('select schema_version, durable_revision from outcome_private.bridge_schema_versions where workspace_id = $1 for update', [workspaceId])
    const row = result?.rows?.[0]
    if (!row || Number(row.schema_version) !== expectedSchemaVersion || !nonNegative(Number(row.durable_revision))) fail('schema_mismatch')
    return { schemaVersion: Number(row.schema_version), durableRevision: Number(row.durable_revision) }
  }

  return Object.freeze({
    async activateSource(input) {
      const value = ownRecord(input, ACTIVATE_FIELDS)
      if (!safeId(value.workspace_id) || !safeId(value.project_id) || !ROLES.has(value.role) || !positive(value.binding_version) || !privateRef(value.source_ref) || !positive(value.source_version) || !positive(value.key_version) || !digest(value.challenge_digest) || !positive(value.expected_challenge_revision) || !digest(value.certificate_digest) || typeof value.public_key_spki !== 'string' || !/^[A-Za-z0-9_-]{40,256}$/.test(value.public_key_spki) || !digest(value.public_key_digest) || !iso(value.activated_at)) fail('input_invalid')
      const [auditId] = rowIds(1)
      return transaction(async (client) => {
        await ensureSchema(client, value.workspace_id)
        const challenge = (await client.query('select state,expires_at,revision,workspace_id,project_id,role,binding_version,source_ref,source_version,key_version from outcome_private.bridge_enrollment_challenges where workspace_id=$1 and challenge_digest=$2 for update', [value.workspace_id, value.challenge_digest])).rows?.[0]
        if (!challenge || challenge.state !== 'pending' || Number(challenge.revision) !== value.expected_challenge_revision || Date.parse(challenge.expires_at) <= Date.parse(value.activated_at) || challenge.project_id !== value.project_id || challenge.role !== value.role || Number(challenge.binding_version) !== value.binding_version || challenge.source_ref !== value.source_ref || Number(challenge.source_version) !== value.source_version || Number(challenge.key_version) !== value.key_version) fail('enrollment_invalid')
        const consumed = await client.query("update outcome_private.bridge_enrollment_challenges set state='consumed',consumed_at=$3,revision=revision+1 where workspace_id=$1 and challenge_digest=$2 and state='pending' and revision=$4 returning revision", [value.workspace_id, value.challenge_digest, value.activated_at, value.expected_challenge_revision])
        if (consumed?.rows?.length !== 1) fail('revision_conflict')
        await client.query('insert into outcome_private.bridge_source_scopes(workspace_id,project_id,role,binding_version,source_ref,source_version,created_at) values($1,$2,$3,$4,$5,$6,$7)', [value.workspace_id, value.project_id, value.role, value.binding_version, value.source_ref, value.source_version, value.activated_at])
        await client.query('insert into outcome_private.bridge_sources(workspace_id,project_id,role,binding_version,source_ref,source_version,active_key_version,certificate_digest,state,revision,created_at,updated_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,1,$10,$10)', [value.workspace_id, value.project_id, value.role, value.binding_version, value.source_ref, value.source_version, value.key_version, value.certificate_digest, 'active', value.activated_at])
        await client.query('insert into outcome_private.bridge_source_keys(workspace_id,project_id,role,binding_version,source_ref,source_version,key_version,public_key_spki,public_key_digest,state,created_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)', [value.workspace_id, value.project_id, value.role, value.binding_version, value.source_ref, value.source_version, value.key_version, value.public_key_spki, value.public_key_digest, 'active', value.activated_at])
        await client.query('insert into outcome_private.bridge_audit(audit_id,workspace_id,project_id,role,binding_version,action_code,reason_code,revision,occurred_at) values($1,$2,$3,$4,$5,$6,$7,1,$8)', [auditId, value.workspace_id, value.project_id, value.role, value.binding_version, 'source_activated', 'ok', value.activated_at])
        return { status: 'source_activated', source_version: value.source_version, key_version: value.key_version, source_revision: 1 }
      })
    },

    async rotateSource(input) {
      const value = ownRecord(input, ROTATE_FIELDS)
      if (!safeId(value.workspace_id) || !safeId(value.project_id) || !ROLES.has(value.role) || !positive(value.binding_version) || !privateRef(value.source_ref) || !positive(value.source_version) || !positive(value.expected_source_revision) || !positive(value.expected_key_version) || value.new_key_version !== value.expected_key_version + 1 || typeof value.public_key_spki !== 'string' || !/^[A-Za-z0-9_-]{40,256}$/.test(value.public_key_spki) || !digest(value.public_key_digest) || !iso(value.rotated_at)) fail('input_invalid')
      const [auditId] = rowIds(1)
      return transaction(async (client) => {
        await ensureSchema(client, value.workspace_id)
        const updated = await client.query("update outcome_private.bridge_sources set active_key_version=$7,revision=revision+1,updated_at=$8 where workspace_id=$1 and project_id=$2 and role=$3 and binding_version=$4 and source_ref=$5 and source_version=$6 and state='active' and revision=$9 and active_key_version=$10 returning revision", [value.workspace_id, value.project_id, value.role, value.binding_version, value.source_ref, value.source_version, value.new_key_version, value.rotated_at, value.expected_source_revision, value.expected_key_version])
        if (updated?.rows?.length !== 1) fail('revision_conflict')
        await client.query("update outcome_private.bridge_source_keys set state='replaced' where workspace_id=$1 and project_id=$2 and role=$3 and binding_version=$4 and source_ref=$5 and source_version=$6 and key_version=$7 and state='active'", [value.workspace_id, value.project_id, value.role, value.binding_version, value.source_ref, value.source_version, value.expected_key_version])
        await client.query('insert into outcome_private.bridge_source_keys(workspace_id,project_id,role,binding_version,source_ref,source_version,key_version,public_key_spki,public_key_digest,state,created_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)', [value.workspace_id, value.project_id, value.role, value.binding_version, value.source_ref, value.source_version, value.new_key_version, value.public_key_spki, value.public_key_digest, 'active', value.rotated_at])
        await client.query("update outcome_private.bridge_projections set status_code=null,freshness_class='unknown',observed_time_class='unavailable',updated_at=$5 where workspace_id=$1 and project_id=$2 and role=$3 and binding_version=$4", [value.workspace_id, value.project_id, value.role, value.binding_version, value.rotated_at])
        await client.query('insert into outcome_private.bridge_audit(audit_id,workspace_id,project_id,role,binding_version,action_code,reason_code,revision,occurred_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9)', [auditId, value.workspace_id, value.project_id, value.role, value.binding_version, 'source_rotated', 'ok', Number(updated.rows[0].revision), value.rotated_at])
        return { status: 'source_rotated', source_revision: Number(updated.rows[0].revision), key_version: value.new_key_version }
      })
    },

    async revokeSource(input) {
      const value = ownRecord(input, REVOKE_FIELDS)
      if (!safeId(value.workspace_id) || !safeId(value.project_id) || !ROLES.has(value.role) || !positive(value.binding_version) || !privateRef(value.source_ref) || !positive(value.source_version) || !positive(value.expected_source_revision) || !iso(value.revoked_at)) fail('input_invalid')
      const [auditId] = rowIds(1)
      return transaction(async (client) => {
        await ensureSchema(client, value.workspace_id)
        const updated = await client.query("update outcome_private.bridge_sources set state='revoked',revision=revision+1,updated_at=$7 where workspace_id=$1 and project_id=$2 and role=$3 and binding_version=$4 and source_ref=$5 and source_version=$6 and state='active' and revision=$8 returning revision", [value.workspace_id, value.project_id, value.role, value.binding_version, value.source_ref, value.source_version, value.revoked_at, value.expected_source_revision])
        if (updated?.rows?.length !== 1) fail('revision_conflict')
        await client.query("update outcome_private.bridge_source_keys set state='revoked',revoked_at=$7 where workspace_id=$1 and project_id=$2 and role=$3 and binding_version=$4 and source_ref=$5 and source_version=$6 and state='active'", [value.workspace_id, value.project_id, value.role, value.binding_version, value.source_ref, value.source_version, value.revoked_at])
        await client.query("update outcome_private.bridge_projections set status_code=null,freshness_class='offline',observed_time_class='expired',updated_at=$5 where workspace_id=$1 and project_id=$2 and role=$3 and binding_version=$4", [value.workspace_id, value.project_id, value.role, value.binding_version, value.revoked_at])
        await client.query('insert into outcome_private.bridge_audit(audit_id,workspace_id,project_id,role,binding_version,action_code,reason_code,revision,occurred_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9)', [auditId, value.workspace_id, value.project_id, value.role, value.binding_version, 'source_revoked', 'revoked', Number(updated.rows[0].revision), value.revoked_at])
        return { status: 'source_revoked', source_revision: Number(updated.rows[0].revision) }
      })
    },

    async appendEvent(input) {
      const value = ownRecord(input, EVENT_FIELDS)
      if (!safeId(value.workspace_id) || !safeId(value.project_id) || !ROLES.has(value.role) || !positive(value.binding_version) || !privateRef(value.source_ref) || !positive(value.source_version) || !positive(value.key_version) || !digest(value.request_digest) || !digest(value.nonce_digest) || !digest(value.event_digest) || !positive(value.sequence) || !STATUS_CODES.has(value.status_code) || !iso(value.observed_at) || !iso(value.expires_at) || Date.parse(value.expires_at) <= Date.parse(value.observed_at) || !nonNegative(value.expected_ledger_revision)) fail('input_invalid')
      if (Date.parse(value.observed_at) - clock() > futureSkewMs) fail('future_observation')
      const [eventId, auditId] = rowIds(2)
      return transaction(async (client) => {
        const schema = await ensureSchema(client, value.workspace_id)
        if (schema.durableRevision !== value.expected_ledger_revision) fail('revision_conflict')
        const source = (await client.query('select state, active_key_version from outcome_private.bridge_sources where workspace_id=$1 and project_id=$2 and role=$3 and binding_version=$4 and source_ref=$5 and source_version=$6 for update', [value.workspace_id, value.project_id, value.role, value.binding_version, value.source_ref, value.source_version])).rows?.[0]
        if (!source || source.state !== 'active' || Number(source.active_key_version) !== value.key_version) fail('access_denied')
        const prior = (await client.query('select event_digest, outcome_code from outcome_private.bridge_request_replay where workspace_id=$1 and request_digest=$2', [value.workspace_id, value.request_digest])).rows?.[0]
        if (prior) {
          if (prior.event_digest !== value.event_digest) fail('conflict')
          return { status: 'duplicate', ledger_revision: value.expected_ledger_revision }
        }
        const last = (await client.query('select sequence from outcome_private.bridge_events where workspace_id=$1 and project_id=$2 and role=$3 and binding_version=$4 and source_ref=$5 and source_version=$6 order by sequence desc limit 1', [value.workspace_id, value.project_id, value.role, value.binding_version, value.source_ref, value.source_version])).rows?.[0]
        if (value.sequence !== Number(last?.sequence ?? 0) + 1) fail('sequence_conflict')
        const next = value.expected_ledger_revision + 1
        const createdAt = value.observed_at
        await client.query('insert into outcome_private.bridge_request_replay(workspace_id,project_id,role,binding_version,source_ref,source_version,key_version,request_digest,nonce_digest,event_digest,outcome_code,expires_at,created_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)', [value.workspace_id, value.project_id, value.role, value.binding_version, value.source_ref, value.source_version, value.key_version, value.request_digest, value.nonce_digest, value.event_digest, 'accepted', value.expires_at, createdAt])
        await client.query('insert into outcome_private.bridge_events(event_id,workspace_id,project_id,role,binding_version,source_ref,source_version,key_version,sequence,ledger_revision,status_code,observed_at,expires_at,event_digest,signature_class,created_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)', [eventId, value.workspace_id, value.project_id, value.role, value.binding_version, value.source_ref, value.source_version, value.key_version, value.sequence, next, value.status_code, value.observed_at, value.expires_at, value.event_digest, 'ed25519_verified', createdAt])
        const projection = await client.query('insert into outcome_private.bridge_projections(workspace_id,project_id,role,binding_version,source_ref,source_version,status_code,freshness_class,observed_time_class,ledger_revision,accepted_count,conflict_count,durable_revision,cache_revision,updated_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,1,0,$10,$10,$11) on conflict(workspace_id,project_id,role,binding_version) do update set source_ref=excluded.source_ref,source_version=excluded.source_version,status_code=excluded.status_code,freshness_class=excluded.freshness_class,observed_time_class=excluded.observed_time_class,ledger_revision=excluded.ledger_revision,accepted_count=outcome_private.bridge_projections.accepted_count+1,durable_revision=excluded.durable_revision,cache_revision=excluded.cache_revision,updated_at=excluded.updated_at where outcome_private.bridge_projections.ledger_revision=$12 returning ledger_revision,accepted_count', [value.workspace_id, value.project_id, value.role, value.binding_version, value.source_ref, value.source_version, value.status_code, 'fresh', 'current', next, createdAt, value.expected_ledger_revision])
        if (projection?.rows?.length !== 1) fail('revision_conflict')
        const durable = await client.query('update outcome_private.bridge_schema_versions set durable_revision=$2,updated_at=$3 where workspace_id=$1 and durable_revision=$4 returning durable_revision', [value.workspace_id, next, createdAt, value.expected_ledger_revision])
        if (durable?.rows?.length !== 1) fail('revision_conflict')
        await client.query('insert into outcome_private.bridge_audit(audit_id,workspace_id,project_id,role,binding_version,action_code,reason_code,revision,occurred_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9)', [auditId, value.workspace_id, value.project_id, value.role, value.binding_version, 'event_accepted', 'ok', next, createdAt])
        return { status: 'accepted', ledger_revision: next, accepted_count: Number(projection.rows[0].accepted_count) }
      })
    },

    async tombstone(input) {
      const value = ownRecord(input, TOMBSTONE_FIELDS)
      if (!safeId(value.workspace_id) || !safeId(value.project_id) || !ROLES.has(value.role) || !positive(value.binding_version) || !privateRef(value.source_ref) || !positive(value.source_version) || !positive(value.deletion_revision) || !digest(value.deletion_receipt_digest) || !iso(value.purge_before) || !iso(value.tombstoned_at) || Date.parse(value.tombstoned_at) < Date.parse(value.purge_before) || !nonNegative(value.expected_durable_revision)) fail('input_invalid')
      const [auditId] = rowIds(1)
      return transaction(async (client) => {
        const schema = await ensureSchema(client, value.workspace_id)
        if (schema.durableRevision !== value.expected_durable_revision || value.deletion_revision !== schema.durableRevision + 1) fail('revision_conflict')
        const scope = [value.workspace_id, value.project_id, value.role, value.binding_version, value.source_ref, value.source_version]
        const target = (await client.query("select state from outcome_private.bridge_sources where workspace_id=$1 and project_id=$2 and role=$3 and binding_version=$4 and source_ref=$5 and source_version=$6 and state<>'deleted' for update", scope)).rows?.[0]
        if (!target) fail('access_denied')
        await client.query('insert into outcome_private.bridge_tombstones(workspace_id,project_id,role,binding_version,source_ref,source_version,deletion_revision,deletion_receipt_digest,purge_before,tombstoned_at,restore_redelete_required) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true)', [...scope, value.deletion_revision, value.deletion_receipt_digest, value.purge_before, value.tombstoned_at])
        for (const table of ['bridge_request_replay', 'bridge_events', 'bridge_source_keys', 'bridge_enrollment_challenges', 'bridge_projections']) {
          await client.query(`delete from outcome_private.${table} where workspace_id=$1 and project_id=$2 and role=$3 and binding_version=$4 and source_ref=$5 and source_version=$6`, scope)
        }
        const purged = await client.query('delete from outcome_private.bridge_sources where workspace_id=$1 and project_id=$2 and role=$3 and binding_version=$4 and source_ref=$5 and source_version=$6 returning source_ref', scope)
        if (purged?.rows?.length !== 1) fail('access_denied')
        const durable = await client.query('update outcome_private.bridge_schema_versions set durable_revision=$2,updated_at=$3 where workspace_id=$1 and durable_revision=$4 returning durable_revision', [value.workspace_id, value.deletion_revision, value.tombstoned_at, value.expected_durable_revision])
        if (durable?.rows?.length !== 1) fail('revision_conflict')
        await client.query('insert into outcome_private.bridge_audit(audit_id,workspace_id,project_id,role,binding_version,source_ref,source_version,action_code,reason_code,revision,occurred_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)', [auditId, ...scope, 'tombstone_written', 'retention', value.deletion_revision, value.tombstoned_at])
        return { status: 'tombstoned', durable_revision: value.deletion_revision }
      })
    },

    async storeManifest(input) {
      const value = ownRecord(input, MANIFEST_FIELDS)
      if (!UUID.test(value.manifest_ref) || !safeId(value.workspace_id) || !safeId(value.project_id) || !ROLES.has(value.role) || !positive(value.binding_version) || !privateRef(value.source_ref) || !positive(value.source_version) || !positive(value.deletion_revision) || value.manifest_schema_version !== 1 || value.bridge_schema_version !== expectedSchemaVersion || !nonNegative(value.durable_revision) || value.tombstone_count !== 1 || !digest(value.tombstone_coverage_digest) || !iso(value.stored_at)) fail('input_invalid')
      const computedManifestDigest = manifestDigest(value)
      return transaction(async (client) => {
        const schema = await ensureSchema(client, value.workspace_id)
        if (schema.durableRevision !== value.durable_revision) fail('revision_conflict')
        const scope = [value.workspace_id, value.project_id, value.role, value.binding_version, value.source_ref, value.source_version, value.deletion_revision]
        const tombstones = (await client.query('select workspace_id,project_id,role,binding_version,source_ref,source_version,deletion_revision,deletion_receipt_digest from outcome_private.bridge_tombstones where workspace_id=$1 and project_id=$2 and role=$3 and binding_version=$4 and source_ref=$5 and source_version=$6 and deletion_revision=$7', scope)).rows ?? []
        if (tombstones.length !== value.tombstone_count || computeTombstoneCoverageDigest(tombstones) !== value.tombstone_coverage_digest) fail('manifest_invalid')
        await client.query('insert into outcome_private.bridge_backup_manifests(manifest_ref,workspace_id,project_id,role,binding_version,source_ref,source_version,deletion_revision,manifest_schema_version,bridge_schema_version,durable_revision,tombstone_count,tombstone_coverage_digest,manifest_digest,stored_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)', [value.manifest_ref, ...scope, value.manifest_schema_version, value.bridge_schema_version, value.durable_revision, value.tombstone_count, value.tombstone_coverage_digest, computedManifestDigest, value.stored_at])
        return { status: 'manifest_stored', schema_version: value.bridge_schema_version, durable_revision: value.durable_revision, tombstone_count: value.tombstone_count, manifest_digest: computedManifestDigest }
      })
    },

    async verifyRestore(input) {
      const value = ownRecord(input, RESTORE_FIELDS)
      if (!UUID.test(value.restore_receipt_ref) || !UUID.test(value.manifest_ref) || !digest(value.manifest_digest) || !safeId(value.workspace_id) || !safeId(value.project_id) || !ROLES.has(value.role) || !positive(value.binding_version) || !privateRef(value.source_ref) || !positive(value.source_version) || !positive(value.deletion_revision) || value.expected_schema_version !== expectedSchemaVersion || !nonNegative(value.expected_durable_revision) || !iso(value.restored_at)) fail('input_invalid')
      const [auditId] = rowIds(1)
      return transaction(async (client) => {
        const schema = await ensureSchema(client, value.workspace_id)
        if (schema.durableRevision !== value.expected_durable_revision) fail('restore_denied')
        const scope = [value.workspace_id, value.project_id, value.role, value.binding_version, value.source_ref, value.source_version, value.deletion_revision]
        const manifest = (await client.query('select manifest_ref,workspace_id,project_id,role,binding_version,source_ref,source_version,deletion_revision,manifest_schema_version,bridge_schema_version,durable_revision,tombstone_count,tombstone_coverage_digest,manifest_digest,stored_at from outcome_private.bridge_backup_manifests where manifest_ref=$1 and workspace_id=$2 and project_id=$3 and role=$4 and binding_version=$5 and source_ref=$6 and source_version=$7 and deletion_revision=$8', [value.manifest_ref, ...scope])).rows?.[0]
        if (!manifest || Number(manifest.manifest_schema_version) !== 1 || Number(manifest.bridge_schema_version) !== schema.schemaVersion || Number(manifest.durable_revision) !== schema.durableRevision || manifest.manifest_digest !== value.manifest_digest) fail('restore_denied')
        const tombstones = (await client.query('select workspace_id,project_id,role,binding_version,source_ref,source_version,deletion_revision,deletion_receipt_digest from outcome_private.bridge_tombstones where workspace_id=$1 and project_id=$2 and role=$3 and binding_version=$4 and source_ref=$5 and source_version=$6 and deletion_revision=$7', scope)).rows ?? []
        const coverageDigest = computeTombstoneCoverageDigest(tombstones)
        if (tombstones.length !== Number(manifest.tombstone_count) || coverageDigest !== manifest.tombstone_coverage_digest) fail('restore_denied')
        for (const tombstone of tombstones) {
          const params = [tombstone.workspace_id, tombstone.project_id, tombstone.role, Number(tombstone.binding_version), tombstone.source_ref, Number(tombstone.source_version)]
          for (const table of ['bridge_request_replay', 'bridge_events', 'bridge_source_keys', 'bridge_enrollment_challenges', 'bridge_projections']) await client.query(`delete from outcome_private.${table} where workspace_id=$1 and project_id=$2 and role=$3 and binding_version=$4 and source_ref=$5 and source_version=$6`, params)
          await client.query('delete from outcome_private.bridge_sources where workspace_id=$1 and project_id=$2 and role=$3 and binding_version=$4 and source_ref=$5 and source_version=$6', params)
        }
        await client.query('insert into outcome_private.bridge_restore_receipts(restore_receipt_ref,manifest_ref,workspace_id,project_id,role,binding_version,source_ref,source_version,deletion_revision,bridge_schema_version,durable_revision,tombstone_count,tombstone_coverage_digest,manifest_digest,restored_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)', [value.restore_receipt_ref, value.manifest_ref, ...scope, schema.schemaVersion, schema.durableRevision, tombstones.length, coverageDigest, value.manifest_digest, value.restored_at])
        await client.query('insert into outcome_private.bridge_audit(audit_id,workspace_id,project_id,role,binding_version,source_ref,source_version,action_code,reason_code,revision,occurred_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)', [auditId, value.workspace_id, value.project_id, value.role, value.binding_version, value.source_ref, value.source_version, 'restore_verified', 'ok', schema.durableRevision, value.restored_at])
        return { status: 'restore_verified', durable_revision: schema.durableRevision, schema_version: schema.schemaVersion, tombstone_count: tombstones.length, raw_resurrection_count: 0 }
      })
    },
  })
}

const V2_REPOSITORY_METHODS = Object.freeze(['createEnrollment', 'completeEnrollment', 'ingest', 'read', 'revokeSource', 'registerViewer', 'revokeViewer', 'cleanupExpiredChallenges', 'readiness'])

export function createObserverBridgeDurableV2Repository({ with_transaction: withTransaction, new_row_id: newRowId = createOpaqueLedgerId } = {}) {
  if (typeof withTransaction !== 'function' || isProxy(withTransaction) || typeof newRowId !== 'function' || isProxy(newRowId)) fail('configuration_invalid')
  let busy = false
  const transact = async (operation) => {
    if (busy) fail('reentrant_operation')
    busy = true
    try {
      return await withTransaction(Object.freeze({ effective_role: OBSERVER_BRIDGE_EFFECTIVE_ROLE }), async (candidate) => {
        const client = ownRecord(candidate, new Set(['query']), new Set(['query']), 'storage_unavailable')
        if (typeof client.query !== 'function' || isProxy(client.query)) fail('storage_unavailable')
        return operation(client)
      })
    } catch (error) { mapDatabaseError(error) } finally { busy = false }
  }
  const schema = async (client, workspaceId, lock = true) => {
    const row = (await client.query(`select schema_version,durable_revision from outcome_private.bridge_schema_versions where workspace_id=$1${lock ? ' for update' : ''}`, [workspaceId])).rows?.[0]
    if (!row || Number(row.schema_version) !== 2 || !nonNegative(Number(row.durable_revision))) fail('schema_mismatch')
    return Number(row.durable_revision)
  }
  const advance = async (client, workspaceId, current, at) => {
    const row = (await client.query('update outcome_private.bridge_schema_versions set durable_revision=$2,updated_at=$3 where workspace_id=$1 and durable_revision=$4 returning durable_revision', [workspaceId, current + 1, at, current])).rows?.[0]
    if (!row) fail('revision_conflict')
    return Number(row.durable_revision)
  }
  const cleanup = async (client, workspaceId, before, limit = 100) => {
    const result = await client.query(`with expired as (
      select challenge_digest from outcome_private.bridge_enrollment_challenges
      where workspace_id=$1 and expires_at <= $2 and challenge_ref is not null
      order by expires_at,challenge_digest limit $3 for update skip locked
    ) update outcome_private.bridge_enrollment_challenges challenge
      set challenge_ref=null,challenge_nonce=null,state=case when state='pending' then 'expired' else state end,revision=revision+1
      from expired where challenge.challenge_digest=expired.challenge_digest returning challenge.challenge_digest`, [workspaceId, before, limit])
    return result.rows?.length ?? 0
  }
  const audit = (client, value, action, reason, revision, at) => client.query('insert into outcome_private.bridge_audit(audit_id,workspace_id,project_id,role,binding_version,source_ref,source_version,action_code,reason_code,revision,occurred_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)', [newRowId(), value.workspace_id, value.project_id, value.role, value.binding_version, value.source_ref ?? null, value.source_version ?? null, action, reason, revision, at])

  const repository = {
    async createEnrollment(value) {
      return transact(async (client) => {
        const current = await schema(client, value.workspace_id)
        await cleanup(client, value.workspace_id, value.issued_at)
        const prior = (await client.query('select project_id,role,binding_version,source_ref,source_version,key_version,enrollment_mode,challenge_ref,challenge_nonce,expires_at,idempotency_digest from outcome_private.bridge_enrollment_challenges where workspace_id=$1 and idempotency_digest=$2 for update', [value.workspace_id, value.idempotency_digest])).rows?.[0]
        if (prior) {
          if (prior.project_id !== value.project_id || prior.role !== value.role || Number(prior.binding_version) !== value.binding_version || prior.source_ref !== value.source_ref || prior.enrollment_mode !== value.mode) fail('idempotency_conflict')
          if (!prior.challenge_ref || Date.parse(prior.expires_at) <= Date.parse(value.issued_at)) fail('enrollment_conflict')
          return { status: 'challenge_created', challenge_ref: prior.challenge_ref, challenge_nonce: prior.challenge_nonce, expires_at: new Date(prior.expires_at).toISOString(), source_version: Number(prior.source_version), key_version: Number(prior.key_version), ledger_revision: current }
        }
        const active = (await client.query("select source_version,active_key_version from outcome_private.bridge_sources where workspace_id=$1 and project_id=$2 and role=$3 and binding_version=$4 and source_ref=$5 and state='active' for update", [value.workspace_id, value.project_id, value.role, value.binding_version, value.source_ref])).rows?.[0]
        if (value.mode === 'rotate' && !active) fail('access_denied')
        if (value.mode === 'enroll' && active) fail('enrollment_conflict')
        const sourceVersion = value.mode === 'rotate' ? Number(active.source_version) : 1
        const keyVersion = value.mode === 'rotate' ? Number(active.active_key_version) + 1 : 1
        await client.query("insert into outcome_private.bridge_enrollment_challenges(workspace_id,project_id,role,binding_version,source_ref,source_version,key_version,challenge_digest,idempotency_digest,state,issued_at,expires_at,revision,challenge_ref,challenge_nonce,enrollment_mode) values($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending',$10,$11,1,$12,$13,$14)", [value.workspace_id, value.project_id, value.role, value.binding_version, value.source_ref, sourceVersion, keyVersion, value.challenge_digest, value.idempotency_digest, value.issued_at, value.expires_at, value.challenge_ref, value.challenge_nonce, value.mode])
        const next = await advance(client, value.workspace_id, current, value.issued_at)
        await audit(client, { ...value, source_ref: null, source_version: null }, 'challenge_created', 'ok', next, value.issued_at)
        return { status: 'challenge_created', challenge_ref: value.challenge_ref, challenge_nonce: value.challenge_nonce, expires_at: value.expires_at, source_version: sourceVersion, key_version: keyVersion, ledger_revision: next }
      })
    },
    async completeEnrollment(value) {
      return transact(async (client) => {
        const challenge = (await client.query('select * from outcome_private.bridge_enrollment_challenges where challenge_digest=$1 for update', [value.challenge_digest])).rows?.[0]
        if (!challenge) fail('enrollment_invalid')
        const current = await schema(client, challenge.workspace_id)
        await cleanup(client, challenge.workspace_id, value.completed_at)
        let publicKey
        let publicKeyDigest
        let proof
        try {
          const keyBytes = Buffer.from(value.public_key_spki, 'base64url')
          proof = Buffer.from(value.proof_signature, 'base64url')
          publicKey = createPublicKey({ key: keyBytes, format: 'der', type: 'spki' })
          if (publicKey.asymmetricKeyType !== 'ed25519' || keyBytes.toString('base64url') !== value.public_key_spki || proof.length !== 64 || proof.toString('base64url') !== value.proof_signature) fail('enrollment_invalid')
          publicKeyDigest = sha256(keyBytes)
        } catch (error) { if (error instanceof ObserverBridgePostgresError) throw error; fail('enrollment_invalid') }
        const requestDigest = sha256(Buffer.from(`OUTCOME_OBSERVER_BRIDGE_COMPLETION_V1\0${value.challenge_digest}\0${publicKeyDigest}\0${value.proof_signature}`))
        if (challenge.state === 'consumed') {
          if (challenge.completion_request_digest !== requestDigest || !challenge.completion_certificate_ciphertext) fail('enrollment_conflict')
          try {
            const aad = Buffer.from(`OUTCOME_OBSERVER_BRIDGE_COMPLETION_AAD_V1\0${challenge.workspace_id}\0${challenge.project_id}\0${challenge.role}\0${challenge.binding_version}\0${challenge.source_ref}\0${challenge.challenge_digest}\0${requestDigest}`)
            const decipher = createDecipheriv('aes-256-gcm', value.recovery_key, Buffer.from(challenge.completion_certificate_nonce))
            decipher.setAAD(aad); decipher.setAuthTag(Buffer.from(challenge.completion_certificate_tag))
            const certificateRef = Buffer.concat([decipher.update(Buffer.from(challenge.completion_certificate_ciphertext)), decipher.final()]).toString('utf8')
            if (!privateRef(certificateRef)) fail('storage_unavailable')
            return { status: 'source_active', recovered: true, certificate_ref: certificateRef, role: challenge.role, binding_version: Number(challenge.binding_version), source_version: Number(challenge.completion_source_version), key_version: Number(challenge.completion_key_version), ledger_revision: Number(challenge.completion_ledger_revision) }
          } catch (error) { if (error instanceof ObserverBridgePostgresError) throw error; fail('storage_unavailable') }
        }
        if (challenge.state !== 'pending' || Date.parse(challenge.expires_at) <= Date.parse(value.completed_at) || !challenge.challenge_ref || !challenge.challenge_nonce) fail('enrollment_invalid')
        if (challenge.challenge_ref !== value.challenge_ref) fail('enrollment_invalid')
        const enrollmentBytes = canonicalEnrollmentBytes({ workspace_id: challenge.workspace_id, project_id: challenge.project_id, role: challenge.role, binding_version: Number(challenge.binding_version), source_ref: challenge.source_ref, source_version: Number(challenge.source_version), key_version: Number(challenge.key_version), mode: challenge.enrollment_mode, challenge_ref: challenge.challenge_ref, challenge_nonce: challenge.challenge_nonce, public_key_spki: value.public_key_spki })
        if (!verifySignature(null, enrollmentBytes, publicKey, proof)) fail('enrollment_invalid')
        const sourceVersion = Number(challenge.source_version); const keyVersion = Number(challenge.key_version)
        const certificateRef = `certificate_${randomBytes(18).toString('base64url')}`
        const certificateDigest = sha256(certificateRef)
        const certificateNonce = randomBytes(12)
        const aad = Buffer.from(`OUTCOME_OBSERVER_BRIDGE_COMPLETION_AAD_V1\0${challenge.workspace_id}\0${challenge.project_id}\0${challenge.role}\0${challenge.binding_version}\0${challenge.source_ref}\0${challenge.challenge_digest}\0${requestDigest}`)
        const cipher = createCipheriv('aes-256-gcm', value.recovery_key, certificateNonce)
        cipher.setAAD(aad)
        const certificateCiphertext = Buffer.concat([cipher.update(certificateRef, 'utf8'), cipher.final()])
        const certificateTag = cipher.getAuthTag()
        if (challenge.enrollment_mode === 'rotate') {
          const source = (await client.query("select active_key_version,revision from outcome_private.bridge_sources where workspace_id=$1 and project_id=$2 and role=$3 and binding_version=$4 and source_ref=$5 and source_version=$6 and state='active' for update", [challenge.workspace_id, challenge.project_id, challenge.role, challenge.binding_version, challenge.source_ref, sourceVersion])).rows?.[0]
          if (!source || Number(source.active_key_version) + 1 !== keyVersion) fail('revision_conflict')
          await client.query("update outcome_private.bridge_source_keys set state='replaced' where workspace_id=$1 and project_id=$2 and role=$3 and binding_version=$4 and source_ref=$5 and source_version=$6 and state='active'", [challenge.workspace_id, challenge.project_id, challenge.role, challenge.binding_version, challenge.source_ref, sourceVersion])
          await client.query('update outcome_private.bridge_enrollment_challenges set completion_certificate_ciphertext=null,completion_certificate_nonce=null,completion_certificate_tag=null,completion_request_digest=null,completion_recovery_key_version=null,completion_source_version=null,completion_key_version=null,completion_ledger_revision=null where workspace_id=$1 and project_id=$2 and role=$3 and binding_version=$4 and source_ref=$5 and source_version=$6 and state=\'consumed\'', [challenge.workspace_id, challenge.project_id, challenge.role, challenge.binding_version, challenge.source_ref, sourceVersion])
          await client.query("update outcome_private.bridge_sources set active_key_version=$7,certificate_digest=$8,revision=revision+1,updated_at=$9 where workspace_id=$1 and project_id=$2 and role=$3 and binding_version=$4 and source_ref=$5 and source_version=$6 and state='active'", [challenge.workspace_id, challenge.project_id, challenge.role, challenge.binding_version, challenge.source_ref, sourceVersion, keyVersion, certificateDigest, value.completed_at])
        } else {
          await client.query('insert into outcome_private.bridge_source_scopes(workspace_id,project_id,role,binding_version,source_ref,source_version,created_at) values($1,$2,$3,$4,$5,$6,$7)', [challenge.workspace_id, challenge.project_id, challenge.role, challenge.binding_version, challenge.source_ref, sourceVersion, value.completed_at])
          await client.query("insert into outcome_private.bridge_sources(workspace_id,project_id,role,binding_version,source_ref,source_version,active_key_version,certificate_digest,state,revision,created_at,updated_at) values($1,$2,$3,$4,$5,$6,$7,$8,'active',1,$9,$9)", [challenge.workspace_id, challenge.project_id, challenge.role, challenge.binding_version, challenge.source_ref, sourceVersion, keyVersion, certificateDigest, value.completed_at])
        }
        await client.query("insert into outcome_private.bridge_source_keys(workspace_id,project_id,role,binding_version,source_ref,source_version,key_version,public_key_spki,public_key_digest,state,created_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,'active',$10)", [challenge.workspace_id, challenge.project_id, challenge.role, challenge.binding_version, challenge.source_ref, sourceVersion, keyVersion, value.public_key_spki, publicKeyDigest, value.completed_at])
        const next = await advance(client, challenge.workspace_id, current, value.completed_at)
        await client.query("update outcome_private.bridge_enrollment_challenges set state='consumed',consumed_at=$3,revision=revision+1,completion_request_digest=$4,completion_certificate_ciphertext=$5,completion_certificate_nonce=$6,completion_certificate_tag=$7,completion_recovery_key_version=1,completion_source_version=$8,completion_key_version=$9,completion_ledger_revision=$10 where workspace_id=$1 and challenge_digest=$2 and state='pending'", [challenge.workspace_id, value.challenge_digest, value.completed_at, requestDigest, certificateCiphertext, certificateNonce, certificateTag, sourceVersion, keyVersion, next])
        await client.query("insert into outcome_private.bridge_projections(workspace_id,project_id,role,binding_version,source_ref,source_version,status_code,freshness_class,observed_time_class,ledger_revision,accepted_count,conflict_count,durable_revision,cache_revision,updated_at) values($1,$2,$3,$4,$5,$6,null,'unknown','unavailable',0,0,0,$7,$7,$8) on conflict(workspace_id,project_id,role,binding_version) do update set source_ref=excluded.source_ref,source_version=excluded.source_version,status_code=null,freshness_class='unknown',observed_time_class='unavailable',durable_revision=$7,cache_revision=$7,updated_at=$8", [challenge.workspace_id, challenge.project_id, challenge.role, challenge.binding_version, challenge.source_ref, sourceVersion, next, value.completed_at])
        await audit(client, { ...challenge, source_version: sourceVersion }, challenge.enrollment_mode === 'rotate' ? 'source_rotated' : 'source_activated', 'ok', next, value.completed_at)
        return { status: 'source_active', recovered: false, certificate_ref: certificateRef, role: challenge.role, binding_version: Number(challenge.binding_version), source_version: sourceVersion, key_version: keyVersion, ledger_revision: next }
      })
    },
    async ingest(value) {
      return transact(async (client) => {
        const current = await schema(client, value.workspace_id)
        const source = (await client.query("select * from outcome_private.bridge_sources where workspace_id=$1 and certificate_digest=$2 and state='active' for update", [value.workspace_id, value.certificate_digest])).rows?.[0]
        if (!source) fail('access_denied')
        const keyRow = (await client.query("select public_key_spki from outcome_private.bridge_source_keys where workspace_id=$1 and project_id=$2 and role=$3 and binding_version=$4 and source_ref=$5 and source_version=$6 and key_version=$7 and state='active'", [source.workspace_id, source.project_id, source.role, source.binding_version, source.source_ref, source.source_version, source.active_key_version])).rows?.[0]
        if (!keyRow) fail('access_denied')
        let publicKey; let signature
        try { publicKey = createPublicKey({ key: Buffer.from(keyRow.public_key_spki, 'base64url'), format: 'der', type: 'spki' }); signature = Buffer.from(value.request_signature, 'base64url') } catch { fail('signature_invalid') }
        const requestBytes = canonicalHostedRequestBytes({ certificate_ref: value.certificate_ref, request_id: value.request_id, nonce: value.nonce, event: value.event })
        if (signature.length !== 64 || !verifySignature(null, requestBytes, publicKey, signature)) fail('signature_invalid')
        const requestDigest = sha256(Buffer.concat([requestBytes, Buffer.from(value.request_signature)]))
        const nonceDigest = sha256(value.nonce)
        const eventDigest = sha256(Buffer.from(JSON.stringify(value.event)))
        const prior = (await client.query('select event_digest,response_ledger_revision from outcome_private.bridge_request_replay where workspace_id=$1 and request_digest=$2', [value.workspace_id, requestDigest])).rows?.[0]
        if (prior) {
          if (prior.event_digest !== eventDigest) fail('request_conflict')
          return { status: 'duplicate', ledger_revision: Number(prior.response_ledger_revision), sequence: value.event.sequence }
        }
        const rate = (await client.query('select window_started_at,request_count,revision from outcome_private.bridge_rate_windows where workspace_id=$1 and certificate_digest=$2 for update', [value.workspace_id, value.certificate_digest])).rows?.[0]
        let requestCount = 1; let rateRevision = 1
        if (rate && Date.parse(value.received_at) - Date.parse(rate.window_started_at) < 60_000) {
          if (Number(rate.request_count) >= 60) fail('rate_limited')
          requestCount = Number(rate.request_count) + 1; rateRevision = Number(rate.revision) + 1
        }
        const last = (await client.query('select sequence from outcome_private.bridge_events where workspace_id=$1 and project_id=$2 and role=$3 and binding_version=$4 and source_ref=$5 and source_version=$6 order by sequence desc limit 1', [source.workspace_id, source.project_id, source.role, source.binding_version, source.source_ref, source.source_version])).rows?.[0]
        if (value.event.sequence !== Number(last?.sequence ?? 0) + 1) fail('sequence_conflict')
        const next = current + 1
        await client.query('insert into outcome_private.bridge_request_replay(workspace_id,project_id,role,binding_version,source_ref,source_version,key_version,request_digest,nonce_digest,event_digest,outcome_code,expires_at,created_at,response_ledger_revision) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,\'accepted\',$11,$12,$13)', [source.workspace_id, source.project_id, source.role, source.binding_version, source.source_ref, source.source_version, source.active_key_version, requestDigest, nonceDigest, eventDigest, value.event.expires_at, value.received_at, next])
        await client.query('insert into outcome_private.bridge_events(event_id,workspace_id,project_id,role,binding_version,source_ref,source_version,key_version,sequence,ledger_revision,status_code,observed_at,expires_at,event_digest,signature_class,created_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,\'ed25519_verified\',$15)', [newRowId(), source.workspace_id, source.project_id, source.role, source.binding_version, source.source_ref, source.source_version, source.active_key_version, value.event.sequence, next, value.event.status_code, value.event.observed_at, value.event.expires_at, eventDigest, value.received_at])
        await client.query('insert into outcome_private.bridge_rate_windows(workspace_id,certificate_digest,window_started_at,request_count,revision) values($1,$2,$3,$4,$5) on conflict(workspace_id,certificate_digest) do update set window_started_at=excluded.window_started_at,request_count=excluded.request_count,revision=excluded.revision', [value.workspace_id, value.certificate_digest, rate && Date.parse(value.received_at) - Date.parse(rate.window_started_at) < 60_000 ? rate.window_started_at : value.received_at, requestCount, rateRevision])
        await client.query("update outcome_private.bridge_projections set status_code=$5,freshness_class='fresh',observed_time_class='current',ledger_revision=$6,accepted_count=accepted_count+1,durable_revision=$6,cache_revision=$6,updated_at=$7 where workspace_id=$1 and project_id=$2 and role=$3 and binding_version=$4", [source.workspace_id, source.project_id, source.role, source.binding_version, value.event.status_code, next, value.received_at])
        await advance(client, value.workspace_id, current, value.received_at)
        await audit(client, source, 'event_accepted', 'ok', next, value.received_at)
        return { status: 'accepted', ledger_revision: next, sequence: value.event.sequence }
      })
    },
    async read(value) {
      return transact(async (client) => {
        await schema(client, value.workspace_id, false)
        const viewer = (await client.query("select revision from outcome_private.bridge_viewer_registrations where workspace_id=$1 and project_id=$2 and account_ref=$3 and viewer_ref=$4 and viewer_class=$5 and state='active'", [value.workspace_id, value.project_id, value.account_ref, value.viewer_ref, value.viewer_class])).rows?.[0]
        if (!viewer) fail('access_denied')
        const projection = (await client.query('select status_code,freshness_class,observed_time_class,ledger_revision,accepted_count,conflict_count,updated_at from outcome_private.bridge_projections where workspace_id=$1 and project_id=$2', [value.workspace_id, value.project_id])).rows?.[0]
        return { status: 'projection_read', viewer_revision: Number(viewer.revision), projection: projection ? { ...projection, ledger_revision: Number(projection.ledger_revision), accepted_count: Number(projection.accepted_count), conflict_count: Number(projection.conflict_count), updated_at: new Date(projection.updated_at).toISOString() } : null }
      })
    },
    async revokeSource(value) {
      return transact(async (client) => {
        const current = await schema(client, value.workspace_id)
        const source = (await client.query("update outcome_private.bridge_sources set state='revoked',revision=revision+1,updated_at=$3 where workspace_id=$1 and certificate_digest=$2 and state='active' and revision=$4 returning *", [value.workspace_id, value.certificate_digest, value.revoked_at, value.expected_revision])).rows?.[0]
        if (!source) fail('revision_conflict')
        await client.query("update outcome_private.bridge_source_keys set state='revoked',revoked_at=$7 where workspace_id=$1 and project_id=$2 and role=$3 and binding_version=$4 and source_ref=$5 and source_version=$6 and state='active'", [source.workspace_id, source.project_id, source.role, source.binding_version, source.source_ref, source.source_version, value.revoked_at])
        await client.query('delete from outcome_private.bridge_rate_windows where workspace_id=$1 and certificate_digest=$2', [value.workspace_id, value.certificate_digest])
        await client.query('update outcome_private.bridge_enrollment_challenges set completion_certificate_ciphertext=null,completion_certificate_nonce=null,completion_certificate_tag=null,completion_request_digest=null,completion_recovery_key_version=null,completion_source_version=null,completion_key_version=null,completion_ledger_revision=null where workspace_id=$1 and project_id=$2 and role=$3 and binding_version=$4 and source_ref=$5 and source_version=$6', [source.workspace_id, source.project_id, source.role, source.binding_version, source.source_ref, source.source_version])
        const next = await advance(client, value.workspace_id, current, value.revoked_at)
        await audit(client, source, 'source_revoked', 'revoked', next, value.revoked_at)
        return { status: 'source_revoked', ledger_revision: next }
      })
    },
    async registerViewer(value) {
      return transact(async (client) => {
        await client.query(
          'insert into outcome_private.bridge_schema_versions(workspace_id,schema_version,durable_revision,updated_at) values($1,2,0,$2) on conflict(workspace_id) do nothing',
          [value.workspace_id, value.created_at],
        )
        const current = await schema(client, value.workspace_id)
        await cleanup(client, value.workspace_id, value.created_at)
        const prior = (await client.query('select * from outcome_private.bridge_viewer_registrations where workspace_id=$1 and project_id=$2 and account_ref=$3 and registration_idempotency_digest=$4 for update', [value.workspace_id, value.project_id, value.account_ref, value.idempotency_digest])).rows?.[0]
        if (prior) {
          if (prior.registration_fingerprint !== value.fingerprint) fail('idempotency_conflict')
          return { status: prior.state === 'active' ? 'viewer_registered' : 'viewer_revoked', revision: Number(prior.revision), ledger_revision: current }
        }
        const next = await advance(client, value.workspace_id, current, value.created_at)
        await client.query("insert into outcome_private.bridge_viewer_registrations(workspace_id,project_id,account_ref,viewer_ref,viewer_class,state,registration_idempotency_digest,registration_fingerprint,revision,created_at) values($1,$2,$3,$4,$5,'active',$6,$7,$8,$9)", [value.workspace_id, value.project_id, value.account_ref, value.viewer_ref, value.viewer_class, value.idempotency_digest, value.fingerprint, next, value.created_at])
        return { status: 'viewer_registered', revision: next, ledger_revision: next }
      })
    },
    async revokeViewer(value) {
      return transact(async (client) => {
        const current = await schema(client, value.workspace_id)
        await cleanup(client, value.workspace_id, value.revoked_at)
        const row = (await client.query('select * from outcome_private.bridge_viewer_registrations where workspace_id=$1 and project_id=$2 and account_ref=$3 and viewer_ref=$4 for update', [value.workspace_id, value.project_id, value.account_ref, value.viewer_ref])).rows?.[0]
        if (!row) fail('access_denied')
        if (row.state === 'revoked') {
          if (row.revocation_idempotency_digest !== value.idempotency_digest || row.revocation_fingerprint !== value.fingerprint) fail('idempotency_conflict')
          return { status: 'viewer_revoked', revision: Number(row.revision), ledger_revision: current }
        }
        if (Number(row.revision) !== value.expected_revision) fail('revision_conflict')
        const next = await advance(client, value.workspace_id, current, value.revoked_at)
        await client.query("update outcome_private.bridge_viewer_registrations set state='revoked',revoked_at=$5,revocation_idempotency_digest=$6,revocation_fingerprint=$7,revision=$8 where workspace_id=$1 and project_id=$2 and account_ref=$3 and viewer_ref=$4", [value.workspace_id, value.project_id, value.account_ref, value.viewer_ref, value.revoked_at, value.idempotency_digest, value.fingerprint, next])
        return { status: 'viewer_revoked', revision: next, ledger_revision: next }
      })
    },
    async cleanupExpiredChallenges(value) {
      return transact(async (client) => ({ status: 'challenge_cleanup', cleared_count: await cleanup(client, value.workspace_id, value.before, value.limit) }))
    },
    async readiness(value) {
      return transact(async (client) => {
        await schema(client, value.workspace_id, false)
        const row = (await client.query("select count(*)::int count,count(distinct viewer_class)::int classes from outcome_private.bridge_viewer_registrations where workspace_id=$1 and project_id=$2 and account_ref=$3 and state='active'", [value.workspace_id, value.project_id, value.account_ref])).rows?.[0]
        return { status: Number(row?.count) === 2 && Number(row?.classes) === 2 ? 'ready' : 'not_ready', active_viewer_count: Number(row?.count ?? 0), active_viewer_class_count: Number(row?.classes ?? 0) }
      })
    },
  }
  if (Reflect.ownKeys(repository).length !== V2_REPOSITORY_METHODS.length) fail('configuration_invalid')
  return Object.freeze(repository)
}
