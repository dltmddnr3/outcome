import { afterEach, describe, expect, it, vi } from 'vitest'
import { beginPrivateSession, fetchPrivateOwnerSession, fetchPrivateWorkspace } from './api'

afterEach(() => vi.unstubAllGlobals())

describe('hosted private session transition', () => {
  it('propagates the Clerk SDK session token only through the standard bearer header', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init: RequestInit) => Promise.resolve(new Response(JSON.stringify(url.endsWith('/session') ? { authenticated: true, owner: true } : { error: 'private_workspace_unavailable' }), { status: url.endsWith('/session') ? 200 : 503, headers: { 'content-type': 'application/json' } })))
    vi.stubGlobal('fetch', fetchMock)

    await fetchPrivateOwnerSession('sdk-issued-session')
    await expect(fetchPrivateWorkspace('sdk-issued-session')).rejects.toThrow('private_workspace_unavailable')

    for (const [, init] of fetchMock.mock.calls) {
      expect(init.headers).toMatchObject({ authorization: 'Bearer sdk-issued-session' })
      expect(JSON.stringify(init)).not.toContain('body')
    }
  })

  it('navigates only when the credential-free API boundary returns a hosted redirect', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      state: 'redirect_required',
      mode: 'hosted_provider_redirect',
      redirectUrl: 'https://identity.invalid/sign-in',
    }), { status: 200, headers: { 'content-type': 'application/json' } })))
    const navigate = vi.fn()

    await beginPrivateSession('google', navigate)

    expect(navigate).toHaveBeenCalledExactlyOnceWith('https://identity.invalid/sign-in')
  })

  it('preserves the existing injected transition without navigation', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      state: 'authenticated',
      mode: 'injected_test_adapter',
    }), { status: 200, headers: { 'content-type': 'application/json' } })))
    const navigate = vi.fn()

    await beginPrivateSession('email_code', navigate)

    expect(navigate).not.toHaveBeenCalled()
  })
})
