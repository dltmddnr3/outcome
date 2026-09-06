import { describe, expect, it } from 'vitest'
// @ts-expect-error This test reads the pinned source stylesheet; the browser bundle never imports Node built-ins.
import { readFileSync } from 'node:fs'
import {
  AT_OPERATOR_SHEET_ACCENT_ALLOWED_POSITIONS,
  AT_OPERATOR_SHEET_ACCENT_FORBIDDEN_PROPERTIES,
  AT_OPERATOR_SHEET_BADGE_ACCENT_FORBIDDEN_PROPERTIES,
  AT_OPERATOR_SHEET_DESKTOP_REQUIRED_PLATFORM_IDS,
  AT_OPERATOR_SHEET_INITIAL_QA_FLAG,
  AT_OPERATOR_SHEET_MOBILE_REQUIRED_PLATFORM_IDS,
  AT_OPERATOR_SHEET_PALETTE,
  AT_OPERATOR_SHEET_PLATFORM_RECORDS,
  AT_OPERATOR_SHEET_ROW_IDS,
  AT_OPERATOR_SHEET_ROW_STATES,
  AT_OPERATOR_SHEET_SCOPE,
  AT_OPERATOR_SHEET_SURFACE_TOKEN_NAMES,
  atOperatorSheetMobileEvidencePrefix,
  createInitialAtOperatorSheetRowStates,
  encodeAtOperatorSheetRowStates,
  serializeAtOperatorSheetRowStates,
} from './atOperatorSheetContract'

describe('AT Operator Sheet contract core', () => {
  it('pins the exact R83 row order, state inventory, and initial QA-blocked state', () => {
    expect(AT_OPERATOR_SHEET_ROW_IDS).toEqual(['SC-01', 'SC-02', 'SC-03', 'SC-04', 'SC-05', 'SC-06', 'SC-07a', 'SC-07b', 'SC-08'])
    expect(AT_OPERATOR_SHEET_ROW_STATES).toEqual(['PENDING', 'IN_PROGRESS', 'RECORDED', 'NOT_RUN', 'NOT_APPLICABLE', 'SEALED'])
    expect(createInitialAtOperatorSheetRowStates()).toEqual(AT_OPERATOR_SHEET_ROW_IDS.map((row) => ({ row, rowState: 'PENDING', qaFlag: 'PROVISIONAL_QA_BLOCKED' })))
  })

  it('serializes canonical UTF-8 bytes with fixed field and row order', () => {
    const rows = createInitialAtOperatorSheetRowStates()
    const expected = `${JSON.stringify(rows)}\n`
    expect(serializeAtOperatorSheetRowStates(rows.map(({ qaFlag, rowState, row }) => ({ qaFlag, rowState, row })))).toBe(expected)
    expect([...encodeAtOperatorSheetRowStates(rows)]).toEqual([...new TextEncoder().encode(expected)])
  })

  it('fails closed for missing, reordered, duplicate, unknown-state, QA-flag, and extra-field mutations', () => {
    const rows = createInitialAtOperatorSheetRowStates()
    expect(() => serializeAtOperatorSheetRowStates(rows.slice(0, -1))).toThrow('row_state_count_invalid:8')
    expect(() => serializeAtOperatorSheetRowStates([rows[1], rows[0], ...rows.slice(2)])).toThrow('row_state_order_invalid:0:SC-02:SC-01')
    expect(() => serializeAtOperatorSheetRowStates([rows[0], rows[0], ...rows.slice(2)])).toThrow('row_state_order_invalid:1:SC-01:SC-02')
    expect(() => serializeAtOperatorSheetRowStates(rows.map((row, index) => index === 3 ? { ...row, rowState: 'DONE' } : row))).toThrow('row_state_value_invalid:SC-04:DONE')
    expect(() => serializeAtOperatorSheetRowStates(rows.map((row, index) => index === 5 ? { ...row, qaFlag: 'PASS' } : row))).toThrow('row_state_qa_flag_invalid:SC-06:PASS')
    expect(() => serializeAtOperatorSheetRowStates(rows.map((row, index) => index === 7 ? { ...row, extra: true } : row))).toThrow('row_state_shape_invalid:7')
  })

  it('pins all platforms while requiring both mobile AT platforms and desktop-only macOS VoiceOver', () => {
    expect(AT_OPERATOR_SHEET_PLATFORM_RECORDS).toEqual([
      { id: 'ios-vo', label: 'VoiceOver-iOS', evidenceSegment: 'ios-vo', view: 'mobile' },
      { id: 'macos-vo', label: 'VoiceOver-macOS', evidenceSegment: 'macos-vo', view: 'desktop' },
      { id: 'android-tb', label: 'TalkBack-Android', evidenceSegment: 'android-tb', view: 'mobile' },
    ])
    expect(AT_OPERATOR_SHEET_MOBILE_REQUIRED_PLATFORM_IDS).toEqual(['ios-vo', 'android-tb'])
    expect(AT_OPERATOR_SHEET_DESKTOP_REQUIRED_PLATFORM_IDS).toEqual(['macos-vo'])
    expect(atOperatorSheetMobileEvidencePrefix('abc123def456', '20260907T120000Z', 'OS-M04', 'ios-vo')).toBe('du/R85/abc123def456/20260907T120000Z/OS-M04/mobile/ios-vo/1.')
  })

  it('pins the exact source palette and sheet-scoped accent placement contract', () => {
    expect(AT_OPERATOR_SHEET_SCOPE).toBe('[data-at-operator-sheet]')
    expect(AT_OPERATOR_SHEET_PALETTE).toEqual({
      '--oc-bg': '#090b09', '--oc-surface': '#0d100d', '--oc-surface-raised': '#111411', '--oc-rule': '#292e29',
      '--oc-rule-strong': '#3a423a', '--oc-text': '#f2f4f0', '--oc-muted': '#a6aea4', '--oc-accent': '#adff2f',
    })
    expect(AT_OPERATOR_SHEET_SURFACE_TOKEN_NAMES).toEqual(['--oc-bg', '--oc-surface', '--oc-surface-raised'])
    expect(AT_OPERATOR_SHEET_ACCENT_ALLOWED_POSITIONS).toEqual(['current-row:border-left-color', 'current-card:border-left-color', 'focused-control:outline-color', 'selected-input:border-color'])
    expect(AT_OPERATOR_SHEET_ACCENT_FORBIDDEN_PROPERTIES).toEqual(['background-color', 'background-image', 'box-shadow', 'fill'])
    expect(AT_OPERATOR_SHEET_BADGE_ACCENT_FORBIDDEN_PROPERTIES).toEqual(['color', 'background-color'])
    expect(AT_OPERATOR_SHEET_INITIAL_QA_FLAG).toBe('PROVISIONAL_QA_BLOCKED')
  })

  it('keeps every contract token equal to the current root stylesheet value', () => {
    const rootRule = readFileSync(new URL('../styles.css', import.meta.url), 'utf8').split('}', 1)[0]
    for (const [token, value] of Object.entries(AT_OPERATOR_SHEET_PALETTE)) expect(rootRule).toContain(`${token}:${value}`)
  })
})
