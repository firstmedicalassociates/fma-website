import { sendFormEmail } from "../../lib/ses-email.mjs";
import { checkRateLimit, getRateLimitHeaders, getRateLimitIdentity } from "../../lib/rate-limit";
import { hasPotentialPhi } from "../../lib/no-phi-guard";
import { createPracticeInquiryHandler } from "../../lib/practice-inquiry-handler.mjs";

export const runtime = "nodejs";

export const POST = createPracticeInquiryHandler({
  hasPotentialPhi,
  async checkLimit(request) {
    const limit = await checkRateLimit(getRateLimitIdentity(request, "api-practice-inquiry"), { windowMs: 60 * 1000, max: 5, requireShared: process.env.NODE_ENV === "production" });
    if (limit.ok) return null;
    return Response.json({ ok: false, error: limit.unavailable ? "The inquiry form is temporarily unavailable. Please call our team." : "Too many inquiries. Please wait a minute and try again." }, { status: limit.unavailable ? 503 : 429, headers: getRateLimitHeaders(limit) });
  },
  send: sendFormEmail,
});
