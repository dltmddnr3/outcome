import assert from 'node:assert/strict'
import test from 'node:test'
import { assertDashboardMeasurement, assertMobileStickyMeasurement } from './browser-assertions.mjs'

const passingMeasurement = () => ({
  documentOverflow: 0, clippedDescendants: [], ellipsisTruncation: [], viewportEscape: [], siblingIntersections: [], undersizedText: [], lowContrastText: [], undersizedControls: [], unexpectedEnglish: [], translationFallback: [], activeAnimationCount: 0,
  pageHeading: true, sequentialHeadings: true, compactHero: true, heroGeometry: true, mobileMapFirstFold: true, mobileDomOrder: true, phaseLabelsFull: true, liveSemantics: true, structureTruth: true, oneMapSurface: true, roving: true, desktopColumns: true, mobileDrill: true, gateCountTruth: true, gaugeTruth: true, explorationTruth: true, groupTruth: true, singleStaleNowSignal: true, technicalCollapsed: true, technicalEvidence: true, noFabricatedProgress: true, firstFold: true,
})

test('all contracted viewport names accept the interactive hierarchy measurement', () => {
  for (const name of ['desktop-1440x900/outcome/stage', 'mobile-390x844/outcome/stage', 'phone-375x812/cherry-note/stage', 'landscape-844x390/cherry-note/stage']) assert.doesNotThrow(() => assertDashboardMeasurement(name, passingMeasurement()))
})

test('hierarchy assertions fail closed for duplicate surfaces, false gauge, and selection drift', () => {
  assert.throws(() => assertDashboardMeasurement('desktop/outcome', { ...passingMeasurement(), oneMapSurface: false }), /oneMapSurface=false/)
  assert.throws(() => assertDashboardMeasurement('desktop/outcome', { ...passingMeasurement(), gaugeTruth: false }), /gaugeTruth=false/)
  assert.throws(() => assertDashboardMeasurement('mobile/outcome', { ...passingMeasurement(), explorationTruth: false }), /explorationTruth=false/)
})

test('responsive assertions fail closed for wrong columns, stacked mobile levels, or clipped descendants', () => {
  assert.throws(() => assertDashboardMeasurement('desktop/outcome', { ...passingMeasurement(), desktopColumns: false }), /desktopColumns=false/)
  assert.throws(() => assertDashboardMeasurement('mobile/outcome', { ...passingMeasurement(), mobileDrill: false }), /mobileDrill=false/)
  assert.throws(() => assertDashboardMeasurement('mobile/outcome', { ...passingMeasurement(), clippedDescendants: ['inner'] }), /clipped=inner/)
})

test('H12 geometry regressions fail closed for oversized Hero, hidden mobile Map, wrong DOM order, and clipped Phase labels', () => {
  for (const key of ['heroGeometry', 'mobileMapFirstFold', 'mobileDomOrder', 'phaseLabelsFull']) assert.throws(() => assertDashboardMeasurement('mobile-390x844/outcome', { ...passingMeasurement(), [key]: false }), new RegExp(`${key}=false`))
})

test('mobile sticky context requires exact scroll retention and ordered visible band plus actual-current header', () => {
  const passing = { scrollY: 960, viewportHeight: 844, wrapperTop: 0, bandTop: 0, bandBottom: 82, headerTop: 82, headerBottom: 148 }
  assert.doesNotThrow(() => assertMobileStickyMeasurement('mobile-390x844/outcome', passing))
  assert.throws(() => assertMobileStickyMeasurement('mobile-390x844/outcome', { ...passing, wrapperTop: -369.17, bandTop: -369.17, headerTop: -222.28 }), /wrapperTop=-369.17/)
  assert.throws(() => assertMobileStickyMeasurement('mobile-390x844/outcome', { ...passing, scrollY: 958 }), /scrollY=958/)
})
