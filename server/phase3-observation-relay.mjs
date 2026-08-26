const FUTURE_TOLERANCE_MS = 5_000
const AVAILABILITY = new Set(['available', 'idle', 'offline', 'unknown'])
const EVENT_KEYS = new Set(['project_id', 'role', 'binding_version', 'source_host', 'sequence', 'observed_at', 'availability', 'now_summary'])
const CONFIG_KEYS = new Set(['project_ids', 'roles', 'binding_versions', 'source_hosts', 'freshness_ms', 'registry_revision', 'now', 'enabled'])
const AUTHORIZED_SOURCE_HOSTS = new Set(['source-a', 'source-b'])
const NOW_STATES = new Set([
  '작업 준비 중',
  '구현 진행 중',
  '테스트 실행 중',
  '검수 진행 중',
  '결과 정리 중',
  '응답 대기 중',
])
const SAFE_ID = /^[a-z][a-z0-9-]{0,63}$/

export class Phase3ObservationError extends Error {
  constructor(code) {
    super(code)
    this.name = 'Phase3ObservationError'
    this.code = code
  }
}

const fail = (code) => { throw new Phase3ObservationError(code) }
const isPlainRecord = (value) => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  try { const prototype = Object.getPrototypeOf(value); return prototype === Object.prototype || prototype === null } catch { return false }
}
const safeString = (value, pattern = SAFE_ID) => typeof value === 'string' && pattern.test(value)
const positiveInteger = (value) => typeof value === 'number' && Number.isSafeInteger(value) && value > 0
const nonNegativeInteger = (value) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
const exactKeys = (value, allowed) => {
  try { return Object.keys(value).every((key) => allowed.has(key)) } catch { return false }
}
const dataRecord = (value, allowed) => {
  if (!isPlainRecord(value)) fail('input_invalid')
  try {
    const keys = Reflect.ownKeys(value)
    if (keys.some((key) => typeof key !== 'string' || !allowed.has(key))) fail('input_invalid')
    const descriptors = Object.getOwnPropertyDescriptors(value)
    const record = {}
    for (const key of keys) {
      const descriptor = descriptors[key]
      if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) fail('input_invalid')
      record[key] = descriptor.value
    }
    return record
  } catch (error) {
    if (error instanceof Phase3ObservationError) throw error
    fail('input_invalid')
  }
}
const canonicalIso = (value) => {
  if (typeof value !== 'string') return false
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value
}
const safeSummary = (value, availability) => value === null || (
  availability === 'available' && typeof value === 'string' && NOW_STATES.has(value)
)
const materialize = (value) => {
  try { return structuredClone(value) } catch { fail('materialization_failed') }
}
const stateClone = (state) => ({
  enabled: state.enabled,
  registryRevision: state.registryRevision,
  records: new Map([...state.records].map(([key, value]) => [key, { event: { ...value.event }, condition: value.condition }])),
  evidence: state.evidence.map((item) => ({ ...item })),
})
const eventKey = (value) => `${value.project_id}:${value.role}:${value.binding_version}:${value.source_host}`
const eventEqual = (left, right) => EVENT_KEYS.size === Object.keys(left).length && [...EVENT_KEYS].every((key) => left[key] === right[key])
const safeScope = (value) => `${value.project_id}:${value.role}:v${value.binding_version}:${value.source_host}`

function validateList(value, itemValidator) {
  if (!Array.isArray(value) || value.length === 0 || !value.every(itemValidator)) fail('configuration_invalid')
  if (new Set(value).size !== value.length) fail('configuration_invalid')
  return [...value]
}

function validateEvent(input, allowed) {
  const inputRecord = dataRecord(input, EVENT_KEYS)
  const value = {
    project_id: inputRecord.project_id, role: inputRecord.role, binding_version: inputRecord.binding_version,
    source_host: inputRecord.source_host, sequence: inputRecord.sequence, observed_at: inputRecord.observed_at,
    availability: inputRecord.availability, now_summary: inputRecord.now_summary,
  }
  if (!safeString(value.project_id) || !safeString(value.role) || !positiveInteger(value.binding_version) ||
      !safeString(value.source_host, /^source-[a-z0-9]+$/) || !positiveInteger(value.sequence) ||
      typeof value.availability !== 'string' || !AVAILABILITY.has(value.availability)) fail('input_invalid')
  if (!allowed.projects.has(value.project_id) || !allowed.roles.has(value.role) || !allowed.bindingVersions.has(value.binding_version) || !allowed.sourceHosts.has(value.source_host)) fail('scope_not_allowed')
  if (!canonicalIso(value.observed_at)) fail('timestamp_invalid')
  if (!safeSummary(value.now_summary, value.availability)) fail('summary_prohibited')
  return value
}

export function createPhase3ObservationRelay(options) {
  if (!isPlainRecord(options) || !exactKeys(options, CONFIG_KEYS)) fail('configuration_invalid')
  let projectIds, roles, bindingVersions, sourceHosts, freshnessMs, registryRevision, now, enabled
  try {
    projectIds = validateList(options.project_ids, (value) => safeString(value))
    roles = validateList(options.roles, (value) => safeString(value))
    bindingVersions = validateList(options.binding_versions, positiveInteger)
    sourceHosts = validateList(options.source_hosts, (value) => safeString(value, /^source-[a-z0-9]+$/))
    freshnessMs = options.freshness_ms
    registryRevision = options.registry_revision
    now = options.now
    enabled = options.enabled
  } catch (error) {
    if (error instanceof Phase3ObservationError) throw error
    fail('configuration_invalid')
  }
  if (!positiveInteger(freshnessMs) || !positiveInteger(registryRevision) || typeof now !== 'function' || typeof enabled !== 'boolean') fail('configuration_invalid')
  if (sourceHosts.length !== AUTHORIZED_SOURCE_HOSTS.size || !sourceHosts.every((value) => AUTHORIZED_SOURCE_HOSTS.has(value))) fail('configuration_invalid')

  const allowed = {
    projects: new Set(projectIds), roles: new Set(roles), bindingVersions: new Set(bindingVersions), sourceHosts: new Set(sourceHosts),
  }
  let state = { enabled, registryRevision, records: new Map(), evidence: [] }
  let mutating = false
  let reentryAttempted = false

  const safeNow = () => {
    try {
      const value = now()
      if (typeof value !== 'number' || !Number.isFinite(value)) fail('clock_unavailable')
      new Date(value).toISOString()
      return value
    } catch (error) {
      if (error instanceof Phase3ObservationError) throw error
      fail('clock_unavailable')
    }
  }
  const projectionFor = (record, clock) => {
    const { event, condition } = record
    const unavailable = condition === 'conflicting' || condition === 'offline' || event.availability !== 'available'
    const stale = clock - Date.parse(event.observed_at) > freshnessMs
    const availability = condition === 'valid' ? event.availability : condition
    const freshnessClass = unavailable ? 'unavailable' : stale ? 'stale' : 'fresh'
    return {
      project_id: event.project_id, role: event.role, binding_version: event.binding_version,
      source_host: event.source_host, sequence: event.sequence, availability,
      freshness_class: freshnessClass, observed_at: event.observed_at,
      now_summary: !unavailable && !stale ? event.now_summary : null,
    }
  }
  const publicState = (candidate, clock) => ({
    enabled: candidate.enabled,
    registry_revision: candidate.registryRevision,
    projections: [...candidate.records.values()].map((record) => projectionFor(record, clock)),
    evidence: candidate.evidence.map((item) => ({ ...item })),
  })
  const addEvidence = (draft, clock, { action, scope = 'relay', before = null, after = null, reason }) => {
    draft.evidence.push({
      evidence_id: draft.evidence.length + 1, action, scope, before_sequence: before,
      after_sequence: after, reason_code: reason, recorded_at: new Date(clock).toISOString(),
    })
  }
  const mutate = (operation) => {
    if (mutating) { reentryAttempted = true; fail('reentrant_mutation') }
    mutating = true
    reentryAttempted = false
    try {
      const clock = safeNow()
      const draft = stateClone(state)
      const outcome = operation(draft, clock)
      if (reentryAttempted) fail('reentrant_mutation')
      const response = materialize(outcome.response)
      if (reentryAttempted) fail('reentrant_mutation')
      if (outcome.commit) state = draft
      return response
    } finally { reentryAttempted = false; mutating = false }
  }
  const validateClockBoundary = (value, clock) => {
    if (Date.parse(value.observed_at) > clock + FUTURE_TOLERANCE_MS) fail('timestamp_invalid')
  }
  const acceptBaseline = (draft, value, clock, action, reason, before = null) => {
    draft.records.set(eventKey(value), { event: { ...value }, condition: 'valid' })
    addEvidence(draft, clock, { action, scope: safeScope(value), before, after: value.sequence, reason })
    return projectionFor(draft.records.get(eventKey(value)), clock)
  }

  return Object.freeze({
    ingest(input) {
      return mutate((draft, clock) => {
        const value = validateEvent(input, allowed)
        if (!draft.enabled) fail('relay_disabled')
        validateClockBoundary(value, clock)
        const key = eventKey(value)
        const prior = draft.records.get(key)
        if (!prior) return { commit: true, response: { status: 'accepted', projection: acceptBaseline(draft, value, clock, 'ingest', 'accepted') } }
        const priorSequence = prior.event.sequence
        if (value.sequence === priorSequence && eventEqual(value, prior.event)) return { commit: false, response: { status: 'duplicate', projection: projectionFor(prior, clock) } }
        if (prior.condition !== 'valid') {
          addEvidence(draft, clock, { action: 'conflict', scope: safeScope(prior.event), before: priorSequence, after: value.sequence, reason: 'resync_required' })
          return { commit: true, response: { status: 'conflict', projection: projectionFor(prior, clock) } }
        }
        let reason = 'sequence_gap'
        if (value.sequence === priorSequence) reason = 'duplicate_conflict'
        else if (value.sequence < priorSequence) reason = 'out_of_order'
        else if (value.sequence === priorSequence + 1) return { commit: true, response: { status: 'accepted', projection: acceptBaseline(draft, value, clock, 'ingest', 'accepted', priorSequence) } }
        prior.condition = 'conflicting'
        addEvidence(draft, clock, { action: 'conflict', scope: safeScope(prior.event), before: priorSequence, after: value.sequence, reason })
        return { commit: true, response: { status: 'conflict', projection: projectionFor(prior, clock) } }
      })
    },
    disconnect(input) {
      return mutate((draft, clock) => {
        const { source_host: sourceHost } = dataRecord(input, new Set(['source_host']))
        if (!safeString(sourceHost, /^source-[a-z0-9]+$/)) fail('input_invalid')
        if (!allowed.sourceHosts.has(sourceHost)) fail('scope_not_allowed')
        if (!draft.enabled) fail('relay_disabled')
        const matches = [...draft.records.values()].filter(({ event: value }) => value.source_host === sourceHost)
        if (matches.length === 0) fail('source_missing')
        for (const record of matches) {
          record.condition = 'offline'
          addEvidence(draft, clock, { action: 'disconnect', scope: safeScope(record.event), before: record.event.sequence, after: record.event.sequence, reason: 'source_disconnected' })
        }
        return { commit: true, response: { status: 'disconnected' } }
      })
    },
    reconnect(input) {
      return mutate((draft, clock) => {
        const inputRecord = dataRecord(input, new Set(['source_host', 'expected_last_sequence', 'event']))
        const sourceHost = inputRecord.source_host
        const expected = inputRecord.expected_last_sequence
        if (!safeString(sourceHost, /^source-[a-z0-9]+$/) || !nonNegativeInteger(expected)) fail('input_invalid')
        const value = validateEvent(inputRecord.event, allowed)
        if (value.source_host !== sourceHost) fail('input_invalid')
        if (!draft.enabled) fail('relay_disabled')
        validateClockBoundary(value, clock)
        const prior = draft.records.get(eventKey(value))
        const priorSequence = prior?.event.sequence ?? 0
        if (priorSequence !== expected || value.sequence <= expected) fail('cas_mismatch')
        const projection = acceptBaseline(draft, value, clock, 'reconnect', 'baseline_resynced', priorSequence)
        return { commit: true, response: { status: 'reconnected', projection } }
      })
    },
    disable(input) {
      if (input !== undefined) fail('input_invalid')
      return mutate((draft, clock) => {
        if (!draft.enabled) return { commit: false, response: { status: 'disabled' } }
        draft.enabled = false
        addEvidence(draft, clock, { action: 'disable', reason: 'relay_disabled' })
        return { commit: true, response: { status: 'disabled' } }
      })
    },
    restore(input) {
      return mutate((draft, clock) => {
        const { registry_revision: revision } = dataRecord(input, new Set(['registry_revision']))
        if (!positiveInteger(revision)) fail('input_invalid')
        if (draft.enabled) fail('relay_enabled')
        if (revision !== draft.registryRevision) fail('cas_mismatch')
        draft.enabled = true
        addEvidence(draft, clock, { action: 'restore', reason: 'registry_revision_matched' })
        return { commit: true, response: { status: 'restored' } }
      })
    },
    read() {
      return materialize(publicState(state, safeNow()))
    },
  })
}
