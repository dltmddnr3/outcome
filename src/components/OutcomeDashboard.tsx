import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronRight, Circle, Clock3, Layers3, Radio, RefreshCw } from 'lucide-react'
import { fetchOutcomeDashboard } from '../lib/api'
import { activityLabelKo, axisLabelKo, freshnessLabelKo, gatePresentation, groupPresentation, phasePresentation, projectOutcomePresentation, roleLabel, scopePresentation, sourceLabelKo, sourceStateLabelKo, stagePresentation, stateLabelKo } from './outcomeKorean'

type SourceState = 'valid' | 'stale' | 'unknown' | 'conflict'
export type Binding = { role: string; status: string; activity: string | null; boundAt: string | null; observedAt: string | null; freshness: string; historyCount: number; stageId?: string | null }
type Gate = { id: string; title: string; closed: boolean; groupCode: string }
type GateGroup = { code: string; name: string; total: number; closed: number }
export type PackageStage = { id: string; title: string; purpose: string; dependsOn: string[]; expectedDurationMinutes?: number | null; gatePurpose: string; sourceState: string; state: string; gate: { gates: Gate[]; groups: GateGroup[]; total: number; closed: number; available: boolean; sourceRef: string | null }; axes: { implementation: string; test: string; evidence: string; independentQa: string; cherryAcceptance: string; release: string } }
type Scope = { id: string; title: string; purpose: string; stages: PackageStage[] }
type Phase = { id: string; title: string; purpose: string; completion: string | null; scopes: Scope[] }
export type GithubConnector = { adopted: boolean; required: boolean; state: string; repository: string | null; remoteName: string | null; defaultBranch: string | null; completionAuthority: false; localCandidate: { state: string; branch: string | null; ahead: number | null; behind: number | null; sync: string }; published: { state: string; repository: string | null; ref: string | null; detail: string }; checks: { state: string }; release: { state: string } }
export type PackageProject = { status: SourceState; errors: string[]; observedAt: string | null; sourceFreshness?: { state: string; observedAt: string | null }; project: { id: string; name: string; outcome: string; acceptanceAuthority: string }; connectors: { github: GithubConnector }; phases: Phase[]; current: { phaseId: string; scopeId: string; stageId: string } | null; next: { phaseId: string; scopeId: string; stageId: string } | null; bindings: Binding[]; now: { status: string; activity: string | null; observedAt: string | null; source: string }; progress: { available: false; reason: string } }
export type OutcomeDashboardData = { schemaVersion: 2; observedAt: string; build: { repository: string; ref: string; commit: string | null; tree: string | null; asset: string | null; runtimeNowPinned: false }; projects: PackageProject[] }

const compactTime = (value: string | null) => value ? new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : '근거 없음'

export function findStage(project: PackageProject, stageId: string | null | undefined) {
  for (const phase of project.phases) for (const scope of phase.scopes) for (const stage of scope.stages) if (stage.id === stageId) return { phase, scope, stage }
  return null
}

export function currentHierarchy(project: PackageProject) {
  const phaseIndex = project.phases.findIndex((phase) => phase.id === project.current?.phaseId)
  const phase = phaseIndex >= 0 ? project.phases[phaseIndex] : null
  const scopeIndex = phase?.scopes.findIndex((scope) => scope.id === project.current?.scopeId) ?? -1
  const scope = phase && scopeIndex >= 0 ? phase.scopes[scopeIndex] : null
  const stageIndex = scope?.stages.findIndex((stage) => stage.id === project.current?.stageId) ?? -1
  const stage = scope && stageIndex >= 0 ? scope.stages[stageIndex] : null
  return { phase, scope, stage, phaseIndex: phaseIndex + 1, phaseTotal: project.phases.length, scopeIndex: scopeIndex + 1, scopeTotal: phase?.scopes.length ?? 0, stageIndex: stageIndex + 1, stageTotal: scope?.stages.length ?? 0 }
}

export function heroGateEvidence(stage: PackageStage | null) {
  const available = Boolean(stage?.gate.available && stage.gate.total > 0)
  return { available, closed: stage?.gate.closed ?? 0, total: stage?.gate.total ?? 0, scale: available ? Math.max(0, Math.min(1, stage!.gate.closed / stage!.gate.total)) : null }
}

export function gateProgress(stage: PackageStage | null) {
  const available = Boolean(stage?.gate.available && stage.gate.total > 0)
  const closed = stage?.gate.closed ?? 0
  const total = stage?.gate.total ?? 0
  return { available, closed, total, percent: available ? Math.round(closed / total * 100) : null, scale: available ? Math.max(0, Math.min(1, closed / total)) : null }
}

export function hierarchyPlacement(project: PackageProject) {
  const hierarchy = currentHierarchy(project)
  return { phase: `${hierarchy.phaseIndex} / ${hierarchy.phaseTotal}`, scope: `${hierarchy.scopeIndex} / ${hierarchy.scopeTotal}`, stage: `${hierarchy.stageIndex} / ${hierarchy.stageTotal}` }
}

export function deriveScopeState(scope: Scope, currentScopeId: string | undefined): 'complete' | 'active' | 'pending' | 'unknown' {
  if (!scope.stages.length) return 'unknown'
  if (scope.stages.every((stage) => stage.state === 'complete')) return 'complete'
  if (scope.id === currentScopeId) return 'active'
  if (scope.stages.every((stage) => stage.state === 'unknown')) return 'unknown'
  return 'pending'
}

export function deriveStageRailState(stage: PackageStage, currentStageId: string | undefined): 'complete' | 'active' | 'pending' | 'unknown' {
  if (stage.state === 'complete') return 'complete'
  if (stage.id === currentStageId) return 'active'
  return stage.state === 'unknown' ? 'unknown' : 'pending'
}

export function selectLiveBinding(bindings: Binding[]) { return bindings.find((binding) => binding.status === 'active' && binding.freshness === 'fresh') ?? null }

const durationKo = (minutes: number) => {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return hours ? `${hours}시간${rest ? ` ${rest}분` : ''}` : `${rest}분`
}

export function timingPresentation(stage: PackageStage, binding: Binding | null, currentStageId: string, now = new Date()) {
  const boundAt = binding?.boundAt ? Date.parse(binding.boundAt) : NaN
  const eligible = Boolean(binding && binding.status === 'active' && binding.freshness === 'fresh' && binding.stageId === currentStageId && Number.isFinite(boundAt) && boundAt <= now.getTime())
  if (!eligible || !binding) return { elapsed: { available: false, label: '현재 작업시간', value: '작업시간 측정 근거 없음', basis: null }, eta: { available: false, label: '남은 예상 시간', value: '남은 시간 예상 근거 없음' } }
  const elapsedMinutes = Math.max(0, Math.floor((now.getTime() - boundAt) / 60_000))
  const expected = Number.isInteger(stage.expectedDurationMinutes) && stage.expectedDurationMinutes! > 0 ? stage.expectedDurationMinutes! : null
  return {
    elapsed: { available: true, label: '현재 역할 연결 후 경과', value: durationKo(elapsedMinutes), basis: `${roleLabel(binding.role)} 연결 시작 ${compactTime(binding.boundAt)}` },
    eta: expected === null ? { available: false, label: '남은 예상 시간', value: '남은 시간 예상 근거 없음' } : { available: true, label: '계획 기준 예상', value: durationKo(Math.max(0, expected - elapsedMinutes)) },
  }
}

export function summarizeStage(stage: PackageStage) {
  const remaining = stage.gate.gates.filter((gate) => !gate.closed)
  return { closed: stage.gate.closed, total: stage.gate.total, remaining: remaining.slice(0, 3), confirmedPercent: stage.state === 'complete' && stage.gate.total > 0 ? Math.round(stage.gate.closed / stage.gate.total * 100) : null }
}

export function stageDetailSemantics(stage: PackageStage, dependencyTitles: string[] = []) {
  const summary = summarizeStage(stage)
  const dependency = dependencyTitles.length ? dependencyTitles.join(', ') : '선행 작업 단계'
  const boundaryByState: Record<string, string> = { locked: `${dependency}가 완료되지 않아 이 작업 단계는 잠겨 있습니다.`, blocked: `${dependency} 이후 원본 완료 조건의 ${stateLabelKo(stage.sourceState)} 차단 경계가 해제되어야 진행할 수 있습니다.`, gates_closed_evidence_pending: '체크 항목은 모두 닫혔지만 증거 확정은 아직 대기 중입니다.', queued: '선행 작업 단계 완료 후 진입 가능한 대기 상태이며, 아직 완료 증거가 아닙니다.', pending: '원본 묶음의 증거 확정이 대기 중이며 체크 수는 완료 판정이 아닙니다.', active: '현재 작업 단계가 진행 중이며 체크 수는 완료 판정이 아닙니다.', unknown: '원본 묶음에 작업 단계 상태 근거가 없어 완료 여부를 판단하지 않습니다.' }
  const complete = stage.state === 'complete'
  const stageTitle = stagePresentation(stage.id)[0]
  const boundaryCopy = complete ? `${stageTitle}의 완료 조건 증거가 원본에서 확정되었습니다.` : boundaryByState[stage.state] ?? `원본 작업 단계 상태는 ${stateLabelKo(stage.state)}이며 완료가 아닙니다.`
  const checkedCopy = complete ? '연결된 완료 조건의 증거가 모두 확정되었습니다.' : summary.total ? `${summary.closed}/${summary.total} 체크 항목 확인 · ${boundaryCopy}` : `완료 조건 원본이 없어 상태를 판단할 수 없습니다. ${boundaryCopy}`
  return { ...summary, countLabel: complete ? '증거 확정 / 전체' : '체크됨 / 전체', boundaryCopy, checkedCopy }
}

export function selectedGateCount(stage: PackageStage) {
  return stage.gate.available && stage.gate.total > 0 ? `${stage.gate.closed}/${stage.gate.total}` : '완료 조건 근거 없음'
}

export function detailContentPolicy(exploring: boolean) {
  return { showTitle: exploring, showPurpose: exploring, showBoundary: exploring, showGateList: exploring }
}

export function gateGroupPresentation(name: string, code: string) {
  const primaryLabel = groupPresentation(name, code)
  return primaryLabel === '완료 조건 그룹' ? { primaryLabel: null, secondaryCode: null } : { primaryLabel, secondaryCode: code }
}

export function meaningfulGateGroups(groups: GateGroup[], available = true) {
  if (!available) return []
  return groups.flatMap((group) => {
    const presentation = gateGroupPresentation(group.name, group.code)
    return presentation.primaryLabel ? [{ ...group, ...presentation }] : []
  })
}

export function bindingObservationLabel(binding: Binding) {
  const state = entityStateLabel(binding.status)
  const freshness = freshnessLabelKo(binding.freshness)
  return state === freshness ? state : `${state} · ${freshness}`
}

export function selectProject(projects: PackageProject[], id: string) { return projects.find((project) => project.project.id === id) ?? projects[0] ?? null }

export function selectedStageContext(project: PackageProject, selectedStageId: string | null) {
  const hierarchy = currentHierarchy(project)
  const current = hierarchy.stage ? findStage(project, hierarchy.stage.id) : null
  const selected = findStage(project, selectedStageId) ?? current ?? findStage(project, project.phases[0]?.scopes[0]?.stages[0]?.id)
  return { hierarchy, current, selected, exploring: Boolean(current && selected && current.stage.id !== selected.stage.id) }
}

export function nextStageOptionIndex(key: string, index: number, total: number) {
  if (total < 1) return null
  if (key === 'ArrowDown') return (index + 1) % total
  if (key === 'ArrowUp') return (index - 1 + total) % total
  if (key === 'Home') return 0
  if (key === 'End') return total - 1
  return null
}

export function projectHeroModel(project: PackageProject) {
  const hierarchy = currentHierarchy(project)
  const next = findStage(project, project.next?.stageId)
  return { name: project.project.name, outcome: projectOutcomePresentation(project.project.id, project.project.outcome), current: hierarchy.stage ? `${phasePresentation(hierarchy.phase!.id)[0]} → ${scopePresentation(hierarchy.scope!.id)[0]} → ${stagePresentation(hierarchy.stage.id)[0]}` : '현재 위치 근거 없음', next: next ? stagePresentation(next.stage.id)[0] : '다음 단계 근거 없음', freshness: compactTime(project.sourceFreshness?.observedAt ?? project.observedAt) }
}

export function nowPresentation(now: PackageProject['now']) {
  const activity = activityLabelKo(now.activity)
  const stale = now.status === 'stale' ? entityStateLabel(now.status) : null
  return {
    headline: activity ? `${activity}${stale ? ` · ${stale}` : ''}` : `구현 ${entityStateLabel(now.status)}`,
    metadata: `${sourceLabelKo(now.source)} · ${compactTime(now.observedAt)} · 세션 활동은 진행률이 아닙니다.`,
  }
}

export function githubEvidenceItems(connector: GithubConnector) {
  const distance = connector.localCandidate.ahead == null || connector.localCandidate.behind == null ? stateLabelKo(connector.localCandidate.sync) : `${connector.localCandidate.ahead}개 앞섬 · ${connector.localCandidate.behind}개 뒤처짐`
  return [
    { label: '로컬 후보', state: connector.localCandidate.state, value: connector.localCandidate.branch ? `${connector.localCandidate.branch} · ${distance}` : '로컬 근거 없음' },
    { label: 'GitHub 게시', state: connector.published.state, value: connector.published.repository ? `${connector.published.repository} · ${connector.published.detail === 'empty_remote' ? '빈 원격 저장소' : connector.published.ref}` : `${connector.defaultBranch ?? '브랜치 근거 없음'} · 저장소 연결 없음` },
    { label: '자동 검사', state: connector.checks.state, value: 'GitHub 검사 근거 없음' },
    { label: '출시', state: connector.release.state, value: 'GitHub 출시 근거 없음' },
  ]
}

export const entityStateLabel = stateLabelKo
export const sourceStateLabel = sourceStateLabelKo
export const axisStateLabel = axisLabelKo
const railStateLabel = (state: string) => ({ complete: '완료', active: '진행 중', pending: '대기', unknown: '근거 없음' }[state] ?? '근거 없음')
function RailIcon({ state }: { state: string }) { return state === 'complete' ? <Check size={14} /> : state === 'active' ? <Radio size={14} /> : state === 'pending' ? <Clock3 size={14} /> : <Circle size={14} /> }
function Axis({ label, value }: { label: string; value: string }) { return <div className="oc-axis"><small>{label}</small><strong>{axisStateLabel(value)}</strong></div> }

export function OutcomeDashboard({ onUnauthorized }: { onUnauthorized: () => void }) {
  const [data, setData] = useState<OutcomeDashboardData | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState('outcome')
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const load = async () => { try { setData(await fetchOutcomeDashboard()); setError(null) } catch (reason) { const message = reason instanceof Error ? reason.message : ''; if (message === 'authentication_required') onUnauthorized(); else setError('대시보드를 읽지 못했습니다.') } }
  useEffect(() => { void load(); const timer = window.setInterval(() => void load(), 10_000); return () => window.clearInterval(timer) }, [])
  const project = useMemo(() => data ? selectProject(data.projects, selectedProjectId) : null, [data, selectedProjectId])
  const context = project ? selectedStageContext(project, selectedStageId) : null
  if (!data || !project || !context?.current || !context.selected || !context.hierarchy.phase || !context.hierarchy.scope || !context.hierarchy.stage) return <section className="cn-dashboard cn-loading"><h2>{error ?? 'OUTCOME 원본 묶음을 검증하고 있습니다'}</h2>{error && <button onClick={() => void load()}>다시 확인</button>}</section>
  const { hierarchy, current, selected, exploring } = context
  const hero = projectHeroModel(project)
  const now = nowPresentation(project.now)
  const currentGateProgress = gateProgress(current.stage)
  const liveBinding = selectLiveBinding(project.bindings)
  const timingBinding = project.bindings.find((binding) => binding.status === 'active' && binding.freshness === 'fresh' && binding.stageId === current.stage.id) ?? null
  const timing = timingPresentation(current.stage, timingBinding, current.stage.id, new Date(data.observedAt))
  const currentSummary = stageDetailSemantics(current.stage, current.stage.dependsOn.map((id) => stagePresentation(id)[0]))
  const selectedSummary = stageDetailSemantics(selected.stage, selected.stage.dependsOn.map((id) => stagePresentation(id)[0]))
  const detailPolicy = detailContentPolicy(exploring)
  const selectedGateGroups = meaningfulGateGroups(selected.stage.gate.groups, selected.stage.gate.available)
  const allStages = project.phases.flatMap((phase) => phase.scopes.flatMap((scope) => scope.stages.map((stage) => ({ phase, scope, stage }))))
  const stageGroups = project.phases.flatMap((phase) => phase.scopes.map((scope) => ({ phase, scope, stages: scope.stages })))
  const github = project.connectors.github
  const switchProject = (id: string) => { setSelectedProjectId(id); setSelectedStageId(null) }
  const selectStageByKeyboard = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const nextIndex = nextStageOptionIndex(event.key, index, allStages.length)
    if (nextIndex === null) return
    event.preventDefault()
    setSelectedStageId(allStages[nextIndex].stage.id)
    const options = event.currentTarget.closest('[role="listbox"]')?.querySelectorAll<HTMLElement>('[role="option"]')
    window.requestAnimationFrame(() => options?.[nextIndex]?.focus())
  }

  return <section className="cn-dashboard oc-dashboard" data-project-id={project.project.id} data-current-stage-id={current.stage.id} data-selected-stage-id={selected.stage.id}>
    <header className="oc-topbar"><nav aria-label="프로젝트 전환">{data.projects.map((item) => <button key={item.project.id} aria-label={`${item.project.name} · ${sourceStateLabel(item.status)}`} aria-current={item.project.id === project.project.id ? 'page' : undefined} onClick={() => switchProject(item.project.id)}><i className={item.status} aria-hidden="true" />{item.project.name}<span className="oc-visually-hidden">{sourceStateLabel(item.status)}</span></button>)}</nav></header>
    <section className={`oc-hero ${project.status}`} aria-labelledby="oc-project-title">
      <div className="oc-hero-main">
        <div className="oc-hero-title"><Layers3 size={22} aria-hidden="true" /><div><h1 id="oc-project-title">{hero.name}</h1><p>{hero.outcome}</p></div></div>
        <div className="oc-hero-orientation"><div><small>현재 작업 단계</small><strong>{stagePresentation(current.stage.id)[0]}</strong><span>{phasePresentation(current.phase.id)[0]} · {scopePresentation(current.scope.id)[0]}</span></div><ChevronRight size={17} aria-hidden="true" /><div><small>다음 경계</small><strong>{hero.next}</strong></div></div>
      </div>
      <div className="oc-hero-side">
        <div className="oc-hero-meta"><span className={`oc-source ${project.status}`}><strong>{sourceStateLabel(project.status)}</strong><small>원본 관측 {hero.freshness}</small></span><button className="cn-refresh" onClick={() => void load()} aria-label="원본 묶음 새로고침"><RefreshCw size={16} /></button></div>
        <div className="oc-hero-gate" data-gate-fill={currentGateProgress.available ? 'available' : 'unavailable'} data-current-gate-signature={`${currentGateProgress.closed}/${currentGateProgress.total}`}>
          <small>현재 작업 단계 완료 조건</small>
          <strong>{currentGateProgress.available ? `${currentGateProgress.closed}/${currentGateProgress.total} · ${currentGateProgress.percent}%` : '완료 조건 근거 없음'}</strong>
          {currentGateProgress.available && <span className="oc-gate-gauge" role="img" aria-label={`현재 작업 단계 완료 조건 ${currentGateProgress.percent}%`}><i style={{ transform: `scaleX(${currentGateProgress.scale})` }} /></span>}
          <span>프로젝트 전체 진행률이 아닙니다.</span>
        </div>
      </div>
      {project.status !== 'valid' && <div className={`oc-warning ${project.status}`} role="status"><strong>{sourceStateLabel(project.status)}</strong><span>원본 묶음의 참조와 식별자를 다시 확인하세요.</span></div>}
    </section>
    <section className="oc-activity-band" aria-label="현재 작업과 역할 연결">
      <section className="oc-now-summary" data-now-status={project.now.status} data-has-activity={project.now.activity ? 'true' : 'false'}>
        <h2 className="oc-visually-hidden">현재 작업</h2>
        <div className="oc-now-copy"><small>현재 작업 · 실시간 · 빌드에 고정되지 않음</small><strong>{now.headline}</strong><span>{now.metadata}</span></div>
        <div className="oc-now-timing" aria-label="현재 작업 시간 근거">
          <span className="oc-time-elapsed" data-available={timing.elapsed.available ? 'true' : 'false'}><small>{timing.elapsed.label}</small><strong>{timing.elapsed.value}</strong>{timing.elapsed.basis && <em>{timing.elapsed.basis}</em>}</span>
          <span className="oc-time-eta" data-available={timing.eta.available ? 'true' : 'false'}><small>{timing.eta.label}</small><strong>{timing.eta.value}</strong></span>
        </div>
      </section>
      <div className="oc-bindings" role="group" aria-label="역할별 세션 관측">{project.bindings.map((binding) => { const live = liveBinding === binding; return <div key={binding.role} className={`oc-role-row ${binding.status}`} data-live={live ? 'true' : 'false'}><strong>{roleLabel(binding.role)}</strong><span>{bindingObservationLabel(binding)}</span>{live && <span className="oc-live-signal" aria-label="실시간 활동"><i aria-hidden="true" /><span className="oc-live-bars" aria-hidden="true"><i /><i /><i /></span><b>실시간</b></span>}</div> })}</div>
    </section>
    <section className="oc-current-flow" aria-labelledby="oc-flow-title">
      <header><h2 id="oc-flow-title">현재 원본 흐름</h2><p>선택한 탐색 화면과 무관한 실제 현재 위치입니다.</p><div className="oc-flow-summary"><span>큰 단계 {hierarchy.phaseIndex} / {hierarchy.phaseTotal}</span><span>범위 {hierarchy.scopeIndex} / {hierarchy.scopeTotal}</span><span>작업 단계 {hierarchy.stageIndex} / {hierarchy.stageTotal}</span></div></header>
      <div className="oc-flow-levels">
        <div className="oc-funnel-row oc-funnel-phase" data-index={hierarchy.phaseIndex} data-total={hierarchy.phaseTotal}><div className="oc-flow-axis" aria-hidden="true">1</div><div className="oc-flow-copy"><small>큰 단계</small><strong>{phasePresentation(current.phase.id)[0]}</strong><p>{phasePresentation(current.phase.id)[1]}</p></div></div>
        <div className="oc-funnel-row oc-funnel-scope" data-index={hierarchy.scopeIndex} data-total={hierarchy.scopeTotal}><div className="oc-flow-axis" aria-hidden="true">2</div><div className="oc-flow-copy"><small>범위</small><strong>{scopePresentation(current.scope.id)[0]}</strong><p>{scopePresentation(current.scope.id)[1]}</p><div className="oc-rail oc-scope-rail">{current.phase.scopes.map((scope) => { const state = deriveScopeState(scope, project.current?.scopeId); return <article key={scope.id} className={state} data-rail-state={state}><i aria-hidden="true"><RailIcon state={state} /></i><span><strong>{scopePresentation(scope.id)[0]}</strong><small>{railStateLabel(state)}</small></span></article> })}</div></div></div>
        <div className="oc-funnel-row oc-funnel-stage" data-index={hierarchy.stageIndex} data-total={hierarchy.stageTotal}><div className="oc-flow-axis" aria-hidden="true">3</div><div className="oc-flow-copy"><small>작업 단계</small><strong>{stagePresentation(current.stage.id)[0]}</strong><p>{stagePresentation(current.stage.id)[1]}</p></div></div>
        <div className="oc-funnel-row oc-funnel-gate" data-closed={currentSummary.closed} data-total={currentSummary.total}><div className="oc-flow-axis" aria-hidden="true">4</div><div className="oc-flow-copy"><small>완료 조건</small><strong>현재 작업 단계 수용 기준</strong><p data-current-boundary>{currentSummary.boundaryCopy}</p></div></div>
      </div>
    </section>
    <section className="oc-current-stage" aria-labelledby="oc-current-stage-title"><header><div><small>현재 작업 단계에서 먼저 확인할 것</small><h2 id="oc-current-stage-title">{stagePresentation(current.stage.id)[0]}</h2></div></header><div data-current-gates>{currentSummary.remaining.length ? <ol>{currentSummary.remaining.map((gate) => <li key={gate.id}><b>{gate.id}</b><span>{gatePresentation(current.stage.id, gate.id)}</span></li>)}</ol> : <p>표시할 남은 완료 조건 항목이 없습니다.</p>}</div></section>
    <section className="oc-stage-explorer" aria-labelledby="oc-explorer-title"><header><div><h2 id="oc-explorer-title">작업 단계 탐색</h2><p>원본 작업 단계 {allStages.length}개 · 선택은 현재 흐름을 바꾸지 않습니다.</p></div></header><div className="oc-explorer-layout"><div className="oc-stage-list" role="listbox" aria-label="원본 작업 단계">{stageGroups.map((group) => { const groupLabelId = `oc-stage-group-${group.scope.id.replace(/[^a-zA-Z0-9_-]/g, '-')}`; return <section className="oc-stage-group" key={group.scope.id} role="group" aria-labelledby={groupLabelId}><h3 id={groupLabelId}>{scopePresentation(group.scope.id)[0]}</h3>{group.stages.map((stage) => { const index = allStages.findIndex((item) => item.stage.id === stage.id); const isSelected = stage.id === selected.stage.id; const isCurrent = stage.id === project.current?.stageId; return <button key={stage.id} role="option" tabIndex={isSelected ? 0 : -1} data-stage-id={stage.id} data-stage-state={stage.state} className={isSelected ? 'active' : ''} aria-selected={isSelected} aria-current={isCurrent ? 'step' : undefined} onKeyDown={(event) => selectStageByKeyboard(event, index)} onClick={() => setSelectedStageId(stage.id)}><i className={stage.state} aria-hidden="true">{stage.state === 'complete' && <Check size={12} />}</i><span><strong>{stagePresentation(stage.id)[0]}</strong><small>{entityStateLabel(stage.state)}</small></span></button> })}</section> })}</div>
        <section className="oc-detail oc-selected-detail" data-stage-state={selected.stage.state} data-exploring={exploring ? 'true' : 'false'} data-gate-available={selected.stage.gate.available ? 'true' : 'false'} data-gate-closed={selected.stage.gate.closed} data-gate-total={selected.stage.gate.total} aria-labelledby={detailPolicy.showTitle ? 'oc-selected-stage-title' : undefined} aria-label={detailPolicy.showTitle ? undefined : '현재 작업 단계 보조 근거'}><div className="oc-selection-status" aria-live="polite">{exploring ? <><span className="oc-exploration-badge">탐색 중 · 실제 현재 위치는 {stagePresentation(current.stage.id)[0]} 유지</span><h3 id="oc-selected-stage-title">{stagePresentation(selected.stage.id)[0]}</h3></> : <span>현재 작업 단계 보조 근거</span>}</div>{detailPolicy.showPurpose && <p>{stagePresentation(selected.stage.id)[1]}</p>}<dl className="oc-detail-facts"><div><dt>의존성</dt><dd>{selected.stage.dependsOn.length ? selected.stage.dependsOn.map((id) => stagePresentation(id)[0]).join(' · ') : '선행 작업 단계 없음'}</dd></div><div><dt>완료 조건 확인</dt><dd>{selectedGateCount(selected.stage)}</dd></div></dl>{detailPolicy.showBoundary && <p className="oc-detail-boundary" data-selected-boundary>{selectedSummary.boundaryCopy}</p>}{(detailPolicy.showGateList || selectedGateGroups.length > 0) && <div className={`oc-detail-grid ${exploring ? 'is-exploring' : 'is-current'}`}>{detailPolicy.showGateList && <section data-selected-gates><h4>선택 작업 단계의 남은 완료 조건</h4>{selectedSummary.remaining.length ? <ol>{selectedSummary.remaining.map((gate) => <li key={gate.id}><b>{gate.id}</b><span>{gatePresentation(selected.stage.id, gate.id)}</span></li>)}</ol> : <p>{selectedSummary.checkedCopy}</p>}</section>}{selectedGateGroups.length > 0 && <section data-source-groups><h4>그룹별 확인</h4><div className="oc-groups" data-group-count={selectedGateGroups.length}>{selectedGateGroups.map((group) => <article key={group.code} data-generic="false"><span><strong>{group.primaryLabel}</strong><small>코드 {group.secondaryCode}</small></span><b aria-label={`${group.primaryLabel} ${group.closed}/${group.total}`}>{group.closed}/{group.total}</b></article>)}</div></section>}</div>}</section>
      </div></section>
    <details className="oc-technical"><summary><span>기술 증거</span><small>빌드·역할 연결·GitHub·근거 축</small></summary><div className="oc-technical-content"><div className="oc-build" aria-label="제공 중인 고정 빌드"><small>기술 증거 · 프로젝트 식별자 {project.project.id} · {data.build.repository}/{data.build.ref}</small><strong>커밋 {data.build.commit ?? '근거 없음'} · 트리 {data.build.tree ?? '근거 없음'}</strong><span>에셋 {data.build.asset ?? '근거 없음'} · 실시간 현재 작업은 빌드에 고정되지 않음</span></div><section className="oc-binding-evidence" aria-label="역할 연결 기술 증거"><h3>역할 연결 근거</h3>{project.bindings.map((binding) => <div key={binding.role}><strong>{roleLabel(binding.role)}</strong><span>{binding.stageId ?? '작업 단계 연결 없음'} · 이력 {binding.historyCount} · 관측 {compactTime(binding.observedAt)}</span></div>)}</section><section className="oc-github" aria-label="GitHub 전달 근거 연결"><header><div><small>선택 연결 근거 · GitHub</small><strong>{github.adopted ? 'GitHub 연결 채택' : 'GitHub 연결 미채택'}</strong></div><span className={github.state}>{entityStateLabel(github.state)}</span></header><div>{githubEvidenceItems(github).map((item) => <article key={item.label} className={item.state}><small>{item.label}</small><strong>{item.value}</strong><span>{entityStateLabel(item.state)}</span></article>)}</div><p>완료 판정 권한 없음 · GitHub 활동은 완료 조건 충족이나 Cherry 승인이 아닙니다.</p></section><div className="oc-axes" aria-label="선택 작업 단계 근거 축"><Axis label="구현" value={selected.stage.axes.implementation} /><Axis label="테스트" value={selected.stage.axes.test} /><Axis label="증거 확정" value={selected.stage.axes.evidence} /><Axis label="변화 관측" value={project.now.status} /></div></div></details>
  </section>
}
