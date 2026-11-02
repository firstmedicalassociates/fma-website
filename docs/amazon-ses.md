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
`SES_FROM_NAME`, and `SES_TEST_TO_EMAIL` configured. Existing recipient secrets
are preserved through the compatibility fallbacks above.

## Cutover status

The migration is not deployed yet. The SES account remains in the sandbox, so
the existing external team/archive addresses and arbitrary visitor confirmations
cannot all be delivered. A transactional production-access request for
`https://drsfirst.com` is prepared in the console but has not been submitted;
AWS's required terms and bounce/complaint-process acknowledgement await the
account owner's confirmation. Email feedback forwarding is enabled on the domain.

Vercel currently has no `MEDICAL_RECORDS_VENDOR_REVIEWED` setting. The medical
form stays disabled until the owner confirms the provider arrangement is
approved. Keep that setting separate from the general contact-form review.

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
