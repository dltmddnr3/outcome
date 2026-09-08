import { afterEach, expect, it, vi } from 'vitest'
import { startWorkObservationPolling } from './work-observation-poll'
afterEach(() => vi.useRealTimers())
function visibility() {
 const events = new EventTarget()
 let state: DocumentVisibilityState = 'visible'
 return { get visibilityState() { return state }, addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events),
  set(value: DocumentVisibilityState) { state = value; events.dispatchEvent(new Event('visibilitychange')) } }
}
it('polls only while visible, backs off null/errors, and cleans every timer on stop', async () => {
 vi.useFakeTimers()
 const view = visibility(), publish = vi.fn(), read = vi.fn().mockResolvedValueOnce({ observedAtMs: 1 }).mockResolvedValueOnce(null).mockRejectedValueOnce(Error('private-detail')).mockResolvedValue(null)
 const stop = startWorkObservationPolling({ read, publish, visibility: view })
 await vi.advanceTimersByTimeAsync(0); expect(read).toHaveBeenCalledTimes(1); expect(publish).toHaveBeenLastCalledWith({ observedAtMs: 1 })
 await vi.advanceTimersByTimeAsync(9999); expect(read).toHaveBeenCalledTimes(1)
 await vi.advanceTimersByTimeAsync(1); expect(read).toHaveBeenCalledTimes(2)
 await vi.advanceTimersByTimeAsync(29999); expect(read).toHaveBeenCalledTimes(2)
 await vi.advanceTimersByTimeAsync(1); expect(read).toHaveBeenCalledTimes(3)
 await vi.advanceTimersByTimeAsync(59999); expect(read).toHaveBeenCalledTimes(3)
 view.set('hidden'); await vi.advanceTimersByTimeAsync(120000); expect(read).toHaveBeenCalledTimes(3)
 view.set('visible'); await vi.advanceTimersByTimeAsync(0); expect(read).toHaveBeenCalledTimes(4)
 stop(); expect(vi.getTimerCount()).toBe(0); view.set('visible'); await vi.advanceTimersByTimeAsync(120000); expect(read).toHaveBeenCalledTimes(4)
})
it('deadline aborts but never overlaps an unsettled reader; late payload is discarded', async () => {
 vi.useFakeTimers()
 let complete!: (value: unknown) => void, signal!: AbortSignal
 const publish = vi.fn(), read = vi.fn((input: AbortSignal) => { signal = input; return new Promise(resolve => { complete = resolve }) })
 const stop = startWorkObservationPolling({ read, publish, visibility: visibility() })
 await vi.advanceTimersByTimeAsync(5000); expect(signal.aborted).toBe(true); expect(publish).toHaveBeenLastCalledWith(null)
 await vi.advanceTimersByTimeAsync(180000); expect(read).toHaveBeenCalledTimes(1)
 complete({ privateLatePayload: true }); await vi.advanceTimersByTimeAsync(0)
 expect(publish).toHaveBeenCalledTimes(1)
 stop(); expect(vi.getTimerCount()).toBe(0)
})
it('identity change stops automatic reads and cleanup ignores unmount responses', async () => {
 vi.useFakeTimers()
 const publish = vi.fn(), read = vi.fn().mockRejectedValue(Error('work_observation_identity_changed'))
 startWorkObservationPolling({ read, publish, visibility: visibility() })
 await vi.advanceTimersByTimeAsync(120000); expect(read).toHaveBeenCalledTimes(1); expect(vi.getTimerCount()).toBe(0)
 let complete!: (value: unknown) => void
 const latePublish = vi.fn(), stop = startWorkObservationPolling({ read: () => new Promise(resolve => { complete = resolve }), publish: latePublish, visibility: visibility() })
 stop(); complete({ observedAtMs: 1 }); await vi.advanceTimersByTimeAsync(0); expect(latePublish).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0)
})
