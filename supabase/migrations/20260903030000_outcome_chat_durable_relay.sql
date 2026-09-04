begin;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'outcome_chat_backend') then
    create role outcome_chat_backend nologin noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'outcome_chat_runtime') then
    create role outcome_chat_runtime login noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls;
  end if;
end
$$;

alter role outcome_chat_backend nologin noinherit nocreatedb nocreaterole;
alter role outcome_chat_runtime login noinherit nocreatedb nocreaterole;
grant outcome_chat_backend to outcome_chat_runtime with admin false, inherit false, set true;

create table outcome_private.chat_streams (
  workspace_id text not null,
  project_id text not null,
  role text not null check (role = 'planner'),
  binding_version integer not null check (binding_version > 0),
  next_sequence bigint not null default 1 check (next_sequence > 0),
  created_at timestamptz not null,
  primary key (workspace_id, project_id, binding_version),
  foreign key (workspace_id, project_id) references outcome_private.project_bindings(workspace_id, project_id) on delete cascade
);

create table outcome_private.chat_messages (
  message_id text primary key check (message_id ~ '^event-[0-9a-f]{16}$'),
  workspace_id text not null,
  project_id text not null,
  role text not null check (role = 'planner'),
  binding_version integer not null check (binding_version > 0),
  sequence bigint not null check (sequence > 0),
  idempotency_key text not null check (idempotency_key ~ '^message-[0-9a-f]{16}$'),
  request_fingerprint text not null check (request_fingerprint ~ '^[0-9a-f]{64}$'),
  private_message text not null check (length(private_message) between 1 and 16000),
  observed_at timestamptz not null,
  dispatch_state text not null default 'not_invoked' check (dispatch_state in ('not_invoked','dispatch_intent_recorded','invoked')),
  delivery text not null default 'delivery_unknown' check (delivery in ('acknowledged','delivery_unknown','rejected','failed')),
  claim_token text check (claim_token is null or claim_token ~ '^claim-[0-9a-f]{16}$'),
  consumer_id text check (consumer_id is null or consumer_id ~ '^[a-z][a-z0-9-]{1,63}$'),
  claimed_at timestamptz,
  lease_expires_at timestamptz,
  dispatch_intent_at timestamptz,
  transport_invoked boolean not null default false,
  transport_invoked_at timestamptz,
  finalized_at timestamptz,
  execution_started boolean not null default false check (execution_started = false),
  result_attached boolean not null default false check (result_attached = false),
  evidence_attached boolean not null default false check (evidence_attached = false),
  completion_authority boolean not null default false check (completion_authority = false),
  unique (workspace_id, project_id, binding_version, sequence),
  unique (workspace_id, project_id, binding_version, idempotency_key),
  foreign key (workspace_id, project_id, binding_version) references outcome_private.chat_streams(workspace_id, project_id, binding_version) on delete cascade,
  check ((claim_token is null) = (consumer_id is null)),
  check ((claim_token is null) = (claimed_at is null)),
  check ((claim_token is null) = (lease_expires_at is null)),
  check (transport_invoked = (transport_invoked_at is not null)),
  check (transport_invoked = true or finalized_at is null or delivery in ('rejected','failed')),
  check (dispatch_state <> 'not_invoked' or dispatch_intent_at is null),
  check (dispatch_state = 'not_invoked' or dispatch_intent_at is not null)
);

create index chat_messages_ordered_claim on outcome_private.chat_messages(workspace_id, project_id, binding_version, sequence)
  where finalized_at is null;
create index chat_messages_lease on outcome_private.chat_messages(lease_expires_at)
  where transport_invoked = false and finalized_at is null;

alter table outcome_private.chat_streams enable row level security;
alter table outcome_private.chat_streams force row level security;
alter table outcome_private.chat_messages enable row level security;
alter table outcome_private.chat_messages force row level security;

revoke all on schema outcome_private from public, anon, authenticated, outcome_chat_runtime;
revoke all on outcome_private.chat_streams, outcome_private.chat_messages from public, anon, authenticated, outcome_bridge_backend, outcome_bridge_runtime, outcome_chat_backend, outcome_chat_runtime;
revoke all on all sequences in schema outcome_private from outcome_chat_runtime;
alter default privileges in schema outcome_private
  revoke all on tables from public, anon, authenticated, outcome_bridge_backend, outcome_bridge_runtime, outcome_chat_backend, outcome_chat_runtime;
alter default privileges in schema outcome_private
  revoke all on sequences from public, anon, authenticated, outcome_bridge_backend, outcome_bridge_runtime, outcome_chat_backend, outcome_chat_runtime;
alter default privileges in schema outcome_private
  revoke all on functions from public, anon, authenticated, outcome_bridge_backend, outcome_bridge_runtime, outcome_chat_backend, outcome_chat_runtime;
grant usage on schema outcome_private to outcome_chat_backend;
grant select, insert, update on outcome_private.chat_streams, outcome_private.chat_messages to outcome_chat_backend;

create policy chat_backend_streams on outcome_private.chat_streams for all to outcome_chat_backend using (true) with check (true);
create policy chat_backend_messages on outcome_private.chat_messages for all to outcome_chat_backend using (true) with check (true);

do $$
declare backend record; runtime record;
begin
  select * into backend from pg_roles where rolname = 'outcome_chat_backend';
  select * into runtime from pg_roles where rolname = 'outcome_chat_runtime';
  if backend.rolsuper or backend.rolinherit or backend.rolcanlogin or backend.rolcreatedb or backend.rolcreaterole or backend.rolreplication or backend.rolbypassrls then raise exception 'outcome_chat_backend_role_drift'; end if;
  if exists (select 1 from pg_auth_members m where m.member=backend.oid) then raise exception 'outcome_chat_backend_membership_drift'; end if;
  if runtime.rolsuper or runtime.rolinherit or not runtime.rolcanlogin or runtime.rolcreatedb or runtime.rolcreaterole or runtime.rolreplication or runtime.rolbypassrls then raise exception 'outcome_chat_runtime_role_drift'; end if;
  if (select count(*) from pg_auth_members m join pg_roles member on member.oid=m.member join pg_roles granted on granted.oid=m.roleid where member.rolname='outcome_chat_runtime' and granted.rolname='outcome_chat_backend' and not m.admin_option and not m.inherit_option and m.set_option) <> 1 then raise exception 'outcome_chat_runtime_membership_missing'; end if;
  if exists (select 1 from pg_auth_members m join pg_roles member on member.oid=m.member join pg_roles granted on granted.oid=m.roleid where member.rolname='outcome_chat_runtime' and granted.rolname='outcome_chat_backend' and (m.admin_option or m.inherit_option or not m.set_option)) then raise exception 'outcome_chat_runtime_membership_option_drift'; end if;
  if exists (select 1 from pg_auth_members m join pg_roles member on member.oid=m.member join pg_roles granted on granted.oid=m.roleid where member.rolname='outcome_chat_runtime' and granted.rolname<>'outcome_chat_backend') then raise exception 'outcome_chat_runtime_membership_drift'; end if;
end
$$;

commit;
