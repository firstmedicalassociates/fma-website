# FMA Asana tasks completed — September 23, 2026

The three open FMA tasks shown in My Tasks were implemented, verified on the live site, and marked complete in Asana:

| Task | Result |
| --- | --- |
| [Laurel Landing Page edit](https://app.asana.com/1/1141731780056153/project/1209333688296275/task/1218746381738356) | Replaced the shared “whole family” card with “Adult Primary Care” and “Personalized primary care for adults 18+.” Corrected related care claims across the site. |
| [FAQs footer edit](https://app.asana.com/1/1141731780056153/project/1209333688296275/task/1218746381738359) | Every location now answers “What ages do you treat?” with the confirmed 18+ policy. The patient FAQ, patient policies, and AI answers use the same policy. |
| [Post FMA Blog](https://app.asana.com/1/1141731780056153/project/1209333688296275/task/1213469672276718) | Published [Cholesterol Awareness: When Should You Get Tested?](https://drsfirst.com/blog/cholesterol-awareness-when-should-you-get-tested/) using the supplied Google Doc and cover. |

## Content and search changes

- Applied 29 reviewed CMS field updates across 27 records: nine locations, three provider bios, one service, and 14 older blog posts. Seed data was corrected as well. Clinician credentials/training, family medical history, and general health education were preserved; claims that FMA treats children were corrected.
- AI age-policy questions take precedence over provider, office, insurance, and booking wording. Under-18 requests receive the adult-only policy and a direction to a pediatric practice, with no appointment options or booking buttons. Emergency questions retain emergency guidance.
- The supplied cholesterol draft's young-adult screening interval was updated to current [AHA guidance](https://www.heart.org/en/health-topics/cholesterol/about-cholesterol/what-your-cholesterol-levels-mean). The article distinguishes general pediatric screening education from FMA's adult-only care and links to AHA and NHLBI sources.
- Refreshed the AI content index, including the new article. Indexing and freshness checks now share the site's visible-location configuration, including Laurel, and support the local Node database connection.

## Verification

- Deployment of `5d50a5f` succeeded.
- Browser checks passed for the adult-care card and FAQ on all 19 production location pages; none displayed the retired whole-family or all-ages care claims.
- All 13 targeted live AI checks passed, including age-policy variations, emergency handling, Karen's provider booking link, and Columbia II's office booking link.
- AI evaluation: 90 cases, 816 provider prompts, 399 provider extraction cases, and seven domain-graph cases passed. Booking tests, SEO tests, 43 AI guard checks, changed-file lint, and production build passed.
- The blog returns HTTP 200, appears in the blog index and sitemap, loads its supplied 1182×738 cover, has one main heading and the correct canonical URL, and has five valid contents links. Its booking action opens the general Provider Match scheduler.
- Search index: 187 expected and present documents, no missing, orphaned, stale, or model-mismatched documents. No indexed “whole family” or “patients of all ages” care claims remained.
- Content-update and blog-publish scripts are idempotent. Reviewed changes are in `data/asana-content-updates-2026-09-23.json` and `data/asana-blog-2026-09-23.json`; local backups and verification evidence are under ignored `artifacts/site-audit/asana-2026-09-23/`.

No Asana comments or messages were sent. Existing dependency advisories from the preceding audit were outside these content tasks.
