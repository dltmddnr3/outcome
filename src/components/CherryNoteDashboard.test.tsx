import { describe, expect, it } from 'vitest'
import { dashboardJourneyLabels, gateGroupDisplayNames, summarizeGateGroups } from './CherryNoteDashboard'

describe('Cherry Note migration parity', () => {
  it('keeps Gates as Stage acceptance groups, not progression', () => {
    expect(summarizeGateGroups([{ id: 'Y', label: '링크', total: 5 }, { id: 'G', label: '증거', total: 19 }])).toEqual({ groups: 2, checks: 24 })
    expect(dashboardJourneyLabels).toEqual({ sequence: '진행 순서', current: '현재 위치', next: '다음 단계', acceptance: '이 단계의 완료 조건' })
  })

  it('keeps all nine Korean Stage 33 group names with codes secondary', () => {
    expect(Object.keys(gateGroupDisplayNames)).toEqual(['Y', 'L', 'B', 'M', 'N', 'E', 'A', 'D', 'G'])
    expect(gateGroupDisplayNames.G).toBe('엔지니어링 완료 증거')
  })
})
