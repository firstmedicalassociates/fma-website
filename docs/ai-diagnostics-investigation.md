# AI diagnostics and spending investigation — September 14, 2026

## What the supplied report means

The report contains 59 active public providers. It shows 56 automatic name matches and three missing matches: Anmol Singh, Audrey Boadu, and Khai-El Johnson. Its appointment checks report 43 providers with slots, 12 with no returned slots, one with no appointment reasons (Susan George), and three not checked.

A name match is a valid mapping. Blank manual provider IDs, scheduling-name overrides, and department IDs are not proof of a broken integration. A missing custom booking URL also has an existing general-booking fallback. The previous “Provider data gaps” list incorrectly presented these optional fields as problems even for providers with confirmed openings.

The report alone cannot establish whether the 12 empty schedules really have no online openings, or whether Susan George has no online appointment reasons. The old code could present failed requests and incomplete checks as empty availability.

## Confirmed code defects and changes

| Finding | Change |
| --- | --- |
| The Athena provider and department directories stopped at 100 records. | Read all pages. Reject malformed, failed, repeated, or incomplete pagination rather than caching a partial directory. |
| Diagnostics checked one department and only two appointment reasons. | Check returned reasons and try alternate departments until an opening is confirmed. Show department IDs, reason coverage, and a sample opening. |
| Failed reason requests became “no reasons”; failed slot requests could become “no slots.” | Preserve safe error codes and HTTP status. Report incomplete checks separately from successful empty results. Public search uses its existing availability-unavailable fallback when every result is empty and a request failed. Successful openings from other checks remain usable. |
| Providers excluded by existing online-scheduling filters appeared simply missing. | Explain matching records excluded by Athena's person, billable, or portal visibility fields. Keep the existing eligibility rules. |
| Optional manual overrides were flagged as missing profile data. | Only flag missing public locations or languages. Explain automatic mapping and general booking. |
| Diagnosing one provider required rerunning the full report. | Add a per-provider recheck and preserve the report while it runs. |

Diagnostics have a 210-second work budget within the route's 300-second limit. Unfinished work is labeled incomplete. A confirmed slot is a sample, not a total appointment count. The diagnostic window remains the next 30 days; public provider searches retain their existing extended-window behavior. Opening Overview still makes no Athena requests.

No provider IDs, scheduling settings, or production provider records were changed. The pagination and portal-visibility cases in automated tests are synthetic fixtures, not findings about the three real unmatched providers.

## Spending findings

At the start of inspection, the connected database contained 2,629 older search events with no telemetry version and no API-usage rows. Token counts and per-search costs cannot be reconstructed for those events.

A safe public probe against `/api/search` recorded a new event without making an OpenAI call. A separate probe against `/api/ai-search` recorded:

| Operation | Returned model | Input tokens | Output tokens | Estimated USD |
| --- | --- | ---: | ---: | ---: |
| Embedding | text-embedding-3-small | 15 | 0 | 0.0000003 |
| Answer | gpt-5.5-2026-04-23 | 9,183 | 198 | 0.051855 |

This confirms deployed usage capture and pricing resolution work for a new search. These requests were limited, synthetic public-content checks; no patient information was submitted. The added project billing credentials had separately returned a successful Costs API response. Project reporting and feature estimates remain distinct totals.

The Spending screen now distinguishes historical unrecorded usage, no activity, tracked zero-call searches, recorded costs, and partial/unknown costs. It displays recording coverage, first/latest tracked search dates within the range, and per-operation recording status. A known subtotal does not claim that unpriced calls cost zero. Successful estimates retain the 60-second aggregate cache, and project costs load separately.

## Interactive charts

Overview supports hover/touch date inspection, a keyboard-accessible date slider, previous/next controls, metric selection, zoom, and an accessible data table. Search metrics include searches, answered, failed, and searches with result clicks. UTC days with no events appear as zero. Spending charts share the same interaction controls; unknown cost points stay gaps. The chart uses a small SVG component and adds no dependency.

## Validation

- 24 admin/helper tests, including the new Athena integration fixtures and historical spending/date tests, passed.
- 12 database/API integration tests passed in an isolated schema, including permissions, temporary-password onboarding, analytics, usage/click recording, and removed-route 404s.
- 43 AI guard checks and 13 SEO tests passed; Prisma validates.
- Production build passed. Lint has zero errors and four existing image warnings.
- Warm Overview requests over 100,000 synthetic events took at most 95 ms across five local requests. This is local evidence, not a measured preview-deployment SLA.
- Browser checks covered desktop/mobile chart layout, keyboard inspection, metric selection, zoom, spending coverage, missing Athena configuration, diagnostic evidence expansion, and a recheck request containing only the selected provider slug. Successful/error diagnostic browser responses were mocked; the Athena integration fixtures exercised the actual server lookup functions.

## Remaining live checks after deployment

1. Run the updated diagnostic check with the deployed Athena credentials. The local environment used for this investigation had no Athena credentials.
2. Recheck Anmol Singh, Audrey Boadu, and Khai-El Johnson. Determine whether the complete directory resolves the match, the record is excluded by online-scheduling settings, or a verified explicit Athena ID is necessary. Confirm IDs with the scheduling team before changing them.
3. Expand Susan George's reason-check details. A successful empty response calls for review of online appointment reasons in Athena; an HTTP failure calls for investigation of the reported API error.
4. For providers still returning no online openings, review checked reasons, departments, and dates against Athena. A valid empty online schedule is not a mapping error or proof that no appointments exist through the office.
5. Run a new safe search, wait for the 60-second estimate cache, and verify its usage in Spending. Check reported project-cost freshness separately. Local `.env` credentials must also be configured in the deployment environment to enable project reporting there.

This follow-up requires no database migration. The code changes must be deployed before the improved diagnostic results and chart UI appear on the live site.
