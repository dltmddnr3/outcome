import { createHash, createPublicKey } from 'node:crypto'
import { isProxy } from 'node:util/types'
import { ObserverBridgeDurableRepositoryError } from './phase3-observer-bridge-durable-repository.mjs'
import { createOpaqueLedgerId } from './phase3-observer-bridge-postgres.mjs'

const OPERATIONS = ['createEnrollmentChallenge', 'completeEnrollment', 'readProjection', 'revokeSource', 'rotateSource', 'ingestEvent']
const ROLES = new Set(['planner', 'builder', 'ux_product_qa', 'release_audit'])
const STATUS_CODES = new Set(['작업 준비 중', '구현 진행 중', '테스트 실행 중', '검수 진행 중', '결과 정리 중', '응답 대기 중'])
const SAFE_ID = /^[a-z][a-z0-9_-]{0,63}$/
const PRIVATE_REF = /^[a-z][A-Za-z0-9_-]{7,95}$/
const DIGEST = /^[a-f0-9]{64}$/
const BASE_FIELDS = ['workspace_id', 'project_id', 'role', 'binding_version', 'source_ref', 'source_version', 'expected_durable_revision']
const INPUT_FIELDS = Object.freeze({
  createEnrollmentChallenge: new Set([...BASE_FIELDS, 'idempotency_digest', 'challenge_digest', 'expires_at']),
  completeEnrollment: new Set([...BASE_FIELDS, 'challenge_digest', 'certificate_digest', 'key_version', 'public_key_spki', 'public_key_digest', 'activated_at']),
  readProjection: new Set(BASE_FIELDS),
  revokeSource: new Set([...BASE_FIELDS, 'certificate_digest', 'revoked_at']),
  rotateSource: new Set([...BASE_FIELDS, 'certificate_digest', 'expected_key_version', 'new_key_version', 'public_key_spki', 'public_key_digest', 'rotated_at']),
  ingestEvent: new Set([...BASE_FIELDS, 'certificate_digest', 'request_digest', 'nonce_digest', 'event_digest', 'sequence', 'status_code', 'observed_at', 'expires_at']),
})
const OPTION_FIELDS = new Set(['with_transaction', 'clone', 'new_row_id', 'rate_limit_count', 'schema_version'])
const EFFECTIVE_ROLE = 'outcome_bridge_backend'
const REPOSITORY_ERROR_CODES = new Set(['access_denied', 'configuration_invalid', 'enrollment_conflict', 'enrollment_invalid', 'idempotency_conflict', 'input_invalid', 'materialization_failed', 'rate_limited', 'reentrant_operation', 'request_conflict', 'revision_conflict', 'schema_mismatch', 'sequence_conflict', 'storage_unavailable'])

const fail = (code) => { throw new ObserverBridgeDurableRepositoryError(code) }
const positive = (value) => Number.isSafeInteger(value) && value > 0
const nonNegative = (value) => Number.isSafeInteger(value) && value >= 0
const digest = (value) => typeof value === 'string' && DIGEST.test(value)
const iso = (value) => typeof value === 'string' && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value

const canonicalSpkiDigest = (value) => {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{40,256}$/.test(value)) return null
  let bytes
  try { bytes = Buffer.from(value, 'base64url') } catch { return null }
  if (bytes.length === 0 || bytes.toString('base64url') !== value) return null
  try {
    const key = createPublicKey({ key: bytes, format: 'der', type: 'spki' })
    if (key.type !== 'public' || key.asymmetricKeyType !== 'ed25519') return null
    const canonical = key.export({ format: 'der', type: 'spki' })
    if (!Buffer.isBuffer(canonical) || !canonical.equals(bytes)) return null
    return createHash('sha256').update(canonical).digest('hex')
  } catch { return null }
}

function ownRecord(value, allowed, code) {
  if (typeof value !== 'object' || value === null || Array.isArray(value) || isProxy(value)) fail(code)
  let descriptors
  let prototype
  try { descriptors = Object.getOwnPropertyDescriptors(value); prototype = Object.getPrototypeOf(value) } catch { fail(code) }
  if (prototype !== Object.prototype && prototype !== null) fail(code)
  const keys = Reflect.ownKeys(descriptors)
  if (keys.length !== allowed.size || keys.some((key) => typeof key !== 'string' || !allowed.has(key))) fail(code)
  const output = Object.create(null)
  for (const key of allowed) {
    const descriptor = descriptors[key]
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) fail(code)
    output[key] = descriptor.value
  }
  return output
}

function ownOptions(value) {
  if (typeof value !== 'object' || value === null || Array.isArray(value) || isProxy(value)) fail('configuration_invalid')
  let descriptors
  let prototype
  try { descriptors = Object.getOwnPropertyDescriptors(value); prototype = Object.getPrototypeOf(value) } catch { fail('configuration_invalid') }
  if (prototype !== Object.prototype && prototype !== null) fail('configuration_invalid')
  const keys = Reflect.ownKeys(descriptors)
  if (!keys.includes('with_transaction') || keys.some((key) => typeof key !== 'string' || !OPTION_FIELDS.has(key))) fail('configuration_invalid')
  const output = Object.create(null)
  for (const key of keys) {
    const descriptor = descriptors[key]
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) fail('configuration_invalid')
    output[key] = descriptor.value
  }
  return output
}

function exactClone(source, output, seen = new Map()) {
  if (source === null || typeof source !== 'object') {
    if (!Object.is(source, output)) fail('materialization_failed')
    return
  }
  if (typeof output !== 'object' || output === null || output === source || isProxy(output)) fail('materialization_failed')
  let sourcePrototype
  let outputPrototype
  try { sourcePrototype = Object.getPrototypeOf(source); outputPrototype = Object.getPrototypeOf(output) } catch { fail('materialization_failed') }
  if (sourcePrototype !== outputPrototype) fail('materialization_failed')
  if (seen.has(source)) {
    if (seen.get(source) !== output) fail('materialization_failed')
    return
  }
  seen.set(source, output)
  const left = Object.getOwnPropertyDescriptors(source)
  const right = Object.getOwnPropertyDescriptors(output)
  const keys = Reflect.ownKeys(left)
  if (keys.length !== Reflect.ownKeys(right).length || keys.some((key) => !Object.hasOwn(right, key))) fail('materialization_failed')
  for (const key of keys) {
    if (!Object.hasOwn(left[key], 'value') || !Object.hasOwn(right[key], 'value') || left[key].enumerable !== right[key].enumerable) fail('materialization_failed')
    exactClone(left[key].value, right[key].value, seen)
  }
}

function validateInput(operation, input) {
  const value = ownRecord(input, INPUT_FIELDS[operation], 'input_invalid')
  if (!SAFE_ID.test(value.workspace_id) || !SAFE_ID.test(value.project_id) || !ROLES.has(value.role) || !positive(value.binding_version)
    || !PRIVATE_REF.test(value.source_ref) || !positive(value.source_version) || !nonNegative(value.expected_durable_revision)) fail('input_invalid')
  if (operation === 'createEnrollmentChallenge') {
    if (!digest(value.idempotency_digest) || !digest(value.challenge_digest) || !iso(value.expires_at)) fail('input_invalid')
  } else if (operation === 'completeEnrollment') {
    if (!digest(value.challenge_digest) || !digest(value.certificate_digest) || !positive(value.key_version) || !digest(value.public_key_digest) || canonicalSpkiDigest(value.public_key_spki) !== value.public_key_digest || !iso(value.activated_at)) fail('input_invalid')
  } else if (operation === 'revokeSource') {
    if (!digest(value.certificate_digest) || !iso(value.revoked_at)) fail('input_invalid')
  } else if (operation === 'rotateSource') {
    if (!digest(value.certificate_digest) || !positive(value.expected_key_version) || value.new_key_version !== value.expected_key_version + 1 || !digest(value.public_key_digest) || canonicalSpkiDigest(value.public_key_spki) !== value.public_key_digest || !iso(value.rotated_at)) fail('input_invalid')
  } else if (operation === 'ingestEvent') {
    if (![value.certificate_digest, value.request_digest, value.nonce_digest, value.event_digest].every(digest) || !positive(value.sequence) || !STATUS_CODES.has(value.status_code) || !iso(value.observed_at) || !iso(value.expires_at) || Date.parse(value.expires_at) <= Date.parse(value.observed_at)) fail('input_invalid')
  }
  return value
}

function mapDatabaseError(error, operation) {
  if (typeof error !== 'object' || error === null || isProxy(error)) fail('storage_unavailable')
  let prototype
  let nativeError
  let descriptors
  try { prototype = Object.getPrototypeOf(error); nativeError = error instanceof Error; descriptors = Object.getOwnPropertyDescriptors(error) } catch { fail('storage_unavailable') }
  if (prototype === ObserverBridgeDurableRepositoryError.prototype) {
    const name = descriptors.name
    const code = descriptors.code
    const message = descriptors.message
    if (!name || !code || !message || ![name, code, message].every((descriptor) => Object.hasOwn(descriptor, 'value'))
      || name.value !== 'ObserverBridgeDurableRepositoryError' || typeof code.value !== 'string' || message.value !== code.value || !REPOSITORY_ERROR_CODES.has(code.value)) fail('storage_unavailable')
    fail(code.value)
  }
  const messageDescriptor = descriptors.message
  if (!nativeError || !messageDescriptor || !Object.hasOwn(messageDescriptor, 'value') || typeof messageDescriptor.value !== 'string') fail('storage_unavailable')
  const message = messageDescriptor.value
  if (/row-level security|permission denied/i.test(message)) fail('access_denied')
  if (/serialization|deadlock/i.test(message)) fail('revision_conflict')
  if (/unique|duplicate/i.test(message)) {
    if (operation === 'createEnrollmentChallenge' || operation === 'completeEnrollment') fail('enrollment_conflict')
    if (operation === 'ingestEvent') fail('request_conflict')
    fail('revision_conflict')
  }
  fail('storage_unavailable')
}

export function createObserverBridgeDurableRepositoryPostgres(options = {}) {
  const supplied = ownOptions(options)
  const clone = supplied.clone ?? structuredClone
  const newRowId = supplied.new_row_id ?? createOpaqueLedgerId
  const rateLimitCount = supplied.rate_limit_count ?? 60
  const schemaVersion = supplied.schema_version ?? 1
  if (typeof supplied.with_transaction !== 'function' || isProxy(supplied.with_transaction) || typeof clone !== 'function' || isProxy(clone)
    || typeof newRowId !== 'function' || isProxy(newRowId) || !positive(rateLimitCount) || schemaVersion !== 1) fail('configuration_invalid')
  let busy = false
  let reentered = false

  const materializeInput = (operation, input) => {
    const value = validateInput(operation, input)
    let copy
    try { copy = clone(value) } catch { fail('input_invalid') }
    const materialized = validateInput(operation, copy)
    try { exactClone(value, materialized) } catch { fail('input_invalid') }
    return materialized
  }

  const materializeResponse = (response) => {
    let copy
    try { copy = clone(response) } catch { fail('materialization_failed') }
    exactClone(response, copy)
    return copy
  }

  const transact = async (operation, input, action) => {
    if (busy) { reentered = true; fail('reentrant_operation') }
    const value = materializeInput(operation, input)
    busy = true
    reentered = false
    try {
      return await supplied.with_transaction(Object.freeze({ effective_role: EFFECTIVE_ROLE }), async (candidate) => {
        const client = ownRecord(candidate, new Set(['query']), 'storage_unavailable')
        if (typeof client.query !== 'function' || isProxy(client.query)) fail('storage_unavailable')
        const schema = (await client.query('select schema_version,durable_revision from outcome_private.bridge_schema_versions where workspace_id=$1 for update', [value.workspace_id])).rows?.[0]
        if (!schema || Number(schema.schema_version) !== schemaVersion) fail('schema_mismatch')
        if (Number(schema.durable_revision) !== value.expected_durable_revision) fail('revision_conflict')
        const response = await action(client, value, Number(schema.durable_revision))
        if (reentered) fail('reentrant_operation')
        return materializeResponse(response)
      })
    } catch (error) { mapDatabaseError(error, operation) } finally { busy = false }
  }

  const nextId = () => {
    let value
    try { value = newRowId() } catch { fail('storage_unavailable') }
    if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value)) fail('storage_unavailable')
    return value
  }
  const scope = (value) => [value.workspace_id, value.project_id, value.role, value.binding_version, value.source_ref, value.source_version]
  const advance = async (client, value, current, occurredAt) => {
    const result = await client.query('update outcome_private.bridge_schema_versions set durable_revision=$2,updated_at=$3 where workspace_id=$1 and durable_revision=$4 returning durable_revision', [value.workspace_id, current + 1, occurredAt, current])
    if (result?.rows?.length !== 1) fail('revision_conflict')
    return current + 1
  }
  const audit = (client, value, actionCode, reasonCode, revision, occurredAt, includeScope = true) => client.query(
    includeScope
      ? 'insert into outcome_private.bridge_audit(audit_id,workspace_id,project_id,role,binding_version,source_ref,source_version,action_code,reason_code,revision,occurred_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)'
      : 'insert into outcome_private.bridge_audit(audit_id,workspace_id,project_id,role,binding_version,action_code,reason_code,revision,occurred_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9)',
    includeScope ? [nextId(), ...scope(value), actionCode, reasonCode, revision, occurredAt] : [nextId(), value.workspace_id, value.project_id, value.role, value.binding_version, actionCode, reasonCode, revision, occurredAt],
  )

  const createEnrollmentChallenge = async (input) => transact('createEnrollmentChallenge', input, async (client, value, current) => {
    const prior = (await client.query('select project_id,role,binding_version,source_ref,source_version,challenge_digest from outcome_private.bridge_enrollment_challenges where workspace_id=$1 and idempotency_digest=$2', [value.workspace_id, value.idempotency_digest])).rows?.[0]
    if (prior) {
      if (prior.project_id !== value.project_id || prior.role !== value.role || Number(prior.binding_version) !== value.binding_version || prior.source_ref !== value.source_ref || Number(prior.source_version) !== value.source_version || prior.challenge_digest !== value.challenge_digest) fail('idempotency_conflict')
      return { status: 'duplicate', durable_revision: current }
    }
    const collision = (await client.query('select challenge_digest from outcome_private.bridge_enrollment_challenges where challenge_digest=$1', [value.challenge_digest])).rows?.[0]
    const active = (await client.query("select source_ref from outcome_private.bridge_sources where workspace_id=$1 and project_id=$2 and role=$3 and binding_version=$4 and state='active'", [value.workspace_id, value.project_id, value.role, value.binding_version])).rows?.[0]
    if (collision || active) fail('enrollment_conflict')
    const issuedAt = new Date(Date.parse(value.expires_at) - 1).toISOString()
    await client.query("insert into outcome_private.bridge_enrollment_challenges(workspace_id,project_id,role,binding_version,source_ref,source_version,key_version,challenge_digest,idempotency_digest,state,issued_at,expires_at,revision) values($1,$2,$3,$4,$5,$6,1,$7,$8,'pending',$9,$10,1)", [...scope(value), value.challenge_digest, value.idempotency_digest, issuedAt, value.expires_at])
    const next = await advance(client, value, current, issuedAt)
    await audit(client, value, 'challenge_created', 'ok', next, issuedAt, false)
    return { status: 'challenge_created', durable_revision: next }
  })

  const completeEnrollment = async (input) => transact('completeEnrollment', input, async (client, value, current) => {
    const challenge = (await client.query('select project_id,role,binding_version,source_ref,source_version,state,expires_at from outcome_private.bridge_enrollment_challenges where workspace_id=$1 and challenge_digest=$2 for update', [value.workspace_id, value.challenge_digest])).rows?.[0]
    if (!challenge || challenge.project_id !== value.project_id || challenge.role !== value.role || Number(challenge.binding_version) !== value.binding_version || challenge.source_ref !== value.source_ref || Number(challenge.source_version) !== value.source_version) fail('access_denied')
    if (challenge.state !== 'pending' || Date.parse(challenge.expires_at) <= Date.parse(value.activated_at)) fail('enrollment_invalid')
    const active = (await client.query("select source_ref from outcome_private.bridge_sources where workspace_id=$1 and project_id=$2 and role=$3 and binding_version=$4 and state='active'", [value.workspace_id, value.project_id, value.role, value.binding_version])).rows?.[0]
    const certificate = (await client.query('select certificate_digest from outcome_private.bridge_sources where workspace_id=$1 and certificate_digest=$2', [value.workspace_id, value.certificate_digest])).rows?.[0]
    if (active || certificate) fail('enrollment_conflict')
    await client.query("update outcome_private.bridge_enrollment_challenges set state='consumed',consumed_at=$3,revision=revision+1 where workspace_id=$1 and challenge_digest=$2 and state='pending'", [value.workspace_id, value.challenge_digest, value.activated_at])
    await client.query('insert into outcome_private.bridge_source_scopes(workspace_id,project_id,role,binding_version,source_ref,source_version,created_at) values($1,$2,$3,$4,$5,$6,$7)', [...scope(value), value.activated_at])
    await client.query("insert into outcome_private.bridge_sources(workspace_id,project_id,role,binding_version,source_ref,source_version,active_key_version,certificate_digest,state,revision,created_at,updated_at) values($1,$2,$3,$4,$5,$6,$7,$8,'active',1,$9,$9)", [...scope(value), value.key_version, value.certificate_digest, value.activated_at])
    await client.query("insert into outcome_private.bridge_source_keys(workspace_id,project_id,role,binding_version,source_ref,source_version,key_version,public_key_spki,public_key_digest,state,created_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,'active',$10)", [...scope(value), value.key_version, value.public_key_spki, value.public_key_digest, value.activated_at])
    const next = await advance(client, value, current, value.activated_at)
    await client.query("insert into outcome_private.bridge_projections(workspace_id,project_id,role,binding_version,source_ref,source_version,status_code,freshness_class,observed_time_class,ledger_revision,accepted_count,conflict_count,durable_revision,cache_revision,updated_at) values($1,$2,$3,$4,$5,$6,null,'unknown','unavailable',0,0,0,$7,$7,$8)", [...scope(value), next, value.activated_at])
    await audit(client, value, 'source_activated', 'ok', next, value.activated_at)
    return { status: 'source_active', durable_revision: next, source_version: value.source_version, key_version: value.key_version }
  })

  const readProjection = async (input) => transact('readProjection', input, async (client, value, current) => {
    const source = (await client.query('select state from outcome_private.bridge_sources where workspace_id=$1 and project_id=$2 and role=$3 and binding_version=$4 and source_ref=$5 and source_version=$6', scope(value))).rows?.[0]
    if (!source || source.state !== 'active') fail('access_denied')
    const event = (await client.query('select sequence,status_code,observed_at,expires_at from outcome_private.bridge_events where workspace_id=$1 and project_id=$2 and role=$3 and binding_version=$4 and source_ref=$5 and source_version=$6 order by sequence desc limit 1', scope(value))).rows?.[0]
    return { status: 'projection_read', durable_revision: current, projection: event ? { sequence: Number(event.sequence), status_code: event.status_code, observed_at: new Date(event.observed_at).toISOString(), expires_at: new Date(event.expires_at).toISOString() } : null }
  })

  const rotateSource = async (input) => transact('rotateSource', input, async (client, value, current) => {
    const source = (await client.query('select state,certificate_digest,active_key_version from outcome_private.bridge_sources where workspace_id=$1 and project_id=$2 and role=$3 and binding_version=$4 and source_ref=$5 and source_version=$6 for update', scope(value))).rows?.[0]
    if (!source || source.state !== 'active' || source.certificate_digest !== value.certificate_digest) fail('access_denied')
    if (Number(source.active_key_version) !== value.expected_key_version) fail('revision_conflict')
    const updated = await client.query('update outcome_private.bridge_sources set active_key_version=$7,revision=revision+1,updated_at=$8 where workspace_id=$1 and project_id=$2 and role=$3 and binding_version=$4 and source_ref=$5 and source_version=$6 returning revision', [...scope(value), value.new_key_version, value.rotated_at])
    if (updated?.rows?.length !== 1) fail('revision_conflict')
    const replaced = await client.query("update outcome_private.bridge_source_keys set state='replaced' where workspace_id=$1 and project_id=$2 and role=$3 and binding_version=$4 and source_ref=$5 and source_version=$6 and key_version=$7 and state='active' returning key_version", [...scope(value), value.expected_key_version])
    if (replaced?.rows?.length !== 1) fail('access_denied')
    await client.query("insert into outcome_private.bridge_source_keys(workspace_id,project_id,role,binding_version,source_ref,source_version,key_version,public_key_spki,public_key_digest,state,created_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,'active',$10)", [...scope(value), value.new_key_version, value.public_key_spki, value.public_key_digest, value.rotated_at])
    const next = await advance(client, value, current, value.rotated_at)
    await audit(client, value, 'source_rotated', 'ok', next, value.rotated_at)
    return { status: 'key_rotated', durable_revision: next, key_version: value.new_key_version }
  })

  const revokeSource = async (input) => transact('revokeSource', input, async (client, value, current) => {
    const updated = await client.query("update outcome_private.bridge_sources set state='revoked',revision=revision+1,updated_at=$7 where workspace_id=$1 and project_id=$2 and role=$3 and binding_version=$4 and source_ref=$5 and source_version=$6 and state='active' and certificate_digest=$8 returning revision", [...scope(value), value.revoked_at, value.certificate_digest])
    if (updated?.rows?.length !== 1) fail('access_denied')
    await client.query("update outcome_private.bridge_source_keys set state='revoked',revoked_at=$7 where workspace_id=$1 and project_id=$2 and role=$3 and binding_version=$4 and source_ref=$5 and source_version=$6 and state='active'", [...scope(value), value.revoked_at])
    await client.query("update outcome_private.bridge_projections set status_code=null,freshness_class='offline',observed_time_class='expired',updated_at=$5 where workspace_id=$1 and project_id=$2 and role=$3 and binding_version=$4", [value.workspace_id, value.project_id, value.role, value.binding_version, value.revoked_at])
    const next = await advance(client, value, current, value.revoked_at)
    await audit(client, value, 'source_revoked', 'revoked', next, value.revoked_at)
    return { status: 'source_revoked', durable_revision: next }
  })

  const ingestEvent = async (input) => transact('ingestEvent', input, async (client, value, current) => {
    const source = (await client.query('select state,active_key_version,certificate_digest from outcome_private.bridge_sources where workspace_id=$1 and project_id=$2 and role=$3 and binding_version=$4 and source_ref=$5 and source_version=$6 for update', scope(value))).rows?.[0]
    if (!source || source.state !== 'active' || source.certificate_digest !== value.certificate_digest) fail('access_denied')
    const prior = (await client.query('select event_digest,outcome_code from outcome_private.bridge_request_replay where workspace_id=$1 and request_digest=$2', [value.workspace_id, value.request_digest])).rows?.[0]
    if (prior) {
      if (prior.event_digest !== value.event_digest) fail('request_conflict')
      const sequence = (await client.query('select sequence from outcome_private.bridge_events where workspace_id=$1 and event_digest=$2', [value.workspace_id, value.event_digest])).rows?.[0]
      return { status: 'duplicate', durable_revision: current, sequence: Number(sequence?.sequence ?? value.sequence) }
    }
    const projection = (await client.query('select ledger_revision,accepted_count from outcome_private.bridge_projections where workspace_id=$1 and project_id=$2 and role=$3 and binding_version=$4 for update', [value.workspace_id, value.project_id, value.role, value.binding_version])).rows?.[0]
    if (!projection || Number(projection.accepted_count) >= rateLimitCount) fail('rate_limited')
    const last = (await client.query('select sequence from outcome_private.bridge_events where workspace_id=$1 and project_id=$2 and role=$3 and binding_version=$4 and source_ref=$5 and source_version=$6 order by sequence desc limit 1', scope(value))).rows?.[0]
    if (value.sequence !== Number(last?.sequence ?? 0) + 1) fail('sequence_conflict')
    const next = current + 1
    const keyVersion = Number(source.active_key_version)
    await client.query("insert into outcome_private.bridge_request_replay(workspace_id,project_id,role,binding_version,source_ref,source_version,key_version,request_digest,nonce_digest,event_digest,outcome_code,expires_at,created_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'accepted',$11,$12)", [...scope(value), keyVersion, value.request_digest, value.nonce_digest, value.event_digest, value.expires_at, value.observed_at])
    await client.query("insert into outcome_private.bridge_events(event_id,workspace_id,project_id,role,binding_version,source_ref,source_version,key_version,sequence,ledger_revision,status_code,observed_at,expires_at,event_digest,signature_class,created_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'ed25519_verified',$12)", [nextId(), ...scope(value), keyVersion, value.sequence, next, value.status_code, value.observed_at, value.expires_at, value.event_digest])
    const projected = await client.query("update outcome_private.bridge_projections set status_code=$5,freshness_class='fresh',observed_time_class='current',ledger_revision=$6,accepted_count=accepted_count+1,durable_revision=$6,cache_revision=$6,updated_at=$7 where workspace_id=$1 and project_id=$2 and role=$3 and binding_version=$4 returning accepted_count", [value.workspace_id, value.project_id, value.role, value.binding_version, value.status_code, next, value.observed_at])
    if (projected?.rows?.length !== 1) fail('revision_conflict')
    await advance(client, value, current, value.observed_at)
    await audit(client, value, 'event_accepted', 'ok', next, value.observed_at)
    return { status: 'accepted', durable_revision: next, sequence: value.sequence }
  })

  return Object.freeze({ createEnrollmentChallenge, completeEnrollment, readProjection, revokeSource, rotateSource, ingestEvent })
}

export const DURABLE_REPOSITORY_POSTGRES_OPERATIONS = Object.freeze([...OPERATIONS])
