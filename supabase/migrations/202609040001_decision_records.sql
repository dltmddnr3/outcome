begin;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'outcome_decision_backend') then
    create role outcome_decision_backend nologin nobypassrls;
  end if;
end
$$;

create table outcome_private.decision_records (
  decision_id uuid primary key,
  workspace_id text not null references outcome_private.workspaces(id),
  project_id text not null,
  event_id text not null check (event_id ~ '^[a-z][a-z0-9]*(?:-[a-z0-9]+){1,7}$'),
  event_sequence bigint not null check (event_sequence > 0),
  source_revision text not null check (source_revision ~ '^[0-9a-f]{64}$'),
  decision text not null check (decision in ('approved','rejected')),
  rejection_reason text check (rejection_reason in ('evidence_insufficient','scope_not_authorized','superseded_by_newer_observation','defer_pending_external_input')),
  actor_subject text not null,
  actor_class text not null check (actor_class = 'owner'),
  revision bigint not null check (revision > 0),
  supersedes_id uuid,
  supersedes_revision bigint,
  request_digest text not null check (request_digest ~ '^[0-9a-f]{64}$'),
  nonce_digest text not null check (nonce_digest ~ '^[0-9a-f]{64}$'),
  decided_at timestamptz not null,
  unique (workspace_id, project_id, event_id, event_sequence),
  unique (workspace_id, project_id, revision),
  unique (decision_id, workspace_id, project_id, revision),
  unique (workspace_id, request_digest),
  unique (workspace_id, nonce_digest),
  foreign key (workspace_id, project_id) references outcome_private.project_bindings(workspace_id, project_id),
  check ((decision = 'rejected') = (rejection_reason is not null)),
  foreign key (supersedes_id, workspace_id, project_id, supersedes_revision)
    references outcome_private.decision_records(decision_id, workspace_id, project_id, revision),
  check ((supersedes_id is null) = (supersedes_revision is null)),
  check (supersedes_id is null or (supersedes_id <> decision_id and supersedes_revision < revision))
);

create unique index decision_records_one_successor on outcome_private.decision_records(supersedes_id) where supersedes_id is not null;

create table outcome_private.decision_request_replay (
  workspace_id text not null references outcome_private.workspaces(id),
  request_digest text not null check (request_digest ~ '^[0-9a-f]{64}$'),
  nonce_digest text not null check (nonce_digest ~ '^[0-9a-f]{64}$'),
  response_status integer not null check (response_status in (201,409)),
  response_body jsonb not null,
  created_at timestamptz not null,
  primary key (workspace_id, request_digest),
  unique (workspace_id, nonce_digest),
  check (jsonb_typeof(response_body) = 'object'),
  check (response_body ? 'completionAuthority' and response_body ->> 'completionAuthority' = 'false')
);

create table outcome_private.decision_audit (
  audit_id uuid primary key,
  workspace_id text not null references outcome_private.workspaces(id),
  project_id text,
  decision_id uuid references outcome_private.decision_records(decision_id),
  request_digest text not null check (request_digest ~ '^[0-9a-f]{64}$'),
  nonce_digest text not null check (nonce_digest ~ '^[0-9a-f]{64}$'),
  outcome_code text not null check (outcome_code in ('accepted','duplicate','denied_replay','denied_stale','denied_ineligible','denied_already_recorded')),
  recorded_at timestamptz not null,
  check ((decision_id is not null) = (outcome_code = 'accepted'))
);

create table outcome_private.decision_tombstones (
  tombstone_id uuid primary key,
  workspace_id text not null references outcome_private.workspaces(id),
  project_id text not null,
  decision_id uuid not null references outcome_private.decision_records(decision_id),
  decision_revision bigint not null check (decision_revision > 0),
  reason_code text not null check (reason_code in ('retention','privacy_request','superseded')),
  receipt_digest text not null check (receipt_digest ~ '^[0-9a-f]{64}$'),
  tombstoned_at timestamptz not null,
  unique (workspace_id, decision_id),
  foreign key (workspace_id, project_id) references outcome_private.project_bindings(workspace_id, project_id),
  foreign key (decision_id, workspace_id, project_id, decision_revision)
    references outcome_private.decision_records(decision_id, workspace_id, project_id, revision)
);

create function outcome_private.reject_decision_history_mutation() returns trigger
language plpgsql security invoker set search_path = pg_catalog, outcome_private as $$
begin
  raise exception 'decision_history_append_only' using errcode = '55000';
end
$$;

create trigger decision_records_append_only before update or delete on outcome_private.decision_records for each row execute function outcome_private.reject_decision_history_mutation();
create trigger decision_replay_append_only before update or delete on outcome_private.decision_request_replay for each row execute function outcome_private.reject_decision_history_mutation();
create trigger decision_audit_append_only before update or delete on outcome_private.decision_audit for each row execute function outcome_private.reject_decision_history_mutation();
create trigger decision_tombstones_append_only before update or delete on outcome_private.decision_tombstones for each row execute function outcome_private.reject_decision_history_mutation();

alter table outcome_private.decision_records enable row level security;
alter table outcome_private.decision_records force row level security;
alter table outcome_private.decision_request_replay enable row level security;
alter table outcome_private.decision_request_replay force row level security;
alter table outcome_private.decision_audit enable row level security;
alter table outcome_private.decision_audit force row level security;
alter table outcome_private.decision_tombstones enable row level security;
alter table outcome_private.decision_tombstones force row level security;

revoke all on outcome_private.decision_records, outcome_private.decision_request_replay, outcome_private.decision_audit, outcome_private.decision_tombstones from public, anon, authenticated, outcome_decision_backend;
grant usage on schema outcome_private to outcome_decision_backend;
grant select, insert on outcome_private.decision_records, outcome_private.decision_request_replay, outcome_private.decision_audit, outcome_private.decision_tombstones to outcome_decision_backend;

create policy decision_backend_records on outcome_private.decision_records for all to outcome_decision_backend using (true) with check (true);
create policy decision_backend_replay on outcome_private.decision_request_replay for all to outcome_decision_backend using (true) with check (true);
create policy decision_backend_audit on outcome_private.decision_audit for all to outcome_decision_backend using (true) with check (true);
create policy decision_backend_tombstones on outcome_private.decision_tombstones for all to outcome_decision_backend using (true) with check (true);

commit;
