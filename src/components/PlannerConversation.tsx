import { createContext, useContext, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { fetchPrivateChatTimeline, submitPrivatePlannerMessage, type PrivateChatEvent, type PrivateModelV2Event } from '../lib/api'

export const PlannerConversationSession = createContext<{ sessionCredential?: string } | null>(null)
export const roleChatFilters = ['전체', 'Planner', 'Builder', 'UX & Product QA', 'Release Audit'] as const
export const roleChatFixtureStates = ['ready', 'streaming', 'tool-running', 'waiting-approval', 'offline-reconnecting', 'permission-absent', 'unbound-stale', 'delivery_unknown'] as const
export type RoleChatFilter = (typeof roleChatFilters)[number]
export type RoleChatFixtureState = (typeof roleChatFixtureStates)[number]
type Role = PrivateModelV2Event['role']

const typeCopy: Record<PrivateModelV2Event['type'], string> = { work_observed: '작업 관측', result_observed: '결과 관측', boundary_observed: '경계 관측' }
const statusCopy: Record<PrivateModelV2Event['status'], string> = { observed: '관측됨', active: '관측된 작업 진행', blocked: '차단됨', delivery_unknown: '전달 상태 확인 불가', failed: '실패', rejected: '거부됨', safe_hold: '안전 보류' }
const roleCopy: Record<Role, string> = { planner: 'Planner', builder: 'Builder', ux_product_qa: 'UX & Product QA', release_audit: 'Release Audit' }
const filterRole: Record<RoleChatFilter, Role | null> = { '전체': null, Planner: 'planner', Builder: 'builder', 'UX & Product QA': 'ux_product_qa', 'Release Audit': 'release_audit' }
const deliveryCopy = { queued: '전송 대기', acknowledged: '목적지 접수 확인', delivery_unknown: '전달 상태 확인 불가', rejected: '메시지 거부됨', failed: '전송 실패' } as const
type DeliveryState = keyof typeof deliveryCopy
const fixturePresentation: Record<RoleChatFixtureState, { label: string; detail: string; writable: boolean }> = {
  ready: { label: '준비됨', detail: 'Planner에게 메시지를 보낼 준비가 되었습니다.', writable: true }, streaming: { label: '응답 수신 중', detail: 'Planner 응답을 받고 있습니다.', writable: false }, 'tool-running': { label: '도구 실행 중', detail: 'Planner가 도구 결과를 기다리고 있습니다.', writable: false }, 'waiting-approval': { label: '승인 대기', detail: 'Cherry의 명시적 승인이 필요합니다.', writable: false }, 'offline-reconnecting': { label: '오프라인 · 재연결 중', detail: '연결이 복구될 때까지 전송하지 않습니다.', writable: false }, 'permission-absent': { label: '권한 없음', detail: 'Planner 전송 권한이 없습니다.', writable: false }, 'unbound-stale': { label: '연결 없음 · 관측 오래됨', detail: '현재 Planner binding 근거가 없습니다.', writable: false }, delivery_unknown: { label: '전달 상태 확인 불가', detail: '전달 근거를 확인하기 전에는 자동 재전송하지 않습니다.', writable: false },
}

export function createMessageIdempotencyKey(random = (bytes: Uint8Array) => crypto.getRandomValues(bytes)) { return `message-${[...random(new Uint8Array(8))].map((value) => value.toString(16).padStart(2, '0')).join('')}` }
export function sensitiveContentHint(value: string) { const text = value.normalize('NFKC'); return /(?:\b(?:bearer|basic)\s+\S+|-----BEGIN .*PRIVATE KEY-----|\b(?:api[_ -]?key|token|secret|password|authorization|credential)\s*[:=]\s*\S+|\b(?:sk|pk|ghp|github_pat|xox[baprs]|vercel|sb_secret|sk_live)[-_][A-Za-z0-9_-]{8,})/i.test(text) }
export function boundedComposerDraft(current: string, next: string) { return [...next].length <= 4_000 ? next : current }
export function validatePrivateTimeline(events: PrivateChatEvent[]) { const ids = new Set<string>(); let prior = 0, priorTime = ''; for (const event of events) { const time = Date.parse(event.observed_at); if (event.sequence !== prior + 1 || ids.has(event.event_id) || event.kind !== 'user_message' || event.state !== 'queued' || !Number.isFinite(time) || new Date(time).toISOString() !== event.observed_at || priorTime && event.observed_at < priorTime) throw new Error('timeline_conflict'); ids.add(event.event_id); prior = event.sequence; priorTime = event.observed_at } return events }

export function PlannerConversation({ events, plannerBound = false, onSend, fixtureState, fixtureTimeline, initialFilter = '전체' }: { events: PrivateModelV2Event[]; plannerBound?: boolean; onSend?: (message: string) => void; fixtureState?: RoleChatFixtureState; fixtureTimeline?: PrivateChatEvent[]; initialFilter?: RoleChatFilter }) {
  const session = useContext(PlannerConversationSession)
  const [filter, setFilter] = useState<RoleChatFilter>(initialFilter)
  const [timeline, setTimeline] = useState<PrivateChatEvent[]>(fixtureTimeline ?? []), [draft, setDraft] = useState(''), [csrf, setCsrf] = useState<string | null>(null)
  const [availability, setAvailability] = useState<'loading' | 'ready' | 'chat_unavailable' | 'conflict'>('loading'), [delivery, setDelivery] = useState<DeliveryState | null>(null), [retryAvailable, setRetryAvailable] = useState(false)
  const pending = useRef(false), textarea = useRef<HTMLTextAreaElement>(null)
  const ordered = [...events].sort((a, b) => a.sequence - b.sequence)
  const selectedRole = filterRole[filter]
  const visible = selectedRole ? ordered.filter((event) => event.role === selectedRole) : ordered
  const fixture = fixtureState ? fixturePresentation[fixtureState] : null
  const eligibleLens = filter === '전체' || filter === 'Planner'
  const injectedWritable = plannerBound && Boolean(onSend) && (!fixture || fixture.writable)
  const runtimeWritable = availability === 'ready' && Boolean(csrf)
  const writable = eligibleLens && (injectedWritable || runtimeWritable)
  const refresh = async () => { try { const value = await fetchPrivateChatTimeline('outcome', 0, session?.sessionCredential); setTimeline(validatePrivateTimeline(value.events)); setCsrf(value.csrf); setAvailability('ready') } catch (error) { setAvailability(error instanceof Error && error.message === 'timeline_conflict' ? 'conflict' : 'chat_unavailable') } }
  useEffect(() => { if (!fixtureState && !onSend) void refresh() }, [fixtureState, onSend, session?.sessionCredential])
  const submit = async () => {
    const message = draft.trim()
    if (pending.current || !writable || !message || [...draft].length > 4_000) return
    if (injectedWritable) { onSend!(message); setDraft(''); return }
    if (!csrf) return
    pending.current = true; setDelivery('queued'); setRetryAvailable(false)
    try { const result = await submitPrivatePlannerMessage('outcome', draft, csrf, createMessageIdempotencyKey(), session?.sessionCredential); setDelivery(result.delivery); setRetryAvailable(['delivery_unknown', 'failed'].includes(result.delivery)); if (result.delivery === 'acknowledged') setDraft(''); await refresh() }
    catch (error) { setDelivery(error instanceof Error && error.message === 'sensitive_content_rejected' ? 'rejected' : 'failed'); setRetryAvailable(!(error instanceof Error && error.message === 'sensitive_content_rejected')) }
    finally { pending.current = false; textarea.current?.focus() }
  }
  const onSubmit = (event: FormEvent) => { event.preventDefault(); void submit() }
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => { if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) { event.preventDefault(); void submit() } }
  const overLimit = [...draft].length > 4_000, sensitive = sensitiveContentHint(draft), disabled = !writable || pending.current || !draft.trim() || overLimit || sensitive
  return <section className="planner-conversation" aria-labelledby="planner-conversation-title" data-observed-events={events.length} data-chat-availability={availability} data-role-chat-state={fixtureState} data-fixture-boundary={fixture || fixtureTimeline ? 'non-production' : undefined}>
    <header><div><span>프로젝트 대화 · 단일 관측 스트림</span><h2 id="planner-conversation-title">Planner conversation</h2></div><strong>{writable ? 'Planner 연결됨' : '읽기 전용'}</strong></header>
    <nav className="planner-conversation__filters" aria-label="역할 대화 필터">{roleChatFilters.map((label) => <button key={label} type="button" aria-pressed={filter === label} onClick={() => setFilter(label)}>{label}</button>)}</nav>
    {fixture && <div className="planner-conversation__state" role="status"><strong>{fixture.label}</strong><span>{fixture.detail}</span></div>}
    <p className="planner-conversation__boundary" data-non-progress-boundary="true">세션 활동은 진행률이 아닙니다.</p>
    {eligibleLens && timeline.length > 0 && <ol className="planner-conversation__messages" aria-label="서버에서 확인된 메시지">{timeline.map((event) => <li key={event.event_id} data-sequence={event.sequence}><div><strong>Cherry</strong><time dateTime={event.observed_at}>{event.observed_at}</time></div><p>{event.payload.private_content.text}</p><span>전송 대기 기록</span></li>)}</ol>}
    {visible.length === 0 ? <p className="planner-conversation__empty" role="status">아직 관측된 Planner 작업 이벤트가 없습니다</p> : <ol>{visible.map((event) => <li key={event.id} data-event-id={event.id} data-event-sequence={event.sequence} data-event-role={event.role} data-event-type={event.type} data-event-status={event.status}><div><strong>{roleCopy[event.role]} · {typeCopy[event.type]}</strong><time dateTime={event.observedAt}>{event.observedAt}</time></div><p>{event.summary}</p><span>{statusCopy[event.status]}</span>{event.role === 'release_audit' && <small>완료 판정 권한 없음.</small>}{event.status === 'delivery_unknown' && <small>전달 근거를 확인하기 전에는 자동 재전송하지 않습니다.</small>}</li>)}</ol>}
    {writable && <form className="planner-conversation__composer" data-planner-composer="true" onSubmit={onSubmit}><label htmlFor="planner-message">Planner에게 메시지</label><textarea ref={textarea} id="planner-message" rows={4} value={draft} aria-describedby="planner-message-help planner-message-status" onKeyDown={onKeyDown} onChange={(event) => setDraft((current) => boundedComposerDraft(current, event.target.value))} /><div id="planner-message-help"><span>⌘/Ctrl + Enter로 보내기 · Enter는 줄바꿈</span><span className={overLimit ? 'is-error' : ''}>{[...draft].length} / 4000</span></div>{sensitive && <p role="alert">민감할 수 있는 값이 감지되었습니다. 실제 자격 증명은 제거해 주세요.</p>}<div className="planner-conversation__actions"><button type="submit" data-touch-target="44" disabled={disabled}>메시지 보내기</button>{retryAvailable && <button type="button" data-touch-target="44" onClick={() => void submit()}>수동으로 다시 시도</button>}{!injectedWritable && <button type="button" data-touch-target="44" onClick={() => void refresh()}>새로고침</button>}</div><p id="planner-message-status" aria-live="polite">{delivery ? deliveryCopy[delivery] : availability === 'conflict' ? '대화 순서를 확인할 수 없습니다' : availability === 'chat_unavailable' ? '대화를 사용할 수 없습니다' : ''}</p></form>}
  </section>
}
