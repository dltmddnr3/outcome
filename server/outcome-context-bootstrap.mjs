import { createHash } from 'node:crypto'
import { isProxy } from 'node:util/types'

const SHA256 = /^[a-f0-9]{64}$/
const SAFE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const PRIVATE_ID_CLASS = /(?:^|-)(?:thread|session|task|turn)(?:-id)?(?:-|$)/
const PLAIN = Object.getPrototypeOf({})
const DEFAULT_EXCLUSIONS = Object.freeze(['historical_gate_families', 'correction_chains', 'raw_conversation', 'roadmap_2', 'unrelated_skills'])
const CURRENT_GATE = 'GATES_OUTCOME_MODEL_V2_LOCAL_DEFAULT_AND_SERVICE_PROJECTION.md'
const CURRENT_HANDOFF = 'docs/OUTCOME_MODEL_V2_LOCAL_DEFAULT_CONTEXT_SELECTOR_BOUNDARY_CORRECTION_BUILDER_HANDOFF.md'
const EXPANSION_SOURCES = new Set(['docs/OUTCOME_CONTRACT.md', 'docs/OUTCOME_MAP.md', 'docs/OUTCOME_MODEL_V2_LOCAL_DEFAULT_AND_SERVICE_PROJECTION_CONTRACT.md', 'docs/OUTCOME_MODEL_V2_LOCAL_DEFAULT_CONTEXT_CANARY_FRESH_QA_RECEIPT.md', 'docs/OUTCOME_MODEL_V2_LOCAL_DEFAULT_CONTEXT_CANARY_MANIFEST_RECOMPILE_FRESH_REQA_RECEIPT.md'])
const ROLE_SKILLS = new Set(['mango-implementation-engineer'])
const GATE_PREDICATES = Object.freeze(['D1', 'D2', 'A1', 'A2', 'A3', 'A4', 'Q1', 'B1', 'B2', 'B3', 'Q2', 'A5', 'C1'])

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
  if (Object.getOwnPropertySymbols(value).length) throw new Error(code)
  const actual = Object.getOwnPropertyNames(value)
  if (actual.length !== keys.length || actual.some((key) => !keys.includes(key))) throw new Error(code)
  return value
}
const array = (value, code = 'invalid_bootstrap_shape') => {
  if (!Array.isArray(value) || Object.getOwnPropertySymbols(value).length || Object.getOwnPropertyNames(value).length !== value.length + 1 || Object.keys(value).length !== value.length) throw new Error(code)
  return value
}
const safeId = (value, code = 'invalid_bootstrap_id') => {
  if (typeof value !== 'string' || !SAFE_ID.test(value) || PRIVATE_ID_CLASS.test(value) || UUID.test(value) || SHA256.test(value)) throw new Error(code)
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
  if (Object.getOwnPropertySymbols(value).length || Object.getOwnPropertyNames(value).length !== Object.keys(value).length) throw new Error('invalid_source_digests')
  const entries = Object.entries(value).sort(([left], [right]) => left.localeCompare(right))
  if (!entries.length || entries.some(([key, digest]) => { try { safeId(key, 'invalid_source_digests') } catch { return true }; return !SHA256.test(digest) })) throw new Error('invalid_source_digests')
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
    current_gate_ref: value.current_gate_ref === CURRENT_GATE ? value.current_gate_ref : (() => { throw new Error('non_current_gate_forbidden') })(),
    current_handoff_ref: value.current_handoff_ref === CURRENT_HANDOFF ? value.current_handoff_ref : (() => { throw new Error('non_current_handoff_forbidden') })(),
  }
  return freeze({ ...content, snapshot_digest: createHash('sha256').update(stable(content)).digest('hex') })
}

export function validateOutcomeContextBootstrap(snapshot, expectedSourceDigests) {
  rejectProxyTree(snapshot); rejectProxyTree(expectedSourceDigests)
  exact(snapshot, ['schema_version', 'source_digests', 'destination_version', 'primary_destination', 'acceptance_gap', 'ready_frontier', 'active_work', 'next_action', 'cherry_action', 'current_gate_ref', 'current_handoff_ref', 'snapshot_digest'])
  if (snapshot.schema_version !== 1 || !SHA256.test(snapshot.snapshot_digest)) throw new Error('invalid_bootstrap_snapshot')
  exact(snapshot.acceptance_gap, ['remaining', 'closed', 'total'], 'invalid_acceptance_gap')
  if (snapshot.acceptance_gap.remaining !== snapshot.acceptance_gap.total - snapshot.acceptance_gap.closed) throw new Error('invalid_acceptance_gap')
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
  const snapshotValidation = validateOutcomeContextBootstrap(snapshot, snapshot.source_digests)
  if (snapshotValidation.outcome !== 'ready') throw new Error('invalid_bootstrap_snapshot')
  exact(value, ['role_skill', 'expansions'])
  const roleSkill = safeId(value.role_skill)
  if (!ROLE_SKILLS.has(roleSkill)) throw new Error('unrelated_skill_forbidden')
  const expansions = array(value.expansions, 'invalid_expansions').map((entry) => {
    exact(entry, ['source_ref', 'reason', 'source_digest', 'work_id'], 'invalid_expansion')
    if (!SHA256.test(entry.source_digest) || !EXPANSION_SOURCES.has(entry.source_ref)) throw new Error('expansion_source_forbidden')
    return { source_ref: safeRef(entry.source_ref), reason: safeId(entry.reason), source_digest: entry.source_digest, work_id: safeId(entry.work_id) }
  })
  const loaded = ['AGENTS.md', 'active-bootstrap-snapshot', snapshot.current_gate_ref, ...(snapshot.active_work ? [snapshot.current_handoff_ref] : []), 'skill:karpathy-guidelines', 'skill:unlazy', `skill:${roleSkill}`, ...expansions.map((entry) => entry.source_ref)]
  return freeze({ loaded_sources: [...new Set(loaded)], excluded_source_classes: [...DEFAULT_EXCLUSIONS], expansion_count: expansions.length, expansion_reasons: expansions.map(({ reason, work_id }) => ({ reason, work_id })) })
}

export function validateOutcomeSourceManifest(actualDigests, expectedDigests) {
  rejectProxyTree(actualDigests); rejectProxyTree(expectedDigests)
  const actual = digestMap(actualDigests); const expected = digestMap(expectedDigests)
  if (JSON.stringify(actual) !== JSON.stringify(expected)) return freeze({ outcome: 'cold_compile_required', reason: 'source_digest_drift', automatic_retry_count: 0 })
  return freeze({ outcome: 'ready', automatic_retry_count: 0 })
}

export function compileCurrentGateFrontier(gateText, qaReceiptText) {
  if (typeof gateText !== 'string' || typeof qaReceiptText !== 'string') throw new Error('invalid_current_gate_input')
  const rows = [...gateText.matchAll(/^- \[([ x])\] (D1|D2|A[1-5]|B[1-3]|Q[1-2]|C1):\s*(.+)$/gm)].map((match) => ({ id: match[2], checked: match[1] === 'x', title: match[3] }))
  if (rows.length !== GATE_PREDICATES.length || rows.some((row, index) => row.id !== GATE_PREDICATES[index])) throw new Error('current_gate_shape_invalid')
  const independentQaPass = /^Status:\s*`PASS_(?:INDEPENDENT_)?UX_PRODUCT_QA_ONLY`\s*$/m.test(qaReceiptText)
  return freeze(rows.map((row, index) => ({
    ...row,
    closed: row.id === 'Q1' ? row.checked && independentQaPass : ['D1', 'D2', 'A1', 'A2', 'A3', 'A4'].includes(row.id) && row.checked,
    authority: row.id.startsWith('Q') ? 'independent-qa' : row.id === 'C1' ? 'cherry' : row.id === 'A5' ? 'release-audit' : row.id.startsWith('D') ? 'planner' : 'builder',
    depends_on: index === 0 ? [] : [GATE_PREDICATES[index - 1]],
  })))
}
