import { createHash, randomUUID } from 'node:crypto'
import { isProxy } from 'node:util/types'

const PLAIN = Object.getPrototypeOf({})
const DECISIONS = new Set(['approved', 'rejected'])
const REJECTION_REASONS = new Set(['evidence_insufficient', 'scope_not_authorized', 'superseded_by_newer_observation', 'defer_pending_external_input'])
const ELIGIBLE_ROLES = new Set(['planner', 'builder'])
const ELIGIBLE_STATUSES = new Set(['blocked', 'failed', 'rejected', 'safe_hold'])
const SAFE_ID = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/
const SAFE_NONCE = /^[A-Za-z0-9_-]{24,128}$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

const hash = (value) => createHash('sha256').update(value).digest('hex')
const stable = (value) => JSON.stringify(value, Object.keys(value).sort())
const fail = (code, status) => ({ status, body: { error: code } })
const unavailable = () => { throw new Error('decision_store_unavailable') }

const materialize = (value, seen = new WeakSet()) => {
  if (value === null || typeof value !== 'object') {
    if (['function', 'symbol', 'bigint'].includes(typeof value)) throw new Error('invalid_request')
    return value
  }
  if (isProxy(value) || seen.has(value)) throw new Error('invalid_request')
  seen.add(value)
  const descriptors = Object.getOwnPropertyDescriptors(value)
  if (Object.getOwnPropertySymbols(value).length) throw new Error('invalid_request')
  if (Array.isArray(value)) {
    if (Object.keys(value).length !== value.length) throw new Error('invalid_request')
    const output = value.map((_, index) => {
      const descriptor = descriptors[index]
      if (!descriptor || !Object.hasOwn(descriptor, 'value')) throw new Error('invalid_request')
      return materialize(descriptor.value, seen)
    })
    seen.delete(value)
    return output
  }
  if (Object.getPrototypeOf(value) !== PLAIN) throw new Error('invalid_request')
  const output = {}
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) throw new Error('invalid_request')
    output[key] = materialize(descriptor.value, seen)
  }
  seen.delete(value)
  return output
}

const publicRecord = (row) => Object.freeze({
  decisionState: 'recorded',
  decisionId: row.id,
  decision: row.decision,
  rejectionReason: row.rejection_reason,
  decidedAt: row.decided_at,
  decisionActorClass: 'owner',
  notice: '기록됨 · 전달은 이 범위 밖',
  supersedesId: row.supersedes_id,
  completionAuthority: false,
})

const validate = (value) => {
  let input
  try { input = materialize(value) } catch { return fail('invalid_request', 400) }
  const allowed = new Set(['actorSubject', 'workspaceId', 'decision', 'rejectionReason', 'nonce', 'sourcePrecondition', 'currentSourcePrecondition', 'supersedesId', 'target'])
  if (Object.keys(input).some((key) => !allowed.has(key))) return fail('invalid_request', 400)
  if (!input.target || typeof input.target !== 'object' || Array.isArray(input.target)) return fail('invalid_request', 400)
  const targetKeys = new Set(['projectId', 'state', 'eventId', 'sequence', 'role', 'status', 'sourceRevision'])
  if (Object.keys(input.target).some((key) => !targetKeys.has(key))) return fail('invalid_request', 400)
  if (![input.actorSubject, input.workspaceId, input.target.projectId, input.target.eventId].every((item) => typeof item === 'string' && SAFE_ID.test(item))) return fail('invalid_request', 400)
  if (!Number.isSafeInteger(input.target.sequence) || input.target.sequence < 1 || !/^[a-f0-9]{64}$/.test(input.target.sourceRevision ?? '')) return fail('invalid_request', 400)
  if (!DECISIONS.has(input.decision)) return fail('invalid_decision', 400)
  const reason = input.rejectionReason ?? null
  if ((input.decision === 'rejected' && !REJECTION_REASONS.has(reason)) || (input.decision === 'approved' && reason !== null)) return fail('invalid_rejection_reason', 400)
  if (!SAFE_NONCE.test(input.nonce ?? '') || typeof input.sourcePrecondition !== 'string' || !input.sourcePrecondition || typeof input.currentSourcePrecondition !== 'string' || !input.currentSourcePrecondition) return fail('invalid_request', 400)
  const supersedesId = input.supersedesId ?? null
  if (!(supersedesId === null || typeof supersedesId === 'string' && UUID.test(supersedesId))) return fail('invalid_request', 400)
  return { input: { ...input, rejectionReason: reason, supersedesId } }
}

const validateWithdrawal = (value) => {
  let input
  try { input = materialize(value) } catch { return fail('invalid_request', 400) }
  const allowed = new Set(['actorSubject', 'workspaceId', 'projectId', 'decisionId', 'nonce', 'sourcePrecondition', 'currentSourcePrecondition'])
  if (Object.keys(input).some((key) => !allowed.has(key))) return fail('invalid_request', 400)
  if (![input.actorSubject, input.workspaceId, input.projectId].every((item) => typeof item === 'string' && SAFE_ID.test(item)) || typeof input.decisionId !== 'string' || !UUID.test(input.decisionId) || !SAFE_NONCE.test(input.nonce ?? '') || typeof input.sourcePrecondition !== 'string' || !input.sourcePrecondition || typeof input.currentSourcePrecondition !== 'string' || !input.currentSourcePrecondition) return fail('invalid_request', 400)
  return { input }
}

export function createDecisionRecordService({ store, now = Date.now, identifier = randomUUID } = {}) {
  const transact = async (work) => {
    if (typeof store?.transaction !== 'function') unavailable()
    try { return await store.transaction(work) } catch (error) { if (error?.message?.startsWith('decision_')) throw error; unavailable() }
  }
  return Object.freeze({
    async record(value) {
      const checked = validate(value)
      if (checked.status) return checked
      const input = checked.input
      const nonceDigest = hash(`${input.actorSubject}\n${input.workspaceId}\n${input.nonce}`)
      const requestDigest = hash(stable({ decision: input.decision, eventId: input.target.eventId, nonce: input.nonce, projectId: input.target.projectId, rejectionReason: input.rejectionReason, sequence: input.target.sequence, sourcePrecondition: input.sourcePrecondition, supersedesId: input.supersedesId }))
      return transact(async (tx) => {
        const exact = await tx.replayByRequestDigest(requestDigest)
        if (exact) { await tx.appendAudit({ id: identifier(), outcome: 'duplicate', request_digest: requestDigest, nonce_digest: nonceDigest, recorded_at: new Date(now()).toISOString() }); return { status: exact.status, body: exact.body } }
        if (await tx.replayByNonceDigest(nonceDigest)) { await tx.appendAudit({ id: identifier(), outcome: 'denied_replay', request_digest: requestDigest, nonce_digest: nonceDigest, recorded_at: new Date(now()).toISOString() }); return fail('replay_detected', 409) }
        if (input.sourcePrecondition !== input.currentSourcePrecondition) { await tx.appendAudit({ id: identifier(), outcome: 'denied_stale', request_digest: requestDigest, nonce_digest: nonceDigest, recorded_at: new Date(now()).toISOString() }); return fail('stale_source_revision', 409) }
        if (input.target.state !== 'blocked' || !ELIGIBLE_ROLES.has(input.target.role) || !ELIGIBLE_STATUSES.has(input.target.status)) { await tx.appendAudit({ id: identifier(), outcome: 'denied_ineligible', request_digest: requestDigest, nonce_digest: nonceDigest, recorded_at: new Date(now()).toISOString() }); return fail('decision_target_ineligible', 409) }
        let superseded = null
        if (input.supersedesId) {
          superseded = await tx.decisionById(input.supersedesId)
          if (!superseded || superseded.workspace_id !== input.workspaceId || superseded.project_id !== input.target.projectId || superseded.event_id === input.target.eventId) return fail('decision_relation_invalid', 409)
          if (await tx.successorFor(input.supersedesId)) return fail('decision_already_recorded', 409)
        }
        const existing = await tx.decisionForTarget(input.workspaceId, input.target.projectId, input.target.eventId, input.target.sequence)
        if (existing) { const body = { error: 'decision_already_recorded', completionAuthority: false }; await tx.appendReplay({ request_digest: requestDigest, nonce_digest: nonceDigest, status: 409, body }); await tx.appendAudit({ id: identifier(), outcome: 'denied_already_recorded', request_digest: requestDigest, nonce_digest: nonceDigest, recorded_at: new Date(now()).toISOString() }); return { status: 409, body } }
        const decidedAt = new Date(now()).toISOString()
        const revision = await tx.nextRevision(input.workspaceId, input.target.projectId)
        if (superseded && revision <= superseded.revision) return fail('decision_relation_invalid', 409)
        const record = Object.freeze({ id: identifier(), workspace_id: input.workspaceId, project_id: input.target.projectId, event_id: input.target.eventId, event_sequence: input.target.sequence, source_revision: input.target.sourceRevision, decision: input.decision, rejection_reason: input.rejectionReason, actor_subject: input.actorSubject, actor_class: 'owner', revision, supersedes_id: superseded?.id ?? null, supersedes_revision: superseded?.revision ?? null, tombstoned_at: null, request_digest: requestDigest, nonce_digest: nonceDigest, decided_at: decidedAt })
        const body = publicRecord(record)
        await tx.appendDecision(record)
        await tx.appendReplay({ request_digest: requestDigest, nonce_digest: nonceDigest, status: 201, body })
        await tx.appendAudit({ id: identifier(), outcome: 'accepted', decision_id: record.id, request_digest: requestDigest, nonce_digest: nonceDigest, recorded_at: decidedAt })
        return { status: 201, body }
      })
    },
    async withdraw(value) {
      const checked = validateWithdrawal(value)
      if (checked.status) return checked
      const input = checked.input
      const nonceDigest = hash(`${input.actorSubject}\n${input.workspaceId}\n${input.nonce}`)
      const requestDigest = hash(stable({ decisionId: input.decisionId, nonce: input.nonce, operation: 'withdraw', projectId: input.projectId, sourcePrecondition: input.sourcePrecondition }))
      return transact(async (tx) => {
        const exact = await tx.replayByRequestDigest(requestDigest)
        if (exact) return { status: exact.status, body: exact.body }
        if (await tx.replayByNonceDigest(nonceDigest)) return fail('replay_detected', 409)
        if (input.sourcePrecondition !== input.currentSourcePrecondition) return fail('stale_source_revision', 409)
        const decision = await tx.decisionById(input.decisionId)
        if (!decision || decision.workspace_id !== input.workspaceId || decision.project_id !== input.projectId) return fail('decision_relation_invalid', 409)
        if (await tx.tombstoneFor(input.decisionId)) return fail('decision_already_recorded', 409)
        const body = Object.freeze({ decisionState: 'withdrawn', decisionId: decision.id, completionAuthority: false })
        await tx.appendTombstone({ id: identifier(), workspace_id: input.workspaceId, project_id: input.projectId, decision_id: decision.id, decision_revision: decision.revision, reason_code: 'superseded', receipt_digest: requestDigest, tombstoned_at: new Date(now()).toISOString() })
        await tx.appendReplay({ request_digest: requestDigest, nonce_digest: nonceDigest, status: 201, body })
        return { status: 201, body }
      })
    },
    async list({ actorSubject, workspaceId } = {}) {
      if (typeof actorSubject !== 'string' || typeof workspaceId !== 'string') return fail('invalid_request', 400)
      return transact(async (tx) => ({ status: 200, body: { decisions: (await tx.decisionsForWorkspace(workspaceId)).map(publicRecord), completionAuthority: false } }))
    },
  })
}

export function createInMemoryDecisionRecordStore() {
  const state = { decisions: [], replays: [], audits: [], tombstones: [] }
  let tail = Promise.resolve()
  const copy = () => structuredClone(state)
  return Object.freeze({
    async transaction(work) {
      const previous = tail
      let release
      tail = new Promise((resolve) => { release = resolve })
      await previous
      const before = copy()
      const tx = {
        replayByRequestDigest: async (digest) => state.replays.find((row) => row.request_digest === digest) ?? null,
        replayByNonceDigest: async (digest) => state.replays.find((row) => row.nonce_digest === digest) ?? null,
        decisionForTarget: async (workspaceId, projectId, eventId, sequence) => state.decisions.find((row) => row.workspace_id === workspaceId && row.project_id === projectId && row.event_id === eventId && row.event_sequence === sequence) ?? null,
        decisionById: async (id) => state.decisions.find((row) => row.id === id) ?? null,
        successorFor: async (id) => state.decisions.find((row) => row.supersedes_id === id) ?? null,
        tombstoneFor: async (id) => state.tombstones.find((row) => row.decision_id === id) ?? null,
        nextRevision: async (workspaceId, projectId) => Math.max(0, ...state.decisions.filter((row) => row.workspace_id === workspaceId && row.project_id === projectId).map((row) => row.revision)) + 1,
        appendDecision: async (row) => { state.decisions.push(row) },
        appendReplay: async (row) => { state.replays.push(row) },
        appendAudit: async (row) => { state.audits.push(row) },
        appendTombstone: async (row) => { state.tombstones.push(row) },
        decisionsForWorkspace: async (workspaceId) => state.decisions.filter((row) => row.workspace_id === workspaceId),
      }
      try { return await work(tx) } catch (error) { state.decisions = before.decisions; state.replays = before.replays; state.audits = before.audits; state.tombstones = before.tombstones; throw error } finally { release() }
    },
    snapshot: copy,
  })
}
