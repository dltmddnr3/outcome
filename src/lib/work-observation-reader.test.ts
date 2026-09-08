import { afterEach, expect, it, vi } from 'vitest'
import { captureWorkObservationReader, capturePrivateDecisionBindingVersion, captureDestinationReviewBinding, endPrivateSession, fetchPrivateWorkspace, subscribePrivateAccessFailure } from './api'
afterEach(() => vi.unstubAllGlobals())
const workspace = () => new Response(JSON.stringify({ workspace: { projects: [{ project: { id: 'outcome' } }] } }), { headers: { etag: '"source"', 'x-outcome-csrf': 'decision', 'x-outcome-destination-csrf': 'destination' } })
const response = (projectId = 'outcome') => new Response(JSON.stringify({ projectId, observation: { source: 'synthetic' }, completionAuthority: false }))
it('observation reads refresh credentials without resetting decision or Destination binding', async () => {
  const fetchMock = vi.fn().mockResolvedValueOnce(workspace()).mockImplementation(async () => response())
  vi.stubGlobal('fetch', fetchMock)
  await fetchPrivateWorkspace('old-token', async () => 'fresh-token')
  const version = capturePrivateDecisionBindingVersion(), validReview = captureDestinationReviewBinding()
  expect(captureWorkObservationReader('cherry-note')).toBeNull()
  expect(captureWorkObservationReader('../outcome')).toBeNull()
  const read = captureWorkObservationReader('outcome')!
  expect(await read(new AbortController().signal)).toEqual({ source: 'synthetic' })
  expect(capturePrivateDecisionBindingVersion()).toBe(version); expect(validReview()).toBe(true)
  const [url, options] = fetchMock.mock.calls[1]
  expect(url).toBe('/api/private/work-observation/outcome'); expect(options.headers.authorization).toBe('Bearer fresh-token')
  expect(options.headers).not.toHaveProperty('x-outcome-csrf'); expect(options).not.toHaveProperty('body')
})
it('late response, stale reader and failed logout cannot cross identity generation', async () => {
  let complete!: (value: Response) => void
  const fetchMock = vi.fn().mockResolvedValueOnce(workspace()).mockImplementationOnce(() => new Promise(resolve => { complete = resolve })).mockResolvedValue(workspace())
  vi.stubGlobal('fetch', fetchMock); await fetchPrivateWorkspace('first')
  const read = captureWorkObservationReader('outcome')!, pending = read(new AbortController().signal)
  await fetchPrivateWorkspace('second'); complete(response())
  await expect(pending).rejects.toThrow('work_observation_identity_changed')
  const calls = fetchMock.mock.calls.length
  await expect(read(new AbortController().signal)).rejects.toThrow('work_observation_identity_changed'); expect(fetchMock).toHaveBeenCalledTimes(calls)
  fetchMock.mockRejectedValueOnce(Error('private-detail'))
  await expect(endPrivateSession()).rejects.toThrow(); expect(captureWorkObservationReader('outcome')).toBeNull()
})
it('aborted credential refresh and mismatched response fail closed without leaking data', async () => {
  let finish!: (token: string) => void
  const mock = vi.fn().mockImplementation(async () => workspace()); vi.stubGlobal('fetch', mock)
  await fetchPrivateWorkspace('old', () => new Promise(resolve => { finish = resolve }))
  const abort = new AbortController(), pending = captureWorkObservationReader('outcome')!(abort.signal)
  abort.abort(); finish('new-token'); await expect(pending).rejects.toThrow('work_observation_unavailable'); expect(mock).toHaveBeenCalledTimes(1)
  await fetchPrivateWorkspace('owner'); mock.mockResolvedValueOnce(response('cherry-note'))
  await expect(captureWorkObservationReader('outcome')!(new AbortController().signal)).rejects.toThrow('work_observation_unavailable')
})
it('current authenticated denial invalidates all private bindings and notifies only its generation', async () => {
 const mock = vi.fn().mockImplementation(async () => workspace()); vi.stubGlobal('fetch', mock)
 await fetchPrivateWorkspace('previous')
 const old = vi.fn(), detachOld = subscribePrivateAccessFailure(old)
 await fetchPrivateWorkspace('owner')
 const current = vi.fn(), detach = subscribePrivateAccessFailure(current), review = captureDestinationReviewBinding()
 const detachThrowing = subscribePrivateAccessFailure(() => { throw Error('view failed') })
 const afterThrow = vi.fn(), detachAfter = subscribePrivateAccessFailure(afterThrow)
 try {
  mock.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'session_revoked' }), { status: 401 }))
  await expect(captureWorkObservationReader('outcome')!(new AbortController().signal)).rejects.toThrow('work_observation_identity_changed')
  expect(current).toHaveBeenCalledExactlyOnceWith('session_revoked'); expect(afterThrow).toHaveBeenCalledExactlyOnceWith('session_revoked'); expect(old).not.toHaveBeenCalled()
  expect(review()).toBe(false); expect(capturePrivateDecisionBindingVersion()).toBeNull(); expect(captureWorkObservationReader('outcome')).toBeNull()
 } finally { detachOld(); detach(); detachThrowing(); detachAfter() }
})
it('late denial and source/network failure cannot revoke a newer identity', async () => {
 let finish!: (value: Response) => void
 const mock = vi.fn().mockResolvedValueOnce(workspace()).mockImplementationOnce(() => new Promise(resolve => { finish = resolve })).mockImplementation(async () => workspace())
 vi.stubGlobal('fetch', mock); await fetchPrivateWorkspace('old')
 const pending = captureWorkObservationReader('outcome')!(new AbortController().signal)
 await fetchPrivateWorkspace('new')
 const notify = vi.fn(), detach = subscribePrivateAccessFailure(notify), version = capturePrivateDecisionBindingVersion()
 try {
  finish(new Response(JSON.stringify({ error: 'session_revoked' }), { status: 401 }))
  await expect(pending).rejects.toThrow('work_observation_identity_changed')
  for (const error of ['work_observation_unavailable', 'private-detail']) {
   mock.mockResolvedValueOnce(new Response(JSON.stringify({ error }), { status: 503 }))
   await expect(captureWorkObservationReader('outcome')!(new AbortController().signal)).rejects.toThrow('work_observation_unavailable')
  }
  expect(notify).not.toHaveBeenCalled(); expect(capturePrivateDecisionBindingVersion()).toBe(version)
 } finally { detach() }
})
