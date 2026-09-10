# FMA practice transition landing page

Landing route: `/sell-your-practice/`. Ad links may include `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, and `utm_term`; these appear in the internal notification only. Example: `https://drsfirst.com/sell-your-practice/?utm_source=facebook&utm_medium=paid_social&utm_campaign=practice_transition`.

The page reuses SiteHeader, SiteFooter, HeroEyebrow, Lucide icons, FMA colors, rounded surfaces, and the existing metadata helper. Copy is grounded in the About, Mission, and Partners pages. The EPIC reference informed the retirement/operational support themes only. Its valuation/numbers section, urgency section, contact information, testimonials, and acquisition promises are excluded. No acquisition price, closing time, employment arrangement, or confidentiality guarantee is asserted.

## Inquiry delivery

`POST /api/practice-inquiry` validates contact/practice details, explicit inquiry contact consent, option values, field lengths, and the existing free-text PHI guard. The route uses the existing rate limiter (shared Redis required in production), a honeypot, and SendLayer's existing message format.

Required environment variables are the same as the current contact form: `SENDLAYER_API_KEY`, `SENDLAYER_FROM_EMAIL`, and `SENDLAYER_TO_EMAILS` (or legacy `SENDLAYER_TO_EMAIL`). The optional `SENDLAYER_PRACTICE_TO_EMAILS` overrides the recipient list for practice inquiries. `SENDLAYER_FROM_NAME` defaults to First Medical Associates. Production retains `CONTACT_FORM_VENDOR_REVIEWED=true` and the existing `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` requirements.

The internal notification contains the practice profile, goals, contact preference, message, consent, and allowlisted campaign tags. Its reply-to is the visitor. After that send succeeds, a separate professional welcome email goes to the visitor, with a reply-to pointing to the first configured practice recipient. The welcome does not repeat the practice details or message. Both templates have HTML and plain-text versions; the wordmark uses text so branding remains readable when images are blocked.

If internal delivery fails, the form preserves the fields and offers retry/call options. If only the welcome send fails, the inquiry remains successful and the visitor is explicitly told not to resubmit. Like the existing contact form, acceptance by SendLayer is not a guarantee of inbox delivery; this flow has no durable email queue or bounce monitoring.

This local checkout did not have SendLayer or shared Redis configuration at implementation time. No live emails were sent. Verify the deployment environment's existing configuration before sending ad traffic.

## Preview and verification

- `npm run dev` serves the actual page on port 3000.
- `node scripts/preview-practice-inquiry.mjs` runs a localhost-only preview on port 3002 with mocked inquiry mail. It writes `artifacts/practice-transition/welcome-email.html` and `team-notification.html`, and serves them at the matching port-3002 paths. This script is not part of the production route. The message `simulate team failure` exercises a failed send; `simulate welcome failure` exercises partial success. The proxy forwards Next's development WebSocket for hydration.
- `node --test tests/practice-inquiry/*.test.mjs` covers delivery order, default/dedicated recipients, reply-to, validation, honeypot, malformed/oversized payloads, PHI rejection, rate-limit responses, missing configuration, escaping, campaign bounds, and both failure paths.
- Targeted ESLint, 10 inquiry tests, 13 existing SEO tests, and production build passed. Desktop and 390px mobile views were visually reviewed. Browser mock tests exercised successful submission, failed team delivery with retained fields, and accepted inquiry with failed welcome. The CTA jumps directly to the form on mobile.
- The existing patient chat widget and site navigation are reused and retain their current behavior.

## Generated photography

Built-in image generation was used. Optimized website asset: `public/images/practice-transition/physician-partnership.webp` (1536 × 1024, about 90 KB). Original: `artifacts/practice-transition/physician-partnership-source.png`. The photograph is illustrative, not a representation of actual FMA staff.

Final prompt:

> Use case: photorealistic-natural. Asset type: FMA medical practice acquisition landing page hero. Create a premium natural editorial photograph inspired by a healthcare ad of two physicians shaking hands in a bright modern clinic: an experienced silver-haired male physician and a middle-aged male physician with dark hair and olive skin, both wearing white coats over smart professional clothes and discreet stethoscopes. They face each other with warm, genuine expressions, handshake anatomically accurate and visible. Medium-wide landscape composition, waist-up, both people fully within frame with breathing room, subjects centered, suitable for a rounded rectangular website photo crop. Bright windows, soft blue-white clinic background, natural daylight, refined realistic skin and fabric texture. Optimistic professional partnership, respectful succession and continuity of care. No lettering, logos, watermarks, charts or graphic overlays. This is illustrative photography, not a depiction of actual FMA staff.
