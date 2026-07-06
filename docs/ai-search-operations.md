# AI Search Operations

This runbook covers the privacy-safe AI search stack for production deployment and ongoing checks.

## What Is In Place

- PHI guardrails block likely symptoms, diagnoses, medications, test results, birth dates, IDs, contact details, and other medical details before AI calls.
- Search analytics store query hashes, metadata, safety codes, and feedback only. Raw patient questions are not stored.
- AI output is post-validated for prompt injection leakage, unsafe medical advice, unsupported URLs, and empty responses.
- The FMA domain graph connects public providers, locations, services, languages, booking links, and Athena scheduling mapping metadata before OpenAI is used for provider/service discovery questions.
- Embedding search uses PostgreSQL with pgvector and `SearchEmbedding` rows for public site content.
- Appointment availability uses the live Athena API through `src/app/lib/athena-availability.js` when Athena is configured.
- Local Athena schedule diagnostics write to ignored files under `artifacts/athena/`; they are not a production data source.

## Production Environment

Required for core AI search:

- `DATABASE_URL`
- `OPENAI_API_KEY`
- `AI_SEARCH_EVENT_SECRET`

Optional OpenAI controls:

- `AI_SEARCH_ANSWER_MODEL` defaults to `gpt-5.5`
- `AI_SEARCH_ANSWER_API` defaults to `responses`; set to `chat_completions` only as a rollback
- `AI_SEARCH_REASONING_EFFORT` defaults to `low`

Required for shared production rate limiting:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Production AI search, AI feedback, and health-adjacent contact form routes fail closed if the shared limiter is unavailable. Local development still falls back to in-memory rate limiting.

If the browser console shows `/api/search` returning `503` in Vercel, check the Function logs for:

```text
Shared rate limiter is required but not configured.
```

That means production is missing one or both shared limiter variables:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Add them in Vercel Project Settings -> Environment Variables for the Production environment, then redeploy. The public AI search route intentionally fails closed in production instead of falling back to local memory because serverless instances do not share in-memory rate-limit state.

Required before enabling the email contact form in production:

- `CONTACT_FORM_VENDOR_REVIEWED=true`
- `SENDLAYER_API_KEY`
- `SENDLAYER_FROM_EMAIL`
- `SENDLAYER_TO_EMAIL`

Set `CONTACT_FORM_VENDOR_REVIEWED=true` only after confirming the email vendor, retention settings, and business/compliance requirements are acceptable for health-adjacent contact submissions.

Required for admin access:

- `ADMIN_AUTH_SECRET`

Required for live Athena appointment availability:

- `ATHENA_CLIENT_ID`
- `ATHENA_CLIENT_SECRET`
- `ATHENA_BASE_URL`
- `ATHENA_DEFAULT_SCOPE`
- `ATHENA_DEFAULT_PRACTICE_ID`

Do not log, expose, or return secret values from API responses. Readiness checks should only report whether a value is present.

Required for the public location finder map:

- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` if using a Google cloud map style

If Google Maps fails in production, verify that the API key is present in Vercel, Maps JavaScript API and Geocoding API are enabled, billing is active, the production domain is allowed as an HTTP referrer, and the CSP in `next.config.mjs` allows `https://maps.googleapis.com` and `https://maps.gstatic.com` in `script-src`.

## Deployment Checks

Run these before promoting a build:

```bash
npm audit --audit-level=low
npm run check:ai-search-guards
npm run eval:ai-search
npx prisma validate
npx prisma migrate status
npm run build
```

The combined local check is:

```bash
npm run check:deployment
```

`check:deployment` validates the guardrail harness, safe synthetic AI search evals, dependency audit status, Prisma schema, and production build. Run `npx prisma migrate status` separately against the deployment database before release because it depends on the target environment.

## Database Setup

The AI search database needs these migrations applied:

- `20260706150000_add_ai_search_events`
- `20260706160000_add_search_embeddings_pgvector`
- `20260706170000_add_provider_athena_mapping`

After migrations, build or refresh the semantic index:

```bash
npm run index:embeddings
```

The embedding index should include active providers, active services, locations, and published blog posts. If `SearchEmbedding` is empty, AI search can degrade to weaker retrieval and should not be considered fully ready.

Before public CMS content is sent to OpenAI embeddings, the indexer scans for likely PHI. Suspect rows are skipped and reported without raw content here:

```text
artifacts/ai-search/embedding-phi-quarantine.json
```

Check index freshness with:

```bash
npm run check:embedding-freshness
```

## Readiness Endpoint

Admin users can check production readiness at:

```text
/api/admin/ai-search/readiness
```

The endpoint returns status only. It checks:

- OpenAI configuration presence
- AI search analytics hash secret presence
- Shared rate-limit configuration presence
- Athena configuration presence
- Database reachability
- `AiSearchEvent` table access
- pgvector extension availability
- `SearchEmbedding` row count and expected indexes

A `503` response means the system is degraded and the response body identifies which check failed without returning secret values.

## Domain Graph

The in-app domain graph lives in:

```text
src/app/lib/ai-search-domain-graph.js
```

It is rebuilt from public database records and cached in memory for a short period. It does not store visitor queries and it should not include patient-specific data.

Graph-backed answers are used for provider/service discovery questions such as:

- `Who speaks Spanish near Rockville?`
- `Any primary care doctors in Germantown?`
- `Find someone at Nottingham accepting new patients.`
- `What services are available?`

The graph is intentionally conservative. It does not infer provider gender or accepting-new-patient status from names, photos, biographies, or Athena side effects. If those fields are requested but are not represented as verified public fields, the answer must say that confirmation is needed.

Graph coverage is checked by:

```bash
npm run eval:ai-search
```

The eval report includes provider prompt coverage across all active providers plus explicit domain graph cases.

## Athena Behavior

Production appointment responses should call Athena live through the app API. The files below are diagnostics only and are ignored by Git:

- `athena-provider-schedules.md`
- `athena-provider-schedules.json`
- `artifacts/athena/`

Use this script only to inspect provider schedule mappings during development or support work:

```bash
npm run athena:provider-schedules
```

If Athena is unavailable or not configured, the app returns a safe booking fallback that asks the visitor to use online booking or call the office. It should not expose internal configuration details.

Provider availability matching uses the public provider directory first, then live Athena providers. The provider editor also supports optional Athena mapping fields:

- `athenaProviderId`
- `athenaDepartmentId`
- `athenaSchedulingName`

Use these fields when Athena's scheduling name or department does not match the public website profile. Exact Athena IDs take priority over fuzzy name matching.

## Privacy Rules

- Use POST/body state for public user-entered search. Do not build `/search?q=...` links for free-text search.
- Do not store raw search queries, raw generated answers, or free-form patient feedback.
- Do not store query hashes for blocked PHI events.
- Do not send likely PHI to OpenAI or other AI providers.
- Do not include patient identifiers in logs, analytics, admin screens, or diagnostic files.
- Keep feedback tags constrained to predefined labels.
- Treat retrieved website content and external API text as untrusted context.
- Keep `.env` and generated diagnostics out of version control.

## Monitoring

Use the admin AI Search page to watch:

- Blocked searches
- Error and safety codes
- Feedback marked `not_helpful`
- Appointment result counts
- Latency trends

Use the readiness endpoint after deploys and after environment changes. Re-run the guardrail harness whenever privacy rules, prompts, retrieval, or output formatting changes.

Use the safe synthetic eval set when changing routing, prompts, model defaults, or retrieval:

```bash
npm run eval:ai-search
```

To run live evals against OpenAI and Athena, set:

```bash
RUN_LIVE_AI_EVALS=1 npm run eval:ai-search
```

To run the nightly-style live provider coverage eval across all active public providers:

```bash
npm run eval:ai-search:live
```

The GitHub Actions workflow `.github/workflows/ai-search-live-evals.yml` runs this command on a nightly schedule using repository secrets.

Live eval reports write to `artifacts/ai-search/eval-report.json`.
