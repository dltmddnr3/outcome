import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronDown, ChevronRight, RefreshCw, Shield } from 'lucide-react'
import { fetchCherryNoteDashboard } from '../lib/api'

export type DashboardStatus = 'complete' | 'active' | 'queued' | 'stale' | 'unknown' | 'locked' | 'pending'
type GateGroupSummary = { id: string; label: string; total: number }
export type CherryNoteDashboardData = {
  schemaVersion: 1
  observedAt: string
  collector: { state: 'online' | 'stale' | 'offline'; observedAt: string | null; staleAfterSeconds: number }
  project: { name: string; outcome: string; phase: string; currentStage: number; nextStage: string; closureState: string }
  live: { state: 'active' | 'complete' | 'stale' | 'unknown'; role: string; activity: string | null; observedAt: string | null; elapsedSeconds: number | null; processLabel: string; pulse: { passed: number | null; failed: number; delta: number | null; currentTest: string | null } }
  progress: { total: number | null; implemented: number | null; tested: number | null; evidenceClosed: number | null; percentages: { implemented: number | null; tested: number | null; evidenceClosed: number | null } }
  hierarchy: { phases: Array<{ id: string; label: string; status: DashboardStatus; scopes?: Array<{ id: string; label: string; status: DashboardStatus; stages: Array<{ stage: number; label: string; kind: string; status: DashboardStatus }>; gateGroups?: GateGroupSummary[] }> }>; gateGroups: Array<{ id: string; label: string; total: number; gates: Array<{ id: string; title: string; checked: boolean }> }> }
  outcomes: { functional: string; uiux: string; realUse: string; final: string; externalReady: boolean }
  guidance: Array<{ title: string; body: string }>
}

export const summarizeGateGroups = (groups: GateGroupSummary[]) => ({ groups: groups.length, checks: groups.reduce((sum, group) => sum + group.total, 0) })
export const dashboardJourneyLabels = { sequence: '진행 순서', current: '현재 위치', next: '다음 단계', acceptance: '이 단계의 완료 조건' } as const
const formatTime = (value: string | null) => value ? new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(value)) : '근거 없음'
const formatDuration = (seconds: number | null) => seconds === null ? '측정 대기' : seconds < 60 ? `${seconds}초째` : `${Math.floor(seconds / 60)}분째`
function StatusNode({ status }: { status: DashboardStatus }) { return <i className={`cn-status-node ${status}`} aria-label={status}>{status === 'complete' && <Check size={10} />}</i> }
function ProgressLayer({ label, value, total, percent, tone }: { label: string; value: number | null; total: number | null; percent: number | null; tone: string }) { return <article className={`cn-progress-layer ${tone}`}><div><span>{label}</span><strong>{value ?? 'unknown'}{total !== null && <small>/{total}</small>}</strong></div>{percent !== null ? <><i aria-label={`${label} ${percent}%`}><em style={{ width: `${percent}%` }} /></i><b>{percent}%</b></> : <b>근거 없음</b>}</article> }

export function CherryNoteDashboard({ onUnauthorized }: { onUnauthorized: () => void }) {
  const [dashboard, setDashboard] = useState<CherryNoteDashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState('hardening')
  const [gateGroup, setGateGroup] = useState<string | null>(null)
  const load = async () => { try { setDashboard(await fetchCherryNoteDashboard()); setError(null) } catch (reason) { const message = reason instanceof Error ? reason.message : '대시보드를 읽지 못했습니다.'; if (message === 'authentication_required') onUnauthorized(); else setError(message) } }
  useEffect(() => { void load(); const timer = window.setInterval(() => void load(), 10_000); return () => window.clearInterval(timer) }, [])
  const phase = dashboard?.hierarchy.phases[0]
  const scopes = phase?.scopes ?? []
  const activeIndex = Math.max(0, scopes.findIndex((scope) => scope.status === 'active'))
  const selectedScope = scopes.find((scope) => scope.id === expanded) ?? scopes[activeIndex]
  const selectedGates = useMemo(() => dashboard?.hierarchy.gateGroups.find((group) => group.id === gateGroup), [dashboard, gateGroup])
  if (!dashboard) return <section className="cn-dashboard cn-loading"><h2>{error ?? 'Mac Mini collector에 연결 중입니다'}</h2>{error && <button onClick={() => void load()}>다시 확인</button>}</section>
  const collectorLabel = dashboard.collector.state === 'online' ? 'COLLECTOR ONLINE' : dashboard.collector.state === 'stale' ? 'COLLECTOR STALE' : 'COLLECTOR OFFLINE'
  return <section className="cn-dashboard">
    <header className="cn-dashboard-header"><div className="cn-project-identity"><span>C.</span><div><p>LIVE OUTCOME MAP · READ ONLY</p><h2>{dashboard.project.name}</h2><small>{dashboard.project.phase} · Stage {dashboard.project.currentStage}</small></div></div><div className={`cn-live-badge ${dashboard.collector.state}`}><i /><div><strong>{collectorLabel}</strong><small>{formatTime(dashboard.collector.observedAt)}</small></div></div><button className="cn-refresh" onClick={() => void load()} aria-label="진행상황 새로고침"><RefreshCw size={16} /></button></header>
    {dashboard.collector.state !== 'online' && <div className="cn-collector-warning" role="status"><strong>Mac Mini 근거가 {dashboard.collector.state === 'offline' ? '연결되지 않았습니다' : '오래되었습니다'}.</strong><span>마지막 성공을 현재 상태로 간주하지 않습니다.</span></div>}
    <div className="cn-dashboard-hero"><div><span>OUTCOME</span><strong>{dashboard.project.outcome}</strong><small>기능 + UI/UX + 실제 사용 + 독립 QA/감사 + Cherry 수용</small></div><div><small>NOW · {dashboard.live.role}</small><strong>{dashboard.live.activity ?? '관찰된 활동 근거 없음'}</strong><p>{dashboard.live.processLabel} · {formatDuration(dashboard.live.elapsedSeconds)}</p></div></div>
    <div className="cn-layer-grid"><ProgressLayer label="구현" {...dashboard.progress} value={dashboard.progress.implemented} percent={dashboard.progress.percentages.implemented} tone="implemented" /><ProgressLayer label="테스트" {...dashboard.progress} value={dashboard.progress.tested} percent={dashboard.progress.percentages.tested} tone="tested" /><ProgressLayer label="증거 확정" {...dashboard.progress} value={dashboard.progress.evidenceClosed} percent={dashboard.progress.percentages.evidenceClosed} tone="evidence" /></div>
    <div className="cn-flow"><div className="cn-flow-head"><div><p>{dashboardJourneyLabels.sequence} · PROJECT → PHASE → SCOPE → STAGE</p><h3>Phase 1 종료 경로</h3><small>Gate는 순서가 아니라 선택한 Stage의 완료 조건입니다.</small></div><span>Scope {activeIndex + 1} / {scopes.length}</span></div>
      <div className="cn-journey-orientation"><div><small>{dashboardJourneyLabels.current}</small><strong>Phase 1 · {scopes[activeIndex]?.label} · Stage {dashboard.project.currentStage}</strong></div><ChevronRight size={16} /><div><small>{dashboardJourneyLabels.next}</small><strong>{scopes[activeIndex + 1]?.label ?? dashboard.project.nextStage}</strong></div></div>
      <ol>{scopes.map((scope, index) => <li key={scope.id} className={scope.status}><button aria-current={scope.status === 'active' ? 'step' : undefined} aria-expanded={selectedScope?.id === scope.id} aria-controls="cn-selected-scope-detail" onClick={() => { setExpanded(scope.id); setGateGroup(null) }}><StatusNode status={scope.status} /><span><small>SCOPE {index + 1}</small><strong>{scope.label}</strong></span><ChevronDown size={15} /></button></li>)}</ol>
      {selectedScope && <section id="cn-selected-scope-detail" className="cn-scope-detail"><header><small>선택한 진행 구간</small><strong>{selectedScope.label}</strong></header><div className="cn-stage-strip">{selectedScope.stages.map((stage) => <span key={`${stage.stage}-${stage.kind}`}><StatusNode status={stage.status} /><b>{stage.label}</b><small>{stage.kind}</small></span>)}</div>{selectedScope.gateGroups && (() => { const totals = summarizeGateGroups(selectedScope.gateGroups); return <div className="cn-acceptance-block"><div className="cn-acceptance-head"><div><small>{dashboardJourneyLabels.acceptance}</small><strong>Stage {dashboard.project.currentStage} · {totals.groups}개 그룹 · {totals.checks}개 체크</strong></div><p>다음 순서가 아니라 완료 전 확인할 체크리스트입니다.</p></div><div className="cn-gate-groups">{selectedScope.gateGroups.map((group) => <button key={group.id} aria-expanded={gateGroup === group.id} aria-controls="cn-gate-detail" onClick={() => setGateGroup(gateGroup === group.id ? null : group.id)}><span><strong>{group.label}</strong><small>Gate source heading</small></span><em>{group.total}개 체크 · 코드 {group.id}</em></button>)}</div>{selectedGates && <div id="cn-gate-detail" className="cn-gate-drawer"><header><strong>{selectedGates.label} · {selectedGates.total}개 체크</strong><button aria-label="Gate 상세 닫기" onClick={() => setGateGroup(null)}>×</button></header><ol>{selectedGates.gates.map((gate) => <li key={gate.id}><StatusNode status={gate.checked ? 'complete' : 'pending'} /><b>{gate.id}</b><span>{gate.title}</span></li>)}</ol></div>}</div> })()}</section>}
      <div className="cn-phase-two"><StatusNode status="locked" /><span><small>PHASE 2</small><strong>새 Outcome Contract 후 재진입</strong></span><Shield size={15} /></div>
    </div>
    <div className="cn-bottom-grid"><section><header><span>SCORECARD</span><strong>기능만으로 완료하지 않음</strong></header><p>기능 <b>{dashboard.outcomes.functional}</b></p><p>UI/UX <b>{dashboard.outcomes.uiux}</b></p><p>실사용 <b>{dashboard.outcomes.realUse}</b></p><p>최종 <b>{dashboard.outcomes.final}</b></p></section><section><header><span>SCOPE GUIDE</span><strong>어디까지 포함할지</strong></header>{dashboard.guidance.map((item) => <article key={item.title}><b>{item.title}</b><p>{item.body}</p></article>)}</section></div>
  </section>
}
