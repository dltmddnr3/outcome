import assert from 'node:assert/strict'
import test from 'node:test'
import { assertDashboardMeasurement } from './browser-assertions.mjs'

const passingMeasurement = () => ({
  documentOverflow: 0, clippedDescendants: [], ellipsisTruncation: [], viewportEscape: [], siblingIntersections: [], undersizedText: [], lowContrastText: [], undersizedControls: [], unexpectedEnglish: [], translationFallback: [], activeAnimationCount: 0,
  pageHeading: true, sequentialHeadings: true, compactHero: true, liveSemantics: true, structureTruth: true, oneMapSurface: true, roving: true, desktopColumns: true, mobileDrill: true, gateCountTruth: true, gaugeTruth: true, explorationTruth: true, groupTruth: true, singleStaleNowSignal: true, technicalCollapsed: true, technicalEvidence: true, noFabricatedProgress: true, firstFold: true,
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
