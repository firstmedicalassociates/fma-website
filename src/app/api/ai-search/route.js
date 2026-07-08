import { NextResponse } from "next/server";
import { logAiSearchEvent } from "../../lib/ai-search-analytics";
import { runAiSearch } from "../../lib/ai-search";
import { checkRateLimit, getRateLimitHeaders, getRateLimitIdentity } from "../../lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AI_SEARCH_RATE_LIMIT = {
  windowMs: 60 * 1000,
  max: 12,
  requireShared: process.env.NODE_ENV === "production",
};

function getStatusForAiResult(result) {
  if (result.ok) return 200;
  if (["query_too_short", "query_too_long", "potential_phi", "blocked_prompt_injection"].includes(result.code)) {
    return 400;
  }
  return 500;
}

export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      error: "Use POST for AI search requests.",
    },
    {
      status: 405,
      headers: {
        Allow: "POST",
      },
    }
  );
}

export async function POST(request) {
  try {
    const startedAt = Date.now();
    const rateLimit = await checkRateLimit(getRateLimitIdentity(request, "api-ai-search"), AI_SEARCH_RATE_LIMIT);
    if (!rateLimit.ok) {
      const limiterUnavailable = rateLimit.unavailable === true;
      return NextResponse.json(
        {
          ok: false,
          code: limiterUnavailable ? "rate_limit_unavailable" : "rate_limited",
          error: limiterUnavailable
            ? "AI search is temporarily unavailable. Please try again soon."
            : "Too many AI search requests. Please wait a moment and try again.",
        },
        {
          status: limiterUnavailable ? 503 : 429,
          headers: getRateLimitHeaders(rateLimit),
        }
      );
    }

    const body = await request.json().catch(() => ({}));
    const query = body?.query ?? body?.q ?? "";
    const pageContext = body?.pageContext && typeof body.pageContext === "object"
      ? body.pageContext
      : null;
    const sessionContext = body?.sessionContext && typeof body.sessionContext === "object"
      ? body.sessionContext
      : null;
    const result = await runAiSearch(query, { limit: 8, pageContext, sessionContext });
    const analyticsCode = result.appointmentMeta?.providerResolution?.monitoringCode || result.code || "";
    const availabilityStatus = result.appointmentMeta?.availabilityStatus || "";
    const analyticsStatus =
      ["no_open_slots", "provider_match_needed", "appointment_scope_needed"].includes(availabilityStatus)
        ? "no_results"
        : result.ok
          ? "answered"
          : "blocked";
    const eventId = await logAiSearchEvent({
      query,
      surface: "api_ai_search",
      status: analyticsStatus,
      code: analyticsCode,
      resultCount: 0,
      sourceCount: Array.isArray(result.sources) ? result.sources.length : 0,
      appointmentOptionCount: Array.isArray(result.appointmentOptions) ? result.appointmentOptions.length : 0,
      aiConfidence: result.aiConfidence || "",
      grounded: result.grounded === true,
      disclaimer: result.disclaimer === true,
      intent: result.intent || "",
      latencyMs: Date.now() - startedAt,
    });
    const status = getStatusForAiResult(result);
    return NextResponse.json(
      {
        ...result,
        eventId: eventId || "",
      },
      { status }
    );
  } catch (error) {
    console.error("AI Search error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Failed to process AI search",
      },
      { status: 500 }
    );
  }
}
