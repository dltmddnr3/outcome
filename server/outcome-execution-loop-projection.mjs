import { isProxy } from 'node:util/types'

const PLAIN = Object.getPrototypeOf({})
const ROOT_KEYS = ['currentStageId', 'predicates', 'events', 'contract']
const PREDICATE_KEYS = ['id', 'stageId', 'title', 'closed', 'evidence']
const EVENT_KEYS = ['id', 'sequence', 'predicateId', 'role', 'type', 'status', 'summary']
const CONTRACT_KEYS = ['predicateId', 'eventId', 'checked', 'ownerInstruction', 'receipt', 'nextCheckpoint', 'review', 'rework', 'cherryBoundary']
const FACT_KEYS = ['label', 'sourceRef']
const OWNER_KEYS = ['owner', 'deliverable', 'completionCondition', 'sourceRef']
const RECEIPT_KEYS = ['state', 'sourceRef', 'destinationEvidenceRef']
const CHECKPOINT_KEYS = ['label', 'sourceRef', 'eligibleSuccessor']
const SUCCESSOR_KEYS = ['owner', 'deliverable', 'sourceRef']
const REVIEW_KEYS = ['verdict', 'authority', 'artifactRef', 'evidenceRef', 'sourceRef']
const REWORK_KEYS = ['pathIdentity', 'identicalFailureCount', 'correction', 'fallback', 'sourceRef']
const BOUNDARY_KEYS = ['kind', 'label', 'sourceRef']
const OWNER_ROLES = new Set(['planner', 'builder'])
const EVENT_ROLES = new Set(['planner', 'builder', 'ux_product_qa', 'release_audit'])
const REVIEW_AUTHORITIES = new Set(['ux_product_qa', 'release_audit'])
const RECEIPT_STATES = new Set(['accepted', 'delivery_unknown', 'received', 'started'])
const VERDICTS = new Set(['PASS', 'FAIL', 'SAFE_HOLD'])
const TRUE_CHERRY_BOUNDARIES = new Set(['user_value', 'external_authority', 'cost', 'acceptance', 'deployment', 'release'])
const TECHNICAL_BOUNDARIES = new Set(['source_revision', 'delivery_unknown', 'envelope_renewal', 'generic_blocker'])
const PRIVATE_KEY = /(?:credential|password|secret|token|raw[_-]?(?:prompt|result)|registry|locator|thread|session|turn|provider[_-]?(?:id|ref|payload))/i
const PRIVATE_VALUE = /(?:^|[\s=:])(?:token|secret|password|credential)\s*=|(?:^|[\s=:])(?:registry|provider)[_-]?(?:payload|id|ref)?\s*=|(?:^|[\s=:])(?:\/(?:Users|home|tmp|private)(?:\/|$)|\/var\/folders(?:\/|$)|[A-Za-z]:\\|\\\\[^\\\s]+\\)|raw[_-]?(?:prompt|result)|private[_-]?(?:registry|locator)|\b(?:task|thread|session|turn|provider)[_:-][a-z0-9._-]{4,}\b|\b(?:[0-9a-f]{40}|[0-9a-f]{64})\b/i

const fail = (code) => { throw new Error(`execution_loop_${code}`) }
const exact = (value, keys, code = 'invalid_shape') => {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== PLAIN) fail(code)
  const actual = Object.keys(value)
  if (actual.length !== keys.length || keys.some((key) => !Object.hasOwn(value, key)) || actual.some((key) => !keys.includes(key))) fail(code)
  return value
}
const materialize = (value, seen = new WeakSet()) => {
  if (value === null || typeof value !== 'object') {
    if (['function', 'symbol', 'bigint'].includes(typeof value)) fail('invalid_value')
    if (typeof value === 'string' && PRIVATE_VALUE.test(value)) fail('private_value')
    return value
  }
  if (isProxy(value)) fail('proxy_forbidden')
  if (seen.has(value)) fail('cycle_forbidden')
  seen.add(value)
  let descriptors
  try { descriptors = Object.getOwnPropertyDescriptors(value) } catch { fail('invalid_shape') }
  if (Object.getOwnPropertySymbols(value).length) fail('symbol_forbidden')
  if (Array.isArray(value)) {
    const lengthDescriptor = descriptors.length
    if (!lengthDescriptor || !Object.hasOwn(lengthDescriptor, 'value') || lengthDescriptor.enumerable || lengthDescriptor.configurable || !Number.isSafeInteger(lengthDescriptor.value) || lengthDescriptor.value < 0) fail('invalid_array')
    if (Object.getOwnPropertyNames(value).length !== lengthDescriptor.value + 1) fail('invalid_array')
    const output = []
    for (let index = 0; index < lengthDescriptor.value; index += 1) {
      const descriptor = descriptors[index]
      if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) fail('accessor_forbidden')
      output.push(materialize(descriptor.value, seen))
    }
    seen.delete(value)
    return output
  }
  if (Object.getPrototypeOf(value) !== PLAIN) fail('invalid_record')
  const output = {}
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) fail('accessor_forbidden')
    if (PRIVATE_KEY.test(key)) fail('private_key')
    output[key] = materialize(descriptor.value, seen)
  }
  seen.delete(value)
  return output
}
const identifier = (value, code = 'invalid_identifier') => {
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(value)) fail(code)
  return value
}
const text = (value, code = 'invalid_text') => {
  if (typeof value !== 'string' || !value.trim() || value.length > 240 || /[\u0000-\u001f\u007f<>]/.test(value) || PRIVATE_VALUE.test(value)) fail(code)
  return value.trim()
}
const reference = (value, code = 'invalid_reference') => {
  const result = text(value, code)
  if (!/^[A-Za-z][A-Za-z0-9._:-]{1,159}$/.test(result)) fail(code)
  return result
}
const nullable = (value, reader) => value === null ? null : reader(value)
const member = (value, values, code = 'invalid_enum') => { if (!values.has(value)) fail(code); return value }
const integer = (value, code = 'invalid_number') => { if (!Number.isSafeInteger(value) || value < 0) fail(code); return value }
const roleLabel = (role) => role === 'planner' ? 'Planner' : role === 'builder' ? 'Builder' : role === 'ux_product_qa' ? 'UX & Product QA' : 'Release Audit'
const fact = (state, value, sourceRef, reasonCode = null) => ({ state, value, sourceRef, reasonCode })
const deepFreeze = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child)
    Object.freeze(value)
  }
  return value
}

const safeHoldItem = (reasonCode) => deepFreeze({
  itemId: 'execution-item-safe-hold', state: 'safe_hold',
  checked: fact('safe_hold', null, null, reasonCode),
  missing: fact('safe_hold', null, null, reasonCode),
  ownerInstruction: fact('safe_hold', null, null, reasonCode),
  receiptState: fact('safe_hold', null, null, reasonCode),
  nextCheckpoint: fact('safe_hold', null, null, reasonCode),
  reviewResult: fact('safe_hold', null, null, reasonCode),
  reworkState: fact('safe_hold', null, null, reasonCode),
  cherryBoundary: null,
  completionAuthority: false,
})

const normalizePredicate = (value) => {
  const row = exact(value, PREDICATE_KEYS, 'predicate_shape_invalid')
  if (typeof row.closed !== 'boolean') fail('predicate_state_invalid')
  return { id: identifier(row.id), stageId: identifier(row.stageId), title: text(row.title), closed: row.closed, evidence: nullable(row.evidence, (item) => text(item, 'predicate_evidence_invalid')) }
}
const normalizeEvent = (value) => {
  const row = exact(value, EVENT_KEYS, 'event_shape_invalid')
  return {
    id: identifier(row.id), sequence: integer(row.sequence), predicateId: nullable(row.predicateId, identifier), role: member(row.role, EVENT_ROLES),
    type: member(row.type, new Set(['work_observed', 'result_observed', 'boundary_observed'])),
    status: member(row.status, new Set(['observed', 'active', 'blocked', 'delivery_unknown', 'failed', 'rejected', 'safe_hold'])), summary: text(row.summary),
  }
}
const normalizeFactInput = (value) => { const row = exact(value, FACT_KEYS, 'fact_shape_invalid'); return { label: text(row.label), sourceRef: reference(row.sourceRef) } }
const normalizeOwner = (value) => { const row = exact(value, OWNER_KEYS, 'owner_shape_invalid'); return { owner: member(row.owner, OWNER_ROLES), deliverable: text(row.deliverable), completionCondition: text(row.completionCondition), sourceRef: reference(row.sourceRef) } }
const normalizeReceipt = (value) => { const row = exact(value, RECEIPT_KEYS, 'receipt_shape_invalid'); return { state: member(row.state, RECEIPT_STATES), sourceRef: reference(row.sourceRef), destinationEvidenceRef: nullable(row.destinationEvidenceRef, reference) } }
const normalizeSuccessor = (value) => { const row = exact(value, SUCCESSOR_KEYS, 'successor_shape_invalid'); return { owner: member(row.owner, new Set(['planner', 'builder', 'ux_product_qa', 'release_audit'])), deliverable: text(row.deliverable), sourceRef: reference(row.sourceRef) } }
const normalizeCheckpoint = (value) => { const row = exact(value, CHECKPOINT_KEYS, 'checkpoint_shape_invalid'); return { label: text(row.label), sourceRef: reference(row.sourceRef), eligibleSuccessor: nullable(row.eligibleSuccessor, normalizeSuccessor) } }
const normalizeReview = (value) => { const row = exact(value, REVIEW_KEYS, 'review_shape_invalid'); return { verdict: member(row.verdict, VERDICTS), authority: member(row.authority, REVIEW_AUTHORITIES), artifactRef: nullable(row.artifactRef, reference), evidenceRef: nullable(row.evidenceRef, reference), sourceRef: reference(row.sourceRef) } }
const normalizeRework = (value) => { const row = exact(value, REWORK_KEYS, 'rework_shape_invalid'); return { pathIdentity: identifier(row.pathIdentity), identicalFailureCount: integer(row.identicalFailureCount), correction: nullable(row.correction, text), fallback: nullable(row.fallback, text), sourceRef: reference(row.sourceRef) } }
const normalizeBoundary = (value) => { const row = exact(value, BOUNDARY_KEYS, 'boundary_shape_invalid'); return { kind: member(row.kind, new Set([...TRUE_CHERRY_BOUNDARIES, ...TECHNICAL_BOUNDARIES])), label: text(row.label), sourceRef: reference(row.sourceRef) } }
const normalizeContract = (value) => {
  if (value === null) return null
  const row = exact(value, CONTRACT_KEYS, 'contract_shape_invalid')
  return {
    predicateId: identifier(row.predicateId), eventId: nullable(row.eventId, identifier), checked: nullable(row.checked, normalizeFactInput),
    ownerInstruction: nullable(row.ownerInstruction, normalizeOwner), receipt: nullable(row.receipt, normalizeReceipt),
    nextCheckpoint: nullable(row.nextCheckpoint, normalizeCheckpoint), review: nullable(row.review, normalizeReview),
    rework: nullable(row.rework, normalizeRework), cherryBoundary: nullable(row.cherryBoundary, normalizeBoundary),
  }
}

export function projectExecutionLoopItems(value) {
  const source = exact(materialize(value), ROOT_KEYS)
  const currentStageId = nullable(source.currentStageId, identifier)
  if (!Array.isArray(source.predicates) || !Array.isArray(source.events)) fail('invalid_shape')
  const predicates = source.predicates.map(normalizePredicate)
  const events = source.events.map(normalizeEvent)
  const contract = normalizeContract(source.contract)
  const open = currentStageId === null ? [] : predicates.filter((row) => row.stageId === currentStageId && !row.closed)
  if (open.length === 0) return deepFreeze([])
  if (open.length !== 1) return deepFreeze([safeHoldItem('predicate_correlation_ambiguous')])
  const predicate = open[0]
  const relevant = events.filter((row) => row.predicateId === predicate.id && OWNER_ROLES.has(row.role))
  if (relevant.length > 1 || contract && contract.predicateId !== predicate.id) return deepFreeze([safeHoldItem('item_correlation_ambiguous')])
  let correlatedEvent = relevant[0] ?? null
  if (contract?.eventId !== null && contract?.eventId !== undefined) {
    const matches = events.filter((row) => row.id === contract.eventId && row.predicateId === predicate.id && OWNER_ROLES.has(row.role))
    if (matches.length !== 1 || relevant.length !== 1) return deepFreeze([safeHoldItem('event_correlation_ambiguous')])
    correlatedEvent = matches[0]
  }
  if (contract?.ownerInstruction && (!correlatedEvent || contract.ownerInstruction.owner !== correlatedEvent.role)) return deepFreeze([safeHoldItem('owner_correlation_conflict')])

  const gateRef = `gate:${predicate.id}`
  const checked = contract?.checked
    ? fact('known', contract.checked.label, contract.checked.sourceRef)
    : fact('missing', null, gateRef, 'checked_evidence_missing')
  const missing = fact('known', `${predicate.id} · ${predicate.title}`, gateRef)
  const ownerInstruction = contract?.ownerInstruction
    ? fact('known', `${roleLabel(contract.ownerInstruction.owner)} · ${contract.ownerInstruction.deliverable} · ${contract.ownerInstruction.completionCondition}`, contract.ownerInstruction.sourceRef)
    : fact('missing', null, correlatedEvent ? `event:${correlatedEvent.id}:${correlatedEvent.sequence}` : gateRef, 'owner_instruction_missing')

  let receiptState = fact('unknown', '전달 상태 확인 불가', contract?.receipt?.sourceRef ?? (correlatedEvent ? `event:${correlatedEvent.id}:${correlatedEvent.sequence}` : null), 'receipt_evidence_missing')
  if (contract?.receipt) {
    if (['accepted', 'delivery_unknown'].includes(contract.receipt.state) || contract.receipt.destinationEvidenceRef === null) receiptState = fact('unknown', '전달 상태 확인 불가', contract.receipt.sourceRef, 'destination_evidence_missing')
    else receiptState = fact('known', contract.receipt.state === 'received' ? '목적지 수신 확인' : '목적지 착수 확인', contract.receipt.destinationEvidenceRef)
  }

  let itemState = 'ready'
  let reviewResult = fact('missing', null, null, 'review_missing')
  if (contract?.review) {
    if (!contract.review.artifactRef || !contract.review.evidenceRef) {
      reviewResult = fact('safe_hold', null, contract.review.sourceRef, 'review_evidence_missing')
      itemState = 'safe_hold'
    } else reviewResult = fact('known', `${roleLabel(contract.review.authority)} · ${contract.review.verdict} · ${contract.review.artifactRef} · ${contract.review.evidenceRef}`, contract.review.sourceRef)
  } else if (correlatedEvent?.type === 'result_observed') {
    reviewResult = fact('safe_hold', null, `event:${correlatedEvent.id}:${correlatedEvent.sequence}`, 'review_evidence_missing')
    itemState = 'safe_hold'
  }

  let nextCheckpoint = contract?.nextCheckpoint
    ? fact('known', contract.nextCheckpoint.label, contract.nextCheckpoint.sourceRef)
    : fact('known', `${predicate.id} 불변 근거`, gateRef)
  if (contract?.nextCheckpoint?.eligibleSuccessor) {
    if (contract.review?.verdict !== 'PASS' || reviewResult.state !== 'known') {
      nextCheckpoint = fact('safe_hold', null, contract.nextCheckpoint.sourceRef, 'successor_without_review_pass')
      itemState = 'safe_hold'
    } else {
      const successor = contract.nextCheckpoint.eligibleSuccessor
      nextCheckpoint = fact('known', `${contract.nextCheckpoint.label} · ${roleLabel(successor.owner)} · ${successor.deliverable} · 시작되지 않음`, contract.nextCheckpoint.sourceRef)
    }
  }

  let reworkState = fact('not_applicable', '교정 또는 대체 경로 없음', null)
  if (contract?.rework) {
    const row = contract.rework
    if (row.identicalFailureCount <= 1 && row.correction && !row.fallback) reworkState = fact('known', `${row.pathIdentity} · 1회 한정 교정 · ${row.correction}`, row.sourceRef)
    else if (row.identicalFailureCount > 1 && row.fallback) reworkState = fact('known', `${row.pathIdentity} · 반복 실패 · 대체 경로: ${row.fallback}`, row.sourceRef)
    else {
      reworkState = fact('safe_hold', null, row.sourceRef, row.identicalFailureCount > 1 ? 'fallback_required' : 'bounded_correction_invalid')
      itemState = 'safe_hold'
    }
  }

  const boundary = contract?.cherryBoundary
  const cherryBoundary = boundary && TRUE_CHERRY_BOUNDARIES.has(boundary.kind) ? fact('known', boundary.label, boundary.sourceRef) : null
  return deepFreeze([{
    itemId: `execution-item-${predicate.id.toLowerCase()}`, state: itemState, checked, missing, ownerInstruction, receiptState,
    nextCheckpoint, reviewResult, reworkState, cherryBoundary, completionAuthority: false,
  }])
}
