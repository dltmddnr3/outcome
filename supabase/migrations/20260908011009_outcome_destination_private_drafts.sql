-- Candidate only. No LOGIN role, membership, public API grant or activation.
create schema outcome_destination_private;
revoke all on schema outcome_destination_private from public, anon, authenticated;
create role outcome_destination_backend nologin noinherit nosuperuser nobypassrls;
grant usage on schema outcome_destination_private to outcome_destination_backend;
create table outcome_destination_private.drafts (
  workspace_id text not null check (length(workspace_id) between 1 and 128),
  account_ref text not null check (length(account_ref) between 1 and 128),
  draft_id uuid not null,
  revision integer not null check (revision > 0),
  last_request_id uuid not null,
  request_fingerprint text not null check (request_fingerprint ~ '^[a-f0-9]{64}$'),
  document jsonb not null check (jsonb_typeof(document) = 'object' and octet_length(document::text) <= 131072),
  primary key (workspace_id, account_ref, draft_id)
);
revoke all on outcome_destination_private.drafts from public, anon, authenticated;
grant select, insert, update on outcome_destination_private.drafts to outcome_destination_backend;
alter table outcome_destination_private.drafts enable row level security;
alter table outcome_destination_private.drafts force row level security;
create policy destination_owner_scope on outcome_destination_private.drafts
  to outcome_destination_backend
  using (workspace_id = current_setting('outcome.destination_workspace', true)
    and account_ref = current_setting('outcome.destination_account', true))
  with check (workspace_id = current_setting('outcome.destination_workspace', true)
    and account_ref = current_setting('outcome.destination_account', true));
