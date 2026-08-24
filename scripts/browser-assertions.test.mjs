import assert from 'node:assert/strict'
import test from 'node:test'
import { assertDashboardMeasurement } from './browser-assertions.mjs'

const passingMeasurement = (gateRowTop) => ({
  gateRowTop,
  documentOverflow: 0,
  clippedDescendants: [],
  ellipsisTruncation: [],
  viewportEscape: [],
  siblingIntersections: [],
  undersizedControls: [],
  undersizedText: [],
  lowContrastText: [],
  unexpectedEnglish: [],
  translationFallback: [],
  activeAnimationCount: 0,
  currentNextReadable: true,
  allStagesDiscoverable: true,
  selectedStageExposed: true,
  sourceStatusText: true,
  hero: true,
  pageHeading: true,
  sequentialHeadings: true,
  mobileTwoColumns: true,
  nowStaleHonesty: true,
  standaloneHeadingAbsent: true,
  funnelCounts: true,
  funnelPurpose: true,
  funnelShape: true,
  railSemantics: true,
  heroFillSemantics: true,
  currentGateTruth: true,
  placementOnly: true,
  timingHonesty: true,
  contentPreservation: true,
  scopeJourney: true,
  scopeConnectorContinuity: true,
  scopeConnectorGap: 0,
  activeScopeWrapperBackgrounds: ['rgba(0, 0, 0, 0)'],
  liveSemantics: true,
  repeatingSemanticElements: 0,
  explorationHonest: true,
  technicalCollapsed: true,
  technicalEvidence: true,
  mobileAuthoritativeOrder: true,
  bottomShellState: true,
  detailSemantics: true,
})

test('local and remote mobile viewport names reject gate row top 1689', () => {
  for (const name of ['mobile-390x844/cherry-note/stage', 'remote-mobile-390x844/outcome/stage']) {
    assert.throws(() => assertDashboardMeasurement(name, passingMeasurement(1689)), /gateRowTop=1689/)
  }
})

test('mobile boundary and current measurements pass', () => {
  assert.doesNotThrow(() => assertDashboardMeasurement('mobile-390x844/cherry-note/stage', passingMeasurement(1688)))
  assert.doesNotThrow(() => assertDashboardMeasurement('mobile-390x844/cherry-note/stage', passingMeasurement(1679)))
  assert.doesNotThrow(() => assertDashboardMeasurement('remote-mobile-390x844/outcome/stage', passingMeasurement(1646)))
})

test('desktop viewport does not receive the mobile 1688 budget', () => {
  assert.doesNotThrow(() => assertDashboardMeasurement('desktop-1440x900/cherry-note/stage', passingMeasurement(1689)))
})

test('desktop opaque Scope wrapper fails connector continuity', () => {
  assert.throws(() => assertDashboardMeasurement('desktop-1440x900/cherry-note/stage', { ...passingMeasurement(1200), scopeConnectorContinuity: false, scopeConnectorGap: 0.02, activeScopeWrapperBackgrounds: ['rgb(21, 32, 20)'] }), /scopeConnectorContinuity=false.*rgb\(21, 32, 20\).*gap=0\.02/)
})
