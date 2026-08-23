import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronRight, RefreshCw } from 'lucide-react'
import { fetchOutcomeDashboard } from '../lib/api'

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

const roleNames: Record<string, string> = { planner: 'Planner', builder: 'Builder', ux_product_qa: 'UX & Product QA', release_audit: 'Release Audit' }
const sourceStateNames: Record<string, string> = { valid: 'PACKAGE SOURCE VALID', stale: 'PACKAGE SOURCE OBSERVATION STALE', unknown: 'PACKAGE SOURCE UNKNOWN', conflict: 'PACKAGE SOURCE CONFLICT' }
const entityStateNames: Record<string, string> = { active: '활성', idle: '대기', terminal: '종료', unbound: '미연결', connected: '연결됨', missing: '미채택', not_published: '미게시', replaced: '교체됨', blocked: '차단됨', pending: '증거 대기', complete: 'Gate 완료', queued: '진입 대기', locked: '선행 Gate 잠김', unknown: '근거 없음', stale: 'binding 오래됨', available: '로컬 있음', ahead: '로컬 앞섬', behind: '로컬 뒤처짐', diverged: '분기됨', synced: '동기화', evidence_closed: '증거 확정', partially_evidenced: '일부 증거', not_sourced: '해당 축 근거 없음' }
const compactTime = (value: string | null) => value ? new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : '근거 없음'

export function findStage(project: PackageProject, stageId: string | null | undefined) {
  for (const phase of project.phases) for (const scope of phase.scopes) for (const stage of scope.stages) if (stage.id === stageId) return { phase, scope, stage }
  return null
}

export function summarizeStage(stage: PackageStage) {
  const remaining = stage.gate.gates.filter((gate) => !gate.closed)
  return { closed: stage.gate.closed, total: stage.gate.total, remaining: remaining.slice(0, 3), confirmedPercent: stage.gate.total > 0 ? Math.round(stage.gate.closed / stage.gate.total * 100) : null }
}

export function selectProject(projects: PackageProject[], id: string) { return projects.find((project) => project.project.id === id) ?? projects[0] ?? null }

export function githubEvidenceItems(connector: GithubConnector) {
  const distance = connector.localCandidate.ahead == null || connector.localCandidate.behind == null ? connector.localCandidate.sync : `${connector.localCandidate.ahead} ahead · ${connector.localCandidate.behind} behind`
  return [
    { label: 'LOCAL CANDIDATE', state: connector.localCandidate.state, value: connector.localCandidate.branch ? `${connector.localCandidate.branch} · ${distance}` : 'local evidence unknown' },
    { label: 'GITHUB PUBLISHED', state: connector.published.state, value: connector.published.repository ? `${connector.published.repository} · ${connector.published.detail === 'empty_remote' ? 'empty remote' : connector.published.ref}` : `${connector.defaultBranch ?? 'branch unknown'} · repository unbound` },
    { label: 'CHECKS', state: connector.checks.state, value: 'GitHub check evidence unknown' },
    { label: 'RELEASE', state: connector.release.state, value: 'GitHub release evidence unknown' },
  ]
}

export const entityStateLabel = (value: string) => entityStateNames[value] ?? value.replaceAll('_', ' ')
export const sourceStateLabel = (value: string) => sourceStateNames[value] ?? `PACKAGE SOURCE ${value.replaceAll('_', ' ').toUpperCase()}`
function Axis({ label, value }: { label: string; value: string }) { return <div className="oc-axis"><small>{label}</small><strong>{entityStateLabel(value)}</strong></div> }

export function OutcomeDashboard({ onUnauthorized }: { onUnauthorized: () => void }) {
  const [data, setData] = useState<OutcomeDashboardData | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState('outcome')
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const load = async () => { try { setData(await fetchOutcomeDashboard()); setError(null) } catch (reason) { const message = reason instanceof Error ? reason.message : '대시보드를 읽지 못했습니다.'; if (message === 'authentication_required') onUnauthorized(); else setError(message) } }
  useEffect(() => { void load(); const timer = window.setInterval(() => void load(), 10_000); return () => window.clearInterval(timer) }, [])
  const project = useMemo(() => data ? selectProject(data.projects, selectedProjectId) : null, [data, selectedProjectId])
  const current = project ? findStage(project, project.current?.stageId) : null
  const next = project ? findStage(project, project.next?.stageId) : null
  const selected = project ? findStage(project, selectedStageId) ?? current ?? findStage(project, project.phases[0]?.scopes[0]?.stages[0]?.id) : null
  const summary = selected ? summarizeStage(selected.stage) : null
  const github = project?.connectors.github
  const stages = project?.phases.flatMap((phase) => phase.scopes.flatMap((scope) => scope.stages.map((stage) => ({ phase, scope, stage })))) ?? []
  if (!data || !project || !selected || !summary) return <section className="cn-dashboard cn-loading"><h2>{error ?? 'OUTCOME Package를 검증하고 있습니다'}</h2>{error && <button onClick={() => void load()}>다시 확인</button>}</section>
  const switchProject = (id: string) => { setSelectedProjectId(id); setSelectedStageId(null) }
  return <section className="cn-dashboard oc-dashboard" data-project-id={project.project.id}>
    <header className="oc-topbar"><nav aria-label="프로젝트 전환">{data.projects.map((item) => <button key={item.project.id} aria-label={`${item.project.name} · ${sourceStateLabel(item.status)}`} aria-current={item.project.id === project.project.id ? 'page' : undefined} onClick={() => switchProject(item.project.id)}><i className={item.status} aria-hidden="true" />{item.project.name}<span className="oc-visually-hidden">{sourceStateLabel(item.status)}</span></button>)}</nav><button className="cn-refresh" onClick={() => void load()} aria-label="Package truth 새로고침"><RefreshCw size={16} /></button></header>
    <div className="oc-build" aria-label="서빙 중인 immutable build"><small>SERVED BUILD · PINNED · {data.build.repository}/{data.build.ref}</small><strong>commit {data.build.commit ?? 'unknown'} · tree {data.build.tree ?? 'unknown'}</strong><span>asset {data.build.asset ?? 'unknown'} · runtime NOW is live/unpinned</span></div>
    <div className="oc-project-head"><div><p>PROJECT · {project.project.id}</p><h2>{project.project.name}</h2><strong>{project.project.outcome}</strong></div><span className={`oc-source ${project.status}`}>{sourceStateLabel(project.status)}<small>source observed {compactTime(project.sourceFreshness?.observedAt ?? project.observedAt)}</small></span></div>
    {project.status !== 'valid' && <div className={`oc-warning ${project.status}`} role="status"><strong>{sourceStateLabel(project.status)}</strong><span>{project.errors.length ? project.errors.join(' · ') : 'Package source observation을 다시 확인하세요.'}</span></div>}
    <div className="oc-orientation" aria-label="현재 위치와 다음 Stage"><div><small>현재 위치</small><strong>{current ? `${current.phase.title} → ${current.scope.title} → ${current.stage.title}` : 'unknown'}</strong></div><ChevronRight size={16} /><div><small>다음 Stage</small><strong>{next?.stage.title ?? 'source evidence 없음'}</strong></div></div>
    {github && <section className="oc-github" aria-label="GitHub delivery evidence connector"><header><div><small>OPTIONAL SOURCE CONNECTOR · GITHUB</small><strong>{github.adopted ? 'GitHub adopted' : 'GitHub not adopted'}</strong></div><span className={github.state}>{entityStateLabel(github.state)}</span></header><div>{githubEvidenceItems(github).map((item) => <article key={item.label} className={item.state}><small>{item.label}</small><strong>{item.value}</strong><span>{entityStateLabel(item.state)}</span></article>)}</div><p>completion_authority=false · GitHub activity는 Gate closure 또는 Cherry acceptance가 아닙니다.</p></section>}
    <div className="oc-now"><div><small>NOW · LIVE / UNPINNED BUILDER BINDING</small><strong>{project.now.activity ?? `Builder ${entityStateLabel(project.now.status)}`}</strong><span>{project.now.source} · {compactTime(project.now.observedAt)} · runtime NOW는 build pin과 진행률이 아닙니다</span></div><div className="oc-bindings">{project.bindings.map((binding) => <article key={binding.role} className={binding.status}><small>{roleNames[binding.role]}</small><strong>{entityStateLabel(binding.status)}</strong><span>{binding.freshness} · {binding.stageId ?? 'Stage binding 없음'} · history {binding.historyCount}</span></article>)}</div></div>
    <div className="oc-axes" aria-label="Stage evidence axes"><Axis label="구현" value={selected.stage.axes.implementation} /><Axis label="테스트" value={selected.stage.axes.test} /><Axis label="증거 확정" value={selected.stage.axes.evidence} /><Axis label="변화 관측" value={project.now.status} /></div>
    <div className="oc-main">
      <section className="oc-funnel"><header><p>PROJECT → PHASE → SCOPE → STAGE</p><h3>목적과 다음 경계</h3></header><div className="oc-purpose-flow"><article><small>PHASE 목적</small><strong>{selected.phase.title}</strong><p>{selected.phase.purpose}</p></article><ChevronRight size={16} /><article><small>SCOPE 목적</small><strong>{selected.scope.title}</strong><p>{selected.scope.purpose}</p></article><ChevronRight size={16} /><article><small>STAGE 목적</small><strong>{selected.stage.title}</strong><p>{selected.stage.purpose}</p></article><ChevronRight size={16} /><article className="gate"><small>GATE 목적 · STAGE 하위 CHECKLIST</small><strong>{selected.stage.gatePurpose}</strong><p>{summary.total ? `${summary.closed}/${summary.total} confirmed · ${summary.total - summary.closed} remaining` : 'Gate evidence unavailable · percentage 없음'}</p></article></div><div className="oc-next-condition"><small>무엇을 달성해야 다음으로 가는가</small><strong>{summary.total ? `${selected.stage.title} Gate ${summary.total}개 중 남은 ${summary.total - summary.closed}개를 evidence로 닫아야 합니다.` : '참조 Gate source가 생기고 검증될 때까지 이동을 추정하지 않습니다.'}</strong></div></section>
      <aside className="oc-stage-list"><header><small>STAGES</small><strong>{stages.length} source-defined</strong></header>{stages.map((item) => <button key={item.stage.id} className={item.stage.id === selected.stage.id ? 'active' : ''} aria-pressed={item.stage.id === selected.stage.id} aria-current={item.stage.id === project.current?.stageId ? 'step' : undefined} onClick={() => setSelectedStageId(item.stage.id)}><i className={item.stage.state} aria-hidden="true">{item.stage.state === 'complete' && <Check size={11} />}</i><span><small>{item.scope.title}</small><strong>{item.stage.title}</strong></span><em>{entityStateLabel(item.stage.state)}</em></button>)}</aside>
    </div>
    <section className="oc-detail" aria-live="polite"><header><div><small>STAGE DETAIL · {selected.stage.id}</small><h3>{selected.stage.title}</h3><p>{selected.stage.purpose}</p></div><div><strong>{summary.total ? `${summary.closed}/${summary.total}` : 'unknown'}</strong><small>evidence-closed / total</small></div></header>{summary.confirmedPercent !== null && <div className="oc-confirmed"><i aria-label={`Gate confirmed completion ${summary.confirmedPercent}%`}><em style={{ width: `${summary.confirmedPercent}%` }} /></i><span>{summary.confirmedPercent}% · Gate evidence only</span></div>}<div className="oc-detail-grid"><section><h4>남은 핵심 Gate</h4>{summary.remaining.length ? <ol>{summary.remaining.map((gate) => <li key={gate.id}><b>{gate.id}</b><span>{gate.title}</span></li>)}</ol> : <p>{summary.total ? '연결된 Gate가 모두 evidence-closed입니다.' : 'Gate source가 없어 unknown입니다.'}</p>}</section><section><h4>Gate 그룹</h4>{selected.stage.gate.groups.length ? <div className="oc-groups">{selected.stage.gate.groups.map((group) => <article key={group.code}><span><strong>{group.name}</strong><small>코드 {group.code}</small></span><b>{group.closed}/{group.total}</b></article>)}</div> : <p>그룹 근거 없음</p>}</section></div></section>
  </section>
}
