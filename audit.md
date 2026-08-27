# SEO Audit: local `fma-website` vs current `drsfirst.com`

Audit date: 2026-06-04

## Scope

This audit compares the local Next.js site in this repo against the current live `drsfirst.com` site.

Primary focus:

- Core SEO sections that must hold ranking continuity:
  - locations
  - providers
  - services
- Supporting public pages:
  - home
  - about
  - careers/jobs
  - contact
  - patient resources / insurance
  - legal pages

Method used:

- Reviewed local app routes, metadata exports, dynamic route templates, sitemap generation, and DB-backed entities.
- Pulled the live XML sitemap from `https://drsfirst.com/page-sitemap.xml`.
- Compared live URL inventory against local routes and local DB entities.
- Sampled and audited live rendered `<title>`, meta description, canonical, and `<h1>` values.

---

## Executive Summary

The new site is **not SEO-equivalent yet**.

The biggest risks are not design-related; they are structural and metadata-related:

1. **The live `/service/` URL is currently an index page, but the new local `/service` route renders a single service detail page.**
2. **The new site splits authority across duplicate or changed section URLs** like `/location` vs `/locations`, `/service` vs `/services`, `/about-us` vs `/about`, `/jobs` vs `/about/careers`, and `/insurances` vs `/patient-resources/insurance`.
3. **Location pages lose the current keyword targets almost completely** in both `<title>` and `<h1>`.
4. **Provider pages preserve most H1 names, but all provider title tags drift from live.**
5. **Service pages preserve H1s well, but all service title tags drift from live and 6 live service URLs are missing locally.**
6. **A large group of public pages have no unique metadata at all** and would inherit the same generic site title/description.
7. **The local sitemap is far too thin** and currently omits many public pages that should be indexed.
8. **Legal pages currently linked in the footer do not exist as local routes.**

If this site launched as-is without redirects and metadata alignment, I would expect ranking loss on the pages you specifically called out: **locations first, then services, then providers**.

---

## Highest-Risk Findings

### 1. `/service/` is the wrong page type locally

Live:

- `https://drsfirst.com/service/` is a service hub/index page.

Local:

- `src/app/service/page.js` renders a **single service detail page**.
- `src/app/services/page.js` renders the service directory.

Why this is dangerous:

- The current indexed URL `/service/` would stop being the section hub and become a detail page.
- Internal relevance and link equity for the services section would be fragmented between `/service/` and `/services/`.
- This is a high-probability rankings regression for the entire services cluster.

### 2. Location page keyword targeting is not preserved

Live location pages use keyword-rich titles/H1s such as:

- `Top Doctors & Walk-In Clinic in Bowie, MD | First Medical Associates`
- `Primary Care Doctor in Rockville, MD | First Medical Associates`
- `Best primary care physician and doctor in Bowie, MD`

Local location pages use:

- title pattern: `{City}, MD | First Medical Associates`
- H1 pattern: `{City}, MD`

Why this is dangerous:

- The local location pages drop high-intent phrases like:
  - `primary care doctor`
  - `family doctor`
  - `walk-in clinic`
  - city + state combinations in keyworded form
- This is the most serious on-page SEO drift in the new build.

### 3. The homepage title loses core money keywords

Live homepage title:

- `Primary Care & Urgent Care Services | First Medical Associates`

Local homepage title:

- `First Medical Associates`

Why this is dangerous:

- The live home page title explicitly targets:
  - `primary care`
  - `urgent care`
  - `services`
- The local home title becomes mostly brand-only.

### 4. Many public pages have no unique metadata

The following public page files have **no page-level metadata**:

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

Effect:

- These pages default to the global site title/description.
- That creates duplicate title/description problems across important pages.

### 5. Footer-linked legal URLs are missing locally

The local footer links to:

- `/privacy-policy`
- `/hipaa-notice`
- `/accessibility`

But there are no corresponding route files in `src/app`.

SEO impact:

- Broken internal links
- Crawl waste
- legal/compliance pages missing from the replacement site

---

## Page Equivalency Matrix

| Current live URL | Local equivalent | Status | Notes |
| --- | --- | --- | --- |
| `/` | `/` | Partial match | Path matches, but title/description/H1 strategy drifts. |
| `/about-us/` | `/about` | High risk | Path changes and local page has no unique metadata. |
| `/jobs/` | `/about/careers` | High risk | Path changes and local careers page has no unique metadata. |
| `/contact-us/` | `/contact` | Medium risk | Path changes and keyword-targeted title/H1 drift. |
| `/providers/` | `/providers` | Partial match | Path matches, H1 is fine, title is weaker than live. |
| `/service/` | `/service` and `/services` | Critical | Current live hub becomes a detail page locally. |
| `/location/` | `/location` and `/locations` | High risk | Duplicate local section routes; one page, two URLs. |
| `/resources/` | `/patient-resources` | High risk | Path changes and local page has no metadata. |
| `/insurances/` | `/patient-resources/insurance` | High risk | Path changes and local insurance page has no metadata. |
| `/privacy-policy/` | none | Critical | Live page exists; local equivalent missing. |
| `/accessibility-notice/` | none | Critical | Live page exists; local equivalent missing. |
| `/terms/` | none | Critical | Live page exists; local equivalent missing. |
| `/billing-questions/` | none | High risk | Live URL exists; no local equivalent found. |

---

## Core SEO Audit: Providers

### Inventory comparison

- Live current provider profile URLs under `/providers/*`: **40** profile pages plus the `/providers/` index.
- Local provider profiles: **48**
- Exact `/providers/*` slug matches: **33**
- Local providers that only exist on current live **root-level legacy URLs**: **13**
- Local providers with no clear current live equivalent: **1**

### Provider continuity summary

- **47 of 48** local provider entities have some live equivalent URL.
- Only **33** preserve the current `/providers/{slug}/` path exactly.
- **13** currently rank on root-level legacy URLs like `/robin-codjoe/`, not `/providers/robin-codjoe/`.
- `ronald-thomas` appears to exist only as an old live URL (`/providers-old/ronald-thomas/`), not a current provider URL.

### Title/H1 comparison

- Provider detail pages with exact current `/providers/*` URL match audited: **33**
- Exact title tag matches: **0 / 33**
- Exact H1 matches: **29 / 33**

What this means:

- The local provider H1 pattern is mostly acceptable.
- The local provider **title tag pattern is not equivalent to live at all**.

Live title pattern:

- `{Provider Name} | Primary Care Doctor at First Medical Associates`

Local title pattern:

- `{Provider Name} | Providers | First Medical Associates`

That drops the keyword `Primary Care Doctor` from every provider detail title.

### Provider H1 exceptions

These exact-match provider URLs still have H1 drift from live:

- `/providers/sharon-j-mccormack/`
- `/providers/maria-munoz-md/`
- `/providers/rakesh-malik/`
- `/providers/quoc-anh-nguyen/`

### Local providers missing the exact current `/providers/*` slug

These local provider URLs do **not** preserve the current live `/providers/*` path:

- `/providers/robin-codjoe/`
- `/providers/anita-kunwar/`
- `/providers/ronald-thomas/`
- `/providers/elesa-yihdego/`
- `/providers/ilan-kokotek-2/`
- `/providers/alexander-jimenez/`
- `/providers/paula-moon-2/`
- `/providers/soma-mitra/`
- `/providers/lily-grainger-2/`
- `/providers/janelle-dennis/`
- `/providers/grace-nzouatcham/`
- `/providers/faith-kim/`
- `/providers/susana-beza-2/`
- `/providers/liu-manchang-2/`
- `/providers/monica-braland/`

Of those, these are currently live on root-level paths and will need redirects if you consolidate them under `/providers/*`:

- `/robin-codjoe/`
- `/elesa-yihdego/`
- `/ilan-kokotek-2/`
- `/alexander-jimenez/`
- `/paula-moon-2/`
- `/soma-mitra/`
- `/lily-grainger-2/`
- `/janelle-dennis/`
- `/grace-nzouatcham/`
- `/faith-kim/`
- `/susana-beza-2/`
- `/liu-manchang-2/`
- `/monica-braland/`

### Current live `/providers/*` URLs missing locally

- `/providers/kimaya-vaidya/`
- `/providers/ronald-attanasio/`
- `/providers/angelique-ramirez/`
- `/providers/ashley-myatt/`
- `/providers/yvonne-tukei/`
- `/providers/eleanor-dzozomenyo-fnp/`
- `/providers/anita-kunwar-md/` (local equivalent exists, but slug changed)

### Provider verdict

Provider SEO is **closest to acceptable** of the three core page groups, but still not identical:

- URL continuity is incomplete.
- H1 continuity is mostly preserved.
- Title tag continuity is not preserved.

---

## Core SEO Audit: Services

### Inventory comparison

- Live current service URLs under `/service/*`: **20** service pages plus the `/service/` hub.
- Local service detail pages: **15**
- Exact service slug matches: **15 / 15**

This is the strongest slug preservation area.

### Title/H1 comparison

- Exact title tag matches: **0 / 15**
- Exact H1 matches: **15 / 15**

What this means:

- Local service H1s preserve the current topic names well.
- Local service **title tags do not preserve current keyword targeting at all**.

Live service title examples:

- `Chronic Asthma Care Doctor in Maryland | Expert Treatment`
- `Diabetes Doctor in Maryland | Expert Care & Management`
- `Telemedicine Services at First Medical Associates in Maryland | Convenient Online Care`

Local service title pattern:

- `{Service Name} | First Medical Associates`

That removes keywords like:

- `doctor in Maryland`
- `treatment`
- `management`
- `care`
- `specialized`
- `convenient online care`

### Live service pages missing locally

- `/service/eczema/`
- `/service/migraines/`
- `/service/adhd/`
- `/service/arthritis/`
- `/service/anxiety/`
- `/service/walk-in-services/`

### Structural issue: `/service/` vs `/services/`

Current live structure:

- `/service/` = service hub/index

Local structure:

- `/service/` = one service detail page
- `/services/` = service directory

This is a direct structural mismatch against the current indexed site and should be treated as a launch blocker.

### Service metadata gaps

`src/app/service/[slug]/page.js` currently sets only:

- `title`
- `description`

Missing on service detail pages:

- canonical
- open graph
- twitter metadata
- structured data / JSON-LD

Provider and location detail pages already do better than this.

### Service verdict

Services are **closer than locations but still not SEO-equivalent**:

- Slugs are preserved for the 15 local services.
- H1s are preserved well.
- Title tags are materially weaker than live.
- 6 live services are missing.
- The `/service/` hub mismatch is critical.

---

## Core SEO Audit: Locations

### Inventory comparison

Local location records: **17**

Of those:

- **16** have some current live URL equivalent when aliases are counted.
- **1** does not have a current live equivalent: `/columbia-dev/`

Special cases:

- Local `/location/columbia/` corresponds to live `/columbia/`, not `/location/columbia/`
- Local `/bowie-dev/` does exist on the live site as `/bowie-dev/`

Current live location-like URLs that do not have a clear local replacement:

- `/location/joppa/`
- `/location/columbia-oldie-oldie/`

### Title/H1 comparison

Audited exact location-style matches show:

- Exact title tag matches: **0**
- Exact H1 matches: **0**

This is the largest core SEO drift in the project.

Live location title examples:

- `Top Doctors & Walk-In Clinic in Bowie, MD | First Medical Associates`
- `Primary Care Doctor in Rockville, MD | First Medical Associates`
- `Walk-In Healthcare at First Medical Associates in Gaithersburg | Quick & Convenient Care`

Live location H1 examples:

- `Best primary care physician and doctor in Bowie, MD`
- `Primary care Doctor in Frederick, MD`
- `Family doctor in Gaithersburg, MD`

Local location pattern:

- title: `{City}, MD | First Medical Associates`
- H1: `{City}, MD`

This drops the live site's current target phrases:

- `primary care doctor`
- `family doctor`
- `walk-in clinic`
- `walk-in healthcare`
- `physician`
- city + state keyword combinations in intent-rich form

### Location route mismatch details

Current local location-specific URLs that need attention:

- `/location/columbia/` should preserve or redirect from live `/columbia/`
- `/columbia-dev/` has no live equivalent and should probably be noindexed or removed from public indexation
- `/bowie-dev/` is already a live indexed path, so decide deliberately whether to preserve or retire it

### Duplicate location section route risk

The local site has both:

- `/location`
- `/locations`

They point to the same finder experience, but only `/location` is in the sitemap.

Risk:

- duplicate crawl paths
- split internal linking
- unclear canonical section URL

### Location verdict

Locations are **not ready for SEO continuity**.

This is the section most likely to lose rankings unless:

- route parity is fixed
- live keyword patterns are restored in titles/H1s
- location alias/legacy redirects are mapped carefully

---

## Technical SEO Findings

### 1. Local sitemap is incomplete

`src/app/sitemap.js` currently includes:

- `/`
- `/blog`
- `/providers`
- `/services`
- `/service`
- `/location`
- dynamic blog posts
- dynamic providers
- dynamic locations
- dynamic services

It currently omits important public pages such as:

- `/about`
- `/about/careers`
- `/about/partners`
- `/about/mission`
- `/about/leadership`
- `/contact`
- `/patient-resources`
- `/patient-resources/insurance`
- `/patient-resources/patients`
- `/patient-resources/education`
- `/patient-resources/press`
- `/locations`

### 2. `SITE_URL` / `NEXT_PUBLIC_SITE_URL` is not set locally

The root metadata base and dynamic canonicals depend on:

- `NEXT_PUBLIC_SITE_URL`
- `SITE_URL`

No matching value was found in `.env`.

Impact if production env is not set:

- canonicals and OG URLs can resolve to `http://localhost:3000`

### 3. Metadata coverage is inconsistent

Good coverage:

- dynamic provider pages
- dynamic location pages
- dynamic blog pages

Weak coverage:

- home has description but no keyworded custom title
- provider index has a weak title compared to live
- service detail lacks canonical/OG/Twitter

Missing coverage:

- about pages
- careers page
- patient-resources pages

### 4. Structured data coverage is uneven

Implemented:

- provider detail JSON-LD
- location detail JSON-LD

Missing:

- service detail JSON-LD
- section-level structured data for key hub pages

### 5. Duplicate or split public section URLs exist

Local public structure currently splits authority between:

- `/location` and `/locations`
- `/service` and `/services`
- `/about` vs current live `/about-us`
- `/contact` vs current live `/contact-us`
- `/about/careers` vs current live `/jobs`
- `/patient-resources/insurance` vs current live `/insurances`

### 6. Legal page coverage is incomplete

Current live legal pages:

- `/privacy-policy/`
- `/accessibility-notice/`
- `/terms/`

No local route equivalents were found.

### 7. Search page is handled correctly

`src/app/search/page.js` is set to:

- `index: false`
- `follow: false`

That is good.

---

## Recommended Fix Order

### Launch blockers

1. Make `/service/` the service hub again, or 301 it to the correct canonical hub URL.
2. Pick one canonical location section URL and 301 the other.
3. Restore live-style location `<title>` and `<h1>` keyword targeting.
4. Restore live-style provider detail title tag targeting.
5. Add missing live service pages or redirect them intentionally.
6. Add legal page equivalents and stop linking to missing pages.

### Next priority

1. Add unique metadata to all `about/*` and `patient-resources/*` pages.
2. Expand the sitemap to include all public indexable pages.
3. Add canonical/OG/Twitter metadata to service detail pages.
4. Confirm production `SITE_URL` / `NEXT_PUBLIC_SITE_URL` values.
5. Create a full 301 redirect map from the current WordPress inventory.

### Ideal parity targets

If your goal is to preserve current SEO as closely as possible, the new site should keep or redirect from these live section URLs:

- `/providers/`
- `/service/`
- `/location/`
- `/about-us/`
- `/contact-us/`
- `/jobs/`
- `/resources/`
- `/insurances/`

And for the core entity templates:

- Provider title pattern should preserve `Primary Care Doctor`
- Service title pattern should preserve current keyword modifiers by service
- Location title and H1 patterns should preserve current city + specialty + walk-in phrasing

---

## Appendix A: Local Provider URLs Without Exact Current `/providers/*` Match

- `/providers/robin-codjoe/`
- `/providers/anita-kunwar/`
- `/providers/ronald-thomas/`
- `/providers/elesa-yihdego/`
- `/providers/ilan-kokotek-2/`
- `/providers/alexander-jimenez/`
- `/providers/paula-moon-2/`
- `/providers/soma-mitra/`
- `/providers/lily-grainger-2/`
- `/providers/janelle-dennis/`
- `/providers/grace-nzouatcham/`
- `/providers/faith-kim/`
- `/providers/susana-beza-2/`
- `/providers/liu-manchang-2/`
- `/providers/monica-braland/`

## Appendix B: Live `/providers/*` URLs Missing Locally

- `/providers/kimaya-vaidya/`
- `/providers/ronald-attanasio/`
- `/providers/angelique-ramirez/`
- `/providers/ashley-myatt/`
- `/providers/yvonne-tukei/`
- `/providers/eleanor-dzozomenyo-fnp/`
- `/providers/anita-kunwar-md/`

## Appendix C: Live Service URLs Missing Locally

- `/service/eczema/`
- `/service/migraines/`
- `/service/adhd/`
- `/service/arthritis/`
- `/service/anxiety/`
- `/service/walk-in-services/`

## Appendix D: Location Exceptions

Local location URLs needing explicit routing or redirect decisions:

- `/bowie-dev/`
- `/columbia-dev/`
- `/location/columbia/`

Live location-like URLs without clear local equivalent:

- `/location/joppa/`
- `/location/columbia-oldie-oldie/`
- `/columbia/` should be mapped to local `/location/columbia/` if that path remains

## Appendix E: Pages Missing Local Equivalents

No local equivalent found for:

- `/privacy-policy/`
- `/accessibility-notice/`
- `/terms/`
- `/billing-questions/`

Likely needing route parity or redirect planning:

- `*-announcements/`
- `*-staff/`
- `/providers-old/*`
- root-level legacy provider pages
