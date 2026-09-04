import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

const clerkAuth = vi.hoisted(() => ({ isSignedIn: false, fetchStatus: 'idle' as 'idle' | 'fetching' }))
vi.mock('@clerk/react', () => ({
  ClerkProvider: ({ children, publishableKey }: { children: React.ReactNode; publishableKey: string }) => <div data-clerk-provider={publishableKey}>{children}</div>,
  AuthenticateWithRedirectCallback: ({ transferable }: { transferable: boolean }) => <div data-clerk-redirect-callback="true" data-transferable={String(transferable)} />,
  useAuth: () => ({ isLoaded: true, isSignedIn: clerkAuth.isSignedIn, getToken: vi.fn().mockResolvedValue(null), signOut: vi.fn() }),
  useSignIn: () => ({ signIn: {}, errors: { global: null, raw: null }, fetchStatus: clerkAuth.fetchStatus }),
  useUser: () => ({ user: null }),
}))

import { attemptHostedEmailCodeVerification, attemptHostedGoogleSignIn, clearHostedOwnerReady, confirmHostedOwnerWorkspace, HostedClerkWorkspace, hostedEmailAttemptError, hostedFailureState, hostedGoogleAttemptError, hostedGoogleSsoParameters, hostedSignedOutState, markHostedOwnerReady, requestHostedEmailCode, requireHostedSessionToken, returnToHostedLogin } from './AccountWorkspaceClerk'

const tabStorage = () => {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) },
    removeItem: (key: string) => { values.delete(key) },
    entries: () => [...values.entries()],
  }
}

describe('Clerk browser session boundary', () => {
  it('mounts ClerkProvider with the runtime publishable key and real SDK callback component', () => {
    const html = renderToStaticMarkup(<HostedClerkWorkspace publishableKey="pk_test_browser" pathname="/workspace/sso-callback" />)
    expect(html).toContain('data-clerk-provider="pk_test_browser"')
    expect(html).toContain('data-clerk-redirect-callback="true"')
    expect(html).toContain('data-transferable="false"')
  })

  it('normal workspace is SDK-owned and does not render a server callback form', () => {
    const html = renderToStaticMarkup(<HostedClerkWorkspace publishableKey="pk_test_browser" pathname="/workspace" />)
    expect(html).toContain('data-clerk-provider="pk_test_browser"')
    expect(html).toContain('account-workspace__google')
    expect(html).toContain('account-workspace__separator')
    expect(html).toContain('account-workspace__fallback')
    expect(html).toContain('for="private-email"')
    expect(html).not.toContain('/api/private/auth/callback')
    expect(html).not.toContain('sessionToken')
  })

  it('distinguishes first signed-out from same-tab operator revocation and reload using one fixed boolean', () => {
    const storage = tabStorage()
    expect(hostedSignedOutState(storage)).toBe('login')
    markHostedOwnerReady(storage)
    expect(hostedSignedOutState(storage)).toBe('session_expired')
    expect(storage.entries()).toEqual([['outcome.owner-ready', '1']])
    clearHostedOwnerReady(storage)
    expect(hostedSignedOutState(storage)).toBe('login')
    expect(storage.entries()).toEqual([])
  })

  it('renders reload after operator revocation as expired with a real retry, while first visit stays login', () => {
    const storage = tabStorage()
    vi.stubGlobal('sessionStorage', storage)
    expect(renderToStaticMarkup(<HostedClerkWorkspace publishableKey="pk_test_browser" pathname="/workspace" />)).toContain('data-state-code="login"')
    markHostedOwnerReady(storage)
    const revoked = renderToStaticMarkup(<HostedClerkWorkspace publishableKey="pk_test_browser" pathname="/workspace" />)
    vi.unstubAllGlobals()
    expect(revoked).toContain('data-state-code="session_expired"')
    expect(revoked).toContain('로그인이 만료되었습니다')
    expect(revoked).toContain('data-private-session-retry="true"')
    expect(revoked).not.toContain('data-private-logout="true"')
    expect(revoked).not.toContain('data-private-project=')
  })

  it('writes the marker only after owner and workspace readiness both succeed', async () => {
    const storage = tabStorage()
    await expect(confirmHostedOwnerWorkspace('opaque-session', storage, {
      owner: vi.fn().mockResolvedValue({ authenticated: true, owner: true }),
      workspace: vi.fn().mockRejectedValue(new Error('private_workspace_unavailable')),
    })).rejects.toThrow('private_workspace_unavailable')
    expect(storage.entries()).toEqual([])
    const workspace = { viewState: 'ready' }
    await expect(confirmHostedOwnerWorkspace('opaque-session', storage, {
      owner: vi.fn().mockResolvedValue({ authenticated: true, owner: true }),
      workspace: vi.fn().mockResolvedValue({ workspace }),
    })).resolves.toEqual(workspace)
    expect(storage.entries()).toEqual([['outcome.owner-ready', '1']])
    expect(JSON.stringify(storage.entries())).not.toMatch(/opaque-session|identity|email|token|cookie|provider/i)
  })

  it('maps Clerk Core 3 callback and completed-session destinations exactly', () => {
    expect(hostedGoogleSsoParameters).toEqual({ strategy: 'oauth_google', redirectCallbackUrl: '/workspace/sso-callback', redirectUrl: '/workspace' })
  })

  it('opens the documented popup synchronously and finalizes a completed Google sign-in', async () => {
    const lock = { current: false }
    let opened = false
    const popup = { close: vi.fn(), closed: false } as unknown as Window
    const navigate = vi.fn()
    const finalize = vi.fn().mockImplementation(async ({ navigate: finalizeNavigate }) => {
      expect(opened).toBe(true)
      await finalizeNavigate({ decorateUrl: (url: string) => `https://preview.invalid${url}` })
      expect(navigate).toHaveBeenCalledOnce()
      return { error: null }
    })
    const sso = vi.fn().mockImplementation(async (parameters) => {
      expect(opened).toBe(true)
      expect(parameters).toEqual({ ...hostedGoogleSsoParameters, popup })
      return { error: null }
    })
    const signIn = { status: 'complete', sso, finalize }
    await expect(attemptHostedGoogleSignIn(signIn, lock, () => { opened = true; return popup }, navigate)).resolves.toBe('complete')
    expect(sso).toHaveBeenCalledOnce()
    expect(finalize).toHaveBeenCalledOnce()
    expect(navigate).toHaveBeenCalledOnce()
    expect(popup.close).toHaveBeenCalledOnce()
  })

  it('uses the current Clerk resource after SSO instead of the stale hook snapshot', async () => {
    const popup = { close: vi.fn(), closed: false } as unknown as Window
    const navigate = vi.fn()
    const finalize = vi.fn().mockImplementation(async ({ navigate: stage }) => { await stage({ decorateUrl: (url: string) => url }); return { error: null } })
    const stale = { status: 'needs_first_factor', sso: vi.fn().mockResolvedValue({ error: null }), finalize: vi.fn() }
    const current = { status: 'complete', sso: stale.sso, finalize }
    await expect(attemptHostedGoogleSignIn(stale, { current: false }, () => popup, navigate, () => current)).resolves.toBe('complete')
    expect(stale.finalize).not.toHaveBeenCalled()
    expect(finalize).toHaveBeenCalledOnce()
    expect(navigate).toHaveBeenCalledOnce()
  })

  it('fails safely for absent, blocked-popup, rejected, thrown, and incomplete Google starts', async () => {
    const lock = { current: false }
    const popup = { close: vi.fn(), closed: false } as unknown as Window
    const incomplete = { status: 'needs_first_factor', sso: vi.fn().mockResolvedValue({ error: null }), finalize: vi.fn() }
    await expect(attemptHostedGoogleSignIn(undefined, lock)).resolves.toBe('unavailable')
    await expect(attemptHostedGoogleSignIn(incomplete, lock, () => null)).resolves.toBe('popup_blocked')
    expect(incomplete.sso).not.toHaveBeenCalled()
    await expect(attemptHostedGoogleSignIn({ ...incomplete, sso: vi.fn().mockResolvedValue({ error: new Error('raw-provider-detail') }) }, lock, () => popup)).resolves.toBe('sso_failed')
    await expect(attemptHostedGoogleSignIn({ ...incomplete, sso: vi.fn().mockRejectedValue(new Error('raw-provider-secret')) }, lock, () => popup)).resolves.toBe('sso_failed')
    await expect(attemptHostedGoogleSignIn(incomplete, lock, () => popup)).resolves.toBe('incomplete')
    expect(incomplete.finalize).not.toHaveBeenCalled()
    expect(popup.close).toHaveBeenCalledTimes(2)
    expect(lock.current).toBe(false)
  })

  it('maps popup/mobile fallback and provider failures to bounded Korean copy only', () => {
    expect(hostedGoogleAttemptError('popup_blocked')).toContain('팝업을 허용')
    expect(hostedGoogleAttemptError('unavailable')).toContain('다시 시도')
    expect(hostedGoogleAttemptError('sso_failed')).toBe('Google 로그인을 완료하지 못했습니다. 다시 시도해 주세요.')
    expect(hostedGoogleAttemptError('incomplete')).toBe('추가 인증이 필요합니다. 로그인을 완료해 주세요.')
    expect(hostedGoogleAttemptError('blocked_existing_account')).toContain('기존 계정')
    expect(hostedGoogleAttemptError('session_activation_failed')).toContain('세션을 활성화')
    expect(hostedGoogleAttemptError('complete')).toBeNull()
    expect(hostedGoogleAttemptError('ignored')).toBeNull()
    expect(JSON.stringify((['popup_blocked', 'unavailable', 'sso_failed', 'blocked_existing_account', 'incomplete', 'session_activation_failed'] as const).map(hostedGoogleAttemptError))).not.toMatch(/raw-provider|token|cookie|secret/i)
  })

  it('classifies transferable, incomplete, and finalize-failed Google states without navigation', async () => {
    const popup = { close: vi.fn(), closed: false } as unknown as Window
    const navigate = vi.fn()
    const base = { sso: vi.fn().mockResolvedValue({ error: null }), finalize: vi.fn() }
    await expect(attemptHostedGoogleSignIn({ ...base, status: 'complete', isTransferable: true }, { current: false }, () => popup, navigate)).resolves.toBe('blocked_existing_account')
    await expect(attemptHostedGoogleSignIn({ ...base, status: 'needs_second_factor' }, { current: false }, () => popup, navigate)).resolves.toBe('incomplete')
    await expect(attemptHostedGoogleSignIn({ ...base, status: 'needs_client_trust' }, { current: false }, () => popup, navigate)).resolves.toBe('incomplete')
    const finalizeError = vi.fn().mockResolvedValue({ error: new Error('raw-session-secret') })
    await expect(attemptHostedGoogleSignIn({ ...base, status: 'complete', finalize: finalizeError }, { current: false }, () => popup, navigate)).resolves.toBe('session_activation_failed')
    const finalizeThrow = vi.fn().mockRejectedValue(new Error('raw-finalize-secret'))
    await expect(attemptHostedGoogleSignIn({ ...base, status: 'complete', finalize: finalizeThrow }, { current: false }, () => popup, navigate)).resolves.toBe('session_activation_failed')
    expect(base.finalize).not.toHaveBeenCalled()
    expect(finalizeError).toHaveBeenCalledOnce()
    expect(finalizeThrow).toHaveBeenCalledOnce()
    expect(navigate).not.toHaveBeenCalled()
  })

  it('finalizes email only after complete verification and navigates only on a null finalize error', async () => {
    const lock = { current: false }
    const navigate = vi.fn()
    const verifyCode = vi.fn().mockResolvedValue({ error: null })
    const finalize = vi.fn().mockImplementation(async ({ navigate: stage }) => { await stage({ decorateUrl: (url: string) => `https://preview.invalid${url}` }); return { error: null } })
    const signIn = { status: 'complete', emailCode: { sendCode: vi.fn(), verifyCode }, finalize }
    await expect(attemptHostedEmailCodeVerification(signIn, '123456', lock, navigate)).resolves.toBe('complete')
    expect(verifyCode).toHaveBeenCalledOnce()
    expect(finalize).toHaveBeenCalledOnce()
    expect(navigate).toHaveBeenCalledOnce()
    expect(lock.current).toBe(false)
  })

  it('uses the current Clerk resource after email verification instead of a stale hook snapshot', async () => {
    const navigate = vi.fn()
    const verifyCode = vi.fn().mockResolvedValue({ error: null })
    const stale = { status: 'needs_first_factor', emailCode: { sendCode: vi.fn(), verifyCode }, finalize: vi.fn() }
    const current = { status: 'complete', emailCode: stale.emailCode, finalize: vi.fn().mockImplementation(async ({ navigate: stage }) => { await stage({ decorateUrl: (url: string) => url }); return { error: null } }) }
    await expect(attemptHostedEmailCodeVerification(stale, '123456', { current: false }, navigate, () => current)).resolves.toBe('complete')
    expect(stale.finalize).not.toHaveBeenCalled()
    expect(current.finalize).toHaveBeenCalledOnce()
    expect(navigate).toHaveBeenCalledOnce()
  })

  it('converges completed auth on token, owner confirmation, workspace, and ready marker exactly once', async () => {
    const storage = tabStorage()
    const navigate = vi.fn()
    const popup = { close: vi.fn(), closed: false } as unknown as Window
    const stale = { status: 'needs_first_factor', sso: vi.fn().mockResolvedValue({ error: null }), finalize: vi.fn() }
    const current = { ...stale, status: 'complete', finalize: vi.fn().mockImplementation(async ({ navigate: stage }) => { await stage({ decorateUrl: (url: string) => url }); return { error: null } }) }
    await expect(attemptHostedGoogleSignIn(stale, { current: false }, () => popup, navigate, () => current)).resolves.toBe('complete')
    const getToken = vi.fn().mockResolvedValue('opaque-session')
    const owner = vi.fn().mockResolvedValue({ authenticated: true, owner: true })
    const workspace = vi.fn().mockResolvedValue({ workspace: { viewState: 'ready' } })
    const sessionToken = await requireHostedSessionToken(getToken)
    await expect(confirmHostedOwnerWorkspace(sessionToken, storage, { owner, workspace })).resolves.toEqual({ viewState: 'ready' })
    expect(current.finalize).toHaveBeenCalledOnce()
    expect(navigate).toHaveBeenCalledOnce()
    expect(getToken).toHaveBeenCalledOnce()
    expect(owner).toHaveBeenCalledOnce()
    expect(workspace).toHaveBeenCalledOnce()
    expect(storage.entries()).toEqual([['outcome.owner-ready', '1']])
  })

  it('keeps email transfer, factor, trust, task, finalize error, and thrown failures distinct and private', async () => {
    const navigate = vi.fn()
    const make = (status: string, finalize = vi.fn(), isTransferable = false) => ({ status, isTransferable, emailCode: { sendCode: vi.fn(), verifyCode: vi.fn().mockResolvedValue({ error: null }) }, finalize })
    const transferable = make('complete', vi.fn(), true)
    const first = make('needs_first_factor')
    const second = make('needs_second_factor')
    const trust = make('needs_client_trust')
    const task = make('needs_session_task')
    for (const signIn of [transferable]) await expect(attemptHostedEmailCodeVerification(signIn, '123456', { current: false }, navigate)).resolves.toBe('blocked_existing_account')
    for (const signIn of [first, second, trust, task]) await expect(attemptHostedEmailCodeVerification(signIn, '123456', { current: false }, navigate)).resolves.toBe('incomplete')
    const finalizeError = vi.fn().mockResolvedValue({ error: new Error('raw-session-secret') })
    await expect(attemptHostedEmailCodeVerification(make('complete', finalizeError), '123456', { current: false }, navigate)).resolves.toBe('session_activation_failed')
    await expect(attemptHostedEmailCodeVerification(make('complete', vi.fn().mockRejectedValue(new Error('raw-finalize-secret'))), '123456', { current: false }, navigate)).resolves.toBe('session_activation_failed')
    await expect(attemptHostedEmailCodeVerification({ ...make('complete'), emailCode: { sendCode: vi.fn(), verifyCode: vi.fn().mockRejectedValue(new Error('raw-code-secret')) } }, '123456', { current: false }, navigate)).resolves.toBe('verification_failed')
    expect(transferable.finalize).not.toHaveBeenCalled()
    for (const signIn of [first, second, trust, task]) expect(signIn.finalize).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
    expect(JSON.stringify((['verification_failed', 'blocked_existing_account', 'incomplete', 'session_activation_failed', 'unavailable'] as const).map(hostedEmailAttemptError))).not.toMatch(/raw-|token|cookie|code-secret|identity|email/i)
  })

  it('rejects a concurrent duplicate email verification without a second factor or finalize call', async () => {
    let resolve!: (value: { error: null }) => void
    const pending = new Promise<{ error: null }>((done) => { resolve = done })
    const verifyCode = vi.fn(() => pending)
    const finalize = vi.fn()
    const signIn = { status: 'complete', emailCode: { sendCode: vi.fn(), verifyCode }, finalize }
    const lock = { current: false }
    const first = attemptHostedEmailCodeVerification(signIn, '123456', lock)
    await expect(attemptHostedEmailCodeVerification(signIn, '123456', lock)).resolves.toBe('ignored')
    expect(verifyCode).toHaveBeenCalledOnce()
    resolve({ error: null })
    await expect(first).resolves.toBe('session_activation_failed')
    expect(finalize).toHaveBeenCalledOnce()
    expect(lock.current).toBe(false)
  })

  it('keeps one Google start pending and rejects a duplicate click', async () => {
    let resolve!: (value: { error: null }) => void
    const pending = new Promise<{ error: null }>((done) => { resolve = done })
    const popup = { close: vi.fn(), closed: false } as unknown as Window
    const sso = vi.fn(() => pending)
    const lock = { current: false }
    const signIn = { status: 'needs_first_factor', sso, finalize: vi.fn() }
    const first = attemptHostedGoogleSignIn(signIn, lock, () => popup)
    await expect(attemptHostedGoogleSignIn(signIn, lock, () => popup)).resolves.toBe('ignored')
    expect(sso).toHaveBeenCalledOnce()
    expect(lock.current).toBe(true)
    resolve({ error: null })
    await expect(first).resolves.toBe('incomplete')
    expect(popup.close).not.toHaveBeenCalled()
    expect(lock.current).toBe(false)
  })

  it('shows Clerk fetching as a disabled Korean starting state', () => {
    clerkAuth.fetchStatus = 'fetching'
    const html = renderToStaticMarkup(<HostedClerkWorkspace publishableKey="pk_test_browser" pathname="/workspace" />)
    clerkAuth.fetchStatus = 'idle'
    expect(html).toContain('Google 로그인 시작 중…')
    expect(html).toContain('data-google-start-pending="true"')
    expect(html).toContain('disabled=""')
  })

  it('does not advance email-code state while the Clerk sign-in resource is absent or rejects', async () => {
    expect(await requestHostedEmailCode(undefined, 'owner@example.invalid')).toBe(false)
    expect(await requestHostedEmailCode({ emailCode: { sendCode: async () => ({ error: new Error('unready') }) } }, 'owner@example.invalid')).toBe(false)
    expect(await requestHostedEmailCode({ emailCode: { sendCode: async () => ({ error: null }) } }, 'owner@example.invalid')).toBe(true)
  })

  it('requires the Clerk SDK session token before calling the private owner boundary', async () => {
    const getToken = vi.fn().mockResolvedValue('sdk-issued-session')
    await expect(requireHostedSessionToken(getToken)).resolves.toBe('sdk-issued-session')
    expect(getToken).toHaveBeenCalledOnce()
    await expect(requireHostedSessionToken(async () => null)).rejects.toThrow('authentication_required')
  })

  it('maps every approved hosted failure code without treating unknown errors as access denial', () => {
    const cases = [
      ['authentication_required', 'login'],
      ['session_expired', 'session_expired'],
      ['session_revoked', 'session_expired'],
      ['authentication_unavailable', 'unavailable'],
      ['private_workspace_unavailable', 'unavailable'],
      ['membership_conflict', 'conflict'],
      ['owner_mismatch', 'access_denied'],
      ['membership_inactive', 'access_denied'],
      ['project_access_denied', 'access_denied'],
    ] as const
    for (const [code, expected] of cases) expect(hostedFailureState(new Error(code))).toBe(expected)
    expect(hostedFailureState(new Error('provider_internal_detail'))).toBe('unavailable')
    expect(hostedFailureState(null)).toBe('unavailable')
  })

  it('returns an expired Clerk session to login through SDK sign-out only', async () => {
    const storage = tabStorage()
    markHostedOwnerReady(storage)
    const signOut = vi.fn().mockImplementation(async () => { expect(storage.entries()).toEqual([]) })
    await returnToHostedLogin(signOut, storage)
    expect(storage.entries()).toEqual([])
    expect(signOut).toHaveBeenCalledOnce()
    expect(signOut).toHaveBeenCalledWith({ redirectUrl: '/workspace' })
  })

  it('keeps SDK logout recovery visible before server owner verification without exposing Apple', () => {
    clerkAuth.isSignedIn = true
    const html = renderToStaticMarkup(<HostedClerkWorkspace publishableKey="pk_test_browser" pathname="/workspace" />)
    clerkAuth.isSignedIn = false
    expect(html).toContain('data-private-logout="true"')
    expect(html).not.toContain('data-private-link-provider="apple"')
    expect(html).not.toContain('data-private-project=')
  })
})
