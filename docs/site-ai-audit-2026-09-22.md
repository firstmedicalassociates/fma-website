# Website and AI search audit — September 22, 2026

## Scope and evidence

The baseline crawl covered all 202 sitemap pages, 218 discovered page URLs, 383 unique link destinations, 158 external destinations, and 178 images. No internal page returned a broken-page status, and no public booking link used InQuicker. Canonical URLs, headings, fragment targets, image responses, link names, and telephone link syntax were checked.

The live AI audit exercised all 60 active providers, all 19 offices, eight provider availability requests, two office availability requests, typo recovery, portal and payment links, insurance, forms, services, language filtering, new-patient requests, unknown providers, unrelated questions, instruction overrides, and input limits. All 60 baseline provider searches retained the correct booking URL. Additional regression cases cover second-office matching and a named provider requested at an incompatible office.

## Findings fixed

1. **Office identity:** City aliases caused Bowie II and Columbia II searches to include the other office in the city. Provider office labels could also inherit the wrong office. Matching now prefers the specific office mention, resolves saved location paths exactly, and filters providers and appointment departments by the selected office.
2. **Conflicting criteria:** A provider name could override an incompatible office or language filter, or be replaced by other providers. Search now explains the mismatch and retains the named provider's actual profile and booking destination.
3. **Location handoff:** Some location answers returned a general directory or unrelated article cards instead of an office booking link. Address answers now come directly from current location records and retain each office's booking URL. City names shared by two offices offer both labeled choices.
4. **Unrelated recommendations:** Ungrounded refusals could display unrelated provider booking cards. Those retrieved candidates are no longer presented as recommendations. Additional instruction-override wording is blocked before generation.
5. **Search feedback:** A valid AI provider or appointment result could appear beside “0 results” and “No pages matched.” Result summaries now count AI results and suppress contradictory empty states.
6. **AI dialog:** Keyboard focus could leave the dialog for the page or chat widget. Focus now cycles within the dialog, the background is inert while it is open, and Escape restores focus. The loading bubble no longer references a result payload before it exists.
7. **FAQ controls:** The FAQ search, Chat Now, and Call us controls were inactive. Search now filters the questions; contact and telephone controls have working destinations. FAQ booking, portal, forms, and telemedicine links are explicit, and the page has one main heading.
8. **Welcome video:** The video used fragment links for open/close. It now uses a native dialog with real controls, Escape support, focus restoration, and playback paused on close.

## Verification

- Booking and search regression tests: 11 passed.
- AI guard checks: 43 passed.
- AI evaluation suite: 81 general cases, 816 provider prompts, 399 extraction cases, and seven domain graph cases passed.
- SEO tests: 16 passed; admin tests: 24 passed; Prisma validation, changed-file lint, and production build passed.
- Browser checks at 390px: home, providers, locations, services, contact, FAQ, and search had no horizontal overflow, empty destination links, or retired booking links.
- Browser interaction checks confirmed the provider handoff, corrected search summary, FAQ filtering/contact links, AI focus containment and Escape, and video closing/paused playback/focus restoration.
- All 58 Provider Match provider booking pages were verified against the displayed provider in the preceding booking audit; the new crawl rechecked their responses. Live appointment searches also retain provider-specific URLs.
- Athena bill payment opens its statement-code form. The external telehealth press reference redirects to the correct TechTarget article.

## Limits and outstanding checks

Zocdoc blocked the automated HTTP checker, so its profiles were opened in the user's signed-in browser. Forty-two unique profiles displayed the correct provider before Zocdoc required a human verification challenge. The other 12 destinations remain unverified at the destination; their website buttons contain the supplied provider-specific URLs. The user instructed us to continue without completing the challenge.

The existing dependency audit reports 20 advisories (seven moderate, 12 high, one critical). Dependencies and the lockfile were unchanged by this work. The aggregate deployment check therefore cannot pass its audit step; its other checks passed independently.

The external ReachLocal script logs “Could not resolve value for site ID.” Public navigation and search work despite this error; the tracking account configuration needs its owner's review. A third-party chat greeting can overlap page content on small screens.

No real patient information was used, appointments were not submitted, and forms, phone calls, payment submissions, and email delivery were not exercised. This is a functional link and search audit with sampled responsive/keyboard checks, not a full assistive-technology conformance assessment.

## Repeat the audit

Run `npm run audit:links:live` and `npm run audit:ai-links:live`. The AI script uses safe synthetic queries and spaces requests to remain below the public limit. It stops if rate-limited. Reports are saved under the ignored `artifacts/site-audit/` directory. Set `AUDIT_ORIGIN`, `AUDIT_OUTPUT`, or `AUDIT_AI_OUTPUT` to compare a preview or local deployment. `AUDIT_AI_KINDS` accepts a comma-separated list of scenario kinds for a targeted rerun.

## Production verification after deployment

Commit `5c01392` deployed successfully. The following checks ran against `https://drsfirst.com` after deployment:

- **107 of 107 live AI scenarios passed**, including all 60 provider booking destinations and saved office labels, all 19 office booking destinations, office-specific provider filtering, conflicting provider/office criteria, eight named-provider availability requests, and live appointment requests for Bowie II and Columbia II. No retired booking URLs appeared.
- **218 pages, 381 unique link destinations, 158 external destinations, and 178 images checked.** No broken internal pages or images, missing fragments, placeholder links, unnamed links, heading/canonical defects, or InQuicker links remained in the crawl. The two fewer link destinations reflect replacement of the welcome video's fragment controls with buttons.
- **All 78 Provider Match destinations returned HTTP 200:** the general scheduler, 19 office searches, and 58 provider booking pages. Their provider/office identities were established in the preceding booking audit. The automated external exceptions were Zocdoc (54), Athena bill payment (one), and the press reference (one); browser checks resolved 44 of these, leaving the 12 Zocdoc profiles described above.
- AI responses returned 169 unique URLs, including 87 internal URLs. Every internal destination was covered by the successful site crawl.
- Production browser checks at 390px confirmed Karen's correct booking link and “1 result found,” FAQ filtering and contact links, AI dialog focus containment/Escape/focus restoration, and welcome-video close/pause/focus restoration.
- A live AI dialog conversation searched for Karen Lizarraga and then asked “Does she have appointments tomorrow?” The follow-up retained Karen's identity and returned four Gaithersburg appointment options, all linking to `/book/6803195`.

Local evidence is stored in `artifacts/site-audit/links-after.json`, `ai-live-after.json`, `ai-destination-crosscheck.json`, and `browser-after.json`. These machine reports are intentionally ignored by Git; this summary and the reusable audit scripts are committed.
