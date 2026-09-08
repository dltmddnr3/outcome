// Private adapter boundary: a deterministic read-only fold, not a source
// authenticator, evidence verifier, durable dispatcher or completion authority.
const SCOPE = ['projectId', 'workId', 'runId', 'sessionRef', 'bindingVersion']
const EVENT = ['sequence', 'observedAt', 'stage', 'attempt', 'activity', 'candidateCommit', 'candidateTree', 'evidenceRef', 'nextAction', 'blocker']
const STAGES = ['queued', 'implementing', 'qa_verifying', 'release_verifying', 'awaiting_owner']
const ACTIVITIES = ['running', 'waiting', 'terminal']
const BLOCKERS = ['needs_owner', 'dependency_blocked', 'authority_missing', 'evidence_missing', 'delivery_unknown']
const ACTIONS = ['implementing', 'qa_verifying', 'release_verifying', 'awaiting_owner']
const id = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(value)
const hash = (value, length) => typeof value === 'string' && new RegExp(`^[a-f0-9]{${length}}$`).test(value)
const integer = value => Number.isSafeInteger(value) && value > 0
const exact = (value, keys) => value !== null && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key))
const fail = () => { throw new Error('work_observation_invalid') }
const parse = (text, maxBytes) => {
  if (typeof text !== 'string' || Buffer.byteLength(text) > maxBytes) fail()
  try { return JSON.parse(text) } catch { fail() }
}
const timestamp = value => {
  if (typeof value !== 'string') fail()
  const ms = Date.parse(value)
  if (!Number.isFinite(ms) || new Date(ms).toISOString() !== value) fail()
  return ms
}

// expectedScopeJson must be obtained from the current authorized binding, not
// from the client journal. Neither this function nor a valid hash proves source truth.
export function projectSingleSessionWork(journalJson, expectedScopeJson, nowMs, freshnessMs = 15000, continuationGraceMs = 5000) {
  if (!Number.isSafeInteger(nowMs) || nowMs < 0 || nowMs > 8640000000000000
    || !integer(freshnessMs) || freshnessMs > 300000
    || !integer(continuationGraceMs) || continuationGraceMs > freshnessMs) fail()
  const expected = parse(expectedScopeJson, 2048), journal = parse(journalJson, 262144)
  if (!exact(expected, SCOPE) || !SCOPE.slice(0, -1).every(key => id(expected[key])) || !integer(expected.bindingVersion)
    || !exact(journal, ['schemaVersion', 'scope', 'events']) || journal.schemaVersion !== 1
    || !exact(journal.scope, SCOPE) || !SCOPE.every(key => journal.scope[key] === expected[key])
    || !Array.isArray(journal.events) || journal.events.length > 512) fail()
  let last = null, lastTime = null, terminalSince = null, uniqueSequence = 0
  const seen = new Map()
  for (const event of journal.events) {
    if (!exact(event, EVENT) || !integer(event.sequence) || !integer(event.attempt)
      || !STAGES.includes(event.stage) || !ACTIVITIES.includes(event.activity)
      || !(event.candidateCommit === null && event.candidateTree === null
        || hash(event.candidateCommit, 40) && hash(event.candidateTree, 40))
      || !(event.evidenceRef === null || hash(event.evidenceRef, 64))
      || !(event.nextAction === null || ACTIONS.includes(event.nextAction))
      || !(event.blocker === null || BLOCKERS.includes(event.blocker))
      || event.nextAction !== null && event.blocker !== null
      || event.nextAction !== null && !({implementing:['implementing','qa_verifying'],qa_verifying:['implementing','release_verifying'],release_verifying:['implementing','awaiting_owner']}[event.stage] ?? []).includes(event.nextAction)
      || event.activity !== 'terminal' && (event.nextAction !== null || event.evidenceRef !== null)
      || event.activity === 'running' && event.blocker !== null
      || event.stage === 'queued' && (event.activity !== 'waiting' || event.candidateCommit !== null)
      || event.stage === 'awaiting_owner' && (event.activity !== 'waiting' || event.blocker !== 'needs_owner')
      || ['qa_verifying', 'release_verifying', 'awaiting_owner'].includes(event.stage) && event.candidateCommit === null) fail()
    const observed = timestamp(event.observedAt)
    if (observed > nowMs) fail() // No future timestamps may look fresh.
    const bytes = JSON.stringify(EVENT.map(key => event[key]))
    if (seen.has(event.sequence)) {
      if (seen.get(event.sequence) !== bytes) fail()
      continue // Exact replay never refreshes the observation or terminal age.
    }
    if (event.sequence !== uniqueSequence + 1 || lastTime !== null && observed < lastTime) fail()
    if (!last) {
      if (event.stage !== 'queued' || event.attempt !== 1) fail()
    } else {
      const sameCandidate = event.candidateCommit === last.candidateCommit && event.candidateTree === last.candidateTree
      const sameStage = event.stage === last.stage && event.attempt === last.attempt
      if (sameStage) {
        // A terminal stage cannot silently become active or replace its evidence.
        if (last.activity === 'terminal' && (event.activity !== 'terminal' || !sameCandidate || event.evidenceRef !== last.evidenceRef)) fail()
        if (!sameCandidate && (event.stage !== 'implementing' || last.candidateCommit !== null)) fail()
      } else if (last.stage === 'queued') {
        if (event.stage !== 'implementing' || event.attempt !== 1 || event.activity !== 'running') fail()
      } else {
        if (last.activity !== 'terminal' || last.nextAction !== event.stage || last.blocker !== null || event.activity !== (event.stage === 'awaiting_owner' ? 'waiting' : 'running')) fail()
        if (event.stage === 'implementing') {
          if (event.attempt !== last.attempt + 1 || event.evidenceRef !== null) fail()
        } else {
          const allowed = { implementing: 'qa_verifying', qa_verifying: 'release_verifying', release_verifying: 'awaiting_owner' }
          if (allowed[last.stage] !== event.stage || event.attempt !== last.attempt || !sameCandidate || last.evidenceRef === null) fail()
        }
      }
    }
    if (event.activity === 'terminal') {
      if (last?.activity !== 'terminal' || last.stage !== event.stage || last.attempt !== event.attempt) terminalSince = observed
    } else terminalSince = null
    last = event; lastTime = observed; uniqueSequence = event.sequence; seen.set(event.sequence, bytes)
  }
  const fresh = lastTime !== null && nowMs - lastTime <= freshnessMs
  const missingNext = last?.activity === 'terminal' && last.nextAction === null && last.blocker === null
    && nowMs - terminalSince >= continuationGraceMs
  return Object.freeze({
    schemaVersion: 1,
    stage: last?.stage ?? null,
    activity: fresh ? last.activity : 'unknown',
    freshness: lastTime === null ? 'unobserved' : fresh ? 'fresh' : 'stale',
    observationAgeMs: lastTime === null ? null : nowMs - lastTime,
    verificationMode: 'same-session verification',
    evidenceStatus: last?.evidenceRef ? 'reference_only_unverified' : 'missing',
    continuation: !last ? 'unobserved' : !fresh ? 'observation_stale'
      : last.blocker ?? (missingNext ? 'next_action_missing' : last.nextAction ? 'next_action_recorded' : 'observing'),
    nextAction: fresh ? last?.nextAction ?? null : null,
    completionAuthority: false,
    executionAuthority: false,
  })
}
