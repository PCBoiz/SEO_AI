# Vercel staging — Antigravity SEO Automation

Updated: 2026-07-22

## Current state

- Vercel project: `antigravity-seo-automation`
- Temporary URL: `https://antigravity-seo-automation.vercel.app`
- Function region: Singapore (`sin1`)
- Private Vercel Blob store: created and linked to Production, Preview, and Development
- Deploy status: **deployed and ready** (`dpl_CxBiNFNxdwF1vmAoxAM2yWfbkXQ4`)
- Neon app and bridge migrations: **applied**
- Neon staging seed: **applied** for `giangvu4131@gmail.com`
- Runtime checks: `/api/v1/health` and `/api/v1/ready` both return HTTP 200
- External credits: **none consumed by Codex**; only DeepSeek is live-allowlisted and still requires explicit confirmation. Module 1 remains mock.

The public staging shell is available for owner review. Google OAuth begins correctly and uses the registered production callback, but the owner must complete the browser consent flow. Make OAuth is intentionally omitted; the Module 1 pilot will use a server-side custom webhook URL instead. Do not put secret values in chat or source files.

## Persistence architecture

- Local development and automated tests continue to use SQLite.
- Vercel runtime uses Neon PostgreSQL for users, sessions, workspaces, projects, OAuth connections, automation registry, pipeline previews, knowledge placeholders, and AI test audit records.
- Module 1 uses the existing `antigravity_bridge` schema. `DATABASE_URL` and `BRIDGE_DATABASE_URL` may point to one Neon branch for staging, but runtime roles should remain least-privileged.
- Vercel Blob is private and is selected with `STORAGE_PROVIDER=vercel_blob`. The adapter is ready; the current UI does not yet expose an upload flow.

## Safe owner-assisted setup

1. In Neon, create or select a non-production test branch near Singapore when possible.
2. Keep owner/migrator URLs only on the local machine as `MIGRATOR_DATABASE_URL` and `BRIDGE_MIGRATOR_DATABASE_URL`.
3. In Vercel, add pooled least-privileged runtime URLs as `DATABASE_URL` and `BRIDGE_DATABASE_URL`.
4. In Vercel, add the exact new Google email as both `STAGING_OWNER_EMAIL` and `OAUTH_BOOTSTRAP_EMAIL`.
5. Add `VAULT_ENCRYPTION_KEY` and `AUTH_SESSION_SECRET` as encrypted Vercel variables.
6. Add Google OAuth and four model keys directly in Vercel. Make OAuth is not required for the webhook-only Module 1 pilot.
7. Register these exact callback URIs:
   - `https://antigravity-seo-automation.vercel.app/api/v1/oauth/google/callback`
   - `https://antigravity-seo-automation.vercel.app/api/v1/oauth/make/callback`
8. Run `npm run db:neon:migrate`, followed by `npm run db:postgres:seed`, from the trusted local machine.
9. Deploy and verify `/api/v1/health`, `/api/v1/ready`, then complete Google login in the browser. Drive/Sheets consent remains a separate optional check.
10. Run one short DeepSeek canary only after explicitly notifying the owner. Then validate OpenAI, Gemini, and Claude one at a time.
11. Keep `SITEMAP_PILOT_MODE=mock` until Module 1 Make scenario has been updated to `claim_sitemap_job_v2`, its webhook URL is set, and the bridge role grants are verified.

## Required Vercel secret names

- `DATABASE_URL`
- `BRIDGE_DATABASE_URL`
- `VAULT_ENCRYPTION_KEY`
- `AUTH_SESSION_SECRET`
- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `OPENAI_API_KEY`
- `DEEPSEEK_API_KEY`
- `GEMINI_API_KEY`
- `ANTHROPIC_API_KEY`
- `MAKE_WEBHOOK_RIS_SITEMAP` (only when Module 1 is ready)
- `MAKE_CALLBACK_SECRET` (reserved; callback implementation is not active)

The Blob integration manages its own Vercel credentials. Never expose any value above through `NEXT_PUBLIC_*`.

## Activation boundary

Creating the Vercel project and private Blob store did not authorize a live Make job, a model call, a Sheet write, a WordPress action, or a production deployment. The first deployment remains a staging deployment and must pass the readiness endpoint before OAuth or AI canaries are attempted.

The first staging deployment passed readiness on 2026-07-22. `AI_EXECUTION_MODE=mock` and `SITEMAP_PILOT_MODE=mock` remain the enforced runtime boundary. `BRIDGE_DATABASE_URL`, a production-scoped Module 1 webhook, Make PostgreSQL role grants, and the revised `claim_sitemap_job_v2` scenario are still required before any live Module 1 job.

## Owner smoke-test path

1. Open `https://antigravity-seo-automation.vercel.app/login` and sign in with Google using the bootstrapped owner email.
2. Open **Tự động hóa**. Module 1 must show **Mở Module 1 đầy đủ**, not the generic schema form.
3. Open Module 1 and verify the fields for project, market/location, primary keyword, tone, language, AI provider/model, website description and competitors.
4. Submit a mock run. The runtime badges must say **Mô phỏng an toàn**, **Neon Postgres** and **Neon · job mô phỏng**; a Sitemap result should appear without Make or model charges.
5. Open **Không gian AI**, choose any provider and run the mock test. The response must be explicitly marked mock. Do not enable live mode until that provider has billing/quota and the owner has approved a paid canary.
6. If either page shows a route error, copy only its non-secret log digest and timestamp. Never send an API key, OAuth secret, database URL or webhook URL in chat.

The latest post-deploy smoke check returned HTTP 200 from both `/api/v1/health` and `/api/v1/ready`. Readiness reported Neon database, Vault, auth, mock automation and private Vercel Blob as ready. Vercel error logs contained no entries after the deployment smoke test.
