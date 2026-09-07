import assert from 'node:assert/strict'
import test from 'node:test'
import { projectExecutionLoopItems } from './outcome-execution-loop-projection.mjs'

const predicate = (overrides = {}) => ({ id: 'B1', stageId: 'milestone-one', title: '서버 근거를 확인한다', closed: false, evidence: null, ...overrides })
const event = (overrides = {}) => ({ id: 'event-builder-1', sequence: 1, predicateId: 'B1', role: 'builder', type: 'work_observed', status: 'observed', summary: 'Builder 근거 확인', ...overrides })
const contract = (overrides = {}) => ({
  predicateId: 'B1',
  eventId: 'event-builder-1',
  checked: null,
  ownerInstruction: { owner: 'builder', deliverable: '서버 근거 영수증', completionCondition: 'B1 근거가 고정되어 닫힘', sourceRef: 'instruction:builder:b1' },
  receipt: { state: 'accepted', sourceRef: 'dispatch:event-builder-1', destinationEvidenceRef: null },
  nextCheckpoint: { label: 'B1 불변 근거', sourceRef: 'gate:B1', eligibleSuccessor: null },
  review: null,
  rework: null,
  cherryBoundary: null,
  ...overrides,
})
const input = (overrides = {}) => ({ currentStageId: 'milestone-one', predicates: [predicate()], events: [event()], contract: contract(), ...overrides })

test('projects at most one exact item and keeps every shared fact explicit', () => {
  const rows = projectExecutionLoopItems(input())
  assert.equal(rows.length, 1)
  assert.deepEqual(Object.keys(rows[0]), ['itemId', 'state', 'checked', 'missing', 'ownerInstruction', 'receiptState', 'nextCheckpoint', 'reviewResult', 'reworkState', 'cherryBoundary', 'completionAuthority'])
  assert.equal(rows[0].itemId, 'execution-item-b1')
  assert.equal(rows[0].state, 'ready')
  assert.deepEqual(rows[0].checked, { state: 'missing', value: null, sourceRef: 'gate:B1', reasonCode: 'checked_evidence_missing' })
  assert.deepEqual(rows[0].missing, { state: 'known', value: 'B1 · 서버 근거를 확인한다', sourceRef: 'gate:B1', reasonCode: null })
  assert.equal(rows[0].ownerInstruction.value, 'Builder · 서버 근거 영수증 · B1 근거가 고정되어 닫힘')
  assert.deepEqual(rows[0].receiptState, { state: 'unknown', value: '전달 상태 확인 불가', sourceRef: 'dispatch:event-builder-1', reasonCode: 'destination_evidence_missing' })
  assert.equal(rows[0].nextCheckpoint.value, 'B1 불변 근거')
  assert.equal(rows[0].reviewResult.state, 'missing')
  assert.equal(rows[0].reworkState.state, 'not_applicable')
  assert.equal(rows[0].cherryBoundary, null)
  assert.equal(rows[0].completionAuthority, false)
  assert.equal(Object.isFrozen(rows[0]), true)
  assert.equal(Object.isFrozen(rows[0].ownerInstruction), true)
})

test('product vocabulary with session and provider hyphens remains public-safe', () => {
  const stageId = 'outcome-stage-phase3-private-session-registry'
  const rows = projectExecutionLoopItems(input({
    currentStageId: stageId,
    predicates: [predicate({ stageId, title: 'provider-neutral auth와 session-expired 상태를 검증한다' })],
  }))
  assert.equal(rows.length, 1)
  assert.equal(rows[0].missing.value, 'B1 · provider-neutral auth와 session-expired 상태를 검증한다')
})

test('activity alone changes no evidence progress review or completion fact', () => {
  const quiet = projectExecutionLoopItems(input({ events: [event({ status: 'observed' })] }))[0]
  const active = projectExecutionLoopItems(input({ events: [event({ status: 'active' })] }))[0]
  for (const key of ['checked', 'missing', 'reviewResult', 'nextCheckpoint', 'cherryBoundary', 'completionAuthority']) assert.deepEqual(active[key], quiet[key])
  assert.equal(JSON.stringify(active).includes('완료'), false)
})

test('accepted send is unknown and received or started require destination evidence', () => {
  const receipt = (state, destinationEvidenceRef) => contract({ receipt: { state, sourceRef: 'dispatch:event-builder-1', destinationEvidenceRef } })
  for (const state of ['accepted', 'received', 'started']) {
    const value = projectExecutionLoopItems(input({ contract: receipt(state, null) }))[0].receiptState
    assert.equal(value.state, 'unknown')
    assert.equal(value.reasonCode, 'destination_evidence_missing')
  }
  assert.equal(projectExecutionLoopItems(input({ contract: receipt('received', 'destination:receipt-one') }))[0].receiptState.value, '목적지 수신 확인')
  assert.equal(projectExecutionLoopItems(input({ contract: receipt('started', 'destination:start-one') }))[0].receiptState.value, '목적지 착수 확인')
})

test('terminal result without artifact evidence is safe hold and cannot imply completion', () => {
  const review = { verdict: 'PASS', authority: 'ux_product_qa', artifactRef: null, evidenceRef: null, sourceRef: 'review:qa-one' }
  const value = projectExecutionLoopItems(input({ events: [event({ type: 'result_observed', status: 'observed' })], contract: contract({ review }) }))[0]
  assert.equal(value.state, 'safe_hold')
  assert.deepEqual(value.reviewResult, { state: 'safe_hold', value: null, sourceRef: 'review:qa-one', reasonCode: 'review_evidence_missing' })
  assert.equal(value.reworkState.state, 'not_applicable')
  assert.equal(JSON.stringify(value).includes('완료'), false)
  assert.equal(JSON.stringify(value).includes('started successor'), false)
})

test('evidence-backed SAFE_HOLD review forces an explicit item and rework hold', () => {
  const review = { verdict: 'SAFE_HOLD', authority: 'ux_product_qa', artifactRef: 'artifact:candidate-one', evidenceRef: 'evidence:qa-one', sourceRef: 'review:qa-one' }
  const value = projectExecutionLoopItems(input({
    events: [event({ type: 'result_observed', status: 'safe_hold' })],
    contract: contract({
      checked: { label: 'B1 고정 근거 확인', sourceRef: 'evidence:builder-one' },
      receipt: { state: 'received', sourceRef: 'dispatch:event-builder-1', destinationEvidenceRef: 'destination:receipt-one' },
      review,
      rework: null,
    }),
  }))[0]
  assert.equal(value.state, 'safe_hold')
  assert.deepEqual(value.reviewResult, { state: 'known', value: 'UX & Product QA · SAFE_HOLD · artifact:candidate-one · evidence:qa-one', sourceRef: 'review:qa-one', reasonCode: null })
  assert.deepEqual(value.reworkState, { state: 'safe_hold', value: '안전 보류 · 교정 또는 대체 경로 확인 필요', sourceRef: 'review:qa-one', reasonCode: 'review_safe_hold_rework_required' })
  assert.equal(value.completionAuthority, false)
})

test('evidence-backed FAIL and SAFE_HOLD mismatch remain explicit fail-closed rework boundaries', () => {
  for (const [verdict, status, reasonCode] of [
    ['FAIL', 'failed', 'review_fail_rework_required'],
    ['SAFE_HOLD', 'observed', 'review_safe_hold_rework_required'],
  ]) {
    const review = { verdict, authority: 'release_audit', artifactRef: 'artifact:candidate-one', evidenceRef: 'evidence:audit-one', sourceRef: 'review:audit-one' }
    const value = projectExecutionLoopItems(input({ events: [event({ type: 'result_observed', status })], contract: contract({ review }) }))[0]
    assert.equal(value.state, 'safe_hold')
    assert.equal(value.reviewResult.value, `Release Audit · ${verdict} · artifact:candidate-one · evidence:audit-one`)
    assert.equal(value.reworkState.state, 'safe_hold')
    assert.equal(value.reworkState.sourceRef, 'review:audit-one')
    assert.equal(value.reworkState.reasonCode, reasonCode)
    assert.match(value.reworkState.value, /교정 또는 대체 경로 확인 필요/)
  }
})

test('evidence-backed PASS names the checkpoint and eligible successor only as not started', () => {
  const review = { verdict: 'PASS', authority: 'ux_product_qa', artifactRef: 'artifact:candidate-one', evidenceRef: 'evidence:qa-one', sourceRef: 'review:qa-one' }
  const nextCheckpoint = { label: 'Release Audit 근거', sourceRef: 'gate:A1', eligibleSuccessor: { owner: 'release_audit', deliverable: 'A1 감사', sourceRef: 'successor:a1' } }
  const value = projectExecutionLoopItems(input({ events: [event({ type: 'result_observed', status: 'observed' })], contract: contract({ review, nextCheckpoint }) }))[0]
  assert.equal(value.reviewResult.value, 'UX & Product QA · PASS · artifact:candidate-one · evidence:qa-one')
  assert.equal(value.nextCheckpoint.value, 'Release Audit 근거 · Release Audit · A1 감사 · 시작되지 않음')
  assert.equal(value.receiptState.value, '전달 상태 확인 불가')
  assert.equal(value.state, 'ready')
  assert.equal(value.reworkState.state, 'not_applicable')
  assert.equal(JSON.stringify(value).includes('완료'), false)
  assert.equal(value.completionAuthority, false)
})

test('repeated same-path failure exposes one correction then fallback or safe hold', () => {
  const rework = (identicalFailureCount, correction, fallback) => ({ pathIdentity: 'path-one', identicalFailureCount, correction, fallback, sourceRef: 'rework:path-one' })
  const first = projectExecutionLoopItems(input({ contract: contract({ rework: rework(1, '근거 연결 교정', null) }) }))[0]
  assert.equal(first.reworkState.value, 'path-one · 1회 한정 교정 · 근거 연결 교정')
  const repeated = projectExecutionLoopItems(input({ contract: contract({ rework: rework(2, '근거 연결 교정', null) }) }))[0]
  assert.equal(repeated.state, 'safe_hold')
  assert.equal(repeated.reworkState.reasonCode, 'fallback_required')
  const fallback = projectExecutionLoopItems(input({ contract: contract({ rework: rework(2, '근거 연결 교정', '읽기 전용 보류 경로') }) }))[0]
  assert.equal(fallback.reworkState.value, 'path-one · 반복 실패 · 대체 경로: 읽기 전용 보류 경로')
  assert.equal(fallback.reworkState.value.includes('2회 교정'), false)
})

test('technical defaults never become a Cherry boundary', () => {
  for (const kind of ['source_revision', 'delivery_unknown', 'envelope_renewal', 'generic_blocker']) {
    const cherryBoundary = { kind, label: '기술 복구', sourceRef: 'boundary:technical' }
    assert.equal(projectExecutionLoopItems(input({ contract: contract({ cherryBoundary }) }))[0].cherryBoundary, null)
  }
  const cherryBoundary = { kind: 'acceptance', label: '후보 결과 수용', sourceRef: 'boundary:acceptance' }
  assert.deepEqual(projectExecutionLoopItems(input({ contract: contract({ cherryBoundary }) }))[0].cherryBoundary, { state: 'known', value: '후보 결과 수용', sourceRef: 'boundary:acceptance', reasonCode: null })
})

test('zero candidates is empty and plural contradictory correlation is one safe hold', () => {
  assert.deepEqual(projectExecutionLoopItems(input({ predicates: [predicate({ closed: true })] })), [])
  for (const hostile of [
    input({ predicates: [predicate(), predicate({ id: 'B2', title: '두 번째 조건' })] }),
    input({ events: [event(), event({ id: 'event-planner-2', sequence: 2, role: 'planner' })] }),
    input({ contract: contract({ predicateId: 'B2' }) }),
  ]) {
    const rows = projectExecutionLoopItems(hostile)
    assert.equal(rows.length, 1)
    assert.equal(rows[0].state, 'safe_hold')
    assert.equal(rows[0].ownerInstruction.value, null)
    assert.equal(rows[0].reviewResult.value, null)
    assert.equal(rows[0].cherryBoundary, null)
  }
})

test('rejects every unexpected or non-data own array property before getters run', () => {
  let traps = 0
  const hiddenPredicates = input()
  Object.defineProperty(hiddenPredicates.predicates, 'unexpectedHidden', { value: true })
  const hiddenEvents = input()
  Object.defineProperty(hiddenEvents.events, 'unexpectedHidden', { value: true })
  const symbolKey = input()
  symbolKey.predicates[Symbol('unexpected')] = true
  const nonEnumerableIndex = input()
  Object.defineProperty(nonEnumerableIndex.predicates, '0', { value: predicate(), enumerable: false })
  const sparse = input()
  sparse.events.length = 2
  const accessorPredicate = input()
  Object.defineProperty(accessorPredicate.predicates, '0', { enumerable: true, get() { traps += 1; return predicate() } })
  const accessorEvent = input()
  Object.defineProperty(accessorEvent.events, '0', { enumerable: true, get() { traps += 1; return event() } })
  for (const value of [hiddenPredicates, hiddenEvents, symbolKey, nonEnumerableIndex, sparse, accessorPredicate, accessorEvent]) {
    assert.throws(() => projectExecutionLoopItems(value), /execution_loop_/)
  }
  assert.equal(traps, 0)
})

test('rejects recursive privacy and hostile shapes before traps', () => {
  let traps = 0
  const proxy = new Proxy(input(), { get() { traps += 1 }, ownKeys() { traps += 1 }, getOwnPropertyDescriptor() { traps += 1 }, getPrototypeOf() { traps += 1 } })
  const accessor = { currentStageId: 'milestone-one', predicates: [], events: [], contract: null }
  Object.defineProperty(accessor, 'contract', { enumerable: true, get() { traps += 1; return null } })
  const accessorArray = input()
  Object.defineProperty(accessorArray.predicates, '0', { enumerable: true, get() { traps += 1; return predicate() } })
  const cycle = input(); cycle.contract.self = cycle
  const symbol = input(); symbol.contract[Symbol('private')] = 'hidden'
  const variants = [proxy, accessor, accessorArray, cycle, symbol, { ...input(), extra: true }]
  for (const value of variants) assert.throws(() => projectExecutionLoopItems(value), /execution_loop_/)
  assert.equal(traps, 0)
  for (const privateValue of ['/Users/private/result', 'a'.repeat(40), 'b'.repeat(64), 'raw_prompt=hidden', 'credential=hidden', 'thread_private_123', 'thread:abcd', 'provider:abcde']) {
    assert.throws(() => projectExecutionLoopItems(input({ contract: contract({ checked: { label: privateValue, sourceRef: 'evidence:one' } }) })), /execution_loop_private/)
  }
})
