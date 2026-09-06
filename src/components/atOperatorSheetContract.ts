export const AT_OPERATOR_SHEET_ROW_IDS = Object.freeze([
  'SC-01',
  'SC-02',
  'SC-03',
  'SC-04',
  'SC-05',
  'SC-06',
  'SC-07a',
  'SC-07b',
  'SC-08',
] as const)

export const AT_OPERATOR_SHEET_ROW_STATES = Object.freeze([
  'PENDING',
  'IN_PROGRESS',
  'RECORDED',
  'NOT_RUN',
  'NOT_APPLICABLE',
  'SEALED',
] as const)

export const AT_OPERATOR_SHEET_INITIAL_QA_FLAG = 'PROVISIONAL_QA_BLOCKED' as const

export type AtOperatorSheetRowId = typeof AT_OPERATOR_SHEET_ROW_IDS[number]
export type AtOperatorSheetRowState = typeof AT_OPERATOR_SHEET_ROW_STATES[number]

export type AtOperatorSheetRowStateRecord = {
  row: AtOperatorSheetRowId
  rowState: AtOperatorSheetRowState
  qaFlag: typeof AT_OPERATOR_SHEET_INITIAL_QA_FLAG
}

const exactKeys = (value: object, expected: readonly string[]) => {
  const actual = Object.keys(value).sort()
  const wanted = [...expected].sort()
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index])
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

export const createInitialAtOperatorSheetRowStates = (): AtOperatorSheetRowStateRecord[] =>
  AT_OPERATOR_SHEET_ROW_IDS.map((row) => ({ row, rowState: 'PENDING', qaFlag: AT_OPERATOR_SHEET_INITIAL_QA_FLAG }))

export function serializeAtOperatorSheetRowStates(value: unknown): string {
  if (!Array.isArray(value)) throw new Error('row_state_snapshot_not_array')
  if (value.length !== AT_OPERATOR_SHEET_ROW_IDS.length) throw new Error(`row_state_count_invalid:${value.length}`)

  const canonical = value.map((candidate, index): AtOperatorSheetRowStateRecord => {
    if (!isRecord(candidate) || !exactKeys(candidate, ['row', 'rowState', 'qaFlag'])) throw new Error(`row_state_shape_invalid:${index}`)
    const expectedRow = AT_OPERATOR_SHEET_ROW_IDS[index]
    if (candidate.row !== expectedRow) throw new Error(`row_state_order_invalid:${index}:${String(candidate.row)}:${expectedRow}`)
    if (!AT_OPERATOR_SHEET_ROW_STATES.includes(candidate.rowState as AtOperatorSheetRowState)) throw new Error(`row_state_value_invalid:${expectedRow}:${String(candidate.rowState)}`)
    if (candidate.qaFlag !== AT_OPERATOR_SHEET_INITIAL_QA_FLAG) throw new Error(`row_state_qa_flag_invalid:${expectedRow}:${String(candidate.qaFlag)}`)
    return { row: expectedRow, rowState: candidate.rowState as AtOperatorSheetRowState, qaFlag: AT_OPERATOR_SHEET_INITIAL_QA_FLAG }
  })

  return `${JSON.stringify(canonical)}\n`
}

export const encodeAtOperatorSheetRowStates = (value: unknown): Uint8Array =>
  new TextEncoder().encode(serializeAtOperatorSheetRowStates(value))

export const AT_OPERATOR_SHEET_PLATFORM_RECORDS = Object.freeze([
  Object.freeze({ id: 'ios-vo', label: 'VoiceOver-iOS', evidenceSegment: 'ios-vo', view: 'mobile' }),
  Object.freeze({ id: 'macos-vo', label: 'VoiceOver-macOS', evidenceSegment: 'macos-vo', view: 'desktop' }),
  Object.freeze({ id: 'android-tb', label: 'TalkBack-Android', evidenceSegment: 'android-tb', view: 'mobile' }),
] as const)

export type AtOperatorSheetPlatformId = typeof AT_OPERATOR_SHEET_PLATFORM_RECORDS[number]['id']
export type AtOperatorSheetMobilePlatformId = Extract<AtOperatorSheetPlatformId, 'ios-vo' | 'android-tb'>

export const AT_OPERATOR_SHEET_MOBILE_REQUIRED_PLATFORM_IDS = Object.freeze(['ios-vo', 'android-tb'] as const)
export const AT_OPERATOR_SHEET_DESKTOP_REQUIRED_PLATFORM_IDS = Object.freeze(['macos-vo'] as const)

export const atOperatorSheetMobileEvidencePrefix = (
  build12: string,
  runUTC: string,
  rowId: `OS-M0${4 | 5 | 6}`,
  platformId: AtOperatorSheetMobilePlatformId,
) => `du/R85/${build12}/${runUTC}/${rowId}/mobile/${platformId}/1.`

export const AT_OPERATOR_SHEET_SCOPE = '[data-at-operator-sheet]' as const

export const AT_OPERATOR_SHEET_PALETTE = Object.freeze({
  '--oc-bg': '#090b09',
  '--oc-surface': '#0d100d',
  '--oc-surface-raised': '#111411',
  '--oc-rule': '#292e29',
  '--oc-rule-strong': '#3a423a',
  '--oc-text': '#f2f4f0',
  '--oc-muted': '#a6aea4',
  '--oc-accent': '#adff2f',
} as const)

export const AT_OPERATOR_SHEET_SURFACE_TOKEN_NAMES = Object.freeze([
  '--oc-bg',
  '--oc-surface',
  '--oc-surface-raised',
] as const)

export const AT_OPERATOR_SHEET_NEUTRAL_TOKEN_NAMES = Object.freeze([
  '--oc-bg',
  '--oc-surface',
  '--oc-surface-raised',
  '--oc-rule',
  '--oc-rule-strong',
  '--oc-text',
  '--oc-muted',
] as const)

export const AT_OPERATOR_SHEET_ACCENT_ALLOWED_POSITIONS = Object.freeze([
  'current-row:border-left-color',
  'current-card:border-left-color',
  'focused-control:outline-color',
  'selected-input:border-color',
] as const)

export const AT_OPERATOR_SHEET_ACCENT_FORBIDDEN_PROPERTIES = Object.freeze([
  'background-color',
  'background-image',
  'box-shadow',
  'fill',
] as const)

export const AT_OPERATOR_SHEET_BADGE_ACCENT_FORBIDDEN_PROPERTIES = Object.freeze([
  'color',
  'background-color',
] as const)
