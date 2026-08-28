import { isProxy } from 'node:util/types'

const CONFIG_FIELDS = new Set(['feature_enabled', 'ingest_enabled', 'read_only', 'schema_version', 'durable_revision', 'cache_revision', 'rate_limit_count', 'rate_window_ms', 'body_limit_bytes', 'cost_limit_units', 'freshness_ms', 'future_skew_ms', 'load_restore_evidence', 'now', 'clone'])
const ADMIT_FIELDS = new Set(['body_bytes', 'cost_units'])
const PROJECTION_FIELDS = new Set(['status_code', 'observed_at', 'expires_at', 'durable_revision', 'cache_revision'])
const DISABLE_FIELDS = new Set(['expected_revision', 'reason_code'])
const RESTORE_FIELDS = new Set(['expected_revision', 'manifest_ref', 'manifest_digest', 'restore_receipt_ref', 'workspace_id', 'project_id', 'role', 'binding_version', 'source_ref', 'source_version', 'deletion_revision'])
const RETENTION_FIELDS = new Set(['expected_revision', 'expired_challenges', 'expired_replays', 'expired_events', 'tombstone_written'])
const EXPORT_FIELDS = new Set(['expected_revision'])
const STATUS_CODES = new Set(['작업 준비 중', '구현 진행 중', '테스트 실행 중', '검수 진행 중', '결과 정리 중', '응답 대기 중'])
const ROLES = new Set(['planner', 'builder', 'ux_product_qa', 'release_audit'])
const SAFE_ID = /^[a-z][a-z0-9_-]{0,63}$/
const PRIVATE_REF = /^[a-z][A-Za-z0-9_-]{7,95}$/
const REASONS = new Set(['operator_action', 'schema_mismatch', 'cost_stop', 'rate_limited', 'source_compromise'])
const DIGEST = /^[0-9a-f]{64}$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const RESTORE_EVIDENCE_FIELDS = new Set(['manifest', 'receipt'])
const MANIFEST_FIELDS = new Set(['manifest_ref', 'manifest_digest', 'workspace_id', 'project_id', 'role', 'binding_version', 'source_ref', 'source_version', 'deletion_revision', 'schema_version', 'durable_revision', 'tombstone_count', 'tombstone_coverage_digest'])
const RECEIPT_FIELDS = new Set(['restore_receipt_ref', 'manifest_ref', 'manifest_digest', 'workspace_id', 'project_id', 'role', 'binding_version', 'source_ref', 'source_version', 'deletion_revision', 'schema_version', 'durable_revision', 'tombstone_count', 'tombstone_coverage_digest', 'state'])
export const OBSERVER_BRIDGE_FUTURE_SKEW_MS = 5_000

export class ObserverBridgeOperationsError extends Error {
  constructor(code) {
    super(code)
    this.name = 'ObserverBridgeOperationsError'
    this.code = code
  }
}

const fail = (code) => { throw new ObserverBridgeOperationsError(code) }
const positive = (value) => typeof value === 'number' && Number.isSafeInteger(value) && value > 0
const nonNegative = (value) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
const iso = (value) => typeof value === 'string' && new Date(value).toISOString() === value
const exactScope = (value) => typeof value.workspace_id === 'string' && SAFE_ID.test(value.workspace_id) && typeof value.project_id === 'string' && SAFE_ID.test(value.project_id) && ROLES.has(value.role) && positive(value.binding_version) && typeof value.source_ref === 'string' && PRIVATE_REF.test(value.source_ref) && positive(value.source_version) && positive(value.deletion_revision)
const sameScope = (left, right) => ['workspace_id', 'project_id', 'role', 'binding_version', 'source_ref', 'source_version', 'deletion_revision'].every((key) => left[key] === right[key])

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

function exactClone(source, output) {
  if (source === null || typeof source !== 'object') {
    if (!Object.is(source, output)) fail('materialization_failed')
    return
  }
  if (typeof output !== 'object' || output === null || output === source || isProxy(output)) fail('materialization_failed')
  const left = Object.getOwnPropertyDescriptors(source)
  const right = Object.getOwnPropertyDescriptors(output)
  const keys = Reflect.ownKeys(left)
  if (keys.length !== Reflect.ownKeys(right).length || keys.some((key) => typeof key !== 'string' || !Object.hasOwn(right, key))) fail('materialization_failed')
  for (const key of keys) {
    if (!Object.hasOwn(left[key], 'value') || !Object.hasOwn(right[key], 'value')) fail('materialization_failed')
    exactClone(left[key].value, right[key].value)
  }
}

export function createObserverBridgeOperations(options = {}) {
  const config = ownRecord(options, CONFIG_FIELDS, new Set(), 'configuration_invalid')
  const booleans = ['feature_enabled', 'ingest_enabled', 'read_only']
  if (booleans.some((key) => config[key] !== undefined && typeof config[key] !== 'boolean')) fail('configuration_invalid')
  const schemaVersion = config.schema_version ?? 1
  const initialDurable = config.durable_revision ?? 0
  const initialCache = config.cache_revision ?? 0
  const rateLimit = config.rate_limit_count ?? 60
  const rateWindow = config.rate_window_ms ?? 60_000
  const bodyLimit = config.body_limit_bytes ?? 32_768
  const costLimit = config.cost_limit_units ?? 1_000
  const freshnessMs = config.freshness_ms ?? 60_000
  const futureSkewMs = config.future_skew_ms ?? OBSERVER_BRIDGE_FUTURE_SKEW_MS
  const loadRestoreEvidence = config.load_restore_evidence
  const now = config.now ?? Date.now
  const clone = config.clone ?? structuredClone
  if (schemaVersion !== 1 || !nonNegative(initialDurable) || !nonNegative(initialCache) || initialCache > initialDurable || !positive(rateLimit) || !positive(rateWindow) || !positive(bodyLimit) || !positive(costLimit) || !positive(freshnessMs) || !nonNegative(futureSkewMs) || loadRestoreEvidence !== undefined && (typeof loadRestoreEvidence !== 'function' || isProxy(loadRestoreEvidence)) || typeof now !== 'function' || isProxy(now) || typeof clone !== 'function' || isProxy(clone)) fail('configuration_invalid')

  let state = {
    feature: config.feature_enabled === true ? 'on' : 'off',
    ingest: config.ingest_enabled === true ? 'enabled' : 'disabled',
    mode: config.read_only === false ? 'read_write' : 'read_only',
    revision: 0,
    schema_version: schemaVersion,
    durable_revision: initialDurable,
    cache_revision: initialCache,
    requests: [],
    cost_units: 0,
    audit: [],
  }
  let busy = false
  let reentry = false

  const materialize = (draft, response) => {
    let output
    try { output = clone(response) } catch { fail('materialization_failed') }
    exactClone(response, output)
    state = draft
    return output
  }
  const clock = () => {
    let value
    try { value = now() } catch { fail('clock_unavailable') }
    if (typeof value !== 'number' || !Number.isFinite(value)) fail('clock_unavailable')
    try { new Date(value).toISOString() } catch { fail('clock_unavailable') }
    return value
  }
  const mutate = (operation) => {
    if (busy) { reentry = true; fail('reentrant_operation') }
    busy = true
    reentry = false
    try {
      const draft = structuredClone(state)
      const response = operation(draft)
      if (reentry) fail('reentrant_operation')
      return materialize(draft, response)
    } finally { busy = false }
  }

  return Object.freeze({
    status() {
      return { feature: state.feature, ingest: state.ingest, mode: state.mode, revision: state.revision, schema_version: state.schema_version }
    },

    admit(input) {
      return mutate((draft) => {
        const value = ownRecord(input, ADMIT_FIELDS)
        if (!nonNegative(value.body_bytes) || !nonNegative(value.cost_units)) fail('input_invalid')
        if (draft.feature !== 'on' || draft.ingest !== 'enabled' || draft.mode !== 'read_write') fail('unavailable')
        const at = clock()
        if (value.body_bytes > bodyLimit) fail('body_too_large')
        draft.requests = draft.requests.filter((time) => at - time < rateWindow)
        if (draft.requests.length >= rateLimit) fail('rate_limited')
        if (draft.cost_units + value.cost_units > costLimit) fail('cost_limited')
        draft.requests.push(at)
        draft.cost_units += value.cost_units
        return { status: 'admitted', reason_code: 'ok', revision: draft.revision }
      })
    },

    projection(input) {
      const value = ownRecord(input, PROJECTION_FIELDS)
      if (value.status_code !== null && !STATUS_CODES.has(value.status_code) || !iso(value.observed_at) || !iso(value.expires_at) || !nonNegative(value.durable_revision) || !nonNegative(value.cache_revision) || value.cache_revision > value.durable_revision || value.durable_revision !== state.durable_revision || value.cache_revision > state.durable_revision) fail('revision_conflict')
      const at = clock()
      const age = at - Date.parse(value.observed_at)
      if (-age > futureSkewMs) fail('future_observation')
      let freshness = 'fresh'
      if (at > Date.parse(value.expires_at) || age > freshnessMs) freshness = age > freshnessMs * 2 ? 'offline' : 'stale'
      return { status_code: freshness === 'fresh' ? value.status_code : null, freshness_class: freshness, durable_revision: value.durable_revision, cache_revision: value.cache_revision }
    },

    disable(input) {
      return mutate((draft) => {
        const value = ownRecord(input, DISABLE_FIELDS)
        if (!nonNegative(value.expected_revision) || !REASONS.has(value.reason_code) || value.expected_revision !== draft.revision) fail('revision_conflict')
        draft.feature = 'off'
        draft.ingest = 'disabled'
        draft.mode = 'read_only'
        draft.revision += 1
        draft.audit.push({ action_code: 'ingest_disabled', reason_code: value.reason_code, revision: draft.revision })
        return { status: 'disabled', revision: draft.revision, reason_code: value.reason_code }
      })
    },

    restore(input) {
      return mutate((draft) => {
        const value = ownRecord(input, RESTORE_FIELDS)
        if (!nonNegative(value.expected_revision) || !UUID.test(value.manifest_ref) || !DIGEST.test(value.manifest_digest) || !UUID.test(value.restore_receipt_ref) || !exactScope(value)) fail('input_invalid')
        if (value.expected_revision !== draft.revision || draft.feature !== 'off' || typeof loadRestoreEvidence !== 'function') fail('restore_denied')
        let evidence
        try { evidence = ownRecord(loadRestoreEvidence({ manifest_ref: value.manifest_ref, restore_receipt_ref: value.restore_receipt_ref, workspace_id: value.workspace_id, project_id: value.project_id, role: value.role, binding_version: value.binding_version, source_ref: value.source_ref, source_version: value.source_version, deletion_revision: value.deletion_revision }), RESTORE_EVIDENCE_FIELDS, RESTORE_EVIDENCE_FIELDS, 'restore_denied') } catch { fail('restore_denied') }
        const manifest = ownRecord(evidence.manifest, MANIFEST_FIELDS, MANIFEST_FIELDS, 'restore_denied')
        const receipt = ownRecord(evidence.receipt, RECEIPT_FIELDS, RECEIPT_FIELDS, 'restore_denied')
        const manifestValid = manifest.manifest_ref === value.manifest_ref && manifest.manifest_digest === value.manifest_digest && sameScope(manifest, value) && manifest.schema_version === draft.schema_version && manifest.durable_revision === draft.durable_revision && manifest.tombstone_count === 1 && DIGEST.test(manifest.tombstone_coverage_digest)
        const receiptValid = receipt.restore_receipt_ref === value.restore_receipt_ref && receipt.manifest_ref === manifest.manifest_ref && receipt.manifest_digest === manifest.manifest_digest && sameScope(receipt, manifest) && receipt.schema_version === manifest.schema_version && receipt.durable_revision === manifest.durable_revision && receipt.tombstone_count === manifest.tombstone_count && receipt.tombstone_coverage_digest === manifest.tombstone_coverage_digest && receipt.state === 'applied'
        if (!manifestValid || !receiptValid) fail('restore_denied')
        draft.cache_revision = manifest.durable_revision
        draft.ingest = 'disabled'
        draft.mode = 'read_only'
        draft.revision += 1
        draft.audit.push({ action_code: 'restore_verified', reason_code: 'ok', revision: draft.revision })
        return { status: 'restore_verified', revision: draft.revision, durable_revision: draft.durable_revision, mode: draft.mode }
      })
    },

    applyRetention(input) {
      return mutate((draft) => {
        const value = ownRecord(input, RETENTION_FIELDS)
        if (!nonNegative(value.expected_revision) || !nonNegative(value.expired_challenges) || !nonNegative(value.expired_replays) || !nonNegative(value.expired_events) || value.tombstone_written !== true || value.expected_revision !== draft.revision || draft.mode !== 'read_only') fail('retention_denied')
        draft.revision += 1
        draft.audit.push({ action_code: 'retention_purged', reason_code: 'retention', revision: draft.revision })
        return { status: 'retention_applied', revision: draft.revision, deleted_count: value.expired_challenges + value.expired_replays + value.expired_events, tombstone_state: 'recorded' }
      })
    },

    exportReceipt(input) {
      const value = ownRecord(input, EXPORT_FIELDS)
      if (!nonNegative(value.expected_revision) || value.expected_revision !== state.revision || state.mode !== 'read_only') fail('export_denied')
      return {
        status: 'export_ready',
        schema_version: state.schema_version,
        durable_revision: state.durable_revision,
        revision: state.revision,
        content_class: 'finite_status_only',
        tombstone_policy: 'required',
      }
    },

    metrics() {
      return { feature: state.feature, ingest: state.ingest, mode: state.mode, revision: state.revision, durable_revision: state.durable_revision, cache_parity: state.cache_revision === state.durable_revision ? 'equal' : 'behind', audit_count: state.audit.length }
    },
  })
}
