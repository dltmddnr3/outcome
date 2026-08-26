import { createHash, verify as nodeVerify, KeyObject } from 'node:crypto'
import { isProxy } from 'node:util/types'

const FUTURE_TOLERANCE_MS = 5_000
const ROLES = new Set(['planner', 'builder', 'ux_product_qa', 'release_audit'])
const VIEWER_CLASSES = new Set(['workstation', 'remote_device'])
const REGISTRATION_STATUS = new Set(['active', 'revoked'])
const SAFE_ID = /^[a-z][a-z0-9-]{0,63}$/
const SAFE_PRIVATE_REF = /^[a-z][a-z0-9_-]{7,63}$/
const BASE64URL_SIGNATURE = /^[A-Za-z0-9_-]{86}$/
const HEX_256 = /^[a-f0-9]{64}$/

const NOW_STATES = Object.freeze([
  '작업 준비 중',
  '구현 진행 중',
  '테스트 실행 중',
  '검수 진행 중',
  '결과 정리 중',
  '응답 대기 중',
])
const NOW_STATE_SET = new Set(NOW_STATES)

const SIGNED_FIELDS = Object.freeze([
  'schema_version',
  'project_id',
  'role',
  'binding_version',
  'source_ref',
  'source_version',
  'key_version',
  'sequence',
  'observed_at',
  'expires_at',
  'status_code',
])
const EVENT_FIELDS = Object.freeze([...SIGNED_FIELDS, 'signature'])

const CONFIG_FIELDS = new Set(['sources', 'viewers', 'freshness_ms', 'now', 'enabled', 'verify_signature', 'digest', 'clone'])
const SOURCE_FIELDS = new Set(['project_id', 'role', 'binding_version', 'source_ref', 'source_version', 'key_version', 'public_key', 'status'])
const VIEWER_FIELDS = new Set(['viewer_ref', 'viewer_class', 'project_ids', 'status'])
const VIEWER_INPUT_FIELDS = new Set(['viewer_ref', 'viewer_class', 'project_id'])

export const OBSERVER_BRIDGE_NOW_STATES = NOW_STATES

export class ObserverBridgeError extends Error {
  constructor(code) {
    super(code)
    this.name = 'ObserverBridgeError'
    this.code = code
  }
}

const fail = (code) => { throw new ObserverBridgeError(code) }
const positiveInteger = (value) => typeof value === 'number' && Number.isSafeInteger(value) && value > 0
const nonNegativeInteger = (value) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
const safeId = (value) => typeof value === 'string' && SAFE_ID.test(value)
const safePrivateRef = (value) => typeof value === 'string' && SAFE_PRIVATE_REF.test(value)
const canonicalIso = (value) => {
  if (typeof value !== 'string') return false
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value
}

function ownDataRecord(value, allowed, required = allowed, code = 'input_invalid') {
  if (typeof value !== 'object' || value === null || Array.isArray(value) || isProxy(value)) fail(code)
  let prototype
  let descriptors
  try {
    prototype = Object.getPrototypeOf(value)
    descriptors = Object.getOwnPropertyDescriptors(value)
  } catch { fail(code) }
  if (prototype !== Object.prototype && prototype !== null) fail(code)
  const keys = Reflect.ownKeys(descriptors)
  if (keys.some((key) => typeof key !== 'string' || !allowed.has(key))) fail(code)
  if ([...required].some((key) => !Object.hasOwn(descriptors, key))) fail(code)
  const result = {}
  for (const key of keys) {
    const descriptor = descriptors[key]
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) fail(code)
    result[key] = descriptor.value
  }
  return result
}

function ownDataArray(value, materialize, code = 'configuration_invalid') {
  if (!Array.isArray(value) || isProxy(value)) fail(code)
  let descriptors
  try { descriptors = Object.getOwnPropertyDescriptors(value) } catch { fail(code) }
  const keys = Reflect.ownKeys(descriptors)
  if (keys.some((key) => typeof key !== 'string' || (key !== 'length' && !/^(0|[1-9][0-9]*)$/.test(key)))) fail(code)
  if (keys.length !== value.length + 1) fail(code)
  const output = []
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = descriptors[String(index)]
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) fail(code)
    output.push(materialize(descriptor.value))
  }
  return output
}

function canonicalUnsigned(input) {
  const value = ownDataRecord(input, new Set(SIGNED_FIELDS), new Set(SIGNED_FIELDS))
  if (value.schema_version !== 1 || !safeId(value.project_id) || !ROLES.has(value.role) ||
      !positiveInteger(value.binding_version) || !safePrivateRef(value.source_ref) ||
      !positiveInteger(value.source_version) || !positiveInteger(value.key_version) ||
      !positiveInteger(value.sequence) || !canonicalIso(value.observed_at) ||
      !canonicalIso(value.expires_at) || !NOW_STATE_SET.has(value.status_code)) fail('input_invalid')
  if (Date.parse(value.expires_at) <= Date.parse(value.observed_at)) fail('input_invalid')
  return value
}

export function canonicalObserverBridgeBytes(input) {
  const value = canonicalUnsigned(input)
  let serialized = 'OUTCOME_OBSERVER_BRIDGE_EVENT_V1\n'
  for (const field of SIGNED_FIELDS) {
    const canonicalValue = typeof value[field] === 'number' ? String(value[field]) : value[field]
    serialized += `${field}=${Buffer.byteLength(canonicalValue, 'utf8')}:${canonicalValue}\n`
  }
  return Buffer.from(serialized, 'utf8')
}

function canonicalSignature(value) {
  if (typeof value !== 'string' || !BASE64URL_SIGNATURE.test(value)) return null
  let decoded
  try { decoded = Buffer.from(value, 'base64url') } catch { return null }
  if (decoded.length !== 64 || decoded.toString('base64url') !== value) return null
  return decoded
}

function validatePublicKey(value) {
  if (isProxy(value)) return false
  try {
    return value instanceof KeyObject && value.type === 'public' && value.asymmetricKeyType === 'ed25519'
  } catch {
    return false
  }
}

function assertExactIndependentClone(original, candidate, originalToCandidate = new Map(), candidateToOriginal = new Map()) {
  if (original === null) {
    if (candidate !== null) fail('materialization_failed')
    return
  }
  if (typeof original !== 'object') {
    if (!['string', 'number', 'boolean'].includes(typeof original) ||
        (typeof original === 'number' && !Number.isSafeInteger(original)) ||
        !Object.is(candidate, original)) fail('materialization_failed')
    return
  }
  if (candidate === null || typeof candidate !== 'object' || isProxy(original) || isProxy(candidate) || candidate === original) fail('materialization_failed')

  if (originalToCandidate.has(original)) {
    if (originalToCandidate.get(original) !== candidate) fail('materialization_failed')
    return
  }
  if (candidateToOriginal.has(candidate)) fail('materialization_failed')
  originalToCandidate.set(original, candidate)
  candidateToOriginal.set(candidate, original)

  const originalArray = Array.isArray(original)
  if (Array.isArray(candidate) !== originalArray) fail('materialization_failed')
  let originalPrototype
  let candidatePrototype
  let originalDescriptors
  let candidateDescriptors
  try {
    originalPrototype = Object.getPrototypeOf(original)
    candidatePrototype = Object.getPrototypeOf(candidate)
    originalDescriptors = Object.getOwnPropertyDescriptors(original)
    candidateDescriptors = Object.getOwnPropertyDescriptors(candidate)
  } catch { fail('materialization_failed') }
  const expectedPrototype = originalArray ? Array.prototype : Object.prototype
  if (originalPrototype !== expectedPrototype || candidatePrototype !== expectedPrototype) fail('materialization_failed')

  const originalKeys = Reflect.ownKeys(originalDescriptors)
  const candidateKeys = Reflect.ownKeys(candidateDescriptors)
  if (originalKeys.length !== candidateKeys.length || originalKeys.some((key) => typeof key !== 'string' || !Object.hasOwn(candidateDescriptors, key))) fail('materialization_failed')
  for (const key of originalKeys) {
    const source = originalDescriptors[key]
    const output = candidateDescriptors[key]
    if (!source || !output || !Object.hasOwn(source, 'value') || !Object.hasOwn(output, 'value')) fail('materialization_failed')
    if (key === 'length' && originalArray) {
      if (source.enumerable || output.enumerable || source.value !== output.value) fail('materialization_failed')
      continue
    }
    if (!source.enumerable || !output.enumerable) fail('materialization_failed')
    assertExactIndependentClone(source.value, output.value, originalToCandidate, candidateToOriginal)
  }
}

function freezeResponseGraph(value, seen = new Set()) {
  if (value === null) return
  if (typeof value !== 'object') {
    if (!['string', 'number', 'boolean'].includes(typeof value) ||
        (typeof value === 'number' && !Number.isSafeInteger(value))) fail('materialization_failed')
    return
  }
  if (isProxy(value) || seen.has(value)) fail('materialization_failed')
  seen.add(value)
  const array = Array.isArray(value)
  let prototype
  let descriptors
  try {
    prototype = Object.getPrototypeOf(value)
    descriptors = Object.getOwnPropertyDescriptors(value)
  } catch { fail('materialization_failed') }
  if (prototype !== (array ? Array.prototype : Object.prototype)) fail('materialization_failed')
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (array && key === 'length') continue
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) fail('materialization_failed')
    freezeResponseGraph(descriptor.value, seen)
  }
  if (Reflect.ownKeys(descriptors).some((key) => typeof key !== 'string')) fail('materialization_failed')
  try { Object.freeze(value) } catch { fail('materialization_failed') }
}

const sourceKey = (value) => `${value.project_id ?? value.projectId}:${value.role}:${value.binding_version ?? value.bindingVersion}:${value.source_ref ?? value.sourceRef}:${value.source_version ?? value.sourceVersion}`
const visibleScopeKey = (value) => `${value.project_id ?? value.projectId}:${value.role}:${value.binding_version ?? value.bindingVersion}`

function materializeSource(value) {
  const source = ownDataRecord(value, SOURCE_FIELDS, SOURCE_FIELDS, 'configuration_invalid')
  if (!safeId(source.project_id) || !ROLES.has(source.role) || !positiveInteger(source.binding_version) ||
      !safePrivateRef(source.source_ref) || !positiveInteger(source.source_version) ||
      !positiveInteger(source.key_version) || !validatePublicKey(source.public_key) ||
      !REGISTRATION_STATUS.has(source.status)) fail('configuration_invalid')
  return {
    projectId: source.project_id,
    role: source.role,
    bindingVersion: source.binding_version,
    sourceRef: source.source_ref,
    sourceVersion: source.source_version,
    keyVersion: source.key_version,
    publicKey: source.public_key,
    status: source.status,
    keyStatus: source.status,
    needsResync: false,
  }
}

function materializeStringArray(value) {
  const result = ownDataArray(value, (item) => {
    if (!safeId(item)) fail('configuration_invalid')
    return item
  })
  if (result.length === 0 || new Set(result).size !== result.length) fail('configuration_invalid')
  return result
}

function materializeViewer(value) {
  const viewer = ownDataRecord(value, VIEWER_FIELDS, VIEWER_FIELDS, 'configuration_invalid')
  if (!safePrivateRef(viewer.viewer_ref) || !VIEWER_CLASSES.has(viewer.viewer_class) || !REGISTRATION_STATUS.has(viewer.status)) fail('configuration_invalid')
  return {
    viewerRef: viewer.viewer_ref,
    viewerClass: viewer.viewer_class,
    projectIds: materializeStringArray(viewer.project_ids),
    status: viewer.status,
  }
}

function stateClone(state) {
  return {
    enabled: state.enabled,
    disabledRevision: state.disabledRevision,
    registryRevision: state.registryRevision,
    ledgerRevision: state.ledgerRevision,
    sources: new Map([...state.sources].map(([key, value]) => [key, { ...value }])),
    viewers: new Map([...state.viewers].map(([key, value]) => [key, { ...value, projectIds: [...value.projectIds] }])),
    records: new Map([...state.records].map(([key, value]) => [key, {
      ...value,
      event: value.event ? { ...value.event } : null,
    }])),
    ledger: state.ledger.map((entry) => ({ ...entry, event: entry.event ? { ...entry.event } : undefined })),
    audit: state.audit.map((entry) => ({ ...entry })),
  }
}

export function createPhase3ObserverBridge(options) {
  let config
  let sources
  let viewers
  try {
    config = ownDataRecord(options, CONFIG_FIELDS, new Set(['sources', 'viewers', 'freshness_ms']), 'configuration_invalid')
    sources = ownDataArray(config.sources, materializeSource)
    viewers = ownDataArray(config.viewers, materializeViewer)
  } catch { fail('configuration_invalid') }
  if (sources.length === 0 || viewers.length !== 2 || !positiveInteger(config.freshness_ms)) fail('configuration_invalid')
  if (!sources.some((source) => source.status === 'active')) fail('configuration_invalid')
  if (new Set(viewers.map((viewer) => viewer.viewerClass)).size !== 2 || !viewers.some((viewer) => viewer.viewerClass === 'workstation') || !viewers.some((viewer) => viewer.viewerClass === 'remote_device')) fail('configuration_invalid')
  if (new Set(viewers.map((viewer) => viewer.viewerRef)).size !== viewers.length) fail('configuration_invalid')
  if (new Set(sources.map(sourceKey)).size !== sources.length) fail('configuration_invalid')
  if (new Set(sources.filter((source) => source.status === 'active').map(visibleScopeKey)).size !== sources.filter((source) => source.status === 'active').length) fail('configuration_invalid')
  const registeredProjects = new Set(sources.map((source) => source.projectId))
  if (viewers.some((viewer) => viewer.projectIds.some((projectId) => !registeredProjects.has(projectId)))) fail('configuration_invalid')
  const viewerProjectContract = [...viewers[0].projectIds].sort().join(':')
  if (viewers.some((viewer) => [...viewer.projectIds].sort().join(':') !== viewerProjectContract)) fail('configuration_invalid')
  for (let left = 0; left < sources.length; left += 1) {
    for (let right = left + 1; right < sources.length; right += 1) {
      try { if (sources[left].publicKey.equals(sources[right].publicKey)) fail('configuration_invalid') } catch (error) { if (error instanceof ObserverBridgeError) throw error; fail('configuration_invalid') }
    }
  }
  const now = config.now ?? Date.now
  const verifySignature = config.verify_signature ?? ((publicKey, bytes, signature) => nodeVerify(null, bytes, publicKey, signature))
  const digest = config.digest ?? ((bytes) => createHash('sha256').update(bytes).digest('hex'))
  const clone = config.clone ?? structuredClone
  if (typeof now !== 'function' || isProxy(now) || typeof verifySignature !== 'function' || isProxy(verifySignature) ||
      typeof digest !== 'function' || isProxy(digest) || typeof clone !== 'function' || isProxy(clone) ||
      (config.enabled !== undefined && typeof config.enabled !== 'boolean')) fail('configuration_invalid')

  let state = {
    enabled: config.enabled ?? true,
    disabledRevision: null,
    registryRevision: 1,
    ledgerRevision: 0,
    sources: new Map(sources.map((source) => [sourceKey(source), source])),
    viewers: new Map(viewers.map((viewer) => [viewer.viewerRef, viewer])),
    records: new Map(),
    ledger: [],
    audit: [],
  }
  let mutating = false
  let reentryAttempted = false
  let lastClock = null
  let operationClockRead = false
  let operationClock = null

  const readClock = () => {
    if (operationClockRead) return operationClock
    let value
    try { value = now() } catch { fail('clock_unavailable') }
    if (reentryAttempted) fail('reentrant_mutation')
    if (typeof value !== 'number' || !Number.isFinite(value)) fail('clock_unavailable')
    try { new Date(value).toISOString() } catch { fail('clock_unavailable') }
    if (lastClock !== null && value < lastClock) fail('clock_unavailable')
    operationClockRead = true
    operationClock = value
    return value
  }

  const materializeResponse = (value) => {
    freezeResponseGraph(value)
    let result
    try { result = clone(value) } catch { fail('materialization_failed') }
    if (reentryAttempted) fail('reentrant_mutation')
    assertExactIndependentClone(value, result)
    return result
  }

  const transact = (operation) => {
    if (mutating) {
      reentryAttempted = true
      fail('reentrant_mutation')
    }
    mutating = true
    reentryAttempted = false
    operationClockRead = false
    operationClock = null
    try {
      const draft = stateClone(state)
      const outcome = operation(draft)
      if (reentryAttempted) fail('reentrant_mutation')
      const response = materializeResponse(outcome.response)
      if (reentryAttempted) fail('reentrant_mutation')
      if (outcome.commit) state = draft
      if (operationClockRead) lastClock = operationClock
      return response
    } finally {
      reentryAttempted = false
      mutating = false
      operationClockRead = false
      operationClock = null
    }
  }

  const appendAudit = (draft, revision, action, reasonCode) => {
    draft.audit.push(Object.freeze({ action, reason_code: reasonCode, ledger_revision: revision }))
  }

  const commitRevision = (draft, action, reasonCode) => {
    draft.ledgerRevision += 1
    appendAudit(draft, draft.ledgerRevision, action, reasonCode)
    return draft.ledgerRevision
  }

  const validateEvent = (input, draft, clock) => {
    const event = ownDataRecord(input, new Set(EVENT_FIELDS), new Set(EVENT_FIELDS))
    const unsigned = {}
    for (const field of SIGNED_FIELDS) unsigned[field] = event[field]
    canonicalUnsigned(unsigned)
    const signature = canonicalSignature(event.signature)
    if (!signature) fail('input_invalid')
    if (!draft.enabled) fail('bridge_disabled')
    const source = draft.sources.get(sourceKey({
      project_id: event.project_id,
      role: event.role,
      binding_version: event.binding_version,
      source_ref: event.source_ref,
      source_version: event.source_version,
    }))
    if (!source || source.status !== 'active' || source.keyStatus !== 'active' || source.keyVersion !== event.key_version) fail('scope_denied')
    const observed = Date.parse(event.observed_at)
    const expires = Date.parse(event.expires_at)
    if (expires - observed > config.freshness_ms || observed > clock + FUTURE_TOLERANCE_MS) fail('timestamp_invalid')
    if (expires < clock || clock - observed > config.freshness_ms) fail('expired')
    const bytes = canonicalObserverBridgeBytes(unsigned)
    let verified
    try { verified = verifySignature(source.publicKey, bytes, signature) } catch { fail('crypto_unavailable') }
    if (reentryAttempted) fail('reentrant_mutation')
    if (typeof verified !== 'boolean') fail('crypto_unavailable')
    if (!verified) fail('signature_invalid')
    let eventDigest
    try { eventDigest = digest(bytes) } catch { fail('crypto_unavailable') }
    if (reentryAttempted) fail('reentrant_mutation')
    if (typeof eventDigest !== 'string' || !HEX_256.test(eventDigest)) fail('crypto_unavailable')
    return { event: { ...unsigned, signature: event.signature }, source, digest: eventDigest }
  }

  const recordKey = (event) => sourceKey(event)

  const acceptEvent = (draft, checked, action = 'ingest', reason = 'accepted') => {
    const key = recordKey(checked.event)
    const prior = draft.records.get(key)
    const revision = commitRevision(draft, action, reason)
    draft.records.set(key, {
      event: { ...checked.event },
      digest: checked.digest,
      condition: 'valid',
      acceptedCount: (prior?.acceptedCount ?? 0) + 1,
      conflictCount: prior?.conflictCount ?? 0,
      acceptedRevision: revision,
    })
    draft.ledger.push({ revision, type: 'accepted', event: { ...checked.event }, digest: checked.digest })
    return revision
  }

  const authorizeViewer = (input, draft) => {
    let value
    try { value = ownDataRecord(input, VIEWER_INPUT_FIELDS, VIEWER_INPUT_FIELDS, 'access_denied') } catch { fail('access_denied') }
    if (!safePrivateRef(value.viewer_ref) || !VIEWER_CLASSES.has(value.viewer_class) || !safeId(value.project_id)) fail('access_denied')
    const viewer = draft.viewers.get(value.viewer_ref)
    if (!viewer || viewer.status !== 'active' || viewer.viewerClass !== value.viewer_class || !viewer.projectIds.includes(value.project_id)) fail('access_denied')
    return { viewer, projectId: value.project_id }
  }

  const projectionFor = (draft, source, clock) => {
    const record = draft.records.get(sourceKey(source))
    let freshness = 'unknown'
    let observedClass = 'unavailable'
    let statusCode = null
    if (record?.condition === 'unknown' || source.needsResync) {
      freshness = 'unknown'
    } else if (source.status !== 'active' || source.keyStatus !== 'active') {
      freshness = 'offline'
    } else if (record?.condition === 'conflicting') {
      freshness = 'conflicting'
    } else if (record?.event) {
      const age = clock - Date.parse(record.event.observed_at)
      const expired = clock > Date.parse(record.event.expires_at) || age > config.freshness_ms
      if (age > config.freshness_ms * 2) freshness = 'offline'
      else if (expired) freshness = 'stale'
      else freshness = 'fresh'
      observedClass = freshness === 'fresh' ? 'current' : 'expired'
      if (freshness === 'fresh') statusCode = record.event.status_code
    }
    return {
      project_id: source.projectId,
      role: source.role,
      binding_version: source.bindingVersion,
      status_code: statusCode,
      freshness_class: freshness,
      observed_time_class: observedClass,
      ledger_revision: draft.ledgerRevision,
      accepted_count: record?.acceptedCount ?? 0,
      conflict_count: record?.conflictCount ?? 0,
    }
  }

  const scopeInputFields = new Set(['project_id', 'role', 'binding_version', 'source_ref', 'source_version', 'expected_registry_revision'])
  const keyScopeInputFields = new Set([...scopeInputFields, 'expected_key_version'])
  const resolveOperationSource = (input, draft, fields = scopeInputFields) => {
    const value = ownDataRecord(input, fields, fields)
    if (!safeId(value.project_id) || !ROLES.has(value.role) || !positiveInteger(value.binding_version) ||
        !safePrivateRef(value.source_ref) || !positiveInteger(value.source_version) || !positiveInteger(value.expected_registry_revision)) fail('input_invalid')
    if (value.expected_registry_revision !== draft.registryRevision) fail('cas_mismatch')
    const source = draft.sources.get(sourceKey(value))
    if (!source || source.status !== 'active') fail('scope_denied')
    if (fields.has('expected_key_version') && (!positiveInteger(value.expected_key_version) || value.expected_key_version !== source.keyVersion)) fail('cas_mismatch')
    return { value, source }
  }

  const ensureWritable = (draft) => { if (!draft.enabled) fail('bridge_disabled') }

  return Object.freeze({
    ingest(input) {
      return transact((draft) => {
        const eventPreview = ownDataRecord(input, new Set(EVENT_FIELDS), new Set(EVENT_FIELDS))
        const clock = readClock()
        const checked = validateEvent(eventPreview, draft, clock)
        const key = recordKey(checked.event)
        const prior = draft.records.get(key)
        if (!prior) {
          const revision = acceptEvent(draft, checked)
          return { commit: true, response: { status: 'accepted', ledger_revision: revision } }
        }
        if (prior.condition !== 'valid' || checked.source.needsResync) fail('resync_required')
        if (checked.event.sequence === prior.event.sequence && checked.digest === prior.digest) {
          return { commit: false, response: { status: 'duplicate', ledger_revision: draft.ledgerRevision } }
        }
        if (checked.event.sequence < prior.event.sequence) fail('out_of_order')
        if (checked.event.sequence === prior.event.sequence || checked.event.sequence > prior.event.sequence + 1) {
          const reasonCode = checked.event.sequence === prior.event.sequence ? 'duplicate_conflict' : 'sequence_gap'
          const revision = commitRevision(draft, 'quarantine', reasonCode)
          prior.condition = 'conflicting'
          prior.conflictCount += 1
          draft.ledger.push({ revision, type: 'quarantine', reason_code: reasonCode })
          return { commit: true, response: { status: 'conflict', reason_code: reasonCode, ledger_revision: revision } }
        }
        const revision = acceptEvent(draft, checked)
        return { commit: true, response: { status: 'accepted', ledger_revision: revision } }
      })
    },

    resync(input) {
      return transact((draft) => {
        ensureWritable(draft)
        const value = ownDataRecord(input, new Set(['expected_ledger_revision', 'expected_last_sequence', 'event']), new Set(['expected_ledger_revision', 'expected_last_sequence', 'event']))
        if (!nonNegativeInteger(value.expected_ledger_revision) || !positiveInteger(value.expected_last_sequence)) fail('input_invalid')
        if (value.expected_ledger_revision !== draft.ledgerRevision) fail('cas_mismatch')
        const clock = readClock()
        const checked = validateEvent(value.event, draft, clock)
        const prior = draft.records.get(recordKey(checked.event))
        if (!prior?.event || (prior.condition !== 'conflicting' && !checked.source.needsResync)) fail('resync_required')
        if (prior.event.sequence !== value.expected_last_sequence || checked.event.sequence <= value.expected_last_sequence) fail('cas_mismatch')
        checked.source.needsResync = false
        const revision = acceptEvent(draft, checked, 'resync', 'baseline_resynced')
        return { commit: true, response: { status: 'resynced', ledger_revision: revision } }
      })
    },

    read(input) {
      return transact((draft) => {
        const authorized = authorizeViewer(input, draft)
        const clock = readClock()
        const projections = [...draft.sources.values()]
          .filter((source) => source.projectId === authorized.projectId)
          .map((source) => projectionFor(draft, source, clock))
          .sort((left, right) => left.role.localeCompare(right.role) || left.binding_version - right.binding_version)
        return { commit: false, response: { status: 'ok', ledger_revision: draft.ledgerRevision, projections } }
      })
    },

    audit(input) {
      return transact((draft) => {
        authorizeViewer(input, draft)
        return { commit: false, response: { status: 'ok', ledger_revision: draft.ledgerRevision, entries: draft.audit.map((entry) => ({ ...entry })) } }
      })
    },

    revokeSource(input) {
      return transact((draft) => {
        ensureWritable(draft)
        const { source } = resolveOperationSource(input, draft)
        source.status = 'revoked'
        source.keyStatus = 'revoked'
        draft.registryRevision += 1
        const revision = commitRevision(draft, 'revoke_source', 'source_revoked')
        return { commit: true, response: { status: 'source_revoked', ledger_revision: revision, registry_revision: draft.registryRevision } }
      })
    },

    revokeKey(input) {
      return transact((draft) => {
        ensureWritable(draft)
        const { source } = resolveOperationSource(input, draft, keyScopeInputFields)
        if (source.keyStatus !== 'active') fail('scope_denied')
        source.keyStatus = 'revoked'
        source.needsResync = true
        draft.registryRevision += 1
        const revision = commitRevision(draft, 'revoke_key', 'key_revoked')
        return { commit: true, response: { status: 'key_revoked', ledger_revision: revision, registry_revision: draft.registryRevision } }
      })
    },

    rotateKey(input) {
      return transact((draft) => {
        ensureWritable(draft)
        const fields = new Set([...keyScopeInputFields, 'new_key_version', 'new_public_key'])
        const value = ownDataRecord(input, fields, fields)
        const { source } = resolveOperationSource(value, draft, fields)
        if (source.keyStatus !== 'active' || !positiveInteger(value.new_key_version) || value.new_key_version <= source.keyVersion || !validatePublicKey(value.new_public_key)) fail('input_invalid')
        try {
          if (source.publicKey.equals(value.new_public_key) || [...draft.sources.values()].some((candidate) => candidate !== source && candidate.publicKey.equals(value.new_public_key))) fail('input_invalid')
        } catch (error) {
          if (error instanceof ObserverBridgeError) throw error
          fail('crypto_unavailable')
        }
        source.keyVersion = value.new_key_version
        source.publicKey = value.new_public_key
        source.keyStatus = 'active'
        source.needsResync = true
        draft.registryRevision += 1
        const revision = commitRevision(draft, 'rotate_key', 'key_rotated')
        return { commit: true, response: { status: 'key_rotated', ledger_revision: revision, registry_revision: draft.registryRevision } }
      })
    },

    disable(input) {
      return transact((draft) => {
        const value = ownDataRecord(input, new Set(['expected_ledger_revision']), new Set(['expected_ledger_revision']))
        if (!nonNegativeInteger(value.expected_ledger_revision)) fail('input_invalid')
        if (!draft.enabled) fail('bridge_disabled')
        if (value.expected_ledger_revision !== draft.ledgerRevision) fail('cas_mismatch')
        draft.enabled = false
        const revision = commitRevision(draft, 'disable', 'bridge_disabled')
        draft.disabledRevision = revision
        return { commit: true, response: { status: 'disabled', ledger_revision: revision } }
      })
    },

    restore(input) {
      return transact((draft) => {
        const value = ownDataRecord(input, new Set(['expected_disabled_revision', 'expected_registry_revision']), new Set(['expected_disabled_revision', 'expected_registry_revision']))
        if (!nonNegativeInteger(value.expected_disabled_revision) || !positiveInteger(value.expected_registry_revision)) fail('input_invalid')
        if (draft.enabled || value.expected_disabled_revision !== draft.disabledRevision || value.expected_registry_revision !== draft.registryRevision) fail('cas_mismatch')
        draft.enabled = true
        draft.disabledRevision = null
        const revision = commitRevision(draft, 'restore', 'exact_revision_restored')
        return { commit: true, response: { status: 'restored', ledger_revision: revision } }
      })
    },

    tombstone(input) {
      return transact((draft) => {
        const value = ownDataRecord(input, new Set(['expected_ledger_revision']), new Set(['expected_ledger_revision']))
        if (!nonNegativeInteger(value.expected_ledger_revision)) fail('input_invalid')
        if (value.expected_ledger_revision !== draft.ledgerRevision) fail('cas_mismatch')
        for (const record of draft.records.values()) {
          record.event = null
          record.digest = null
          record.condition = 'unknown'
        }
        draft.ledger = draft.ledger.map((entry) => ({ revision: entry.revision, type: 'purged' }))
        const revision = commitRevision(draft, 'tombstone', 'private_material_deleted')
        draft.ledger.push({ revision, type: 'tombstone' })
        return { commit: true, response: { status: 'tombstoned', ledger_revision: revision } }
      })
    },
  })
}
