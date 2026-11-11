# Amazon SES form delivery

All five email endpoints use `src/app/lib/ses-email.mjs` and the AWS SDK's SES v2
`SendEmail` API. HTML, plain text, reply-to addresses, and the signed records PDF
are preserved. A successful API response means SES accepted the message, not that
the recipient's inbox received it. Team-delivery failures return an error; a failed
visitor confirmation does not ask the visitor to submit the inquiry again.

| Form | Team destination | Visitor email |
| --- | --- | --- |
| General, location, legacy vendor contact | `CONTACT_TO_EMAILS` | Receipt confirmation |
| Practice-sale inquiry | `PRACTICE_TO_EMAILS`, falling back to `CONTACT_TO_EMAILS` | Welcome |
| Partnership inquiry | Partnerships@drsfirst.com and citryn.contactforms@gmail.com | Welcome |
| Medical-records release | MedicalRecords@drsfirst.com only | No email; browser downloads the accepted PDF |
| Medical-records request (another practice to FMA) | MedicalRecords@drsfirst.com only | No email; browser downloads the accepted PDF |

`SES_TEST_TO_EMAIL=ghough@citryn.com` is used only by the explicit synthetic test
script. It never adds a copy or redirects submissions from any live form.

## Server configuration

Set the following in the deployment environment before deploying the migration:

- `SES_REGION=us-east-1`
- `SES_FROM_EMAIL=info@drsfirst.com`
- `SES_FROM_NAME=First Medical Associates`
- `CONTACT_TO_EMAILS`: copy the existing contact recipient list.
- `PRACTICE_TO_EMAILS`: copy the existing practice override, if set.
- `SES_CONFIGURATION_SET`: optional; must exist in the selected SES region.
- `AWS_ROLE_ARN`: the Vercel OIDC role described below, or use the AWS SDK's
  standard credential chain outside Vercel (IAM role, local profile, or server-only
  `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`). Temporary credentials also need
  `AWS_SESSION_TOKEN`. Never use root keys or `NEXT_PUBLIC_` credential variables.

The old SendLayer API key and sender settings are no longer read. Recipient-only
settings (`SENDLAYER_TO_EMAILS`, legacy `SENDLAYER_TO_EMAIL`, and
`SENDLAYER_PRACTICE_TO_EMAILS`) remain as fallbacks, preserving the exact existing
production routing even when Vercel stores those addresses as unrevealable secrets.
The new recipient settings take precedence. Keep the old production settings until
the migration is verified so a rollback can use the previous code.
`CONTACT_FORM_VENDOR_REVIEWED` and the shared Upstash rate-limiter settings are
still required in production. The independent `MEDICAL_RECORDS_VENDOR_REVIEWED`
gate remains unchanged; its review must cover the new SES arrangement before
real patient submissions are enabled. Synthetic testing does not enable that gate.

## AWS sender verification

Setup started November 2, 2026, in account `589158200178`, region `us-east-1`:
the `drsfirst.com` domain identity was created with Easy DKIM (2048-bit signing),
and both `drsfirst.com` and `ghough@citryn.com` are verified. All three DKIM CNAMEs
were saved in GoDaddy and confirmed on its authoritative nameserver on November
2, 2026. A synthetic console test from `info@drsfirst.com` was accepted by SES
and found in the inbox at `ghough@citryn.com`. This verifies the sender and
recipient, not the application's Vercel OIDC credential exchange.

Rechecked November 5, 2026: both identities remain **Verified**, DKIM is
**Successful** with signatures enabled, and all three DNS CNAMEs resolve.
A fresh console test, `FMA SES verification test - November 5, 2026`, was sent
from `info@drsfirst.com` and confirmed in `ghough@citryn.com`'s inbox at
11:53 AM Pacific. No patient data was used.

The domain uses GoDaddy nameservers. These records are already saved; do not add
duplicates. GoDaddy appends `drsfirst.com` to the Name.

| Type | Name in GoDaddy | Value |
| --- | --- | --- |
| CNAME | `oqrfrr6qphlspyfv2owcqoke3esaybft._domainkey` | `oqrfrr6qphlspyfv2owcqoke3esaybft.dkim.amazonses.com` |
| CNAME | `iakbm3qv5oaqht7y74wkha6rkbzoexgb._domainkey` | `iakbm3qv5oaqht7y74wkha6rkbzoexgb.dkim.amazonses.com` |
| CNAME | `ugbsihazzgonyr6m4yk5eatognc2qa42._domainkey` | `ugbsihazzgonyr6m4yk5eatognc2qa42.dkim.amazonses.com` |

Production access was confirmed on November 11, 2026. The account is out of the
sandbox; recipients do not need separate SES verification. Both `drsfirst.com`
and `ghough@citryn.com` remain verified.

## Vercel authentication

Use a send-only IAM role with Vercel OIDC. Restrict its trust to the
`fma-website` project in team `firstmedicalassociates-projects`, production only.
Check the project's OIDC issuer mode before applying a trust policy; team and
global issuers use different condition keys. The role's permission policy should
grant only `ses:SendEmail`, constrained to the verified sender identity and
`ses:FromAddress=info@drsfirst.com`. It does not need SES administration, inbox
access, or general AWS access. Review files in `ops/ses/` before applying.

The approved role was created and its saved inline permission policy verified:
`arn:aws:iam::589158200178:role/fma-website-ses-production`.
The team OIDC provider is `oidc.vercel.com/firstmedicalassociates-projects`.
Vercel production now has `AWS_ROLE_ARN`, `SES_REGION`, `SES_FROM_EMAIL`,
`SES_FROM_NAME`, and `SES_TEST_TO_EMAIL` configured. The owner also confirmed
provider approval, and `MEDICAL_RECORDS_VENDOR_REVIEWED=true` is saved for
production. Existing recipient secrets are preserved through the compatibility
fallbacks above. Environment changes apply to subsequent production deployments.

## Cutover status

The SES migration is **live as of November 11, 2026**. The AWS console confirmed
production access with a quota of **50,000 emails per 24 hours**, a maximum rate
of **14 emails per second**, and **Healthy** account status in `us-east-1`.
Both identities were rechecked as **Verified**. The original production-access
request and review correspondence are in support case `179366278800121`.

PR #1 was merged as `998ac77a4f47a5874c17a54d17b66289961b7832`. Vercel production
deployment `dpl_Ap816igGn9eBrixsufKpCNnXXsVw` completed successfully at
10:49 AM Pacific, and the public `drsfirst.com` page served that deployment.
The migration's 41 form/transport tests and preview build passed before merging.

Live synthetic delivery checks at 10:49 AM Pacific on November 11:

| Form endpoint | Result | Duration |
| --- | --- | --- |
| `/api/location-info-contact` | HTTP 200, `ok: true`, `confirmationSent: true` | 1.06 s |
| `/api/practice-inquiry` | HTTP 200, `ok: true`, `confirmationSent: true` | 0.74 s |
| `/api/partnership-inquiry` | HTTP 200, `ok: true`, `confirmationSent: true` | 0.75 s |
| `/api/medical-records-release` | HTTP 200, `ok: true`, completed PDF | 2.29 s |

All three visitor confirmations were independently seen in `ghough@citryn.com`'s
inbox, timestamped 10:49 AM Pacific. These production requests exercised the
Vercel OIDC credential exchange and SES sender successfully.

The medical test returned reference `7966b27d-0b5d-4eb1-8dd1-3123afc6029d`
and a valid two-page PDF (171,629 bytes, no editable fields). SES acknowledged
the message addressed only to `MedicalRecords@drsfirst.com`; receipt inside that
mailbox was not independently inspected. All test data was fictional and clearly
marked **SYNTHETIC TEST / DO NOT PROCESS**. Medical submissions are never copied
to the test mailbox.

The previous SendLayer production baseline is
`eaf7594b734ee252229b61752bf27825356c1986` (PR #2). Existing SendLayer environment
settings remain available for an explicit rollback; the SES implementation has
no automatic fallback that could duplicate a submission after an ambiguous send.

Email feedback forwarding is enabled on the domain, and account-level
suppression is enabled for both bounces and complaints. The owner confirmed
their team handles delivery notices.

The medical form's provider approval is configured and its SES transport is
enabled in production. That approval remains separate from the general
contact-form review.

## Verification

1. `npm run check:forms` runs all form and SES transport tests without network mail.
2. `npm run build` checks the Next production bundle.
3. Set `SES_TEST_TO_EMAIL=ghough@citryn.com` in the local ignored environment file.
   With a verified sender and valid server credentials, run
   `npm run ses:test -- --send`. It sends one clearly labeled synthetic email with
   a completed test PDF to that mailbox only. Without `--send`, it sends nothing.
4. For a future deployment or configuration change, verify the affected live
   form with synthetic data, check provider acceptance, and independently inspect
   receipt where mailbox access is available. Validate the returned medical PDF
   without copying submissions to unrelated recipients.

Sources: [SES v2 attachments](https://docs.aws.amazon.com/ses/latest/dg/attachments.html),
[SES sandbox](https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html),
[Vercel AWS OIDC](https://vercel.com/docs/oidc/aws).
