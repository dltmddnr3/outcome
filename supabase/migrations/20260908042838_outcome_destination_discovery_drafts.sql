-- Private, unconfirmed adaptive discovery. Existing intake drafts are retained.
create table outcome_destination_private.discovery_drafts (
 workspace_id text not null,
 account_ref text not null,
 draft_id uuid not null,
 revision integer not null check (revision > 0),
 intake_revision integer not null check (intake_revision > 0),
 last_request_id uuid not null,
 request_fingerprint text not null check (request_fingerprint ~ '^[a-f0-9]{64}$'),
 context_digest text not null check (context_digest ~ '^[a-f0-9]{64}$'),
 context jsonb not null check (jsonb_typeof(context) = 'object' and octet_length(context::text) <= 8388608),
 state text not null default 'draft' check (state = 'draft'),
 completion_authority boolean not null default false check (completion_authority = false),
 primary key (workspace_id, account_ref, draft_id),
 foreign key (workspace_id, account_ref, draft_id)
  references outcome_destination_private.drafts(workspace_id, account_ref, draft_id)
);
alter table outcome_destination_private.discovery_drafts enable row level security;
alter table outcome_destination_private.discovery_drafts force row level security;
revoke all on outcome_destination_private.discovery_drafts from public, anon, authenticated;
grant select, insert, update on outcome_destination_private.discovery_drafts to outcome_destination_backend;
create policy discovery_owner_scope on outcome_destination_private.discovery_drafts
 for all to outcome_destination_backend
 using (workspace_id = current_setting('outcome.destination_workspace', true)
  and account_ref = current_setting('outcome.destination_account', true))
 with check (workspace_id = current_setting('outcome.destination_workspace', true)
  and account_ref = current_setting('outcome.destination_account', true));
