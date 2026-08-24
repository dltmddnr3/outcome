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

export function selectProject(projects: PackageProject[], id: string) { return projects.find((project) => project.project.id === id) ?? projects[0] ?? null }

export function selectedStageContext(project: PackageProject, selectedStageId: string | null) {
  const hierarchy = currentHierarchy(project)
  const current = hierarchy.stage ? findStage(project, hierarchy.stage.id) : null
  const selected = findStage(project, selectedStageId) ?? current ?? findStage(project, project.phases[0]?.scopes[0]?.stages[0]?.id)
  return { hierarchy, current, selected, exploring: Boolean(current && selected && current.stage.id !== selected.stage.id) }
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
    metadata: `${stale ? `${stale} · ` : ''}${sourceLabelKo(now.source)} · ${compactTime(now.observedAt)} · 세션 활동은 진행률이 아닙니다.`,
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
  const gateEvidence = heroGateEvidence(current.stage)
  const currentGateProgress = gateProgress(current.stage)
  const liveBinding = selectLiveBinding(project.bindings)
  const timingBinding = project.bindings.find((binding) => binding.status === 'active' && binding.freshness === 'fresh' && binding.stageId === current.stage.id) ?? null
  const timing = timingPresentation(current.stage, timingBinding, current.stage.id, new Date(data.observedAt))
  const currentSummary = stageDetailSemantics(current.stage, current.stage.dependsOn.map((id) => stagePresentation(id)[0]))
  const selectedSummary = stageDetailSemantics(selected.stage, selected.stage.dependsOn.map((id) => stagePresentation(id)[0]))
  const allStages = project.phases.flatMap((phase) => phase.scopes.flatMap((scope) => scope.stages.map((stage) => ({ phase, scope, stage }))))
  const github = project.connectors.github
  const switchProject = (id: string) => { setSelectedProjectId(id); setSelectedStageId(null) }

  return <section className="cn-dashboard oc-dashboard" data-project-id={project.project.id} data-current-stage-id={current.stage.id} data-selected-stage-id={selected.stage.id}>
    <header className="oc-topbar"><nav aria-label="프로젝트 전환">{data.projects.map((item) => <button key={item.project.id} aria-label={`${item.project.name} · ${sourceStateLabel(item.status)}`} aria-current={item.project.id === project.project.id ? 'page' : undefined} onClick={() => switchProject(item.project.id)}><i className={item.status} aria-hidden="true" />{item.project.name}<span className="oc-visually-hidden">{sourceStateLabel(item.status)}</span></button>)}</nav></header>
    <section className={`oc-hero ${project.status}`} aria-labelledby="oc-project-title">
      {gateEvidence.available && <span className="oc-hero-fill" style={{ transform: `scaleX(${gateEvidence.scale})` }} aria-hidden="true" />}
      <div className="oc-hero-title"><Layers3 size={22} aria-hidden="true" /><div><small>프로젝트 식별자 · {project.project.id}</small><h1 id="oc-project-title">{hero.name}</h1><p>{hero.outcome}</p></div></div>
      <div className="oc-hero-orientation"><div><small>현재 위치</small><strong>{hero.current}</strong></div><ChevronRight size={17} aria-hidden="true" /><div><small>다음 경계</small><strong>{hero.next}</strong></div></div>
      <div className="oc-hero-meta"><span className={`oc-source ${project.status}`}><strong>{sourceStateLabel(project.status)}</strong><small>원본 관측 {hero.freshness}</small></span><button className="cn-refresh" onClick={() => void load()} aria-label="원본 묶음 새로고침"><RefreshCw size={16} /></button></div>
      <div className="oc-hero-gate" data-gate-fill={currentGateProgress.available ? 'available' : 'unavailable'}>
        <small>현재 작업 단계 완료 조건</small>
        <strong>{currentGateProgress.available ? `${currentGateProgress.closed}/${currentGateProgress.total} · ${currentGateProgress.percent}%` : '완료 조건 근거 없음'}</strong>
        {currentGateProgress.available && <span className="oc-gate-gauge" role="img" aria-label={`현재 작업 단계 완료 조건 ${currentGateProgress.percent}%`}><i style={{ transform: `scaleX(${currentGateProgress.scale})` }} /></span>}
        <span>프로젝트 전체 진행률이 아닙니다.</span>
      </div>
      {project.status !== 'valid' && <div className={`oc-warning ${project.status}`} role="status"><strong>{sourceStateLabel(project.status)}</strong><span>원본 묶음의 참조와 식별자를 다시 확인하세요.</span></div>}
    </section>
    <h2 className="oc-visually-hidden">프로젝트 현재 상태와 진행 근거</h2>
    <section className="oc-now-summary" data-now-status={project.now.status} data-has-activity={project.now.activity ? 'true' : 'false'}>
      <div className="oc-now-copy"><small>현재 작업 · 실시간 · 빌드에 고정되지 않음</small><strong>{now.headline}</strong><span>{now.metadata}</span></div>
      <div className="oc-now-timing" aria-label="현재 작업 시간 근거">
        <span className="oc-time-elapsed" data-available={timing.elapsed.available ? 'true' : 'false'}><small>{timing.elapsed.label}</small><strong>{timing.elapsed.value}</strong>{timing.elapsed.basis && <em>{timing.elapsed.basis}</em>}</span>
        <span className="oc-time-eta" data-available={timing.eta.available ? 'true' : 'false'}><small>{timing.eta.label}</small><strong>{timing.eta.value}</strong></span>
      </div>
    </section>
    <section className="oc-bindings" aria-label="역할별 세션 관측">{project.bindings.map((binding) => { const live = liveBinding === binding; return <article key={binding.role} className={`${binding.status}${live ? ' is-live' : ''}`} data-live={live ? 'true' : 'false'}><div><small>{roleLabel(binding.role)}</small>{live && <span className="oc-live-bars" aria-label="실시간 활동"><i /><i /><i /></span>}</div><strong>{entityStateLabel(binding.status)}</strong><span>{freshnessLabelKo(binding.freshness)} · {binding.stageId ?? '작업 단계 연결 없음'} · 이력 {binding.historyCount}</span></article> })}</section>
    <section className="oc-current-flow" aria-labelledby="oc-flow-title"><header><small>현재 원본 흐름</small><h3 id="oc-flow-title">큰 단계에서 완료 조건까지</h3><p>아래 수치는 선택한 탐색 화면이 아니라 실제 현재 위치에서만 계산합니다.</p></header><div className="oc-funnel-row oc-funnel-phase" data-index={hierarchy.phaseIndex} data-total={hierarchy.phaseTotal}><div className="oc-funnel-heading"><span>1</span><small>큰 단계 {hierarchy.phaseIndex} / {hierarchy.phaseTotal}</small><strong>{phasePresentation(current.phase.id)[0]}</strong></div><p>{phasePresentation(current.phase.id)[1]}</p></div><div className="oc-funnel-row oc-funnel-scope" data-index={hierarchy.scopeIndex} data-total={hierarchy.scopeTotal}><div className="oc-funnel-heading"><span>2</span><small>범위 {hierarchy.scopeIndex} / {hierarchy.scopeTotal}</small><strong>{scopePresentation(current.scope.id)[0]}</strong></div><p>{scopePresentation(current.scope.id)[1]}</p><div className="oc-rail oc-scope-rail">{current.phase.scopes.map((scope) => { const state = deriveScopeState(scope, project.current?.scopeId); return <article key={scope.id} className={state} data-rail-state={state}><i aria-hidden="true"><RailIcon state={state} /></i><span><strong>{scopePresentation(scope.id)[0]}</strong><small>{railStateLabel(state)}</small></span></article> })}</div></div><div className="oc-funnel-row oc-funnel-stage" data-index={hierarchy.stageIndex} data-total={hierarchy.stageTotal}><div className="oc-funnel-heading"><span>3</span><small>작업 단계 {hierarchy.stageIndex} / {hierarchy.stageTotal}</small><strong>{stagePresentation(current.stage.id)[0]}</strong></div><p>{stagePresentation(current.stage.id)[1]}</p><div className="oc-rail oc-current-stage-rail">{current.scope.stages.map((stage) => { const state = deriveStageRailState(stage, project.current?.stageId); return <article key={stage.id} className={state} data-stage-id={stage.id} data-rail-state={state}><i aria-hidden="true"><RailIcon state={state} /></i><span><strong>{stagePresentation(stage.id)[0]}</strong><small>{railStateLabel(state)}</small></span></article> })}</div></div><div className="oc-funnel-row oc-funnel-gate" data-closed={currentSummary.closed} data-total={currentSummary.total}><div className="oc-funnel-heading"><span>4</span><small>완료 조건 {current.stage.gate.available ? `${currentSummary.closed} / ${currentSummary.total}` : '근거 없음'}</small><strong>다음 경계를 여는 현재 조건</strong></div><p>{currentSummary.boundaryCopy}</p><ol>{currentSummary.remaining.length ? currentSummary.remaining.map((gate) => <li key={gate.id}><b>{gate.id}</b><span>{gatePresentation(current.stage.id, gate.id)}</span></li>) : <li><span>{currentSummary.checkedCopy}</span></li>}</ol></div></section>
    <section className="oc-current-stage" aria-label="현재 작업 단계 요약"><header><div><small>현재 작업 단계</small><h3>{stagePresentation(current.stage.id)[0]}</h3></div><strong>{current.stage.gate.available ? `${currentSummary.closed}/${currentSummary.total}` : '근거 없음'}</strong></header><p>{currentSummary.boundaryCopy}</p></section>
    <section className="oc-stage-explorer"><header><div><small>작업 단계 탐색</small><h3>원본 작업 단계 {allStages.length}개</h3></div><span>선택은 현재 흐름을 바꾸지 않습니다.</span></header><div className="oc-stage-list">{allStages.map((item) => <button key={item.stage.id} data-stage-id={item.stage.id} data-stage-state={item.stage.state} className={item.stage.id === selected.stage.id ? 'active' : ''} aria-pressed={item.stage.id === selected.stage.id} aria-current={item.stage.id === project.current?.stageId ? 'step' : undefined} onClick={() => setSelectedStageId(item.stage.id)}><i className={item.stage.state} aria-hidden="true">{item.stage.state === 'complete' && <Check size={11} />}</i><span><small>{scopePresentation(item.scope.id)[0]}</small><strong>{stagePresentation(item.stage.id)[0]}</strong></span><em>{entityStateLabel(item.stage.state)}</em></button>)}</div></section>
    <section className="oc-detail oc-selected-detail" data-stage-state={selected.stage.state} data-exploring={exploring ? 'true' : 'false'} aria-live="polite"><header><div><small>작업 단계 상세 · {selected.stage.id}</small><h3>{stagePresentation(selected.stage.id)[0]}</h3><p>{stagePresentation(selected.stage.id)[1]}</p></div><div>{exploring && <span className="oc-exploration-badge">탐색 중 · 실제 현재 위치 유지</span>}<strong>{selected.stage.gate.available ? `${selectedSummary.closed}/${selectedSummary.total}` : '근거 없음'}</strong><small>{selectedSummary.countLabel}</small></div></header><p className="oc-detail-boundary">{selectedSummary.boundaryCopy}</p>{selectedSummary.confirmedPercent !== null && <div className="oc-confirmed"><i aria-label={`완료 조건 증거 확정 ${selectedSummary.confirmedPercent}%`}><em style={{ width: `${selectedSummary.confirmedPercent}%` }} /></i><span>{selectedSummary.confirmedPercent}% · 선택 작업 단계 완료 조건 근거만 반영</span></div>}<div className="oc-detail-grid"><section><h4>선택 작업 단계의 남은 완료 조건</h4>{selectedSummary.remaining.length ? <ol>{selectedSummary.remaining.map((gate) => <li key={gate.id}><b>{gate.id}</b><span>{gatePresentation(selected.stage.id, gate.id)}</span></li>)}</ol> : <p>{selectedSummary.checkedCopy}</p>}</section><section><h4>완료 조건 그룹</h4>{selected.stage.gate.groups.length ? <div className="oc-groups">{selected.stage.gate.groups.map((group) => <article key={group.code}><span><strong>{groupPresentation(group.name, group.code)}</strong><small>코드 {group.code}</small></span><b>{group.closed}/{group.total}</b></article>)}</div> : <p>그룹 근거 없음</p>}</section></div></section>
    <details className="oc-technical"><summary><span>기술 증거</span><small>빌드·GitHub·근거 축</small></summary><div className="oc-technical-content"><div className="oc-build" aria-label="제공 중인 고정 빌드"><small>제공 중인 고정 빌드 · {data.build.repository}/{data.build.ref}</small><strong>커밋 {data.build.commit ?? '근거 없음'} · 트리 {data.build.tree ?? '근거 없음'}</strong><span>에셋 {data.build.asset ?? '근거 없음'} · 실시간 현재 작업은 빌드에 고정되지 않음</span></div><section className="oc-github" aria-label="GitHub 전달 근거 연결"><header><div><small>선택 연결 근거 · GitHub</small><strong>{github.adopted ? 'GitHub 연결 채택' : 'GitHub 연결 미채택'}</strong></div><span className={github.state}>{entityStateLabel(github.state)}</span></header><div>{githubEvidenceItems(github).map((item) => <article key={item.label} className={item.state}><small>{item.label}</small><strong>{item.value}</strong><span>{entityStateLabel(item.state)}</span></article>)}</div><p>완료 판정 권한 없음 · GitHub 활동은 완료 조건 충족이나 Cherry 승인이 아닙니다.</p></section><div className="oc-axes" aria-label="선택 작업 단계 근거 축"><Axis label="구현" value={selected.stage.axes.implementation} /><Axis label="테스트" value={selected.stage.axes.test} /><Axis label="증거 확정" value={selected.stage.axes.evidence} /><Axis label="변화 관측" value={project.now.status} /></div></div></details>
  </section>
}
