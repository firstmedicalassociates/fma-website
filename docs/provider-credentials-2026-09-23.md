# All provider credentials without periods — September 23, 2026

Follow-up to the MD-only formatting request: all provider credentials now omit periods.

- Reviewed all 60 provider records, including titles, names, biographies, and image alt text.
- Converted the remaining `D.O.` titles to `DO` for Anmol Singh, Ilan Kokotek, and Matthew Bruntel.
- Updated dotted degrees in four biographies: Matthew Bruntel (`DO`), Anmol Singh and Sharon McCormack (`BS`), and Manchang Liu (`MBBS`, `PhD`). Seven fields changed across five records.
- Provider create/update handling strips every period from credential titles. Prose handling normalizes degree abbreviations while preserving `Dr.`, middle initials, `U.S.`, `D.C.`, and hyphens such as `PA-C` and `FNP-BC`.
- Seed content, the provider import title formatter, and AI search instructions follow the same rule. AI index refreshed: all 187 documents present and current.
- All 60 provider booking links, Zocdoc links, Athena identities, and office assignments match the before-change snapshot.

Runtime commit: `1060237`. The reviewed data manifest is `data/provider-credential-updates-2026-09-23.json`; `node scripts/apply-site-formatting-updates.mjs --credentials --apply` applies it with backups and concurrency checks. Omit `--apply` for a dry run.

Validation: production build and lint passed (four existing image warnings). All 16 formatting/booking tests, 43 AI guard checks, 90 AI scenarios, 816 provider prompts, 399 extraction cases, and seven domain-graph checks passed. Machine-readable audit output and backups are in ignored `artifacts/site-audit/credentials-2026-09-23/`.

Live verification after deployment:

- Chrome directory: all 60 providers displayed credential titles without periods.
- Opened all 60 individual provider profiles in Chrome; no dotted credentials remained. Checked the degree changes in all five edited profiles, including MBBS, PhD, and BS in biographies.
- Eleven browser AI searches covered all nine credential-title combinations and all five edited providers. Every result displayed its correct title without periods and retained its exact provider booking destination.
- Automated HTTP audits were stopped by a 403 browser-verification response before completion. They were not counted as passing checks; the browser checks above replaced them. Browser verification completed normally without intervention.
