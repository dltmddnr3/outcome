import { describe, expect, it } from 'vitest'
import { outcomeDisplayLabel } from './outcome-display-copy'

describe('OUTCOME built-in Korean labels', () => {
  it('localizes exact built-in labels only in OUTCOME', () => {
    expect(outcomeDisplayLabel('outcome', 'Phase 5 · Outcome-first Creation')).toBe('5단계 · 원하는 결과부터 프로젝트 만들기')
    expect(outcomeDisplayLabel('outcome', 'Documentation bootstrap')).toBe('기본 문서 준비')
    for (const label of ['My custom Phase 5', 'Phase 5 · Outcome-first Creation ', '__proto__', 'constructor']) expect(outcomeDisplayLabel('outcome', label)).toBe(label)
    expect(outcomeDisplayLabel('another-project', 'Documentation bootstrap')).toBe('Documentation bootstrap')
  })
})
