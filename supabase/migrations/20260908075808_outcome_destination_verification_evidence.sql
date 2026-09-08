-- Reviewed evidence is published through a separately authorized trusted path.
-- The web runtime can read, but cannot manufacture or replace its own proof.
create table outcome_destination_private.verification_evidence (
 workspace_id text not null check (workspace_id ~ '^[A-Za-z0-9:_-]{1,128}$'),
 account_ref text not null check (account_ref ~ '^[A-Za-z0-9:_-]{1,128}$'),
 review_digest text not null check (review_digest ~ '^[a-f0-9]{64}$'),
 assessment text not null check (octet_length(assessment)<=131072 and jsonb_typeof(assessment::jsonb)='object'),
 sources jsonb not null check (jsonb_typeof(sources)='object' and octet_length(sources::text)<=4194304),
 primary key (workspace_id,account_ref,review_digest),
 check (((assessment::jsonb->>'workspaceId')=workspace_id) is true),
 check (((assessment::jsonb->>'accountRef')=account_ref) is true),
 check (((assessment::jsonb->>'reviewDigest')=review_digest) is true),
 check (((assessment::jsonb->'completionAuthority')='false'::jsonb) is true)
);
alter table outcome_destination_private.verification_evidence enable row level security;
alter table outcome_destination_private.verification_evidence force row level security;
revoke all on outcome_destination_private.verification_evidence from public,anon,authenticated,outcome_destination_backend;
grant select on outcome_destination_private.verification_evidence to outcome_destination_backend;
create policy destination_evidence_owner_read on outcome_destination_private.verification_evidence
 for select to outcome_destination_backend
 using (workspace_id=current_setting('outcome.destination_workspace',true) and account_ref=current_setting('outcome.destination_account',true));
