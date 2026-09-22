# Booking links — September 22, 2026

General appointment CTAs now use `https://pmc-firstmedicalassociates.provider-match.com/`. Each of the 19 offices uses the scheduler's verified `search?location_name=...` URL. Bowie II and Columbia II retain their distinct office destinations.

Provider pages, search cards, appointment results, and unavailable-appointment recovery actions share the same booking resolver. AI context includes the saved provider/office URL, and generated answers cannot invent a Provider Match destination outside that context. A named provider without a verified online listing receives a clearly labeled telephone booking link.

## Applied content updates

- Updated 35 database fields: 19 location booking URLs, four provider booking URLs, and 12 Asana-supplied Zocdoc URLs.
- Provider destinations: Karen Lizarraga `/book/6803195`, Christopher Costa `/book/7094373`, Khai-El Johnson `/book/7261386`, and Jacob Scott `/book/7367823`.
- The 12 Zocdoc task IDs and exact supplied URLs are recorded in `data/asana-website-link-updates-2026-09-22.json`.
- Rakesh Malik and Ronald Thomas have no listing in the public Provider Match directory; their booking action calls the office.

`npm run sync:booking-links` previews changes. `npm run sync:booking-links -- --apply` writes only the selected booking fields, compares their previous values, and saves a local backup under the ignored `artifacts/booking-links/` directory. A repeat dry run after the update returned no changes. No schema migration or general reseed is required.

## Verification

- Opened all 58 online provider booking pages in the user's connected browser and confirmed the provider shown in Appointment Details.
- Checked all 19 external office search destinations and all 19 rendered location pages.
- Confirmed all 12 Zocdoc buttons on the live provider pages contain the exact Asana URLs.
- Ran database-backed provider searches and appointment-unavailable searches for all 60 active providers; every result retained the correct provider destination or telephone fallback.
- Verified the search page and AI modal in the browser, including Karen's direct booking recovery link.
- Booking tests, SEO tests, admin tests, 43 AI guard checks, synthetic AI evaluations (81 general cases, 816 provider prompts, 399 extraction cases, and seven domain graph cases), Prisma validation, changed-file lint, and production build passed.

The local environment has no Athena credentials, so these local checks do not establish live appointment-slot retrieval. The existing dependency audit still reports 20 advisories (seven moderate, 12 high, one critical), as already documented in the admin upgrade notes. Dependency versions and the lockfile were not changed. Consequently, the aggregate `check:deployment` command does not pass its audit step even though the remaining checks were run independently and passed.
