import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PlannerConversation } from './PlannerConversation'

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
