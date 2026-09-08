import {afterEach,expect,it,vi} from 'vitest'
import {capturePrivateDecisionBindingVersion,fetchPrivateWorkspace,privateDecisionRecordingAvailable,recordPrivateDecision,endPrivateSession} from './api'
afterEach(()=>vi.unstubAllGlobals())
const workspace=()=>new Response(JSON.stringify({workspace:{}}),{headers:{etag:'"same-source"','x-outcome-csrf':'synthetic-csrf'}})
it('does not silently move an open decision to a refreshed binding, even for the same source ETag',async()=>{
 const mock=vi.fn(async()=>workspace());vi.stubGlobal('fetch',mock)
 await fetchPrivateWorkspace('first-owner');const version=capturePrivateDecisionBindingVersion()
 await fetchPrivateWorkspace('second-owner')
 await expect(recordPrivateDecision({projectId:'outcome',eventId:'event-blocked',sequence:1,decision:'approved',expectedBindingVersion:version})).rejects.toThrow('decision_source_changed')
 expect(mock).toHaveBeenCalledTimes(2)
})
it('failed refresh and failed logout both invalidate decision credentials',async()=>{
 const mock=vi.fn(async()=>workspace());vi.stubGlobal('fetch',mock)
 await fetchPrivateWorkspace()
 mock.mockRejectedValueOnce(new Error('offline'))
 await expect(fetchPrivateWorkspace()).rejects.toThrow('offline');expect(privateDecisionRecordingAvailable()).toBe(false)
 await fetchPrivateWorkspace();mock.mockRejectedValueOnce(new Error('offline'))
 await expect(endPrivateSession()).rejects.toThrow('offline');expect(privateDecisionRecordingAvailable()).toBe(false)
})
it('late workspace response cannot restore a binding after logout',async()=>{
 let release!:(value:Response)=>void
 const pending=new Promise<Response>(resolve=>{release=resolve})
 vi.stubGlobal('fetch',vi.fn().mockReturnValueOnce(pending).mockResolvedValueOnce(new Response('{}')))
 const read=fetchPrivateWorkspace();await endPrivateSession();release(workspace());await read
 expect(privateDecisionRecordingAvailable()).toBe(false)
})
