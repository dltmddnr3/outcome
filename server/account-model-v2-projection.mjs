import { createHash } from 'node:crypto'
import { isProxy } from 'node:util/types'
import { projectOutcomeV2, translateV1Package } from './outcome-model-v2.mjs'

export const ACCOUNT_MODEL_V2_STATES = Object.freeze(['loading', 'stale', 'conflict', 'blocked', 'delivery_unknown', 'no_active_work', 'ready'])

const PRIVATE_KEY = /(?:credential|password|secret|token|raw[_-]?(?:prompt|result)|registry|locator|thread|session|turn|provider[_-]?id)/i
const PRIVATE_VALUE = /(?:^|[\s=:])(?:token|secret|password|credential)\s*=|(?:^|\s)(?:\/Users\/|\/private\/|[A-Za-z]:\\)|raw[_-]?(?:prompt|result)|private[_-]?(?:registry|locator)|\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i
const PLAIN = Object.getPrototypeOf({})
const STATE_HINTS = Object.freeze(['loading', 'stale', 'conflict', 'blocked', 'delivery_unknown'])
const ROOT_KEYS = new Set(['project', 'current', 'phases', 'events', 'observedAt', 'bindings', 'connectors', 'errors', 'next', 'now', 'progress', 'sourceFreshness', 'status', ...STATE_HINTS])
const EVENT_TYPES = new Set(['work_observed', 'result_observed', 'boundary_observed'])
const EVENT_STATUSES = new Set(['observed', 'active', 'blocked', 'delivery_unknown', 'failed', 'rejected', 'safe_hold'])

const materialize = (value, seen = new WeakSet()) => {
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'symbol' || typeof value === 'function' || typeof value === 'bigint') throw new Error('account_model_v2_invalid_value')
    if (typeof value === 'string' && PRIVATE_VALUE.test(value)) throw new Error('account_model_v2_private_value')
    return value
  }
  if (isProxy(value)) throw new Error('account_model_v2_proxy_forbidden')
  if (seen.has(value)) throw new Error('account_model_v2_cycle_forbidden')
  seen.add(value)
  const descriptors = Object.getOwnPropertyDescriptors(value)
  if (Object.getOwnPropertySymbols(value).length) throw new Error('account_model_v2_symbol_forbidden')
  if (Array.isArray(value)) {
    if (Object.keys(value).length !== value.length) throw new Error('account_model_v2_array_shape_invalid')
    const output = []
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = descriptors[index]
      if (!descriptor || !Object.hasOwn(descriptor, 'value')) throw new Error('account_model_v2_accessor_forbidden')
      output.push(materialize(descriptor.value, seen))
    }
    seen.delete(value)
    return output
  }
  if (Object.getPrototypeOf(value) !== PLAIN) throw new Error('account_model_v2_record_invalid')
  const output = {}
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) throw new Error('account_model_v2_accessor_forbidden')
    if (PRIVATE_KEY.test(key)) throw new Error('account_model_v2_private_key')
    output[key] = materialize(descriptor.value, seen)
  }
  seen.delete(value)
  return output
}

const safeId = (value) => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) ? value : null
const safeText = (value) => {
  if (typeof value !== 'string' || !value.trim() || PRIVATE_VALUE.test(value)) throw new Error('account_model_v2_public_text_invalid')
  return value.trim()
}

const assertKeys = (value, allowed) => {
  if (Object.keys(value).some((key) => !allowed.has(key))) throw new Error('account_model_v2_unexpected_key')
}

const validateSourceContract = (source) => {
  assertKeys(source, ROOT_KEYS)
  assertKeys(source.project, new Set(['id', 'name', 'outcome', 'acceptanceAuthority']))
  if (source.current !== undefined) assertKeys(source.current, new Set(['phaseId', 'scopeId', 'stageId']))
  if (source.next !== undefined && source.next !== null) assertKeys(source.next, new Set(['phaseId', 'scopeId', 'stageId']))
  if (source.now !== undefined) assertKeys(source.now, new Set(['status', 'activity', 'observedAt', 'source']))
  if (source.progress !== undefined) assertKeys(source.progress, new Set(['available', 'reason']))
  if (source.sourceFreshness !== undefined) assertKeys(source.sourceFreshness, new Set(['state', 'observedAt']))
  for (const event of source.events ?? []) {
    assertKeys(event, new Set(['type', 'summary', 'observedAt', 'status']))
    if (!EVENT_TYPES.has(event.type)) throw new Error('account_model_v2_event_type_invalid')
    if (!EVENT_STATUSES.has(event.status)) throw new Error('account_model_v2_event_status_invalid')
    if (event.status === 'active' && event.type !== 'work_observed') throw new Error('account_model_v2_event_active_invalid')
    if (typeof event.observedAt !== 'string' || !Number.isFinite(Date.parse(event.observedAt))) throw new Error('account_model_v2_event_time_invalid')
    safeText(event.summary)
  }
  for (const binding of source.bindings ?? []) assertKeys(binding, new Set(['role', 'status', 'activity', 'boundAt', 'observedAt', 'freshness', 'historyCount', 'stageId']))
  if (source.connectors !== undefined) {
    assertKeys(source.connectors, new Set(['github']))
    if (source.connectors.github !== undefined) {
      const github = source.connectors.github
      assertKeys(github, new Set(['adopted', 'required', 'state', 'repository', 'remoteName', 'defaultBranch', 'completionAuthority', 'localCandidate', 'published', 'checks', 'release']))
      if (github.localCandidate !== undefined) assertKeys(github.localCandidate, new Set(['state', 'branch', 'ahead', 'behind', 'sync']))
      if (github.published !== undefined) assertKeys(github.published, new Set(['state', 'repository', 'ref', 'detail']))
      if (github.checks !== undefined) assertKeys(github.checks, new Set(['state']))
      if (github.release !== undefined) assertKeys(github.release, new Set(['state']))
    }
  }
  for (const phase of source.phases ?? []) {
    assertKeys(phase, new Set(['id', 'title', 'purpose', 'scopes', 'completion']))
    for (const scope of phase.scopes ?? []) {
      assertKeys(scope, new Set(['id', 'title', 'purpose', 'stages']))
      for (const stage of scope.stages ?? []) {
        assertKeys(stage, new Set(['id', 'title', 'purpose', 'dependsOn', 'gate', 'axes', 'expectedDurationMinutes', 'gatePurpose', 'sourceState', 'state']))
        if (stage.axes !== undefined) assertKeys(stage.axes, new Set(['cherryAcceptance', 'evidence', 'implementation', 'independentQa', 'release', 'test']))
        if (stage.gate !== undefined) {
          assertKeys(stage.gate, new Set(['sourceRef', 'gates', 'available', 'closed', 'groups', 'observedAt', 'total']))
          for (const gate of stage.gate.gates ?? []) assertKeys(gate, new Set(['id', 'title', 'closed', 'evidence', 'groupCode', 'groupLabel', 'proves', 'stageId']))
          for (const group of stage.gate.groups ?? []) assertKeys(group, new Set(['closed', 'code', 'name', 'sourceName', 'total']))
        }
      }
    }
  }
  const requested = STATE_HINTS.filter((key) => {
    if (source[key] !== undefined && typeof source[key] !== 'boolean') throw new Error('account_model_v2_state_invalid')
    return source[key] === true
  })
  if (requested.length > 1) throw new Error('account_model_v2_state_conflict')
  return requested[0] ?? null
}

const stateFor = (projection, requestedState) => {
  if (requestedState !== null) return requestedState
  if (projection.stale) return 'stale'
  if (projection.conflict) return 'conflict'
  if (projection.delivery_unknown_count > 0) return 'delivery_unknown'
  if (projection.next_action || projection.ready_frontier.length) return 'ready'
  if (projection.cherry_action === 'resolve_blocker') return 'blocked'
  return 'no_active_work'
}

export function createAccountModelV2Projection(value, { observedAt } = {}) {
  const source = materialize(value)
  const requestedState = validateSourceContract(source)
  const graph = translateV1Package(source)
  const canonical = JSON.stringify(source)
  const sourceRevision = createHash('sha256').update(canonical).digest('hex')
  const observed = observedAt ?? source.observedAt
  if (typeof observed !== 'string' || !Number.isFinite(Date.parse(observed))) throw new Error('account_model_v2_observed_at_invalid')
  const projection = projectOutcomeV2({ graph, source_revision: sourceRevision, observed_at: observed })
  const destination = graph.destinations.find((row) => row.id === projection.primary_destination) ?? null
  const state = stateFor(projection, requestedState)
  const events = (source.events ?? []).map((event) => Object.freeze({ type: event.type, summary: safeText(event.summary), observedAt: event.observedAt, status: event.status })).sort((left, right) => left.observedAt.localeCompare(right.observedAt) || left.type.localeCompare(right.type) || left.summary.localeCompare(right.summary))
  return Object.freeze({
    schemaVersion: 1,
    modelVersion: 2,
    project: Object.freeze({ id: graph.project.id, label: safeText(graph.project.name) }),
    destination: destination ? Object.freeze({ id: destination.id, label: safeText(destination.title) }) : null,
    remainingAcceptanceGap: Object.freeze({ remaining: projection.progress.total - projection.progress.closed, total: projection.progress.total }),
    now: Object.freeze({ observedAt: projection.observed_at, state }),
    readyBoundary: Object.freeze([...projection.ready_frontier]),
    nextAction: safeId(projection.next_action),
    cherryAction: safeId(projection.cherry_action),
    state,
    events: Object.freeze(events),
  })
}
