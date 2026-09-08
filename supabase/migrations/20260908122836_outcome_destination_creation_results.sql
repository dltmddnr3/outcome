-- Private append-only creation claim and publication receipt; no project access
-- grant, session binding, execution authority, or public Data API exposure.
create table outcome_destination_private.creation_claims (
 workspace_id text not null check (workspace_id ~ '^[A-Za-z0-9:_-]{1,128}$'), account_ref text not null check (account_ref ~ '^[A-Za-z0-9:_-]{1,128}$'), draft_id uuid not null,
 request_id uuid not null, claim_id uuid not null,
 review_digest text not null check (review_digest ~ '^[a-f0-9]{64}$'),
 evidence_digest text not null check (evidence_digest ~ '^[a-f0-9]{64}$'),
 claimed_at timestamptz not null default now(),
 primary key (workspace_id,account_ref,draft_id),
 unique (workspace_id,account_ref,draft_id,claim_id),
 foreign key (workspace_id,account_ref,draft_id) references outcome_destination_private.confirmations(workspace_id,account_ref,draft_id)
);
create table outcome_destination_private.creation_results (
 workspace_id text not null check (workspace_id ~ '^[A-Za-z0-9:_-]{1,128}$'), account_ref text not null check (account_ref ~ '^[A-Za-z0-9:_-]{1,128}$'), draft_id uuid not null,
 claim_id uuid not null,
 project_id text not null check (project_id ~ '^destination-[a-f0-9]{64}$'),
 publication_digest text not null check (publication_digest ~ '^[a-f0-9]{64}$'),
 completion_authority boolean not null default false check (completion_authority=false),
 execution_authority boolean not null default false check (execution_authority=false),
 recorded_at timestamptz not null default now(),
 check (project_id='destination-'||encode(sha256(convert_to('["'||workspace_id||'","'||account_ref||'","'||draft_id::text||'"]','UTF8')),'hex')),
 primary key (workspace_id,account_ref,draft_id),
 foreign key (workspace_id,account_ref,draft_id,claim_id) references outcome_destination_private.creation_claims(workspace_id,account_ref,draft_id,claim_id)
);
alter table outcome_destination_private.creation_claims enable row level security;
alter table outcome_destination_private.creation_claims force row level security;
alter table outcome_destination_private.creation_results enable row level security;
alter table outcome_destination_private.creation_results force row level security;
revoke all on outcome_destination_private.creation_claims,outcome_destination_private.creation_results from public,anon,authenticated;
grant select,insert on outcome_destination_private.creation_claims,outcome_destination_private.creation_results to outcome_destination_backend;
create policy creation_claim_owner_scope on outcome_destination_private.creation_claims
 for all to outcome_destination_backend
 using (workspace_id=current_setting('outcome.destination_workspace',true) and account_ref=current_setting('outcome.destination_account',true))
 with check (workspace_id=current_setting('outcome.destination_workspace',true) and account_ref=current_setting('outcome.destination_account',true)
  and exists (select 1 from outcome_destination_private.confirmations c where c.workspace_id=creation_claims.workspace_id and c.account_ref=creation_claims.account_ref and c.draft_id=creation_claims.draft_id and c.request_id=creation_claims.request_id and c.review_digest=creation_claims.review_digest and c.evidence_digest=creation_claims.evidence_digest));
create policy creation_result_owner_scope on outcome_destination_private.creation_results
 for all to outcome_destination_backend
 using (workspace_id=current_setting('outcome.destination_workspace',true) and account_ref=current_setting('outcome.destination_account',true))
 with check (workspace_id=current_setting('outcome.destination_workspace',true) and account_ref=current_setting('outcome.destination_account',true)
  and exists (select 1 from outcome_destination_private.creation_claims c join outcome_destination_private.confirmations f on f.workspace_id=c.workspace_id and f.account_ref=c.account_ref and f.draft_id=c.draft_id and f.request_id=c.request_id and f.review_digest=c.review_digest and f.evidence_digest=c.evidence_digest where c.workspace_id=creation_results.workspace_id and c.account_ref=creation_results.account_ref and c.draft_id=creation_results.draft_id and c.claim_id=creation_results.claim_id));
