import { describe, expect, it } from 'vitest'
// @ts-expect-error This test reads the pinned source stylesheet; the browser bundle never imports Node built-ins.
import { readFileSync } from 'node:fs'
// @ts-expect-error This test independently pins the canonical digest; the browser bundle never imports Node built-ins.
import { createHash } from 'node:crypto'
import {
  AT_OPERATOR_SHEET_ACCENT_ALLOWED_POSITIONS,
  AT_OPERATOR_SHEET_ACCENT_FORBIDDEN_PROPERTIES,
  AT_OPERATOR_SHEET_BADGE_ACCENT_FORBIDDEN_PROPERTIES,
  AT_OPERATOR_SHEET_DESKTOP_REQUIRED_PLATFORM_IDS,
  AT_OPERATOR_SHEET_INITIAL_QA_FLAG,
  AT_OPERATOR_SHEET_MOBILE_REQUIRED_PLATFORM_IDS,
  AT_OPERATOR_SHEET_PALETTE,
  AT_OPERATOR_SHEET_PAINT_ELEMENT_ROLES,
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
  const goldenBytes = 643
  const goldenSha256 = '5853e8d5fdb65e0c742e5c7a3f59219ca5e08e0d83c8fe81fc9d8e9f9393270f'
  const digest = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex')

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

  it('pins canonical bytes independently to the exact length, digest, and final LF', () => {
    const serialized = serializeAtOperatorSheetRowStates(createInitialAtOperatorSheetRowStates())
    expect(new TextEncoder().encode(serialized)).toHaveLength(goldenBytes)
    expect(digest(serialized)).toBe(goldenSha256)
    expect(serialized.charCodeAt(serialized.length - 1)).toBe(10)
    expect(serialized.charCodeAt(serialized.length - 2)).not.toBe(10)
  })

  it('turns the independent golden comparison RED for a one-byte mutation', () => {
    const serialized = serializeAtOperatorSheetRowStates(createInitialAtOperatorSheetRowStates())
    const mutated = serialized.replace('SC-01', 'SC_01')
    expect(new TextEncoder().encode(mutated)).toHaveLength(goldenBytes)
    expect(digest(mutated)).not.toBe(goldenSha256)
  })

  it('fails closed with exact duplicate, unknown, missing, extra, and reorder reasons', () => {
    const rows = createInitialAtOperatorSheetRowStates()
    const exactError = (candidate: unknown) => { try { serializeAtOperatorSheetRowStates(candidate) } catch (error) { return (error as Error).message } }
    expect(exactError([rows[0], rows[0], ...rows.slice(2)])).toBe('row_state_duplicate_id:SC-01')
    expect(exactError(rows.map((row, index) => index === 4 ? { ...row, row: 'SC-99' } : row))).toBe('row_state_unknown_id:4:SC-99')
    expect(exactError(rows.map((row, index) => index === 2 ? { row: row.row, rowState: row.rowState } : row))).toBe('row_state_missing_keys:2:qaFlag')
    expect(exactError(rows.map((row, index) => index === 2 ? { row: row.row } : row))).toBe('row_state_missing_keys:2:qaFlag,rowState')
    expect(exactError(rows.map((row, index) => index === 7 ? { ...row, zeta: true, alpha: true } : row))).toBe('row_state_extra_keys:7:alpha,zeta')
    expect(exactError([rows[1], rows[0], ...rows.slice(2)])).toBe('row_state_order_invalid:0:SC-02:SC-01')
  })

  it('retains exact arity, wrong-state, and QA-flag reasons', () => {
    const rows = createInitialAtOperatorSheetRowStates()
    const exactError = (candidate: unknown) => { try { serializeAtOperatorSheetRowStates(candidate) } catch (error) { return (error as Error).message } }
    expect(exactError(rows.slice(0, -1))).toBe('row_state_count_invalid:8')
    expect(exactError(rows.map((row, index) => index === 3 ? { ...row, rowState: 'DONE' } : row))).toBe('row_state_value_invalid:SC-04:DONE')
    expect(exactError(rows.map((row, index) => index === 5 ? { ...row, qaFlag: 'PASS' } : row))).toBe('row_state_qa_flag_invalid:SC-06:PASS')
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
    expect(AT_OPERATOR_SHEET_PAINT_ELEMENT_ROLES).toEqual(['sheet', 'table', 'card', 'input-cell', 'badge', 'preview', 'current-row', 'current-card', 'focused-control', 'selected-input'])
    expect(AT_OPERATOR_SHEET_INITIAL_QA_FLAG).toBe('PROVISIONAL_QA_BLOCKED')
  })

  it('keeps every contract token equal to the current root stylesheet value', () => {
    const rootRule = readFileSync(new URL('../styles.css', import.meta.url), 'utf8').split('}', 1)[0]
    for (const [token, value] of Object.entries(AT_OPERATOR_SHEET_PALETTE)) expect(rootRule).toContain(`${token}:${value}`)
  })
})
