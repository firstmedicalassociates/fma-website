# Amazon SES form delivery

All four email endpoints use `src/app/lib/ses-email.mjs` and the AWS SDK's SES v2
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

While the account is in the SES sandbox, every recipient must also be
verified. Request production access before expecting visitor confirmations to
reach arbitrary addresses. Verify `citryn.contactforms@gmail.com` separately if
testing the existing contact/partnership routing while still in the sandbox.

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

As of November 9, 2026, the SES migration is not deployed. The current production
commit `eaf7594b734ee252229b61752bf27825356c1986` still uses SendLayer. The SES
account remains in the sandbox (200 recipients/day, 1 email/second), so
the existing external team/archive addresses and arbitrary visitor confirmations
cannot all be delivered. With the owner's approval, the transactional
production-access request for `https://drsfirst.com` was submitted on November 2,
2026. AWS subsequently requested additional information in support case
`179366278800121`. On November 5, the owner provided an expected volume of
100–500 emails/day, and a complete follow-up was submitted covering the website,
transactional form flows, recipient source, bounce/complaint handling, and a
sample confirmation. The saved case status is **Customer action completed**;
production access has not yet been approved.

On November 9, both identities were rechecked as **Verified**. AWS had not added
a response to the November 5 details. A follow-up was submitted at 9:32 AM Pacific
asking for a decision, the exact outstanding requirement, and the next update.
The persisted case still shows **Customer action completed**; this is not approval.

Live synthetic delivery checks on November 9:

- General/location, practice-sale, and partnership submissions returned HTTP 200
  with `ok: true` and `confirmationSent: true`. All three visitor confirmations
  were seen in `ghough@citryn.com`'s inbox at 9:33 AM Pacific.
- The first medical-records test failed. Vercel traced the SendLayer attachment
  request timing out at 15.00 seconds. PR #2 increased only that transport's
  deadline to 45 seconds, set a 60-second function limit, and added fixed
  failure-stage diagnostics without logging submitted data or provider messages.
  Its 13 medical tests and Vercel preview/production builds passed.
- After the repair deployed, a fresh medical test returned HTTP 200 in 11.93
  seconds with `ok: true`, reference `d37a3a5d-8db4-4f2c-9ae1-c491a9d49574`, and
  a valid static two-page PDF (171,620 bytes). This confirms SendLayer acceptance
  for `MedicalRecords@drsfirst.com`; that mailbox's receipt was not independently
  inspected. All medical test data was explicitly synthetic and marked not to
  process. No patient submissions were copied to the test mailbox.

These live tests validate the existing SendLayer delivery, not the pending SES
cutover. A successful retest does not establish that provider delays cannot recur.

Email feedback forwarding is enabled on the domain, and account-level
suppression is enabled for both bounces and complaints. The owner confirmed
their team handles delivery notices.

Once AWS approves production access, deploy this migration and run a synthetic
production form test to verify the Vercel OIDC exchange and resulting emails.
The medical form's provider approval is configured; its SES transport still
requires this deployment. Keep that setting separate from the general
contact-form review.

## Verification

1. `npm run check:forms` runs all form and SES transport tests without network mail.
2. `npm run build` checks the Next production bundle.
3. Set `SES_TEST_TO_EMAIL=ghough@citryn.com` in the local ignored environment file.
   With a verified sender and valid server credentials, run
   `npm run ses:test -- --send`. It sends one clearly labeled synthetic email with
   a completed test PDF to that mailbox only. Without `--send`, it sends nothing.
4. Confirm receipt and that the PDF opens before switching production traffic.

Sources: [SES v2 attachments](https://docs.aws.amazon.com/ses/latest/dg/attachments.html),
[SES sandbox](https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html),
[Vercel AWS OIDC](https://vercel.com/docs/oidc/aws).
