import { getNoPhiError, hasPotentialPhi } from "../../lib/no-phi-guard";
import { checkRateLimit, getRateLimitHeaders, getRateLimitIdentity } from "../../lib/rate-limit";
import { createContactHandler } from "../../lib/contact-handler.mjs";
import { sendFormEmail } from "../../lib/ses-email.mjs";

export const runtime = "nodejs";

export const POST = createContactHandler({
  hasPotentialPhi,
  getNoPhiError,
  send: sendFormEmail,
  async checkLimit(request) {
    const limit = await checkRateLimit(getRateLimitIdentity(request, "api-location-info-contact"), {
      windowMs: 60 * 1000, max: 8, requireShared: process.env.NODE_ENV === "production",
    });
    if (limit.ok) return null;
    return Response.json({ ok: false, error: limit.unavailable
      ? "Contact form is temporarily unavailable. Please call the office."
      : "Too many contact requests. Please wait a moment and try again.",
    }, { status: limit.unavailable ? 503 : 429, headers: getRateLimitHeaders(limit) });
  },
});
