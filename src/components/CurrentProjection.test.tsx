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
  readyBoundary: ['B2 workspace UI'],
  nextAction: 'B2 UI를 독립 검증한다',
  cherryAction: '후보 화면을 확인한다',
  state: 'ready',
  events: [],
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

  it('omits Cherry action when null and never renders events or extra private fields', () => {
    const hostile = { ...projection({ cherryAction: null }), events: [{ type: 'tool', state: 'running', observedAt: 'now', summary: 'fake tool activity' }], privateLocator: 'private-task-locator', rawPrompt: 'secret prompt' } as PrivateModelV2Projection
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
