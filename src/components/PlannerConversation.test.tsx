import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PlannerConversation, roleChatFilters, roleChatFixtureStates, type RoleChatFilter, type RoleChatFixtureState } from './PlannerConversation'
import { isComposerSubmitShortcut, resolveConversationCredential, validatePrivateTimeline, hasCorrelatedPlannerAnswer } from './PlannerConversation'
import type { PrivateChatEvent } from '../lib/api'

describe('correlated answer evidence', () => {
  const user: PrivateChatEvent = { event_id:'event-0000000000000001',sequence:1,observed_at:'2026-09-08T00:00:00.000Z',correlation_id:'message-0000000000000001',kind:'user_message',state:'queued',delivery:'delivery_unknown',dispatch_state:'invoked',payload:{private_content:{text:'hello'}} }
  const answer: PrivateChatEvent = {...user,event_id:'event-0000000000000002',sequence:2,kind:'assistant_message',state:'completed',payload:{private_content:{text:'received'}}}
  it('shows answered evidence without mutating original transport state', () => {
    const timeline=[user,answer]
    expect(hasCorrelatedPlannerAnswer(timeline,user.correlation_id)).toBe(true)
    const html=renderToStaticMarkup(<PlannerConversation events={[]} fixtureTimeline={timeline} />)
    expect(html).toContain('Planner 답변 확인됨');expect(html).not.toContain('전달 상태 확인 불가')
    expect(user.delivery).toBe('delivery_unknown')
  })
  it('rejects unmatched, earlier, incomplete and ambiguous correlations', () => {
    for(const change of [{correlation_id:'message-0000000000000002'},{sequence:0},{state:'failed'},{observed_at:'2026-09-07T00:00:00.000Z'},{payload:{private_content:{text:' '}}}]) expect(hasCorrelatedPlannerAnswer([user,{...answer,...change} as PrivateChatEvent],user.correlation_id)).toBe(false)
    expect(hasCorrelatedPlannerAnswer([user,user,answer],user.correlation_id)).toBe(false)
    expect(hasCorrelatedPlannerAnswer([answer],user.correlation_id)).toBe(false)
  })
})

describe('composer IME boundary', () => {
  it('sends only explicit shortcuts outside composition', () => {
    const event = { key: 'Enter', metaKey: false, ctrlKey: true, isComposing: false }
    expect(isComposerSubmitShortcut(event)).toBe(true)
    expect(isComposerSubmitShortcut({ ...event, ctrlKey: false, metaKey: true })).toBe(true)
    for (const change of [{ isComposing: true }, { keyCode: 229 }, { ctrlKey: false }, { key: 'a' }]) expect(isComposerSubmitShortcut({ ...event, ...change })).toBe(false)
  })
})

describe('live timeline validation', () => {
  const answer: PrivateChatEvent = { event_id: 'event-0000000000000001', sequence: 1, observed_at: '2026-09-08T00:00:00.000Z', kind: 'assistant_message', state: 'completed', correlation_id: 'message-0000000000000001', payload: { private_content: { text: 'Planner 답변' } } }
  it('accepts ordered Planner answer content', () => {
    expect(validatePrivateTimeline([answer])[0]).toEqual(answer)
  })
  it('rejects unknown kind, state, gaps and text on non-message events', () => {
    for (const mutation of [{ kind: 'invented' }, { state: 'invented' }, { sequence: 2 }, { kind: 'tool_call' }, { payload: { private_content: { text: '' } } }]) {
      expect(() => validatePrivateTimeline([{ ...answer, ...mutation } as PrivateChatEvent])).toThrow('timeline_conflict')
    }
  })
  it('rejects invalid user delivery and duplicate event IDs', () => {
    expect(() => validatePrivateTimeline([{ ...answer, kind: 'user_message', state: 'queued', delivery: 'invented', dispatch_state: 'invoked' } as unknown as PrivateChatEvent])).toThrow('timeline_conflict')
    expect(() => validatePrivateTimeline([answer, { ...answer, sequence: 2 }])).toThrow('timeline_conflict')
  })
})

describe('conversation request credentials', () => {
  it('obtains a fresh credential on every request rather than caching the first token', async () => {
    let calls = 0
    const session = { sessionCredential: 'obsolete-fixture', getSessionCredential: async () => `fixture-${++calls}` }
    expect(await resolveConversationCredential(session)).toBe('fixture-1')
    expect(await resolveConversationCredential(session)).toBe('fixture-2')
    expect(calls).toBe(2)
  })
  it('never falls back to a stale token when the current session expires', async () => {
    await expect(resolveConversationCredential({ sessionCredential: 'obsolete-fixture', getSessionCredential: async () => null })).rejects.toThrow('authentication_required')
  })
  it('propagates session provider failure without falling back', async () => {
    await expect(resolveConversationCredential({ sessionCredential: 'obsolete-fixture', getSessionCredential: async () => { throw new Error('session_unavailable') } })).rejects.toThrow('session_unavailable')
  })
})

describe('Planner conversation observed-event contract', () => {
  it('renders supplied Planner answer text without relabeling it as Cherry or queued', () => {
    const html = renderToStaticMarkup(<PlannerConversation events={[]} fixtureTimeline={[{ event_id: 'event-0000000000000002', sequence: 2, observed_at: '2026-09-08T00:00:00.000Z', kind: 'assistant_message', state: 'completed', correlation_id: 'message-0000000000000001', payload: { private_content: { text: '확인된 답변 본문' } } }]} />)
    expect(html).toContain('확인된 답변 본문')
    expect(html).toContain('<strong>Planner</strong>')
    expect(html).not.toContain('<strong>Cherry</strong>')
    expect(html).not.toContain('전송 대기 기록')
  })
  it('renders a quiet truthful empty state without synthetic activity', () => {
    const html = renderToStaticMarkup(<PlannerConversation events={[]} />)
    expect(html).toContain('아직 관측된 Planner 작업 이벤트가 없습니다')
    expect(html).toContain('data-observed-events="0"')
    for (const token of ['typing', 'streaming', 'tool call', '완료됨', '전송']) expect(html).not.toContain(token)
  })

  it('renders only supplied event type summary timestamp and status', () => {
    const events = [{ id: 'event-planner-1', sequence: 1, role: 'planner' as const, completionAuthority: false as const, type: 'work_observed' as const, summary: 'Planner가 경계를 확인했습니다.', observedAt: '2026-08-31T00:01:00.000Z', status: 'active' as const }, { id: 'event-planner-2', sequence: 2, role: 'planner' as const, completionAuthority: false as const, type: 'result_observed' as const, summary: '전달 근거가 확인되지 않았습니다.', observedAt: '2026-08-31T00:02:00.000Z', status: 'delivery_unknown' as const }]
    const html = renderToStaticMarkup(<PlannerConversation events={events} />)
    for (const value of ['Planner가 경계를 확인했습니다.', '전달 근거가 확인되지 않았습니다.', '2026-08-31T00:01:00.000Z', '관측된 작업 진행', '전달 상태 확인 불가']) expect(html).toContain(value)
    expect(html).toContain('data-event-status="active"')
    expect(html).toContain('data-event-status="delivery_unknown"')
    expect(html).not.toContain('완료')
  })

  it('keeps every terminal state non-running', () => {
    const statuses = ['blocked', 'delivery_unknown', 'failed', 'rejected', 'safe_hold'] as const
    const html = renderToStaticMarkup(<PlannerConversation events={statuses.map((status, index) => ({ id: `event-terminal-${index + 1}`, sequence: index + 1, role: 'planner', completionAuthority: false as const, type: 'result_observed', summary: `${status} 관측`, observedAt: `2026-08-31T00:0${index + 1}:00.000Z`, status }))} />)
    for (const status of statuses) expect(html).toContain(`data-event-status="${status}"`)
    expect(html).not.toContain('data-event-status="active"')
    expect(html).not.toContain('완료')
  })
})

describe('Phase 4 role chat D3 contract', () => {
  const events = [
    { id: 'event-builder-2', sequence: 2, role: 'builder' as const, completionAuthority: false as const, type: 'work_observed' as const, summary: '구현 관측', observedAt: '2026-09-04T00:02:00.000Z', status: 'active' as const },
    { id: 'event-planner-1', sequence: 1, role: 'planner' as const, completionAuthority: false as const, type: 'boundary_observed' as const, summary: '범위 확인', observedAt: '2026-09-04T00:01:00.000Z', status: 'observed' as const },
    { id: 'event-audit-3', sequence: 3, role: 'release_audit' as const, type: 'result_observed' as const, summary: '감사 관측', observedAt: '2026-09-04T00:03:00.000Z', status: 'safe_hold' as const, completionAuthority: false as const },
    { id: 'event-qa-4', sequence: 4, role: 'ux_product_qa' as const, completionAuthority: false as const, type: 'result_observed' as const, summary: '제품 QA 관측', observedAt: '2026-09-04T00:04:00.000Z', status: 'observed' as const },
  ]

  it('keeps one ordered event dataset behind the exact five read-only lenses', () => {
    const html = renderToStaticMarkup(<PlannerConversation events={events} />)
    const controls = html.match(/<nav class="planner-conversation__filters"[\s\S]*?<\/nav>/)?.[0].match(/<button[^>]*>(.*?)<\/button>/g)?.map((button) => button.replace(/<[^>]+>/g, '').replace('&amp;', '&'))
    expect(controls).toEqual(roleChatFilters)
    expect(controls).toHaveLength(5)
    expect(html.indexOf('event-planner-1')).toBeLessThan(html.indexOf('event-builder-2'))
    expect(html.indexOf('event-builder-2')).toBeLessThan(html.indexOf('event-audit-3'))
    expect(html).toContain('완료 판정 권한 없음')
    expect(html).toContain('세션 활동은 진행률이 아닙니다')
  })

  it('exercises every actual lens and keeps the composer only in All and Planner', () => {
    const expectedRoles: Record<RoleChatFilter, string[]> = { '전체': ['planner', 'builder', 'release_audit', 'ux_product_qa'], Planner: ['planner'], Builder: ['builder'], 'UX & Product QA': ['ux_product_qa'], 'Release Audit': ['release_audit'] }
    for (const filter of roleChatFilters) {
      const html = renderToStaticMarkup(<PlannerConversation events={events} initialFilter={filter} fixtureState="ready" plannerBound onSend={() => undefined} />)
      const roles = [...html.matchAll(/data-event-role="([^"]+)"/g)].map((match) => match[1])
      expect(roles).toEqual(expectedRoles[filter])
      expect((html.match(/data-planner-composer="true"/g) ?? []).length).toBe(filter === '전체' || filter === 'Planner' ? 1 : 0)
      expect(html.match(/세션 활동은 진행률이 아닙니다/g)).toHaveLength(1)
    }
  })

  it('keeps the non-progress boundary once at section level for every empty lens', () => {
    for (const filter of roleChatFilters) {
      const html = renderToStaticMarkup(<PlannerConversation events={[]} initialFilter={filter} />)
      expect(html.match(/data-non-progress-boundary="true"/g)).toHaveLength(1)
      expect(html.match(/세션 활동은 진행률이 아닙니다/g)).toHaveLength(1)
      expect(html).toContain('planner-conversation__empty')
    }
  })

  it('renders exactly one planner-only composer only with a live adapter and binding', () => {
    const writable = renderToStaticMarkup(<PlannerConversation events={events} plannerBound onSend={() => undefined} />)
    expect(writable.match(/data-planner-composer="true"/g)).toHaveLength(1)
    expect(writable).toContain('Planner에게 메시지')
    expect(writable).not.toContain('Builder에게 메시지')
    const readOnly = renderToStaticMarkup(<PlannerConversation events={events} plannerBound />)
    expect(readOnly).not.toContain('data-planner-composer="true"')
  })

  it('exposes deterministic non-production state fixtures and blocks delivery replay', () => {
    expect(roleChatFixtureStates).toEqual(['ready', 'streaming', 'tool-running', 'waiting-approval', 'offline-reconnecting', 'permission-absent', 'unbound-stale', 'delivery_unknown'])
    for (const state of roleChatFixtureStates as readonly RoleChatFixtureState[]) {
      const html = renderToStaticMarkup(<PlannerConversation events={events} fixtureState={state} plannerBound onSend={() => undefined} />)
      expect(html).toContain(`data-role-chat-state="${state}"`)
      expect(html).toContain('data-fixture-boundary="non-production"')
      if (state === 'permission-absent' || state === 'unbound-stale') expect(html).not.toContain('data-planner-composer="true"')
      if (state === 'delivery_unknown') { expect(html).toContain('자동 재전송하지 않습니다'); expect(html).not.toContain('다시 보내기') }
    }
    const productionDefault = renderToStaticMarkup(<PlannerConversation events={[]} />)
    expect(productionDefault).not.toContain('data-role-chat-state')
    expect(productionDefault).not.toContain('data-planner-composer="true"')
  })
})
