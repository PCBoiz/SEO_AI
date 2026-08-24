create or replace function antigravity_bridge.claim_sitemap_job_v2(
  p_job_id uuid,
  p_idempotency_key uuid
)
returns table (
  job_id uuid,
  workspace_id text,
  project_id text,
  ai_provider text,
  ai_model text,
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
    and jsonb_typeof(jobs.input_payload -> 'ai') = 'object'
    and jobs.input_payload -> 'ai' ->> 'provider'
      in ('openai', 'deepseek', 'gemini', 'anthropic')
    and length(coalesce(jobs.input_payload -> 'ai' ->> 'model', '')) between 1 and 120
    and jsonb_typeof(jobs.input_payload -> 'sites') = 'array'
    and jsonb_array_length(jobs.input_payload -> 'sites') between 1 and 4
  returning
    jobs.id,
    jobs.workspace_id,
    jobs.project_id,
    jobs.input_payload -> 'ai' ->> 'provider',
    jobs.input_payload -> 'ai' ->> 'model',
    jobs.input_payload -> 'sites';
$$;
--> statement-breakpoint
revoke all on function antigravity_bridge.claim_sitemap_job_v2(uuid, uuid)
  from public;
