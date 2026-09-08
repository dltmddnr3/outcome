create table outcome_destination_private.discovery_question_requests (
 workspace_id text not null,account_ref text not null,draft_id uuid not null,
 context_digest text not null check(context_digest ~ '^[a-f0-9]{64}$'),
 context_revision integer not null check(context_revision>0),
 request_id uuid not null,
 state text not null default 'queued' check(state in ('queued','dispatch_started','completed','failed','delivery_unknown')),
 dispatch_token uuid,
 primary key(workspace_id,account_ref,draft_id,context_digest),
 unique(workspace_id,account_ref,request_id),
 foreign key(workspace_id,account_ref,draft_id) references outcome_destination_private.discovery_drafts(workspace_id,account_ref,draft_id),
 check((state='queued' and dispatch_token is null) or (state<>'queued' and dispatch_token is not null))
);
alter table outcome_destination_private.discovery_question_requests enable row level security;
alter table outcome_destination_private.discovery_question_requests force row level security;
revoke all on outcome_destination_private.discovery_question_requests from public,anon,authenticated;
grant select,insert,update on outcome_destination_private.discovery_question_requests to outcome_destination_backend;
create policy discovery_request_owner_scope on outcome_destination_private.discovery_question_requests
 for all to outcome_destination_backend
 using(workspace_id=current_setting('outcome.destination_workspace',true) and account_ref=current_setting('outcome.destination_account',true))
 with check(workspace_id=current_setting('outcome.destination_workspace',true) and account_ref=current_setting('outcome.destination_account',true));
create function outcome_destination_private.guard_discovery_question_request() returns trigger
 language plpgsql security invoker set search_path=pg_catalog as $$
begin
 if TG_OP='INSERT' then
  if new.state<>'queued' or new.dispatch_token is not null then raise exception 'question_transition_forbidden'; end if;
 else
  if (new.workspace_id,new.account_ref,new.draft_id,new.context_digest,new.context_revision,new.request_id)
   is distinct from (old.workspace_id,old.account_ref,old.draft_id,old.context_digest,old.context_revision,old.request_id)
   then raise exception 'question_source_immutable'; end if;
  if not ((old.state='queued' and new.state='dispatch_started' and new.dispatch_token is not null)
   or (old.state='dispatch_started' and new.state in ('completed','failed','delivery_unknown') and new.dispatch_token=old.dispatch_token))
   then raise exception 'question_transition_forbidden'; end if;
 end if;
 if new.state='completed' and not exists(select 1 from outcome_destination_private.discovery_question_receipts r
  where r.workspace_id=new.workspace_id and r.account_ref=new.account_ref and r.draft_id=new.draft_id and r.context_digest=new.context_digest and r.context_revision=new.context_revision)
  then raise exception 'question_receipt_required'; end if;
 return new;
end $$;
revoke all on function outcome_destination_private.guard_discovery_question_request() from public,anon,authenticated;
create trigger discovery_question_request_guard before insert or update on outcome_destination_private.discovery_question_requests
 for each row execute function outcome_destination_private.guard_discovery_question_request();
