import { projectObservedSingleSessionWork } from './outcome-codex-work-observation.mjs'

// Trusted server composition only. The reader must use the authenticated owner
// runtime, not a second app-server process or a stored conversation timestamp.
export async function readScopedWorkObservation({ readSource, accountRef, workspaceId, projectId, now = Date.now, timeoutMs = 1000 }) {
  if (typeof readSource !== 'function' || !Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 5000) return null
  const abort = new AbortController(); let timer
  try {
    const raw = await Promise.race([
      Promise.resolve().then(() => readSource(Object.freeze({ accountRef, workspaceId, projectId }), { signal: abort.signal })),
      new Promise((_, reject) => { timer = setTimeout(() => { abort.abort(); reject(new Error('source_timeout')) }, timeoutMs) }),
    ])
    if (typeof raw !== 'string' || Buffer.byteLength(raw) > 600000) return null
    const envelope = JSON.parse(raw)
    if (!envelope || Object.keys(envelope).sort().join(',') !== 'accountRef,journalJson,observedAtMs,projectId,runtimeJson,scopeJson,workspaceId'
      || envelope.accountRef !== accountRef || envelope.workspaceId !== workspaceId || envelope.projectId !== projectId
      || typeof envelope.scopeJson !== 'string' || Buffer.byteLength(envelope.scopeJson) > 2048) return null
    const scope = JSON.parse(envelope.scopeJson)
    if (scope?.projectId !== projectId) return null
    const currentTime = now()
    if (!Number.isSafeInteger(envelope.observedAtMs) || envelope.observedAtMs < 0 || envelope.observedAtMs > currentTime) return null
    return projectObservedSingleSessionWork(envelope.journalJson, envelope.scopeJson, envelope.runtimeJson, envelope.observedAtMs, currentTime)
  } catch { return null } finally { clearTimeout(timer) }
}
