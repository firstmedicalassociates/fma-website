import { NextResponse } from "next/server";
import {
  normalizeFeedbackPayload,
  recordAiSearchFeedback,
} from "../../../lib/ai-search-analytics";
import { checkRateLimit, getRateLimitHeaders, getRateLimitIdentity } from "../../../lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FEEDBACK_RATE_LIMIT = {
  windowMs: 60 * 1000,
  max: 30,
  requireShared: process.env.NODE_ENV === "production",
};

export async function POST(request) {
  const rateLimit = await checkRateLimit(getRateLimitIdentity(request, "api-ai-search-feedback"), FEEDBACK_RATE_LIMIT);
  if (!rateLimit.ok) {
    const limiterUnavailable = rateLimit.unavailable === true;
    return NextResponse.json(
      {
        ok: false,
        error: limiterUnavailable
          ? "Feedback is temporarily unavailable. Please try again soon."
          : "Too many feedback requests. Please wait a moment and try again.",
      },
      {
        status: limiterUnavailable ? 503 : 429,
        headers: getRateLimitHeaders(rateLimit),
      }
    );
  }

  const payload = await request.json().catch(() => ({}));
  const eventId = String(payload?.eventId || "").trim();
  const { rating, tags } = normalizeFeedbackPayload(payload);

  if (!eventId || !rating) {
    return NextResponse.json(
      {
        ok: false,
        error: "Feedback eventId and a valid rating are required.",
      },
      { status: 400 }
    );
  }

  await recordAiSearchFeedback({ eventId, rating, tags });

  return NextResponse.json({
    ok: true,
  });
}
