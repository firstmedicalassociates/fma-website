# Partnership inquiry

The `/partner-with-us/` page reuses the contact page's layout, header, footer, and form styles. Both partnership calls to action on `/about/partners/` now lead here. The earlier `/contact-partner/` URL permanently redirects here so existing links also reach the dedicated partnership email flow. The page has its own canonical metadata and sitemap entry.

The form collects first and last name, email, phone, organization, optional role/title, partnership type, business goals, and permission to follow up. Categories match the partners landing page, with an additional option for other opportunities.

## Delivery

`POST /api/partnership-inquiry` sends the internal notification to both `Partnerships@drsfirst.com` and `citryn.contactforms@gmail.com`. These recipients are fixed on the server and are independent of the patient contact and practice transition recipient settings. The internal email's reply-to is the visitor.

After the internal send succeeds, a separate branded welcome email goes to the visitor. Replies go to `Partnerships@drsfirst.com`. The welcome explains the next step, links to the partners landing page, and does not repeat the submitted organization details or message. Both messages include HTML and plain-text versions. The existing practice inquiry email frame supplies the branding; its default content is unchanged.

The route uses the existing SendLayer settings (`SENDLAYER_API_KEY`, `SENDLAYER_FROM_EMAIL`, and optional `SENDLAYER_FROM_NAME`). Production retains the existing `CONTACT_FORM_VENDOR_REVIEWED=true` requirement and shared rate limiter requirements (`UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`). No new recipient environment variable is needed.

Validation, length bounds, contact consent, a honeypot, the existing message PHI guard, and a five-request-per-minute rate limit run before delivery. A team-send failure returns an error and preserves the form. A welcome-only failure returns a successful inquiry and tells the visitor not to resubmit. Provider acceptance does not confirm inbox delivery; this follows the existing form's immediate-send model without a durable mail queue.

## Preview and verification

- Run the website on port 3000, then `node scripts/preview-partnership-inquiry.mjs` for a localhost-only preview at `http://127.0.0.1:3003/partner-with-us/`.
- This preview mocks email delivery without reading mail credentials. It writes sample welcome and team emails to `artifacts/partnership-inquiry/` and serves them at `/welcome-email.html` and `/team-notification.html` on port 3003. Its `/__qa/last-delivery` endpoint exposes only the last mocked delivery for local verification.
- Use `simulate team failure` or `simulate welcome failure` as the message to exercise the two failure states. Other POST routes cannot send through this proxy.
- `node --test tests/partnership-inquiry/*.test.mjs tests/practice-inquiry/*.test.mjs tests/seo/*.test.mjs`: 35 tests passed.
- Targeted ESLint, `git diff --check`, and `npm run build` passed. The build includes the new page and API endpoint.
- Browser verification covered landing-page CTA targets, navigation to the form, successful submission and both recipient lists, preserved fields after team-send failure, welcome-only failure, and focus on the result. Desktop and 390px mobile layouts were inspected. The mobile page and email have no horizontal overflow, and the email logo loads.
- The actual Next.js API returned HTTP 400 for an incomplete inquiry. Browser success/failure delivery checks used the real handler with a mocked sender.

During local verification, the checkout had no SendLayer or shared rate-limit credentials. No real emails were sent and production inbox delivery was not verified. The existing third-party widget logs a local site-ID configuration error; no uncaught browser errors were reported for the new form.
