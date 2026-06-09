# SEO Remediation Phases

Target production domain: `https://drsfirst.com`

This plan converts the audit into an execution sequence.

The order matters:
- fix host, canonicals, and URL rules first
- preserve ranking URLs second
- improve metadata and on-page SEO third
- do launch QA last

Reference audit:
- `seo-audit-2026-06-08.md`

---

## Phase 1: Lock Production Host and Canonicals

Status:
- completed on `2026-06-08`

Goal:
- make every canonical SEO signal resolve to `https://drsfirst.com`

Tasks:
- Set `SITE_URL` / `NEXT_PUBLIC_SITE_URL` to `https://drsfirst.com`
- Verify `metadataBase` resolves to `https://drsfirst.com`
- Verify all canonicals stop falling back to `http://localhost:3000`
- Verify `robots.txt` outputs:
  - `Host: https://drsfirst.com`
  - `Sitemap: https://drsfirst.com/sitemap.xml`
- Verify `sitemap.xml` uses production URLs only
- Confirm Open Graph and Twitter URLs use `https://drsfirst.com`

Definition of done:
- no public page emits a `localhost` canonical
- sitemap and robots advertise only `https://drsfirst.com`

---

## Phase 2: Finalize URL Architecture and Redirect Rules

Status:
- completed on `2026-06-08`

Goal:
- choose one crawlable public URL for each section

Decisions already in place:
- locations hub stays `/locations`
- `/location` redirects to `/locations`
- services hub is intended to stay `/services`
- legacy `/service` hub must not conflict with a real page
- `/about-us` redirects to `/about`
- `/contact-us` redirects to `/contact`
- `/jobs` redirects to `/about/careers`
- `/resources` redirects to `/patient-resources`
- `/insurances` redirects to `/patient-resources/insurance`

Tasks:
- Resolve the `/service` vs `/services` conflict cleanly
- Decide whether `src/app/service/page.js` should exist at all
- Keep only one indexable services hub
- Confirm all public utility/legal pages have a final destination
- Remove any route ambiguity that could split authority

Definition of done:
- one canonical hub URL per section
- no duplicate crawlable section roots
- no contradictory route/page behavior

---

## Phase 3: Patch Migration Gaps and Legacy URL Coverage

Status:
- completed on `2026-06-08`

Goal:
- make sure current ranking URLs on `drsfirst.com` do not break

Tasks:
- Build a complete redirect inventory from the live sitemap
- Fix missing live provider URLs that currently 404 locally
- Review live service URLs and map each one to:
  - a direct replacement page
  - or a deliberate redirect target
- Review live location URLs and confirm they resolve intentionally
- Validate there are no important live URLs left orphaned

Known current gaps from the audit:
- missing providers:
  - `angelique-ramirez`
  - `ashley-myatt`
  - `eleanor-dzozomenyo-fnp`
  - `kimaya-vaidya`
  - `ronald-attanasio`
  - `yvonne-tukei`
- missing or remapped services:
  - `adhd`
  - `anxiety`
  - `arthritis`
  - `eczema`
  - `migraines`
  - `walk-in-services`

Definition of done:
- every SEO-relevant live URL on `drsfirst.com` has a working final destination
- no important legacy URL returns `404`

---

## Phase 4: Fix Title Templates and Meta Description Strategy

Status:
- completed on `2026-06-08`

Goal:
- stop wasting ranking and CTR potential in titles and descriptions

Tasks:
- Remove duplicated brand suffix behavior
- Rewrite the global title strategy so pages do not end with:
  - `| First Medical Associates | First Medical Associates`
- Rewrite homepage title and meta description to target:
  - `primary care`
  - `urgent care`
  - Maryland service/location intent
- Review section hub titles and descriptions for:
  - `/locations`
  - `/providers`
  - `/services`
  - `/about`
  - `/patient-resources/insurance`
- Confirm every public page has a unique, intentional title and description

Definition of done:
- no duplicate brand suffixes
- homepage metadata is stronger than the current live site
- all core public pages have intentional metadata

---

## Phase 5: Preserve On-Page SEO on Core Ranking Templates

Status:
- completed on `2026-06-08`

Goal:
- maintain or improve rankings on locations, providers, and services

Tasks:
- Review every location page title, description, and H1 against the live equivalent
- Keep keyword intent where it matters:
  - `primary care doctor`
  - `family doctor`
  - `walk-in clinic`
  - city + state combinations
- Review provider detail titles, descriptions, H1s, and slug expectations
- Review service detail titles, descriptions, H1s, and topical alignment
- Improve weak hub H1s such as:
  - `/services`
  - `/patient-resources/insurance`

Definition of done:
- core ranking templates are SEO-equivalent or better than live
- no important page downgrades from keyword-focused to brand-only language

---

## Phase 6: Sitemap, Robots, Schema, and Indexation QA

Status:
- completed on `2026-06-08`

Goal:
- make the technical SEO layer internally consistent

Tasks:
- Revalidate `sitemap.xml` after URL and redirect work
- Revalidate `robots.txt`
- Confirm `noindex` stays on search and any utility pages that should not rank
- Check schema output on:
  - locations
  - providers
  - services
  - blog
- Confirm all public pages meant to rank are included in the sitemap
- Confirm non-public pages are excluded from the sitemap

Definition of done:
- sitemap reflects the real public site
- robots behavior is intentional
- schema remains present on key templates

---

## Phase 7: Launch QA Against `drsfirst.com`

Goal:
- verify the replacement is safe before and after cutover

Tasks:
- Crawl a sample of live URLs and compare final destinations
- Check final rendered values for:
  - title
  - meta description
  - canonical
  - H1
  - status code
  - redirect behavior
- Check for redirect chains
- Spot-check top locations, top providers, and top services
- Keep a cutover checklist for Search Console and sitemap submission

Definition of done:
- no launch-blocking SEO issues remain
- replacement behavior is stable enough to cut over

Status:
- Completed on 2026-06-08
- Evidence captured in `launch-qa-2026-06-08.md` and `launch-qa-2026-06-08.json`

---

## Recommended Work Order

1. Phase 1
2. Phase 2
3. Phase 3
4. Phase 4
5. Phase 5
6. Phase 6
7. Phase 7

Minimum safe launch path:

1. Phase 1
2. Phase 2
3. Phase 3
4. homepage and template-critical parts of Phase 4
5. template-critical parts of Phase 5
6. Phase 6
7. Phase 7

---

## Immediate Next Step

Start Phase 7.

The next highest-value move is:
- crawl a sample of live `drsfirst.com` URLs against final destinations
- compare title, meta description, canonical, H1, and status code
- check for redirect chains before cutover
