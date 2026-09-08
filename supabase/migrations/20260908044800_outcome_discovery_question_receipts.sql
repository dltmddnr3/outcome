create table outcome_destination_private.discovery_question_receipts (
 workspace_id text not null, account_ref text not null, draft_id uuid not null,
 context_digest text not null check (context_digest ~ '^[a-f0-9]{64}$'),
 context_revision integer not null check (context_revision > 0),
 binding_version integer not null check (binding_version > 0),
 response_source_digest text not null check (response_source_digest ~ '^[a-f0-9]{64}$'),
 receipt jsonb not null check (jsonb_typeof(receipt)='object' and octet_length(receipt::text)<=131072),
 primary key (workspace_id,account_ref,draft_id,context_digest),
 foreign key (workspace_id,account_ref,draft_id) references outcome_destination_private.discovery_drafts(workspace_id,account_ref,draft_id)
);
alter table outcome_destination_private.discovery_question_receipts enable row level security;
alter table outcome_destination_private.discovery_question_receipts force row level security;
revoke all on outcome_destination_private.discovery_question_receipts from public,anon,authenticated;
grant select,insert on outcome_destination_private.discovery_question_receipts to outcome_destination_backend;
create policy discovery_question_owner_scope on outcome_destination_private.discovery_question_receipts
 for all to outcome_destination_backend
 using (workspace_id=current_setting('outcome.destination_workspace',true) and account_ref=current_setting('outcome.destination_account',true))
 with check (workspace_id=current_setting('outcome.destination_workspace',true) and account_ref=current_setting('outcome.destination_account',true));
