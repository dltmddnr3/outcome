import { afterEach, expect, it, vi } from 'vitest'
import { captureWorkObservationReader, capturePrivateDecisionBindingVersion, captureDestinationReviewBinding, endPrivateSession, fetchPrivateWorkspace } from './api'
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
