type Visibility = Pick<Document, 'visibilityState' | 'addEventListener' | 'removeEventListener'>

// Mounted-view read loop only. No task dispatch, service installation or source
// timestamps minted here. A timed-out request cannot overlap its successor.
export function startWorkObservationPolling({ read, publish, visibility = document }: {
 read: (signal: AbortSignal) => Promise<unknown>
 publish: (value: unknown) => void
 visibility?: Visibility
}) {
 let stopped = false, active: AbortController | null = null, failures = 0
 let timer: ReturnType<typeof setTimeout> | undefined, deadline: ReturnType<typeof setTimeout> | undefined
 const schedule = () => {
  if (stopped || active || visibility.visibilityState !== 'visible') return
  clearTimeout(timer)
  timer = setTimeout(() => void poll(), failures ? Math.min(60000, failures * 30000) : 10000)
 }
 const poll = async () => {
  if (stopped || active || visibility.visibilityState !== 'visible') return
  const abort = new AbortController(); active = abort
  deadline = setTimeout(() => { abort.abort(); if (!stopped) publish(null) }, 5000)
  try {
   const value = await read(abort.signal)
   if (!stopped && !abort.signal.aborted && visibility.visibilityState === 'visible') {
    failures = value === null ? failures + 1 : 0
    publish(value)
   } else failures++
  } catch (error) {
   failures++
   if (!stopped) publish(null)
   if (error instanceof Error && error.message === 'work_observation_identity_changed') stop()
  } finally { clearTimeout(deadline); active = null; schedule() }
 }
 const changed = () => {
  clearTimeout(timer)
  if (visibility.visibilityState !== 'visible') active?.abort()
  else if (!active) void poll()
 }
 const stop = () => {
  stopped = true; clearTimeout(timer); clearTimeout(deadline); active?.abort()
  visibility.removeEventListener('visibilitychange', changed)
 }
 visibility.addEventListener('visibilitychange', changed)
 void poll()
 return stop
}
