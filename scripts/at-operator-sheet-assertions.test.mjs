import assert from 'node:assert/strict'
import test from 'node:test'
import { AT_OPERATOR_SHEET_SCOPE, createInitialAtOperatorSheetRowStates } from '../src/components/atOperatorSheetContract.ts'
import {
  assertAtOperatorSheetMobilePlatformEvidence,
  assertAtOperatorSheetPaint,
  assertAtOperatorSheetRowStateInvariant,
} from './at-operator-sheet-assertions.mjs'

const mobileEvidence = (overrides = {}) => ({
  rowId: 'OS-M04',
  build12: 'abc123def456',
  runUTC: '20260907T120000Z',
  evidence: [
    { platformId: 'ios-vo', pathPrefix: 'du/R85/abc123def456/20260907T120000Z/OS-M04/mobile/ios-vo/1.' },
    { platformId: 'android-tb', pathPrefix: 'du/R85/abc123def456/20260907T120000Z/OS-M04/mobile/android-tb/1.' },
  ],
  ...overrides,
})
const paintEvidence = (observations, overrides = {}) => ({ scopeSelector: AT_OPERATOR_SHEET_SCOPE, matchedScopeCount: 1, observations, ...overrides })

test('canonical row-state bytes and SHA remain equal for an unchanged snapshot', () => {
  const rows = createInitialAtOperatorSheetRowStates()
  const result = assertAtOperatorSheetRowStateInvariant(rows, structuredClone(rows))
  assert.equal(result.bytes > 0, true)
  assert.match(result.sha256, /^[0-9a-f]{64}$/)
})

test('hostile row-state mutation fails with the exact differing row', () => {
  const before = createInitialAtOperatorSheetRowStates()
  const after = structuredClone(before)
  after[6].rowState = 'IN_PROGRESS'
  assert.throws(() => assertAtOperatorSheetRowStateInvariant(before, after), { message: 'row_state_changed:SC-07a' })
})

test('both exact mobile platforms and disambiguated paths satisfy completion', () => {
  assert.deepEqual(assertAtOperatorSheetMobilePlatformEvidence(mobileEvidence()), { complete: true, platforms: ['ios-vo', 'android-tb'] })
})

test('missing mobile platform evidence fails closed', () => {
  const value = mobileEvidence(); value.evidence.pop()
  assert.throws(() => assertAtOperatorSheetMobilePlatformEvidence(value), /mobile_platform_missing:android-tb/)
})

test('duplicate mobile platform evidence fails closed', () => {
  const value = mobileEvidence(); value.evidence[1] = { ...value.evidence[0] }
  assert.throws(() => assertAtOperatorSheetMobilePlatformEvidence(value), /mobile_platform_duplicate:ios-vo/)
})

test('unknown and desktop-only platform evidence fail closed', () => {
  const unknown = mobileEvidence(); unknown.evidence[1] = { platformId: 'windows-narrator', pathPrefix: 'du/R85/abc123def456/20260907T120000Z/OS-M04/mobile/windows-narrator/1.' }
  assert.throws(() => assertAtOperatorSheetMobilePlatformEvidence(unknown), /mobile_platform_unknown:windows-narrator/)
  const desktop = mobileEvidence(); desktop.evidence[1] = { platformId: 'macos-vo', pathPrefix: 'du/R85/abc123def456/20260907T120000Z/OS-M04/mobile/macos-vo/1.' }
  assert.throws(() => assertAtOperatorSheetMobilePlatformEvidence(desktop), /mobile_platform_not_allowed:macos-vo/)
})

test('colliding or invented mobile evidence paths fail closed', () => {
  const value = mobileEvidence(); value.evidence[1].pathPrefix = value.evidence[0].pathPrefix
  assert.throws(() => assertAtOperatorSheetMobilePlatformEvidence(value), /mobile_evidence_path_invalid:android-tb/)
})

test('malformed build and run path segments fail closed before path comparison', () => {
  assert.throws(() => assertAtOperatorSheetMobilePlatformEvidence(mobileEvidence({ build12: '../escape' })), /mobile_build12_invalid/)
  assert.throws(() => assertAtOperatorSheetMobilePlatformEvidence(mobileEvidence({ runUTC: '..' })), /mobile_runUTC_invalid/)
})

test('exact neutral paints and the three allowed accent positions pass', () => {
  const result = assertAtOperatorSheetPaint(paintEvidence([
    { elementRole: 'sheet', property: 'background-color', value: 'rgb(9, 11, 9)' },
    { elementRole: 'badge', property: 'color', value: '#a6aea4' },
    { elementRole: 'current-row', property: 'border-left-color', value: '#adff2f' },
    { elementRole: 'current-card', property: 'border-left-color', value: 'rgb(173, 255, 47)' },
    { elementRole: 'focused-control', property: 'outline-color', value: '#adff2f' },
    { elementRole: 'selected-input', property: 'border-color', value: '#adff2f' },
    { elementRole: 'preview', property: 'box-shadow', value: 'none' },
  ]))
  assert.deepEqual(result, { valid: true, observations: 7 })
})

test('paint carrier requires the exact non-empty Operator Sheet scope', () => {
  const observations = [{ elementRole: 'sheet', property: 'background-color', value: '#090b09' }]
  assert.equal(assertAtOperatorSheetPaint(paintEvidence(observations)).valid, true)
  assert.throws(() => assertAtOperatorSheetPaint({ matchedScopeCount: 1, observations }), { message: 'paint_carrier_missing_keys:scopeSelector' })
  assert.throws(() => assertAtOperatorSheetPaint(paintEvidence(observations, { scopeSelector: '.outside' })), { message: 'paint_scope_mismatch:.outside:[data-at-operator-sheet]' })
  assert.throws(() => assertAtOperatorSheetPaint(paintEvidence(observations, { matchedScopeCount: 0 })), { message: 'paint_scope_census_invalid:0' })
  assert.throws(() => assertAtOperatorSheetPaint(paintEvidence(observations, { matchedScopeCount: 1.5 })), { message: 'paint_scope_census_invalid:1.5' })
})

test('paint carrier and observations reject extra, missing, malformed, and external provenance exactly', () => {
  const valid = { elementRole: 'sheet', property: 'background-color', value: '#090b09' }
  assert.throws(() => assertAtOperatorSheetPaint(null), { message: 'paint_carrier_record_invalid' })
  assert.throws(() => assertAtOperatorSheetPaint({ ...paintEvidence([valid]), outside: true }), { message: 'paint_carrier_extra_keys:outside' })
  assert.throws(() => assertAtOperatorSheetPaint(paintEvidence('not-an-array')), { message: 'paint_observations_empty' })
  assert.throws(() => assertAtOperatorSheetPaint(paintEvidence([{ elementRole: 'sheet', property: 'background-color' }])), { message: 'paint_observation_missing_keys:0:value' })
  assert.throws(() => assertAtOperatorSheetPaint(paintEvidence([{ ...valid, outside: true }])), { message: 'paint_observation_extra_keys:0:outside' })
  assert.throws(() => assertAtOperatorSheetPaint(paintEvidence([null])), { message: 'paint_observation_record_invalid:0' })
  assert.throws(() => assertAtOperatorSheetPaint(paintEvidence([{ ...valid, elementRole: 'totally-unlisted-external-app-node' }])), { message: 'paint_element_role_unknown:0:totally-unlisted-external-app-node' })
})

test('accent in a forbidden background, fill, shadow, or badge position fails closed', () => {
  for (const observation of [
    { elementRole: 'sheet', property: 'background-color', value: '#adff2f' },
    { elementRole: 'preview', property: 'fill', value: '#adff2f' },
    { elementRole: 'preview', property: 'box-shadow', value: '0 0 2px #adff2f' },
    { elementRole: 'badge', property: 'color', value: '#adff2f' },
  ]) assert.throws(() => assertAtOperatorSheetPaint(paintEvidence([observation])), /(?:accent_placement_forbidden|paint_value_not_allowed)/)
})

test('near-accent, translucent or transparent paint, and unknown values fail closed', () => {
  assert.throws(() => assertAtOperatorSheetPaint(paintEvidence([{ elementRole: 'current-row', property: 'border-left-color', value: '#aeff2f' }])), /paint_value_not_allowed/)
  assert.throws(() => assertAtOperatorSheetPaint(paintEvidence([{ elementRole: 'current-row', property: 'border-left-color', value: 'rgba(173, 255, 47, 0.5)' }])), /paint_alpha_not_allowed/)
  assert.throws(() => assertAtOperatorSheetPaint(paintEvidence([{ elementRole: 'sheet', property: 'background-color', value: 'transparent' }])), /paint_alpha_not_allowed/)
  assert.throws(() => assertAtOperatorSheetPaint(paintEvidence([{ elementRole: 'sheet', property: 'background-color', value: 'color(display-p3 0 0 0)' }])), /paint_value_invalid/)
})
