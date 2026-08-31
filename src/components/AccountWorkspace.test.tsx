import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AccountWorkspace, accountWorkspaceStateCopy } from './AccountWorkspace'
import deploymentFixture from '../../snapshot/outcome-package-source.json'
import type { OutcomeDashboardData } from './OutcomeDashboard'

const render = (state: keyof typeof accountWorkspaceStateCopy) => renderToStaticMarkup(<AccountWorkspace state={state} />)
const modelV2 = (id: string, label: string) => ({ schemaVersion: 1 as const, modelVersion: 2 as const, project: { id, label }, destination: { id: `${id}-destination`, label: `${label} Destination` }, remainingAcceptanceGap: { remaining: 2, total: 5 }, now: { observedAt: '2026-08-31T08:00:00.000Z', state: 'ready' as const }, readyBoundary: [`${label} next boundary`], nextAction: `${label} next action`, cherryAction: `${label} Cherry action`, state: 'ready' as const, events: [] })
const readyWorkspace = { projects: [
  { project: { id: 'cherry-note', name: 'Cherry Note' }, phases: [{ id: 'cherry-phase', title: '체리 단계', scopes: [{ id: 'cherry-scope', title: '체리 범위', stages: [{ id: 'cherry-current', title: '체리 현재', gate: { gates: [{ id: 'C1', title: '체리 완료 조건', closed: false }] } }, { id: 'cherry-selected', title: '체리 선택', gate: { gates: [{ id: 'C2', title: '선택 완료 조건', closed: true }] } }] }] }], current: { phaseId: 'cherry-phase', scopeId: 'cherry-scope', stageId: 'cherry-current' }, modelV2: modelV2('cherry-note', 'Cherry Note') },
  { project: { id: 'outcome', name: 'OUTCOME' }, phases: [{ id: 'outcome-phase', title: '아웃컴 단계', scopes: [{ id: 'outcome-scope', title: '아웃컴 범위', stages: [{ id: 'outcome-current', title: '아웃컴 현재', gate: { gates: [{ id: 'O1', title: '아웃컴 완료 조건', closed: false }] } }] }] }], current: { phaseId: 'outcome-phase', scopeId: 'outcome-scope', stageId: 'outcome-current' }, modelV2: modelV2('outcome', 'OUTCOME') },
] }

describe('account workspace presentation contract', () => {
  it('renders every safe private state with Korean primary copy and a private/read-only distinction', () => {
    for (const state of ['login', 'empty', 'stale', 'conflict', 'unavailable', 'session_expired', 'access_denied', 'safe_degraded'] as const) {
      const html = render(state)
      expect(html).toContain(accountWorkspaceStateCopy[state].title)
      expect(html).toContain('Cherry 전용 비공개 워크스페이스')
      expect(html).toContain('읽기 전용')
      expect(html).toContain('completionAuthority')
    }
  })

  it('로그인 중에는 내부 권한·서버 진단 대신 진행 상태만 표시한다', () => {
    const html = render('loading')
    expect(html).toContain('account-workspace--loading')
    expect(html).toContain('로그인 중')
    expect(html).toContain('잠시만 기다려 주세요')
    for (const hidden of ['Cherry 전용 비공개 워크스페이스', '권한 확인 중', '서버에서', 'completionAuthority=false']) expect(html).not.toContain(hidden)
  })

  it('shows Google primary, email-code fallback and Apple linked-only without self-signup', () => {
    const html = render('login')
    expect(html).toContain('Google로 계속')
    expect(html).toContain('이메일 인증 코드')
    expect(html).toContain('account-workspace__separator')
    expect(html).toContain('account-workspace__fallback')
    expect(html).toContain('Apple은 로그인 후 연결')
    expect(html).not.toContain('회원가입')
    expect(html).not.toContain('초대')
  })

  it('marks status announcements, touch controls and no completion authority', () => {
    const html = renderToStaticMarkup(<AccountWorkspace state="session_expired" sessionPresent onLogout={async () => {}} />)
    expect(html).toContain('role="alert"')
    expect(html).toContain('data-touch-target="44"')
    expect(html).toContain('data-private-session-retry="true"')
    expect(html).toContain('다시 로그인')
    expect(html).toContain('data-completion-authority="false"')
    expect(render('session_expired')).not.toContain('data-private-session-retry="true"')
  })

  it('ready 상태는 두 프로젝트와 Project→Phase→Scope→Stage→Gate 및 실제 현재 위치를 렌더링한다', () => {
    const html = renderToStaticMarkup(<AccountWorkspace state="ready" workspace={readyWorkspace} />)
    expect(html.match(/data-private-project=/g)).toHaveLength(2)
    for (const label of ['프로젝트', '페이즈', '범위', '스테이지', '완료 조건', '실제 현재']) expect(html).toContain(label)
    expect(html).toContain('Current Projection')
    expect(html).toContain('Cherry Note Destination')
    expect(html).toContain('<details class="account-workspace__compatibility">')
    expect(html).not.toContain('<details class="account-workspace__compatibility" open="">')
    expect(html).toContain('aria-current="step"')
    expect(html).toContain('aria-selected="true"')
  })

  it('비공개 snapshot envelope는 기존 sidebar를 유지하고 Model v2를 primary로 표시한다', () => {
    const dashboard = { ...deploymentFixture, build: { repository: 'test/repo', ref: 'test', commit: null, tree: null, asset: null, runtimeNowPinned: false } } as unknown as OutcomeDashboardData
    const html = renderToStaticMarkup(<AccountWorkspace state="ready" workspace={{ ...readyWorkspace, dashboard }} onLogout={async () => {}} />)
    expect(html).toContain('oc-global-nav')
    expect(html).toContain('oc-project-switcher')
    expect(html).toContain('프로젝트 여정')
    expect(html).toContain('Current Projection')
    expect(html).toContain('<details class="oc-v1-compatibility">')
    expect(html).not.toContain('<details class="oc-v1-compatibility" open="">')
    expect(html.match(/data-private-project=/g)).toHaveLength(2)
    expect(html).toContain('data-private-logout="true"')
    expect(html).not.toContain('account-workspace__ready')
  })

  it('Model v2가 없는 legacy dashboard envelope는 기존 shell을 그대로 연다', () => {
    const dashboard = { ...deploymentFixture, build: { repository: 'test/repo', ref: 'test', commit: null, tree: null, asset: null, runtimeNowPinned: false } } as unknown as OutcomeDashboardData
    const legacyProjects = readyWorkspace.projects.map(({ modelV2: _modelV2, ...project }) => project)
    const html = renderToStaticMarkup(<AccountWorkspace state="ready" workspace={{ projects: legacyProjects, dashboard }} />)
    expect(html).toContain('<details class="oc-v1-compatibility" open="">')
    expect(html).not.toContain('Current Projection')
  })

  it('실제 Model v2 server envelope는 v1 current hierarchy 없이도 기존 shell과 Current Projection을 렌더링한다', () => {
    const dashboard = { ...deploymentFixture, projects: deploymentFixture.projects.map((item) => item.project.id === 'outcome' ? { ...item, phases: [], current: null } : item), build: { repository: 'test/repo', ref: 'test', commit: null, tree: null, asset: null, runtimeNowPinned: false } } as unknown as OutcomeDashboardData
    const projects = [{ project: { id: 'outcome', name: 'OUTCOME' }, modelV2: modelV2('outcome', 'OUTCOME') }]
    const html = renderToStaticMarkup(<AccountWorkspace state="ready" workspace={{ projects, dashboard } as unknown as typeof readyWorkspace & { dashboard: OutcomeDashboardData }} />)
    expect(html).toContain('oc-global-nav')
    expect(html).toContain('oc-project-switcher')
    expect(html).toContain('Current Projection')
    expect(html).toContain('OUTCOME Destination')
    expect(html).toContain('Planner conversation')
    expect(html).toContain('아직 관측된 Planner 작업 이벤트가 없습니다')
    expect(html).toContain('v1 호환 정보 없음')
    expect(html).not.toContain('OUTCOME 원본 묶음을 검증하고 있습니다')
  })

  it('실제 account service의 project와 modelV2만 있는 envelope도 dashboard 없이 Current Projection을 렌더링한다', () => {
    const projects = [
      { project: { id: 'cherry-note', name: 'Cherry Note' }, modelV2: modelV2('cherry-note', 'Cherry Note') },
      { project: { id: 'outcome', name: 'OUTCOME' }, modelV2: modelV2('outcome', 'OUTCOME') },
    ]
    const html = renderToStaticMarkup(<AccountWorkspace state="ready" workspace={{ projects } as unknown as typeof readyWorkspace} />)
    expect(html).toContain('oc-global-nav')
    expect(html).toContain('oc-project-switcher')
    expect(html.match(/data-private-project=/g)).toHaveLength(2)
    expect(html).toContain('Current Projection')
    expect(html).toContain('OUTCOME Destination')
    expect(html).toContain('v1 호환 정보 없음')
    expect(html).not.toContain('account-workspace__ready')
  })

  it('login은 실제 OAuth가 아닌 주입 어댑터 전환을 명시하고 ready에는 로그아웃이 있다', () => {
    const login = renderToStaticMarkup(<AccountWorkspace state="login" onLogin={async () => {}} />)
    expect(login).toContain('실제 OAuth 연결 아님')
    expect(login).toContain('data-private-login-provider="google"')
    const ready = renderToStaticMarkup(<AccountWorkspace state="ready" workspace={readyWorkspace} ownerVerified sessionPresent onLogout={async () => {}} />)
    expect(ready).toContain('data-private-logout="true"')
    expect(ready).toContain('로그아웃')
  })

  it('HP1 소유자 확인은 워크스페이스 503과 별개로 Apple 연결을 허용하고 미확인 사용자는 숨긴다', () => {
    const verified = renderToStaticMarkup(<AccountWorkspace state="unavailable" ownerVerified sessionPresent onLogout={async () => {}} onAppleLink={async () => {}} />)
    expect(verified).toContain('로그인 완료 · 데이터 연결 준비 중')
    expect(verified).toContain('data-state-code="unavailable"')
    expect(verified).not.toContain('>unavailable<')
    expect(verified).toContain('role="status"')
    expect(verified).toContain('data-private-link-provider="apple"')
    expect(verified).toContain('data-private-logout="true"')
    const denied = renderToStaticMarkup(<AccountWorkspace state="access_denied" onLogout={async () => {}} onAppleLink={async () => {}} />)
    expect(denied).not.toContain('data-private-link-provider="apple"')
    expect(denied).not.toContain('data-private-logout="true"')
  })

  it('기계 상태 코드는 사용자에게 한국어 상태명으로 제시한다', () => {
    expect(render('login')).toContain('>로그인 필요<')
    expect(render('access_denied')).toContain('>접근 권한 없음<')
    expect(render('unavailable')).toContain('>데이터 연결 준비 전<')
  })

  it('철회된 SDK 세션은 거부 화면에서 로그아웃만 복구 수단으로 제공한다', () => {
    const revoked = renderToStaticMarkup(<AccountWorkspace state="access_denied" sessionPresent onLogout={async () => {}} onAppleLink={async () => {}} />)
    expect(revoked).toContain('data-private-logout="true"')
    expect(revoked).not.toContain('data-private-link-provider="apple"')
    expect(revoked).not.toContain('data-private-project=')
  })
})
