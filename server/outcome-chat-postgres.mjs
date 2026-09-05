import { createHash } from 'node:crypto'
import { types } from 'node:util'

const fail = () => { throw new Error('chat_unavailable') }
const plain = (value, keys) => {
  if (!value || typeof value !== 'object' || Array.isArray(value) || types.isProxy(value) || Object.getPrototypeOf(value) !== Object.prototype) fail()
  const descriptors = Object.getOwnPropertyDescriptors(value)
  if (Reflect.ownKeys(descriptors).some((key) => typeof key !== 'string') || Object.keys(descriptors).sort().join(',') !== [...keys].sort().join(',') || Object.values(descriptors).some((item) => !item.enumerable || !Object.hasOwn(item, 'value'))) fail()
  return Object.fromEntries(keys.map((key) => [key, descriptors[key].value]))
}
const row = (result) => result?.rows?.[0] ?? fail()
const createEventSuffix = (...values) => createHash('sha256').update(values.join('\0')).digest('hex').slice(0, 16)

export function createOutcomeChatTransactionPort({ pool } = {}) {
  if (!pool || typeof pool.connect !== 'function') fail()
  return async (operation) => {
    if (typeof operation !== 'function') fail()
    let client
    try {
      client = await pool.connect(); if (!client || typeof client.query !== 'function' || typeof client.release !== 'function') fail()
      await client.query('BEGIN')
      await client.query('SET LOCAL ROLE outcome_chat_backend')
      const identity = row(await client.query('select session_user, current_user'))
      if (identity.session_user !== 'outcome_chat_runtime' || identity.current_user !== 'outcome_chat_backend') fail()
      const result = await operation({ query: (text, values) => client.query(text, values) })
      await client.query('COMMIT'); return result
    } catch (error) {
      if (client) try { await client.query('ROLLBACK') } catch {}
      if (error instanceof Error && error.message === 'idempotency_conflict') throw error
      fail()
    } finally { if (client) try { client.release() } catch {} }
  }
}

const resultProjection = (value) => ({ accepted: true, sequence: Number(value.sequence), event_id: value.event_id ?? value.message_id, dispatch_state: value.dispatch_state, delivery: value.delivery, execution_started: false, result_attached: false, evidence_attached: false })

export function createOutcomeChatPostgresRepository({ transact } = {}) {
  if (typeof transact !== 'function') fail()
  return Object.freeze({
    async reserve(input) {
      const value = plain(input, ['workspace_id','project_id','binding_version','idempotency_key','request_fingerprint','message','observed_at'])
      return transact(async ({ query }) => {
        const scope = [value.workspace_id, value.project_id, value.binding_version]
        await query('select pg_advisory_xact_lock(hashtextextended($1 || chr(0) || $2 || chr(0) || $3::text, 0))', scope)
        await query(`insert into outcome_private.chat_streams(workspace_id,project_id,role,binding_version,created_at) values($1,$2,'planner',$3,$4) on conflict (workspace_id,project_id,binding_version) do nothing`, [...scope, value.observed_at])
        const prior = (await query('select * from outcome_private.chat_messages where workspace_id=$1 and project_id=$2 and binding_version=$3 and idempotency_key=$4 for update', [...scope, value.idempotency_key])).rows[0]
        if (prior) { if (prior.request_fingerprint !== value.request_fingerprint) throw new Error('idempotency_conflict'); return resultProjection(prior) }
        const allocated = row(await query('update outcome_private.chat_streams set next_sequence=next_sequence+1 where workspace_id=$1 and project_id=$2 and binding_version=$3 returning next_sequence-1 as sequence', scope))
        const eventId = `event-${createEventSuffix(value.workspace_id, value.project_id, value.binding_version, Number(allocated.sequence))}`
        return resultProjection(row(await query(`insert into outcome_private.chat_messages(message_id,workspace_id,project_id,role,binding_version,sequence,idempotency_key,request_fingerprint,private_message,observed_at) values($1,$2,$3,'planner',$4,$5,$6,$7,$8,$9) returning *`, [eventId, value.workspace_id, value.project_id, value.binding_version, allocated.sequence, value.idempotency_key, value.request_fingerprint, value.message, value.observed_at])))
      })
    },
    async timeline(input) {
      const value = plain(input, ['workspace_id','project_id','binding_version','after_sequence'])
      return transact(async ({ query }) => (await query(`select message_id event_id,sequence,observed_at,'user_message' kind,'queued' state,idempotency_key correlation_id,private_message,delivery,dispatch_state
        from outcome_private.chat_messages where workspace_id=$1 and project_id=$2 and binding_version=$3 and sequence>$4 order by sequence asc`, [value.workspace_id,value.project_id,value.binding_version,value.after_sequence])).rows.map((item) => ({ event_id:item.event_id, sequence:Number(item.sequence), observed_at:new Date(item.observed_at).toISOString(), kind:'user_message', state:'queued', correlation_id:item.correlation_id, payload:{private_content:{text:item.private_message}}, delivery:item.delivery, dispatch_state:item.dispatch_state })))
    },
    async claim(input) {
      const value = plain(input, ['consumer_id','claimed_at','lease_expires_at'])
      return transact(async ({ query }) => (await query(`/* ordered_single_lease_claim */ with candidate as (
          select message_id from outcome_private.chat_messages where finalized_at is null and transport_invoked = false
          and dispatch_state = 'not_invoked' and (lease_expires_at is null or lease_expires_at < $2) order by observed_at,sequence for update skip locked limit 1)
        update outcome_private.chat_messages m set consumer_id=$1,claimed_at=$2,lease_expires_at=$3,claim_token='claim-'||substr(md5(m.message_id||$1||$2::text),1,16)
        from candidate where m.message_id=candidate.message_id returning m.message_id,m.claim_token,m.project_id,m.binding_version,m.idempotency_key,m.private_message message`, [value.consumer_id,value.claimed_at,value.lease_expires_at])).rows[0] ?? null)
    },
    async recordIntent(input) { const value=plain(input,['message_id','claim_token','observed_at']); return transact(async({query})=>row(await query(`update outcome_private.chat_messages set dispatch_state='dispatch_intent_recorded',dispatch_intent_at=$3 where message_id=$1 and claim_token=$2 and dispatch_state='not_invoked' and transport_invoked=false returning message_id`,[value.message_id,value.claim_token,value.observed_at]))) },
    async recordInvoked(input) { const value=plain(input,['message_id','claim_token','observed_at']); return transact(async({query})=>row(await query(`update outcome_private.chat_messages set dispatch_state='invoked',transport_invoked = true,transport_invoked_at=$3 where message_id=$1 and claim_token=$2 and dispatch_state='dispatch_intent_recorded' and transport_invoked=false returning message_id`,[value.message_id,value.claim_token,value.observed_at]))) },
    async finalize(input) { const value=plain(input,['message_id','claim_token','delivery','observed_at']); return transact(async({query})=>row(await query(`update outcome_private.chat_messages set delivery=$3,finalized_at=$4 where message_id=$1 and claim_token=$2 and finalized_at is null and ((dispatch_state='invoked' and transport_invoked=true) or (dispatch_state='dispatch_intent_recorded' and transport_invoked=false and $3 in ('rejected','failed'))) returning message_id,delivery`,[value.message_id,value.claim_token,value.delivery,value.observed_at]))) },
  })
}
