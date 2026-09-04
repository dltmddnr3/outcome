import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
// @ts-expect-error The test runtime provides this Node built-in; the browser bundle never imports this file.
import { readFileSync } from 'node:fs'
import { ApprovalInbox, OutcomeDashboard, approvalInboxProjection, axisStateLabel, bindingHeroLabel, bindingObservationLabel, collapsedStageCount, currentHierarchy, defaultHierarchySelection, deriveScopeState, deriveStageRailState, desktopConversationBreakpoint, detailContentPolicy, entityStateLabel, findStage, gateGroupPresentation, gateProgress, githubEvidenceItems, heroGateEvidence, hierarchyIsExploring, hierarchyPlacement, meaningfulGateGroups, mobileHierarchyLevels, mobileWorkspaceTabs, nextStageOptionIndex, nowPresentation, projectHeroModel, resolveHierarchySelection, selectedGateCount, selectedStageContext, selectHierarchyPhase, selectHierarchyScope, selectLiveBinding, selectProject, snapshotPresentation, sourceStateLabel, stageDetailSemantics, structuralPhaseModel, structureStatusLabel, summarizeStage, timingPresentation, workspaceManagementItems, type Binding, type GithubConnector, type PackageProject, type PackageStage } from './OutcomeDashboard'
import { activityLabelKo, axisLabelKo, gatePresentation, groupPresentation, hierarchyLabels, loginErrorPresentation, phasePresentation, projectOutcomePresentation, roleLabel, stagePresentation } from './outcomeKorean'
import type { PrivateModelV2Projection } from '../lib/api'

const stage = (overrides: Partial<PackageStage> = {}): PackageStage => ({ id: 'stage-one', title: 'Stage One', purpose: 'Verify the result', dependsOn: [], gatePurpose: 'Stage One acceptance checklist', sourceState: 'present', state: 'active', gate: { gates: [{ id: 'G1', title: 'closed', closed: true, groupCode: 'G' }, { id: 'G2', title: 'remaining', closed: false, groupCode: 'G' }], groups: [{ code: 'G', name: '증거', closed: 1, total: 2 }], total: 2, closed: 1, available: true, sourceRef: 'GATES.md' }, axes: { implementation: 'active', test: 'pending', evidence: 'pending', independentQa: 'not_started', cherryAcceptance: 'pending', release: 'not_started' }, ...overrides })
const github = (overrides: Partial<GithubConnector> = {}): GithubConnector => ({ adopted: true, required: false, state: 'connected', repository: 'owner/repo', remoteName: 'origin', defaultBranch: 'main', completionAuthority: false, localCandidate: { state: 'available', branch: 'main', ahead: 15, behind: 0, sync: 'ahead' }, published: { state: 'connected', repository: 'owner/repo', ref: 'origin/main', detail: 'published' }, checks: { state: 'unknown' }, release: { state: 'unknown' }, ...overrides })
const project = (id: string, title: string): PackageProject => ({ status: 'valid', errors: [], observedAt: null, project: { id, name: title, outcome: `${title} outcome`, acceptanceAuthority: 'Cherry' }, connectors: { github: github() }, phases: [{ id: `${id}-phase`, title: 'Phase', purpose: 'Phase purpose', completion: null, scopes: [{ id: `${id}-scope`, title: 'Scope', purpose: 'Scope purpose', stages: [stage({ id: `${id}-stage` })] }] }], current: { phaseId: `${id}-phase`, scopeId: `${id}-scope`, stageId: `${id}-stage` }, next: null, bindings: [], now: { status: 'unbound', activity: null, observedAt: null, source: 'runtime_registry' }, progress: { available: false, reason: 'no_cross_stage_aggregate' } })
const styles = readFileSync(new URL('../styles.css', import.meta.url), 'utf8')
const declarationsFor = (css: string, selector: string) => css.split('}').flatMap((rule) => { const [selectors, body] = rule.split('{'); return selectors?.split(',').map((value) => value.trim()).includes(selector) ? [body ?? ''] : [] })
const effectiveProperty = (css: string, selector: string, property: string) => declarationsFor(css, selector).flatMap((body) => [...body.matchAll(new RegExp(`(?:^|;)${property}:([^;]+)`, 'g'))].map((match) => match[1].trim())).at(-1)
const luminance = (hex: string) => { const channels = hex.match(/[0-9a-f]{2}/gi)!.map((value) => Number.parseInt(value, 16) / 255).map((value) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4); return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2] }
const contrast = (left: string, right: string) => { const values = [luminance(left), luminance(right)].sort((a, b) => b - a); return (values[0] + .05) / (values[1] + .05) }
const visualViolations = (css: string) => [
  /(?:linear|radial)-gradient/i.test(css) && 'gradient',
  /\.oc-map-column button\[role=option\]>i\.complete\{[^}]*box-shadow:[^;}]*rgba\(173,255,47/i.test(css) && 'lime-glow',
  /\.oc-map-column button\[role=option\]>i\.complete\{[^}]*background:(?:#adff2f|var\(--oc-accent\))/i.test(css) && 'lime-container',
  /\.oc-map-column button\[role=option\]>i\.complete::after\{[^}]*(?:width|height):(?:9|[1-9][0-9])px/i.test(css) && 'oversized-marker',
].filter(Boolean)
const modelV2 = (overrides: Partial<PrivateModelV2Projection> = {}): PrivateModelV2Projection => ({ schemaVersion: 1, modelVersion: 2, project: { id: 'outcome', label: 'OUTCOME' }, destination: { id: 'destination-one', label: 'Cherry 판단 경계' }, remainingAcceptanceGap: { remaining: 1, total: 4 }, now: { observedAt: '2026-09-04T02:00:00.000Z', state: 'ready' }, readyBoundaryLabels: [], nextActionLabel: null, cherryActionLabel: null, state: 'ready', events: [], ...overrides })

describe('OUTCOME Package dashboard', () => {
  it('uses a neutral completed map node with one internal point accent no larger than 8px', () => {
    expect(effectiveProperty(styles, '.oc-map-column button[role=option]>i.complete', 'background')).toBe('#151a15')
    expect(effectiveProperty(styles, '.oc-map-column button[role=option]>i.complete::after', 'width')).toBe('7px')
    expect(effectiveProperty(styles, '.oc-map-column button[role=option]>i.complete::after', 'height')).toBe('7px')
    expect(effectiveProperty(styles, '.oc-map-column button[role=option]>i.complete::after', 'background')).toBe('var(--oc-accent)')
  })

  it('keeps default current and complete rail states above 3:1 adjacent contrast', () => {
    const colors = ['.oc-project-progress-track>i', '.oc-project-progress-track>i.current', '.oc-project-progress-track>i.complete'].map((selector) => effectiveProperty(styles, selector, 'background')!)
    expect(colors).toEqual(['#171918', '#737876', '#f2f4f0'])
    expect(contrast(colors[0], colors[1])).toBeGreaterThanOrEqual(3)
    expect(contrast(colors[1], colors[2])).toBeGreaterThanOrEqual(3)
  })

  it('rejects prohibited shipped gradients glow lime surfaces oversized markers and low contrast non-vacuously', () => {
    expect(visualViolations(styles)).toEqual([])
    expect(visualViolations(`${styles}.oc-map-column button[role=option]>i.complete{background:linear-gradient(#000,#fff)}`)).toContain('gradient')
    expect(visualViolations(`${styles}.oc-map-column button[role=option]>i.complete{box-shadow:0 0 8px rgba(173,255,47,.2)}`)).toContain('lime-glow')
    expect(visualViolations(`${styles}.oc-map-column button[role=option]>i.complete{background:#adff2f}`)).toContain('lime-container')
    expect(visualViolations(`${styles}.oc-map-column button[role=option]>i.complete::after{width:9px;height:9px}`)).toContain('oversized-marker')
    expect(contrast('#555857', '#707372')).toBeLessThan(3)
    expect(contrast('#707372', '#898c8b')).toBeLessThan(3)
  })
  it('projects at most one explicit Cherry action without inventing missing evidence or lineage', () => {
    expect(approvalInboxProjection(modelV2({ cherryActionLabel: '  후보 화면을 확인한다  ', nextActionLabel: 'Builder가 구현한다', readyBoundaryLabels: ['다음 단계'] }))).toEqual([{ kind: 'explicit_cherry_action', requestClass: '명시적 Cherry action', request: '후보 화면을 확인한다', requester: '알 수 없음', authorityTarget: 'Cherry', blockedTarget: 'Cherry 판단 경계', publicPin: '알 수 없음', evidence: '알 수 없음', expiry: '알 수 없음', freshness: '2026-09-04T02:00:00.000Z', lineage: '알 수 없음', immutableHistory: '알 수 없음' }])
    expect(approvalInboxProjection(modelV2({ cherryActionLabel: '   ', nextActionLabel: 'Cherry가 아닌 다음 행동', readyBoundaryLabels: ['승인처럼 보이는 경계'] }))).toEqual([])
  })
  it('projects a blocker only from a blocked model and supplied Planner or Builder blocker evidence', () => {
    const events: PrivateModelV2Projection['events'] = [
      { id: 'event-info', sequence: 1, role: 'planner', type: 'work_observed', summary: '일반 관측', observedAt: '2026-09-04T01:00:00.000Z', status: 'active', completionAuthority: false },
      { id: 'event-qa', sequence: 2, role: 'ux_product_qa', type: 'result_observed', summary: 'QA 실패', observedAt: '2026-09-04T01:10:00.000Z', status: 'failed', completionAuthority: false },
      { id: 'event-blocker', sequence: 3, role: 'builder', type: 'result_observed', summary: '고정 근거가 없어 안전 보류', observedAt: '2026-09-04T01:20:00.000Z', status: 'safe_hold', completionAuthority: false },
      { id: 'event-audit', sequence: 4, role: 'release_audit', type: 'result_observed', summary: '감사 거부', observedAt: '2026-09-04T01:30:00.000Z', status: 'rejected', completionAuthority: false },
    ]
    expect(approvalInboxProjection(modelV2({ state: 'blocked', now: { observedAt: '2026-09-04T02:00:00.000Z', state: 'blocked' }, events }))).toEqual([{ kind: 'evidence_blocker', requestClass: '근거 기반 차단 확인', request: '고정 근거가 없어 안전 보류', requester: 'Builder', authorityTarget: 'Cherry', blockedTarget: 'Cherry 판단 경계', publicPin: '알 수 없음', evidence: '고정 근거가 없어 안전 보류', expiry: '알 수 없음', freshness: '2026-09-04T01:20:00.000Z', lineage: '알 수 없음', immutableHistory: 'event-blocker · sequence 3' }])
    for (const state of ['ready', 'stale', 'conflict', 'delivery_unknown', 'no_active_work'] as const) expect(approvalInboxProjection(modelV2({ state, now: { observedAt: '2026-09-04T02:00:00.000Z', state }, events }))).toEqual([])
    expect(approvalInboxProjection(modelV2({ state: 'blocked', now: { observedAt: '2026-09-04T02:00:00.000Z', state: 'blocked' }, events: events.filter((event) => event.role === 'ux_product_qa' || event.role === 'release_audit') }))).toEqual([])
  })
  it('keeps explicit Cherry actions truthfully non-recordable with one focusable aria-disabled control per item', () => {
    const markup = renderToStaticMarkup(createElement(ApprovalInbox, { projection: modelV2({ cherryActionLabel: '후보 화면을 확인한다' }) }))
    for (const value of ['요청', '요청자 → 권한', '차단 대상', '공개 pin', '공개 근거', '만료', '신선도', '계보 / 교체', '불변 이력', '고정 식별자가 없어 결정을 기록할 수 없습니다']) expect(markup).toContain(value)
    expect(markup).toContain('data-completion-authority="false"')
    expect((markup.match(/aria-disabled="true"/g) ?? [])).toHaveLength(1)
    expect(markup).not.toContain('disabled=""')
    const explicitBranch = ApprovalInbox.toString().slice(ApprovalInbox.toString().indexOf("item.kind === 'explicit_cherry_action'"), ApprovalInbox.toString().indexOf(': <><label'))
    expect(explicitBranch).not.toMatch(/onClick|onSubmit|fetch\(|XMLHttpRequest/)
    expect(markup).not.toMatch(/<form|<a /)
  })
  it('enables only evidence blockers with the closed rejection vocabulary and no completion authority', () => {
    const projection = modelV2({ state: 'blocked', now: { observedAt: '2026-09-04T02:00:00.000Z', state: 'blocked' }, events: [{ id: 'event-builder-blocked', sequence: 7, role: 'builder', type: 'result_observed', summary: '고정 근거가 없어 안전 보류', observedAt: '2026-09-04T01:20:00.000Z', status: 'safe_hold', completionAuthority: false }] })
    const markup = renderToStaticMarkup(createElement(ApprovalInbox, { projection, onDecision: async () => undefined }))
    expect((markup.match(/<button/g) ?? [])).toHaveLength(2)
    expect(markup).not.toContain('disabled=""')
    for (const value of ['evidence_insufficient', 'scope_not_authorized', 'superseded_by_newer_observation', 'defer_pending_external_input']) expect(markup).toContain(value)
    expect(ApprovalInbox.toString()).toContain('기록됨 · 전달은 이 범위 밖')
    for (const value of ['stagedDecision', '결정 기록 검토', '대상 이벤트', 'completionAuthority=false', '확인 전에는 기록되지 않습니다.', '취소', '확인 기록']) expect(ApprovalInbox.toString()).toContain(value)
    expect(ApprovalInbox.toString()).toContain('onDecision(stagedDecision)')
    expect(ApprovalInbox.toString()).toContain('submittingRef.current')
    expect(ApprovalInbox.toString()).toContain('원본이 변경되었습니다. 결정을 다시 검토하세요.')
    expect(ApprovalInbox.toString()).toContain('restoreTriggerFocus()')
    expect(ApprovalInbox.toString()).toContain("onClick: (event) => stageDecision(item, \"approved\", event.currentTarget)")
    expect(markup).not.toMatch(/<form|<a /)
  })
  it('keeps approval observation accent bounded and decision targets accessible without motion', () => {
    expect(effectiveProperty(styles, '.oc-approval-item', 'border-left-width')).toBe('7px')
    expect(effectiveProperty(styles, '.oc-approval-actions button', 'min-height')).toBe('44px')
    expect(styles).toContain('.oc-approval-actions button:focus-visible')
    expect(styles).toMatch(/@media\(prefers-reduced-motion:reduce\)/)
    expect(styles).not.toMatch(/\.oc-approval-(?:item|actions)[^{]*\{[^}]*(?:background|box-shadow):(?:var\(--oc-accent\)|#adff2f)/i)
  })
  it('renders every server-projected role in its real dashboard lens without inventing identity or authority', async () => {
    // @ts-expect-error The server projection is an ESM JavaScript boundary exercised end to end here.
    const { createAccountModelV2Projection } = await import('../../server/account-model-v2-projection.mjs')
    const initialData = { schemaVersion: 2 as const, observedAt: '2026-09-04T00:00:00.000Z', build: { repository: 'OUTCOME', ref: 'main', commit: null, tree: null, asset: null, runtimeNowPinned: false as const }, projects: [project('outcome', 'OUTCOME')] }
    const roles = ['planner', 'builder', 'ux_product_qa', 'release_audit'] as const
    const events = roles.map((role, index) => ({ id: `event-${role.replaceAll('_', '-')}-1`, sequence: index + 1, role, type: 'work_observed' as const, summary: `${role} public observation`, observedAt: `2026-09-04T00:0${index + 1}:00.000Z`, status: 'observed' as const }))
    const modelV2 = createAccountModelV2Projection({ project: { id: 'outcome', name: 'OUTCOME', outcome: 'One safe outcome' }, current: { phaseId: 'outcome-phase' }, phases: [{ id: 'outcome-phase', title: 'Destination', purpose: 'Safe outcome', scopes: [{ stages: [{ id: 'outcome-stage', title: 'Milestone', purpose: 'User result', dependsOn: [], gate: { sourceRef: 'GATES.md', gates: [{ id: 'D3', title: 'Role chat', closed: false }] } }] }] }], events }, { observedAt: initialData.observedAt })
    const privateProjects = [{ project: { id: 'outcome', name: 'OUTCOME' }, phases: [], current: { phaseId: 'outcome-phase', scopeId: 'outcome-scope', stageId: 'outcome-stage' }, modelV2 }]
    const labels = ['Planner', 'Builder', 'UX & Product QA', 'Release Audit'] as const
    for (const [index, initialFilter] of labels.entries()) {
      const markup = renderToStaticMarkup(createElement(OutcomeDashboard, { onUnauthorized: () => undefined, initialData, privateProjects, nonProductionRoleChatFixture: { state: 'ready', plannerBound: true, initialFilter, onSend: () => undefined } }))
      expect(markup).toContain(`data-event-id="${events[index].id}"`)
      expect(markup).toContain(`data-event-sequence="${events[index].sequence}"`)
      expect(markup).toContain(`data-event-role="${roles[index]}"`)
      expect(markup).not.toContain('planner-conversation__empty')
      if (roles[index] === 'release_audit') expect(markup).toContain('완료 판정 권한 없음')
    }
  })
  it('integrates one explicit default-off Planner fixture adapter without production leakage', () => {
    const initialData = { schemaVersion: 2 as const, observedAt: '2026-09-04T00:00:00.000Z', build: { repository: 'OUTCOME', ref: 'main', commit: null, tree: null, asset: null, runtimeNowPinned: false as const }, projects: [project('outcome', 'OUTCOME')] }
    const absent = renderToStaticMarkup(createElement(OutcomeDashboard, { onUnauthorized: () => undefined, initialData }))
    expect(absent).not.toContain('data-role-chat-state')
    expect(absent).not.toContain('data-planner-composer="true"')
    const ready = renderToStaticMarkup(createElement(OutcomeDashboard, { onUnauthorized: () => undefined, initialData, nonProductionRoleChatFixture: { state: 'ready', plannerBound: true, initialFilter: '전체', onSend: () => undefined } }))
    expect(ready).toContain('data-role-chat-state="ready"')
    expect((ready.match(/data-planner-composer="true"/g) ?? [])).toHaveLength(1)
    for (const state of ['ready', 'streaming', 'tool-running', 'waiting-approval', 'offline-reconnecting', 'permission-absent', 'unbound-stale', 'delivery_unknown'] as const) {
      const stateMarkup = renderToStaticMarkup(createElement(OutcomeDashboard, { onUnauthorized: () => undefined, initialData, nonProductionRoleChatFixture: { state, plannerBound: true, initialFilter: '전체', onSend: () => undefined } }))
      expect(stateMarkup).toContain(`data-role-chat-state="${state}"`)
      if (state === 'permission-absent' || state === 'unbound-stale') expect(stateMarkup).not.toContain('data-planner-composer="true"')
      if (state === 'delivery_unknown') { expect(stateMarkup).toContain('자동 재전송하지 않습니다.'); expect(stateMarkup).not.toContain('다시 보내기') }
    }
    for (const filter of ['Builder', 'UX & Product QA', 'Release Audit'] as const) {
      const specialist = renderToStaticMarkup(createElement(OutcomeDashboard, { onUnauthorized: () => undefined, initialData, nonProductionRoleChatFixture: { state: 'ready', plannerBound: true, initialFilter: filter, onSend: () => undefined } }))
      expect(specialist).not.toContain('data-planner-composer="true"')
    }
    const privateProjects = [{ project: { id: 'outcome', name: 'OUTCOME' }, phases: [], current: { phaseId: 'outcome-phase', scopeId: 'outcome-scope', stageId: 'outcome-stage' }, modelV2: { schemaVersion: 1 as const, modelVersion: 2 as const, project: { id: 'outcome', label: 'OUTCOME' }, destination: null, remainingAcceptanceGap: { remaining: 1, total: 1 }, now: { observedAt: '2026-09-04T00:00:00.000Z', state: 'ready' as const }, readyBoundaryLabels: [], nextActionLabel: null, cherryActionLabel: null, state: 'ready' as const, events: [] } }]
    const integrated = renderToStaticMarkup(createElement(OutcomeDashboard, { onUnauthorized: () => undefined, initialData, privateProjects, nonProductionRoleChatFixture: { state: 'ready', plannerBound: true, initialFilter: 'Planner', onSend: () => undefined } }))
    expect((integrated.match(/data-planner-composer="true"/g) ?? [])).toHaveLength(1)
  })
  it('D3 workspace order and responsive navigation preserve one project context', () => {
    const source = OutcomeDashboard.toString()
    const workbench = source.slice(source.indexOf('oc-workbench'))
    const tokens = ['oc-map-workspace', 'oc-approval-rail', 'oc-conversation-panel']
    expect(tokens.map((token) => workbench.indexOf(token))).toEqual([...tokens].map((token) => workbench.indexOf(token)).sort((a, b) => a - b))
    expect(mobileWorkspaceTabs).toEqual(['지도', '대화', '승인'])
    expect(desktopConversationBreakpoint).toBe(1100)
  })
  it('왼쪽 레일은 프로젝트 작업공간과 정직한 준비 중 기능만 제공한다', () => {
    expect(workspaceManagementItems).toEqual([
      { id: 'archive', label: '보관함', disabled: true },
      { id: 'connections', label: '연결 관리', disabled: true },
    ])
    const source = OutcomeDashboard.toString()
    for (const token of ['oc-global-nav', 'oc-nav-trigger', 'oc-nav-backdrop', 'oc-main-content', '본문으로 건너뛰기', 'aria-modal', 'event.key', 'Escape', 'document.body.style.overflow', 'menuButtonRef.current?.focus', 'oc-new-project', 'oc-project-search', 'projectQuery', '일치하는 프로젝트가 없습니다.', 'oc-project-row', 'oc-project-menu', 'oc-management', 'oc-nav-account', '로그인 또는 계정 관리']) expect(source).toContain(token)
    expect(source).not.toContain('선택됨')
    expect(source).toContain('"data-selected": selected')
    for (const obsolete of ['globalNavigationItems', 'activeSection', 'revealGlobalSection']) expect(source).not.toContain(obsolete)
  })
  it('고정 호스트 스냅샷은 실시간 연결과 구분되어 표시된다', () => {
    expect(snapshotPresentation({ boundary: 'deployment_snapshot', capturedAt: '2026-08-24T09:00:00.000Z', source: 'sanitized_public_projection', liveSessionRelay: false, refreshBehavior: 'new_deployment_required' })).toEqual({ label: '배포 스냅샷', detail: '실시간 세션 연결 대기 · 새 배포 시 갱신', sourceLabel: '패키지 구조 정상', timePrefix: '스냅샷 생성', refreshLabel: '배포 스냅샷 다시 불러오기' })
    expect(snapshotPresentation(undefined)).toBeNull()
    const source = OutcomeDashboard.toString()
    expect(source).toContain('data-snapshot-boundary')
    expect(source).toContain('snapshot.capturedAt')
    expect(source).toContain('title: refreshLabel')
    expect(source).toContain('원본 관측')
    expect(source).toContain('원본 묶음 새로고침')
  })
  it('역할 세션은 네 개의 간결한 행과 단일 활성 신호로 표시한다', () => {
    const source = OutcomeDashboard.toString()
    expect(source).not.toContain('oc-hero-side')
    expect(source).toContain('oc-role-row')
    expect(source).not.toContain('oc-activity-band')
    expect(source).not.toContain('oc-now-timing')
  })
  it('모바일 primary DOM 순서는 identity freshness NOW roles structure current map을 따른다', () => {
    const source = OutcomeDashboard.toString()
    const tokens = ['oc-hero-title', 'oc-hero-meta', 'oc-now-summary', 'oc-bindings', 'oc-structure-band', 'oc-map-header', 'oc-map-columns']
    expect(tokens.map((token) => source.indexOf(token))).toEqual([...tokens].map((_, index, values) => source.indexOf(values[index])).sort((left, right) => left - right))
    expect(source).toContain('oc-hierarchy-sticky')
  })
  it('모바일 위계 탐색은 세 층위를 항상 표시하고 현재 층위를 문구와 접근성 상태로 명시한다', () => {
    const source = OutcomeDashboard.toString()
    expect(mobileHierarchyLevels).toEqual(['페이즈', '범위', '스테이지'])
    expect(source).toContain('mobileHierarchyLevels.map')
    expect(source).toContain('"aria-current": active ? "step"')
    expect(source).toContain('선택 중')
    expect(source).toContain('탐색 ·')
  })
  it('기존 세 current surface를 하나의 프로젝트 여정으로 통합한다', () => {
    const source = OutcomeDashboard.toString()
    expect(source).toContain('oc-workbench')
    expect(source).toContain('oc-approval-rail')
    expect(source).toContain('PlannerConversation')
    expect(source).toContain('data-default-open')
    expect(source).toContain('프로젝트 여정')
    expect(source).not.toContain('결과 지도')
    expect(source).toContain('oc-outcome-map')
    expect(source).toContain('oc-map-columns')
    for (const removed of ['oc-current-flow', 'oc-current-stage', 'oc-stage-explorer', 'oc-selected-detail']) expect(source).not.toContain(removed)
    expect(source).not.toContain('data-column="4"')
  })
  it('작업 단계 목록 선택은 우측 상세만 바꾸고 실제 현재 위치를 유지한다', () => {
    expect(nextStageOptionIndex('ArrowDown', 1, 4)).toBe(2)
    expect(nextStageOptionIndex('ArrowUp', 0, 4)).toBe(3)
    expect(nextStageOptionIndex('Home', 3, 4)).toBe(0)
    expect(nextStageOptionIndex('End', 0, 4)).toBe(3)
    expect(nextStageOptionIndex('Enter', 2, 4)).toBeNull()
    const source = OutcomeDashboard.toString()
    expect(source).toContain('role: "listbox"')
    expect(source).toContain('role: "option"')
    expect(source).toContain('aria-selected')
    expect(source).not.toContain('aria-pressed')
  })
  it('선택 작업 단계 완료 조건은 실제 closed total을 표시한다', () => {
    expect(selectedGateCount(stage())).toBe('1/2')
    expect(selectedGateCount(stage({ gate: { gates: [], groups: [], total: 0, closed: 0, available: false, sourceRef: null } }))).toBe('완료 조건 근거 없음')
    expect(selectedGateCount(stage({ state: 'complete', gate: { gates: [], groups: [], total: 10, closed: 10, available: true, sourceRef: 'GATES.md' } }))).toBe('10/10')
  })
  it('Gate inspector는 완료 조건과 경계를 한 번만 소유한다', () => {
    expect(detailContentPolicy(false)).toEqual({ showTitle: false, showPurpose: false, showBoundary: false, showGateList: false })
    expect(detailContentPolicy(true)).toEqual({ showTitle: true, showPurpose: true, showBoundary: true, showGateList: true })
    const source = OutcomeDashboard.toString()
    expect(source).toContain('oc-gate-inspector')
    expect(source).toContain('oc-detail-boundary')
    expect(source).toContain('oc-inspector-gates')
    expect(source).not.toContain('data-current-gates')
  })
  it('완료 조건 그룹은 source label과 code를 필요한 경우에만 표시한다', () => {
    expect(gateGroupPresentation('RA', 'RA')).toEqual({ primaryLabel: null, secondaryCode: null })
    expect(gateGroupPresentation('물리 수용 경계', 'P33A')).toEqual({ primaryLabel: '물리 수용 경계', secondaryCode: 'P33A' })
  })
  it('generic group은 Stage aggregate와 같으면 전체 section을 숨긴다', () => {
    expect(meaningfulGateGroups([{ code: 'RA', name: 'RA', closed: 0, total: 2 }])).toEqual([])
    expect(meaningfulGateGroups([])).toEqual([])
    expect(meaningfulGateGroups([{ code: 'Y', name: '링크 미리보기', closed: 5, total: 5 }], false)).toEqual([])
    expect(meaningfulGateGroups([{ code: 'Y', name: '링크 미리보기', closed: 5, total: 5 }])).toEqual([{ code: 'Y', name: '링크 미리보기', closed: 5, total: 5, primaryLabel: '링크 미리보기', secondaryCode: 'Y' }])
  })
  it('Phase Scope Stage는 각각 이름 있는 listbox와 roving option을 갖는다', () => {
    const source = OutcomeDashboard.toString()
    expect(source.match(/role: "listbox"/g)).toHaveLength(3)
    expect(source).toContain('tabIndex: selected ? 0 : -1')
    expect(source).toContain('event.key === "ArrowRight"')
    expect(source).toContain('event.key === "ArrowLeft"')
  })
  it('역할 관측과 프로젝트 식별자는 primary에서 중복되지 않는다', () => {
    expect(bindingObservationLabel({ role: 'builder', status: 'stale', activity: null, boundAt: null, observedAt: null, freshness: 'stale', historyCount: 0 })).toBe('관측 오래됨')
    expect(bindingObservationLabel({ role: 'builder', status: 'idle', activity: null, boundAt: null, observedAt: null, freshness: 'fresh', historyCount: 0 })).toBe('대기 중 · 최근 관측')
    const source = OutcomeDashboard.toString()
    expect(source).not.toContain('<small>프로젝트 식별자 · {project.project.id}</small>')
    expect(source).toContain('기술 증거 · 프로젝트 식별자')
  })
  it('Hero 역할 상태는 source 의미를 보존한 compact Korean으로 제한한다', () => {
    const binding = (status: string, freshness: string): Binding => ({ role: 'builder', status, activity: null, boundAt: null, observedAt: null, freshness, historyCount: 0 })
    expect(bindingHeroLabel(binding('active', 'fresh'))).toBe('진행 중 · 최근')
    expect(bindingHeroLabel(binding('idle', 'stale'))).toBe('대기 중 · 오래됨')
    expect(bindingHeroLabel(binding('stale', 'stale'))).toBe('관측 오래됨')
    expect(bindingHeroLabel(binding('unbound', 'unknown'))).toBe('연결 없음')
    expect(bindingHeroLabel(binding('unknown', 'stale'))).toBe('근거 없음 · 오래됨')
    expect(bindingHeroLabel(binding('replaced', 'replaced'))).toBe('교체됨')
  })
  it('역할 행은 version, history, Stage와 식별자 없는 append-only history detail을 표시한다', () => {
    const source = OutcomeDashboard.toString()
    for (const token of ['bindingVersion', 'historyCount', 'stageId', 'binding.history', 'oc-role-history']) expect(source).toContain(token)
    for (const privateToken of ['locator_ref', 'binding_ref', 'event_ref', 'session_id', 'thread_id', 'task_id', 'turn_id']) expect(source).not.toContain(privateToken)
  })
  it('정보 구조 리뉴얼은 핵심 source-grounded 기능을 보존한다', () => {
    const source = OutcomeDashboard.toString()
    for (const token of ['oc-structure-band', 'oc-gate-gauge', 'oc-now-summary', 'oc-outcome-map', 'oc-gate-inspector', 'oc-technical']) expect(source).toContain(token)
    expect(source).not.toContain('oc-hero-gate')
    expect(source).not.toContain('oc-hero-fill')
    expect(source).not.toContain('oc-confirmed')
  })
  it('핵심 정보 영역을 시각 리뉴얼 뒤에도 보존한다', () => {
    const source = OutcomeDashboard.toString()
    for (const token of ['oc-hero', 'oc-now-summary', 'oc-bindings', 'oc-structure-band', 'oc-outcome-map', 'oc-gate-inspector', 'oc-technical']) expect(source).toContain(token)
    expect(source).not.toContain('oc-snapshot-badge')
    expect(source).not.toContain('now.metadata')
    expect(source).toContain('data-snapshot-boundary')
    expect(source).toContain('배포 스냅샷이며 실시간 세션은 별도 연결 예정')
  })
  it('탐색 selection은 actual current와 분리되고 zero-Stage branch를 보존한다', () => {
    const value = project('outcome', 'OUTCOME')
    value.phases.push({ id: 'future-phase', title: 'Future', purpose: 'Future', completion: null, scopes: [{ id: 'future-scope', title: 'Future', purpose: 'Future', stages: [] }] })
    expect(defaultHierarchySelection(value)).toEqual({ phaseId: 'outcome-phase', scopeId: 'outcome-scope', stageId: 'outcome-stage' })
    const future = selectHierarchyPhase(value, 'future-phase')
    expect(future).toEqual({ phaseId: 'future-phase', scopeId: 'future-scope', stageId: null })
    expect(resolveHierarchySelection(value, future).stage).toBeNull()
    expect(hierarchyIsExploring(value, future)).toBe(true)
    expect(value.current?.stageId).toBe('outcome-stage')
  })
  it('OUTCOME의 다섯 Phase와 Stage 없는 future branch를 구조 상태로 계산한다', () => {
    const value = project('outcome', 'OUTCOME')
    value.phases = Array.from({ length: 5 }, (_, index) => ({ id: `phase-${index + 1}`, title: '', purpose: '', completion: null, scopes: [{ id: `scope-${index + 1}`, title: '', purpose: '', stages: index === 0 ? [stage({ id: 'current-stage' })] : [] }] }))
    value.current = { phaseId: 'phase-1', scopeId: 'scope-1', stageId: 'current-stage' }
    expect(structuralPhaseModel(value).map(({ status, stages }) => [status, stages])).toEqual([['current', 1], ['definition_pending', 0], ['definition_pending', 0], ['definition_pending', 0], ['definition_pending', 0]])
  })
  it('완료 Stage와 Stage 미정의 Scope가 섞인 Phase는 일부 완료이며 완료로 올리지 않는다', () => {
    const value = project('outcome', 'OUTCOME')
    value.current = null
    value.phases = [{ id: 'outcome-phase-2', title: '', purpose: '', completion: null, scopes: [
      { id: 'stable-host', title: '', purpose: '', stages: [stage({ id: 'stable-stage', state: 'complete' })] },
      { id: 'portfolio', title: '', purpose: '', stages: [] },
      { id: 'accounts', title: '', purpose: '', stages: [] },
    ] }]
    expect(structuralPhaseModel(value)[0]).toMatchObject({ status: 'partial', scopes: 3, stages: 1, complete: 1 })
    expect(structureStatusLabel('partial')).toBe('일부 완료')
    expect(structureStatusLabel('partial')).not.toContain('%')
  })
  it('완료 Stage와 열린 Stage가 함께 있는 Phase는 Scope 정의 여부와 무관하게 일부 완료다', () => {
    const value = project('outcome', 'OUTCOME'); value.current = null
    value.phases = [{ id: 'outcome-phase-2', title: '', purpose: '', completion: null, scopes: [
      { id: 'hosting', title: '', purpose: '', stages: [stage({ id: 'host', state: 'complete' })] },
      { id: 'portfolio', title: '', purpose: '', stages: [stage({ id: 'portfolio', state: 'complete' })] },
      { id: 'accounts', title: '', purpose: '', stages: [stage({ id: 'accounts', state: 'pending' })] },
    ] }]
    expect(structuralPhaseModel(value)[0]).toMatchObject({ status: 'partial', stages: 3, complete: 2 })
  })
  it('현재 Phase도 완료 Stage와 열린 Stage가 섞이면 위치 표식과 별개로 일부 완료다', () => {
    const value = project('outcome', 'OUTCOME')
    value.phases = [{ id: 'outcome-phase-2', title: '', purpose: '', completion: null, scopes: [{ id: 'accounts', title: '', purpose: '', stages: [stage({ id: 'done', state: 'complete' }), stage({ id: 'current', state: 'active' })] }] }]
    value.current = { phaseId: 'outcome-phase-2', scopeId: 'accounts', stageId: 'current' }
    expect(structuralPhaseModel(value)[0]).toMatchObject({ status: 'partial', current: true, stages: 2, complete: 1 })
  })
  it('계정 접근 Stage와 완료 조건은 원본 ID를 보존하며 한글 표시를 제공한다', () => {
    expect(stagePresentation('outcome-stage-account-access-implementation', 'English title', 'English purpose')).toEqual(['계정 접근 구현 후보', '승인된 계정 접근 계약을 로컬·미리보기에서 검증 가능한 읽기 전용 후보와 재현 가능한 근거로 구현합니다.'])
    expect(gatePresentation('outcome-stage-account-access-implementation', 'I4', 'English fallback')).toBe('서버가 소유자와 작업공간 소속을 판정하고, 두 프로젝트 허용 목록과 작업공간 간 접근 차단을 실제 행 수준 보안으로 검증합니다.')
  })
  it('Stage 행의 분수는 Gate 진행이 아니라 스테이지 위치로 명시한다', () => {
    const source = OutcomeDashboard.toString()
    expect(source).toContain('스테이지 위치')
    expect(source).toContain('확인된 항목 / 전체')
  })
  it('상단은 중복 페이즈 탭 없이 source Phase 상태를 단일 진행 rail에 표시한다', () => {
    const source = OutcomeDashboard.toString()
    expect(source).toContain('oc-project-progress-track')
    expect(source).toContain('전체 진행 흐름')
    expect(source).toContain('phases.length')
    expect(source).not.toContain('페이즈 탐색')
    expect(source).not.toContain('role: "tablist"')
  })
  it('긴 완료 branch만 disclosure 대상으로 접고 선택된 과거 Stage는 노출한다', () => {
    const stages = Array.from({ length: 13 }, (_, index) => stage({ id: `stage-${index + 1}`, state: index < 12 ? 'complete' : 'active' }))
    expect(collapsedStageCount(stages, false, 'stage-13')).toBe(12)
    expect(collapsedStageCount(stages, false, 'stage-2')).toBe(0)
    expect(collapsedStageCount(stages, true, 'stage-13')).toBe(0)
  })
  it('project switch keeps Package truth isolated', () => { const projects = [project('cherry-note', 'Cherry Note'), project('outcome', 'OUTCOME')]; expect(selectProject(projects, 'outcome')?.project.outcome).toBe('OUTCOME outcome'); expect(selectProject(projects, 'cherry-note')?.project.outcome).toBe('Cherry Note outcome') })
  it('purpose funnel resolves Phase Scope and Stage from one project', () => { const value = project('outcome', 'OUTCOME'); const found = findStage(value, 'outcome-stage'); expect([found?.phase.purpose, found?.scope.purpose, found?.stage.purpose]).toEqual(['Phase purpose', 'Scope purpose', 'Verify the result']) })
  it('stage summary reports checkbox evidence without a completion percentage for an active Stage', () => { expect(summarizeStage(stage())).toEqual({ closed: 1, total: 2, remaining: [{ id: 'G2', title: 'remaining', closed: false, groupCode: 'G' }], confirmedPercent: null }) })
  it('stage summary makes no percentage without Gate evidence', () => { expect(summarizeStage(stage({ gate: { gates: [], groups: [], total: 0, closed: 0, available: false, sourceRef: null } })).confirmedPercent).toBeNull() })
  it('evidence layers remain separate from NOW activity', () => { const value = project('outcome', 'OUTCOME'); value.now.activity = 'many edits'; expect(value.progress.available).toBe(false); expect(findStage(value, value.current?.stageId)?.stage.axes.evidence).toBe('pending') })
  it('GitHub evidence keeps local published checks and release separate', () => { const items = githubEvidenceItems(github()); expect(items.map((item) => item.label)).toEqual(['로컬 후보', 'GitHub 게시', '자동 검사', '출시']); expect(items[0].value).toContain('15개 앞섬'); expect(items[1].value).toContain('origin/main'); expect(items[2].state).toBe('unknown'); expect(items[3].state).toBe('unknown') })
  it('GitHub evidence shows connected empty remote as not published', () => { const items = githubEvidenceItems(github({ repository: 'dltmddnr3/outcome', published: { state: 'not_published', repository: 'dltmddnr3/outcome', ref: 'origin/main', detail: 'empty_remote' } })); expect(items[1]).toEqual({ label: 'GitHub 게시', state: 'not_published', value: 'dltmddnr3/outcome · 빈 원격 저장소' }) })
  it('accessibility correction keeps source and entity vocabulary separate', () => { expect(sourceStateLabel('unknown')).toBe('원본 묶음 근거 없음'); expect(entityStateLabel('unknown')).toBe('근거 없음'); expect(entityStateLabel('stale')).toBe('관측 오래됨'); expect(entityStateLabel('queued')).toBe('진입 대기'); expect(entityStateLabel('locked')).toBe('선행 완료 조건 대기') })
  it('axis vocabulary keeps raw complete separate from Gate completion without Gate evidence', () => { const value = stage({ gate: { gates: [], groups: [], total: 0, closed: 0, available: false, sourceRef: null }, axes: { implementation: 'not_sourced', test: 'complete', evidence: 'pending', independentQa: 'not_started', cherryAcceptance: 'pending', release: 'not_started' } }); expect(summarizeStage(value).confirmedPercent).toBeNull(); expect(axisStateLabel(value.axes.test)).toBe('완료'); expect(axisStateLabel(value.axes.test)).not.toBe(entityStateLabel('complete')) })
  it('axis vocabulary labels observed NOW states without completion-condition language and fails closed for untranslated values', () => { expect(['active', 'idle', 'stale', 'unbound', 'unknown'].map(axisStateLabel)).toEqual(['진행 중', '대기 중', '관측 오래됨', '연결 없음', '근거 없음']); expect(axisStateLabel('work_in_progress_not_candidate')).toBe('원본 상태 한글화 대기') })
  it('Stage detail keeps locked Final Feed 10/10 as checkbox evidence, not completion', () => { const value = stageDetailSemantics(stage({ id: 'stage-final-feed', title: 'Final Feed', state: 'locked', dependsOn: ['physical-acceptance'], gate: { gates: Array.from({ length: 10 }, (_, index) => ({ id: `F${index + 1}`, title: 'checked', closed: true, groupCode: 'F' })), groups: [], total: 10, closed: 10, available: true, sourceRef: 'GATES.md' } }), ['실제 사용 승인']); expect(value.closed).toBe(10); expect(value.confirmedPercent).toBeNull(); expect(value.countLabel).toBe('체크됨 / 전체'); expect(value.boundaryCopy).toContain('실제 사용 승인'); expect(value.checkedCopy).not.toContain('증거가 모두 확정') })
  it('Stage detail keeps bottom-shell 9/9 evidence pending without completion', () => { const value = stageDetailSemantics(stage({ state: 'gates_closed_evidence_pending', gate: { gates: Array.from({ length: 9 }, (_, index) => ({ id: `S${index + 1}`, title: 'checked', closed: true, groupCode: 'S' })), groups: [], total: 9, closed: 9, available: true, sourceRef: 'GATES.md' } })); expect(value.closed).toBe(9); expect(value.confirmedPercent).toBeNull(); expect(value.boundaryCopy).toContain('증거 확정은 아직 대기'); expect(value.checkedCopy).not.toContain('증거가 모두 확정') })
  it('Stage detail retains completion semantics only for complete Stage', () => { const value = stageDetailSemantics(stage({ state: 'complete', gate: { gates: [{ id: 'G1', title: 'checked', closed: true, groupCode: 'G' }, { id: 'G2', title: 'checked', closed: true, groupCode: 'G' }], groups: [], total: 2, closed: 2, available: true, sourceRef: 'GATES.md' } })); expect(value.confirmedPercent).toBe(100); expect(value.countLabel).toBe('증거 확정 / 전체'); expect(value.checkedCopy).toContain('증거가 모두 확정') })
  it('Stage detail gives every non-complete state an honest boundary', () => { for (const state of ['locked', 'blocked', 'queued', 'pending', 'active', 'unknown', 'gates_closed_evidence_pending']) { const value = stageDetailSemantics(stage({ state }), ['이전 작업 단계']); expect(value.confirmedPercent).toBeNull(); expect(value.countLabel).toBe('체크됨 / 전체'); expect(value.boundaryCopy.length).toBeGreaterThan(20); expect(value.checkedCopy).not.toContain('증거가 모두 확정') } })
  it('한글 계층 labels use the approved five-level vocabulary', () => { expect(hierarchyLabels).toEqual(['프로젝트', '큰 단계', '범위', '작업 단계', '완료 조건']) })
  it('한글 운영 문구 covers roles states activity and Package source-facing fallbacks', () => { expect(['planner', 'builder', 'ux_product_qa', 'release_audit'].map(roleLabel)).toEqual(['기획', '구현', '사용성·제품 검수', '출시 감사']); expect(activityLabelKo('Stage 6 NEEDS_REVISION correction is active; fresh independent QA remains required')).toBe('6단계 수정 진행 중 · 새 독립 검수가 필요합니다'); expect(sourceStateLabel('conflict')).toBe('원본 묶음 충돌'); expect(groupPresentation('RA', 'RA')).toBe('완료 조건 그룹'); expect(stagePresentation('new-stage', '원본 스테이지', '원본 목적')).toEqual(['원본 스테이지', '원본 목적']); expect(phasePresentation('new-phase', '원본 페이즈', '원본 목적')).toEqual(['원본 페이즈', '원본 목적']) })
  it('stable deployment snapshot Stage는 사용자용 한글 제목과 목적을 갖는다', () => {
    expect(stagePresentation('outcome-stage-stable-snapshot-host')).toEqual(['안정적인 배포 스냅샷 호스트', '로컬 원본과 임시 연결 없이 고정 보안 웹 주소에서 정제된 프로젝트 스냅샷을 제공합니다.'])
  })
  it('기술 식별자 보존 keeps Package IDs and GitHub evidence unchanged beneath Korean presentation', () => { const value = project('outcome', 'OUTCOME'); const before = structuredClone(value); expect(phasePresentation(value.phases[0].id)).toEqual(['큰 단계 제목 한글화 대기', '큰 단계 목적 한글화 대기']); expect(projectOutcomePresentation(value.project.id, value.project.outcome)).toContain('인공지능'); expect(githubEvidenceItems(value.connectors.github)[1].value).toContain('owner/repo · origin/main'); expect(value).toEqual(before); expect(value.current?.stageId).toBe('outcome-stage') })
  it('현재 렌더 가능한 미완료 완료 조건은 모두 자연스러운 한글 설명을 갖는다', () => {
    const gateIds = [
      ['stage-33-physical-acceptance-boundary', 'P33A3'], ['stage-33-physical-acceptance-boundary', 'P33A4'], ['stage-33-physical-acceptance-boundary', 'P33A5'],
      ...Array.from({ length: 8 }, (_, index) => ['stage-ux-product-qa', `ANQ${index + 1}`]),
      ['stage-release-audit', 'RA6'], ['stage-release-audit', 'RA7'], ['stage-release-audit', 'RA8'],
      ...Array.from({ length: 6 }, (_, index) => ['stage-mvp-scope-closure', `MC${index + 4}`]),
      ['outcome-stage-8', 'C1'], ['outcome-stage-8', 'C2'],
    ]
    const presentations = gateIds.map(([stageId, gateId]) => gatePresentation(stageId, gateId))
    expect(gateIds).toHaveLength(22)
    expect(presentations.filter((value) => value.includes('한글화 대기'))).toEqual([])
  })
  it('현재 렌더되는 근거 축 값은 모두 자연스러운 한글 상태를 갖는다', () => {
    const values = ['complete_on_exact_1cdec3f_candidate', 'complete_523_foundation_248_docktests_and_signed_build_matrix', 'complete_receipt_87b4523_and_handoff_verified', 'exact_1cdec3f_frozen', 'complete_for_fresh_independent_review', 'not_started_preflight_hold']
    expect(values.map(axisLabelKo).filter((value) => value.includes('한글화 대기'))).toEqual([])
  })
  it('인증 오류 식별자를 사용자용 한글로 바꾼다', () => {
    expect(loginErrorPresentation('invalid_credentials')).toBe('접근 암호가 올바르지 않습니다.')
    expect(loginErrorPresentation('too_many_attempts')).toBe('로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.')
    expect(loginErrorPresentation('unexpected_backend_code')).toBe('로그인하지 못했습니다.')
  })
  it('현재 프로젝트 Hero 의미를 한 컨테이너에 고정한다', () => {
    const value = project('outcome', 'OUTCOME')
    const model = projectHeroModel(value)
    expect(model.name).toBe('OUTCOME')
    expect(model.outcome).toContain('인공지능')
    expect(model.current).toContain('Stage One')
    expect(model.next).toBe('다음 단계 근거 없음')
    expect(model.freshness).toBe('근거 없음')
  })
  it('Hero 완료 조건 fill은 현재 작업 단계 근거만 사용한다', () => {
    expect(heroGateEvidence(stage({ gate: { gates: [], groups: [], total: 4, closed: 2, available: true, sourceRef: 'GATES.md' } }))).toEqual({ available: true, closed: 2, total: 4, scale: 0.5 })
    expect(heroGateEvidence(stage({ gate: { gates: [], groups: [], total: 0, closed: 0, available: false, sourceRef: null } }))).toEqual({ available: false, closed: 0, total: 0, scale: null })
  })
  it('현재 작업 단계 퍼센트는 완료 조건 closed total만 사용한다', () => {
    expect(gateProgress(stage({ gate: { gates: [], groups: [], total: 4, closed: 2, available: true, sourceRef: 'GATES.md' } }))).toEqual({ available: true, closed: 2, total: 4, percent: 50, scale: 0.5 })
    expect(gateProgress(stage({ gate: { gates: [], groups: [], total: 8, closed: 0, available: true, sourceRef: 'GATES.md' } }))).toEqual({ available: true, closed: 0, total: 8, percent: 0, scale: 0 })
    expect(gateProgress(stage({ gate: { gates: [], groups: [], total: 0, closed: 0, available: false, sourceRef: null } }))).toEqual({ available: false, closed: 0, total: 0, percent: null, scale: null })
  })
  it('실시간 세션은 active와 fresh가 모두 맞는 역할 하나만 선택한다', () => {
    const bindings = [
      { role: 'planner', status: 'active', activity: null, boundAt: null, observedAt: null, freshness: 'stale', historyCount: 0 },
      { role: 'release_audit', status: 'idle', activity: null, boundAt: null, observedAt: null, freshness: 'fresh', historyCount: 0 },
      { role: 'builder', status: 'active', activity: null, boundAt: null, observedAt: null, freshness: 'fresh', historyCount: 0 },
      { role: 'ux_product_qa', status: 'active', activity: null, boundAt: null, observedAt: null, freshness: 'fresh', historyCount: 0 },
    ]
    expect(selectLiveBinding(bindings)?.role).toBe('builder')
  })
  it('오래된 NOW 상태는 headline과 metadata 중 한 곳에만 표시한다', () => {
    const presentation = nowPresentation({ status: 'stale', activity: 'Stage 6 NEEDS_REVISION correction is active; fresh independent QA remains required', observedAt: '2026-08-24T00:00:00.000Z', source: 'runtime_registry' })
    expect(presentation.headline).toContain('6단계 수정 진행 중')
    expect(`${presentation.headline} ${presentation.metadata}`.match(/관측 오래됨/g)).toHaveLength(1)
    expect(presentation.metadata).toContain('세션 활동은 진행률이 아닙니다')
  })
  it('현재 큰 단계 범위 작업 단계 index를 Package 배열에서 계산한다', () => {
    const value = project('outcome', 'OUTCOME')
    const current = stage({ id: 'current-stage' })
    value.phases = [
      { id: 'phase-a', title: 'A', purpose: 'A', completion: null, scopes: [{ id: 'scope-a', title: 'A', purpose: 'A', stages: [stage({ id: 'done-stage', state: 'complete' })] }, { id: 'scope-b', title: 'B', purpose: 'B', stages: [stage({ id: 'prior-stage' }), current] }] },
      { id: 'phase-b', title: 'B', purpose: 'B', completion: null, scopes: [] },
    ]
    value.current = { phaseId: 'phase-a', scopeId: 'scope-b', stageId: 'current-stage' }
    expect(currentHierarchy(value)).toMatchObject({ phaseIndex: 1, phaseTotal: 2, scopeIndex: 2, scopeTotal: 2, stageIndex: 2, stageTotal: 2, stage: current })
  })
  it('위계 위치를 프로젝트 전체 퍼센트로 환산하지 않는다', () => {
    const placement = hierarchyPlacement(project('outcome', 'OUTCOME'))
    expect(placement).toEqual({ phase: '1 / 1', scope: '1 / 1', stage: '1 / 1' })
    expect(Object.values(placement).join(' ')).not.toContain('%')
  })
  it('Scope와 작업 단계 rail 상태를 원본 자식 상태와 current ID로만 계산한다', () => {
    expect(deriveScopeState({ id: 'done', title: '', purpose: '', stages: [stage({ state: 'complete' })] }, 'other')).toBe('complete')
    expect(deriveScopeState({ id: 'current', title: '', purpose: '', stages: [stage({ state: 'pending' })] }, 'current')).toBe('active')
    expect(deriveScopeState({ id: 'later', title: '', purpose: '', stages: [stage({ state: 'queued' })] }, 'other')).toBe('pending')
    expect(deriveScopeState({ id: 'empty', title: '', purpose: '', stages: [] }, 'other')).toBe('unknown')
    expect(deriveStageRailState(stage({ id: 'done', state: 'complete' }), 'other')).toBe('complete')
    expect(deriveStageRailState(stage({ id: 'current', state: 'pending' }), 'current')).toBe('active')
    expect(deriveStageRailState(stage({ id: 'unknown', state: 'unknown' }), 'other')).toBe('unknown')
    expect(deriveStageRailState(stage({ id: 'later', state: 'queued' }), 'other')).toBe('pending')
  })
  it('Scope 레일은 완료 현재 대기 위치를 원본 상태로만 계산한다', () => {
    const scopes = [
      { id: 'done', title: '', purpose: '', stages: [stage({ state: 'complete' })] },
      { id: 'current', title: '', purpose: '', stages: [stage({ state: 'active' })] },
      { id: 'later', title: '', purpose: '', stages: [stage({ state: 'queued' })] },
    ]
    expect(scopes.map((scope) => deriveScopeState(scope, 'current'))).toEqual(['complete', 'active', 'pending'])
  })
  it('작업 경과 시간은 현재 작업 단계의 활성 최신 연결 시각만 사용한다', () => {
    const binding: Binding = { role: 'builder', status: 'active', activity: null, boundAt: '2026-08-24T00:00:00.000Z', observedAt: '2026-08-24T01:20:00.000Z', freshness: 'fresh', historyCount: 1, stageId: 'stage-one' }
    const eligible = timingPresentation(stage(), binding, 'stage-one', new Date('2026-08-24T01:30:00.000Z'))
    expect(eligible.elapsed).toMatchObject({ available: true, label: '현재 역할 연결 후 경과', value: '1시간 30분' })
    expect(eligible.elapsed.basis).toContain('구현 연결 시작')
    for (const invalid of [{ ...binding, freshness: 'stale' }, { ...binding, stageId: 'other' }, { ...binding, boundAt: null }]) expect(timingPresentation(stage(), invalid, 'stage-one', new Date('2026-08-24T01:30:00.000Z')).elapsed).toEqual({ available: false, label: '현재 작업시간', value: '작업시간 측정 근거 없음', basis: null })
  })
  it('남은 시간은 명시적 계획 예상치 없이는 계산하지 않는다', () => {
    const binding: Binding = { role: 'builder', status: 'active', activity: null, boundAt: '2026-08-24T00:00:00.000Z', observedAt: '2026-08-24T00:30:00.000Z', freshness: 'fresh', historyCount: 1, stageId: 'stage-one' }
    expect(timingPresentation(stage(), binding, 'stage-one', new Date('2026-08-24T00:30:00.000Z')).eta).toEqual({ available: false, label: '남은 예상 시간', value: '남은 시간 예상 근거 없음' })
    expect(timingPresentation(stage({ expectedDurationMinutes: 120 }), binding, 'stage-one', new Date('2026-08-24T00:30:00.000Z')).eta).toEqual({ available: true, label: '계획 기준 예상', value: '1시간 30분' })
  })
  it('선택한 과거 작업 단계가 현재 funnel을 바꾸지 않는다', () => {
    const value = project('outcome', 'OUTCOME')
    const current = value.phases[0].scopes[0].stages[0]
    value.phases[0].scopes[0].stages.unshift(stage({ id: 'historical-stage', state: 'complete' }))
    const context = selectedStageContext(value, 'historical-stage')
    expect(context.exploring).toBe(true)
    expect(context.current?.stage.id).toBe(current.id)
    expect(context.selected?.stage.id).toBe('historical-stage')
    expect(context.hierarchy.stageIndex).toBe(2)
  })
})
