begin;

create schema if not exists outcome_private;

create table outcome_private.workspaces (
  id text primary key,
  state text not null check (state in ('active', 'revoked', 'deleting')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table outcome_private.workspace_memberships (
  workspace_id text not null references outcome_private.workspaces(id) on delete cascade,
  identity_subject text not null,
  role text not null check (role = 'owner-viewer'),
  state text not null check (state in ('active', 'revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, identity_subject)
);

create table outcome_private.projects (
  id text primary key,
  package_id text not null unique,
  state text not null check (state in ('active', 'revoked', 'deleting')),
  current_snapshot_id bigint,
  created_at timestamptz not null default now()
);

create table outcome_private.project_bindings (
  workspace_id text not null references outcome_private.workspaces(id) on delete cascade,
  project_id text not null references outcome_private.projects(id) on delete cascade,
  state text not null check (state in ('active', 'revoked')),
  primary key (workspace_id, project_id)
);

create table outcome_private.package_snapshots (
  id bigint generated always as identity primary key,
  workspace_id text not null references outcome_private.workspaces(id) on delete cascade,
  project_id text not null references outcome_private.projects(id) on delete cascade,
  schema_version integer not null check (schema_version = 1),
  source_digest text not null check (source_digest ~ '^[0-9a-f]{64}$'),
  observed_at timestamptz not null,
  captured_at timestamptz not null,
  projection jsonb not null,
  validation_state text not null check (validation_state = 'valid'),
  created_at timestamptz not null default now(),
  unique (project_id, source_digest)
);

alter table outcome_private.projects
  add constraint projects_current_snapshot_fk
  foreign key (current_snapshot_id) references outcome_private.package_snapshots(id);

create table outcome_private.deployment_receipts (
  id bigint generated always as identity primary key,
  snapshot_id bigint not null references outcome_private.package_snapshots(id),
  git_commit text not null,
  git_tree text not null,
  built_asset text not null,
  deployment_id text not null unique,
  deployed_at timestamptz not null
);

create table outcome_private.security_events (
  id bigint generated always as identity primary key,
  workspace_id text references outcome_private.workspaces(id) on delete set null,
  event_type text not null,
  reason_code text,
  provider_category text,
  occurred_at timestamptz not null default now(),
  check (event_type in ('authentication_outcome', 'authorization_denial', 'owner_lifecycle', 'binding_change', 'session_revocation', 'secret_rotation', 'contract_deployed'))
);

create table outcome_private.deletion_jobs (
  id bigint generated always as identity primary key,
  workspace_id text not null references outcome_private.workspaces(id),
  requested_at timestamptz not null,
  access_revoked_at timestamptz not null,
  purge_after timestamptz not null,
  purged_at timestamptz,
  restore_redelete_required boolean not null default true
);

create or replace function outcome_private.outcome_workspace_project_visible(target_workspace text, target_project text)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from outcome_private.workspace_memberships membership
    join outcome_private.project_bindings binding on binding.workspace_id = membership.workspace_id
    where membership.workspace_id = target_workspace
      and binding.project_id = target_project
      and membership.identity_subject = auth.jwt() ->> 'sub'
      and membership.role = 'owner-viewer'
      and membership.state = 'active'
      and binding.state = 'active'
  );
$$;

alter table outcome_private.workspaces enable row level security;
alter table outcome_private.workspaces force row level security;
alter table outcome_private.workspace_memberships enable row level security;
alter table outcome_private.workspace_memberships force row level security;
alter table outcome_private.projects enable row level security;
alter table outcome_private.projects force row level security;
alter table outcome_private.project_bindings enable row level security;
alter table outcome_private.project_bindings force row level security;
alter table outcome_private.package_snapshots enable row level security;
alter table outcome_private.package_snapshots force row level security;
alter table outcome_private.deployment_receipts enable row level security;
alter table outcome_private.deployment_receipts force row level security;
alter table outcome_private.security_events enable row level security;
alter table outcome_private.security_events force row level security;
alter table outcome_private.deletion_jobs enable row level security;
alter table outcome_private.deletion_jobs force row level security;

revoke all on schema outcome_private from public, anon, authenticated;
revoke all on all tables in schema outcome_private from public, anon, authenticated;
grant usage on schema outcome_private to authenticated;
grant select on outcome_private.workspaces, outcome_private.workspace_memberships, outcome_private.projects, outcome_private.project_bindings, outcome_private.package_snapshots, outcome_private.deployment_receipts to authenticated;

create policy workspace_owner_read on outcome_private.workspaces for select to authenticated
using (exists (
  select 1 from outcome_private.workspace_memberships membership
  where membership.workspace_id = id
    and membership.identity_subject = auth.jwt() ->> 'sub'
    and membership.role = 'owner-viewer'
    and membership.state = 'active'
));

create policy membership_self_read on outcome_private.workspace_memberships for select to authenticated
using (identity_subject = auth.jwt() ->> 'sub' and role = 'owner-viewer' and state = 'active');

create policy binding_owner_read on outcome_private.project_bindings for select to authenticated
using (exists (
  select 1 from outcome_private.workspace_memberships membership
  where membership.workspace_id = workspace_id
    and membership.identity_subject = auth.jwt() ->> 'sub'
    and membership.role = 'owner-viewer'
    and membership.state = 'active'
    and outcome_private.project_bindings.state = 'active'
));

create policy project_owner_read on outcome_private.projects for select to authenticated
using (exists (
  select 1 from outcome_private.project_bindings binding
  join outcome_private.workspace_memberships membership on membership.workspace_id = binding.workspace_id
  where binding.project_id = id
    and membership.identity_subject = auth.jwt() ->> 'sub'
    and membership.role = 'owner-viewer'
    and membership.state = 'active'
    and binding.state = 'active'
));

create policy snapshot_owner_read on outcome_private.package_snapshots for select to authenticated
using (outcome_private.outcome_workspace_project_visible(workspace_id, project_id));

create policy receipt_owner_read on outcome_private.deployment_receipts for select to authenticated
using (exists (
  select 1 from outcome_private.package_snapshots snapshot
  where snapshot.id = snapshot_id
    and outcome_private.outcome_workspace_project_visible(snapshot.workspace_id, snapshot.project_id)
));

commit;
