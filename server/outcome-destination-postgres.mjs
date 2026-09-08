import { createHash } from 'node:crypto'
import { types } from 'node:util'

const fields = ['problem','targetUser','outcome','scope','nonGoals','constraints','acceptance','failureRecovery']
const fail = (code = 'destination_invalid') => { throw new Error(code) }
const plain = (value, keys) => {
  if (!value || typeof value !== 'object' || types.isProxy(value) || Object.getPrototypeOf(value) !== Object.prototype) fail()
  const props = Object.getOwnPropertyDescriptors(value)
  if (Reflect.ownKeys(props).some(key => typeof key !== 'string') || Object.keys(props).sort().join(',') !== [...keys].sort().join(',')
    || Object.values(props).some(prop => !prop.enumerable || !Object.hasOwn(prop, 'value'))) fail()
  return Object.fromEntries(keys.map(key => [key, props[key].value]))
}
const safeText = (value, bytes, empty = false) => {
  if (typeof value !== 'string' || (!empty && !value.trim()) || Buffer.byteLength(value) > bytes) fail()
  const normalized = value.normalize('NFKC')
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(normalized)
    || /(?:\/(?:Users|home|private\/tmp|tmp)\/|-----BEGIN .*PRIVATE KEY-----|\b(?:bearer|basic)\s+\S+|\b(?:token|secret|password|api[_ -]?key|credential)\s*[:=]\s*\S+|\b(?:sk|pk|ghp|github_pat|xox[baprs]|vercel|sb_secret)[-_][A-Za-z0-9_-]{8,})/i.test(normalized)) fail()
  return value
}
// A generated private Package may include all 200 bounded discovery answers.
// Reuse the same privacy rules without truncating them to one intake field.
export const validateDestinationPackageText = value => safeText(value, 8388608)
const uuid = value => { if (typeof value !== 'string' || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(value)) fail(); return value }
const scopeOf = input => {
  for (const key of ['workspaceId','accountRef']) if (typeof input[key] !== 'string' || !/^[A-Za-z0-9:_-]{1,128}$/.test(input[key])) fail()
  return [input.workspaceId, input.accountRef, uuid(input.draftId)]
}
export function parseDestinationDraft(serialized) {
  if (typeof serialized !== 'string' || Buffer.byteLength(serialized) > 131072) fail()
  let parsed
  try { parsed = JSON.parse(serialized) } catch { fail() }
  const value = plain(parsed, ['schemaVersion','mode','source','answers','unknowns'])
  if (value.schemaVersion !== 1 || !['guided_200q','brief_gap'].includes(value.mode)) fail()
  safeText(value.source, 65536, true)
  if (!value.answers || Array.isArray(value.answers) || typeof value.answers !== 'object' || Object.keys(value.answers).some(key => !fields.includes(key))) fail()
  const answers = Object.fromEntries(fields.filter(key => Object.hasOwn(value.answers, key)).map(key => [key, safeText(value.answers[key], 16000)]))
  if (!Array.isArray(value.unknowns) || value.unknowns.length > 200) fail()
  const document = { schemaVersion: 1, mode: value.mode, source: value.source, answers, unknowns: value.unknowns.map(item => safeText(item, 2000)) }
  if (Buffer.byteLength(JSON.stringify(document)) > 131072) fail()
  return document
}
const project = row => row ? { draftId: row.draft_id, revision: row.revision, document: row.document, state: 'draft', completionAuthority: false } : null

// The host supplies scope from verified owner identity, never from a browser body.
// This module neither authenticates callers nor creates projects or confirmations.
export function createDestinationDraftRepository({ transact }) {
  if (typeof transact !== 'function') fail()
  const scoped = (scope, operation) => transact(async ({ query }) => {
    await query("select set_config('outcome.destination_workspace',$1,true), set_config('outcome.destination_account',$2,true)", scope.slice(0, 2))
    return operation(query)
  })
  return Object.freeze({
    async load(input) {
      const scope = scopeOf(plain(input, ['workspaceId','accountRef','draftId']))
      return scoped(scope, async query => project((await query('select * from outcome_destination_private.drafts where workspace_id=$1 and account_ref=$2 and draft_id=$3', scope)).rows[0]))
    },
    async save(input) {
      const value = plain(input, ['workspaceId','accountRef','draftId','requestId','expectedRevision','document'])
      const scope = scopeOf(value), requestId = uuid(value.requestId), document = parseDestinationDraft(value.document)
      if (!Number.isSafeInteger(value.expectedRevision) || value.expectedRevision < 0 || value.expectedRevision >= 2147483647) fail()
      const fingerprint = createHash('sha256').update(JSON.stringify([value.expectedRevision, document])).digest('hex')
      return scoped(scope, async query => {
        await query('select pg_advisory_xact_lock(hashtextextended($1,0))', [JSON.stringify(scope)])
        const prior = (await query('select * from outcome_destination_private.drafts where workspace_id=$1 and account_ref=$2 and draft_id=$3 for update', scope)).rows[0]
        if (prior?.last_request_id === requestId) {
          if (prior.request_fingerprint !== fingerprint) fail('destination_request_conflict')
          return project(prior)
        }
        if ((prior?.revision ?? 0) !== value.expectedRevision) fail('destination_revision_conflict')
        const params = [...scope, value.expectedRevision + 1, requestId, fingerprint, JSON.stringify(document)]
        const result = prior
          ? await query('update outcome_destination_private.drafts set revision=$4,last_request_id=$5,request_fingerprint=$6,document=$7 where workspace_id=$1 and account_ref=$2 and draft_id=$3 returning *', params)
          : await query('insert into outcome_destination_private.drafts(workspace_id,account_ref,draft_id,revision,last_request_id,request_fingerprint,document) values($1,$2,$3,$4,$5,$6,$7) returning *', params)
        if (result.rows.length !== 1) fail('destination_unavailable')
        return project(result.rows[0])
      })
    },
  })
}
