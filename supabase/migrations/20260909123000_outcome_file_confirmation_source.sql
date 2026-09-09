-- File confirmation belongs to the original intake, not an optional question
-- session. Existing discovery confirmations already reference the same intake.
-- No new role, grant, policy, execution authority or data rewrite.
begin;
alter table outcome_destination_private.confirmations
 drop constraint confirmations_workspace_id_account_ref_draft_id_fkey;
alter table outcome_destination_private.confirmations
 add constraint confirmations_workspace_id_account_ref_draft_id_fkey
 foreign key (workspace_id,account_ref,draft_id)
 references outcome_destination_private.drafts(workspace_id,account_ref,draft_id);
commit;
