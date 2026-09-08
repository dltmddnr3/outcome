// The trusted authenticated handler supplies scope; never use browser-owned selectors.
const unavailable = () => { throw new Error('decision_store_unavailable') }
const iso = (value) => value instanceof Date ? value.toISOString() : value
const decision = (row) => row ? { ...row, id: row.decision_id, event_sequence: Number(row.event_sequence), revision: Number(row.revision), supersedes_revision: row.supersedes_revision === null ? null : Number(row.supersedes_revision), decided_at: iso(row.decided_at) } : null

export function createDecisionTransactionPort({ pool } = {}) {
  if (!pool || typeof pool.connect !== 'function') unavailable()
  return async (work) => {
    if (typeof work !== 'function') unavailable()
    let client
    try {
      client = await pool.connect()
      if (!client || typeof client.query !== 'function' || typeof client.release !== 'function') unavailable()
      await client.query('BEGIN')
      await client.query('SET LOCAL ROLE outcome_decision_backend')
      const identity = (await client.query('select session_user, current_user')).rows[0]
      if (identity?.session_user !== 'outcome_decision_runtime' || identity?.current_user !== 'outcome_decision_backend') unavailable()
      const result = await work({ query: (sql, args) => client.query(sql, args) })
      await client.query('COMMIT')
      return result
    } catch {
      if (client) try { await client.query('ROLLBACK') } catch {}
      unavailable()
    } finally {
      if (client) try { client.release() } catch {}
    }
  }
}

export function createDecisionPostgresStore({ transact, workspaceId, projectId, now = Date.now } = {}) {
  if (typeof transact !== 'function' || ![workspaceId, projectId].every((id) => typeof id === 'string' && /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/.test(id))) unavailable()
  const scope = (workspace, project = projectId) => { if (workspace !== workspaceId || project !== projectId) unavailable() }
  return Object.freeze({
    async transaction(work) {
      return transact(async ({ query }) => {
        // Workspace-wide because nonce/replay uniqueness spans projects.
        await query('select pg_advisory_xact_lock(hashtextextended($1::text, 0))', [`decision:${workspaceId}`])
        const one = async (sql, values) => (await query(sql, values)).rows[0] ?? null
        return work({
          replayByRequestDigest: async (digest) => { const row = await one('select response_status, response_body from outcome_private.decision_request_replay where workspace_id=$1 and request_digest=$2', [workspaceId, digest]); return row ? { status: row.response_status, body: row.response_body } : null },
          replayByNonceDigest: (digest) => one('select request_digest from outcome_private.decision_request_replay where workspace_id=$1 and nonce_digest=$2', [workspaceId, digest]),
          decisionForTarget: async (workspace, project, event, sequence) => { scope(workspace, project); return decision(await one('select * from outcome_private.decision_records where workspace_id=$1 and project_id=$2 and event_id=$3 and event_sequence=$4', [workspaceId, projectId, event, sequence])) },
          decisionById: async (id) => decision(await one('select * from outcome_private.decision_records where workspace_id=$1 and project_id=$2 and decision_id=$3', [workspaceId, projectId, id])),
          successorFor: (id) => one('select decision_id from outcome_private.decision_records where workspace_id=$1 and project_id=$2 and supersedes_id=$3', [workspaceId, projectId, id]),
          tombstoneFor: (id) => one('select tombstone_id from outcome_private.decision_tombstones where workspace_id=$1 and project_id=$2 and decision_id=$3', [workspaceId, projectId, id]),
          nextRevision: async (workspace, project) => { scope(workspace, project); return Number((await one('select coalesce(max(revision),0)+1 as revision from outcome_private.decision_records where workspace_id=$1 and project_id=$2', [workspaceId, projectId])).revision) },
          appendDecision: async (row) => {
            scope(row.workspace_id, row.project_id)
            await query(`insert into outcome_private.decision_records(decision_id,workspace_id,project_id,event_id,event_sequence,source_revision,decision,rejection_reason,actor_subject,actor_class,revision,supersedes_id,supersedes_revision,request_digest,nonce_digest,decided_at)
              values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`, [row.id,workspaceId,projectId,row.event_id,row.event_sequence,row.source_revision,row.decision,row.rejection_reason,row.actor_subject,row.actor_class,row.revision,row.supersedes_id,row.supersedes_revision,row.request_digest,row.nonce_digest,row.decided_at])
          },
          appendReplay: (row) => query('insert into outcome_private.decision_request_replay(workspace_id,request_digest,nonce_digest,response_status,response_body,created_at) values($1,$2,$3,$4,$5,$6)', [workspaceId,row.request_digest,row.nonce_digest,row.status,JSON.stringify(row.body),new Date(now()).toISOString()]),
          appendAudit: (row) => query('insert into outcome_private.decision_audit(audit_id,workspace_id,project_id,decision_id,request_digest,nonce_digest,outcome_code,recorded_at) values($1,$2,$3,$4,$5,$6,$7,$8)', [row.id,workspaceId,projectId,row.decision_id ?? null,row.request_digest,row.nonce_digest,row.outcome,row.recorded_at]),
          appendTombstone: async (row) => { scope(row.workspace_id,row.project_id); await query('insert into outcome_private.decision_tombstones(tombstone_id,workspace_id,project_id,decision_id,decision_revision,reason_code,receipt_digest,tombstoned_at) values($1,$2,$3,$4,$5,$6,$7,$8)', [row.id,workspaceId,projectId,row.decision_id,row.decision_revision,row.reason_code,row.receipt_digest,row.tombstoned_at]) },
          decisionsForWorkspace: async (workspace) => { scope(workspace); return (await query('select * from outcome_private.decision_records where workspace_id=$1 and project_id=$2 order by revision', [workspaceId,projectId])).rows.map(decision) },
        })
      })
    },
  })
}
