import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { PrivateModelV2Projection } from '../lib/api'
import { CurrentProjection } from './CurrentProjection'

const projection = (overrides: Partial<PrivateModelV2Projection> = {}): PrivateModelV2Projection => ({
  schemaVersion: 1,
  modelVersion: 2,
  project: { id: 'outcome', label: 'OUTCOME' },
  destination: { id: 'destination-1', label: '내가 원하는 결과에 도달하기' },
  remainingAcceptanceGap: { remaining: 2, total: 5 },
  now: { observedAt: '2026-08-31T08:00:00.000Z', state: 'ready' },
  readyBoundaryLabels: ['B2 workspace UI'],
  nextActionLabel: 'B2 UI를 독립 검증한다',
  cherryActionLabel: '후보 화면을 확인한다',
  state: 'ready',
  events: [],
  executionLoopItems: [],
  ...overrides,
})

describe('Current Projection presentation contract', () => {
  it('renders only server fields in the required primary order', () => {
    const html = renderToStaticMarkup(<CurrentProjection projection={projection()} />)
    const fields = ['destination', 'gap', 'now', 'boundary', 'cherry-action']
    fields.reduce((cursor, field) => {
      const index = html.indexOf(`data-projection-field="${field}"`)
      expect(index).toBeGreaterThan(cursor)
      return index
    }, -1)
    for (const value of ['내가 원하는 결과에 도달하기', '2 / 5', 'B2 workspace UI', 'B2 UI를 독립 검증한다', '후보 화면을 확인한다']) expect(html).toContain(value)
    expect(html).toContain('data-completion-authority="false"')
  })

  it('renders all eight correlated facts in one semantic definition list without an approval control', () => {
    const fact = (state: 'known' | 'missing' | 'unknown' | 'safe_hold' | 'not_applicable', value: string | null, sourceRef: string | null, reasonCode: string | null) => ({ state, value, sourceRef, reasonCode })
    const executionLoopItems = [{
      itemId: 'execution-item-b1', state: 'ready' as const,
      checked: fact('missing', null, 'gate:B1', 'checked_evidence_missing'),
      missing: fact('known', 'B1 · 서버 근거를 확인한다', 'gate:B1', null),
      ownerInstruction: fact('known', 'Builder · 서버 근거 영수증 · B1 근거 고정', 'instruction:builder:b1', null),
      receiptState: fact('unknown', '전달 상태 확인 불가', 'dispatch:event-builder-1', 'destination_evidence_missing'),
      nextCheckpoint: fact('known', 'B1 불변 근거', 'gate:B1', null),
      reviewResult: fact('missing', null, null, 'review_missing'),
      reworkState: fact('not_applicable', '교정 또는 대체 경로 없음', null, null),
      cherryBoundary: null,
      completionAuthority: false as const,
    }]
    const html = renderToStaticMarkup(<CurrentProjection projection={projection({ executionLoopItems })} />)
    for (const label of ['확인한 근거', '미이행', '담당자 지시', '수신·착수', '다음 확인', '검수 결과', '보완·대체 경로', 'Cherry 결정']) expect(html).toContain(label)
    for (const value of ['B1 · 서버 근거를 확인한다', 'Builder · 서버 근거 영수증 · B1 근거 고정', '전달 상태 확인 불가', '검수 근거 없음', 'Cherry 결정 없음']) expect(html).toContain(value)
    expect(html).toContain('<dl')
    expect(html).not.toContain('<button')
    expect(html).toContain('data-completion-authority="false"')
  })

  it('omits Cherry action when null and never renders events or extra private fields', () => {
    const hostile = { ...projection({ cherryActionLabel: null }), events: [{ type: 'tool', state: 'running', observedAt: 'now', summary: 'fake tool activity' }], privateLocator: 'private-task-locator', rawPrompt: 'secret prompt' } as unknown as PrivateModelV2Projection
    const html = renderToStaticMarkup(<CurrentProjection projection={hostile} />)
    for (const hidden of ['Cherry action', 'fake tool activity', 'private-task-locator', 'secret prompt']) expect(html).not.toContain(hidden)
  })

  it('keeps all seven server states distinct without claiming activity or progress', () => {
    for (const state of ['loading', 'ready', 'stale', 'conflict', 'blocked', 'delivery_unknown', 'no_active_work'] as const) {
      const html = renderToStaticMarkup(<CurrentProjection projection={projection({ state, now: { observedAt: '2026-08-31T08:00:00.000Z', state } })} />)
      expect(html).toContain(`data-projection-state="${state}"`)
      expect(html).not.toContain('실행 중')
      expect(html).not.toContain('진행 중')
    }
  })
})
