import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AccountWorkspace, accountWorkspaceStateCopy } from './AccountWorkspace'

const render = (state: keyof typeof accountWorkspaceStateCopy) => renderToStaticMarkup(<AccountWorkspace state={state} />)

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
})
