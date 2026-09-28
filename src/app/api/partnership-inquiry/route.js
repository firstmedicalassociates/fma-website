import { checkRateLimit, getRateLimitHeaders, getRateLimitIdentity } from "../../lib/rate-limit";
import { hasPotentialPhi } from "../../lib/no-phi-guard";
import { createPartnershipInquiryHandler } from "../../lib/partnership-inquiry-handler.mjs";

export const runtime = "nodejs";

export const POST = createPartnershipInquiryHandler({
  hasPotentialPhi,
  async checkLimit(request) {
    const limit = await checkRateLimit(getRateLimitIdentity(request, "api-partnership-inquiry"), {
      windowMs: 60 * 1000, max: 5, requireShared: process.env.NODE_ENV === "production",
    });
    if (limit.ok) return null;
    return Response.json({ ok: false, error: limit.unavailable ? "The inquiry form is temporarily unavailable. Please email Partnerships@drsfirst.com." : "Too many inquiries. Please wait a minute and try again." }, {
      status: limit.unavailable ? 503 : 429, headers: getRateLimitHeaders(limit),
    });
  },
  async send(apiKey, message) {
    const response = await fetch("https://console.sendlayer.com/api/v1/email", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(message),
      signal: AbortSignal.timeout(15000),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result?.MessageID) {
      const error = new Error("SendLayer rejected the email request.");
      error.status = response.status;
      throw error;
    }
    return result.MessageID;
  },
});
