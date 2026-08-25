import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AccountWorkspace, accountWorkspaceStateCopy } from './AccountWorkspace'

const render = (state: keyof typeof accountWorkspaceStateCopy) => renderToStaticMarkup(<AccountWorkspace state={state} />)
const readyWorkspace = { projects: [
  { project: { id: 'cherry-note', name: 'Cherry Note' }, phases: [{ id: 'cherry-phase', title: '체리 단계', scopes: [{ id: 'cherry-scope', title: '체리 범위', stages: [{ id: 'cherry-current', title: '체리 현재', gate: { gates: [{ id: 'C1', title: '체리 완료 조건', closed: false }] } }, { id: 'cherry-selected', title: '체리 선택', gate: { gates: [{ id: 'C2', title: '선택 완료 조건', closed: true }] } }] }] }], current: { phaseId: 'cherry-phase', scopeId: 'cherry-scope', stageId: 'cherry-current' } },
  { project: { id: 'outcome', name: 'OUTCOME' }, phases: [{ id: 'outcome-phase', title: '아웃컴 단계', scopes: [{ id: 'outcome-scope', title: '아웃컴 범위', stages: [{ id: 'outcome-current', title: '아웃컴 현재', gate: { gates: [{ id: 'O1', title: '아웃컴 완료 조건', closed: false }] } }] }] }], current: { phaseId: 'outcome-phase', scopeId: 'outcome-scope', stageId: 'outcome-current' } },
] }

describe('account workspace presentation contract', () => {
  it('renders every safe private state with Korean primary copy and a private/read-only distinction', () => {
    for (const state of ['login', 'loading', 'empty', 'stale', 'conflict', 'unavailable', 'session_expired', 'access_denied', 'safe_degraded'] as const) {
      const html = render(state)
      expect(html).toContain(accountWorkspaceStateCopy[state].title)
      expect(html).toContain('Cherry 전용 비공개 워크스페이스')
      expect(html).toContain('읽기 전용')
      expect(html).toContain('completionAuthority')
    }
  })

  it('shows Google primary, email-code fallback and Apple linked-only without self-signup', () => {
    const html = render('login')
    expect(html).toContain('Google로 계속')
    expect(html).toContain('이메일 인증 코드')
    expect(html).toContain('Apple은 로그인 후 연결')
    expect(html).not.toContain('회원가입')
    expect(html).not.toContain('초대')
  })

  it('marks status announcements, touch controls and no completion authority', () => {
    const html = render('session_expired')
    expect(html).toContain('role="alert"')
    expect(html).toContain('data-touch-target="44"')
    expect(html).toContain('data-completion-authority="false"')
  })

  it('ready 상태는 두 프로젝트와 Project→Phase→Scope→Stage→Gate 및 실제 현재 위치를 렌더링한다', () => {
    const html = renderToStaticMarkup(<AccountWorkspace state="ready" workspace={readyWorkspace} />)
    expect(html.match(/data-private-project=/g)).toHaveLength(2)
    for (const label of ['프로젝트', '페이즈', '범위', '스테이지', '완료 조건', '실제 현재']) expect(html).toContain(label)
    expect(html).toContain('aria-current="step"')
    expect(html).toContain('aria-selected="true"')
  })

  it('login은 실제 OAuth가 아닌 주입 어댑터 전환을 명시하고 ready에는 로그아웃이 있다', () => {
    const login = renderToStaticMarkup(<AccountWorkspace state="login" onLogin={async () => {}} />)
    expect(login).toContain('실제 OAuth 연결 아님')
    expect(login).toContain('data-private-login-provider="google"')
    const ready = renderToStaticMarkup(<AccountWorkspace state="ready" workspace={readyWorkspace} ownerVerified onLogout={async () => {}} />)
    expect(ready).toContain('data-private-logout="true"')
    expect(ready).toContain('로그아웃')
  })

  it('HP1 소유자 확인은 워크스페이스 503과 별개로 Apple 연결을 허용하고 미확인 사용자는 숨긴다', () => {
    const verified = renderToStaticMarkup(<AccountWorkspace state="unavailable" ownerVerified onLogout={async () => {}} onAppleLink={async () => {}} />)
    expect(verified).toContain('data-private-link-provider="apple"')
    expect(verified).toContain('data-private-logout="true"')
    const denied = renderToStaticMarkup(<AccountWorkspace state="access_denied" onLogout={async () => {}} onAppleLink={async () => {}} />)
    expect(denied).not.toContain('data-private-link-provider="apple"')
    expect(denied).not.toContain('data-private-logout="true"')
  })
})
