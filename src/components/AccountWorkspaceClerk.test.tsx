import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

const clerkAuth = vi.hoisted(() => ({ isSignedIn: false }))
vi.mock('@clerk/react', () => ({
  ClerkProvider: ({ children, publishableKey }: { children: React.ReactNode; publishableKey: string }) => <div data-clerk-provider={publishableKey}>{children}</div>,
  AuthenticateWithRedirectCallback: ({ transferable }: { transferable: boolean }) => <div data-clerk-redirect-callback="true" data-transferable={String(transferable)} />,
  useAuth: () => ({ isLoaded: true, isSignedIn: clerkAuth.isSignedIn, getToken: vi.fn().mockResolvedValue(null), signOut: vi.fn() }),
  useSignIn: () => ({ signIn: {}, fetchStatus: 'idle' }),
  useUser: () => ({ user: null }),
}))

import { HostedClerkWorkspace, hostedFailureState, hostedGoogleSsoParameters, requestHostedEmailCode, requireHostedSessionToken, returnToHostedLogin } from './AccountWorkspaceClerk'

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

  it('maps Clerk Core 3 callback and completed-session destinations exactly', () => {
    expect(hostedGoogleSsoParameters).toEqual({ strategy: 'oauth_google', redirectCallbackUrl: '/workspace/sso-callback', redirectUrl: '/workspace' })
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
    const signOut = vi.fn().mockResolvedValue(undefined)
    await returnToHostedLogin(signOut)
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
