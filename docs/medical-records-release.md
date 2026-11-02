# Medical records release

The Patient Forms & Policies **Release Medical Records** card and the Patient Resources
overview now link to `/patient-resources/medical-records-release/`. Both use a full
document navigation so scripts from a previous marketing page cannot remain active
while the patient enters information. The release page excludes analytics, advertising,
and chat scripts and has a restrictive same-origin content security policy.

The original PDF URL remains available and now serves an interactive AcroForm with
13 text fields and 5 independent checkboxes. The unchanged source is preserved under
`src/assets/medical-records/original-release.pdf`. Rebuild with `npm run pdf:medical-records`.
The PDF download is completed/saved in a compatible PDF viewer; online submission is
through the web form, not a PDF email button.

## Delivery setup

The form reuses the contact forms' `SENDLAYER_API_KEY` and `SENDLAYER_FROM_EMAIL`.
It sends **one email only to MedicalRecords@drsfirst.com**. It never uses the contact
recipient list, adds a personal inbox as a CC, or sends a patient confirmation email.
The subject and message body contain a reference and timestamp; patient information
is in the PDF attachment. The visitor can download the same PDF after SendLayer
acknowledges acceptance. This acknowledgement is not proof of inbox delivery.

Before enabling real submissions, confirm that the hosting, SendLayer account,
mailbox access, and retention arrangements are appropriate for this patient-information
workflow, including any required business associate agreements. Generic contact-form
approval alone does not establish this. Set `MEDICAL_RECORDS_VENDOR_REVIEWED=true`
in the server environment after that review. This is deliberately separate from
`CONTACT_FORM_VENDOR_REVIEWED`. If the service cannot cover patient information,
replace the dedicated delivery adapter with the practice's approved service.
Do not place credentials in client environment variables.

Production also uses the project's existing shared Upstash rate limiter:
`UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`. The endpoint fails closed
if the shared limiter is unavailable. With email setup/review missing, the page disables
entry/submission and offers the fillable download and phone number; the API rejects
the request before reading the patient information.

[HHS transmission-security guidance](https://www.hhs.gov/hipaa/for-professionals/faq/does-the-security-rule-allow-for-sending-electronic-phi-in-an-email/index.html)
explains the need to select and document appropriate protections for emailed patient
information. [SendLayer's attachment documentation](https://developers.sendlayer.com/guides/send-email-with-attachments)
documents the base64 PDF attachment schema used by the adapter.

## Authorization and privacy behavior

The form retains the source authorization language and independent permissions for
STD/HIV/AIDS and drug/alcohol/mental health records. Neither is preselected. At least
one records scope is required, with explanatory text required for selected specific/other
records. The server requires a typed full-name signature, an affirmative electronic
signature checkbox, and the signer's relationship. A parent/legal guardian must sign
for a patient under 18. Signature date (Pacific Time), UTC receipt timestamp, form version, reference, and the exact
signature consent are generated/recorded by the server in the completed PDF.

The records team must verify the submitter's identity and authority before releasing
records. The web signature records the submitter's stated identity; it is not an
identity-verification service or certificate-based digital signature. Existing authorization
text, including the source's STD definition, has not received legal revision here.

Completed PDFs are generated in memory and emailed, never saved by this code to
the database, public assets, filesystem, browser storage, or analytics. Values are sent
in a bounded same-origin JSON POST, never URL/query parameters. API responses use
`private, no-store`; errors log only a generic event and reference, without request
data or provider error details. The hosting/email services' own logging and retention
remain part of the deployment review.

The blank website PDF remains interactive. The email attachment is static, with an
additional submission-details page retaining complete long values and signature
attestation. When a value would be too small to read on the source page, that field
says “See submission details.” The Noto Sans font is bundled with its OFL license.

## Verification

- `npm run check:medical-records`: validation, birthday/guardian rules, explicit
  consent, recipient isolation, origin/content checks, body size, rate limiting,
  disabled-delivery behavior, failure/log privacy, email acknowledgement and schema,
  canonical PDF fields/widgets, and static completed attachments.
- Run targeted ESLint and `npm run build` before release.
- For browser QA, use fake email credentials in a local Next process on port 3001
  and run `node scripts/preview-medical-records.mjs`. Open the proxy on port 3003.
  The proxy runs the real validation/PDF/transport flow with a fake SendLayer response
  and blocks other mutations. `/__qa/delivery` exposes synthetic test data locally;
  never deploy this preview script or enter real patient information there.
- Render the blank and synthetic completed PDFs with Poppler and independently check
  field trees, widgets, and extracted values with pypdf.

This change does not deploy the website or enable the patient-information review flag.

The production build was verified from a clean copy on the local C: drive. The D:
workspace filesystem does not support the junction/readlink behavior used by the
Next.js build. The shared AI search stylesheet's variable declarations were scoped
to its trigger/modal classes so the page also compiles in webpack mode.
