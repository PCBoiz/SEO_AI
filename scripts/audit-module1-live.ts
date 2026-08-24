import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl || !/^postgres(?:ql)?:\/\//i.test(databaseUrl)) {
  throw new Error("DATABASE_URL PostgreSQL is required for the Module 1 audit.");
}

async function main(): Promise<void> {
  const sql = neon(databaseUrl!);

const [connection] = await sql`
  select
    current_user as current_user,
    roles.rolsuper as is_superuser,
    roles.rolcreaterole as can_create_role
  from pg_catalog.pg_roles as roles
  where roles.rolname = current_user
`;

const [objects] = await sql`
  select
    to_regclass('antigravity_bridge.sitemap_jobs') is not null as jobs_table,
    to_regprocedure('antigravity_bridge.claim_sitemap_job_v2(uuid,uuid)') is not null
      as claim_v2,
    to_regprocedure('antigravity_bridge.complete_sitemap_job(uuid,uuid,jsonb)') is not null
      as complete_job,
    to_regprocedure('antigravity_bridge.fail_sitemap_job(uuid,uuid,text)') is not null
      as fail_job
`;

const roles = await sql`
  select
    target.role_name,
    exists (
      select 1 from pg_catalog.pg_roles where rolname = target.role_name
    ) as role_exists,
    exists (
      select 1
      from information_schema.routine_privileges
      where grantee = target.role_name
        and specific_schema = 'antigravity_bridge'
        and routine_name = 'claim_sitemap_job_v2'
        and privilege_type = 'EXECUTE'
    ) as can_claim_v2,
    exists (
      select 1
      from information_schema.routine_privileges
      where grantee = target.role_name
        and specific_schema = 'antigravity_bridge'
        and routine_name = 'complete_sitemap_job'
        and privilege_type = 'EXECUTE'
    ) as can_complete,
    exists (
      select 1
      from information_schema.routine_privileges
      where grantee = target.role_name
        and specific_schema = 'antigravity_bridge'
        and routine_name = 'fail_sitemap_job'
        and privilege_type = 'EXECUTE'
    ) as can_fail,
    exists (
      select 1
      from information_schema.table_privileges
      where grantee = target.role_name
        and table_schema = 'antigravity_bridge'
        and table_name = 'sitemap_jobs'
        and privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
    ) as has_direct_table_write
  from (values
    ('antigravity_bridge_app'::text),
    ('antigravity_bridge_make'::text)
  ) as target(role_name)
  order by target.role_name
`;

  console.log(
    JSON.stringify(
      {
        connection: {
          role: connection?.current_user,
          isSuperuser: connection?.is_superuser,
          canCreateRole: connection?.can_create_role,
        },
        objects,
        roles,
      },
      null,
      2,
    ),
  );
}

void main();
