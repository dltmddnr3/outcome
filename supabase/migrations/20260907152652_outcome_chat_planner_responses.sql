begin;

create table outcome_private.chat_planner_responses (
  event_id text primary key check (event_id ~ '^event-[0-9a-f]{16}$'),
  workspace_id text not null,
  project_id text not null,
  binding_version integer not null check (binding_version > 0),
  sequence bigint not null check (sequence > 0),
  source_digest text not null check (source_digest ~ '^[0-9a-f]{64}$'),
  content_digest text not null check (content_digest ~ '^[0-9a-f]{64}$'),
  correlation_id text not null check (correlation_id ~ '^message-[0-9a-f]{16}$'),
  private_message text not null check (length(private_message) between 1 and 4000),
  observed_at timestamptz not null,
  completion_authority boolean not null default false check (completion_authority = false),
  unique (workspace_id,project_id,binding_version,sequence),
  unique (workspace_id,project_id,binding_version,source_digest),
  foreign key (workspace_id,project_id,binding_version,correlation_id)
    references outcome_private.chat_messages(workspace_id,project_id,binding_version,idempotency_key) on delete cascade
);
alter table outcome_private.chat_planner_responses enable row level security;
alter table outcome_private.chat_planner_responses force row level security;
revoke all on outcome_private.chat_planner_responses from public,anon,authenticated,outcome_chat_runtime,outcome_bridge_backend,outcome_bridge_runtime,outcome_chat_backend;
grant select,insert on outcome_private.chat_planner_responses to outcome_chat_backend;
create policy chat_backend_responses on outcome_private.chat_planner_responses for all to outcome_chat_backend using (true) with check (true);

commit;
