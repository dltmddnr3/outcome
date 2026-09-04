import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PlannerConversation, roleChatFilters, roleChatFixtureStates, type RoleChatFilter, type RoleChatFixtureState } from './PlannerConversation'

describe('Planner conversation observed-event contract', () => {
  it('renders a quiet truthful empty state without synthetic activity', () => {
    const html = renderToStaticMarkup(<PlannerConversation events={[]} />)
    expect(html).toContain('아직 관측된 Planner 작업 이벤트가 없습니다')
    expect(html).toContain('data-observed-events="0"')
    for (const token of ['typing', 'streaming', 'tool call', 'progress', '완료됨', '전송']) expect(html).not.toContain(token)
  })

  it('renders only supplied event type summary timestamp and status', () => {
    const events = [{ type: 'work_observed' as const, summary: 'Planner가 경계를 확인했습니다.', observedAt: '2026-08-31T00:01:00.000Z', status: 'active' as const }, { type: 'result_observed' as const, summary: '전달 근거가 확인되지 않았습니다.', observedAt: '2026-08-31T00:02:00.000Z', status: 'delivery_unknown' as const }]
    const html = renderToStaticMarkup(<PlannerConversation events={events} />)
    for (const value of ['Planner가 경계를 확인했습니다.', '전달 근거가 확인되지 않았습니다.', '2026-08-31T00:01:00.000Z', '관측된 작업 진행', '전달 상태 확인 불가']) expect(html).toContain(value)
    expect(html).toContain('data-event-status="active"')
    expect(html).toContain('data-event-status="delivery_unknown"')
    expect(html).not.toContain('완료')
  })

  it('keeps every terminal state non-running', () => {
    const statuses = ['blocked', 'delivery_unknown', 'failed', 'rejected', 'safe_hold'] as const
    const html = renderToStaticMarkup(<PlannerConversation events={statuses.map((status, index) => ({ type: 'result_observed', summary: `${status} 관측`, observedAt: `2026-08-31T00:0${index + 1}:00.000Z`, status }))} />)
    for (const status of statuses) expect(html).toContain(`data-event-status="${status}"`)
    expect(html).not.toContain('data-event-status="active"')
    expect(html).not.toContain('완료')
  })
})

describe('Phase 4 role chat D3 contract', () => {
  const events = [
    { id: 'evt-2', sequence: 2, role: 'builder' as const, type: 'work_observed' as const, summary: '구현 관측', observedAt: '2026-09-04T00:02:00.000Z', status: 'active' as const },
    { id: 'evt-1', sequence: 1, role: 'planner' as const, type: 'boundary_observed' as const, summary: '범위 확인', observedAt: '2026-09-04T00:01:00.000Z', status: 'observed' as const },
    { id: 'evt-3', sequence: 3, role: 'release_audit' as const, type: 'result_observed' as const, summary: '감사 관측', observedAt: '2026-09-04T00:03:00.000Z', status: 'safe_hold' as const, completionAuthority: false as const },
    { id: 'evt-4', sequence: 4, role: 'ux_product_qa' as const, type: 'result_observed' as const, summary: '제품 QA 관측', observedAt: '2026-09-04T00:04:00.000Z', status: 'observed' as const },
  ]

  it('keeps one ordered event dataset behind the exact five read-only lenses', () => {
    const html = renderToStaticMarkup(<PlannerConversation events={events} />)
    const controls = html.match(/<nav class="planner-conversation__filters"[\s\S]*?<\/nav>/)?.[0].match(/<button[^>]*>(.*?)<\/button>/g)?.map((button) => button.replace(/<[^>]+>/g, '').replace('&amp;', '&'))
    expect(controls).toEqual(roleChatFilters)
    expect(controls).toHaveLength(5)
    expect(html.indexOf('evt-1')).toBeLessThan(html.indexOf('evt-2'))
    expect(html.indexOf('evt-2')).toBeLessThan(html.indexOf('evt-3'))
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
