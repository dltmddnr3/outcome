begin;

revoke insert on outcome_private.bridge_schema_versions
from public, anon, authenticated, outcome_bridge_runtime;
grant insert on outcome_private.bridge_schema_versions to outcome_bridge_backend;

do $$
declare backend record; runtime record;
begin
  select * into backend from pg_roles where rolname = 'outcome_bridge_backend';
  select * into runtime from pg_roles where rolname = 'outcome_bridge_runtime';
  if not found or backend.rolsuper or backend.rolinherit or backend.rolcreaterole
    or backend.rolcreatedb or backend.rolcanlogin or backend.rolreplication or backend.rolbypassrls then
    raise exception 'outcome_bridge_backend_bootstrap_role_drift';
  end if;
  if runtime.rolsuper or runtime.rolinherit or runtime.rolcreaterole or runtime.rolcreatedb
    or not runtime.rolcanlogin or runtime.rolreplication or runtime.rolbypassrls then
    raise exception 'outcome_bridge_runtime_bootstrap_role_drift';
  end if;
  if (select count(*) from pg_auth_members membership
      join pg_roles member on member.oid = membership.member
      join pg_roles granted on granted.oid = membership.roleid
      where member.rolname = 'outcome_bridge_runtime' and granted.rolname = 'outcome_bridge_backend') <> 1
    or exists (select 1 from pg_auth_members membership
      join pg_roles member on member.oid = membership.member
      join pg_roles granted on granted.oid = membership.roleid
      where member.rolname = 'outcome_bridge_runtime' and granted.rolname <> 'outcome_bridge_backend') then
    raise exception 'outcome_bridge_runtime_bootstrap_membership_drift';
  end if;
  if not has_table_privilege('outcome_bridge_backend', 'outcome_private.bridge_schema_versions', 'select')
    or not has_table_privilege('outcome_bridge_backend', 'outcome_private.bridge_schema_versions', 'insert')
    or not has_table_privilege('outcome_bridge_backend', 'outcome_private.bridge_schema_versions', 'update')
    or has_table_privilege('outcome_bridge_backend', 'outcome_private.bridge_schema_versions', 'delete')
    or has_table_privilege('outcome_bridge_backend', 'outcome_private.bridge_schema_versions', 'truncate')
    or has_table_privilege('outcome_bridge_backend', 'outcome_private.bridge_schema_versions', 'references')
    or has_table_privilege('outcome_bridge_backend', 'outcome_private.bridge_schema_versions', 'trigger') then
    raise exception 'outcome_bridge_backend_bootstrap_privilege_drift';
  end if;
  if exists (select 1 from information_schema.role_table_grants
      where table_schema = 'outcome_private' and table_name = 'bridge_schema_versions'
      and grantee in ('PUBLIC', 'anon', 'authenticated', 'outcome_bridge_runtime')) then
    raise exception 'outcome_bridge_bootstrap_direct_privilege_drift';
  end if;
  if exists (select 1 from pg_class relation join pg_roles owner on owner.oid = relation.relowner
      join pg_namespace namespace on namespace.oid = relation.relnamespace
      where namespace.nspname = 'outcome_private' and relation.relname = 'bridge_schema_versions'
      and owner.rolname = 'outcome_bridge_backend') then
    raise exception 'outcome_bridge_backend_bootstrap_ownership_drift';
  end if;
  if not exists (select 1 from pg_class relation join pg_namespace namespace on namespace.oid = relation.relnamespace
      where namespace.nspname = 'outcome_private' and relation.relname = 'bridge_schema_versions'
      and relation.relrowsecurity and relation.relforcerowsecurity) then
    raise exception 'outcome_bridge_bootstrap_rls_drift';
  end if;
  if (select count(*) from pg_policies where schemaname = 'outcome_private'
      and tablename = 'bridge_schema_versions' and policyname = 'bridge_backend_schema'
      and cmd = 'ALL' and roles = array['outcome_bridge_backend']::name[]
      and qual = 'true' and with_check = 'true') <> 1 then
    raise exception 'outcome_bridge_bootstrap_policy_drift';
  end if;
end
$$;

commit;
