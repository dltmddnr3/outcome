import type { PrivateExecutionLoopFact, PrivateModelV2Projection } from '../lib/api'
import { SingleSessionObservation } from './SingleSessionObservation'
import { ConnectionInventory } from './ConnectionInventory'
import { outcomeDisplayLabel } from '../lib/outcome-display-copy'

const stateCopy: Record<PrivateModelV2Projection['state'], string> = {
  loading: '새 정보를 확인하고 있습니다',
  ready: '다음 단계 준비됨',
  stale: '이전 확인 내용입니다',
  conflict: '진행 기록이 서로 다릅니다',
  blocked: '진행을 막는 조건이 있습니다',
  delivery_unknown: '전달 여부를 확인하지 못했습니다',
  no_active_work: '확인된 활성 작업이 없습니다',
}

const stateExplanation: Record<PrivateModelV2Projection['state'], string> = {
  loading: '새 정보가 확인되기 전에는 현재 상황을 확정할 수 없습니다.',
  ready: '다음 단계가 준비됐습니다. 결과가 완성됐다는 뜻은 아닙니다.',
  stale: '마지막 확인 이후 달라진 내용은 아직 알 수 없습니다.',
  conflict: '기록을 대조하기 전에는 현재 위치를 확정할 수 없습니다.',
  blocked: '남은 조건과 확인된 다음 행동을 살펴봐 주세요.',
  delivery_unknown: '실패로 확정된 것은 아닙니다. 다시 보내기 전에 기존 전달 기록을 확인해야 합니다.',
  no_active_work: '확인된 작업이 없다는 뜻이며, 프로젝트 완료를 의미하지 않습니다.',
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

export function observationTimeLabel(value: string): string {
  // Only format timestamps carrying an explicit offset; never assume the device zone.
  if (!/(?:Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value))) return '확인 시각을 해석할 수 없습니다'
  const parts = Object.fromEntries(new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit', hourCycle: 'h23', numberingSystem: 'latn' }).formatToParts(new Date(value)).map(part => [part.type, part.value]))
  const hour = Number(parts.hour)
  return `${parts.year}년 ${Number(parts.month)}월 ${Number(parts.day)}일 ${hour < 12 ? '오전' : '오후'} ${hour % 12 || 12}:${parts.minute} · 한국 시간`
}

export function CurrentProjection({ projection, workObservation, hasResultRecord }: { projection: PrivateModelV2Projection; workObservation?: unknown; hasResultRecord?: boolean }) {
  return <section className="current-projection" aria-labelledby="current-projection-title" data-projection-state={projection.state} data-completion-authority="false">
    <header className="current-projection__header">
      <div><h2 id="current-projection-title">현재 상황</h2></div>
      <strong>{stateCopy[projection.state]}</strong>
    </header>
    <div className="current-projection__sequence">
      <article data-projection-field="destination"><small>이 프로젝트가 원하는 결과</small><h3>{projection.destination ? outcomeDisplayLabel(projection.project.id, projection.destination.label) : '목표가 아직 정해지지 않았습니다'}</h3><p>{stateExplanation[projection.state]}</p></article>
      <article data-projection-field="gap"><small>남은 완료 조건</small><strong>{projection.remainingAcceptanceGap.remaining} / {projection.remainingAcceptanceGap.total}</strong></article>
      <article data-projection-field="now"><small>마지막 확인</small>{projection.now.state !== projection.state && <strong>{stateCopy[projection.now.state]}</strong>}<time dateTime={projection.now.observedAt}>{observationTimeLabel(projection.now.observedAt)}</time></article>
      {hasResultRecord !== undefined && <article data-projection-field="result"><small>결과 확인</small>{hasResultRecord ? <><p>결과 기록이 있습니다. 실제 사용 가능 여부는 별도 확인이 필요합니다.</p><a href="#oc-result-view">결과 기록으로 이동</a></> : <p>현재 화면에서 결과 기록을 확인할 수 없습니다. 결과가 없다는 뜻은 아닙니다.</p>}</article>}
      <article data-projection-field="boundary"><small>다음 단계</small>{projection.readyBoundaryLabels.length ? <ul>{projection.readyBoundaryLabels.map((label) => <li key={label}>{outcomeDisplayLabel(projection.project.id, label)}</li>)}</ul> : <p>준비된 다음 단계가 아직 없습니다</p>}{projection.nextActionLabel && <p className="current-projection__next-action">{projection.nextActionLabel}</p>}</article>
      {projection.cherryActionLabel !== null ? <article data-projection-field="cherry-action"><small>지금 필요한 결정</small><strong>{projection.cherryActionLabel}</strong></article> : <p>확인된 결정 요청이 없습니다</p>}
      <details className="current-projection__details">
      <summary>진행 근거와 연결 상태</summary>
      <p>원본 확인 시각 · <time dateTime={projection.now.observedAt}>{projection.now.observedAt}</time></p>
      <SingleSessionObservation key={projection.project.id} projectId={projection.project.id} observation={workObservation} />
      <ConnectionInventory key={`connections-${projection.project.id}`} projectId={projection.project.id} />
      {(projection.executionLoopItems ?? []).slice(0, 1).map((item) => <article key={item.itemId} data-projection-field="execution-loop" data-item-state={item.state} data-completion-authority="false">
        <dl>
          <dt>확인한 근거</dt><dd>{factCopy(item.checked, '확인 근거 없음')}</dd>
          <dt>미이행</dt><dd>{factCopy(item.missing, '미이행 없음')}</dd>
          <dt>담당자 지시</dt><dd>{factCopy(item.ownerInstruction, '담당자 지시 없음')}</dd>
          <dt>수신·착수</dt><dd>{factCopy(item.receiptState, '수신·착수 근거 없음')}</dd>
          <dt>다음 확인</dt><dd>{factCopy(item.nextCheckpoint, '다음 확인 없음')}</dd>
          <dt>검수 결과</dt><dd>{factCopy(item.reviewResult, '검수 근거 없음')}</dd>
          <dt>보완·대체 경로</dt><dd>{factCopy(item.reworkState, '보완·대체 경로 없음')}</dd>
          <dt>소유자 결정</dt><dd>{factCopy(item.cherryBoundary, '확인된 소유자 결정 없음')}</dd>
        </dl>
      </article>)}
      </details>
    </div>
  </section>
}
