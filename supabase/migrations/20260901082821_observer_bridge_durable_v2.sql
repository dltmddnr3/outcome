begin;

do $$
declare backend record;
begin
  select * into backend from pg_roles where rolname = 'outcome_bridge_backend';
  if not found or backend.rolsuper or backend.rolinherit = false or backend.rolcreaterole
    or backend.rolcreatedb or backend.rolcanlogin or backend.rolreplication or backend.rolbypassrls then
    raise exception 'outcome_bridge_backend_v1_role_drift';
  end if;
  if exists (
    select 1 from pg_auth_members membership
    join pg_roles member on member.oid = membership.member
    where member.rolname = 'outcome_bridge_backend'
  ) then raise exception 'outcome_bridge_backend_membership_drift'; end if;
  if exists (select 1 from pg_roles where rolname = 'outcome_bridge_runtime') then
    raise exception 'outcome_bridge_runtime_preexisting';
  end if;
  if exists (select 1 from outcome_private.bridge_enrollment_challenges)
    or exists (select 1 from outcome_private.bridge_request_replay) then
    raise exception 'outcome_bridge_v1_incompatible_rows';
  end if;
end
$$;

alter role outcome_bridge_backend noinherit;
create role outcome_bridge_runtime login noinherit nocreatedb nocreaterole noreplication nobypassrls;
grant outcome_bridge_backend to outcome_bridge_runtime;

alter table outcome_private.bridge_enrollment_challenges
  add column challenge_ref text unique check (challenge_ref is null or challenge_ref ~ '^[a-z][A-Za-z0-9_-]{7,95}$'),
  add column challenge_nonce text check (challenge_nonce is null or challenge_nonce ~ '^nonce_[A-Za-z0-9_-]{24}$'),
  add column enrollment_mode text check (enrollment_mode is null or enrollment_mode in ('enroll','rotate')),
  add column completion_request_digest text check (completion_request_digest is null or completion_request_digest ~ '^[0-9a-f]{64}$'),
  add column completion_certificate_ciphertext bytea,
  add column completion_certificate_nonce bytea,
  add column completion_certificate_tag bytea,
  add column completion_recovery_key_version integer check (completion_recovery_key_version is null or completion_recovery_key_version = 1),
  add column completion_source_version integer check (completion_source_version is null or completion_source_version > 0),
  add column completion_key_version integer check (completion_key_version is null or completion_key_version > 0),
  add column completion_ledger_revision bigint check (completion_ledger_revision is null or completion_ledger_revision > 0),
  add constraint bridge_challenge_private_material_complete check (
    (challenge_ref is null) = (challenge_nonce is null)
  ),
  add constraint bridge_completion_carrier_complete check (
    (completion_request_digest is null) = (completion_certificate_ciphertext is null)
    and (completion_request_digest is null) = (completion_certificate_nonce is null)
    and (completion_request_digest is null) = (completion_certificate_tag is null)
    and (completion_request_digest is null) = (completion_recovery_key_version is null)
    and (completion_request_digest is null) = (completion_source_version is null)
    and (completion_request_digest is null) = (completion_key_version is null)
    and (completion_request_digest is null) = (completion_ledger_revision is null)
  );

alter table outcome_private.bridge_enrollment_challenges
  alter column enrollment_mode set not null,
  add constraint bridge_pending_challenge_material check (state <> 'pending' or challenge_ref is not null);

alter table outcome_private.bridge_request_replay
  add column response_ledger_revision bigint not null check (response_ledger_revision > 0);

create table outcome_private.bridge_viewer_registrations (
  workspace_id text not null,
  project_id text not null,
  account_ref text not null check (account_ref ~ '^[0-9a-f]{64}$'),
  viewer_ref text not null check (viewer_ref ~ '^[a-z][A-Za-z0-9_-]{7,95}$'),
  viewer_class text not null check (viewer_class in ('workstation','remote_device')),
  state text not null check (state in ('active','revoked')),
  registration_idempotency_digest text not null check (registration_idempotency_digest ~ '^[0-9a-f]{64}$'),
  registration_fingerprint text not null check (registration_fingerprint ~ '^[0-9a-f]{64}$'),
  revocation_idempotency_digest text check (revocation_idempotency_digest is null or revocation_idempotency_digest ~ '^[0-9a-f]{64}$'),
  revocation_fingerprint text check (revocation_fingerprint is null or revocation_fingerprint ~ '^[0-9a-f]{64}$'),
  revision bigint not null check (revision > 0),
  created_at timestamptz not null,
  revoked_at timestamptz,
  primary key (workspace_id, project_id, account_ref, viewer_ref),
  foreign key (workspace_id, project_id) references outcome_private.project_bindings(workspace_id, project_id),
  check ((state = 'revoked') = (revoked_at is not null)),
  check ((revocation_idempotency_digest is null) = (revocation_fingerprint is null))
);

create unique index bridge_viewers_one_active_ref
on outcome_private.bridge_viewer_registrations(workspace_id, project_id, viewer_ref)
where state = 'active';
create unique index bridge_viewers_one_active_class
on outcome_private.bridge_viewer_registrations(workspace_id, project_id, account_ref, viewer_class)
where state = 'active';
create unique index bridge_viewers_registration_idempotency
on outcome_private.bridge_viewer_registrations(workspace_id, project_id, account_ref, registration_idempotency_digest);
create unique index bridge_viewers_revocation_idempotency
on outcome_private.bridge_viewer_registrations(workspace_id, project_id, account_ref, revocation_idempotency_digest)
where revocation_idempotency_digest is not null;

create table outcome_private.bridge_rate_windows (
  workspace_id text not null,
  certificate_digest text not null check (certificate_digest ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count between 0 and 60),
  revision bigint not null check (revision > 0),
  primary key (workspace_id, certificate_digest),
  foreign key (workspace_id, certificate_digest) references outcome_private.bridge_sources(workspace_id, certificate_digest)
);
create index bridge_rate_windows_certificate_digest on outcome_private.bridge_rate_windows(certificate_digest);

alter table outcome_private.bridge_viewer_registrations enable row level security;
alter table outcome_private.bridge_viewer_registrations force row level security;
alter table outcome_private.bridge_rate_windows enable row level security;
alter table outcome_private.bridge_rate_windows force row level security;

revoke select on outcome_private.bridge_projections from authenticated;
drop policy bridge_projection_owner_read on outcome_private.bridge_projections;
revoke all on outcome_private.bridge_viewer_registrations, outcome_private.bridge_rate_windows from public, anon, authenticated, outcome_bridge_backend, outcome_bridge_runtime;
revoke all on all tables in schema outcome_private from outcome_bridge_runtime;
revoke all on all sequences in schema outcome_private from outcome_bridge_runtime;
revoke all on schema outcome_private from outcome_bridge_runtime;

grant select, insert, update on outcome_private.bridge_viewer_registrations to outcome_bridge_backend;
grant select, insert, update, delete on outcome_private.bridge_rate_windows to outcome_bridge_backend;
create policy bridge_backend_viewer_registration on outcome_private.bridge_viewer_registrations
for all to outcome_bridge_backend using (true) with check (true);
create policy bridge_backend_rate_window on outcome_private.bridge_rate_windows
for all to outcome_bridge_backend using (true) with check (true);

alter table outcome_private.bridge_schema_versions drop constraint bridge_schema_versions_schema_version_check;
alter table outcome_private.bridge_schema_versions add constraint bridge_schema_versions_schema_version_check check (schema_version = 2);
update outcome_private.bridge_schema_versions set schema_version = 2, updated_at = statement_timestamp() where schema_version = 1;

do $$
declare backend record; runtime record;
begin
  select * into backend from pg_roles where rolname = 'outcome_bridge_backend';
  select * into runtime from pg_roles where rolname = 'outcome_bridge_runtime';
  if backend.rolsuper or backend.rolinherit or backend.rolcreaterole or backend.rolcreatedb
    or backend.rolcanlogin or backend.rolreplication or backend.rolbypassrls then
    raise exception 'outcome_bridge_backend_v2_role_drift';
  end if;
  if runtime.rolsuper or runtime.rolinherit or runtime.rolcreaterole or runtime.rolcreatedb
    or not runtime.rolcanlogin or runtime.rolreplication or runtime.rolbypassrls then
    raise exception 'outcome_bridge_runtime_role_drift';
  end if;
  if (select count(*) from pg_auth_members membership
      join pg_roles member on member.oid = membership.member
      join pg_roles granted on granted.oid = membership.roleid
      where member.rolname = 'outcome_bridge_runtime' and granted.rolname = 'outcome_bridge_backend') <> 1 then
    raise exception 'outcome_bridge_runtime_membership_missing';
  end if;
  if exists (select 1 from pg_auth_members membership
      join pg_roles member on member.oid = membership.member
      join pg_roles granted on granted.oid = membership.roleid
      where member.rolname = 'outcome_bridge_runtime' and granted.rolname <> 'outcome_bridge_backend') then
    raise exception 'outcome_bridge_runtime_membership_drift';
  end if;
end
$$;

commit;
