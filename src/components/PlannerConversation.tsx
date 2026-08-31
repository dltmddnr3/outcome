import type { PrivateModelV2Event } from '../lib/api'

const typeCopy: Record<PrivateModelV2Event['type'], string> = {
  work_observed: 'Planner 작업 관측',
  result_observed: '결과 관측',
  boundary_observed: '경계 관측',
}

const statusCopy: Record<PrivateModelV2Event['status'], string> = {
  observed: '관측됨',
  active: '관측된 작업 진행',
  blocked: '차단됨',
  delivery_unknown: '전달 상태 확인 불가',
  failed: '실패',
  rejected: '거부됨',
  safe_hold: '안전 보류',
}

export function PlannerConversation({ events }: { events: PrivateModelV2Event[] }) {
  return <section className="planner-conversation" aria-labelledby="planner-conversation-title" data-observed-events={events.length}>
    <header><div><span>Planner · 서버 관측</span><h2 id="planner-conversation-title">Planner conversation</h2></div><strong>읽기 전용</strong></header>
    {events.length === 0 ? <p className="planner-conversation__empty" role="status">아직 관측된 Planner 작업 이벤트가 없습니다</p> : <ol>{events.map((event, index) => <li key={`${event.observedAt}-${event.type}-${index}`} data-event-type={event.type} data-event-status={event.status}><div><strong>{typeCopy[event.type]}</strong><time dateTime={event.observedAt}>{event.observedAt}</time></div><p>{event.summary}</p><span>{statusCopy[event.status]}</span></li>)}</ol>}
  </section>
}
