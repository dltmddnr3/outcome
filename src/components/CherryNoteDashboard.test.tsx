import { describe, expect, it } from 'vitest'
import { dashboardJourneyLabels, summarizeGateGroups } from './CherryNoteDashboard'

describe('Cherry Note migration parity', () => {
  it('keeps Gates as Stage acceptance groups, not progression', () => {
    expect(summarizeGateGroups([{ id: 'Y', label: '링크', total: 5 }, { id: 'G', label: '증거', total: 19 }])).toEqual({ groups: 2, checks: 24 })
    expect(dashboardJourneyLabels).toEqual({ sequence: '진행 순서', current: '현재 위치', next: '다음 단계', acceptance: '이 단계의 완료 조건' })
  })

  it('keeps Package-provided group labels and codes without a translation lookup', () => {
    expect(summarizeGateGroups([{ id: 'Y', label: 'YouTube addition gates', total: 5 }])).toEqual({ groups: 1, checks: 5 })
  })
})
