-- Local candidate only; no hosted activation, LOGIN role or worker grant.
create table outcome_destination_private.analysis_requests (
 workspace_id text not null,
 account_ref text not null,
 request_id uuid not null,
 draft_id uuid not null,
 draft_revision integer not null check (draft_revision > 0),
 document_digest text not null check (document_digest ~ '^[a-f0-9]{64}$'),
 document jsonb not null check (jsonb_typeof(document)='object' and octet_length(document::text)<=131072),
 state text not null default 'queued' check (state in ('queued','dispatch_started','completed','failed','delivery_unknown')),
 dispatch_token uuid,
 result jsonb,
 primary key(workspace_id,account_ref,request_id),
 check ((state='queued' and dispatch_token is null) or (state<>'queued' and dispatch_token is not null)),
 check ((state='completed' and result is not null and jsonb_typeof(result)='object' and octet_length(result::text)<=131072) or (state<>'completed' and result is null))
);
revoke all on outcome_destination_private.analysis_requests from public,anon,authenticated;
grant select,insert,update on outcome_destination_private.analysis_requests to outcome_destination_backend;
alter table outcome_destination_private.analysis_requests enable row level security;
alter table outcome_destination_private.analysis_requests force row level security;
create policy analysis_owner_scope on outcome_destination_private.analysis_requests to outcome_destination_backend
 using(workspace_id=current_setting('outcome.destination_workspace',true) and account_ref=current_setting('outcome.destination_account',true))
 with check(workspace_id=current_setting('outcome.destination_workspace',true) and account_ref=current_setting('outcome.destination_account',true));

create function outcome_destination_private.guard_analysis_transition() returns trigger language plpgsql security invoker set search_path=pg_catalog as $$
begin
 if tg_op='DELETE' then raise exception 'analysis_record_immutable'; end if;
 if tg_op='INSERT' then
  if new.state<>'queued' then raise exception 'analysis_invalid_initial_state'; end if;
  return new;
 end if;
 if (new.workspace_id,new.account_ref,new.request_id,new.draft_id,new.draft_revision,new.document_digest,new.document)
    is distinct from (old.workspace_id,old.account_ref,old.request_id,old.draft_id,old.draft_revision,old.document_digest,old.document) then
  raise exception 'analysis_source_immutable';
 end if;
 if old.state='queued' and new.state='dispatch_started' then return new; end if;
 if old.state='dispatch_started' and new.state in ('completed','failed','delivery_unknown') and new.dispatch_token=old.dispatch_token then return new; end if;
 raise exception 'analysis_transition_forbidden';
end $$;
revoke all on function outcome_destination_private.guard_analysis_transition() from public,anon,authenticated;
create trigger analysis_transition before insert or update or delete on outcome_destination_private.analysis_requests
 for each row execute function outcome_destination_private.guard_analysis_transition();
