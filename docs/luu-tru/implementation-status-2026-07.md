# Antigravity OS implementation status

Last updated: 2026-07-23 (Asia/Saigon)

## Source-of-truth policy

- Intended architecture, scope, security, roadmap, and coding standards: latest project handoff first, then ADR/architecture documents, then source code.
- Actual Make scenario behavior: blueprint JSON first, then a verified Google Sheet structure, then integration documentation.
- Current implementation state: source code, migrations, the local SQLite database, and executable quality gates.
- Unverified Google Sheet semantics, ranges, and mappings are blockers or explicit assumptions. They are never invented.

## Audit baseline

The workspace is a Next.js 16.2.10 App Router prototype using npm, React 19, TypeScript strict mode, Tailwind CSS 4, Drizzle ORM, better-sqlite3, and a local `local.db` file.

The workspace root is not currently recognized as a Git repository. Consequently, branch/status/history and whether ignored files have ever been committed cannot be verified from this checkout. Existing files were preserved.

### What already exists

- Next.js application shell with dark design tokens, sidebar, top bar, breadcrumbs, dashboard, project mockups, a new-project mock form, and an automation mock listing.
- Drizzle SQLite schema, one generated migration, and an applied local database containing 18 application tables plus the Drizzle migration table. All application tables are currently empty.
- Initial AES-256-GCM vault helper.
- `.env.example`, an ignored local `.env`, npm lockfile, and installed dependencies.
- Strict TypeScript configuration.
- Ten source Make blueprints and the handoff/architecture documents were supplied outside the repository and reviewed during this audit.

### Phase 1 gaps found

- Database-backed authentication, protected workspace routes, session persistence, and RBAC now exist. Phase 2 mutations must continue to call the same server-side permission checks close to the data source.
- The original persistence schema was incomplete. This has been patched in the Phase 1 foundation baseline; repository/service behavior still needs to be implemented and tested.
- A SQLite adapter boundary now exists; production Postgres remains intentionally unimplemented and must use a separate schema/migration strategy later.
- The original Vault defects were fixed. Project integration repositories still need to call the Vault before Phase 2 credentials can be considered complete.
- Provider/storage/event boundaries, typed application errors, and the API error envelope now exist. Runtime orchestration remains out of Phase 1 scope.
- Pino logging, Sentry bootstrap, health/readiness endpoints, and a global error boundary are implemented; Sentry remains disabled locally until an optional DSN is supplied.
- Workspace shell now has desktop and mobile navigation, an authenticated identity/role display, reduced-motion handling, and a local runtime status bar.
- Vitest and Playwright test setups now exist. The final Phase 1 gate sequence passes on the completed tree.
- Geist Sans/Mono are self-hosted through the local `geist` package; the production build no longer needs a Google Fonts request.
- `README.md` documents local setup, seeding, gates, and external-service safety boundaries.

### Baseline quality gates

| Gate | Result | Evidence |
| --- | --- | --- |
| Lint | Passed | `npm run lint` completes with `--max-warnings=0`. |
| Typecheck | Passed | `npm run typecheck` completes successfully. |
| Unit/integration tests | Passed | 10 Vitest files and 24 tests pass, including a clean-database migration test. |
| Production build | Passed | Next.js 16.2.10 completes an optimized production build with self-hosted Geist fonts. |
| End-to-end tests | Passed | Three Playwright tests pass in installed Chrome: health/readiness, auth redirect/login/session/logout, and viewer role preservation. |
| SQLite migration | Passed | A clean Phase 1 baseline migration created 26 application tables; `integrity_check` is `ok` and `foreign_key_check` reports zero violations. The empty pre-audit database and old migration were preserved under `tmp/pre-phase1-baseline/`. |
| Dependency audit | Passed | Full and production-only npm audits report zero vulnerabilities. `postcss` and `esbuild` are locked through audited overrides to remove vulnerable transitive versions and an invalid Vite dedupe. |
| Browser secret scan | Passed | 23 generated `.next/static` artifacts contain neither sensitive server variable names nor configured sensitive values. |

## Phase status

### Phase 0 - Architecture lock

Status: blueprint JSON reconciliation v1 complete; live Google Sheet verification remains open.

The supplied architecture artifacts are sufficient for Phase 1 and Phase 2. All 10 authorized blueprint JSON files have now been reconciled into an exhaustive evidence report and a machine-readable module map. Live Sheet identity, headers, omitted clear-module `sheetId` values, row semantics, and completion signals remain unverified and block Phase 3. No live integration was implemented.

### Phase 1 - Production foundation

Status: complete; Definition of Done is met.

All Phase 1 implementation items are present: local app/runtime, strict TypeScript, SQLite migration, authentication/RBAC, responsive shell/theme, secure Vault, local/mock providers, Pino/Sentry bootstrap, health/readiness, unit/integration/E2E tests, and a production build. The final tree passes lint, typecheck, unit/integration tests, production build, E2E, clean migration verification, dependency audit, and client-bundle secret scanning.

### Phase 2 - Core platform

Status: complete; Definition of Done is met.

Workspace settings and project create/read/update/archive behavior persist through workspace-scoped service/repository boundaries. Competitors, WordPress placeholder configuration, audit records, and an explicitly unconfigured Google Sheet bridge are transactional; WordPress application passwords are AES-256-GCM encrypted and never returned by the API. Capability and automation records load from SQLite, the schema-driven form engine runs validated local mock previews, prompt/knowledge placeholders persist, and a seven-node/six-edge read-only pipeline preview renders from SQLite. The final tree passes every Phase 2 quality gate.

### Phase 3 - Shadow bridge

Status: Module 1 pilot foundation authorized and implemented locally; live activation is not configured.

The owner selected Module 1 (Sitemap) as the first pilot and chose a Neon/PostgreSQL intermediate database instead of retaining Google Sheet as the runtime bridge. The application now has an API-native Module 1 contract, separate Drizzle PostgreSQL schema/migrations, least-privilege Make functions, a Neon repository, Make provider, polling API, idempotent SQLite mock repository, and a Vietnamese pilot UI. The default remains `SITEMAP_PILOT_MODE=mock`; no live webhook or Neon database was called.

Google Sheet verification remains required before any original Sheet-backed mapping or other supplied scenario is activated. It does not block the owner-approved API-native rewrite of Module 1, provided the Make scenario is changed and validated against the new contract.

## Active decisions

- Use SQLite and local/mock adapters through Phase 1 and Phase 2.
- Keep Make-specific details behind provider interfaces and out of user-facing UI and browser bundles.
- Treat `.env` as sensitive. The audit checked variable names/presence only and did not print values.
- Replace insecure configuration fallbacks with explicit typed configuration errors and test-only/local fixtures.
- Make the build independent from live font downloads.
- Keep the application foundation on SQLite, and use Neon/PostgreSQL only as the server-side Module 1 bridge store.
- Use polling through the Antigravity API for the Module 1 pilot. Make writes terminal state to Neon; it does not call localhost.
- Module 1 replaces the prior evidence-only Module 4 pilot recommendation by explicit owner decision. The reconciliation evidence itself remains unchanged.

## Blockers and assumptions

- The checkout has no usable Git metadata. A repository history audit is impossible unless the Git metadata is restored or this directory is initialized later by the owner.
- Google Sheet headers have not been verified against the live spreadsheet. Blueprint interface labels help identify discrepancies but do not prove the current live Sheet structure.
- Twenty `clearValuesFromRange` modules include a spreadsheet/range but omit `sheetId`; their exact target tabs cannot be proved from JSON or a workbook export alone.
- Blueprint completion is webhook-triggered but the supplied scenarios do not contain an Antigravity callback module or a declared polling marker. Blueprint completion mode is therefore `unknown`. The Phase 2 mock registry's `polling` value is a local provider setting, not evidence of actual Make completion behavior.
- Blueprints 3, 5, 7, and 8 contain internal cross-tab/row references that may be intentional or defects. They were preserved as blockers instead of silently normalized.
- Exact blocker evidence and the minimum future owner-provided information are recorded in `docs/integration/open-sheet-verification-blockers.md`.
- Live Module 1 activation still requires an owner-created Neon project/branch, two least-privileged database users, application and Make connection secrets, a server-side Make webhook URL, and the reviewed Make scenario changes in `docs/integration/module1-neon-pilot.md`.
- Automatic job runtime timeout/retry is not implemented for the pilot. `MAKE_DISPATCH_TIMEOUT_MS` only bounds the outbound webhook request. Idempotency prevents duplicate dispatch for the same workspace/key.

## Progress log

### 2026-07-21 - Phase 1 persistence foundation

- Reconciled the source schema with the mandatory handoff tables and normalized WordPress/Google Sheet integration metadata into `project_integrations`.
- Added users, database sessions, workspace membership roles, capabilities, knowledge base, prompt runs, feature flags, processed-event lifecycle fields, resource-scoped locks, content revisions, and asset storage references.
- Added foreign keys, uniqueness constraints, indexes, timestamps, complete job/node states, retry attempts, and provider/completion metadata.
- Re-baselined only because the prior local application tables contained zero rows and Drizzle could not resolve rename prompts without a TTY. The previous database and migration remain recoverable under `tmp/pre-phase1-baseline/`.
- Generated and applied `drizzle/0000_phase1_foundation.sql`; verified 26 application tables, SQLite integrity, and foreign keys.
- Focused gate: `tsc --noEmit` passed after the schema patch.

### 2026-07-21 - Local/mock foundation and security primitives

- Added a SQLite adapter boundary with foreign keys, busy timeout, readiness probing, and dialect-mismatch rejection.
- Replaced the insecure Vault draft with strict 32-byte key validation, versioned AES-256-GCM payloads, optional authenticated context, and fail-closed typed errors.
- Added provider-neutral `AutomationProvider`, deterministic `MockAutomationProvider`, `StorageProvider`, path-safe `LocalStorageProvider`, `EventBus`, and in-memory implementation.
- Added server-side `WebhookResolver` with an allowlisted provider-key registry. Placeholders, unknown keys, malformed URLs, and non-HTTPS URLs fail without exposing configured values.
- Added typed application errors, a consistent API error envelope, environment validation, and a redacting Pino logger.
- Added Vitest and Playwright quality tooling plus npm scripts for lint, typecheck, unit/integration/E2E tests, coverage, migration, and seed.
- Focused gates: lint passed with zero warnings; typecheck passed; 16 unit tests and one migration integration test passed.

### 2026-07-21 - Authentication, observability, and workspace shell

- Added scrypt password hashing, signed minimal session tokens, database session revocation/expiry, HttpOnly/SameSite cookies, and protected workspace routes.
- Added server-side role permissions for owner/editor/viewer. Editors can create/edit/run/publish but cannot manage owners or vault master secrets; viewers remain read-only.
- Added an idempotent local seed workflow that creates owner/editor/viewer accounts. Random local passwords are written only to ignored `.data/seed-credentials.json` and are never printed.
- Added `/api/v1/health`, `/api/v1/ready`, and authenticated `/api/v1/auth/session` Route Handlers with no-store responses.
- Added runtime-aware Sentry instrumentation, redacting Pino startup/readiness logs, and a global error boundary.
- Replaced build-time Google Fonts fetching with self-hosted Geist Sans/Mono.
- Added mobile navigation, desktop sidebar, identity/role display, logout, status bar, and `prefers-reduced-motion` handling.
- Focused gates: lint and typecheck passed; 23 unit tests passed; production build passed; three Playwright E2E tests passed.

### 2026-07-21 - Phase 1 final quality gate

- Re-ran lint, typecheck, all 24 unit/integration tests, production build, and all three E2E tests after the final dependency change; every command passed.
- Normalized `postcss` and `esbuild` transitive versions. This removed four dev-tool advisories, eliminated an invalid Vite/esbuild dedupe, and brought both full and production-only npm audits to zero vulnerabilities.
- Reverified the clean SQLite baseline through the migration integration test.
- Scanned 23 browser artifacts for sensitive server configuration names and configured secret values; no leak was found.
- Phase 1 now meets its Definition of Done. No live external provider, production migration, or Phase 3 work was started.

### 2026-07-21 - Phase 2 project create/list vertical slice

- Added a validated Project aggregate input model, workspace-aware Project service, repository interface, and SQLite repository implementation.
- Added authenticated `GET` and permission-gated `POST /api/v1/projects`. Workspace identity is derived from the signed database session rather than trusted from request JSON.
- Project, competitor, integration placeholder, and audit-log rows are committed in one SQLite transaction.
- WordPress application passwords are encrypted with AES-256-GCM plus workspace/project authenticated context. API and UI responses expose only non-secret configuration and status.
- Created an unconfigured Google Sheet bridge placeholder without inventing spreadsheet IDs, ranges, headers, or blueprint mappings.
- Replaced the static project list/form with persisted server-rendered listing, responsive project creation, location/industry/competitor fields, clear validation feedback, and explicit local-only WordPress messaging.
- Enforced owner/editor create access at the page, API, and application-service boundaries; viewers receive a read-only UI and HTTP 403 for direct mutations.
- Focused gates passed: lint, typecheck, 12 Vitest files/28 tests, production build, and five Playwright E2E tests. E2E verifies create, reload persistence, credential non-disclosure, and viewer denial.

### 2026-07-21 - Phase 2 project update/archive vertical slice

- Added workspace-scoped project detail, update, and soft-archive service/repository behavior plus `GET`, `PATCH`, and `DELETE /api/v1/projects/:projectId`.
- Added an editable project detail UI for metadata, competitors, and WordPress placeholders. Viewers receive read-only controls; editors can update; only owners can archive.
- Updating WordPress URL/username with a blank password preserves the existing ciphertext. Password replacement creates a new authenticated ciphertext; disabling the integration removes the stored credential.
- Competitor replacement, integration changes, project metadata, and audit records remain transactional. Cross-workspace IDs return not found without leaking another workspace's data.
- Focused gates passed: lint, typecheck, 12 Vitest files/28 tests, production build, and six Playwright E2E tests. E2E now covers update + reload, direct viewer mutation denial, and owner soft-archive persistence.

### 2026-07-21 - Phase 2 capability, registry, and dynamic-form vertical slice

- Added an idempotent SQLite seed for eight handoff capabilities and all ten supplied Make blueprints.
- Corrected the previous hardcoded catalog's unsupported callback claim: all Phase 2 records use `provider=mock` and `completionMode=polling`. The supplied scenarios start with custom webhooks but contain no Antigravity callback module.
- Added typed registry repository/service boundaries. Browser-facing records omit server-side provider keys, and no webhook URL is stored in SQLite or returned to the client.
- Added a schema-driven form renderer supporting text, textarea, URL, number, select, boolean, and tag inputs, plus server-side schema validation and unknown-field rejection.
- Seeded four explicitly labeled `local_mock` schema families. These are preview controls, not assertions about Make webhook payload mappings; the blueprint webhooks do not declare an input payload schema.
- Added a permission-gated mock-preview endpoint backed exclusively by `MockAutomationProvider`. Responses are sanitized to status and accepted input keys.
- Verified the applied seed contains eight capabilities and ten automations, all mock/polling. Running the seed rotates local test credentials but writes them only to the ignored credentials file.
- Fixed a flaky JWT tamper test that could accidentally replace a base64 character with itself; it now always mutates the signature.
- Focused gates passed: lint, typecheck, 14 Vitest files/31 tests, production build, and eight Playwright E2E tests. E2E renders and runs two distinct schemas and proves viewer preview denial.

### 2026-07-21 - Phase 2 workspace and persisted-placeholder vertical slice

- Added persisted workspace settings and member overview plus owner-only update behavior. Editors/viewers remain read-only, and updates create audit records.
- Added an idempotently seeded local demo project, unconfigured integration placeholders, one draft pipeline with seven registry-backed nodes and six edges, one knowledge record, and one versioned prompt placeholder.
- Replaced the empty pipeline page with a read-only horizontal preview assembled from SQLite. It has no run control and creates no jobs.
- Replaced the empty knowledge page with workspace-scoped knowledge and prompt-version placeholders. It performs no embedding or external model call.
- Ran the full seed twice successfully to verify conflict-safe local idempotency; account passwords intentionally rotate and remain in the ignored credential file.
- Focused E2E verifies owner workspace update/reload/restore, viewer workspace denial, the persisted pipeline topology, and prompt/knowledge visibility.

### 2026-07-21 - Phase 2 final Definition of Done gate

- Final lint and strict typecheck pass with zero warnings/errors.
- All 16 Vitest files and 34 unit/integration tests pass, including clean migration, workspace/project repositories, credential preservation, registry sanitation, dynamic form validation, and mock-provider RBAC.
- All ten Playwright E2E tests pass: auth/readiness, project create/update/reload/archive, encrypted credential non-disclosure, two dynamic schemas, mock previews, workspace settings, persisted placeholders, and viewer mutation/preview denial.
- Playwright now recreates ignored `.data/e2e.db` and `.data/e2e-credentials.json` before each run. E2E no longer rotates development credentials or writes test projects into `local.db`.
- The optimized Next.js production build passes with all protected and API routes emitted dynamically.
- Full npm audit reports zero vulnerabilities.
- Local SQLite reports `integrity_check=ok`, zero foreign-key violations, eight capabilities, ten mock/polling automations, one preview pipeline, seven nodes, six edges, one knowledge placeholder, and one prompt placeholder.
- Scanned 26 `.next/static` artifacts: no sensitive environment name, configured secret value, Make provider key, or webhook identifier was found.
- Removed nine `E2E Project ...` / `Archive E2E ...` records created in `local.db` by earlier pre-isolation runs. Cascades removed only their dependent test rows; the final development database retains the seeded demo project and reports `integrity_check=ok` with zero foreign-key violations.
- Replaced the generated README with local setup, seed, gate, adapter, and safety-boundary instructions.
- Phase 2 meets every stated Definition of Done item. No live Make/Google Sheets/WordPress connection, production deployment/migration, execution orchestration, or Phase 3 Shadow Bridge work was started.

### 2026-07-21 - Blueprint Reconciliation v1

- Reconciled exactly the 10 authorized JSON exports (modules 1, 2, 3, 4, 5, 6, 7, 8, 10, and 12); later blueprints remain out of scope and do not alter or block this evidence set.
- Added a deterministic reconciliation generator and source SHA-256 tracking. The generated machine map contains 294 Make modules, including all 173 Google Sheet modules: 58 reads, 33 clears, 50 cell updates, and 32 row updates. No search or append module exists in the supplied set.
- Confirmed all Google Sheet modules use spreadsheet reference `/1JlsR8LYiXKNKIoh-TtkBAyoDRVbGIu2oMQudm9YAIOE` with exported restore path ` RIS 3.5 - SEO Template (110125)`; the leading whitespace is preserved as evidence, not normalized.
- Confirmed all 10 scenarios start with custom webhooks, but the exports declare no request payload schema. No HTTP/webhook-response module exists, so no Antigravity callback can be claimed and blueprint completion remains `unknown`.
- Recorded exact sheet names, ranges/cells, write targets, exported interfaces, downstream field references, outputs, and per-layer confidence in `docs/integration/blueprint-reconciliation-v1.md` and `docs/integration/blueprint-module-map.json`.
- Found material conflicts in every legacy matrix entry. Examples include multiple Setup rows, variant tabs with significant leading whitespace, entirely different output ranges, and Module 12 writing nothing to the claimed `Upload Status` sheet.
- Kept 20 missing clear-module `sheetId` values as `requires_sheet_verification`. Also recorded uncorrected internal cross-tab/row anomalies in scenarios 3, 5, 7, and 8.
- Minimum future verification input: a read-only workbook export, an exact tab-title/numeric-sheet-ID manifest, Make evidence for the 20 omitted `sheetId` modules, Setup row/header semantics, target writability/formula details, a completion contract for the selected pilot, and owner disposition of internal anomalies.
- Assessed Module 4 (Imported Keywords) as the best later Phase 3 pilot candidate because it has the smallest graph (6 modules), only three Sheet operations, one source range, one clear/write output cell, and no publishing side effect. It remains blocked on Sheet/completion verification and explicit owner authorization.
- No Make webhook was called, no live Google Sheet or WordPress action occurred, no callback/JobCoordinator/provider switch was implemented, and Phase 3 was not started.
- Reconciliation quality gates passed: the deterministic generator completed for all 10 sources; lint and strict typecheck passed; all 17 Vitest files/38 tests passed (including four machine-map invariants); the optimized production build passed; and all 10 Playwright E2E tests passed in 39.6 seconds against the isolated E2E database.
- In the restricted process sandbox, Playwright executed all E2E test bodies successfully but could not terminate its Windows Next process tree. Re-running the identical command with process-tree permission exited normally with 10/10 passing; no test/config workaround was retained.

### 2026-07-21 - Local Blueprint Reconciliation explorer

- Added the authenticated, read-only `/blueprints` route and desktop/mobile `Blueprint Audit` navigation entry so the owner can inspect Reconciliation v1 in the local application.
- Added a server-only, Zod-validated loader for `docs/integration/blueprint-module-map.json`. The browser receives a serializable view model rather than filesystem access or any live provider secret.
- The explorer displays the evidence-only/Phase 3 lock state, 10 authorized scenarios, 294 Make modules, 173 Google Sheet modules, 20 missing `sheetId` blockers, zero callbacks, exact whitespace-preserving sheet names, operation counts, webhook metadata, completion evidence, conflicts, internal anomalies, WordPress side effects, and every Sheet module mapping.
- Module 4 opens as the recommended pilot candidate. Scenario selection remains presentation-only and cannot trigger a webhook, write a Sheet, change registry providers, create a job, or publish to WordPress.
- Added an E2E flow that signs in as a read-only viewer, verifies all reconciliation headline counts, inspects Module 4 ranges and pilot status, expands its detailed module table, and verifies Module 12's WordPress side effects are displayed as evidence only.
- Quality gates passed: lint, strict typecheck, all 17 Vitest files/38 tests, optimized production build with `/blueprints` emitted dynamically, and all 11 Playwright E2E tests. The first E2E pass encountered cold-Turbopack timeouts on two pre-existing tests while the new blueprint test passed; the unchanged full suite passed 11/11 with the cache warm.
- Started a local development preview at `http://127.0.0.1:3000`; health returns 200 and unauthenticated `/blueprints` correctly redirects to `/login`. This is a local process only, not a deployment.

### 2026-07-21 - Module 1 Neon bridge foundation and Vietnamese UI

- Recorded the owner's explicit choice of Module 1 as the Phase 3 pilot and Neon/PostgreSQL as the intermediate cloud database. The original Module 4 recommendation remains historical evidence, not the active product decision.
- Added `sitemap_pilot_jobs` to SQLite for safe local/mock execution and applied migration `drizzle/0001_organic_baron_zemo.sql` to the development database.
- Added a completely separate PostgreSQL schema and Drizzle migration set under `drizzle-bridge/`. The bridge table stores workspace/project identity, input/output JSON, status, attempts, optimistic version, timestamps, sanitized errors, and a workspace-scoped idempotency constraint.
- Added security-definer PostgreSQL functions for Make to claim, complete, and fail Module 1 jobs with typed parameters. Public execute rights are revoked; the documented Make role receives function execution only and no direct table access.
- Added `NeonSitemapPilotJobRepository`, `MakeAutomationProvider`, server-only environment selection, outbound request timeout, and a payload-minimizing webhook contract containing only job identifiers. Neither the database URL nor site input is sent through the webhook.
- Added authenticated `POST /api/v1/sitemap-jobs` and workspace-scoped polling `GET /api/v1/sitemap-jobs/:jobId`. Owner/editor can run; viewer remains read-only. Duplicate idempotency keys return the original job without dispatching twice.
- Added `/automations/sitemap`, which supports the complete local form → persisted job → provider → output display path. Mock mode generates an explicitly marked sample Sitemap without external calls; `neon_make` mode is fail-closed and requires valid Neon/Make configuration.
- Localized the application navigation, authentication, project/workspace forms, automation catalog, Blueprint explorer, placeholder screens, validation feedback, runtime status, seeded records, and Module 1 pilot into Vietnamese.
- Added `docs/integration/module1-neon-pilot.md` with the exact new contract, Blueprint-to-bridge provenance, Neon roles/grants, Make module conversion, success/failure handling, idempotency test, and activation checklist.
- Installed the official `@neondatabase/serverless` driver. The dependency audit completed with zero vulnerabilities at installation time.
- Applied the local migration and reran the idempotent seed. No Neon migration, live Make webhook, Google Sheet operation, WordPress action, external account change, or production deployment was performed.
- Phase 3 pilot foundation quality gates passed: lint with zero warnings, strict typecheck, 20 Vitest files/44 tests, optimized production build, and 12 Playwright E2E tests. The new E2E covers the Vietnamese Module 1 form, persisted mock job, terminal result, and rendered Sitemap output.
- The first sandboxed E2E command executed all 12 test bodies successfully but timed out while Playwright attempted to terminate the Windows Next process tree. The identical suite was rerun with process-tree permission and exited normally with 12/12 passing in 48.9 seconds.
- Drizzle Kit reports the PostgreSQL bridge migrations are internally consistent. The development SQLite database reports `integrity_check=ok`, zero foreign-key violations, two applied migrations, and the `sitemap_pilot_jobs` table present.
- Full and production-only npm audits report zero vulnerabilities. A scan of 28 generated browser static files found zero references to `BRIDGE_DATABASE_URL`, Make webhook environment keys, Vault/session secrets, or callback secrets.

## Next vertical slice

The OAuth/AI foundation below is complete and remains mock-first. The next action is an owner-assisted canary: link the separate Google email, then validate one AI provider at a time, starting with DeepSeek, before enabling the Neon + Make Module 1 route. Keep all other scenarios, original Google Sheet mappings, WordPress actions, callbacks, JobCoordinator work, and production deployment out of scope until separately reviewed.

### 2026-07-22 - OAuth, four-provider AI registry, and Module 1 AI routing

- Added SQLite migration `drizzle/0002_sudden_exodus.sql` with `auth_accounts`, encrypted `oauth_connections`, and idempotent `ai_test_runs`. The development database now has three applied migrations, `integrity_check=ok`, zero foreign-key violations, and all three tables present.
- Added Google and Make OAuth authorization-code flows with encrypted 10-minute transaction cookies, state validation, PKCE S256, nonce validation, JWKS signature verification, trusted Make OIDC discovery, exact callback construction from `NEXT_PUBLIC_APP_URL`, and no automatic account provisioning. A new email must be linked from an existing authenticated local account before it can log in.
- Split identity linking from service authorization. Google login requests only `openid email profile`; Drive/Sheets scopes are requested only by the explicit automation connection action. Make automation scopes remain a required environment value copied from the approved OAuth client and are not guessed in code or docs.
- OAuth access/refresh tokens are encrypted by the existing AES-256-GCM Vault with workspace/user/provider authenticated context. No token, client secret, API key, Neon URL, or Make webhook is returned by the status UI.
- Replaced the AI placeholder with a provider-neutral registry and direct server adapters for OpenAI, DeepSeek, Google Gemini, and Anthropic Claude. Default model configuration is environment-driven (`gpt-5.6-terra`, `deepseek-v4-flash`, `gemini-3.6-flash`, `claude-sonnet-5`) and can be changed without editing code.
- `AI_EXECUTION_MODE=mock` remains the default. Live mode requires a configured server-only key for the selected provider and an explicit per-request cost confirmation checked by both UI and API. There is no automatic retry, cross-provider fallback, or live-to-mock fallback.
- Added authenticated `GET /api/v1/ai/providers` and permission-gated `POST /api/v1/ai/test`. AI test prompts are represented at rest only by SHA-256; returned text is encrypted in SQLite and protected by a workspace-scoped idempotency key.
- Extended the Module 1 input contract with an allowlisted `{ai: {provider, model}}` selection. The Vietnamese Sitemap UI defaults to DeepSeek to remain closest to the supplied Module 1 Blueprint while permitting the other three reviewed routes.
- Added PostgreSQL bridge migration `drizzle-bridge/0002_module1_ai_routing.sql` with `claim_sitemap_job_v2`. It validates the AI routing object and returns `ai_provider`, `ai_model`, and `sites` to Make while preserving the original claim function for compatibility. Public execute remains revoked; the Make role must receive explicit execute on v2.
- Documented that Antigravity direct AI adapters and Make-managed AI connections are separate credential domains. The Module 1 canary uses Make-managed model connections; neither OAuth tokens nor AI keys are put in the job or webhook.
- Added `docs/integration/oauth-ai-live-readiness.md` and updated the Module 1 runbook with exact callback URIs, secret placement, claim v2, four-provider router mapping, blockers, and a one-provider-at-a-time canary sequence.
- Updated Next.js from 16.2.10 to 16.2.11 and forced the full dependency tree to `sharp@0.35.3` after npm audit found two high-severity inherited libvips advisories in `sharp@0.34.5`. The final full and production-only audits both report zero vulnerabilities.
- Final gates after the dependency patch: lint passed with zero warnings; strict typecheck passed; 23 Vitest files and 51 tests passed; the optimized Next 16.2.11 production build passed; all 13 Playwright tests passed in 1.3 minutes; Drizzle reported no unexpected bridge-schema diff; 28 generated browser static files contained zero sensitive environment-name or configured-secret matches.
- The E2E suite now covers the complete AI mock page and still covers the Module 1 form → persisted job → terminal Sitemap result. It runs against a recreated isolated SQLite file and made no external request.
- No Google/Make OAuth authorization occurred, no model API consumed credits, no Neon migration was run, no Make webhook/scenario/API was called, and no Google Sheet, WordPress, callback, live JobCoordinator, or production deployment was activated in this slice.

### 2026-07-22 - Vercel/Neon staging foundation

- Created and linked the Vercel project `antigravity-seo-automation`; the intended temporary URL is `https://antigravity-seo-automation.vercel.app` and Node functions are pinned to Singapore (`sin1`). No deployment has been published yet.
- Created a private Vercel Blob store in Singapore and linked it to Production, Preview, and Development. Added a path-validating `VercelBlobStorageProvider` with private access by default, overwrite protection, and dependency-injected unit coverage. The current UI does not yet upload files.
- Added a separate PostgreSQL application schema/migration set under `drizzle-postgres/` for the 21 tables used by current staging features. SQLite remains the local/test source; runtime repository factories select Neon only for PostgreSQL URLs.
- Added Neon repositories for projects, workspaces, automation registry, and pipeline previews, plus dual-dialect auth/session/OAuth/AI/knowledge data access. Multi-write project/workspace operations use Neon HTTP batch transactions.
- Added a Neon staging seed with an OAuth-only owner, idempotent automation catalog, sample project, pipeline, knowledge, and prompt data. The exact verified Google email can claim the pre-seeded owner only when it matches `OAUTH_BOOTSTRAP_EMAIL`; no open signup or arbitrary auto-provisioning was introduced.
- Added distinct migration tracking schemas for the app and Module 1 bridge so both migration sets can safely share one Neon branch. Owner/migrator URLs remain local-only; Vercel receives only runtime URLs.
- Added `vercel.json`, the owner-assisted runbook in `docs/deployment/vercel-staging.md`, server route duration limits, production persistence validation, and non-secret Vercel variables for Blob, model selection, timeouts, and live-capable AI mode. `SITEMAP_PILOT_MODE` remains `mock` until the Make scenario and bridge role are verified.
- Quality gates after the staging refactor: lint and strict typecheck pass; 24 Vitest files and 56 tests pass; optimized Next.js 16.2.11 production build passes; 13/13 Playwright E2E tests pass; full and production dependency audits report zero vulnerabilities; 28 browser static artifacts contain zero sensitive environment-name or configured-secret matches.
- The first E2E attempt hit two cold-cache timeouts on a filesystem Next.js measured as slow. Test assertions were unchanged; navigation/test timeouts were raised, and the complete suite then passed 13/13.
- Blockers before first deploy: the new Google email, Neon test-branch URLs, two application secrets, Google/Make OAuth credentials and approved Make scopes, four AI keys, and later the verified Module 1 webhook. No Neon migration, OAuth authorization, model call, Make job, Sheet write, WordPress action, or credit-consuming test has occurred.

### 2026-07-22 - First public staging deployment and smoke test

- Published the clean staging build at `https://antigravity-seo-automation.vercel.app`; the final reviewed deployment is `dpl_98nMLnF8DrW2jK8Dphp9azfffvbh` and keeps the product runtime in mock mode.
- Applied the complete `drizzle-postgres/` application migrations and `drizzle-bridge/` Module 1 migrations to the configured Neon staging database, then ran the idempotent OAuth-only staging seed for `giangvu4131@gmail.com`.
- The first seed attempt correctly failed closed because the owner email had been encoded incorrectly by a PowerShell stdin update. The exact email was rewritten with Vercel CLI `--value`; the next migration/seed/build completed successfully.
- Removed `BRIDGE_MIGRATOR_DATABASE_URL` from Vercel after migration. Added `.vercelignore` and redeployed without `.env`, `.env.local`, SQLite files, local storage, test artifacts, or temporary files in the source bundle.
- Production smoke checks passed: `/api/v1/health` returned HTTP 200; `/api/v1/ready` returned HTTP 200 with database, Vault, auth, mock automation, and private Vercel Blob ready; `/` and `/login` returned HTTP 200.
- Google OAuth start returned HTTP 302 to Google's authorization endpoint with the exact callback `https://antigravity-seo-automation.vercel.app/api/v1/oauth/google/callback`. No user consent or token exchange was performed by Codex.
- Local quality gates passed: lint with zero warnings, strict typecheck, 24 Vitest files/56 tests, optimized production build, and 13/13 Playwright tests in 1.5 minutes. An earlier run exceeded the external process limit only after its final passing case; the permission-enabled rerun exited cleanly with code 0.
- `AI_EXECUTION_MODE=mock` was explicitly restored for Production and Preview because the four provider accounts have no funded balance. No OpenAI, DeepSeek, Gemini, or Claude request was sent, and no credits were consumed.
- Corrected the Module 1 runtime cards so Vercel accurately reports `Neon Postgres` and `Neon · job mô phỏng` instead of claiming SQLite/local-only persistence. The safety notice now states that the job is stored in Neon while Make, model APIs, Sheets, and WordPress remain untouched. Lint, typecheck, 56 Vitest tests, production build, and the focused four-test automation E2E suite all passed after this correction.
- Make OAuth is intentionally omitted. `SITEMAP_PILOT_MODE=mock` remains active; no Make webhook, Google Sheet, WordPress action, or live Module 1 job was called.
- Remaining live Module 1 blockers: add a least-privileged `BRIDGE_DATABASE_URL`, create/grant the Make PostgreSQL role, update the scenario to `claim_sitemap_job_v2`, and scope the custom webhook secret to Production before switching to `neon_make`.

### 2026-07-22 - Staging runtime repair and production-readiness audit

- Reproduced the owner-reported Vercel failures from server logs. `/ai` failed because `AI_EXECUTION_MODE` contained an invalid encoded value; `/automations/sitemap` failed because staging was effectively selecting `neon_make` without `BRIDGE_DATABASE_URL`.
- Normalized all non-secret Production and Preview values through Vercel CLI value arguments. `AI_EXECUTION_MODE=mock` and `SITEMAP_PILOT_MODE=mock` are now explicit; no model API or Make webhook was called.
- Made the automation catalog truthful: Module 1 now links only to its dedicated full form, while the other nine registry entries expose explicitly labeled schema mocks. Removed misleading SQLite/local labels from the Neon staging UI.
- The dedicated Module 1 page exposes project, market/location, primary keyword, tone, output language, AI provider/model, website description, competitors and a mock run action. Its successful E2E path creates a persisted job and renders a Sitemap result.
- Added route-specific error boundaries for `/ai` and `/automations/sitemap` with safe retry, Sentry capture and a non-secret log digest. Vercel login now hides the local password form and exposes only configured OAuth providers.
- Added `docs/production-readiness.md`, which explicitly distinguishes the real Vercel/OAuth/Neon foundation from mock or placeholder capabilities and records the ordered work required before production.
- Quality gates passed: lint with zero warnings, strict typecheck, 24 Vitest files/58 tests, optimized production build and 13/13 Playwright E2E tests. The sandboxed E2E pass executed all 13 cases but could not terminate the Windows server tree; the permission-enabled rerun exited cleanly with code 0 in 1.8 minutes.
- Current production boundary remains unchanged: Vercel/Google OAuth/Neon are real; Module 1 and AI execution remain mock; Blob has no upload UI; Pipelines, Outputs, Knowledge, Analytics and WordPress are not yet production features.
- Deployed this repair as `dpl_FTKywZ7tm6q73P2rYaedEnjv7ssT`, aliased to `https://antigravity-seo-automation.vercel.app`. Post-deploy health and readiness both returned HTTP 200, readiness confirmed `automationProvider=mock` and `storageProvider=vercel_blob`, the production login rendered Google OAuth only, and the 15-minute Vercel error query returned no entries.

### 2026-07-22 - Module 1 live-canary guardrails

- Recorded the owner decision to use Neon as the Module 1 source of truth, retain Google Sheets only as an explicit future fallback, and use the funded DeepSeek account for the first paid canary.
- Added per-provider AI live allowlisting. Production and Preview now use `AI_EXECUTION_MODE=live` with `AI_LIVE_PROVIDERS=deepseek`; DeepSeek can be called only after UI/API cost confirmation, while OpenAI, Gemini and Claude remain mock.
- Added fail-closed Module 1 live controls: `SITEMAP_LIVE_CANARY_ENABLED`, `SITEMAP_LIVE_ALLOWED_AI_PROVIDERS`, one-site limit, UI/API cost confirmation and a server-side provider allowlist. `neon_make` cannot start without the kill switch, a valid bridge URL and at least one allowlisted provider.
- Upgraded the webhook envelope to `sitemap-pilot/1.1` with the non-secret `sheetFallbackMode`. The first canary is fixed to `disabled`. `manual_mirror` is rejected unless `SITEMAP_SHEET_MAPPING_VERIFIED=true`; there is no automatic live-to-Sheet or live-to-mock fallback.
- Added a repeatable read-only `npm run module1:audit-live` command and `docs/integration/module1-live-canary.md` with the exact Make graph, Neon grants, activation order and evidence required before mass production.
- Vercel audit found `MAKE_WEBHOOK_RIS_SITEMAP` only in Preview and no `BRIDGE_DATABASE_URL` in either Preview or Production. Encrypted Vercel values cannot be exported for local SQL audit, so the least-privilege roles/grants still require Neon SQL Editor or a trusted local owner URL.
- Deployed the final guardrail/DeepSeek-default build as `dpl_CxBiNFNxdwF1vmAoxAM2yWfbkXQ4`, aliased to the staging domain. Health/readiness return HTTP 200, automation remains `mock`, Blob remains ready and the post-deploy error query is empty.
- Quality gates passed: lint, strict typecheck, 24 Vitest files/64 tests, optimized production build and 13/13 Playwright E2E tests with a clean process exit. No DeepSeek request or Make webhook was sent by Codex in this slice.

### 2026-07-22 - Module 1 Make blueprint import package

- Recorded the owner's report that the direct DeepSeek live test succeeded. The exact run ID/provider usage has not yet been independently retained in the repository; this is sufficient to continue configuring the Make canary but not final production evidence.
- Confirmed the newly supplied Module 1 export is byte-identical to the original Sheet-backed blueprint: 16 modules, nine Google Sheets modules, five DeepSeek modules, one custom webhook, one router and no PostgreSQL module.
- The first Make PostgreSQL attempt reached Neon but failed password authentication. The owner's later Make export contains PostgreSQL account `14453762` and dynamically loaded UUID parameters for `claim_sitemap_job_v2`, proving the least-privilege connection/function metadata now loads successfully. The owner role was not substituted.
- Verified the current official Make package metadata for `postgres:StoredProcedure`, `postgres:Query`, the DeepSeek V4-capable module, Make IML `parseJSON`/`escapeJSON`, and blueprint `onerror` structure from official Make endpoints/documentation.
- Added the canary blueprint at `docs/integration/make-blueprints/RIS 3.5 Module 1 - Sitemap - Neon Canary.blueprint.json`. It contains five main modules and two PostgreSQL failure routes, uses `claim_sitemap_job_v2`/`complete_sitemap_job`/`fail_sitemap_job`, hard-allowlists DeepSeek V4 Flash, and contains zero Google Sheets/WordPress/Facebook modules, database URLs or API keys.
- Added `docs/integration/module1-make-blueprint-import.md` with the exact Neon role reset, Make connection fields, import/remapping sequence and a zero-cost dummy webhook test that stops on an unknown job before DeepSeek.
- The owner's first import/export revealed that v1.1 used unsupported bracket access after `parseJSON`, name-based function mapper keys that Make replaces with positional typed keys, and did not retain every account connection. These were real blueprint defects, not ignored warnings.
- Repository gates after adding the package passed: lint with zero warnings, strict typecheck, all 24 Vitest files/64 tests and the optimized Next.js 16.2.11 production build.
- No Make webhook was called, no scenario was activated, no Neon role/password was changed by Codex, and no model request was sent in this slice.

### 2026-07-22 - Module 1 Make blueprint v1.2 repair

- Audited the exact blueprint exported by Make after the owner imported v1.1. Make preserved webhook `4274190`, PostgreSQL account `14453762` and DeepSeek account `14453773`; these non-secret, team-specific references are now retained in v1.2.
- Replaced all seven invalid `parseJSON(...)[1].field` expressions with Make-supported `get(parseJSON(...); "1.field")` paths. Replaced the competitor URL expression with `join(get(parseJSON(...); "1.competitorUrls"); "\\n")` and applied the same path fix inside the completion JSON.
- Replaced every incorrect name-based PostgreSQL mapper key with the positional typed keys proven by the owner export: `@01:uuid`, `@02:uuid`, `@03:jsonb` and `@03:text`. Restored mappings for claim, complete and both failure handlers.
- Bound all four PostgreSQL modules and both DeepSeek modules to the account IDs from the owner's export. The blueprint remains free of passwords, database URLs, webhook URLs and API keys; it is intentionally account-bound and should not be distributed to another Make team as a generic template.
- Added `npm run module1:validate-blueprint`, which fails on missing account bindings, missing/empty typed function mappings, bracket access after `parseJSON`, split Make expressions, old `@p_*` mapper keys, disallowed Sheet/publishing modules, unbalanced IML or embedded secret URLs/keys.
- v1.2 validation passed with seven modules, four PostgreSQL modules, two DeepSeek modules, six bound module connections, one bound webhook, zero disallowed modules and 23 balanced IML expressions.
- Quality gates passed after the repair: lint, strict typecheck, all 24 Vitest files/64 tests and the optimized Next.js 16.2.11 production build.
- No scenario import, activation, webhook call, Neon write or DeepSeek request was performed by Codex during the repair.

**Canary blockers:** import v1.2 over the disabled canary scenario, open/save all seven modules so Make refreshes live metadata, confirm zero red validation badges, run the unknown-job zero-cost webhook test, then export the scenario again for structural review. `BRIDGE_DATABASE_URL`, the Preview webhook and `SITEMAP_PILOT_MODE=neon_make` remain unchanged until that review.

### 2026-07-23 - Module 1 v1.2 baseline audit and quality-gate re-verification

- Re-oriented against the actual repository per the source-of-truth policy rather than trusting the handoff alone. No new Make re-export exists in the repository yet; the audit target for this slice is the canonical v1.2 blueprint. Auditing the owner's real Make re-export remains pending the owner import/save/badge-clear/zero-cost-test/export cycle and is explicitly deferred.
- Confirmed the canonical blueprint at `docs/integration/make-blueprints/RIS 3.5 Module 1 - Sitemap - Neon Canary.blueprint.json` is unchanged: SHA-256 `eb457239e3b26b1651e1aea68cda386c75e4032ecc670c16f2f7b45b7b224b14`.
- Manually reconciled the seven modules: custom webhook (hook `4274190`) → `claim_sitemap_job_v2` idempotency/contract gate → DeepSeek sitemap generation → DeepSeek 30-label selection → `complete_sitemap_job`, with the two `onerror` routes under modules 3 and 4 both calling `fail_sitemap_job`. Flattened module count is 7 (4 PostgreSQL, 2 DeepSeek, 0 disallowed).
- Verified account bindings are intact and non-secret: webhook `4274190`, PostgreSQL account `14453762` on all four Postgres modules, DeepSeek account `14453773` on both model modules.
- Verified typed positional mapper keys and cross-checked each against the migration function signatures in `drizzle-bridge/0001_module1_bridge_functions.sql` and `0002_module1_ai_routing.sql`: claim `@01:uuid`/`@02:uuid` ↔ `claim_sitemap_job_v2(uuid, uuid)`; complete `@01:uuid`/`@02:uuid`/`@03:jsonb` ↔ `complete_sitemap_job(uuid, uuid, jsonb)`; both failure handlers `@01:uuid`/`@02:uuid`/`@03:text` ↔ `fail_sitemap_job(uuid, uuid, text)`. No name-based `@p_*` keys remain.
- Verified IML uses `get(parseJSON(2.sites); "1.field")`, `join(...; "\n")` for competitor URLs, and `escapeJSON(...)` inside the completion JSON; no `parseJSON(...)[index]` bracket access and no split `}}{{[...]` expressions remain.
- Confirmed the two guard filters: the claim gate requires `automationKey == RIS_SITEMAP` and `sheetFallbackMode == disabled`; the first DeepSeek module additionally requires `ai_provider == deepseek` and `ai_model == deepseek-v4-flash`. An unknown job yields zero claimed rows, so no bundle reaches DeepSeek and the zero-cost dummy test cannot incur model spend.
- Confirmed zero Google Sheets / WordPress / Facebook modules and a clean secret scan: no PostgreSQL URL, Make webhook URL, or API key is embedded; connections are referenced by numeric account IDs only.
- Quality gates run 2026-07-23 (Asia/Saigon), actual results: `module1:validate-blueprint` reported `status: valid` (7 modules, 4 PostgreSQL, 2 DeepSeek, 0 disallowed, 6 account-bound connections, webhook bound, 23 balanced IML expressions); `npm run lint` passed with zero warnings; `npm run typecheck` (strict `tsc --noEmit`) passed; `npm test` passed 24 Vitest files / 64 tests in 23.67s; the optimized Next.js 16.2.11 production build passed and emitted 18 routes. Playwright E2E was intentionally not run this slice because no application code changed; it remains at the last recorded 13/13.
- No Make webhook was called, no DeepSeek or other model request was sent, no Neon read/write occurred, no environment variable was changed, and no live activation was performed. `SITEMAP_PILOT_MODE=mock` and `SITEMAP_LIVE_CANARY_ENABLED=false` remain in effect; the canary blockers above are unchanged.
- Audited the owner's v1.1 Make export (SHA-256 `c2e3a71a8cdecd671d60a10e75060ed31e2602c6985d36456ca281ec9505440d`, moved from the repository root to `docs/integration/make-blueprints/RIS 3.5 Module 1 - Sitemap - Neon Canary v1.1 (Make export, rejected).blueprint.json`) as historical evidence only. It is a Make export that still carries ten embedded red-badge validation errors and reproduces exactly the defects v1.2 fixes: seven split `{{parseJSON(2.sites)}}{{[1].field}}` / `parseJSON(...) + [1]...` expressions in the sitemap prompt plus one `escapeJSON(parseJSON(2.sites)[1].reference)` bracket access in the completion JSON (all flagged "Unexpected ["); name-based `@p_job_id`/`@p_idempotency_key`/`@p_output`/`@p_error_message` mapper keys on the complete and both failure modules; empty `@01:uuid`/`@02:uuid` claim mappings; and lost PostgreSQL `account` bindings on the complete and both failure modules ("Connection: Value must not be empty"). Running `module1:validate-blueprint` against this file exits non-zero, rejected at the v1.2 name gate, confirming the validator refuses to certify it. This export supersedes nothing; v1.2 remains the only reviewed contract.
- Still open and not treated as verified (outside this slice): owner Neon owner-password rotation has no independent evidence retained in the repository; the owner-reported direct DeepSeek live-test still has no retained provider request ID or token-usage record.

### 2026-07-23 - Production direction kickoff + Slice 1 (competitor URLs optional)

- Owner authorized moving Module 1 off mock toward production, gradually. Chosen first slice: finish the Module 1 live canary on Vercel Preview (app-route, Make scenario ON); then harden. Approved hardening backlog: remove the Module 1 mock default (fail-closed), add a job timeout/retry sweeper, and clean demo/seed placeholder data. These are tracked as follow-up slices and are not yet implemented.
- Confirmed Neon is ready via `module1:audit-live` against a trusted owner URL: `sitemap_jobs` and all three functions exist; `antigravity_bridge_app` exists with direct `SELECT/INSERT/UPDATE` on `sitemap_jobs` and no function execute; `antigravity_bridge_make` has execute on all three functions and no direct table access. Remaining to go live on Preview: set `BRIDGE_DATABASE_URL` (app-role pooled URL) + flip `SITEMAP_PILOT_MODE=neon_make` / `SITEMAP_LIVE_CANARY_ENABLED=true` on Preview, redeploy, and turn the Make scenario ON.
- Slice 1 — made competitor URLs optional end to end. Input schema `competitorUrls` changed from `.min(1).max(5)` to `.max(5).default([])` in `src/domain/sitemap/sitemap-pilot.ts`; the Pilot form field is no longer required and its helper text/label reflect "tùy chọn". The app always sends `competitorUrls` as an array (possibly empty), so the currently imported Make v1.2 scenario keeps working (`join([])` yields an empty string).
- Bumped the canonical Make blueprint to **v1.3** and guarded the competitor prompt line with `ifempty(join(...); "Không có website đối thủ được cung cấp; hãy suy luận cấu trúc theo chuẩn ngành.")` so an empty competitor list produces a sensible instruction instead of a blank section. New SHA-256 `42658dffd1af8a48b46e0fce79e88e57f445dfc4d70fa1140b34032f22872c07`. The blueprint validator now accepts a reviewed `v1.2` or `v1.3` name. **The Make scenario still runs the previously imported v1.2**; v1.3 is imported at the next re-import cycle (it is not required for the first canary).
- Added `tests/unit/sitemap-pilot-input.test.ts` covering empty competitor list, defaulting to `[]` when omitted, up to five valid URLs, and rejection of >5 or invalid URLs.
- Slice 1 gates (2026-07-23): `module1:validate-blueprint` valid on v1.3 (7 modules, 4 PostgreSQL, 2 DeepSeek, 0 disallowed, 6 bound, 23 IML); `npm run lint` zero warnings; strict `npm run typecheck` clean; `npm test` 25 Vitest files / 69 tests pass; optimized Next.js 16.2.11 production build passes. E2E not run this slice (no route/server change to E2E-covered flows; the form change is client-side field validation only). No Make webhook, DeepSeek request, Neon write, or env/live change was performed.

### 2026-07-23 - First live Module 1 canary on Production + parseJSON IML fix (v1.4)

- Deployed the app to Vercel Production (`dpl_9oyedAESy6fXypuBL1fZUkRkCQ3v`) via `vercel --prod`. The owner set Production `SITEMAP_PILOT_MODE=neon_make` and `SITEMAP_LIVE_CANARY_ENABLED=true` (Vercel env changes and production redeploys are performed by the owner; the harness blocks the assistant from mutating Vercel env or triggering production deploys).
- Ran the first real paid canary. The pipeline executed live end to end at the infrastructure level: custom webhook received the envelope, `claim_sitemap_job_v2` returned the job with correct `workspace_id`/`project_id`/`ai_provider=deepseek`/`ai_model=deepseek-v4-flash` and a `sites` array whose `competitorUrls` was empty — confirming the competitor-optional change works against the live Make + Neon path. The DeepSeek module was reached (1 credit consumed), its error route called `fail_sitemap_job`, and the job was correctly marked `failed`. One-site, deepseek-only, cost-confirmation, and error→fail guardrails all behaved.
- Root cause of the DeepSeek step failure: the prompt used `parseJSON(2.sites)`, but Make's PostgreSQL `StoredProcedure` module already returns the JSONB `sites` column as a parsed array/collection. Running `parseJSON` on an already-parsed value produced `Function 'get' finished with error! Function 'parseJSON' not found!`. Fix: reference `2.sites` directly — `parseJSON(...)` removed from every expression (`get(2.sites; "1.field")`, `join(get(2.sites; "1.competitorUrls"); ...)`, `escapeJSON(get(2.sites; "1.reference"))`).
- Bumped the canonical blueprint to **v1.4**, SHA-256 `f00e32d320e104a4262c8d184a4779705f603c99fc05a543a479753522b7d757`; the validator now accepts a reviewed `v1.2`/`v1.3`/`v1.4` name and reports valid (7 modules, 4 PostgreSQL, 2 DeepSeek, 0 disallowed, 6 bound, 23 IML). The live Make scenario must adopt v1.4 (re-import into the same scenario preserves webhook `4274190`) before the next canary.
- Not marking Module 1 live-complete: no job has reached `succeeded` yet. Success requires one job `queued → succeeded` with a valid output contract in Neon, exactly one DeepSeek request, and zero Google Sheets/WordPress/Facebook writes, plus the duplicate-delivery and controlled-failure checks.

### 2026-07-23 - Module 1 DeepSeek canary succeeded end-to-end + output-display fix

- First fully successful paid canary on Production. Live job `dd7e37ac-b72b-4e7c-964c-cf60a4ff1077` went `queued → succeeded`: Make claimed it, DeepSeek generated the full sitemap and selected labels, `complete_sitemap_job` wrote the v1.0 output contract to Neon, and the Antigravity UI polled and rendered both the draft and selected sitemaps. Real Make execution, real DeepSeek spend, valid output, competitor list left empty (optional), zero Google Sheets/WordPress/Facebook writes.
- Fixed an output-display defect: the Neon read path validated stored output with the strict `sitemapPilotOutputSchema` and threw when Make's output deviated, turning the polling GET into a 500 and leaving the UI stuck on "running". Added `parseStoredSitemapPilotOutput` — a lenient reader that strips unknown keys, coerces array/number text fields to strings, and never throws — and switched `NeonSitemapPilotJobRepository.mapRow` to it. Added four unit tests. Gates: lint zero warnings, strict typecheck, 25 Vitest files / 73 tests, validate-blueprint valid on v1.4.
- Module 1 (DeepSeek, single provider) is live-complete on Production. Still pending: duplicate-delivery and controlled-failure re-tests. Next, by owner priority: multi-provider (OpenAI/Gemini/Claude/DeepSeek) blueprint expansion and Make-API-based AI key management (owner chose the Vercel→Make-API direction), to be built with a verified-secure design before touching the other nine modules.

### 2026-07-23 - App-native BYOK: adapter factory + per-user encrypted AI key storage

- After reviewing masterseo.ai (an app-native BYOK SEO platform that calls OpenAI directly with the user's key), the owner switched the AI-key direction from "relay to Make via Make API" to **app-native BYOK, scoped per user**: each user enters their own provider key, the app decrypts it server-side and calls the existing AI adapter directly. This removes the Make API token (the most dangerous secret) and keeps keys entirely inside Antigravity. Make's role for the AI step shrinks; the multi-module pipeline becomes an app-native orchestrator (JobCoordinator), which handles long runs via async/polling rather than a single request.
- Added `buildUserAiProviderConfiguration` + `getUserAiModelProvider` (`src/lib/ai/ai-provider-registry.server.ts`): build any of the four existing live adapters (OpenAI/DeepSeek/Gemini/Anthropic) from a user-supplied, server-decrypted key. Five unit tests.
- Added per-user key storage: `user_ai_keys` in both dialects (SQLite `drizzle/0003_regular_piledriver.sql` applied locally; Neon `drizzle-postgres/0001_special_leader.sql` pending apply to staging), unique on `(user_id, provider)`. Added `AiKeyService` (Vault AES-256-GCM, AAD `ai-key/v1/{userId}/{provider}`) with `SqliteAiKeyRepository` + `NeonAiKeyRepository` and a `getAiKeyService()` dialect factory. The service returns only status views (provider, configured, status, `keyHint` = last 4 chars, timestamps) — never the key or ciphertext; the raw key is decrypted server-side only for verification and Module 1 execution. Three integration tests assert encrypt/round-trip, upsert-resets-verified, delete, and that status views never contain the key.
- Gates: lint zero warnings, strict typecheck, 27 Vitest files / 81 tests. No live external call, no key stored in plaintext, no deploy in this slice.
- Remaining for the feature: API endpoints + masterseo-style "API Keys" screen (key never returned to the browser) with a Verify button; then wire Module 1 to app-native execution using the user's key; apply the Neon migration to staging before it ships.

### 2026-07-23 - BYOK "API Keys" screen + endpoints

- Added authenticated per-user endpoints `GET/POST/DELETE /api/v1/ai/keys` and `POST /api/v1/ai/keys/verify` (`requireApiIdentity`, keyed by `identity.userId`). Save validates + Vault-encrypts through `AiKeyService`; every response exposes only status views (provider, status, `keyHint`, timestamps) — never the key or ciphertext. Verify decrypts the user's key server-side, makes a 16-token test call through the existing adapter, marks the key `active`/`error`, and returns a generic message without echoing raw provider errors.
- Added the masterseo-style `/ai-keys` screen: one card per provider with a paste field (reveal toggle, `type=password`, `autoComplete=off`), Save, Verify, Delete, a status badge, and the stored `keyHint`. Added desktop and mobile nav entries ("API Keys").
- Gates: lint zero warnings, strict typecheck, 27 Vitest files / 81 tests, and the optimized production build passes with `/ai-keys`, `/api/v1/ai/keys`, and `/api/v1/ai/keys/verify` emitted.
- To ship on staging (owner): apply the Neon migration `drizzle-postgres/0001_special_leader.sql` (creates `user_ai_keys` on Neon), then deploy. `VAULT_ENCRYPTION_KEY` is already configured on Vercel. Next: B2 — wire Module 1 to run app-native using the stored key.
- Per-user model selection (masterseo-style): the hardcoded env model defaults (`gpt-5.6-terra`, `claude-sonnet-5`, …) were wrong for the owner's accounts and made OpenAI/Anthropic verify fail with HTTP 400. Added a `model` column to `user_ai_keys` (SQLite `drizzle/0004`, Neon `drizzle-postgres/0002`), a curated per-provider model catalog with cost/speed hints (`src/domain/ai/ai-model-catalog.ts`), and a model selector on the screen (dropdown of suggested models plus a free-text "custom" option). `saveKey` stores the chosen model; verify and (later) Module 1 use the user's model, falling back to the provider default only when unset. Added an integration test for model save + `getUsableKey`. Gates: lint, strict typecheck, 27 Vitest files / 82 tests, production build all pass.
### 2026-07-25 - GEO loop closed (#13 trọn gói) + social modules #14–#16 build-ready + backend hardening/audit

- Owner asked what users actually DO with llms.txt/sitemap.xml (non-technical GEO), chose: guide-first now + WP auto-deploy later, build ALL of FB/Zalo/GBP token-ready, and full hardening+audit with immediate fixes before Phase 3.
- **#13 → "GEO trọn gói"**: now outputs 4 blocks — a step-by-step AI-written deploy guide for non-technical users (upload via WP plugin/cPanel, Google Search Console submission, how to check AI has "seen" the site, maintenance), llms.txt, sitemap.xml, and a deterministic robots.txt allowing the main AI crawlers (GPTBot, OAI-SearchBot, PerplexityBot, ClaudeBot, Google-Extended, Bingbot, CCBot) + Sitemap pointer.
- **Social publishing infra**: `project_integrations` type enum extended (facebook/zalo/google_business — TS-level, no migration); generic per-project vault-encrypted credential store (`integration-service.server.ts`, AAD per workspace+project+type), API `GET /projects/[id]/integrations` + `PUT .../[type]` (token never returned), engine resolves + injects credentials for `needsIntegrations`, fail-closed Vietnamese errors. Runner shows a "Kết nối nền tảng" card (status badge + config fields + token input) for modules that need it.
- **Modules #14 `RIS_FB_PUBLISH` / #15 `RIS_ZALO_PUBLISH` / #16 `RIS_GBP_PUBLISH`**: AI writes the caption from upstream (headline/intro), link auto-extracted from the #12 WordPress result (or manual), then Graph API feed post / Zalo OA v3 message / GBP localPost. Build-ready; owner tests when tokens exist (GBP token ~1h validity documented). API error bodies passed through (truncated) for first-run adjustment.
- **Hardening (fix ngay)**: lazy no-cron sweeper — any non-terminal job older than 15 min flips to `timed_out` on read with a "chạy lại bằng Presets" message (module engine + Module 1 sitemap path); `errorResponse` now maps ZodError → 400 with field issues (was generic 500). Full route/auth/secret audit written to `docs/audit-2026-07-25.md` — no critical findings; known gaps recorded (rate limiting, seed cleanup in Phase 3, Zalo/GBP first-live-call risk, Module 1 bridge unification).
- Gates: lint 0, typecheck 0, 30 files / 122 tests, production build pass. No external platform call made by the assistant.

### 2026-07-25 - Phase 2 begins: Module #12 WordPress publish (draft-first) + Module #13 GEO Files + pipeline publish step

- Owner chose all four platform groups (WordPress, Facebook, llms.txt/sitemap, GBP/Zalo), draft-first publishing, and per-project vault-encrypted credentials. This batch ships the two that need no external accounts beyond the project's existing WordPress settings; Facebook/GBP/Zalo need owner-side tokens (prep list in roadmap).
- **Engine extension**: `ModuleDefinition` gains `requiresAi: false` (engine skips the BYOK key requirement) and `needsIntegrations: ["wordpress"]` — the engine decrypts the project's WordPress Application Password server-side (new `lib/integrations/wordpress-credentials.server.ts`, AAD `wordpressCredentialContext`, fail-closed with a clear Vietnamese error if the project hasn't configured WordPress) and injects it into `execute` via a new `integrations` context field. Credentials never touch the job record, logs, or the browser.
- **Module #12 `RIS_WP_PUBLISH`** (Đăng WordPress, no AI call): assembles the post from upstream — title from Module 7 (or manual override), intro (8) + body (10) via a line-based minimal markdown→HTML converter, FAQ (11) as a "Câu hỏi thường gặp" section, and the Module 11 JSON-LD `<script>` embedded — then POSTs to `{site}/wp-json/wp/v2/posts` with Basic auth (Application Password). Default status draft (owner decision); output includes post link + reminder to review in WP. Clear error when no upstream content exists yet.
- **Module #13 `RIS_GEO_FILES`**: llms.txt generated by AI per llmstxt.org format (site name, entity-rich summary, section links) + sitemap.xml built deterministically from sitemap labels (Vietnamese-safe slugs). Both rendered as copyable blocks to place at the site root.
- **Pipeline**: optional final step checkbox on Quy trình — "đăng WordPress (bản nháp) sau khi cả chuỗi xong" appends #12 to the live graph and run sequence. Catalog links Module 12 card + a "GEO Files · Module 13" header button; stale #12 card description overridden.
- Tests: WP publish covered with a stubbed fetch (Basic auth header, draft status, title extraction from Module 7, HTML content incl. headings/FAQ/JSON-LD, no-content error) plus lifecycle coverage for #13; select/url-aware input builder. Gates: lint 0, typecheck 0, 30 files / 119 tests, production build pass. No real WordPress call was made by the assistant — owner tests with their configured project.

### 2026-07-25 - Visible preset buttons (masterseo-style dropdowns) on input AND output, including Module 1

- Owner couldn't find the preset control (they were on Module 1's page, which had none; the panel elsewhere only appeared after runs and wasn't an explicit button). Per instruction — "1 button bên input và 1 button bên output, ghi rõ timestamp + nội dung tóm tắt" (mirroring masterseo.ai's "Presets ▾ Manage presets…" pattern) — built a shared `RunPicker` dropdown (`src/components/modules/run-picker.tsx`): each row = timestamp + one-line summary (+ status, 📌 marker), optional pin toggle per row.
- Wired on BOTH pages: the generic runner (modules 2–11) — "Presets" button in the input card header (loads that run's form values; rows show input summary + status + pinned) and "Lịch sử kết quả" button in the result card header (succeeded runs; pick to view that output; pin/unpin inline) — replacing the old below-the-fold history panel; and **Module 1 (Sitemap)** — same two buttons, backed by new history plumbing for the bridge store: `SitemapPilotJobRepository.listRecentForProject` (Neon bridge + SQLite), `SitemapPilotService.listHistory`, `GET /api/v1/sitemap-jobs?projectId=`. Module 1 has view/preset history but no pinning (bridge table has no pinned_at; Module 1 feeds no downstream chaining yet — noted in roadmap).
- Gates: lint 0, typecheck 0, 30 files / 114 tests, production build pass.

### 2026-07-25 - Pipeline moved to Quy trình with live graph; run history + pinning ("choose an older result"); roadmap doc

- Owner feedback batch (all three choices = recommended): (1) the full-flow runner belongs on the **Quy trình** page (with graph visualization), Automations stays step-by-step with clearer wording; (2) explicit preset controls were missing; (3) since Neon keeps every run, users must be able to pick an OLDER result (e.g. run 2 of 3) as the official one. Also recorded the owner's ordering decision in a dedicated plan: finish functionality + WordPress/other integrations FIRST, frontend/UI-UX LAST → `docs/roadmap.md`.
- **Pinning**: `module_jobs.pinned_at` added (SQLite `0006_harsh_praxagora.sql` applied locally; Neon `drizzle-postgres/0004_unique_sleeper.sql` — **owner applies with migrator URL**). Repos gained `listRecentForModule` + `setPinned` (pin one per project+module, unpin others); `listLatestSucceededByProject` and `getLatestForModule` now prefer the pinned run over the latest, so **chaining, upstream context, and presets all follow the pinned "official" version**. Service adds `listHistory`/`pin` (only succeeded runs pinnable); API: `GET /api/v1/modules/[key]/jobs?projectId=` (history) and `POST|DELETE .../jobs/[id]/pin`.
- **Runner UI "Lịch sử & preset" panel**: per project+module, last 10 runs with timestamp, status, "Bản chính thức" badge, and actions — Xem (load that run's output into the result pane), Nạp input (visible preset button restoring that run's form values), Dùng kết quả/Bỏ ghim (pin toggle). History refreshes on project switch and after each terminal run.
- **Quy trình page replaced** (per owner: old Phase 2 read-only preview retired): `/pipelines` now hosts the live article-pipeline runner with a horizontal node graph (per-step cards colored by live status: chờ/đang chạy/xong/lỗi, arrows, category chips) plus the detailed progress list and Markdown package export. `/automations/pipeline` removed; catalog header links to "Chạy cả luồng ở Quy trình". Automations page retitled "Tự động hóa · chạy từng bước" with explainer text, and the stale Phase-2 card descriptions are overridden with the live module descriptions. Module 2's bespoke page now redirects to the generic runner (`/automations/run/RIS_SITEMAP_KEYWORDS`) so every module shares presets/history/pinning; e2e spec updated for the new pipelines page.
- Tests: new SQLite integration test proving default-latest → pin wins → unpin restores (repo-level), plus full suite. Gates: lint 0, typecheck 0, 30 files / 114 tests, production build pass. Owner actions: apply Neon migration 0004 (pinned_at) then redeploy.

### 2026-07-25 - Project workspace: auto-chaining, reload presets, article pipeline, GEO schema (#11), Markdown export

- Turned the standalone modules into a project-scoped workspace with real chaining. Owner choices: full run history (already satisfied — `module_jobs` persists every run to Neon by projectId, no migration), project-level shared context auto-filled everywhere, one-click article pipeline #2→#3→#5→#7→#8→#10, and all four GEO boosters (JSON-LD/FAQ pack, final-package assembly/export, auto-fill from prior modules, quick-answer + comparison-table prompts).
- **Server-side auto-chaining** (no manual paste): `ModuleJobRepository` gained `getLatestForModule` + `listLatestSucceededByProject`; the engine now loads each project's latest succeeded outputs and passes them to `execute` as `upstream` (flattened per `outputBlocks`). Modules #3/#5/#6/#7/#8/#10/#11 declare `consumes` and inject upstream context into their prompts, so a downstream module automatically uses whatever the project already produced. Optional paste fields remain as overrides.
- **Reload-safe presets + shared context**: new `GET /api/v1/modules/[moduleKey]/context?projectId=` returns the latest input for the module (restores the form after reload), a shared-context bundle (language/location/audienceBrief/tone from the project's most recent run — enter once, reused), and the list of succeeded upstream modules. The generic runner prefills from it and shows a "Nối luồng tự động: sẽ dùng kết quả Module X" banner. (No `projects` table change — shared context is derived from stored runs, keyed by project.)
- **Module #11 `RIS_GEO_SCHEMA`** (Giáp GEO): generates a prompt-aligned FAQ + valid JSON-LD (FAQPage + Article) to paste into `<head>` — the strongest 2026 GEO lever. Content prompts (#6/#10, and answer-first #8) upgraded with a shared `geoExtractionGuidance` (quick-answer block on top, topic-sentence-first, comparison tables, entities/data for citation).
- **Article pipeline** `/automations/pipeline`: client-orchestrated (each step is its own request/`after()` invocation, so no serverless-timeout risk) running #2→#3→#5→#7→#8→#10→#11 in order; shared inputs entered once, each step's payload built from that module's own `form` fields (strict-schema-safe), upstream fed forward automatically via the DB; per-step progress, then assembles a Markdown package with copy + `.md` download (ready for the future #12 WordPress publish). Catalog header links "Chạy cả luồng" + "Giáp GEO · Module 11".
- Tests: upstream-context injection, article-pipeline ordering, plus the existing 9-module parametrized + lifecycle coverage. Gates: lint 0, typecheck 0, 29 files / 113 tests, production build pass (`/automations/pipeline` + `/api/v1/modules/[moduleKey]/context` compiled). No live model call by the assistant; owner redeploys (no migration) and runs the pipeline with DeepSeek.

### 2026-07-25 - Modules #3–#10 (7 content/research modules) on the shared engine + generic runner

- Owner verified Module 2 live (SEO keyword plan + GEO plan rendered). Per owner's choices (build the 7 content-generating modules #3–#10 this batch, ONE generic schema-driven runner page, standalone-first with chain-ready input/output; leave #12 Publish for later), added all seven on the existing engine — **no DB migration** (the generic `module_jobs` table already covers every module; owner just redeploys).
- `ModuleDefinition` now also carries `description`, a declarative `form` (fields for the generic runner) and `outputBlocks` (which output keys to render), plus `toModuleDefinitionView` to pass serializable metadata to the client. Shared `definitions/shared.ts` holds the localized field set (language/location/audienceBrief) + prompt context helper so modules stay consistent (chain-ready).
- New modules (all BYOK, SEO+GEO prompts, standalone-runnable): #3 `RIS_ICN_KEYWORDS` (internal content network: pillar+cluster+internal-link map + GEO), #4 `RIS_IMPORTED_KEYWORDS` (clean/group/prioritize a pasted keyword list), #5 `RIS_ONPAGE_SEO` (title/meta/headings/slug/schema + GEO snippet), #6 `RIS_HOMEPAGE_CONTENT`, #7 `RIS_CONTENT_HEADLINE`, #8 `RIS_CONTENT_INTRO` (answer-first), #10 `RIS_CONTENT_SECTIONS` (full body from outline). Optional fields (seed keywords, outline, headline) let each run standalone or accept a previous module's output pasted in — the seam for future chaining.
- UI: one generic runner `/automations/run/[moduleKey]` renders each module's declared form (project + AI provider handled by the shell; per-module fields with project prefill for language/location/tone; textarea `asLines` → string[]), posts to the generic route, polls, and renders `outputBlocks`. Catalog now links Modules 1–10 to their pages (1 & 2 bespoke, 3–10 the generic runner); only #12 remains a schema preview.
- Tests: parametrized coverage over all 8 registered modules (registry lookup + form/outputBlocks presence, ordering) and a lifecycle test (build input from each module's form → parse → execute with a fake BYOK generate → output passes its schema and contains every outputBlock key). Gates: lint 0, typecheck 0, 29 files / 109 tests, production build pass (`/automations/run/[moduleKey]` compiled). No live model call by the assistant.

### 2026-07-24 - Generic module engine + Module 2 (Sitemap Keywords) app-native, SEO+GEO prompts

- Owner confirmed Module 1 app-native works end-to-end (real DeepSeek job succeeded, draft + selected labels rendered). Per owner's chosen direction (shared engine → Module 2 first → SEO+GEO prompts), built a reusable app-native module engine so each remaining module is standalone-runnable now and chain-ready later.
- New generic job store `module_jobs` (app schema, dual dialect — SQLite `moduleJobs` + Neon `pgModuleJobs`; migrations `drizzle/0005_wide_gladiator.sql` + `drizzle-postgres/0003_eminent_blonde_phantom.sql`, SQLite applied locally, **owner applies the Neon one with the migrator URL**). Deliberately NOT the Make bridge table (`antigravity_bridge.sitemap_jobs` has a hard `RIS_SITEMAP` check + least-privilege Make roles). Module 1 stays on its proven bridge path untouched.
- Engine pieces: `domain/modules/module-job.ts` (generic job + base envelope: projectId/idempotencyKey/ai), `module-definition.ts` (a module = key + in/out Zod + `execute(ctx)`; registry + `getModuleDefinition`/`parseModuleInput`), `module-job-repository.ts` interface, dual repos in `infrastructure/modules/`, `lib/modules/module-engine.server.ts` (`runModuleJobAppNative` — same after()+polling+BYOK+timeout+secret-scrubbed error passthrough as Module 1, but generic over any registered module), `application/modules/module-service.ts` (validate input via module schema, project/active checks, idempotency, cost confirmation), server factory. Generic routes `POST /api/v1/modules/[moduleKey]/jobs` (schedules `after`) + `GET .../[jobId]` (poll). Shared secret-scrubbing helper `lib/ai/sanitize-provider-error.ts`.
- Module 2 = `RIS_SITEMAP_KEYWORDS` (`domain/modules/definitions/sitemap-keywords.ts`): input = project + primaryKeyword + language + location + audienceBrief + optional `sitemapLabels` (paste from Module 1, or empty → model infers). Two-step execute: (1) keyword plan per page/label (primary + secondary + long-tail + search intent), (2) GEO plan (questions users ask AI assistants, entities/facts to be citable, answer snippets). Output `{contractVersion:"1.0", keywordPlan, geoPlan}`. UI: `/automations/keywords` page+form (all 4 providers selectable — BYOK, real guardrail is a valid key), catalog now links Module 1 & 2 to their full pages.
- SEO+GEO: shared `domain/modules/seo-geo.ts` (principles + `seoGeoSystemPrompt` + `seoGeoPreamble`) drives module system prompts AND replaced the /ai ("Không gian AI") system prompt so `/ai` now targets classic SEO + GEO (visibility in ChatGPT/Perplexity/Google AI Overviews).
- Tests: `tests/unit/module-definitions.test.ts` (registry lookup, input validation, two-step execute with a fake BYOK generate asserting prompt content + competitor/labels fallback, output-schema validation, SEO/GEO prompt markers). Gates: lint 0, typecheck 0, 29 files / 93 tests, production build pass (route `/automations/keywords` compiled). No live model call by the assistant — owner runs the first Module 2 DeepSeek job.

### 2026-07-24 - B2: Module 1 runs app-native (BYOK) — Make replaced

- By explicit owner decision, Module 1's live path no longer goes through Make: the app now calls the model APIs directly with the signed-in user's own BYOK key (masterseo model). `SITEMAP_PILOT_MODE` is now `mock | app_native`; the legacy value `neon_make` is accepted as an alias for `app_native` so the current Production env keeps working without an immediate change. The Make provider/webhook code remains in the repo as history but is no longer wired into the Module 1 factory; the proven Make scenario can stay OFF in Make.com.
- Execution model: `POST /api/v1/sitemap-jobs` creates the job (Neon bridge `sitemap_jobs`, unchanged storage/idempotency/cost-confirmation/allowlist guardrails — the live-policy gate now covers the `app_native` provider) and returns immediately; the model calls run after the response via Next.js `after()` (route `maxDuration` raised to 300s), then write `succeeded`/`failed` back to Neon; the UI polls exactly as before. The executor (`src/lib/sitemap/app-native-sitemap-executor.server.ts`) decrypts the user's key server-side, prefers the user's verified model over the job's requested model, runs the two blueprint-equivalent prompts (draft sitemap → select ≤30 labels, mirrored in `src/domain/sitemap/sitemap-prompts.ts` including the no-competitor fallback), sanitizes error messages (strips key-like strings), and never puts the key in the job, logs, or errors.
- UI updated: Module 1 page drops all Make wording (badge "AI trực tiếp (BYOK)", live banner, cost-confirmation text, button "Tạo Sitemap", status labels), and the status bar shows "Module 1 · AI live (BYOK)". All four providers remain selectable; the server-side `SITEMAP_LIVE_ALLOWED_AI_PROVIDERS` allowlist still applies (currently `deepseek` — the owner expands it to `deepseek,openai,gemini,anthropic` when ready).
- Bundled verify fixes: the Gemini response parser now tolerates candidates without `parts` (Gemini 3.x thinking could consume the whole budget and produce a confusing ZodError → now surfaces as a clear empty-response message), verify's test-call budget rose 64→256 tokens, and a billing-classifier recognizes provider credit/billing errors ("Key và model hợp lệ — tài khoản provider hết credit") — confirming the owner's Anthropic 400s and Gemini 429 were billing/quota, not wrong model IDs.
- Tests: environment tests updated for `app_native` + legacy-alias coverage; new prompt tests (field inclusion, competitor fallback, selection embed). Gates: lint zero warnings, strict typecheck, 28 Vitest files / 86 tests, optimized production build. No live model call was made by the assistant; the owner will run the first app-native job with DeepSeek.
- Second app-native run fix: the retry failed instantly with "AI provider từ chối yêu cầu" — the `thinking: false` boolean I sent was the wrong wire format and DeepSeek rejected the request with a 400. Official format per api-docs.deepseek.com/guides/thinking_mode is `"thinking": {"type": "disabled"}` (the Make module UI's `thinking: false` is translated by Make, not sent literally). Adapter corrected; the executor's failure messages now append the provider's HTTP status and own error text (same passthrough as verify, secret-scrubbed), so any future failure is self-explanatory in the UI. Gates re-run: lint, typecheck, 86 tests, build pass.
- First app-native run fixes (owner's first job failed with "AI provider không trả về nội dung"): root cause is that `deepseek-v4-flash` enables thinking by default (per DeepSeek's V4 migration notes) so the whole token budget could be consumed as reasoning and `content` came back empty — the old Make blueprint explicitly sent `thinking: false`, our adapter did not. The DeepSeek adapter now sends `thinking: false` and falls back to `reasoning_content` when `content` is empty. Also, per owner instruction, the BYOK live mode now exposes **all four providers** (the env allowlist no longer gates `app_native` — the real guardrail is having a valid key in the API Keys screen): factory + runtime summary use the full provider list, the env schema no longer requires `SITEMAP_LIVE_ALLOWED_AI_PROVIDERS` in app_native, and the leftover "AI xử lý trong Make" form label was renamed to "AI xử lý (BYOK)" with a note that the API-Keys model takes precedence. Gates re-run: lint, typecheck, 86 tests, build all pass.

- Verified model catalog + provider error passthrough: replaced the guessed catalog IDs with IDs cross-checked against official provider docs (07/2026) — OpenAI `gpt-5.4-nano/mini`, `gpt-5.4`, `gpt-5.5`, `gpt-5.2`, `gpt-5.1`, `gpt-5[-mini|-nano]`, `gpt-4.1[-mini]`; DeepSeek only `deepseek-v4-flash` + `deepseek-v4-pro` (the legacy `deepseek-chat`/`deepseek-reasoner` names are discontinued 2026-07-24); Gemini `gemini-3.6-flash`, `gemini-3.5-flash-lite`, and `gemini-3.1-pro-preview` (the previously guessed `gemini-3.6-pro` does not exist — that was the Gemini verify failure); Anthropic official aliases `claude-haiku-4-5`, `claude-sonnet-4-6`, `claude-sonnet-5`, `claude-opus-4-6/4-7/4-8`, `claude-fable-5` (no date suffixes). Also enhanced `fetchProviderJson` to capture the provider's own error message (truncated to 200 chars, no secrets) into `AiProviderError.details.detail`, and verify now surfaces it — e.g. Gemini's "model not found for API version v1beta" appears verbatim instead of a generic guess. Gates: lint, typecheck, 82 tests, build pass.
- Verify-tests-selected-model + persist: the first model screen tested the saved model, not the dropdown choice, so changing the model then clicking Verify still tested the old one. Verify now sends the currently-selected model, tests it against the stored key (no key re-paste needed to iterate), and on success persists that model + marks the key active. Expanded the model catalog per provider and corrected the Anthropic IDs (e.g., `claude-haiku-4-5-20251001`, `claude-opus-4-8`, `claude-sonnet-5`, `claude-fable-5`); the free-text "custom" option remains the reliable path for account-specific IDs. Error messages now guide the user to try another model or enter a custom ID. Gates: lint, typecheck, 82 tests, build all pass. No schema change — owner only redeploys.
- Verify diagnostics fix: the first live screen showed both OpenAI and DeepSeek verify failing with an opaque "provider rejected/errored" message. Replaced it with a specific, secret-safe reason derived from the `AiProviderError` code + HTTP status — HTTP 401/403 → key rejected; 404 → model not accessible; 400 → likely wrong model name; 429 → rate/quota; empty → key valid but empty output. Also raised the verify test-call budget from 16 to 64 tokens (16 could yield an empty completion and a false failure). Gates: lint, strict typecheck, 27 Vitest files / 81 tests, production build all pass. Owner must redeploy to pick up the clearer message.
