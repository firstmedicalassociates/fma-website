# SEO Remediation Phases

This file breaks the SEO work into execution phases based on the findings in `audit.md`.

The order matters.

Do not start with design or copy polish.
Start with URL structure, indexation control, metadata parity, and redirects.

---

## Phase 1: Lock URL Structure and Canonicals

Goal:

- prevent authority splitting
- prevent bad canonicals
- make sure the replacement site has one clear public URL per SEO section

Tasks:

- Canonical decisions confirmed so far:
  - locations hub stays `/locations/` in the new build
  - `/location/` should redirect to `/locations/`
  - services hub stays `/services/` in the new build
  - `/service/` should redirect to `/services/`
- Pending canonical decisions:
  - `/about-us/` replacement
  - `/contact-us/` replacement
  - `/jobs/` replacement
  - `/resources/` replacement
  - `/insurances/` replacement
- Ensure only one crawlable version exists for each hub page.
- Add canonical tags consistent with the final chosen public URLs.
- Set production `SITE_URL` / `NEXT_PUBLIC_SITE_URL` so canonicals and OG URLs do not fall back to `localhost`.
- Add missing legal routes or temporarily remove links to broken legal pages.

Definition of done:

- one canonical hub URL per section
- no duplicate crawlable section URLs
- canonical tags resolve to production domain
- no broken footer legal links

---

## Phase 2: Preserve Core SEO Templates

Goal:

- hold rankings on locations, providers, and services

This is the most important SEO content phase.

### 2.1 Locations

Tasks:

- Rewrite location `<title>` patterns to match current live keyword intent.
- Rewrite location H1 patterns to preserve live city + service intent.
- Preserve phrases currently carrying search value:
  - `primary care doctor`
  - `family doctor`
  - `walk-in clinic`
  - `walk-in healthcare`
  - city + state combinations
- Review each local location page against its live equivalent one by one.

Definition of done:

- live and local location pages have equivalent keyword targeting
- city pages do not downgrade to brand-only or city-only headings

### 2.2 Providers

Tasks:

- Update provider detail `<title>` tags to preserve `Primary Care Doctor`.
- Review provider H1 mismatches and normalize names where required.
- Keep provider names, credentials, and canonical slugs aligned to current live expectations.

Definition of done:

- provider detail titles are SEO-equivalent to live
- provider H1s are correct for all active profiles

### 2.3 Services

Tasks:

- Update service detail `<title>` tags to preserve current live keyword modifiers.
- Keep service H1s aligned to the service topic names.
- Ensure `/service/` section structure supports service cluster relevance.

Definition of done:

- service detail titles target the same intent as live
- service section supports the current indexed URL pattern

---

## Phase 3: Close Route and Content Gaps

Goal:

- eliminate missing pages, slug drift, and unsupported live URLs

Tasks:

- Add or redirect all live service URLs missing locally:
  - `/service/eczema/`
  - `/service/migraines/`
  - `/service/adhd/`
  - `/service/arthritis/`
  - `/service/anxiety/`
  - `/service/walk-in-services/`
- Resolve location exceptions:
  - `/columbia/`
  - `/location/columbia/`
  - `/bowie-dev/`
  - `/columbia-dev/`
  - `/location/joppa/`
  - `/location/columbia-oldie-oldie/`
- Resolve provider slug mismatches and legacy root-level provider URLs.
- Add or map live utility/public pages still carrying search value:
  - `/privacy-policy/`
  - `/accessibility-notice/`
  - `/terms/`
  - `/billing-questions/`
  - insurance/resources equivalents as needed

Definition of done:

- every live SEO-relevant URL has a local equivalent or a deliberate redirect target
- no important live URL is left orphaned

---

## Phase 4: Complete Metadata, Sitemap, and Structured Data

Goal:

- make the whole site technically indexable and internally coherent

Tasks:

- Add unique metadata to all public `about/*` pages.
- Add unique metadata to all public `patient-resources/*` pages.
- Expand `src/app/sitemap.js` to include all public indexable pages.
- Add missing canonical, Open Graph, and Twitter metadata where absent.
- Add structured data to service detail pages.
- Validate that search and utility pages remain noindex where appropriate.

Pages currently needing metadata attention include:

- `src/app/about/page.js`
- `src/app/about/careers/page.js`
- `src/app/about/leadership/page.js`
- `src/app/about/mission/page.js`
- `src/app/about/partners/page.js`
- `src/app/patient-resources/page.js`
- `src/app/patient-resources/education/page.js`
- `src/app/patient-resources/faq/page.js`
- `src/app/patient-resources/insurance/page.js`
- `src/app/patient-resources/patients/page.js`
- `src/app/patient-resources/press/page.js`

Definition of done:

- all public pages have intentional metadata
- sitemap reflects the real public surface
- structured data exists on all key detail templates

---

## Phase 5: Redirects, QA, and Launch Validation

Goal:

- make launch safe

Tasks:

- Build a full redirect map from the live WordPress sitemap to the new site.
- Validate provider, service, and location redirects one by one.
- Confirm there are no redirect chains.
- Crawl the new site and compare final URLs against live inventory.
- Verify final rendered values for:
  - `<title>`
  - meta description
  - canonical
  - H1
  - noindex where applicable
- Validate sitemap and robots behavior before launch.
- Keep a launch checklist for post-cutover verification in Search Console.

Definition of done:

- redirect map is complete
- all core SEO pages resolve correctly
- crawl findings are clean enough for launch

---

## Recommended Work Order

Follow this order exactly:

1. Phase 1
2. Phase 2
3. Phase 3
4. Phase 4
5. Phase 5

If speed matters, the minimum safe path is:

1. Phase 1
2. Phase 2
3. redirect-critical parts of Phase 3
4. metadata/sitemap-critical parts of Phase 4
5. Phase 5 QA

---

## Immediate Next Step

Start with Phase 1 and finalize the remaining canonical public URLs for:

- about
- contact
- jobs/careers
- insurance/resources

Already confirmed:

- `/locations/` remains canonical
- `/location/` redirects to `/locations/`
- `/services/` remains canonical
- `/service/` redirects to `/services/`

Without the remaining canonical decisions, the rest of the remediation work stays unstable.
