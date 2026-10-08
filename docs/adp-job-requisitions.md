# ADP job requisitions setup

The company feed uses `GET https://api.adp.com/staffing/v1/job-requisitions`.
ADP authenticates this endpoint with OAuth client credentials and mutual TLS.
`ADP_API_KEY` alone is insufficient; the existing variable is not consumed by this integration.

## Create the project in ADP

1. Sign in to [ADP Marketplace My Apps](https://apps.adp.com/myapps) and open
   **ADP API Central for ADP Workforce Now**. The company subscription and the
   user's app assignment were visible during setup on October 8, 2026.
2. In API Central, create a project named **FMA Website Careers** with the description
   **Read company job requisitions for the First Medical Associates careers website**.
3. Use API discovery to add **Job Requisitions**, selecting read access for
   `GET /staffing/v1/job-requisitions`. ADP also offers a Recruiting use case;
   this website only needs job requisition read access, not applicant records or writes.
   The documented application scope is:

   ```text
   /staffing/staffingManagement/workFulfillmentManagement/jobRequisitionManagement/jobRequisition.read
   ```

4. Obtain the project's **Client ID** and **Client Secret** from its credentials.
   These must belong to the company's integration project. The client ID in the
   API Central browser login URL belongs to the portal itself and is not usable here.
5. Use API Central's certificate management to request an ADP-signed client certificate.
   Follow its CSR instructions and retain the matching private key. A CSR alone is
   not the signed certificate. Project and Certificate user roles may be needed.
6. Complete any required company data consent/access setup through your ADP administrator.

## Verified local setup (October 8, 2026)

The existing **FMA Website** project now has Job Requisitions read access. ADP
bundled the collection, single-requisition, and metadata GET endpoints into that
selection. Its earlier Worker Demographic Data permissions remain as configured.

The active local certificate is **FMA Website Careers**, paired with the private
key in `.adp/client-key.pem`. The signed certificate in `.adp/client-cert.pem`
expires October 8, 2027 at 21:49:07 UTC. The initial key/certificate did not match;
the new pair was verified cryptographically before making the successful API call.
A certificate signing request (`BEGIN CERTIFICATE REQUEST`) is not a signed
certificate (`BEGIN CERTIFICATE`); the saved CSR is `.adp/client.csr`.

OAuth authentication and a live job retrieval succeeded for **DOCTORS FIRST LLC**.
Comparison with the public ADP career center confirmed **five openings**:
Medical Receptionist, Experienced Medical Receptionist, Experienced Medical
Assistant, Physician Assistant-Certified, and Bilingual Spanish speaking Physician
Assistan (ADP's title). All five have public/open/accepting-applications flags and
an external `CC2` application destination. ADP hides the Medical Assistant's
location, so that listing intentionally has no city/state.

The initial combined status/external/visible query returned only one of those
five records despite all five meeting its conditions. The client now queries
only open status upstream and enforces external/visible flags locally. This
matches the public board without exposing internal or unpublished requisitions.

## Configure this repository

Store the signed PEM certificate and private key inside `.adp/` (gitignored), or
use an absolute path to a protected location outside the repository. Add these
entries to your local `.env`, filling in the values from the ADP project:

```dotenv
ADP_CLIENT_ID=
ADP_CLIENT_SECRET=
ADP_CERT_PATH=.adp/client-cert.pem
ADP_KEY_PATH=.adp/client-key.pem
ADP_KEY_PASSPHRASE=
```

Set the optional passphrase only for an encrypted private key. Keep credentials
and certificate/key files on the server; never use `NEXT_PUBLIC_` variables for them.
For hosting, set server-only `ADP_CERT_PEM` and `ADP_KEY_PEM` secrets to the complete
signed certificate and private-key PEM contents, including their BEGIN/END lines.
Actual newlines and escaped `\n` are supported. These take precedence over file
paths. Local `.adp/` files are ignored by Git and will not be deployed.

## Retrieve jobs

```bash
npm run adp:jobs
```

The command requests a token at `https://accounts.adp.com/auth/oauth/v2/token`
using the client credentials grant, presents the certificate to both ADP hosts,
and retrieves requisitions in pages of 20. Tokens are reused until shortly before
expiry, with one renewal attempt after an API 401. TLS verification stays enabled.

It queries status `ON` (open) upstream and locally requires status `ON`,
`externalIndicator === true`, and `visibleToJobSeekerIndicator === true`.
The upstream filter intentionally omits the two boolean flags because ADP's
combined query under-returned live public postings. Pagination stops using the
reported total when the last page is full, avoiding ADP's out-of-range 404.
Output contains only IDs, job titles, external ADP application URLs, and city/state locations. Tokens, raw ADP
responses, hiring manager records, and internal-only requisitions are not printed.
HTTP/configuration failures exit with a nonzero code; they are not reported as no jobs.

The reusable Node.js client lives in `src/app/lib/adp.mjs`. Its returned records
are server-side data, not a public API response. A website endpoint should expose
only approved posting fields. `getAdpApplyUrl` selects an explicitly external
channel, preferring the channel marked as default and then `CC3`. It matches the
URL's `source` parameter to that channel and accepts only HTTPS ADP-hosted links.

## Careers pages

Resources → Careers (`/patient-resources/careers/`) lists the current public jobs.
Each listing links to `/patient-resources/careers/[id]/` with its public description,
employment type, and an **Apply now** link to the matching ADP external posting.
The old `/jobs/` and `/about/careers/` URLs redirect to the new list.

The server-only feed keeps credentials, tokens, and raw requisitions out of the
browser. It excludes internal, closed, future, expired, and unlinked postings;
location is displayed only when ADP explicitly marks it visible. Descriptions are
rebuilt using a small HTML allowlist without attributes, scripts, or embedded content.
Hiring-manager and compensation records are not exposed.

Results are cached on the server for up to 60 seconds, bounded by posting expiry.
Requests after that refresh the feed. ADP failures show an unavailable message,
not a misleading empty list; empty feeds and removed jobs have separate states.
Production must provide the ADP secrets described above before it can retrieve jobs.
Local verification does not deploy these changes or provision hosting secrets.

Run the mocked authentication, pagination, filtering, and failure checks with:

```bash
npm run check:adp
```

## Official references

- [Job Requisitions API guide](https://developers.adp.com/guides/api-guides/job-requisitions-api-guide-for-adp-workforce-now)
- [Authentication and certificate setup](https://developers.adp.com/getting-started/key-concepts/make-your-first-api-call-using-postman-1)
- [API Central projects, certificates, and roles](https://apps.adp.com/en-US/apps/410612/adp-api-central-for-adp-workforce-now/features)
