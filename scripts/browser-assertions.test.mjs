import assert from 'node:assert/strict'
import test from 'node:test'
import { assertDashboardMeasurement, assertMobileStickyMeasurement, assertSourceGroupOccurrences, sourceLabeledGroupStageKeys } from './browser-assertions.mjs'

const passingMeasurement = () => ({
  documentOverflow: 0, clippedDescendants: [], ellipsisTruncation: [], viewportEscape: [], siblingIntersections: [], roleDescendantIntersections: [], roleStatusOverflow: [], undersizedText: [], lowContrastText: [], undersizedControls: [], unexpectedEnglish: [], translationFallback: [], activeAnimationCount: 0, heroHeight: 352,
  pageHeading: true, sequentialHeadings: true, compactHero: true, roleGeometry: true, heroGeometry: true, mobileMapFirstFold: true, mobileDomOrder: true, mobileHierarchyTruth: true, workspaceSidebarTruth: true, refinedVisualSystemTruth: true, currentStageActionTruth: true, singleProgressRailTruth: true, phaseNavigationUniqueTruth: true, currentSelectionDistinctionTruth: true, folderHierarchyTruth: true, phaseCurrentMarkerTruth: true, phaseLabelsFull: true, phaseBandTruth: true, phaseOptionTitlesFull: true, desktopPhaseListFirstFold: true, liveSemantics: true, structureTruth: true, phaseCompletionTruth: true, stagePositionTruth: true, snapshotHeroTruth: true, oneMapSurface: true, roving: true, desktopColumns: true, mobileDrill: true, gateCountTruth: true, gaugeTruth: true, explorationTruth: true, groupTruth: true, singleStaleNowSignal: true, snapshotBadgeTextTruth: true, technicalCollapsed: true, technicalEvidence: true, noFabricatedProgress: true, firstFold: true,
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

test('mobile hierarchy clarity fails closed when the fourth tab or visible active marker is absent', () => {
  assert.throws(() => assertDashboardMeasurement('mobile/outcome', { ...passingMeasurement(), mobileHierarchyTruth: false }), /mobileHierarchyTruth=false/)
})

test('workspace sidebar fails closed when its IA or truthful disabled boundary disappears', () => {
  assert.throws(() => assertDashboardMeasurement('desktop/outcome', { ...passingMeasurement(), workspaceSidebarTruth: false }), /workspaceSidebarTruth=false/)
  assert.throws(() => assertDashboardMeasurement('desktop/outcome', { ...passingMeasurement(), refinedVisualSystemTruth: false }), /refinedVisualSystemTruth=false/)
})

test('current-stage return action and the single project progress rail fail closed when absent', () => {
  assert.throws(() => assertDashboardMeasurement('mobile/outcome', { ...passingMeasurement(), currentStageActionTruth: false }), /currentStageActionTruth=false/)
  assert.throws(() => assertDashboardMeasurement('mobile/outcome', { ...passingMeasurement(), singleProgressRailTruth: false }), /singleProgressRailTruth=false/)
})

test('Phase navigation fails closed when duplicated or when actual current and touched selection are confused', () => {
  assert.throws(() => assertDashboardMeasurement('mobile/outcome', { ...passingMeasurement(), phaseNavigationUniqueTruth: false }), /phaseNavigationUniqueTruth=false/)
  assert.throws(() => assertDashboardMeasurement('mobile/outcome', { ...passingMeasurement(), currentSelectionDistinctionTruth: false }), /currentSelectionDistinctionTruth=false/)
  assert.throws(() => assertDashboardMeasurement('mobile/outcome', { ...passingMeasurement(), phaseCurrentMarkerTruth: false }), /phaseCurrentMarkerTruth=false/)
})

test('connected folder hierarchy fails closed when nested Scope or Stage rails disappear', () => {
  assert.throws(() => assertDashboardMeasurement('mobile/outcome', { ...passingMeasurement(), folderHierarchyTruth: false }), /folderHierarchyTruth=false/)
})

test('H12 geometry regressions fail closed for oversized Hero, hidden mobile Map, wrong DOM order, and clipped Phase labels', () => {
  for (const key of ['heroGeometry', 'mobileMapFirstFold', 'mobileDomOrder', 'phaseLabelsFull']) assert.throws(() => assertDashboardMeasurement('mobile-390x844/outcome', { ...passingMeasurement(), [key]: false }), new RegExp(`${key}=false`))
  assert.throws(() => assertDashboardMeasurement('mobile-390x844/outcome', { ...passingMeasurement(), heroGeometry: false, heroHeight: 393.4375 }), /heroGeometry=false.*heroHeight=393\.4375/)
})

test('mobile sticky context requires exact scroll retention and ordered visible band plus actual-current header', () => {
  const passing = { scrollY: 960, viewportHeight: 844, wrapperTop: 0, bandTop: 0, bandBottom: 82, headerTop: 82, headerBottom: 148 }
  assert.doesNotThrow(() => assertMobileStickyMeasurement('mobile-390x844/outcome', passing))
  assert.throws(() => assertMobileStickyMeasurement('mobile-390x844/outcome', { ...passing, wrapperTop: -369.17, bandTop: -369.17, headerTop: -222.28 }), /wrapperTop=-369.17/)
  assert.throws(() => assertMobileStickyMeasurement('mobile-390x844/outcome', { ...passing, scrollY: 958 }), /scrollY=958/)
})

test('role geometry fails closed unless every name and status stays on one line without intersections or overflow', () => {
  assert.throws(() => assertDashboardMeasurement('mobile-390x844/cherry-note', { ...passingMeasurement(), roleGeometry: false }), /roleGeometry=false/)
  assert.throws(() => assertDashboardMeasurement('mobile-390x844/cherry-note', { ...passingMeasurement(), roleDescendantIntersections: ['사용성·제품 검수/출시 감사'] }), /roleIntersections=/)
  assert.throws(() => assertDashboardMeasurement('mobile-390x844/cherry-note', { ...passingMeasurement(), roleStatusOverflow: ['사용성·제품 검수:114x44->114x111'] }), /roleStatusOverflow=/)
})

test('single progress rail fails closed for source Phase count drift, empty width, and label clipping', () => {
  assert.throws(() => assertDashboardMeasurement('mobile-390x844/cherry-note', { ...passingMeasurement(), phaseBandTruth: false, phaseCount: 1, phaseCompartmentCount: 1, phaseTrackCount: 5, occupiedBandRatio: .1987 }), /phaseBandTruth=false/)
  assert.throws(() => assertDashboardMeasurement('mobile-390x844/outcome', { ...passingMeasurement(), phaseLabelsFull: false, phaseCount: 5, phaseCompartmentCount: 5, phaseTrackCount: 5, occupiedBandRatio: .994 }), /phaseLabelsFull=false/)
})

test('U1-U3 user-truth assertions fail closed for Phase overclaim, ambiguous Stage fractions, and live-like snapshot wording', () => {
  assert.throws(() => assertDashboardMeasurement('desktop/outcome', { ...passingMeasurement(), phaseCompletionTruth: false }), /phaseCompletionTruth=false/)
  assert.throws(() => assertDashboardMeasurement('desktop/outcome', { ...passingMeasurement(), stagePositionTruth: false }), /stagePositionTruth=false/)
  assert.throws(() => assertDashboardMeasurement('mobile/outcome', { ...passingMeasurement(), snapshotHeroTruth: false }), /snapshotHeroTruth=false/)
})

test('interactive Phase options fail closed for vertical or horizontal title clipping and lost desktop first-fold visibility', () => {
  assert.throws(() => assertDashboardMeasurement('desktop-1440x900/outcome', { ...passingMeasurement(), phaseOptionTitlesFull: false }), /phaseOptionTitlesFull=false/)
  assert.throws(() => assertDashboardMeasurement('landscape-844x390/outcome', { ...passingMeasurement(), phaseOptionTitlesFull: false }), /phaseOptionTitlesFull=false/)
  assert.throws(() => assertDashboardMeasurement('desktop-1440x900/outcome', { ...passingMeasurement(), desktopPhaseListFirstFold: false }), /desktopPhaseListFirstFold=false/)
})

test('deployment snapshot badge fails closed below the 11px text contract', () => {
  assert.throws(() => assertDashboardMeasurement('mobile-390x844/outcome', { ...passingMeasurement(), snapshotBadgeTextTruth: false, snapshotBadgeTextSizes: [10, 8] }), /snapshotBadgeTextTruth=false/)
})

test('source-labeled Gate group expectations derive from the Package payload', () => {
  const dashboard = { projects: [{ project: { id: 'outcome' }, phases: [{ scopes: [{ stages: [
    { id: 'outcome-stage-stable-snapshot-host', gate: { available: true, groups: [{ code: 'S', name: '안정적인 공개 호스트' }] } },
    { id: 'outcome-stage-generic', gate: { available: true, groups: [{ code: 'G', name: 'G' }] } },
    { id: 'outcome-stage-no-gates', gate: { available: false, groups: [] } },
  ] }] }] }] }
  assert.deepEqual(sourceLabeledGroupStageKeys(dashboard), ['outcome:outcome-stage-stable-snapshot-host'])
})

test('source-labeled Gate group occurrence check fails closed for missing, generic, or duplicate sections', () => {
  const expected = ['outcome:outcome-stage-stable-snapshot-host']
  assert.doesNotThrow(() => assertSourceGroupOccurrences('desktop', expected, expected))
  assert.throws(() => assertSourceGroupOccurrences('desktop', expected, []), /missing=outcome:outcome-stage-stable-snapshot-host/)
  assert.throws(() => assertSourceGroupOccurrences('desktop', expected, ['outcome:outcome-stage-generic']), /unexpected=outcome:outcome-stage-generic/)
  assert.throws(() => assertSourceGroupOccurrences('desktop', expected, [...expected, ...expected]), /unexpected=outcome:outcome-stage-stable-snapshot-host/)
})
