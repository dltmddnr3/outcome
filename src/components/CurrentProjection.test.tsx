import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { PrivateModelV2Projection } from '../lib/api'
import { CurrentProjection, observationTimeLabel } from './CurrentProjection'

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
  it('distinguishes available records from a usable product and never invents a missing result', () => {
    const available = renderToStaticMarkup(<CurrentProjection projection={projection()} hasResultRecord />)
    expect(available).toContain('href="#oc-result-view"')
    expect(available).toContain('실제 사용 가능 여부는 별도 확인이 필요합니다.')
    expect(available.indexOf('data-projection-field="result"')).toBeLessThan(available.indexOf('data-projection-field="boundary"'))
    const missing = renderToStaticMarkup(<CurrentProjection projection={projection()} hasResultRecord={false} />)
    expect(missing).toContain('결과가 없다는 뜻은 아닙니다.')
    expect(missing).not.toContain('href="#oc-result-view"')
    expect(renderToStaticMarkup(<CurrentProjection projection={projection()} />)).not.toContain('data-projection-field="result"')
  })
  it('formats a fixed observation time in Korean without refreshing or discarding its source', () => {
    expect(observationTimeLabel('2026-08-31T08:00:00.000Z')).toBe('2026년 8월 31일 오후 5:00 · 한국 시간')
    expect(observationTimeLabel('2026-08-31T17:00:00.000+09:00')).toBe(observationTimeLabel('2026-08-31T08:00:00.000Z'))
    expect(observationTimeLabel('2026-08-31T23:30:00.000Z')).toBe('2026년 9월 1일 오전 8:30 · 한국 시간')
    expect(observationTimeLabel('2026-08-31T15:00:00.000Z')).toBe('2026년 9월 1일 오전 12:00 · 한국 시간')
    expect(observationTimeLabel('2026-08-31T03:00:00.000Z')).toBe('2026년 8월 31일 오후 12:00 · 한국 시간')
    for (const invalid of ['', 'not-a-date', '2026-08-31T08:00:00']) expect(observationTimeLabel(invalid)).toBe('확인 시각을 해석할 수 없습니다')
    const html = renderToStaticMarkup(<CurrentProjection projection={projection()} />)
    expect(html).toContain('2026년 8월 31일 오후 5:00 · 한국 시간')
    expect(html).toContain('원본 확인 시각')
    expect(html).toContain('>2026-08-31T08:00:00.000Z</time>')
  })
  it('omits repeated state wording but preserves different observed states and exact time', () => {
    const same = renderToStaticMarkup(<CurrentProjection projection={projection()} />)
    expect(same).toContain('dateTime="2026-08-31T08:00:00.000Z"')
    expect(same.match(/>다음 단계 준비됨</g)).toHaveLength(1)
    const different = renderToStaticMarkup(<CurrentProjection projection={projection({ now: { state: 'stale', observedAt: '2026-08-31T08:00:00.000Z' } })} />)
    expect(different).toContain('이전 확인 내용입니다')
  })
  it('shows Korean built-in source labels without mutating the input', () => {
    const input = projection({ destination: { id: 'outcome-phase-5', label: 'Phase 5 · Outcome-first Creation' }, readyBoundaryLabels: ['Documentation bootstrap', 'Original custom name'] })
    const before = JSON.stringify(input)
    const html = renderToStaticMarkup(<CurrentProjection projection={input} />)
    expect(html).toContain('5단계 · 원하는 결과부터 프로젝트 만들기')
    expect(html).toContain('기본 문서 준비')
    expect(html).toContain('Original custom name')
    expect(JSON.stringify(input)).toBe(before)
  })
  it('leads with Korean situation wording and keeps supporting records in a closed disclosure', () => {
    const html = renderToStaticMarkup(<CurrentProjection projection={projection()} />)
    expect(html).toContain('현재 상황')
    expect(html).toContain('진행 근거와 연결 상태')
    expect(html).toMatch(/<details[^>]*class="current-projection__details"/)
    expect(html).not.toMatch(/<details[^>]*\sopen(?:=|\s|>)/)
    for (const internal of ['Current Projection', '>Destination<', '>Now<', 'Cherry action', 'Model v2 · 서버 관측']) expect(html).not.toContain(internal)
    expect(html).toContain('다음 단계가 준비됐습니다. 결과가 완성됐다는 뜻은 아닙니다.')
  })

  it('does not turn a missing owner instruction into a claim that nothing is left to do', () => {
    const html = renderToStaticMarkup(<CurrentProjection projection={projection({ cherryActionLabel: null })} />)
    expect(html).toContain('확인된 결정 요청이 없습니다')
    expect(html).not.toContain('지금 할 일은 없습니다')
  })
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
    for (const label of ['확인한 근거', '미이행', '담당자 지시', '수신·착수', '다음 확인', '검수 결과', '보완·대체 경로', '소유자 결정']) expect(html).toContain(label)
    for (const value of ['B1 · 서버 근거를 확인한다', 'Builder · 서버 근거 영수증 · B1 근거 고정', '전달 상태 확인 불가', '검수 근거 없음', '확인된 소유자 결정 없음']) expect(html).toContain(value)
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
