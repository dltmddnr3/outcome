import type { PrivateModelV2Projection } from '../lib/api'

const stateCopy: Record<PrivateModelV2Projection['state'], string> = {
  loading: '새 관측을 확인하는 중',
  ready: '다음 경계가 준비됨',
  stale: '마지막 관측 결과',
  conflict: '서로 충돌하는 근거',
  blocked: '차단 경계 확인 필요',
  delivery_unknown: '전달 상태를 확인할 수 없음',
  no_active_work: '현재 활성 작업 없음',
}

export function CurrentProjection({ projection }: { projection: PrivateModelV2Projection }) {
  return <section className="current-projection" aria-labelledby="current-projection-title" data-projection-state={projection.state} data-completion-authority="false">
    <header className="current-projection__header">
      <div><span>Model v2 · 서버 관측</span><h2 id="current-projection-title">Current Projection</h2></div>
      <strong>{stateCopy[projection.state]}</strong>
    </header>
    <div className="current-projection__sequence">
      <article data-projection-field="destination"><small>Destination</small><h3>{projection.destination?.label ?? '정의된 Destination 없음'}</h3></article>
      <article data-projection-field="gap"><small>남은 완료 조건</small><strong>{projection.remainingAcceptanceGap.remaining} / {projection.remainingAcceptanceGap.total}</strong></article>
      <article data-projection-field="now"><small>Now</small><strong>{stateCopy[projection.now.state]}</strong><span>{projection.now.observedAt}</span></article>
      <article data-projection-field="boundary"><small>다음 경계</small>{projection.readyBoundary.length ? <ul>{projection.readyBoundary.map((boundary) => <li key={boundary}>{boundary}</li>)}</ul> : <p>준비된 경계 없음</p>}{projection.nextAction && <p className="current-projection__next-action">{projection.nextAction}</p>}</article>
      {projection.cherryAction !== null && <article data-projection-field="cherry-action"><small>Cherry action</small><strong>{projection.cherryAction}</strong></article>}
    </div>
  </section>
}
