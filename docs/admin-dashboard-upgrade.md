# Admin dashboard upgrade

The Athena Test page and endpoint are removed. Public AI search, scheduling, provider mappings, and the existing answer models are retained. AI Search now opens without live Athena checks; Diagnostics runs them only on request.

## Deployment

1. Run `npx prisma migrate deploy` before starting the updated application, then `npx prisma generate` and `npm run build`. The additive migration preserves existing `ADMIN` users, normalizes emails, and adds a case-insensitive unique index. It fails atomically if duplicate normalized emails exist. It also repairs the historical migration omission of `Service.icon` when necessary.
2. Keep the existing `ADMIN_AUTH_SECRET` and database configuration. Existing sessions need a fresh login. Do not run the content seed for this upgrade. The seed no longer overwrites an existing admin password.
3. Optional: set server-only `OPENAI_ADMIN_KEY` and `OPENAI_PROJECT_ID` for OpenAI reported project costs. The regular `OPENAI_API_KEY` remains the search key. Billing credentials are never sent to clients. Missing billing configuration does not affect search or analytics.
4. Confirm the deployed admin can sign in, load AI Search, create a temporary-password account, assign permissions, and change their own password. Submit one safe public search and click a returned link; verify its event, usage, and interaction in Activity. Check Spending separately after telemetry arrives.

Credential rate limiting uses the database and needs no Redis setup. Public search and interaction rate limiting use the site's existing shared Redis configuration in production. Public marketing/chat scripts are excluded from admin routes.

Roll forward on deployment failure; do not drop new tables or restore the previous authorization implementation after sub-admins have been created, because the old implementation did not enforce sub-admin permissions. Preserve the existing database backup/restore process.

## Access model

Full admins manage accounts, live diagnostics, indexing, and all content. Sub-admin permissions default to none. Content sections support View, Create/Edit, and Delete. Edit and Delete imply View; publishing and active-status updates use Edit. AI Search has View and Manage feedback/evaluations; API spending has a separate View permission implying AI Search View. Every account can change its own password. Account deactivation, password resets, and permission changes revoke prior sessions.

Passwords require 12 characters and at most 72 UTF-8 bytes. Temporary passwords must be replaced before any other backend access. Admins share temporary passwords directly; the application sends no invitation email. Full admins cannot deactivate themselves or demote/deactivate the last active full admin. Account changes use a shared database transaction lock to protect concurrent changes.

## Metrics and limitations

Overview uses search-created UTC dates and is cached for 60 seconds. Activity and Feedback paginate 25 rows. Feedback filters apply to the originating search date. Click rates use instrumented search cohorts, not unique visitors. Booking clicks indicate handoff to an external service, not completed appointments. Automated confidence/grounding signals are not a human accuracy rating.

No general raw-query or conversation storage was added. Existing privacy-screened, hash-verified negative feedback snapshots remain available. Signed result targets are valid for 24 hours, and stored click references omit query strings and fragments. Failed telemetry writes are logged by error code and do not make public search fail.

`AiApiUsage` records actual returned tokens before response parsing, with separate purposes for search, indexing, diagnostics, and evaluation. Standard USD estimates use the `2026-09-14-standard-v1` price schedule: GPT-5.5 $5 input / $0.50 cached input / $30 output per million tokens; text-embedding-3-small $0.02 per million input tokens. Unknown rates, missing usage, nonstandard service tiers, and failed calls are not assumed free. SDK retries whose usage was not returned may not be included in estimates. Stored estimates are never retroactively repriced.

Historical events lack token and click data. Instrumented deterministic searches have no OpenAI calls and zero estimated cost. Spending shows known subtotals and unknown-usage counts. Reported project costs may cover other applications, are displayed separately, and are cached persistently for one hour. Upstream failures retain the last successful report. Spending uses call timestamps and ignores activity filters other than the UTC date range.

## Verification

- `npm run check:admin`: permission, session, validation, pricing, signing, and billing-client unit tests.
- `npm run check:seo`, `npm run check:ai-search-guards`, `npm run eval:ai-search`, `npm run lint`, `npx prisma validate`, `npm run build`.
- Database/API tests against an isolated schema (never run with the public schema):
  1. `node scripts/admin-test-environment.mjs setup`
  2. `npm run build`
  3. In another terminal: `node --env-file=.env.admin-test scripts/admin-test-server.mjs`
  4. `npm run check:admin:integration`
  5. Stop the test server and run `node scripts/admin-test-environment.mjs cleanup`.

The setup replays every migration in a temporary schema and checks preservation of a legacy administrator. It writes ignored temporary credentials with restrictive permissions. Tests cover account onboarding, API/page authorization, uploads, session revocation, concurrent last-admin protection, analytics totals/pagination, spending, clicks, public search/privacy, rate limiting, and 100,000-event overview performance. The local test server supplies an in-memory Redis-compatible fixture; no OpenAI or Athena credentials are used.

Known baseline issue: `npm run eval:ai-search` currently fails the `provider-extraction:typo:josie-joy-go` case (`when can I see jose joy go`). The same failure was reproduced using untouched HEAD source. Provider prompt coverage is 802/802; extraction coverage is 391/392. This upgrade does not change provider matching rules.

Validation on September 14, 2026: 15 unit tests, 12 database/API integration tests, 43 AI guard checks, and 9 SEO tests passed. Prisma validates and the production build succeeds. Lint has zero errors and four existing image warnings. Five warm overview queries against 100,000 synthetic events each completed in under 100 ms locally; preview-deployment timing still needs confirmation after deployment. Desktop and mobile browser checks use isolated synthetic accounts.

Browser checks verified account creation, mandatory password replacement, permission-dependent navigation, disabled view-only fields, mobile navigation, independent overview loading, and public appointment-search fallback. A booking handoff opened its target and recorded a linked interaction without blocking navigation; the destination was mocked, and no appointment was booked. Live Athena availability and reported project costs still require verification in the deployment environment with those credentials.

The existing `check:deployment` command also runs a dependency audit. The unchanged dependency lockfile currently reports 20 advisories (7 moderate, 12 high, 1 critical), including Next.js. Dependency remediation and the baseline evaluation failure need resolution before that complete deployment gate can pass; neither is hidden by the new checks.
