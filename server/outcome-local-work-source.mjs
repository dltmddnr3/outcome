import { createHash } from 'node:crypto'
import { readScopedWorkObservation } from './outcome-work-observation-access.mjs'

// Local trusted composition. resolveBinding reads current protected owner/run
// configuration, not browser input. No registry writes, dispatch or timestamps
// synthesized from the request time. Do not install this on a remote host that
// cannot read the owner's runtime.
export function createLocalWorkObservationSource({ resolveBinding, readJournal, readRuntime, now = Date.now }) {
  if (![resolveBinding, readJournal, readRuntime, now].every(value => typeof value === 'function')) throw Error('work_source_configuration_invalid')
  return async (account, { signal } = {}) => {
    try {
      if (signal?.aborted) return null
      const raw = await resolveBinding(account)
      if (typeof raw !== 'string' || Buffer.byteLength(raw) > 4096) return null
      const binding = JSON.parse(raw)
      if (!binding || Object.keys(binding).sort().join(',') !== 'accountRef,projectId,scopeJson,threadId,workspaceId'
        || ['accountRef', 'workspaceId', 'projectId'].some(key => binding[key] !== account[key])
        || typeof binding.threadId !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(binding.threadId)
        || typeof binding.scopeJson !== 'string' || Buffer.byteLength(binding.scopeJson) > 2048) return null
      const scope = JSON.parse(binding.scopeJson)
      const reference = createHash('sha256').update('outcome-work-session-v1\0').update(binding.threadId).digest('hex')
      if (scope.projectId !== account.projectId || scope.sessionRef !== reference) return null
      if (signal?.aborted) return null
      const snapshot = await readRuntime(binding.threadId, { signal })
      if (!snapshot || signal?.aborted) return null
      const journalJson = await readJournal(binding.scopeJson, { signal })
      if (signal?.aborted || await resolveBinding(account) !== raw) return null
      const envelope = JSON.stringify({ accountRef: binding.accountRef, workspaceId: binding.workspaceId,
        projectId: binding.projectId, scopeJson: binding.scopeJson, journalJson,
        runtimeJson: snapshot.runtimeJson, observedAtMs: snapshot.observedAtMs })
      const projection = await readScopedWorkObservation({ ...account, now, readSource: async () => envelope })
      if (!projection || projection.runtime.reason === 'source_unavailable' || signal?.aborted) return null
      return envelope
    } catch { return null }
  }
}
