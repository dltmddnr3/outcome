import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PlannerConversation, boundedComposerDraft, createMessageIdempotencyKey, roleChatFilters, roleChatFixtureStates, sensitiveContentHint, validatePrivateTimeline, type RoleChatFilter, type RoleChatFixtureState } from './PlannerConversation'

describe('Planner conversation observed-event contract', () => {
  it('renders a quiet truthful empty state without synthetic activity', () => {
    const html = renderToStaticMarkup(<PlannerConversation events={[]} fixtureState="ready" plannerBound onSend={() => undefined} />)
    expect(html).toContain('아직 관측된 Planner 작업 이벤트가 없습니다')
    expect(html).toContain('data-observed-events="0"')
    for (const token of ['typing', 'streaming', 'tool call', '완료됨', '전송']) expect(html).not.toContain(token)
  })

  it('renders an authenticated Korean composer with deterministic accessibility boundaries', () => {
    const html = renderToStaticMarkup(<PlannerConversation events={[]} fixtureState="ready" plannerBound onSend={() => undefined} />)
    for (const value of ['Planner에게 메시지', '메시지 보내기', '4000', 'aria-live="polite"', 'data-touch-target="44"']) expect(html).toContain(value)
    expect(html).toContain('textarea'); expect(html).not.toContain('완료됨')
  })

  it('creates only the finite correlation grammar and flags credential-like client hints', () => {
    expect(createMessageIdempotencyKey(() => new Uint8Array(8).fill(10))).toBe('message-0a0a0a0a0a0a0a0a')
    expect(sensitiveContentHint('Bearer abcdefgh')).toBe(true)
    expect(sensitiveContentHint('GitHub token permissions are under discussion.')).toBe(false)
  })

  it('rejects decreasing observed timestamps at the client boundary', () => {
    const event = (event_id: string, sequence: number, observed_at: string) => ({ event_id, sequence, observed_at, kind: 'user_message' as const, state: 'queued' as const, correlation_id: `message-${String(sequence).padStart(16, '0')}`, payload: { private_content: { text: 'ordinary' } } })
    expect(() => validatePrivateTimeline([event('event-0000000000000001', 1, '2026-09-03T00:00:01.000Z'), event('event-0000000000000002', 2, '2026-09-03T00:00:00.000Z')])).toThrow('timeline_conflict')
  })

  it('accepts exactly 4000 astral code points and preserves the prior draft at 4001', () => {
    const valid = '😀'.repeat(4000), invalid = `${valid}😀`
    expect([...valid]).toHaveLength(4000); expect(valid.length).toBe(8000)
    expect(boundedComposerDraft('', valid)).toBe(valid)
    expect(boundedComposerDraft(valid, invalid)).toBe(valid)
    const html = renderToStaticMarkup(<PlannerConversation events={[]} />)
    expect(html).not.toContain('maxlength=')
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

  it('keeps a non-empty durable timeline and canonical events visible together', () => {
    const fixtureTimeline = [{ event_id: 'event-0000000000000001', sequence: 1, observed_at: '2026-09-04T00:05:00.000Z', kind: 'user_message' as const, state: 'queued' as const, correlation_id: 'message-0123456789abcdef', payload: { private_content: { text: '서버에 기록된 메시지' } } }]
    const html = renderToStaticMarkup(<PlannerConversation events={events} fixtureState="ready" fixtureTimeline={fixtureTimeline} plannerBound onSend={() => undefined} />)
    expect(html).toContain('서버에 기록된 메시지')
    expect(html).toContain('event-planner-1')
    expect(html).toContain('event-builder-2')
    expect(html).toContain('data-planner-composer="true"')
  })

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
