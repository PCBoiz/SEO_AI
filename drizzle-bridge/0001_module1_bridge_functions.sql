create or replace function antigravity_bridge.claim_sitemap_job(
  p_job_id uuid,
  p_idempotency_key uuid
)
returns table (
  job_id uuid,
  workspace_id text,
  project_id text,
  sites jsonb
)
language sql
security definer
set search_path = pg_catalog
as $$
  update antigravity_bridge.sitemap_jobs as jobs
  set status = 'running',
      started_at = coalesce(started_at, now()),
      updated_at = now(),
      version = version + 1
  where jobs.id = p_job_id
    and jobs.idempotency_key = p_idempotency_key
    and jobs.automation_key = 'RIS_SITEMAP'
    and jobs.status in ('queued', 'dispatching')
  returning jobs.id, jobs.workspace_id, jobs.project_id, jobs.input_payload -> 'sites';
$$;
--> statement-breakpoint
revoke all on function antigravity_bridge.claim_sitemap_job(uuid, uuid)
  from public;
--> statement-breakpoint
create or replace function antigravity_bridge.complete_sitemap_job(
  p_job_id uuid,
  p_idempotency_key uuid,
  p_output jsonb
)
returns table (job_id uuid, job_status text, job_version integer)
language sql
security definer
set search_path = pg_catalog
as $$
  update antigravity_bridge.sitemap_jobs as jobs
  set status = 'succeeded',
      output_payload = p_output,
      error_code = null,
      error_message = null,
      completed_at = now(),
      updated_at = now(),
      version = version + 1
  where jobs.id = p_job_id
    and jobs.idempotency_key = p_idempotency_key
    and jobs.automation_key = 'RIS_SITEMAP'
    and jobs.status = 'running'
    and jsonb_typeof(p_output) = 'object'
    and p_output ->> 'contractVersion' = '1.0'
    and jsonb_typeof(p_output -> 'sites') = 'array'
    and jsonb_array_length(p_output -> 'sites') between 1 and 4
  returning jobs.id, jobs.status, jobs.version;
$$;
--> statement-breakpoint
revoke all on function antigravity_bridge.complete_sitemap_job(uuid, uuid, jsonb)
  from public;
--> statement-breakpoint
create or replace function antigravity_bridge.fail_sitemap_job(
  p_job_id uuid,
  p_idempotency_key uuid,
  p_error_message text
)
returns table (job_id uuid, job_status text, job_version integer)
language sql
security definer
set search_path = pg_catalog
as $$
  update antigravity_bridge.sitemap_jobs as jobs
  set status = 'failed',
      error_code = 'MAKE_SCENARIO_FAILED',
      error_message = left(coalesce(p_error_message, 'Make scenario failed.'), 2000),
      completed_at = now(),
      updated_at = now(),
      version = version + 1
  where jobs.id = p_job_id
    and jobs.idempotency_key = p_idempotency_key
    and jobs.automation_key = 'RIS_SITEMAP'
    and jobs.status = 'running'
  returning jobs.id, jobs.status, jobs.version;
$$;
--> statement-breakpoint
revoke all on function antigravity_bridge.fail_sitemap_job(uuid, uuid, text)
  from public;
