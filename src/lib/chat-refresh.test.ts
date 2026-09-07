import { afterEach, expect, test, vi } from 'vitest'
import { startChatRefresh } from './chat-refresh'

afterEach(() => vi.useRealTimers())
test('refreshes immediately, serializes slow reads and stops after disposal', async () => {
  vi.useFakeTimers()
  let release!: () => void
  const refresh = vi.fn(() => new Promise<void>(resolve => { release = resolve }))
  const stop = startChatRefresh(refresh)
  expect(refresh).toHaveBeenCalledTimes(1)
  await vi.advanceTimersByTimeAsync(10000)
  expect(refresh).toHaveBeenCalledTimes(1)
  release(); await Promise.resolve()
  await vi.advanceTimersByTimeAsync(2000)
  expect(refresh).toHaveBeenCalledTimes(2)
  stop(); release(); await Promise.resolve()
  await vi.advanceTimersByTimeAsync(10000)
  expect(refresh).toHaveBeenCalledTimes(2)
})
test('hidden pages pause reads and a failed read can recover without writing', async () => {
  vi.useFakeTimers()
  let visible = false
  const refresh = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined)
  const stop = startChatRefresh(refresh, { visible: () => visible })
  await vi.advanceTimersByTimeAsync(4000)
  expect(refresh).not.toHaveBeenCalled()
  visible = true
  await vi.advanceTimersByTimeAsync(4000)
  expect(refresh).toHaveBeenCalledTimes(2)
  stop()
})
