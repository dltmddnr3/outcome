import { afterEach, describe, expect, it, vi } from 'vitest'
import { beginPrivateSession } from './api'

afterEach(() => vi.unstubAllGlobals())

describe('hosted private session transition', () => {
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
