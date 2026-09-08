import { afterEach, expect, it, vi } from 'vitest'
import { parseConnectionInventory, connectionLabels } from './connection-inventory'
import { captureConnectionInventoryReader, fetchPrivateWorkspace, clearPrivateSessionBindings, subscribePrivateAccessFailure } from './api'
const snapshot = () => ({ schemaVersion: 1, projectId: 'outcome', completionAuthority: false, executionAuthority: false,
 entries: Object.keys(connectionLabels).map((id, i) => ({ id, state: i === 0 ? 'access_verified' : 'not_observed', observedAtMs: i === 0 ? 1000 : null })) })
afterEach(() => { clearPrivateSessionBindings(); vi.unstubAllGlobals() })
it('accepts only exact finite scoped inventory and rejects whole unsafe projections', () => {
 expect(parseConnectionInventory(snapshot(), 'outcome', 2000)).toEqual(snapshot())
 const invalid = [null, {}, { ...snapshot(), projectId: 'cherry-note' }, { ...snapshot(), completionAuthority: true }, { ...snapshot(), executionAuthority: true }, { ...snapshot(), privateLocator: 'must-not-render' }]
 for (const mutate of [(v: ReturnType<typeof snapshot>) => { v.entries[1].state = 'connected' }, (v: ReturnType<typeof snapshot>) => { v.entries[0].observedAtMs = 3000 }, (v: ReturnType<typeof snapshot>) => { v.entries[1].observedAtMs = 1000 }, (v: ReturnType<typeof snapshot>) => { v.entries[2] = v.entries[1] }, (v: ReturnType<typeof snapshot>) => { v.entries.pop() }]) { const v = snapshot(); mutate(v); invalid.push(v) }
 for (const value of invalid) expect(parseConnectionInventory(value, 'outcome', 2000)).toBeNull()
})
const workspace = () => new Response(JSON.stringify({ workspace: { projects: [{ project: { id: 'outcome' } }] } }))
it('refreshes scoped credential, denies late identity and does not send control fields', async () => {
 const mock = vi.fn().mockResolvedValueOnce(workspace()).mockResolvedValue(new Response(JSON.stringify(snapshot())))
 vi.stubGlobal('fetch', mock); await fetchPrivateWorkspace('old', async () => 'fresh')
 expect(captureConnectionInventoryReader('cherry-note')).toBeNull()
 const read = captureConnectionInventoryReader('outcome')!
 expect(await read(new AbortController().signal)).toEqual(snapshot())
 const [url, options] = mock.mock.calls[1]
 expect(url).toBe('/api/private/connections/outcome'); expect(options.headers.authorization).toBe('Bearer fresh')
 expect(options.headers).not.toHaveProperty('x-outcome-csrf'); expect(options).not.toHaveProperty('body')
 clearPrivateSessionBindings()
 await expect(read(new AbortController().signal)).rejects.toThrow('work_observation_identity_changed')
 expect(mock).toHaveBeenCalledTimes(2)
})
it('current auth failure removes bindings but malformed inventory does not sign out', async () => {
 const mock = vi.fn().mockResolvedValueOnce(workspace()).mockResolvedValueOnce(new Response(JSON.stringify({ ...snapshot(), locator: 'secret' })))
 vi.stubGlobal('fetch', mock); await fetchPrivateWorkspace('owner')
 const notify = vi.fn(), detach = subscribePrivateAccessFailure(notify)
 try {
  await expect(captureConnectionInventoryReader('outcome')!(new AbortController().signal)).rejects.toThrow('work_observation_unavailable')
  expect(notify).not.toHaveBeenCalled()
  mock.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'session_revoked' }), { status: 401 }))
  await expect(captureConnectionInventoryReader('outcome')!(new AbortController().signal)).rejects.toThrow('work_observation_identity_changed')
  expect(notify).toHaveBeenCalledWith('session_revoked'); expect(captureConnectionInventoryReader('outcome')).toBeNull()
 } finally { detach() }
})
