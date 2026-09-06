import { createHash } from 'node:crypto'
import {
  AT_OPERATOR_SHEET_ACCENT_ALLOWED_POSITIONS,
  AT_OPERATOR_SHEET_MOBILE_REQUIRED_PLATFORM_IDS,
  AT_OPERATOR_SHEET_PALETTE,
  AT_OPERATOR_SHEET_PAINT_ELEMENT_ROLES,
  AT_OPERATOR_SHEET_PLATFORM_RECORDS,
  AT_OPERATOR_SHEET_SCOPE,
  atOperatorSheetMobileEvidencePrefix,
  serializeAtOperatorSheetRowStates,
} from '../src/components/atOperatorSheetContract.ts'

const sha256 = (value) => createHash('sha256').update(value, 'utf8').digest('hex')
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value))
const assertExactKeys = (value, expected, error) => {
  if (!isRecord(value)) throw new Error(error)
  const actual = Object.keys(value).sort()
  const wanted = [...expected].sort()
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) throw new Error(error)
}

export function assertAtOperatorSheetRowStateInvariant(before, after) {
  const beforeText = serializeAtOperatorSheetRowStates(before)
  const afterText = serializeAtOperatorSheetRowStates(after)
  if (beforeText !== afterText) {
    const index = before.findIndex((row, rowIndex) => JSON.stringify(row) !== JSON.stringify(after[rowIndex]))
    throw new Error(`row_state_changed:${before[index]?.row ?? after[index]?.row ?? index}`)
  }
  return Object.freeze({ bytes: Buffer.byteLength(beforeText, 'utf8'), sha256: sha256(beforeText) })
}

const mobileRows = new Set(['OS-M04', 'OS-M05', 'OS-M06'])
const allPlatformIds = new Set(AT_OPERATOR_SHEET_PLATFORM_RECORDS.map(({ id }) => id))
const mobilePlatformIds = new Set(AT_OPERATOR_SHEET_MOBILE_REQUIRED_PLATFORM_IDS)

export function assertAtOperatorSheetMobilePlatformEvidence(value) {
  assertExactKeys(value, ['rowId', 'build12', 'runUTC', 'evidence'], 'mobile_evidence_shape_invalid')
  if (!mobileRows.has(value.rowId)) throw new Error(`mobile_row_invalid:${String(value.rowId)}`)
  if (typeof value.build12 !== 'string' || !/^[0-9a-f]{12}$/.test(value.build12)) throw new Error('mobile_build12_invalid')
  if (typeof value.runUTC !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value.runUTC)) throw new Error('mobile_runUTC_invalid')
  if (!Array.isArray(value.evidence)) throw new Error('mobile_evidence_not_array')

  const seen = new Set()
  for (const [index, entry] of value.evidence.entries()) {
    assertExactKeys(entry, ['platformId', 'pathPrefix'], `mobile_evidence_entry_shape_invalid:${index}`)
    if (!allPlatformIds.has(entry.platformId)) throw new Error(`mobile_platform_unknown:${String(entry.platformId)}`)
    if (!mobilePlatformIds.has(entry.platformId)) throw new Error(`mobile_platform_not_allowed:${entry.platformId}`)
    if (seen.has(entry.platformId)) throw new Error(`mobile_platform_duplicate:${entry.platformId}`)
    seen.add(entry.platformId)
    const expected = atOperatorSheetMobileEvidencePrefix(value.build12, value.runUTC, value.rowId, entry.platformId)
    if (entry.pathPrefix !== expected) throw new Error(`mobile_evidence_path_invalid:${entry.platformId}`)
  }

  const missing = AT_OPERATOR_SHEET_MOBILE_REQUIRED_PLATFORM_IDS.filter((id) => !seen.has(id))
  if (missing.length) throw new Error(`mobile_platform_missing:${missing.join(',')}`)
  if (value.evidence.length !== AT_OPERATOR_SHEET_MOBILE_REQUIRED_PLATFORM_IDS.length) throw new Error(`mobile_evidence_count_invalid:${value.evidence.length}`)
  return Object.freeze({ complete: true, platforms: Object.freeze([...AT_OPERATOR_SHEET_MOBILE_REQUIRED_PLATFORM_IDS]) })
}

const allowedProperties = new Set(['background-color', 'background-image', 'box-shadow', 'fill', 'color', 'border-left-color', 'border-color', 'outline-color'])
const paintlessProperties = new Set(['background-image', 'box-shadow'])
const accentAllowedPositions = new Set(AT_OPERATOR_SHEET_ACCENT_ALLOWED_POSITIONS)
const paintElementRoles = new Set(AT_OPERATOR_SHEET_PAINT_ELEMENT_ROLES)
const paletteColors = new Set(Object.values(AT_OPERATOR_SHEET_PALETTE).map((value) => value.toLowerCase()))
const accent = AT_OPERATOR_SHEET_PALETTE['--oc-accent']

const toHex = (red, green, blue) => `#${[red, green, blue].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
const parseColor = (input) => {
  if (typeof input !== 'string') throw new Error(`paint_value_invalid:${String(input)}`)
  const value = input.trim().toLowerCase()
  if (value === 'transparent') return { hex: '#000000', alpha: 0 }
  const hex = value.match(/^#([0-9a-f]{6})$/)
  if (hex) return { hex: `#${hex[1]}`, alpha: 1 }
  const rgb = value.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(0|1|0?\.\d+))?\s*\)$/)
  if (!rgb) throw new Error(`paint_value_invalid:${input}`)
  const channels = rgb.slice(1, 4).map(Number)
  const alpha = rgb[4] === undefined ? 1 : Number(rgb[4])
  if (channels.some((channel) => channel < 0 || channel > 255) || alpha < 0 || alpha > 1) throw new Error(`paint_value_invalid:${input}`)
  return { hex: toHex(...channels), alpha }
}

const assertPaintKeys = (value, expected, prefix, index) => {
  const location = index === undefined ? '' : `:${index}`
  if (!isRecord(value)) throw new Error(`${prefix}_record_invalid${location}`)
  const actual = Object.keys(value)
  const missing = expected.filter((key) => !actual.includes(key)).sort()
  if (missing.length) throw new Error(`${prefix}_missing_keys${location}:${missing.join(',')}`)
  const extra = actual.filter((key) => !expected.includes(key)).sort()
  if (extra.length) throw new Error(`${prefix}_extra_keys${location}:${extra.join(',')}`)
}

export function assertAtOperatorSheetPaint(value) {
  assertPaintKeys(value, ['scopeSelector', 'matchedScopeCount', 'observations'], 'paint_carrier')
  if (value.scopeSelector !== AT_OPERATOR_SHEET_SCOPE) throw new Error(`paint_scope_mismatch:${String(value.scopeSelector)}:${AT_OPERATOR_SHEET_SCOPE}`)
  if (!Number.isInteger(value.matchedScopeCount) || value.matchedScopeCount < 1) throw new Error(`paint_scope_census_invalid:${String(value.matchedScopeCount)}`)
  const observations = value.observations
  if (!Array.isArray(observations) || observations.length === 0) throw new Error('paint_observations_empty')
  for (const [index, observation] of observations.entries()) {
    assertPaintKeys(observation, ['elementRole', 'property', 'value'], 'paint_observation', index)
    if (!paintElementRoles.has(observation.elementRole)) throw new Error(`paint_element_role_unknown:${index}:${String(observation.elementRole)}`)
    if (!allowedProperties.has(observation.property)) throw new Error(`paint_property_invalid:${String(observation.property)}`)
    if (paintlessProperties.has(observation.property)) {
      if (observation.value !== 'none') throw new Error(`paint_value_not_allowed:${observation.elementRole}:${observation.property}:${observation.value}`)
      continue
    }
    const normalized = parseColor(observation.value)
    if (normalized.alpha !== 1) throw new Error(`paint_alpha_not_allowed:${observation.elementRole}:${observation.property}:${observation.value}`)
    if (!paletteColors.has(normalized.hex)) throw new Error(`paint_value_not_allowed:${observation.elementRole}:${observation.property}:${observation.value}`)
    if (normalized.hex === accent && !accentAllowedPositions.has(`${observation.elementRole}:${observation.property}`)) throw new Error(`accent_placement_forbidden:${observation.elementRole}:${observation.property}`)
  }
  return Object.freeze({ valid: true, observations: observations.length })
}
