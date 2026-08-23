import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronRight, RefreshCw } from 'lucide-react'
import { fetchOutcomeDashboard } from '../lib/api'
import { activityLabelKo, axisLabelKo, freshnessLabelKo, gatePresentation, groupPresentation, phasePresentation, projectOutcomePresentation, roleLabel, scopePresentation, sourceLabelKo, sourceStateLabelKo, stagePresentation, stateLabelKo } from './outcomeKorean'

type SourceState = 'valid' | 'stale' | 'unknown' | 'conflict'
type Binding = { role: string; status: string; activity: string | null; observedAt: string | null; freshness: string; historyCount: number; stageId?: string | null }
type Gate = { id: string; title: string; closed: boolean; groupCode: string }
type GateGroup = { code: string; name: string; total: number; closed: number }
export type PackageStage = { id: string; title: string; purpose: string; dependsOn: string[]; gatePurpose: string; sourceState: string; state: string; gate: { gates: Gate[]; groups: GateGroup[]; total: number; closed: number; available: boolean; sourceRef: string | null }; axes: { implementation: string; test: string; evidence: string; independentQa: string; cherryAcceptance: string; release: string } }
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

export function summarizeStage(stage: PackageStage) {
  const remaining = stage.gate.gates.filter((gate) => !gate.closed)
  return { closed: stage.gate.closed, total: stage.gate.total, remaining: remaining.slice(0, 3), confirmedPercent: stage.state === 'complete' && stage.gate.total > 0 ? Math.round(stage.gate.closed / stage.gate.total * 100) : null }
}

export function stageDetailSemantics(stage: PackageStage, dependencyTitles: string[] = []) {
  const summary = summarizeStage(stage)
  const dependency = dependencyTitles.length ? dependencyTitles.join(', ') : '선행 작업 단계'
  const boundaryByState: Record<string, string> = {
    locked: `${dependency}가 완료되지 않아 이 작업 단계는 잠겨 있습니다.`,
    blocked: `${dependency} 이후 원본 완료 조건의 ${stateLabelKo(stage.sourceState)} 차단 경계가 해제되어야 진행할 수 있습니다.`,
    gates_closed_evidence_pending: '체크 항목은 모두 닫혔지만 증거 확정은 아직 대기 중입니다.',
    queued: '선행 작업 단계 완료 후 진입 가능한 대기 상태이며, 아직 완료 증거가 아닙니다.',
    pending: '원본 묶음의 증거 확정이 대기 중이며 체크 수는 완료 판정이 아닙니다.',
    active: '현재 작업 단계가 진행 중이며 체크 수는 완료 판정이 아닙니다.',
    unknown: '원본 묶음에 작업 단계 상태 근거가 없어 완료 여부를 판단하지 않습니다.',
  }
  const complete = stage.state === 'complete'
  const stageTitle = stagePresentation(stage.id)[0]
  const boundaryCopy = complete ? `${stageTitle}의 완료 조건 증거가 원본에서 확정되었습니다.` : boundaryByState[stage.state] ?? `원본 작업 단계 상태는 ${stateLabelKo(stage.state)}이며 완료가 아닙니다.`
  const checkedCopy = complete ? '연결된 완료 조건의 증거가 모두 확정되었습니다.' : summary.total ? `${summary.closed}/${summary.total} 체크 항목 확인 · ${boundaryCopy}` : `완료 조건 원본이 없어 상태를 판단할 수 없습니다. ${boundaryCopy}`
  return { ...summary, countLabel: complete ? '증거 확정 / 전체' : '체크됨 / 전체', boundaryCopy, checkedCopy }
}

export function selectProject(projects: PackageProject[], id: string) { return projects.find((project) => project.project.id === id) ?? projects[0] ?? null }

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
function Axis({ label, value }: { label: string; value: string }) { return <div className="oc-axis"><small>{label}</small><strong>{axisStateLabel(value)}</strong></div> }

export function OutcomeDashboard({ onUnauthorized }: { onUnauthorized: () => void }) {
  const [data, setData] = useState<OutcomeDashboardData | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState('outcome')
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const load = async () => { try { setData(await fetchOutcomeDashboard()); setError(null) } catch (reason) { const message = reason instanceof Error ? reason.message : ''; if (message === 'authentication_required') onUnauthorized(); else setError('대시보드를 읽지 못했습니다.') } }
  useEffect(() => { void load(); const timer = window.setInterval(() => void load(), 10_000); return () => window.clearInterval(timer) }, [])
  const project = useMemo(() => data ? selectProject(data.projects, selectedProjectId) : null, [data, selectedProjectId])
  const current = project ? findStage(project, project.current?.stageId) : null
  const next = project ? findStage(project, project.next?.stageId) : null
  const selected = project ? findStage(project, selectedStageId) ?? current ?? findStage(project, project.phases[0]?.scopes[0]?.stages[0]?.id) : null
  const stages = project?.phases.flatMap((phase) => phase.scopes.flatMap((scope) => scope.stages.map((stage) => ({ phase, scope, stage })))) ?? []
  const dependencyTitles = selected ? selected.stage.dependsOn.map((id) => stages.find((item) => item.stage.id === id) ? stagePresentation(id)[0] : id) : []
  const summary = selected ? stageDetailSemantics(selected.stage, dependencyTitles) : null
  const github = project?.connectors.github
  if (!data || !project || !selected || !summary) return <section className="cn-dashboard cn-loading"><h2>{error ?? 'OUTCOME 원본 묶음을 검증하고 있습니다'}</h2>{error && <button onClick={() => void load()}>다시 확인</button>}</section>
  const phaseText = phasePresentation(selected.phase.id)
  const scopeText = scopePresentation(selected.scope.id)
  const stageText = stagePresentation(selected.stage.id)
  const switchProject = (id: string) => { setSelectedProjectId(id); setSelectedStageId(null) }
  return <section className="cn-dashboard oc-dashboard" data-project-id={project.project.id}>
    <header className="oc-topbar"><nav aria-label="프로젝트 전환">{data.projects.map((item) => <button key={item.project.id} aria-label={`${item.project.name} · ${sourceStateLabel(item.status)}`} aria-current={item.project.id === project.project.id ? 'page' : undefined} onClick={() => switchProject(item.project.id)}><i className={item.status} aria-hidden="true" />{item.project.name}<span className="oc-visually-hidden">{sourceStateLabel(item.status)}</span></button>)}</nav><button className="cn-refresh" onClick={() => void load()} aria-label="원본 묶음 새로고침"><RefreshCw size={16} /></button></header>
    <div className="oc-build" aria-label="제공 중인 고정 빌드"><small>제공 중인 고정 빌드 · {data.build.repository}/{data.build.ref}</small><strong>커밋 {data.build.commit ?? '근거 없음'} · 트리 {data.build.tree ?? '근거 없음'}</strong><span>에셋 {data.build.asset ?? '근거 없음'} · 실시간 현재 작업은 빌드에 고정되지 않음</span></div>
    <div className="oc-project-head"><div><p>프로젝트 식별자 · {project.project.id}</p><h2>{project.project.name}</h2><strong>{projectOutcomePresentation(project.project.id, project.project.outcome)}</strong></div><span className={`oc-source ${project.status}`}>{sourceStateLabel(project.status)}<small>원본 관측 {compactTime(project.sourceFreshness?.observedAt ?? project.observedAt)}</small></span></div>
    {project.status !== 'valid' && <div className={`oc-warning ${project.status}`} role="status"><strong>{sourceStateLabel(project.status)}</strong><span>원본 묶음의 참조와 식별자를 다시 확인하세요.</span></div>}
    <div className="oc-orientation" aria-label="현재 위치와 다음 작업 단계"><div><small>현재 위치</small><strong>{current ? `${phasePresentation(current.phase.id)[0]} → ${scopePresentation(current.scope.id)[0]} → ${stagePresentation(current.stage.id)[0]}` : '위치 근거 없음'}</strong></div><ChevronRight size={16} /><div><small>다음 작업 단계</small><strong>{next ? stagePresentation(next.stage.id)[0] : '다음 단계 근거 없음'}</strong></div></div>
    {github && <section className="oc-github" aria-label="GitHub 전달 근거 연결"><header><div><small>선택 연결 근거 · GitHub</small><strong>{github.adopted ? 'GitHub 연결 채택' : 'GitHub 연결 미채택'}</strong></div><span className={github.state}>{entityStateLabel(github.state)}</span></header><div>{githubEvidenceItems(github).map((item) => <article key={item.label} className={item.state}><small>{item.label}</small><strong>{item.value}</strong><span>{entityStateLabel(item.state)}</span></article>)}</div><p>완료 판정 권한 없음 · GitHub 활동은 완료 조건 충족이나 Cherry 승인이 아닙니다.</p></section>}
    <div className="oc-now"><div><small>현재 작업 · 실시간 · 빌드에 고정되지 않은 구현 역할 연결</small><strong>{activityLabelKo(project.now.activity) ?? `구현 ${entityStateLabel(project.now.status)}`}</strong><span>{sourceLabelKo(project.now.source)} · {compactTime(project.now.observedAt)} · 실시간 현재 작업은 빌드 고정이나 진행률이 아닙니다</span></div><div className="oc-bindings">{project.bindings.map((binding) => <article key={binding.role} className={binding.status}><small>{roleLabel(binding.role)}</small><strong>{entityStateLabel(binding.status)}</strong><span>{freshnessLabelKo(binding.freshness)} · {binding.stageId ?? '작업 단계 연결 없음'} · 이력 {binding.historyCount}</span></article>)}</div></div>
    <div className="oc-axes" aria-label="작업 단계 근거 축"><Axis label="구현" value={selected.stage.axes.implementation} /><Axis label="테스트" value={selected.stage.axes.test} /><Axis label="증거 확정" value={selected.stage.axes.evidence} /><Axis label="변화 관측" value={project.now.status} /></div>
    <div className="oc-main">
      <section className="oc-funnel"><header><p>프로젝트 → 큰 단계 → 범위 → 작업 단계 → 완료 조건</p><h3>목적과 다음 경계</h3></header><div className="oc-purpose-flow"><article><small>큰 단계 목적</small><strong>{phaseText[0]}</strong><p>{phaseText[1]}</p></article><ChevronRight size={16} /><article><small>범위 목적</small><strong>{scopeText[0]}</strong><p>{scopeText[1]}</p></article><ChevronRight size={16} /><article><small>작업 단계 목적</small><strong>{stageText[0]}</strong><p>{stageText[1]}</p></article><ChevronRight size={16} /><article className="gate"><small>완료 조건 목적 · 작업 단계 하위 체크리스트</small><strong>{stageText[0]}의 완료 조건 목록</strong><p>{summary.total ? `${summary.closed}/${summary.total} 체크됨 · ${summary.total - summary.closed}개 미충족` : '완료 조건 근거 없음 · 비율 산출 안 함'}</p></article></div><div className="oc-next-condition"><small>무엇을 달성해야 다음으로 가는가</small><strong>{summary.boundaryCopy}</strong></div></section>
      <aside className="oc-stage-list"><header><small>작업 단계</small><strong>원본 정의 {stages.length}개</strong></header>{stages.map((item) => <button key={item.stage.id} data-stage-id={item.stage.id} data-stage-state={item.stage.state} className={item.stage.id === selected.stage.id ? 'active' : ''} aria-pressed={item.stage.id === selected.stage.id} aria-current={item.stage.id === project.current?.stageId ? 'step' : undefined} onClick={() => setSelectedStageId(item.stage.id)}><i className={item.stage.state} aria-hidden="true">{item.stage.state === 'complete' && <Check size={11} />}</i><span><small>{scopePresentation(item.scope.id)[0]}</small><strong>{stagePresentation(item.stage.id)[0]}</strong></span><em>{entityStateLabel(item.stage.state)}</em></button>)}</aside>
    </div>
    <section className="oc-detail" data-stage-state={selected.stage.state} aria-live="polite"><header><div><small>작업 단계 상세 · {selected.stage.id}</small><h3>{stageText[0]}</h3><p>{stageText[1]}</p></div><div><strong>{summary.total ? `${summary.closed}/${summary.total}` : '근거 없음'}</strong><small>{summary.countLabel}</small></div></header><p className="oc-detail-boundary">{summary.boundaryCopy}</p>{summary.confirmedPercent !== null && <div className="oc-confirmed"><i aria-label={`완료 조건 증거 확정 ${summary.confirmedPercent}%`}><em style={{ width: `${summary.confirmedPercent}%` }} /></i><span>{summary.confirmedPercent}% · 완료 조건 근거만 반영</span></div>}<div className="oc-detail-grid"><section><h4>남은 핵심 완료 조건</h4>{summary.remaining.length ? <ol>{summary.remaining.map((gate) => <li key={gate.id}><b>{gate.id}</b><span>{gatePresentation(selected.stage.id, gate.id)}</span></li>)}</ol> : <p>{summary.checkedCopy}</p>}</section><section><h4>완료 조건 그룹</h4>{selected.stage.gate.groups.length ? <div className="oc-groups">{selected.stage.gate.groups.map((group) => <article key={group.code}><span><strong>{groupPresentation(group.name, group.code)}</strong><small>코드 {group.code}</small></span><b>{group.closed}/{group.total}</b></article>)}</div> : <p>그룹 근거 없음</p>}</section></div></section>
  </section>
}
