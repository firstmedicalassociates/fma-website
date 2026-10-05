# Medical weight loss availability

GLP-1 / Medical Weight Loss Management is available at Severna Park, Alexandria,
Annapolis, and Owings Mills. Severna Park remains the primary booking destination
on the service landing page for its promotional campaign. The page also links
to each of the other offering offices.

The allowed offices are defined in `src/app/lib/service-availability.cjs`.
Location service selections are stored in the CMS database, so publishing this
change requires both the application changes and the targeted CMS update:

```sh
npm run seed:medical-weight-loss
npm run index:medical-weight-loss
```

The targeted seed checks that all four office records exist before making any
changes, updates this service's content, and reconciles only this service's
location assignments. It preserves unrelated services and office details and
can be run repeatedly. The indexing command refreshes only this service's
search entry. Do not use the general database seed for this content update.

After deployment, verify the service card appears on all four location pages,
the service page and directory contain no exclusivity language, and the service
page's primary booking button still opens Severna Park booking.
