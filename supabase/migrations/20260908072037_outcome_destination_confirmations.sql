-- Private request ledger only. This does not create a project or grant execution.
create table outcome_destination_private.confirmations (
 workspace_id text not null, account_ref text not null, draft_id uuid not null,
 request_id uuid not null,
 review_digest text not null check (review_digest ~ '^[a-f0-9]{64}$'),
 evidence_digest text not null check (evidence_digest ~ '^[a-f0-9]{64}$'),
 intake_revision integer not null check (intake_revision > 0),
 context_revision integer not null check (context_revision > 0),
 snapshot jsonb not null check (jsonb_typeof(snapshot)='object' and octet_length(snapshot::text)<=10485760),
 state text not null default 'creation_requested' check (state='creation_requested'),
 completion_authority boolean not null default false check (completion_authority=false),
 execution_authority boolean not null default false check (execution_authority=false),
 primary key (workspace_id,account_ref,draft_id),
 unique (workspace_id,account_ref,request_id),
 foreign key (workspace_id,account_ref,draft_id) references outcome_destination_private.discovery_drafts(workspace_id,account_ref,draft_id)
);
alter table outcome_destination_private.confirmations enable row level security;
alter table outcome_destination_private.confirmations force row level security;
revoke all on outcome_destination_private.confirmations from public,anon,authenticated;
grant select,insert on outcome_destination_private.confirmations to outcome_destination_backend;
create policy destination_confirmation_owner_scope on outcome_destination_private.confirmations
 for all to outcome_destination_backend
 using (workspace_id=current_setting('outcome.destination_workspace',true) and account_ref=current_setting('outcome.destination_account',true))
 with check (workspace_id=current_setting('outcome.destination_workspace',true) and account_ref=current_setting('outcome.destination_account',true));
