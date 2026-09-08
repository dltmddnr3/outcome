import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SingleSessionObservation } from './SingleSessionObservation'

const now = 20000
const snapshot = () => ({ schemaVersion: 1, observedAtMs: now, completionAuthority: false, executionAuthority: false,
  work: { stage: 'implementing', activity: 'running', freshness: 'fresh', evidenceStatus: 'reference_only_unverified', continuation: 'next_action_recorded' }, runtime: { state: 'active' } })
const html = (observation?: unknown) => renderToStaticMarkup(<SingleSessionObservation observation={observation} />)
afterEach(() => vi.useRealTimers())
describe('single session observation presentation', () => {
  it('does not manufacture runtime activity when source is absent or malformed', () => {
    for (const value of [undefined, null, {}, { state: 'ready' }, { ...snapshot(), completionAuthority: true }, { ...snapshot(), runtime: { state: 'invented' } }]) {
      expect(html(value)).toContain('연결 확인 전')
      expect(html(value)).not.toContain('실행 관측됨')
    }
  })
  it('separates actual execution, stage, evidence reference and next step without decision controls', () => {
    vi.useFakeTimers(); vi.setSystemTime(now)
    const output = html({ ...snapshot(), privateLocator: 'secret-location', rawPrompt: 'secret-prompt' })
    for (const text of ['실행 관측됨', '구현', '다음 단계 기록됨 · 실행과 별개', '근거 참조 있음 · 내용 검증과 별개', '같은 세션에서 진행한 검증', 'data-completion-authority="false"']) expect(output).toContain(text)
    for (const text of ['secret-location', 'secret-prompt', '<button', '<a ', 'PASS', '4/4']) expect(output).not.toContain(text)
  })
  it('expires original observation without rebasing it and distinguishes waits from execution', () => {
    vi.useFakeTimers(); vi.setSystemTime(now + 15001)
    expect(html(snapshot())).toContain('새 관측 필요')
    expect(html(snapshot())).not.toContain('실행 관측됨')
    vi.setSystemTime(now - 1)
    expect(html(snapshot())).not.toContain('실행 관측됨')
    vi.setSystemTime(now)
    for (const state of ['idle', 'waiting_approval', 'waiting_user', 'unknown']) expect(html({ ...snapshot(), runtime: { state } })).not.toContain('실행 관측됨')
    expect(html({ ...snapshot(), work: { ...snapshot().work, activity: 'terminal' } })).toContain('작업 단계 확인 필요')
  })
})
