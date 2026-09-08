import type { PrivateExecutionLoopFact, PrivateModelV2Projection } from '../lib/api'
import { SingleSessionObservation } from './SingleSessionObservation'

const stateCopy: Record<PrivateModelV2Projection['state'], string> = {
  loading: '새 관측을 확인하는 중',
  ready: '다음 경계가 준비됨',
  stale: '마지막 관측 결과',
  conflict: '서로 충돌하는 근거',
  blocked: '차단 경계 확인 필요',
  delivery_unknown: '전달 상태를 확인할 수 없음',
  no_active_work: '현재 활성 작업 없음',
}

const missingCopy: Record<string, string> = {
  checked_evidence_missing: '확인 근거 없음',
  owner_instruction_missing: '담당자 지시 없음',
  receipt_evidence_missing: '수신·착수 근거 없음',
  destination_evidence_missing: '전달 상태 확인 불가',
  review_missing: '검수 근거 없음',
  review_evidence_missing: '검수 근거 없음 · 안전 보류',
  predicate_correlation_ambiguous: '대상 연결을 확정할 수 없음 · 안전 보류',
  item_correlation_ambiguous: '작업 연결을 확정할 수 없음 · 안전 보류',
  event_correlation_ambiguous: '전달 연결을 확정할 수 없음 · 안전 보류',
  owner_correlation_conflict: '담당자 연결 충돌 · 안전 보류',
  successor_without_review_pass: '검수 통과 전 다음 작업을 시작할 수 없음',
  fallback_required: '반복 실패의 대체 경로 필요 · 안전 보류',
  bounded_correction_invalid: '교정 범위를 확정할 수 없음 · 안전 보류',
}

const factCopy = (fact: PrivateExecutionLoopFact | null, empty: string) => fact?.value ?? (fact?.reasonCode ? missingCopy[fact.reasonCode] : null) ?? empty

export function CurrentProjection({ projection, workObservation }: { projection: PrivateModelV2Projection; workObservation?: unknown }) {
  return <section className="current-projection" aria-labelledby="current-projection-title" data-projection-state={projection.state} data-completion-authority="false">
    <header className="current-projection__header">
      <div><span>Model v2 · 서버 관측</span><h2 id="current-projection-title">Current Projection</h2></div>
      <strong>{stateCopy[projection.state]}</strong>
    </header>
    <div className="current-projection__sequence">
      <article data-projection-field="destination"><small>Destination</small><h3>{projection.destination?.label ?? '정의된 Destination 없음'}</h3></article>
      <article data-projection-field="gap"><small>남은 완료 조건</small><strong>{projection.remainingAcceptanceGap.remaining} / {projection.remainingAcceptanceGap.total}</strong></article>
      <article data-projection-field="now"><small>Now</small><strong>{stateCopy[projection.now.state]}</strong><span>{projection.now.observedAt}</span></article>
      <article data-projection-field="boundary"><small>다음 경계</small>{projection.readyBoundaryLabels.length ? <ul>{projection.readyBoundaryLabels.map((label) => <li key={label}>{label}</li>)}</ul> : <p>준비된 경계 없음</p>}{projection.nextActionLabel && <p className="current-projection__next-action">{projection.nextActionLabel}</p>}</article>
      {projection.cherryActionLabel !== null && <article data-projection-field="cherry-action"><small>Cherry action</small><strong>{projection.cherryActionLabel}</strong></article>}
      <SingleSessionObservation key={projection.project.id} projectId={projection.project.id} observation={workObservation} />
      {(projection.executionLoopItems ?? []).slice(0, 1).map((item) => <article key={item.itemId} data-projection-field="execution-loop" data-item-state={item.state} data-completion-authority="false">
        <dl>
          <dt>확인한 근거</dt><dd>{factCopy(item.checked, '확인 근거 없음')}</dd>
          <dt>미이행</dt><dd>{factCopy(item.missing, '미이행 없음')}</dd>
          <dt>담당자 지시</dt><dd>{factCopy(item.ownerInstruction, '담당자 지시 없음')}</dd>
          <dt>수신·착수</dt><dd>{factCopy(item.receiptState, '수신·착수 근거 없음')}</dd>
          <dt>다음 확인</dt><dd>{factCopy(item.nextCheckpoint, '다음 확인 없음')}</dd>
          <dt>검수 결과</dt><dd>{factCopy(item.reviewResult, '검수 근거 없음')}</dd>
          <dt>보완·대체 경로</dt><dd>{factCopy(item.reworkState, '보완·대체 경로 없음')}</dd>
          <dt>Cherry 결정</dt><dd>{factCopy(item.cherryBoundary, 'Cherry 결정 없음')}</dd>
        </dl>
      </article>)}
    </div>
  </section>
}
