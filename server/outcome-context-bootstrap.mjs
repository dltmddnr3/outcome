import { createHash } from 'node:crypto'
import { isProxy } from 'node:util/types'

const SHA256 = /^[a-f0-9]{64}$/
const SAFE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const PLAIN = Object.getPrototypeOf({})
const DEFAULT_EXCLUSIONS = Object.freeze(['historical_gate_families', 'correction_chains', 'raw_conversation', 'roadmap_2', 'unrelated_skills'])

const rejectProxyTree = (value, seen = new WeakSet()) => {
  if (value === null || typeof value !== 'object') return
  if (isProxy(value)) throw new Error('proxy_forbidden')
  if (seen.has(value)) return
  seen.add(value)
  for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(value))) {
    if (!Object.hasOwn(descriptor, 'value')) throw new Error('accessor_forbidden')
    rejectProxyTree(descriptor.value, seen)
  }
}
const record = (value, code = 'invalid_bootstrap_shape') => {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== PLAIN) throw new Error(code)
  return value
}
const exact = (value, keys, code = 'invalid_bootstrap_shape') => {
  record(value, code)
  const actual = Object.keys(value)
  if (actual.length !== keys.length || actual.some((key) => !keys.includes(key))) throw new Error(code)
  return value
}
const array = (value, code = 'invalid_bootstrap_shape') => {
  if (!Array.isArray(value) || Object.keys(value).length !== value.length) throw new Error(code)
  return value
}
const safeId = (value, code = 'invalid_bootstrap_id') => {
  if (typeof value !== 'string' || !SAFE_ID.test(value)) throw new Error(code)
  return value
}
const safeRef = (value) => {
  if (typeof value !== 'string' || !value || value.startsWith('/') || value.includes('..') || /(?:ROADMAP 2|thread|session|task|turn)[_-]?id/i.test(value)) throw new Error('invalid_source_ref')
  return value
}
const stable = (value) => Array.isArray(value) ? `[${value.map(stable).join(',')}]` : value && typeof value === 'object' ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}` : JSON.stringify(value)
const freeze = (value) => {
  if (value && typeof value === 'object') { for (const item of Object.values(value)) freeze(item); Object.freeze(value) }
  return value
}
const digestMap = (value) => {
  record(value, 'invalid_source_digests')
  const entries = Object.entries(value).sort(([left], [right]) => left.localeCompare(right))
  if (!entries.length || entries.some(([key, digest]) => !SAFE_ID.test(key) || !SHA256.test(digest))) throw new Error('invalid_source_digests')
  return Object.fromEntries(entries)
}
const projectionView = (projection) => {
  exact(projection, ['primary_destination', 'progress', 'ready_frontier', 'next_action', 'cherry_action'])
  exact(projection.progress, ['closed', 'total'])
  if (!Number.isInteger(projection.progress.closed) || !Number.isInteger(projection.progress.total) || projection.progress.closed < 0 || projection.progress.closed > projection.progress.total) throw new Error('invalid_acceptance_gap')
  return {
    primary_destination: projection.primary_destination === null ? null : safeId(projection.primary_destination),
    acceptance_gap: { remaining: projection.progress.total - projection.progress.closed, closed: projection.progress.closed, total: projection.progress.total },
    ready_frontier: array(projection.ready_frontier).map((item) => safeId(item)),
    next_action: projection.next_action === null ? null : safeId(projection.next_action),
    cherry_action: projection.cherry_action === null ? null : safeId(projection.cherry_action),
  }
}

export function compileOutcomeContextBootstrap(value) {
  rejectProxyTree(value)
  exact(value, ['source_digests', 'destination_version', 'projection', 'active_work', 'current_gate_ref', 'current_handoff_ref'])
  const projection = projectionView(value.projection)
  const activeWork = value.active_work === null ? null : (() => { exact(value.active_work, ['work_id', 'state']); return { work_id: safeId(value.active_work.work_id), state: safeId(value.active_work.state) } })()
  const content = {
    schema_version: 1,
    source_digests: digestMap(value.source_digests),
    destination_version: safeId(value.destination_version),
    primary_destination: projection.primary_destination,
    acceptance_gap: projection.acceptance_gap,
    ready_frontier: projection.ready_frontier,
    active_work: activeWork,
    next_action: projection.next_action,
    cherry_action: projection.cherry_action,
    current_gate_ref: safeRef(value.current_gate_ref),
    current_handoff_ref: safeRef(value.current_handoff_ref),
  }
  return freeze({ ...content, snapshot_digest: createHash('sha256').update(stable(content)).digest('hex') })
}

export function validateOutcomeContextBootstrap(snapshot, expectedSourceDigests) {
  rejectProxyTree(snapshot); rejectProxyTree(expectedSourceDigests)
  exact(snapshot, ['schema_version', 'source_digests', 'destination_version', 'primary_destination', 'acceptance_gap', 'ready_frontier', 'active_work', 'next_action', 'cherry_action', 'current_gate_ref', 'current_handoff_ref', 'snapshot_digest'])
  if (snapshot.schema_version !== 1 || !SHA256.test(snapshot.snapshot_digest)) throw new Error('invalid_bootstrap_snapshot')
  const recompiled = compileOutcomeContextBootstrap({
    source_digests: snapshot.source_digests,
    destination_version: snapshot.destination_version,
    projection: { primary_destination: snapshot.primary_destination, progress: { closed: snapshot.acceptance_gap.closed, total: snapshot.acceptance_gap.total }, ready_frontier: snapshot.ready_frontier, next_action: snapshot.next_action, cherry_action: snapshot.cherry_action },
    active_work: snapshot.active_work,
    current_gate_ref: snapshot.current_gate_ref,
    current_handoff_ref: snapshot.current_handoff_ref,
  })
  const expected = digestMap(expectedSourceDigests)
  if (recompiled.snapshot_digest !== snapshot.snapshot_digest || JSON.stringify(recompiled.source_digests) !== JSON.stringify(expected)) return freeze({ outcome: 'cold_compile_required', reason: 'source_digest_drift', automatic_retry_count: 0 })
  return freeze({ outcome: 'ready', snapshot_digest: snapshot.snapshot_digest, automatic_retry_count: 0 })
}

export function selectOutcomeBootstrapContext(snapshot, value) {
  rejectProxyTree(snapshot); rejectProxyTree(value)
  exact(value, ['role_skill', 'expansions'])
  const roleSkill = safeId(value.role_skill)
  const expansions = array(value.expansions, 'invalid_expansions').map((entry) => {
    exact(entry, ['source_ref', 'reason', 'source_digest', 'work_id'], 'invalid_expansion')
    if (!SHA256.test(entry.source_digest)) throw new Error('invalid_expansion')
    return { source_ref: safeRef(entry.source_ref), reason: safeId(entry.reason), source_digest: entry.source_digest, work_id: safeId(entry.work_id) }
  })
  const loaded = ['AGENTS.md', 'active-bootstrap-snapshot', snapshot.current_gate_ref, ...(snapshot.active_work ? [snapshot.current_handoff_ref] : []), 'skill:karpathy-guidelines', 'skill:unlazy', `skill:${roleSkill}`, ...expansions.map((entry) => entry.source_ref)]
  return freeze({ loaded_sources: [...new Set(loaded)], excluded_source_classes: [...DEFAULT_EXCLUSIONS], expansion_count: expansions.length, expansion_reasons: expansions.map(({ reason, work_id }) => ({ reason, work_id })) })
}
