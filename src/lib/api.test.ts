import { afterEach, describe, expect, it, vi } from 'vitest'
import { beginPrivateSession, fetchPrivateChatTimeline, fetchPrivateOwnerSession, fetchPrivateWorkspace, recordPrivateDecision, submitPrivatePlannerMessage } from './api'

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

  it('keeps freshness and CSRF bindings in memory and submits only the closed decision request', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ workspace: { projects: [] } }), { status: 200, headers: { 'content-type': 'application/json', etag: '"revision"', 'x-outcome-csrf': 'csrf-value' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ decisionState: 'recorded', decision: 'approved', rejectionReason: null, decidedAt: '2026-09-04T03:00:00.000Z', decisionActorClass: 'owner', notice: '기록됨 · 전달은 이 범위 밖', completionAuthority: false }), { status: 201, headers: { 'content-type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('crypto', { getRandomValues: (value: Uint8Array) => value.fill(7) })

    await fetchPrivateWorkspace('sdk-issued-session')
    const receipt = await recordPrivateDecision({ projectId: 'outcome', eventId: 'event-builder-blocked', sequence: 7, decision: 'approved' })

    expect(receipt.notice).toBe('기록됨 · 전달은 이 범위 밖')
    const [, init] = fetchMock.mock.calls[1]
    expect(init).toMatchObject({ method: 'POST', credentials: 'same-origin' })
    expect(init.headers).toMatchObject({ authorization: 'Bearer sdk-issued-session', 'content-type': 'application/json', 'x-outcome-csrf': 'csrf-value', 'if-match': '"revision"' })
    expect(JSON.parse(init.body)).toMatchObject({ projectId: 'outcome', eventId: 'event-builder-blocked', sequence: 7, decision: 'approved', rejectionReason: null })
    expect(JSON.stringify(init)).not.toContain('localStorage')
  })
})

describe('private Planner chat client boundary', () => {
  it('sends only project and message while carrying bearer csrf and a fresh opaque key', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ target: { role: 'planner', binding_version: 7 }, events: [], completion_authority: false, csrf: 'csrf-value' }), { status: 200, headers: { 'content-type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ accepted: true, sequence: 1, event_id: 'event-0000000000000001', dispatch_state: 'invoked', delivery: 'acknowledged', execution_started: false, result_attached: false, evidence_attached: false }), { status: 202, headers: { 'content-type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)
    const timeline = await fetchPrivateChatTimeline('outcome', 0, 'sdk-issued-session')
    await submitPrivatePlannerMessage('outcome', '안녕하세요', timeline.csrf, 'message-0123456789abcdef', 'sdk-issued-session')
    expect(fetchMock.mock.calls[0][0]).toBe('/api/private/chat/timeline?project_id=outcome&after_sequence=0')
    const [, init] = fetchMock.mock.calls[1]
    expect(JSON.parse(String(init.body))).toEqual({ project_id: 'outcome', message: '안녕하세요' })
    expect(init.headers).toMatchObject({ authorization: 'Bearer sdk-issued-session', 'x-outcome-csrf': 'csrf-value', 'idempotency-key': 'message-0123456789abcdef' })
  })
})
