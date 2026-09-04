import { useState, type FormEvent } from 'react'
import type { PrivateModelV2Event } from '../lib/api'

export const roleChatFilters = ['전체', 'Planner', 'Builder', 'UX & Product QA', 'Release Audit'] as const
export const roleChatFixtureStates = ['ready', 'streaming', 'tool-running', 'waiting-approval', 'offline-reconnecting', 'permission-absent', 'unbound-stale', 'delivery_unknown'] as const
type Role = 'planner' | 'builder' | 'ux_product_qa' | 'release_audit'
type RoleChatEvent = PrivateModelV2Event & { id?: string; sequence?: number; role?: Role; completionAuthority?: false }

const typeCopy: Record<PrivateModelV2Event['type'], string> = { work_observed: '작업 관측', result_observed: '결과 관측', boundary_observed: '경계 관측' }
const statusCopy: Record<PrivateModelV2Event['status'], string> = { observed: '관측됨', active: '관측된 작업 진행', blocked: '차단됨', delivery_unknown: '전달 상태 확인 불가', failed: '실패', rejected: '거부됨', safe_hold: '안전 보류' }
const roleCopy: Record<Role, string> = { planner: 'Planner', builder: 'Builder', ux_product_qa: 'UX & Product QA', release_audit: 'Release Audit' }
const filterRole: Record<(typeof roleChatFilters)[number], Role | null> = { '전체': null, Planner: 'planner', Builder: 'builder', 'UX & Product QA': 'ux_product_qa', 'Release Audit': 'release_audit' }

export function PlannerConversation({ events, plannerBound = false, onSend }: { events: RoleChatEvent[]; plannerBound?: boolean; onSend?: (message: string) => void }) {
  const [filter, setFilter] = useState<(typeof roleChatFilters)[number]>('전체')
  const [draft, setDraft] = useState('')
  const ordered = events.map((event, index) => ({ ...event, id: event.id ?? `${event.observedAt}-${event.type}-${index}`, sequence: event.sequence ?? index, role: event.role ?? 'planner' as Role })).sort((a, b) => a.sequence - b.sequence)
  const selectedRole = filterRole[filter]
  const visible = selectedRole ? ordered.filter((event) => event.role === selectedRole) : ordered
  const writable = plannerBound && Boolean(onSend)
  const submit = (event: FormEvent) => { event.preventDefault(); const message = draft.trim(); if (!writable || !message) return; onSend!(message); setDraft('') }
  return <section className="planner-conversation" aria-labelledby="planner-conversation-title" data-observed-events={events.length}>
    <header><div><span>프로젝트 대화 · 단일 관측 스트림</span><h2 id="planner-conversation-title">Planner conversation</h2></div><strong>{writable ? 'Planner 연결됨' : '읽기 전용'}</strong></header>
    <nav className="planner-conversation__filters" aria-label="역할 대화 필터">{roleChatFilters.map((label) => <button key={label} type="button" aria-pressed={filter === label} onClick={() => setFilter(label)}>{label}</button>)}</nav>
    {visible.length === 0 ? <p className="planner-conversation__empty" role="status">아직 관측된 Planner 작업 이벤트가 없습니다</p> : <ol>{visible.map((event) => <li key={event.id} data-event-id={event.id} data-event-sequence={event.sequence} data-event-role={event.role} data-event-type={event.type} data-event-status={event.status}><div><strong>{roleCopy[event.role]} · {typeCopy[event.type]}</strong><time dateTime={event.observedAt}>{event.observedAt}</time></div><p>{event.summary}</p><span>{statusCopy[event.status]}</span>{event.role === 'release_audit' && <small>완료 판정 권한 없음 · 세션 활동은 진행률이 아닙니다.</small>}{event.status === 'delivery_unknown' && <small>전달 근거를 확인하기 전에는 자동 재전송하지 않습니다.</small>}</li>)}</ol>}
    {writable && <form className="planner-conversation__composer" data-planner-composer="true" onSubmit={submit}><label htmlFor="planner-message">Planner에게 메시지</label><textarea id="planner-message" value={draft} onChange={(event) => setDraft(event.target.value)} rows={3} /><button type="submit" disabled={!draft.trim()}>보내기</button></form>}
  </section>
}
