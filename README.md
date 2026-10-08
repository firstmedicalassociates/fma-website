This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## ADP job requisitions

The read-only ADP client can retrieve public company job openings with
`npm run adp:jobs`. It requires a project client ID, client secret, and an
ADP-issued mutual TLS certificate with its private key; `ADP_API_KEY` alone is
insufficient. Follow [the ADP setup guide](docs/adp-job-requisitions.md) and the
variables in `.env.example`. Run `npm run check:adp` for the integration's mocked
checks. Live retrieval was verified on October 8, 2026. Resources → Careers
(`/patient-resources/careers/`) displays live openings, job details, and ADP apply
links. The server needs the ADP credentials and certificate/key pair; hosting can
use `ADP_CERT_PEM` and `ADP_KEY_PEM` secrets instead of local file paths.

## QR code analytics

The admin **QR Codes** section (`/admin/qr-codes`) reads your organization's QR
codes and analytics from the [Uniqode API](https://apidocs.uniqode.com/). Set
`UNIQODE_API` and `UNIQODE_ORGANIZATION_ID` in the server environment, including
the hosting environment when deploying. Neither value is sent to the browser.
Full admins have access; sub-admins need the **QR Codes → View** permission.

Expand a code to see total scans, distinct scanners, daily scans, devices, and
top locations. The **Comparison** tab ranks all dynamic codes by scans and links
back to their details. Both views use the same inclusive UTC date range (last
30 days by default; custom ranges up to 366 days) and exclude anomalous scans.
Static codes are listed as untracked. History and analytics access depend on
the Uniqode plan. Requests are cached in server memory for up to one minute;
failed metrics appear as unavailable rather than zero. The integration is
read-only and requires no database migration.

Run the QR integration and admin unit checks with `npm run check:admin`.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
