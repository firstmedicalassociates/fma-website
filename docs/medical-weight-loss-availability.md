# Medical weight loss availability

GLP-1 / Medical Weight Loss Management is available at Severna Park, Alexandria,
Annapolis, Owings Mills, and Laurel, MD. The service landing page uses a
location-neutral subtitle and links to the locations directory. Its booking
buttons open general online booking so patients can choose their office.
Each of the five offering offices also has a link on the service page.

The allowed offices are defined in `src/app/lib/service-availability.cjs`.
Location service selections are stored in the CMS database, so publishing this
change requires both the application changes and the targeted CMS update:

```sh
npm run seed:medical-weight-loss
npm run index:medical-weight-loss
```

The targeted seed checks that all five office records exist before making any
changes, updates this service's content, and reconciles only this service's
location assignments. It preserves unrelated services and office details and
can be run repeatedly. The indexing command refreshes only this service's
search entry. Do not use the general database seed for this content update.

After deployment, verify the service card appears on all five location pages,
the service page and directory contain no exclusivity language, and the service
page's booking buttons allow office selection and its secondary buttons open
the locations directory. Confirm the subtitle and page title do not single out
Severna Park, and the availability copy and AI search results include Laurel.

## October 6, 2026 update

The targeted CMS update and service search indexing have been applied to the
configured database. Only Laurel's service assignment changed; other office
assignments were preserved. The pre-update content and assignments are backed
up locally in `output/playwright/glp1/cms-before.json`.

Validation passed: 25 SEO checks, lint for changed JavaScript files, and the
production build. Browser checks confirmed the neutral subtitle, general
booking and locations buttons, and GLP-1 card on Laurel's Services tab.
Application changes still require deployment: the connected Vercel account
does not expose the FMA project, and GitHub CLI is not authenticated.
