# Owings Mills coming-soon office

Approved public route: `/location/owings-mills/`.

Seeded information:

- Coming soon; estimated opening October 5. No year was supplied, so the display label preserves the supplied date without assuming one.
- 25 Crossroads Dr., Suite #412, Owings Mills, MD 21117.
- 443-652-1165.
- Planned hours after opening: Monday–Friday, 8:00 AM–5:00 PM. Weekend hours were not supplied.
- Planned provider: Jacob Scott, MD.
- Original exterior photo, stored as `public/assets/locations/owings-mills-crossroads.avif`. The supplied file was AVIF despite its `.jpg` name; the image content is unchanged.

Booking, service assignments, provider biography, headshot, languages, and Athena IDs were not supplied. Booking and mapping fields remain empty. Jacob Scott has an inactive admin-editable provider record assigned to Owings Mills; his name appears on the public opening announcement, and he does not enter live scheduling or the active provider directory yet.

## Safe targeted seed

Apply the additive `20260914190000_location_coming_soon` migration before deploying the dependent code. Then run:

```sh
npm run seed:owings-mills
```

This command creates only the location and Jacob Scott. It leaves existing records and later CMS edits intact on reruns. The general seed also includes both records and preserves their existing data, but it has unrelated content-update/removal behavior; use the targeted command for this launch.

Deploy the accompanying code and image asset for the coming-soon page, finder labels, CMS controls, and search behavior to appear on the live site. The estimated date never automatically opens the office or enables booking.

## Updating and opening the office

In **Locations → Owings Mills → Overview**, update the estimated opening date as needed. Keep **Coming soon** checked while the office is preparing to open. The announcement shows confirmed details and planned hours without the standard location page's appointment/service claims.

Before opening, complete the booking link and service assignments, verify hours and provider information, and confirm any Athena mapping with the scheduling team. Turn off **Coming soon** when the office is ready and activate Jacob Scott when his profile and scheduling details are confirmed. Review the public page and search results after those changes.
