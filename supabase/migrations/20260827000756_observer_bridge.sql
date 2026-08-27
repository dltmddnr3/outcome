begin;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'outcome_bridge_ingest') then
    create role outcome_bridge_ingest nologin nobypassrls;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'outcome_bridge_operations') then
    create role outcome_bridge_operations nologin nobypassrls;
  end if;
end
$$;

create table outcome_private.bridge_enrollment_challenges (
  workspace_id text not null,
  project_id text not null,
  role text not null check (role in ('planner','builder','ux_product_qa','release_audit')),
  binding_version integer not null check (binding_version > 0),
  source_ref text not null check (source_ref ~ '^[a-z][A-Za-z0-9_-]{7,95}$'),
  source_version integer not null check (source_version > 0),
  key_version integer not null check (key_version > 0),
  challenge_digest text primary key check (challenge_digest ~ '^[0-9a-f]{64}$'),
  idempotency_digest text not null check (idempotency_digest ~ '^[0-9a-f]{64}$'),
  state text not null check (state in ('pending','consumed','expired','revoked')),
  issued_at timestamptz not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  revision bigint not null default 1 check (revision > 0),
  foreign key (workspace_id, project_id) references outcome_private.project_bindings(workspace_id, project_id),
  check (expires_at > issued_at),
  check ((state = 'consumed') = (consumed_at is not null)),
  unique (workspace_id, idempotency_digest)
);

create table outcome_private.bridge_sources (
  workspace_id text not null,
  project_id text not null,
  role text not null check (role in ('planner','builder','ux_product_qa','release_audit')),
  binding_version integer not null check (binding_version > 0),
  source_ref text not null check (source_ref ~ '^[a-z][A-Za-z0-9_-]{7,95}$'),
  source_version integer not null check (source_version > 0),
  active_key_version integer not null check (active_key_version > 0),
  certificate_digest text not null check (certificate_digest ~ '^[0-9a-f]{64}$'),
  state text not null check (state in ('active','revoked','replaced','deleted')),
  revision bigint not null check (revision > 0),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  primary key (workspace_id, project_id, role, binding_version, source_ref, source_version),
  foreign key (workspace_id, project_id) references outcome_private.project_bindings(workspace_id, project_id),
  unique (workspace_id, certificate_digest),
  check (updated_at >= created_at)
);

create unique index bridge_sources_one_active_scope
on outcome_private.bridge_sources(workspace_id, project_id, role, binding_version)
where state = 'active';

create table outcome_private.bridge_source_keys (
  workspace_id text not null,
  project_id text not null,
  role text not null,
  binding_version integer not null,
  source_ref text not null,
  source_version integer not null,
  key_version integer not null check (key_version > 0),
  public_key_spki text not null check (public_key_spki ~ '^[A-Za-z0-9_-]+$' and char_length(public_key_spki) between 40 and 256),
  public_key_digest text not null check (public_key_digest ~ '^[0-9a-f]{64}$'),
  state text not null check (state in ('active','revoked','replaced','deleted')),
  created_at timestamptz not null,
  revoked_at timestamptz,
  primary key (workspace_id, project_id, role, binding_version, source_ref, source_version, key_version),
  foreign key (workspace_id, project_id, role, binding_version, source_ref, source_version)
    references outcome_private.bridge_sources(workspace_id, project_id, role, binding_version, source_ref, source_version),
  check ((state = 'revoked') = (revoked_at is not null))
);

create unique index bridge_keys_one_active_source
on outcome_private.bridge_source_keys(workspace_id, project_id, role, binding_version, source_ref, source_version)
where state = 'active';

create table outcome_private.bridge_events (
  event_id bigint generated always as identity primary key,
  workspace_id text not null,
  project_id text not null,
  role text not null,
  binding_version integer not null,
  source_ref text not null,
  source_version integer not null,
  key_version integer not null,
  sequence bigint not null check (sequence > 0),
  ledger_revision bigint not null check (ledger_revision > 0),
  status_code text not null check (status_code in ('기획 진행 중','구현 진행 중','테스트 실행 중','사용성·제품 검수 중','출시 감사 중','결정 대기 중')),
  observed_at timestamptz not null,
  expires_at timestamptz not null,
  event_digest text not null check (event_digest ~ '^[0-9a-f]{64}$'),
  signature_class text not null check (signature_class = 'ed25519_verified'),
  created_at timestamptz not null,
  foreign key (workspace_id, project_id, role, binding_version, source_ref, source_version, key_version)
    references outcome_private.bridge_source_keys(workspace_id, project_id, role, binding_version, source_ref, source_version, key_version),
  check (expires_at > observed_at),
  unique (workspace_id, project_id, role, binding_version, source_ref, source_version, sequence),
  unique (workspace_id, project_id, role, binding_version, source_ref, source_version, ledger_revision),
  unique (workspace_id, event_digest)
);

create table outcome_private.bridge_request_replay (
  workspace_id text not null,
  project_id text not null,
  role text not null,
  binding_version integer not null,
  source_ref text not null,
  source_version integer not null,
  key_version integer not null,
  request_digest text not null check (request_digest ~ '^[0-9a-f]{64}$'),
  nonce_digest text not null check (nonce_digest ~ '^[0-9a-f]{64}$'),
  event_digest text not null check (event_digest ~ '^[0-9a-f]{64}$'),
  outcome_code text not null check (outcome_code in ('accepted','duplicate','conflict','gap','denied')),
  expires_at timestamptz not null,
  created_at timestamptz not null,
  primary key (workspace_id, request_digest),
  unique (workspace_id, nonce_digest),
  foreign key (workspace_id, project_id, role, binding_version, source_ref, source_version, key_version)
    references outcome_private.bridge_source_keys(workspace_id, project_id, role, binding_version, source_ref, source_version, key_version)
);

create table outcome_private.bridge_projections (
  workspace_id text not null,
  project_id text not null,
  role text not null check (role in ('planner','builder','ux_product_qa','release_audit')),
  binding_version integer not null check (binding_version > 0),
  source_ref text not null,
  source_version integer not null check (source_version > 0),
  status_code text check (status_code in ('기획 진행 중','구현 진행 중','테스트 실행 중','사용성·제품 검수 중','출시 감사 중','결정 대기 중')),
  freshness_class text not null check (freshness_class in ('unknown','fresh','stale','offline','conflicting')),
  observed_time_class text not null check (observed_time_class in ('unavailable','current','expired')),
  ledger_revision bigint not null check (ledger_revision >= 0),
  accepted_count bigint not null check (accepted_count >= 0),
  conflict_count bigint not null check (conflict_count >= 0),
  durable_revision bigint not null check (durable_revision >= ledger_revision),
  cache_revision bigint not null check (cache_revision <= durable_revision),
  updated_at timestamptz not null,
  primary key (workspace_id, project_id, role, binding_version),
  foreign key (workspace_id, project_id, role, binding_version, source_ref, source_version)
    references outcome_private.bridge_sources(workspace_id, project_id, role, binding_version, source_ref, source_version)
);

create table outcome_private.bridge_audit (
  audit_id bigint generated always as identity primary key,
  workspace_id text not null,
  project_id text not null,
  role text not null check (role in ('planner','builder','ux_product_qa','release_audit')),
  binding_version integer not null check (binding_version > 0),
  action_code text not null check (action_code in ('challenge_created','source_activated','event_accepted','event_duplicate','event_conflict','source_rotated','source_revoked','ingest_disabled','read_only','restore_verified','retention_purged','tombstone_written')),
  reason_code text not null check (reason_code in ('ok','authorization_denied','expired','replay','conflict','gap','revoked','schema_mismatch','cas_mismatch','retention','operator_action')),
  revision bigint not null check (revision >= 0),
  occurred_at timestamptz not null,
  foreign key (workspace_id, project_id) references outcome_private.project_bindings(workspace_id, project_id)
);

create table outcome_private.bridge_tombstones (
  workspace_id text not null,
  project_id text not null,
  role text not null check (role in ('planner','builder','ux_product_qa','release_audit')),
  binding_version integer not null check (binding_version > 0),
  deletion_revision bigint not null check (deletion_revision > 0),
  purge_before timestamptz not null,
  tombstoned_at timestamptz not null,
  restore_redelete_required boolean not null default true check (restore_redelete_required),
  primary key (workspace_id, project_id, role, binding_version, deletion_revision),
  foreign key (workspace_id, project_id) references outcome_private.project_bindings(workspace_id, project_id),
  check (tombstoned_at >= purge_before)
);

create table outcome_private.bridge_schema_versions (
  workspace_id text primary key references outcome_private.workspaces(id) on delete cascade,
  schema_version integer not null check (schema_version = 1),
  durable_revision bigint not null check (durable_revision >= 0),
  updated_at timestamptz not null
);

alter table outcome_private.bridge_enrollment_challenges enable row level security;
alter table outcome_private.bridge_enrollment_challenges force row level security;
alter table outcome_private.bridge_sources enable row level security;
alter table outcome_private.bridge_sources force row level security;
alter table outcome_private.bridge_source_keys enable row level security;
alter table outcome_private.bridge_source_keys force row level security;
alter table outcome_private.bridge_events enable row level security;
alter table outcome_private.bridge_events force row level security;
alter table outcome_private.bridge_request_replay enable row level security;
alter table outcome_private.bridge_request_replay force row level security;
alter table outcome_private.bridge_projections enable row level security;
alter table outcome_private.bridge_projections force row level security;
alter table outcome_private.bridge_audit enable row level security;
alter table outcome_private.bridge_audit force row level security;
alter table outcome_private.bridge_tombstones enable row level security;
alter table outcome_private.bridge_tombstones force row level security;
alter table outcome_private.bridge_schema_versions enable row level security;
alter table outcome_private.bridge_schema_versions force row level security;

revoke all on outcome_private.bridge_enrollment_challenges, outcome_private.bridge_sources, outcome_private.bridge_source_keys, outcome_private.bridge_events, outcome_private.bridge_request_replay, outcome_private.bridge_projections, outcome_private.bridge_audit, outcome_private.bridge_tombstones, outcome_private.bridge_schema_versions from public, anon, authenticated, outcome_bridge_ingest, outcome_bridge_operations;
revoke all on sequence outcome_private.bridge_events_event_id_seq, outcome_private.bridge_audit_audit_id_seq from public, anon, authenticated, outcome_bridge_ingest, outcome_bridge_operations;
grant usage on schema outcome_private to authenticated, outcome_bridge_ingest, outcome_bridge_operations;
grant select on outcome_private.bridge_projections to authenticated;
grant select, insert, update on outcome_private.bridge_enrollment_challenges, outcome_private.bridge_sources, outcome_private.bridge_source_keys, outcome_private.bridge_projections to outcome_bridge_ingest;
grant select on outcome_private.bridge_schema_versions to outcome_bridge_ingest;
grant select, insert on outcome_private.bridge_events, outcome_private.bridge_request_replay, outcome_private.bridge_audit to outcome_bridge_ingest;
grant usage on sequence outcome_private.bridge_events_event_id_seq, outcome_private.bridge_audit_audit_id_seq to outcome_bridge_ingest;
grant select, insert, update on outcome_private.bridge_sources, outcome_private.bridge_source_keys, outcome_private.bridge_projections to outcome_bridge_operations;
grant select, insert, update on outcome_private.bridge_schema_versions to outcome_bridge_operations;
grant select, insert on outcome_private.bridge_audit, outcome_private.bridge_tombstones to outcome_bridge_operations;
grant usage on sequence outcome_private.bridge_audit_audit_id_seq to outcome_bridge_operations;
grant delete on outcome_private.bridge_enrollment_challenges, outcome_private.bridge_source_keys, outcome_private.bridge_events, outcome_private.bridge_request_replay, outcome_private.bridge_projections to outcome_bridge_operations;

create policy bridge_projection_owner_read on outcome_private.bridge_projections for select to authenticated
using (outcome_private.outcome_workspace_project_visible(workspace_id, project_id));

create policy bridge_ingest_challenge_all on outcome_private.bridge_enrollment_challenges for all to outcome_bridge_ingest
using (workspace_id = current_setting('outcome.bridge.workspace_id', true) and project_id = current_setting('outcome.bridge.project_id', true))
with check (workspace_id = current_setting('outcome.bridge.workspace_id', true) and project_id = current_setting('outcome.bridge.project_id', true));
create policy bridge_ingest_source_all on outcome_private.bridge_sources for all to outcome_bridge_ingest
using (workspace_id = current_setting('outcome.bridge.workspace_id', true) and project_id = current_setting('outcome.bridge.project_id', true))
with check (workspace_id = current_setting('outcome.bridge.workspace_id', true) and project_id = current_setting('outcome.bridge.project_id', true));
create policy bridge_ingest_key_all on outcome_private.bridge_source_keys for all to outcome_bridge_ingest
using (workspace_id = current_setting('outcome.bridge.workspace_id', true) and project_id = current_setting('outcome.bridge.project_id', true))
with check (workspace_id = current_setting('outcome.bridge.workspace_id', true) and project_id = current_setting('outcome.bridge.project_id', true));
create policy bridge_ingest_event_insert on outcome_private.bridge_events for insert to outcome_bridge_ingest
with check (workspace_id = current_setting('outcome.bridge.workspace_id', true) and project_id = current_setting('outcome.bridge.project_id', true));
create policy bridge_ingest_event_read on outcome_private.bridge_events for select to outcome_bridge_ingest
using (workspace_id = current_setting('outcome.bridge.workspace_id', true) and project_id = current_setting('outcome.bridge.project_id', true));
create policy bridge_ingest_replay_insert on outcome_private.bridge_request_replay for insert to outcome_bridge_ingest
with check (workspace_id = current_setting('outcome.bridge.workspace_id', true) and project_id = current_setting('outcome.bridge.project_id', true));
create policy bridge_ingest_replay_read on outcome_private.bridge_request_replay for select to outcome_bridge_ingest
using (workspace_id = current_setting('outcome.bridge.workspace_id', true) and project_id = current_setting('outcome.bridge.project_id', true));
create policy bridge_ingest_projection_all on outcome_private.bridge_projections for all to outcome_bridge_ingest
using (workspace_id = current_setting('outcome.bridge.workspace_id', true) and project_id = current_setting('outcome.bridge.project_id', true))
with check (workspace_id = current_setting('outcome.bridge.workspace_id', true) and project_id = current_setting('outcome.bridge.project_id', true));
create policy bridge_ingest_audit_insert on outcome_private.bridge_audit for insert to outcome_bridge_ingest
with check (workspace_id = current_setting('outcome.bridge.workspace_id', true) and project_id = current_setting('outcome.bridge.project_id', true));
create policy bridge_ingest_audit_read on outcome_private.bridge_audit for select to outcome_bridge_ingest
using (workspace_id = current_setting('outcome.bridge.workspace_id', true) and project_id = current_setting('outcome.bridge.project_id', true));

create policy bridge_operations_source_all on outcome_private.bridge_sources for all to outcome_bridge_operations
using (workspace_id = current_setting('outcome.bridge.workspace_id', true) and project_id = current_setting('outcome.bridge.project_id', true))
with check (workspace_id = current_setting('outcome.bridge.workspace_id', true) and project_id = current_setting('outcome.bridge.project_id', true));
create policy bridge_operations_key_all on outcome_private.bridge_source_keys for all to outcome_bridge_operations
using (workspace_id = current_setting('outcome.bridge.workspace_id', true) and project_id = current_setting('outcome.bridge.project_id', true))
with check (workspace_id = current_setting('outcome.bridge.workspace_id', true) and project_id = current_setting('outcome.bridge.project_id', true));
create policy bridge_operations_projection_all on outcome_private.bridge_projections for all to outcome_bridge_operations
using (workspace_id = current_setting('outcome.bridge.workspace_id', true) and project_id = current_setting('outcome.bridge.project_id', true))
with check (workspace_id = current_setting('outcome.bridge.workspace_id', true) and project_id = current_setting('outcome.bridge.project_id', true));
create policy bridge_operations_audit_insert on outcome_private.bridge_audit for insert to outcome_bridge_operations
with check (workspace_id = current_setting('outcome.bridge.workspace_id', true) and project_id = current_setting('outcome.bridge.project_id', true));
create policy bridge_operations_tombstone_insert on outcome_private.bridge_tombstones for insert to outcome_bridge_operations
with check (workspace_id = current_setting('outcome.bridge.workspace_id', true) and project_id = current_setting('outcome.bridge.project_id', true));
create policy bridge_operations_purge_challenge on outcome_private.bridge_enrollment_challenges for delete to outcome_bridge_operations
using (workspace_id = current_setting('outcome.bridge.workspace_id', true) and project_id = current_setting('outcome.bridge.project_id', true));
create policy bridge_operations_purge_key on outcome_private.bridge_source_keys for delete to outcome_bridge_operations
using (workspace_id = current_setting('outcome.bridge.workspace_id', true) and project_id = current_setting('outcome.bridge.project_id', true));
create policy bridge_operations_purge_event on outcome_private.bridge_events for delete to outcome_bridge_operations
using (workspace_id = current_setting('outcome.bridge.workspace_id', true) and project_id = current_setting('outcome.bridge.project_id', true));
create policy bridge_operations_purge_replay on outcome_private.bridge_request_replay for delete to outcome_bridge_operations
using (workspace_id = current_setting('outcome.bridge.workspace_id', true) and project_id = current_setting('outcome.bridge.project_id', true));
create policy bridge_operations_purge_projection on outcome_private.bridge_projections for delete to outcome_bridge_operations
using (workspace_id = current_setting('outcome.bridge.workspace_id', true) and project_id = current_setting('outcome.bridge.project_id', true));
create policy bridge_ingest_schema_read on outcome_private.bridge_schema_versions for select to outcome_bridge_ingest
using (workspace_id = current_setting('outcome.bridge.workspace_id', true));
create policy bridge_operations_schema_all on outcome_private.bridge_schema_versions for all to outcome_bridge_operations
using (workspace_id = current_setting('outcome.bridge.workspace_id', true))
with check (workspace_id = current_setting('outcome.bridge.workspace_id', true));

commit;
