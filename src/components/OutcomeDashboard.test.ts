import { describe, expect, it } from 'vitest'
import { OutcomeDashboard, axisStateLabel, bindingObservationLabel, currentHierarchy, deriveScopeState, deriveStageRailState, detailContentPolicy, entityStateLabel, findStage, gateGroupPresentation, gateProgress, githubEvidenceItems, heroGateEvidence, hierarchyPlacement, nextStageOptionIndex, nowPresentation, projectHeroModel, selectedGateCount, selectedStageContext, selectLiveBinding, selectProject, sourceStateLabel, stageDetailSemantics, summarizeStage, timingPresentation, type Binding, type GithubConnector, type PackageProject, type PackageStage } from './OutcomeDashboard'
import { activityLabelKo, axisLabelKo, gatePresentation, groupPresentation, hierarchyLabels, loginErrorPresentation, phasePresentation, projectOutcomePresentation, roleLabel, stagePresentation } from './outcomeKorean'

const stage = (overrides: Partial<PackageStage> = {}): PackageStage => ({ id: 'stage-one', title: 'Stage One', purpose: 'Verify the result', dependsOn: [], gatePurpose: 'Stage One acceptance checklist', sourceState: 'present', state: 'active', gate: { gates: [{ id: 'G1', title: 'closed', closed: true, groupCode: 'G' }, { id: 'G2', title: 'remaining', closed: false, groupCode: 'G' }], groups: [{ code: 'G', name: '증거', closed: 1, total: 2 }], total: 2, closed: 1, available: true, sourceRef: 'GATES.md' }, axes: { implementation: 'active', test: 'pending', evidence: 'pending', independentQa: 'not_started', cherryAcceptance: 'pending', release: 'not_started' }, ...overrides })
const github = (overrides: Partial<GithubConnector> = {}): GithubConnector => ({ adopted: true, required: false, state: 'connected', repository: 'owner/repo', remoteName: 'origin', defaultBranch: 'main', completionAuthority: false, localCandidate: { state: 'available', branch: 'main', ahead: 15, behind: 0, sync: 'ahead' }, published: { state: 'connected', repository: 'owner/repo', ref: 'origin/main', detail: 'published' }, checks: { state: 'unknown' }, release: { state: 'unknown' }, ...overrides })
const project = (id: string, title: string): PackageProject => ({ status: 'valid', errors: [], observedAt: null, project: { id, name: title, outcome: `${title} outcome`, acceptanceAuthority: 'Cherry' }, connectors: { github: github() }, phases: [{ id: `${id}-phase`, title: 'Phase', purpose: 'Phase purpose', completion: null, scopes: [{ id: `${id}-scope`, title: 'Scope', purpose: 'Scope purpose', stages: [stage({ id: `${id}-stage` })] }] }], current: { phaseId: `${id}-phase`, scopeId: `${id}-scope`, stageId: `${id}-stage` }, next: null, bindings: [], now: { status: 'unbound', activity: null, observedAt: null, source: 'runtime_registry' }, progress: { available: false, reason: 'no_cross_stage_aggregate' } })

describe('OUTCOME Package dashboard', () => {
  it('역할 세션은 네 개의 간결한 행과 단일 활성 신호로 표시한다', () => {
    const source = OutcomeDashboard.toString()
    expect(source).toContain('oc-activity-band')
    expect(source).toContain('oc-role-row')
    expect(source).not.toContain('oc-live-glow')
  })
  it('현재 원본 흐름은 하나의 통합 진행 surface로 유지된다', () => {
    const source = OutcomeDashboard.toString()
    expect(source).toContain('oc-flow-summary')
    expect(source).toContain('oc-flow-levels')
    expect(source).not.toContain('oc-current-stage-rail')
  })
  it('작업 단계 목록 선택은 우측 상세만 바꾸고 실제 현재 위치를 유지한다', () => {
    expect(nextStageOptionIndex('ArrowDown', 1, 4)).toBe(2)
    expect(nextStageOptionIndex('ArrowUp', 0, 4)).toBe(3)
    expect(nextStageOptionIndex('Home', 3, 4)).toBe(0)
    expect(nextStageOptionIndex('End', 0, 4)).toBe(3)
    expect(nextStageOptionIndex('Enter', 2, 4)).toBeNull()
    const source = OutcomeDashboard.toString()
    expect(source).toContain('role="listbox"')
    expect(source).toContain('role="option"')
    expect(source).toContain('aria-selected')
    expect(source).not.toContain('aria-pressed')
  })
  it('선택 작업 단계 완료 조건은 실제 closed total을 표시한다', () => {
    expect(selectedGateCount(stage())).toBe('1/2')
    expect(selectedGateCount(stage({ gate: { gates: [], groups: [], total: 0, closed: 0, available: false, sourceRef: null } }))).toBe('완료 조건 근거 없음')
    expect(selectedGateCount(stage({ state: 'complete', gate: { gates: [], groups: [], total: 10, closed: 10, available: true, sourceRef: 'GATES.md' } }))).toBe('10/10')
  })
  it('현재 선택 상세는 완료 조건과 경계를 중복하지 않는다', () => {
    expect(detailContentPolicy(false)).toEqual({ showTitle: false, showPurpose: false, showBoundary: false, showGateList: false })
    expect(detailContentPolicy(true)).toEqual({ showTitle: true, showPurpose: true, showBoundary: true, showGateList: true })
    const source = OutcomeDashboard.toString()
    expect(source).toContain('data-current-boundary')
    expect(source).toContain('data-selected-boundary')
    expect(source).toContain('data-current-gates')
    expect(source).toContain('data-selected-gates')
  })
  it('완료 조건 그룹은 source label과 code를 필요한 경우에만 표시한다', () => {
    expect(gateGroupPresentation('RA', 'RA')).toEqual({ primaryLabel: null, secondaryCode: null })
    expect(gateGroupPresentation('물리 수용 경계', 'P33A')).toEqual({ primaryLabel: '물리 수용 경계', secondaryCode: 'P33A' })
  })
  it('작업 단계 listbox는 이름 있는 group만 option을 소유한다', () => {
    const source = OutcomeDashboard.toString()
    expect(source).toMatch(/groupLabelId[\s\S]{0,600}role: "group"[\s\S]{0,200}"aria-labelledby": groupLabelId/)
    expect(source).not.toContain('className="oc-stage-group" key={group.scope.id} aria-label=')
  })
  it('역할 관측과 프로젝트 식별자는 primary에서 중복되지 않는다', () => {
    expect(bindingObservationLabel({ role: 'builder', status: 'stale', activity: null, boundAt: null, observedAt: null, freshness: 'stale', historyCount: 0 })).toBe('관측 오래됨')
    expect(bindingObservationLabel({ role: 'builder', status: 'idle', activity: null, boundAt: null, observedAt: null, freshness: 'fresh', historyCount: 0 })).toBe('대기 중 · 최근 관측')
    const source = OutcomeDashboard.toString()
    expect(source).not.toContain('<small>프로젝트 식별자 · {project.project.id}</small>')
    expect(source).toContain('기술 증거 · 프로젝트 식별자')
  })
  it('정보 구조 리뉴얼은 핵심 source-grounded 기능을 보존한다', () => {
    const source = OutcomeDashboard.toString()
    for (const token of ['oc-hero-gate', 'oc-gate-gauge', 'oc-now-summary', 'oc-current-flow', 'oc-stage-explorer', 'oc-selected-detail', 'oc-technical']) expect(source).toContain(token)
    expect(source).not.toContain('oc-hero-fill')
    expect(source).not.toContain('oc-confirmed')
  })
  it('핵심 정보 영역을 시각 리뉴얼 뒤에도 보존한다', () => {
    const source = OutcomeDashboard.toString()
    for (const token of ['oc-hero', 'oc-now-summary', 'oc-bindings', 'oc-current-flow', 'oc-current-stage', 'oc-selected-detail', 'oc-technical']) expect(source).toContain(token)
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
  it('한글 운영 문구 covers roles states activity and source-facing fallbacks', () => { expect(['planner', 'builder', 'ux_product_qa', 'release_audit'].map(roleLabel)).toEqual(['기획', '구현', '사용성·제품 검수', '출시 감사']); expect(activityLabelKo('Stage 6 NEEDS_REVISION correction is active; fresh independent QA remains required')).toBe('6단계 수정 진행 중 · 새 독립 검수가 필요합니다'); expect(sourceStateLabel('conflict')).toBe('원본 묶음 충돌'); expect(groupPresentation('RA', 'RA')).toBe('완료 조건 그룹'); expect(stagePresentation('new-stage')).toEqual(['작업 단계 제목 한글화 대기', '작업 단계 목적 한글화 대기']) })
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
    expect(model.current).toContain('작업 단계')
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
  it('활동이 있는 오래된 NOW는 headline과 metadata에 관측 오래됨을 직접 표시한다', () => {
    const presentation = nowPresentation({ status: 'stale', activity: 'Stage 6 NEEDS_REVISION correction is active; fresh independent QA remains required', observedAt: '2026-08-24T00:00:00.000Z', source: 'runtime_registry' })
    expect(presentation.headline).toContain('6단계 수정 진행 중')
    expect(presentation.headline).toContain('관측 오래됨')
    expect(presentation.metadata).toContain('관측 오래됨')
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
