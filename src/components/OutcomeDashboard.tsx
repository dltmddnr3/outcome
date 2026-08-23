import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronRight, RefreshCw } from 'lucide-react'
import { fetchOutcomeDashboard } from '../lib/api'

type SourceState = 'valid' | 'stale' | 'unknown' | 'conflict'
type Binding = { role: string; status: string; activity: string | null; observedAt: string | null; freshness: string; historyCount: number }
type Gate = { id: string; title: string; closed: boolean; groupCode: string }
type GateGroup = { code: string; name: string; total: number; closed: number }
export type PackageStage = { id: string; title: string; purpose: string; dependsOn: string[]; gatePurpose: string; sourceState: string; state: string; gate: { gates: Gate[]; groups: GateGroup[]; total: number; closed: number; available: boolean; sourceRef: string | null }; axes: { implementation: string; test: string; evidence: string; independentQa: string; cherryAcceptance: string; release: string } }
type Scope = { id: string; title: string; purpose: string; stages: PackageStage[] }
type Phase = { id: string; title: string; purpose: string; completion: string | null; scopes: Scope[] }
export type PackageProject = { status: SourceState; errors: string[]; observedAt: string | null; project: { id: string; name: string; outcome: string; acceptanceAuthority: string }; phases: Phase[]; current: { phaseId: string; scopeId: string; stageId: string } | null; next: { phaseId: string; scopeId: string; stageId: string } | null; bindings: Binding[]; now: { status: string; activity: string | null; observedAt: string | null; source: string }; progress: { available: false; reason: string } }
export type OutcomeDashboardData = { schemaVersion: 2; observedAt: string; projects: PackageProject[] }

const roleNames: Record<string, string> = { planner: 'Planner', builder: 'Builder', ux_product_qa: 'UX & Product QA', release_audit: 'Release Audit' }
const stateNames: Record<string, string> = { valid: 'SOURCE VALID', stale: 'SOURCE STALE', unknown: 'SOURCE UNKNOWN', conflict: 'SOURCE CONFLICT', active: '활성', idle: '대기', terminal: '종료', unbound: '미연결', replaced: '교체됨', blocked: '차단', pending: '대기', complete: '확정' }
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

function Axis({ label, value }: { label: string; value: string }) { return <div className="oc-axis"><small>{label}</small><strong>{value.replaceAll('_', ' ')}</strong></div> }

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
  const stages = project?.phases.flatMap((phase) => phase.scopes.flatMap((scope) => scope.stages.map((stage) => ({ phase, scope, stage })))) ?? []
  if (!data || !project || !selected || !summary) return <section className="cn-dashboard cn-loading"><h2>{error ?? 'OUTCOME Package를 검증하고 있습니다'}</h2>{error && <button onClick={() => void load()}>다시 확인</button>}</section>
  const switchProject = (id: string) => { setSelectedProjectId(id); setSelectedStageId(null) }
  return <section className="cn-dashboard oc-dashboard" data-project-id={project.project.id}>
    <header className="oc-topbar"><nav aria-label="프로젝트 전환">{data.projects.map((item) => <button key={item.project.id} aria-current={item.project.id === project.project.id ? 'page' : undefined} onClick={() => switchProject(item.project.id)}><i className={item.status} />{item.project.name}</button>)}</nav><button className="cn-refresh" onClick={() => void load()} aria-label="Package truth 새로고침"><RefreshCw size={16} /></button></header>
    <div className="oc-project-head"><div><p>PROJECT · {project.project.id}</p><h2>{project.project.name}</h2><strong>{project.project.outcome}</strong></div><span className={`oc-source ${project.status}`}>{stateNames[project.status]}<small>{compactTime(project.observedAt)}</small></span></div>
    {project.status !== 'valid' && <div className={`oc-warning ${project.status}`} role="status"><strong>{stateNames[project.status]}</strong><span>{project.errors.length ? project.errors.join(' · ') : 'Package source freshness를 다시 확인하세요.'}</span></div>}
    <div className="oc-orientation" aria-label="현재 위치와 다음 Stage"><div><small>현재 위치</small><strong>{current ? `${current.phase.title} → ${current.scope.title} → ${current.stage.title}` : 'unknown'}</strong></div><ChevronRight size={16} /><div><small>다음 Stage</small><strong>{next?.stage.title ?? 'source evidence 없음'}</strong></div></div>
    <div className="oc-now"><div><small>NOW · CURRENT BUILDER</small><strong>{project.now.activity ?? `Builder ${stateNames[project.now.status] ?? project.now.status}`}</strong><span>{project.now.source} · {compactTime(project.now.observedAt)} · 활동량은 진행률이 아닙니다</span></div><div className="oc-bindings">{project.bindings.map((binding) => <article key={binding.role} className={binding.status}><small>{roleNames[binding.role]}</small><strong>{stateNames[binding.status] ?? binding.status}</strong><span>{binding.freshness} · history {binding.historyCount}</span></article>)}</div></div>
    <div className="oc-axes" aria-label="Stage evidence axes"><Axis label="구현" value={selected.stage.axes.implementation} /><Axis label="테스트" value={selected.stage.axes.test} /><Axis label="증거 확정" value={selected.stage.axes.evidence} /><Axis label="변화 관측" value={project.now.status} /></div>
    <div className="oc-main">
      <section className="oc-funnel"><header><p>PROJECT → PHASE → SCOPE → STAGE</p><h3>목적과 다음 경계</h3></header><div className="oc-purpose-flow"><article><small>PHASE 목적</small><strong>{selected.phase.title}</strong><p>{selected.phase.purpose}</p></article><ChevronRight size={16} /><article><small>SCOPE 목적</small><strong>{selected.scope.title}</strong><p>{selected.scope.purpose}</p></article><ChevronRight size={16} /><article><small>STAGE 목적</small><strong>{selected.stage.title}</strong><p>{selected.stage.purpose}</p></article><ChevronRight size={16} /><article className="gate"><small>GATE 목적 · STAGE 하위 CHECKLIST</small><strong>{selected.stage.gatePurpose}</strong><p>{summary.total ? `${summary.closed}/${summary.total} confirmed · ${summary.total - summary.closed} remaining` : 'Gate evidence unavailable · percentage 없음'}</p></article></div><div className="oc-next-condition"><small>무엇을 달성해야 다음으로 가는가</small><strong>{summary.total ? `${selected.stage.title} Gate ${summary.total}개 중 남은 ${summary.total - summary.closed}개를 evidence로 닫아야 합니다.` : '참조 Gate source가 생기고 검증될 때까지 이동을 추정하지 않습니다.'}</strong></div></section>
      <aside className="oc-stage-list"><header><small>STAGES</small><strong>{stages.length} source-defined</strong></header>{stages.map((item) => <button key={item.stage.id} className={item.stage.id === selected.stage.id ? 'active' : ''} aria-current={item.stage.id === project.current?.stageId ? 'step' : undefined} onClick={() => setSelectedStageId(item.stage.id)}><i className={item.stage.state}>{item.stage.state === 'complete' && <Check size={9} />}</i><span><small>{item.scope.title}</small><strong>{item.stage.title}</strong></span><em>{stateNames[item.stage.state] ?? item.stage.state}</em></button>)}</aside>
    </div>
    <section className="oc-detail" aria-live="polite"><header><div><small>STAGE DETAIL · {selected.stage.id}</small><h3>{selected.stage.title}</h3><p>{selected.stage.purpose}</p></div><div><strong>{summary.total ? `${summary.closed}/${summary.total}` : 'unknown'}</strong><small>evidence-closed / total</small></div></header>{summary.confirmedPercent !== null && <div className="oc-confirmed"><i aria-label={`Gate confirmed completion ${summary.confirmedPercent}%`}><em style={{ width: `${summary.confirmedPercent}%` }} /></i><span>{summary.confirmedPercent}% · Gate evidence only</span></div>}<div className="oc-detail-grid"><section><h4>남은 핵심 Gate</h4>{summary.remaining.length ? <ol>{summary.remaining.map((gate) => <li key={gate.id}><b>{gate.id}</b><span>{gate.title}</span></li>)}</ol> : <p>{summary.total ? '연결된 Gate가 모두 evidence-closed입니다.' : 'Gate source가 없어 unknown입니다.'}</p>}</section><section><h4>Gate 그룹</h4>{selected.stage.gate.groups.length ? <div className="oc-groups">{selected.stage.gate.groups.map((group) => <article key={group.code}><span><strong>{group.name}</strong><small>코드 {group.code}</small></span><b>{group.closed}/{group.total}</b></article>)}</div> : <p>그룹 근거 없음</p>}</section></div></section>
  </section>
}
