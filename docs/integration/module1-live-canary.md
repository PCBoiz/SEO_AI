# Module 1 — Live Canary Checklist

Updated: 2026-07-22 (Asia/Saigon)

## Canary boundary

- Neon PostgreSQL is the source of truth for input, output and job state.
- Make receives identifiers plus an explicit Sheet policy; it never receives a database URL or API key.
- Only `deepseek` is allowlisted and only one site is accepted per canary job.
- The UI and API both require an explicit live-cost confirmation.
- `sheetFallbackMode=disabled` for the first canary. A later `manual_mirror` branch is allowed only after the live Sheet mapping is verified; it is never an automatic fallback.
- WordPress, Facebook and the other nine registered modules remain out of scope.

## Current staging blockers found by audit

- `MAKE_WEBHOOK_RIS_SITEMAP` exists in Vercel Preview only, not Production.
- `BRIDGE_DATABASE_URL` does not exist in Vercel Preview or Production.
- `SITEMAP_PILOT_MODE` is still `mock`, as required while the two items above are unresolved.
- The app/Make roles and grants cannot be proven from Vercel CLI because encrypted variable values are not exportable. Run `npm run module1:audit-live` locally with a trusted PostgreSQL URL, or verify the same SQL in Neon SQL Editor.

## Required Make scenario graph

Work on a clone named clearly as a Neon canary. Keep the original Sheet-backed scenario available but disabled while this route is validated.

1. **Webhooks > Custom webhook** receives contract `sitemap-pilot/1.1`:

   ```json
   {
     "jobId": "uuid",
     "idempotencyKey": "uuid",
     "automationKey": "RIS_SITEMAP",
     "sheetFallbackMode": "disabled"
   }
   ```

2. **PostgreSQL > Execute a function** calls `antigravity_bridge.claim_sitemap_job_v2(jobId, idempotencyKey)` using two separately mapped UUID parameters. Use the dedicated `antigravity_bridge_make` connection, encryption and auto-commit.
3. Stop successfully when claim returns zero rows. This is the idempotency gate and prevents a second paid model call.
4. Iterate over `sites`; the canary receives exactly one element.
5. Filter `ai_provider = deepseek`; use the existing DeepSeek module/connection with model `deepseek-v4-flash`. Do not construct provider URLs from job data.
6. Generate the full Sitemap, then select at most 30 labels, using the claimed site fields instead of Google Sheet cells.
7. Aggregate exactly this output:

   ```json
   {
     "contractVersion": "1.0",
     "sites": [
       {
         "reference": "project name",
         "draftSitemap": "full text",
         "selectedSitemap": "selected labels"
       }
     ]
   }
   ```

8. **PostgreSQL > Execute a function** calls `complete_sitemap_job(jobId, idempotencyKey, outputJson)`.
9. Attach an error handler around the AI/aggregation path that calls `fail_sitemap_job(jobId, idempotencyKey, sanitizedMessage)`. Do not store headers, keys or connection strings.
10. Add a Sheet mirror route only behind `sheetFallbackMode = manual_mirror`. Leave that route disabled for this canary. If added later, Neon completion remains authoritative and Sheet failure is reported separately rather than replacing the Neon result.

For the canary, enable **Process data in order**, set a conservative scenario rate limit and avoid automatic retry of the DeepSeek module. A custom webhook returns HTTP 200/Accepted by default; the Antigravity UI obtains completion by polling Neon.

## Neon roles

Create the roles with strong random passwords in Neon SQL Editor. The app role receives only `SELECT`, `INSERT` and `UPDATE` on `antigravity_bridge.sitemap_jobs`. The Make role receives schema usage and execute permission only on:

- `claim_sitemap_job_v2(uuid, uuid)`
- `complete_sitemap_job(uuid, uuid, jsonb)`
- `fail_sitemap_job(uuid, uuid, text)`

The exact SQL is in `module1-neon-pilot.md`. Never use the Neon owner/migrator URL in Vercel runtime or Make.

## Activation order

1. Run `npm run module1:audit-live` with a trusted Neon URL and retain only the non-secret JSON result.
2. Add the least-privileged app URL as `BRIDGE_DATABASE_URL` in **Preview**.
3. Add the canary webhook as `MAKE_WEBHOOK_RIS_SITEMAP` in **Preview**.
4. Set Preview values:
   - `SITEMAP_LIVE_CANARY_ENABLED=true`
   - `SITEMAP_LIVE_ALLOWED_AI_PROVIDERS=deepseek`
   - `SITEMAP_GOOGLE_SHEETS_FALLBACK_MODE=disabled`
   - `SITEMAP_SHEET_MAPPING_VERIFIED=false`
   - `SITEMAP_PILOT_MODE=neon_make`
5. Export the revised Make blueprint and validate it contains no active Google Sheet or publishing module on the canary route.
6. Deploy Preview, sign in, tick the live confirmation and submit one site.
7. Verify `queued → dispatching → running → succeeded`, one Make execution, one DeepSeek request, valid output contract and no Sheet/WordPress side effect.
8. Re-send the same webhook identifiers and prove claim v2 returns zero rows without another DeepSeek request.
9. Only after owner review, repeat the exact configuration promotion to Production.

## Evidence required before mass production

- Revised Make blueprint export and a screenshot of the complete canary graph.
- Redacted proof that Make uses `antigravity_bridge_make`, not an owner connection.
- Audit result showing all three functions exist and Make has only the intended execute grants.
- One successful job ID, Make execution ID, DeepSeek provider request ID/token usage and final Neon status.
- Duplicate-delivery test and a controlled failure test.
- Confirmation that Google Sheets, WordPress and Facebook had zero writes during the canary.

Primary references: [Make PostgreSQL modules](https://apps.make.com/postgres), [Make webhooks](https://help.make.com/webhooks), and [DeepSeek API](https://api-docs.deepseek.com/).

