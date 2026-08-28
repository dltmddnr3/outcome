import { isProxy } from 'node:util/types'
import { createHash, randomBytes } from 'node:crypto'

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
