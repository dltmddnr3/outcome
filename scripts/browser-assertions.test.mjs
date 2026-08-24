import assert from 'node:assert/strict'
import test from 'node:test'
import { assertDashboardMeasurement } from './browser-assertions.mjs'

const passingMeasurement = (gateRowTop = 1200) => ({
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
  pageHeading: true,
  sequentialHeadings: true,
  heroGateContract: true,
  noDuplicateProgress: true,
  compactRoles: true,
  liveSemantics: true,
  roleCopyPolish: true,
  heroPrimaryIdentity: true,
  activityBand: true,
  unifiedFlow: true,
  funnelCounts: true,
  funnelPurpose: true,
  placementOnly: true,
  scopeJourney: true,
  explorerSemantics: true,
  listboxOwnership: true,
  explorerGeometry: true,
  allStagesDiscoverable: true,
  explorationHonest: true,
  detailSemantics: true,
  detailGateTruth: true,
  currentDetailDedup: true,
  adaptiveGateGroups: true,
  timingHonesty: true,
  noFabricatedProgress: true,
  contentPreservation: true,
  technicalCollapsed: true,
  technicalEvidence: true,
  mobileAuthoritativeOrder: true,
})

test('all contracted viewport names accept a complete IA measurement', () => {
  for (const name of ['desktop-1440x900/cherry-note/stage', 'mobile-390x844/outcome/stage', 'phone-375x812/outcome/stage', 'landscape-844x390/cherry-note/stage']) assert.doesNotThrow(() => assertDashboardMeasurement(name, passingMeasurement()))
})

test('IA assertions fail closed for duplicated progress or broken listbox semantics', () => {
  assert.throws(() => assertDashboardMeasurement('desktop-1440x900/outcome/stage', { ...passingMeasurement(), noDuplicateProgress: false }), /noDuplicateProgress=false/)
  assert.throws(() => assertDashboardMeasurement('mobile-390x844/outcome/stage', { ...passingMeasurement(), explorerSemantics: false }), /explorerSemantics=false/)
  assert.throws(() => assertDashboardMeasurement('desktop-1440x900/outcome/stage', { ...passingMeasurement(), listboxOwnership: false }), /listboxOwnership=false/)
  assert.throws(() => assertDashboardMeasurement('desktop-1440x900/outcome/stage', { ...passingMeasurement(), detailGateTruth: false }), /detailGateTruth=false/)
  assert.throws(() => assertDashboardMeasurement('desktop-1440x900/outcome/stage', { ...passingMeasurement(), currentDetailDedup: false }), /currentDetailDedup=false/)
  assert.throws(() => assertDashboardMeasurement('mobile-390x844/outcome/stage', { ...passingMeasurement(), adaptiveGateGroups: false }), /adaptiveGateGroups=false/)
})

test('IA assertions fail closed for tapered flow or disconnected Scope journey', () => {
  assert.throws(() => assertDashboardMeasurement('desktop-1440x900/outcome/stage', { ...passingMeasurement(), unifiedFlow: false }), /unifiedFlow=false/)
  assert.throws(() => assertDashboardMeasurement('mobile-390x844/outcome/stage', { ...passingMeasurement(), scopeJourney: false }), /scopeJourney=false/)
})
