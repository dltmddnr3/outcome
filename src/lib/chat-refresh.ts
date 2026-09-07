// Read-only refresh: never dispatches or retries a message submission.
export function startChatRefresh(refresh: () => Promise<void>, {
  delayMs = 2000,
  visible = () => typeof document === 'undefined' || document.visibilityState === 'visible',
  schedule = (callback: () => void, delay: number) => setTimeout(callback, delay),
  cancel = (timer: ReturnType<typeof setTimeout>) => clearTimeout(timer),
} = {}) {
  let stopped = false, timer: ReturnType<typeof setTimeout> | undefined
  const tick = async () => {
    if (stopped) return
    try { if (visible()) await refresh() } catch { /* The next read can recover; writes are never retried. */ }
    if (!stopped) timer = schedule(() => { void tick() }, delayMs)
  }
  void tick()
  return () => { stopped = true; if (timer !== undefined) cancel(timer) }
}
