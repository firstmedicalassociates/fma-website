# FMA address, credential, and Careers updates — September 23, 2026

Runtime deployment: `108b00e1c1f50a36d39a516b2ebf1095a49cf6af` (Vercel successful).

## Changes

- All 19 office addresses use two display lines: street plus `Ste` and unit, followed by `City, ST ZIP`. Germantown exactly matches the supplied `12800 Middlebrook Road Ste 400` / `Germantown, MD 20874` example.
- Location pages, the location finder, provider location cards, search results, AI answers, and the Laurel/Alexandria launch articles use the new format. Country remains in structured SEO data but is omitted from the displayed address.
- CMS save handling normalizes street/unit and state formatting. Seed data and AI knowledge content now follow the current CMS, including Greenbelt's existing 20770 ZIP and Nottingham's existing city label.
- 29 provider titles now use `MD` without periods. Two biographies and the AI founder answer were normalized too. Other credentials were retained.
- Careers is temporarily disabled using `CAREERS_ENABLED` in `src/app/lib/config/site.js`. Navigation, footer, About CTA, and sitemap omit it. Both slash variants of `/about/careers` and `/jobs` return a temporary 307 redirect to `/about/`. The page content is preserved. Re-enabling the flag restores the page, links, sitemap entry, and AI instruction behavior.

## Data changes

The reviewed manifest is `data/site-formatting-updates-2026-09-23.json`. Apply with `node scripts/apply-site-formatting-updates.mjs --apply`; without `--apply` it is a dry run. It checks the previous value and the record version before writing, saves a backup, and is idempotent.

86 CMS fields changed across 18 office records, 29 provider records, and two articles. The remaining office already had the requested format. Backups and machine-readable audit results are under ignored `artifacts/site-audit/formatting-2026-09-23/`.

436 booking, provider identity, location assignment, directions, city, and ZIP fields were compared to the pre-change snapshot and remained unchanged.

## Verification

- Production build passed; lint has no errors (four existing image-component warnings).
- Formatting, SEO, and booking tests: 31 passed. Admin tests: 24 passed.
- AI guard checks: 43 passed. AI scenarios: 90 passed. Provider prompt coverage: 816 passed; extraction cases: 399 passed; domain-graph cases: seven passed.
- The refreshed AI index contains all 187 expected documents, with no missing, orphaned, or stale entries.
- Live page audit: 202 sitemap pages returned 200. All 19 office address blocks and all 60 provider profiles passed. No dotted MD credentials or Careers links appeared in rendered page content. Careers is absent from the sitemap and all four retired URL variants redirect correctly.
- Browser checks confirmed the Germantown page and live AI answer visibly retain the two address lines. Provider address cards retain the line break; the About navigation omits Careers.

- Live AI audit: **50/50 passed** — all 19 office addresses, all 29 MD provider credentials and exact booking destinations, the founder answer, and the Careers query. Production rate limits were respected. Results: `artifacts/site-audit/formatting-2026-09-23/live-ai.json`.
- Browser verification confirmed the live Germantown photo loads and the address appears on two lines. Local preview server stopped after verification.
