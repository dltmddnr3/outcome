import { createHash } from 'node:crypto'
import { types as utilTypes } from 'node:util'

const INVALID = 'work_tracking_invalid'
const CURRENT_SOURCE_INVALID = 'current_source_projection_invalid'
const HASH = /^[a-f0-9]{64}$/
const PRIMARY_DESTINATION_ID = 'outcome-phase-5'
const PRIMARY_WORKSTREAM_ID = 'outcome-phase-5-composition'
const PRIMARY_MILESTONE_ID = 'outcome-milestone-model-v2-local-default-projection'
const PRIMARY_GATE_REF = 'GATES_OUTCOME_MODEL_V2_LOCAL_DEFAULT_AND_SERVICE_PROJECTION.md'
const PRIMARY_GATE_IDS = Object.freeze(['D1', 'D2', 'A1', 'A2', 'A3', 'A4', 'Q1', 'B1', 'B2', 'B3', 'Q2', 'A5', 'C1'])
const NODE_RANGE_FIELDS = ['initial_hours', 'actual_hours', 'remaining_hours']
const NODE_KEYS = new Set([...NODE_RANGE_FIELDS, 'latest_forecast', 'source_ref', 'observed_at'])
const exactObject = (value) => value && typeof value === 'object' && !Array.isArray(value)
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/
const iso = (value) => typeof value === 'string' && ISO_INSTANT.test(value) && Number.isFinite(Date.parse(value))
const stable = (value) => Array.isArray(value) ? `[${value.map(stable).join(',')}]` : exactObject(value) ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}` : JSON.stringify(value)
const sha256 = (value) => createHash('sha256').update(stable(value)).digest('hex')
const fail = () => { throw new Error(INVALID) }
const failCurrentSource = () => { throw new Error(CURRENT_SOURCE_INVALID) }
const range = (value) => value === null || Array.isArray(value) && value.length === 2 && value.every((item) => typeof item === 'number' && Number.isFinite(item) && item >= 0) && value[0] <= value[1]
const safeSourceRef = (value) => typeof value === 'string' && value.length > 0 && value.length <= 240 && !value.includes('..') && !value.startsWith('/') && !/[\u0000-\u001f]|\b[0-9a-f]{8}-[0-9a-f-]{27,}\b|\b[0-9a-f]{40,64}\b|raw_(?:prompt|result)|(?:session|thread|task|turn)_id|(?:token|secret|password|authorization|api[_-]?key|locator)\s*[:=]/i.test(value)
const ACCEPTANCE_UNIT_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,159}#[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/
const PRIVATE_UNIT_LOCATOR = /(?:^|[#._-])(?:task|thread|session|turn)(?:(?:[_-](?:id[_-]?)?)|Id)?[0-9a-z]{3,}(?:$|[._-])|(?:^|#)(?:token|secret|password|authorization|api[-_]?key)(?:$|[._-])/i
const PRIVATE_SOURCE_TEXT = /(?:\/Users\/|\b[0-9a-f]{8}-[0-9a-f-]{27,}\b|(?:token|secret|password|authorization|api[_-]?key|locator|(?:session|thread|task|turn)_id)\s*[:=])/i
const safeAcceptanceUnitId = (value) => typeof value === 'string' && safeSourceRef(value) && ACCEPTANCE_UNIT_ID.test(value) && !PRIVATE_UNIT_LOCATOR.test(value)
const exactDenseArray = (value) => Array.isArray(value) && Object.getOwnPropertyNames(value).length === value.length + 1 && Object.getOwnPropertyNames(value).every((key, index) => index === value.length ? key === 'length' : key === String(index))
const nodeAnchor = (value) => typeof value === 'string' ? value.match(/^#result-node-([a-z0-9]+(?:-[a-z0-9]+)*)$/)?.[1] ?? null : null
const exactKeys = (value, keys) => exactObject(value) && Object.keys(value).length === keys.size && Object.keys(value).every((key) => keys.has(key))
function assertPassiveData(value, seen = new Set()) {
  if (value === null || typeof value !== 'object') return
  if (utilTypes.isProxy(value)) fail()
  if (seen.has(value)) fail()
  seen.add(value)
  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null && prototype !== Array.prototype) fail()
  if (Object.getOwnPropertySymbols(value).length) fail()
  const descriptors = Object.getOwnPropertyDescriptors(value)
  for (const descriptor of Object.values(descriptors)) {
    if (descriptor.get || descriptor.set) fail()
    assertPassiveData(descriptor.value, seen)
  }
  seen.delete(value)
}

export function outcomeSnapshotId(snapshot) {
  const { snapshot_id: _id, ...content } = snapshot
  return `snapshot-${sha256(content).slice(0, 24)}`
}

const one = (rows) => rows.length === 1 ? rows[0] : failCurrentSource()
const checkedGateRows = (markdown) => [...markdown.matchAll(/^- \[([ xX])\]\s+([A-Z]+\d+):\s*(.+)$/gm)].map((match) => ({ id: match[2], title: match[3].trim(), closed: match[1].toLowerCase() === 'x' }))

export function projectOutcomeCurrentSource(project, tracking, options, allowedSourceRefs, source) {
  try { assertPassiveData(project); assertPassiveData(source) } catch { failCurrentSource() }
  if (!exactKeys(source, new Set(['map', 'map_text', 'gate_text', 'captured_at', 'map_updated_at', 'gate_observed_at']))) failCurrentSource()
  if (!exactObject(source.map) || typeof source.map_text !== 'string' || typeof source.gate_text !== 'string' || !iso(source.captured_at) || typeof source.map_updated_at !== 'string' || !/^\d{4}-\d{2}-\d{2} KST$/.test(source.map_updated_at) || !iso(source.gate_observed_at) || Date.parse(source.gate_observed_at) > Date.parse(source.captured_at)) failCurrentSource()
  const active = source.map.active_workstream
  if (!exactObject(active) || active.canonical_stage_id !== PRIMARY_MILESTONE_ID) failCurrentSource()
  const phase = one((source.map.phases ?? []).filter((row) => row?.id === PRIMARY_DESTINATION_ID))
  const scope = one((phase.scopes ?? []).filter((row) => row?.id === PRIMARY_WORKSTREAM_ID))
  const milestone = one((scope.stages ?? []).filter((row) => row?.id === PRIMARY_MILESTONE_ID))
  const [gateRef] = String(milestone.gates_file ?? '').split('#', 1)
  if (gateRef !== PRIMARY_GATE_REF) failCurrentSource()

  const gates = checkedGateRows(source.gate_text)
  if (gates.length !== PRIMARY_GATE_IDS.length || new Set(gates.map((gate) => gate.id)).size !== PRIMARY_GATE_IDS.length || gates.some((gate, index) => gate.id !== PRIMARY_GATE_IDS[index] || gate.closed !== true || PRIVATE_SOURCE_TEXT.test(gate.title))) failCurrentSource()
  if (!/Status:\s*\*\*MODEL V2 13\/13 CHERRY ACCEPTED\b/.test(source.gate_text)) failCurrentSource()
  const narratives = [...source.map_text.matchAll(/^- Primary implementation target:[ \t]*`([^`\n]+)`/gm)]
  const narrative = one(narratives)[1]
  const staleNarrative = narrative === `${PRIMARY_MILESTONE_ID} · Slice A A1-A4 OPEN`
  if (!staleNarrative && narrative !== `${PRIMARY_MILESTONE_ID} · 13/13 evidence closure`) failCurrentSource()
  const compatibility = source.map_text.match(/Current:\s*`(outcome-phase-3 \/ outcome-phase-3-evidence-continuity \/ outcome-stage-phase3-cherry-acceptance) · OPEN`/)?.[1] ?? null
  const compatibilityCount = source.map_text.match(/Phase 3은[^\n]*실행 Gate `38\/43`/) ? { closed: 38, total: 43 } : null
  if (!compatibility || !compatibilityCount) failCurrentSource()

  const projected = structuredClone(project)
  const projectedPhase = one(projected.phases.filter((row) => row.id === PRIMARY_DESTINATION_ID))
  const projectedScope = one(projectedPhase.scopes.filter((row) => row.id === PRIMARY_WORKSTREAM_ID))
  const projectedMilestone = one(projectedScope.stages.filter((row) => row.id === PRIMARY_MILESTONE_ID))
  projectedMilestone.gate = {
    gates: gates.map((gate) => ({ id: gate.id, title: `${gate.id} · canonical Gate evidence closure`, closed: gate.closed, stageId: PRIMARY_MILESTONE_ID, groupCode: gate.id.match(/^[A-Z]+/)?.[0] ?? 'GATE', groupLabel: null, proves: null, evidence: null })),
    groups: [], total: PRIMARY_GATE_IDS.length, closed: PRIMARY_GATE_IDS.length, available: true,
    sourceRef: PRIMARY_GATE_REF, observedAt: source.gate_observed_at,
  }
  projectedMilestone.state = 'complete'
  projectedMilestone.sourceState = 'present'
  projected.current = { phaseId: PRIMARY_DESTINATION_ID, scopeId: PRIMARY_WORKSTREAM_ID, stageId: PRIMARY_MILESTONE_ID }
  projected.next = null
  const narrativeError = 'source_projection_conflict:map_primary_narrative_stale'
  const priorErrors = projected.errors ?? []
  projected.errors = [...new Set(priorErrors.filter((error) => error !== narrativeError))]
  if (staleNarrative) {
    projected.status = 'conflict'
    projected.conflict = true
    projected.errors.push(narrativeError)
  } else if (projected.status === 'conflict' && priorErrors.includes(narrativeError) && projected.errors.length === 0) {
    // Only remove a conflict whose sole recorded cause is this resolved narrative.
    projected.status = 'valid'
    projected.conflict = false
  }

  const historicalPhase = one(projected.phases.filter((row) => row.id === 'outcome-phase-2'))
  const historicalStage = one(historicalPhase.scopes.flatMap((row) => row.stages).filter((row) => row.id === 'outcome-stage-account-access-hosted-identity-preview'))
  if (historicalStage.gate.closed !== 5 || historicalStage.gate.total !== 6) failCurrentSource()
  const sourceProjection = {
    captured_at: source.captured_at,
    source_updated_at: source.map_updated_at,
    evidence_observed_at: source.gate_observed_at,
    primary: {
      destination_id: PRIMARY_DESTINATION_ID,
      compatibility_workstream_id: PRIMARY_WORKSTREAM_ID,
      milestone_id: PRIMARY_MILESTONE_ID,
      gate_ref: PRIMARY_GATE_REF,
      acceptance: { closed: 13, total: 13, unmapped: 0, unit_ids: gates.map((gate) => `${PRIMARY_GATE_REF}#${gate.id}`), label: '근거 닫힘 · 완료 판정 권한 없음' },
    },
    compatibility: { phase_id: 'outcome-phase-3', scope_id: 'outcome-phase-3-evidence-continuity', stage_id: 'outcome-stage-phase3-cherry-acceptance', closed: 38, total: 43, label: 'compatibility' },
    historical: [{ phase_id: 'outcome-phase-2', stage_id: historicalStage.id, closed: 5, total: 6, label: 'historical' }],
    conflicts: staleNarrative ? [{ code: 'map_primary_narrative_stale', map_value: 'Slice A A1-A4 OPEN', gate_value: '13/13 evidence closure' }] : [],
    completion_authority: false,
  }
  projected.resultView = projectOutcomeResultView(projected, tracking, options, allowedSourceRefs, sourceProjection)
  return projected
}

function validateWorkTracking(project, value, options, allowedSourceRefs) {
  assertPassiveData(value)
  assertPassiveData(options)
  assertPassiveData(allowedSourceRefs)
  if (!exactKeys(options, new Set(['observedAtCutoff'])) || !Object.hasOwn(options, 'observedAtCutoff') || !iso(options.observedAtCutoff)) fail()
  if (!Array.isArray(allowedSourceRefs) || allowedSourceRefs.length === 0 || allowedSourceRefs.some((source) => typeof source !== 'string' || !source || !safeSourceRef(source)) || new Set(allowedSourceRefs).size !== allowedSourceRefs.length) fail()
  const sourceAllowed = (source) => allowedSourceRefs.some((member) => member === source)
  const cutoff = Date.parse(options.observedAtCutoff)
  if (!exactKeys(value, new Set(['schema_version', 'project_id', 'observed_at', 'calendar', 'nodes', 'snapshots', 'links', 'completion_authority'])) || value.schema_version !== 1 || value.project_id !== project.project.id || !iso(value.observed_at) || value.completion_authority !== false) fail()
  if (Date.parse(value.observed_at) > cutoff) fail()
  if (!exactKeys(value.calendar, new Set(['plan_started_at', 'planned_finish_at', 'source_ref']))) fail()
  for (const field of ['plan_started_at', 'planned_finish_at']) if (value.calendar[field] !== null && !iso(value.calendar[field])) fail()
  if ((value.calendar.plan_started_at !== null || value.calendar.planned_finish_at !== null) && !sourceAllowed(value.calendar.source_ref)) fail()
  if (value.calendar.source_ref !== null && !sourceAllowed(value.calendar.source_ref)) fail()
  if (!exactObject(value.nodes) || !Array.isArray(value.snapshots) || !exactKeys(value.links, new Set(['source', 'usable_result', 'planner_conversation']))) fail()
  for (const [nodeId, node] of Object.entries(value.nodes)) {
    if (!exactObject(node) || Object.keys(node).some((key) => !NODE_KEYS.has(key)) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(nodeId)) fail()
    for (const field of NODE_RANGE_FIELDS) {
      const fieldValue = node[field] ?? null
      if (!range(fieldValue)) fail()
    }
    const forecast = node.latest_forecast ?? null
    if (forecast !== null && (!exactKeys(forecast, new Set(['earliest_at', 'latest_at'])) || !iso(forecast.earliest_at) || !iso(forecast.latest_at) || Date.parse(forecast.earliest_at) > Date.parse(forecast.latest_at))) fail()
    const hasValue = [...NODE_RANGE_FIELDS, 'latest_forecast'].some((field) => (node[field] ?? null) !== null)
    if (hasValue && (!sourceAllowed(node.source_ref) || !iso(node.observed_at) || Date.parse(node.observed_at) > cutoff)) fail()
    if (!hasValue && (node.source_ref != null || node.observed_at != null) && (!sourceAllowed(node.source_ref) || !iso(node.observed_at) || Date.parse(node.observed_at) > cutoff)) fail()
  }
  const snapshotIds = new Set()
  for (const snapshot of value.snapshots) {
    if (!exactKeys(snapshot, new Set(['snapshot_id', 'observed_at', 'source_ref', 'denominator_sha256', 'nodes'])) || !iso(snapshot.observed_at) || Date.parse(snapshot.observed_at) > cutoff || !sourceAllowed(snapshot.source_ref) || !HASH.test(snapshot.denominator_sha256) || !exactObject(snapshot.nodes) || snapshot.snapshot_id !== outcomeSnapshotId(snapshot) || snapshotIds.has(snapshot.snapshot_id)) fail()
    snapshotIds.add(snapshot.snapshot_id)
    for (const row of Object.values(snapshot.nodes)) {
      if (!exactKeys(row, new Set(['closed', 'total', 'unmapped', 'denominator_sha256', 'unit_ids'])) || !Number.isInteger(row.closed) || !Number.isInteger(row.total) || !Number.isInteger(row.unmapped) || row.closed < 0 || row.total < 0 || row.closed > row.total || row.unmapped < 0 || !HASH.test(row.denominator_sha256) || !exactDenseArray(row.unit_ids)) fail()
      if (row.unit_ids.some((id) => !safeAcceptanceUnitId(id)) || row.unit_ids.some((id, index) => index > 0 && row.unit_ids[index - 1] >= id) || row.total !== row.unit_ids.length || row.denominator_sha256 !== sha256(row.unit_ids)) fail()
    }
  }
}

const acceptance = (unitMap, unmapped) => {
  const unitIds = [...unitMap.keys()].sort()
  const closed = unitIds.filter((id) => unitMap.get(id)).length
  const partial = unmapped > 0
  const label = partial ? unitIds.length === 0 ? '완료 조건 미연결 · 전체 완료율 아님' : '부분 분모 · 전체 완료율 아님' : '근거 닫힘'
  return { closed, total: unitIds.length, unmapped, partial, label, unit_ids: unitIds, denominator_sha256: sha256(unitIds), weight: 1, completion_authority: false }
}

const directWork = (node, calendar, root) => {
  const source = node ?? {}
  const nodeProof = source.source_ref && source.observed_at ? { source_ref: source.source_ref, observed_at: source.observed_at } : undefined
  const provenance = {}
  for (const field of [...NODE_RANGE_FIELDS, 'latest_forecast']) if (source[field] != null && nodeProof) provenance[field] = nodeProof
  if (root && calendar.planned_finish_at != null) provenance.planned_finish_at = { source_ref: calendar.source_ref, observed_at: calendar.observed_at }
  return {
    initial_hours: source.initial_hours ?? null,
    actual_hours: source.actual_hours ?? null,
    remaining_hours: source.remaining_hours ?? null,
    planned_finish_at: root ? calendar.planned_finish_at : null,
    latest_forecast: source.latest_forecast ?? null,
    provenance,
  }
}

const aggregateWork = (own, children) => {
  if (!children.length) return own
  const result = { ...own, provenance: { ...own.provenance } }
  for (const field of [...NODE_RANGE_FIELDS, 'latest_forecast']) {
    if (result[field] !== null) continue
    const facts = children.map((child) => [child.work[field], child.work.provenance[field]])
    if (facts.some(([value, proof]) => value === null || !proof)) continue
    const signature = facts.map(([, proof]) => `${proof.source_ref}|${proof.observed_at}`)
    if (!signature.every((value) => value === signature[0])) continue
    if (field.endsWith('_hours')) result[field] = [facts.reduce((sum, [value]) => sum + value[0], 0), facts.reduce((sum, [value]) => sum + value[1], 0)]
    else result[field] = { earliest_at: new Date(Math.max(...facts.map(([value]) => Date.parse(value.earliest_at)))).toISOString(), latest_at: new Date(Math.max(...facts.map(([value]) => Date.parse(value.latest_at)))).toISOString() }
    result.provenance[field] = facts[0][1]
  }
  return result
}

const kstDay = (value) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value))

function comparisonFor(node, tracking) {
  const eligible = tracking.snapshots.filter((snapshot) => Date.parse(snapshot.observed_at) <= Date.parse(tracking.observed_at) && snapshot.nodes[node.id]).sort((left, right) => Date.parse(left.observed_at) - Date.parse(right.observed_at))
  const yesterday = eligible.filter((snapshot) => kstDay(snapshot.observed_at) < kstDay(tracking.observed_at)).at(-1) ?? null
  const current = { observed_at: tracking.observed_at, closed: node.acceptance.closed, total: node.acceptance.total, unmapped: node.acceptance.unmapped, denominator_sha256: node.acceptance.denominator_sha256 }
  if (!yesterday) return { yesterday: null, current, today_delta: null, message: '이 날짜 이전의 비교 기록 없음' }
  const row = yesterday.nodes[node.id]
  const priorDenominator = row.denominator_sha256 ?? (node.kind === 'project' ? yesterday.denominator_sha256 : null)
  const prior = { observed_at: yesterday.observed_at, denominator_sha256: priorDenominator, ...row }
  if (priorDenominator !== node.acceptance.denominator_sha256) return { yesterday: prior, current, today_delta: null, message: '완료 조건 범위 변경 · 같은 분모로 비교 불가' }
  return { yesterday: prior, current, today_delta: current.closed - prior.closed, message: null }
}

function timelineFor(node, comparison) {
  const timeline = []
  if (comparison.yesterday) timeline.push({ type: 'snapshot', observed_at: comparison.yesterday.observed_at, closed: comparison.yesterday.closed, total: comparison.yesterday.total, unmapped: comparison.yesterday.unmapped })
  timeline.push({ type: 'current', observed_at: comparison.current.observed_at, closed: comparison.current.closed, total: comparison.current.total, unmapped: comparison.current.unmapped })
  if (comparison.message === '완료 조건 범위 변경 · 같은 분모로 비교 불가') timeline.push({ type: 'scope_change', observed_at: comparison.current.observed_at, old_count: comparison.yesterday.total, new_count: comparison.current.total, old_unit_ids: comparison.yesterday.unit_ids ?? [], new_unit_ids: node.acceptance.unit_ids })
  return timeline
}

export function projectOutcomeResultView(project, tracking, options, allowedSourceRefs, sourceProjection = undefined) {
  validateWorkTracking(project, tracking, options, allowedSourceRefs)
  const calendar = { ...tracking.calendar, observed_at: tracking.observed_at }
  const makeStage = (stage) => {
    const units = new Map()
    if (stage.gate?.available && stage.gate.sourceRef) for (const gate of stage.gate.gates ?? []) {
      const id = `${stage.gate.sourceRef}#${gate.id}`
      units.set(id, units.get(id) === true || gate.closed === true)
    }
    const mapped = Boolean(stage.gate?.available && stage.gate.sourceRef && (stage.gate.gates ?? []).length)
    const node = { id: stage.id, kind: 'stage', title: stage.title, outcome: stage.purpose, children: [], acceptance: acceptance(units, mapped ? 0 : 1), work: directWork(tracking.nodes[stage.id], calendar, false) }
    return { node, units }
  }
  const combine = (id, kind, title, outcome, childRows, root = false) => {
    const units = new Map(); let unmapped = childRows.length === 0 ? 1 : 0
    for (const row of childRows) { for (const [key, closed] of row.units) units.set(key, units.get(key) === true || closed); unmapped += row.node.acceptance.unmapped }
    if (units.size === 0 && unmapped === 0) unmapped = 1
    const node = { id, kind, title, outcome, children: childRows.map((row) => row.node), acceptance: acceptance(units, unmapped), work: null }
    node.work = aggregateWork(directWork(tracking.nodes[id], calendar, root), node.children)
    return { node, units }
  }
  const phases = project.phases.map((phase) => combine(phase.id, 'phase', phase.title, phase.purpose, phase.scopes.map((scope) => combine(scope.id, 'scope', scope.title, scope.purpose, scope.stages.map(makeStage)))))
  const root = combine(project.project.id, 'project', project.project.name, project.project.outcome, phases, true).node
  const decorate = (node) => {
    node.comparison = comparisonFor(node, tracking)
    node.timeline = timelineFor(node, node.comparison)
    for (const child of node.children) decorate(child)
  }
  decorate(root)
  const nodeIds = new Set()
  const collectIds = (node) => { nodeIds.add(node.id); for (const child of node.children) collectIds(child) }
  collectIds(root)
  const anchorLink = (key, label) => { const id = nodeAnchor(tracking.links[key]); return id && nodeIds.has(id) ? { href: tracking.links[key], action: null, label } : { href: null, action: null, label: '링크 미연결' } }
  const links = {
    source: anchorLink('source', '출처 보기'),
    usable_result: anchorLink('usable_result', '사용 가능한 결과 보기'),
    planner_conversation: tracking.links.planner_conversation === 'planner' ? { href: null, action: 'planner_conversation', label: 'Planner 대화 보기' } : { href: null, action: null, label: '링크 미연결' },
  }
  const attachLinks = (node) => { node.links = links; for (const child of node.children) attachLinks(child) }
  attachLinks(root)
  return { schema_version: 1, observed_at: tracking.observed_at, calendar: tracking.calendar, hierarchy: root, links, ...(sourceProjection === undefined ? {} : { source_projection: sourceProjection }), completion_authority: false }
}
