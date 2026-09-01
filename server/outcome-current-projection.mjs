import { createHash } from 'node:crypto'
import { isProxy } from 'node:util/types'
import { projectOutcomeV2, validateOutcomeGraph } from './outcome-model-v2.mjs'
import { validateOutcomeSourceManifest } from './outcome-context-bootstrap.mjs'

const SHA256 = /^[a-f0-9]{64}$/
const PLAIN = Object.getPrototypeOf({})
const PREDICATES = Object.freeze(['D1', 'B1', 'B2', 'B3', 'Q1', 'A1', 'C1', 'O1'])
const SOURCE_REVISION = '28db58fd5018dc4094c9cbbf764d0e86e83cbea4'
const CANONICAL_HEAD = '75e449de24b01e56df7b896cd2b89e849df17efe'
const OBSERVED_AT = '2026-09-01T00:00:00.000Z'
export const CURRENT_PROJECTION_SOURCES = Object.freeze({
  agents: Object.freeze({ source_ref: 'AGENTS.md', source_digest: 'cbda193480670fdbc0dfd5aa1cbcae2a945418ba8b670246997d3ba44f39cb93' }),
  contract: Object.freeze({ source_ref: 'docs/OUTCOME_CONTRACT.md', source_digest: 'c25e8f3920018aeca4bb219c8f9a678fa21700f3d4ebfe0d6c66a5481d20a442' }),
  model: Object.freeze({ source_ref: 'docs/OUTCOME_MODEL_V2.md', source_digest: '0a708464b3b83393b8b25f23e0f1364bc976844caa0cb079426967b1932073cb' }),
  accepted_gate: Object.freeze({ source_ref: 'GATES_OUTCOME_MODEL_V2_SELECTIVE_CONTEXT_LOCAL_ACTIVATION.md', source_digest: '50987cbba74c275ce5143c26d4ecb20c2fad377dfea2b7f50b75c621a989628f' }),
  acceptance: Object.freeze({ source_ref: 'docs/OUTCOME_MODEL_V2_LOCAL_ACTIVATION_C1_CHERRY_ACCEPTANCE_RECEIPT.md', source_digest: 'eefc0c06ddeb7eea1c135d4f97a97d630da445c1967efdc091885c25a1f89cf8' }),
  current_gate: Object.freeze({ source_ref: 'GATES_OUTCOME_MODEL_V2_CANONICAL_PACKAGE_PROMOTION_20260901.md', source_digest: '87b43ff38fa397d4832894960274d31715b68078c47166281612d7fadf29140c' }),
  current_handoff: Object.freeze({ source_ref: 'docs/OUTCOME_MODEL_V2_CANONICAL_PACKAGE_PROMOTION_BUILDER_HANDOFF_20260901.md', source_digest: '38d80b50cebfe719faa6961d170e13323f9dfcd05e027010b0a5986341ca9aa6' }),
})

const freeze = (value) => { if (value && typeof value === 'object') { for (const child of Object.values(value)) freeze(child); Object.freeze(value) }; return value }
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
const exact = (value, keys, code = 'invalid_current_projection_input') => {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== PLAIN || Object.getOwnPropertySymbols(value).length) throw new Error(code)
  const descriptors = Object.getOwnPropertyDescriptors(value)
  if (Object.keys(descriptors).length !== keys.length || keys.some((key) => !Object.hasOwn(descriptors, key)) || Object.values(descriptors).some((row) => !Object.hasOwn(row, 'value'))) throw new Error(code)
  return value
}
const digest = (value) => createHash('sha256').update(value).digest('hex')
const stable = (value) => Array.isArray(value) ? `[${value.map(stable).join(',')}]` : value && typeof value === 'object' ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}` : JSON.stringify(value)
const sourceDigests = (sourceBytes) => {
  exact(sourceBytes, Object.keys(CURRENT_PROJECTION_SOURCES), 'invalid_source_manifest')
  const rows = Object.entries(CURRENT_PROJECTION_SOURCES).map(([sourceClass]) => {
    const bytes = sourceBytes[sourceClass]
    if (!(typeof bytes === 'string' || Buffer.isBuffer(bytes))) throw new Error('invalid_source_manifest')
    return [sourceClass, digest(bytes)]
  })
  return Object.fromEntries(rows.sort(([left], [right]) => left.localeCompare(right)))
}
const expectedDigests = () => Object.fromEntries(Object.entries(CURRENT_PROJECTION_SOURCES).map(([key, row]) => [key, row.source_digest]).sort(([left], [right]) => left.localeCompare(right)))
const validationDigests = (value) => Object.fromEntries(Object.entries(value).map(([key, sourceDigest]) => [key.replaceAll('_', '-'), sourceDigest]))
const gateRows = (gateText) => {
  const rows = [...gateText.matchAll(/^- \[([ x])\] (D1|B1|B2|B3|Q1|A1|C1|O1):\s*(.+)$/gm)].map((match) => ({ id: match[2], closed: match[1] === 'x', title: match[3] }))
  if (rows.length !== PREDICATES.length || rows.some((row, index) => row.id !== PREDICATES[index])) throw new Error('current_gate_shape_invalid')
  return rows
}
const authority = (id) => id === 'D1' ? 'planner' : id.startsWith('B') ? 'builder' : id === 'Q1' ? 'independent-qa' : id === 'A1' ? 'release-audit' : id === 'C1' ? 'cherry' : 'operations'
const graphFromGate = (rows) => validateOutcomeGraph({
  schema_version: 2,
  project: { id: 'outcome', name: 'OUTCOME', terminal_outcome: 'Canonical Model v2 package and deterministic Current Projection' },
  destinations: [{ id: 'destination-model-v2-canonical-package', project_id: 'outcome', title: 'Model v2 canonical package', outcome: 'One durable local canonical candidate and Current Projection', depends_on: [], primary: true }],
  milestones: rows.map((row, index) => ({ id: `milestone-${row.id.toLowerCase()}`, destination_id: 'destination-model-v2-canonical-package', title: row.id, expected_user_delta: row.title, depends_on: index === 0 ? [] : [`milestone-${rows[index - 1].id.toLowerCase()}`], predicate_ids: [`predicate-${row.id.toLowerCase()}`] })),
  acceptance_predicates: rows.map((row) => ({ id: `predicate-${row.id.toLowerCase()}`, milestone_id: `milestone-${row.id.toLowerCase()}`, description: row.title, check: null, expect: row.closed ? 'evidence-closed' : 'pending', authority: authority(row.id) })),
  evidence_claims: rows.filter((row) => row.closed).map((row) => ({ id: `claim-${row.id.toLowerCase()}`, predicate_id: `predicate-${row.id.toLowerCase()}`, source_ref: CURRENT_PROJECTION_SOURCES.current_gate.source_ref, producer: authority(row.id), freshness: 'source-pinned', reproducible: true })),
})
const work = Object.freeze({ id: 'work-o1-selective-context-dogfood', milestone_id: 'milestone-o1', fingerprint: digest(stable({ accepted_product_candidate: SOURCE_REVISION, canonical_head: CANONICAL_HEAD, expected_source_manifest: expectedDigests() })), acceptance_gap_delta: 1, uncertainty_delta: 1, blocker_delta: 0, user_value_delta: 1, reversible: true, cost: 1 })
const publicProjection = (projection, attempts) => {
  const active = attempts.find((row) => !['delivery_unknown', 'blocked', 'failed', 'transition_committed', 'transition_rejected'].includes(row.state)) ?? null
  return {
    primary_destination: projection.primary_destination,
    acceptance_gap: { remaining: projection.progress.total - projection.progress.closed, closed: projection.progress.closed, total: projection.progress.total },
    ready_frontier: projection.ready_frontier,
    active_work: active ? { work_id: active.work_id, state: active.state } : null,
    next_action: projection.next_action,
    cherry_action: projection.cherry_action,
  }
}
const safeHold = (reason) => freeze({ schema_version: 2, authority: 'projection_only', outcome: 'cold_compile_required', reason, automatic_retry_count: 0, safety: { duplicate_execution_count: 0, unauthorized_canonical_transition_count: 0, registry_provider_environment_mutation_count: 0, false_completion_count: 0 } })

export function compileOutcomeCurrentProjection(value) {
  rejectProxyTree(value)
  exact(value, ['source_bytes', 'source_revision', 'expected_source_revision', 'observed_at', 'work_items', 'attempts', 'mode'])
  if (value.mode === 'v1_rollback') return freeze({ schema_version: 1, authority: 'v1_compatible', outcome: 'rollback_selected', original_value_required: true, persistent_state_changed: false, automatic_retry_count: 0 })
  if (value.mode !== 'model_v2') throw new Error('invalid_projection_mode')
  const actual = sourceDigests(value.source_bytes); const expected = expectedDigests()
  const manifest = validateOutcomeSourceManifest(validationDigests(actual), validationDigests(expected))
  if (manifest.outcome !== 'ready') return safeHold(manifest.reason)
  if (value.source_revision !== SOURCE_REVISION || value.observed_at !== OBSERVED_AT) throw new Error('invalid_projection_pin')
  if (!Array.isArray(value.work_items) || !Array.isArray(value.attempts)) throw new Error('invalid_current_projection_input')
  const graph = graphFromGate(gateRows(String(value.source_bytes.current_gate)))
  const projection = projectOutcomeV2({ graph, source_revision: value.source_revision, expected_source_revision: value.expected_source_revision, observed_at: value.observed_at, work_items: value.work_items, attempts: value.attempts })
  const sourceManifest = Object.entries(expected).map(([source_class, source_digest]) => ({ source_class, source_digest }))
  const content = {
    schema_version: 2,
    authority: 'projection_only',
    outcome: 'current_projection',
    candidate_commit: SOURCE_REVISION,
    source_manifest_digest: digest(stable(expected)),
    source_manifest: sourceManifest,
    project: { id: graph.project.id, name: graph.project.name },
    current: publicProjection(projection, value.attempts),
    state: { stale: projection.stale, conflict: projection.conflict, delivery_unknown_count: projection.delivery_unknown_count },
    rollback: { available: true, mode: 'v1_compatible', persistent_state_changed: false },
    safety: { automatic_retry_count: projection.automatic_retry_count, duplicate_execution_count: projection.blockers.duplicate_fingerprints, unauthorized_canonical_transition_count: 0, registry_provider_environment_mutation_count: 0, false_completion_count: 0 },
  }
  return freeze({ ...content, projection_digest: digest(stable(content)) })
}

export const outcomeCurrentProjectionInput = (source_bytes) => ({ source_bytes, source_revision: SOURCE_REVISION, expected_source_revision: SOURCE_REVISION, observed_at: OBSERVED_AT, work_items: [work], attempts: [], mode: 'model_v2' })
export const serializeOutcomeCurrentProjection = (value) => `${JSON.stringify(value, null, 2)}\n`
