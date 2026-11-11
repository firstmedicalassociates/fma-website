# Medical records request

`/patient-resources/medical-records-request/` digitizes the existing **Authorization
to Request Healthcare Information** PDF. This authorization asks another practice
to send records **to First Medical Associates**. It is distinct from the release
form, which authorizes FMA to send records to another practice.

The Patient Forms & Policies card and Patient Resources overview link to the new
page using full document navigation. Both medical forms exclude marketing/chat
scripts and use the same restrictive content security policy and no-store headers.

## Submission and delivery

- The patient supplies their name and birth date, the practice holding the records,
  records scope, any separate optional sensitive-record permissions, typed signature,
  relationship, and explicit signature consent.
- `/api/medical-records-request` selects the request template and direction on the
  server. Submitted recipients, template paths, form type, dates, and references
  cannot change routing or the authorization type.
- The shared validator and handler preserve the release form's guardian check,
  origin/content checks, body-size limit, honeypot, shared rate limiter, and
  `MEDICAL_RECORDS_VENDOR_REVIEWED` gate. Existing approved production SES settings
  apply; no new credentials or recipient settings are needed.
- One SES email goes only to **MedicalRecords@drsfirst.com**, with a subject beginning
  `Medical records request authorization`, a server reference, and the completed PDF.
  The application does not contact the outside practice automatically or email a
  patient copy. Staff review the authorization and verify identity/authority.
- After SES acknowledges the message, the browser offers the same completed PDF
  for download. Provider acceptance is not independent proof of mailbox receipt.
  A delivery failure returns an error without a PDF or automatic retry.
- Completed patient PDFs stay in memory; the application does not store them in
  files, public assets, browser storage, logs, or the database.

## PDFs

The original request PDF is preserved at
`src/assets/medical-records/original-request.pdf`. Its existing public URL,
`/wp-content/uploads/2023/04/FMA-MR-request-4.18.23.pdf`, now serves a fillable copy
with 13 text fields and 5 independent checkboxes. Rebuild with
`npm run pdf:medical-records-request`.

The completed attachment is static. Additional pages preserve full values,
request direction, server-generated dates/reference, form version
`FMA-MR-request-4.18.23-web-v1`, and the signature attestation. Long entries use
the same font-fitting and “See details” behavior as the release PDF.

## Validation

`npm run check:forms` covers both medical forms and all other SES form flows.
Request-specific tests check routing isolation, server-selected direction/template,
review/origin/consent/guardian checks, delivery failures, canonical blank fields,
and static completed PDFs. Both request PDF pages were rendered and inspected;
an independent PDF reader checks full values and widget/field consistency.

The local proxy in `scripts/preview-medical-records.mjs` supports both medical
endpoints with a fake SES sender. Desktop/mobile browser QA checks inline errors,
focus on the error summary, conditional fields, and the successful PDF download.
Only clearly marked synthetic data may be used in this local QA workflow.
