import { NextResponse } from "next/server";
import { logAiSearchEvent } from "../../lib/ai-search-analytics";
import { runAiSearch } from "../../lib/ai-search";
import {
  PUBLIC_SEARCH_MAX_CHARACTERS,
  PUBLIC_SEARCH_MIN_CHARACTERS,
  getNoPhiError,
  getPhiRisk,
  hasPotentialPhi,
  normalizePublicSearchQuery,
} from "../../lib/no-phi-guard";
import { checkRateLimit, getRateLimitHeaders, getRateLimitIdentity } from "../../lib/rate-limit";
import { searchSite } from "../../lib/site-search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SEARCH_RATE_LIMIT = {
  windowMs: 60 * 1000,
  max: 20,
  requireShared: process.env.NODE_ENV === "production",
};

function buildAiError(error, code = "invalid_query") {
  return {
    ok: false,
    code,
    answer: "",
    sources: [],
    confidence: 0,
    aiConfidence: "low",
    grounded: false,
    citations: [],
    disclaimer: true,
    appointmentOptions: [],
    appointmentMeta: null,
    error,
  };
}

async function buildInvalidSearchResponse(error, status, code, query = "", extra = {}) {
  const responseQuery =
    typeof extra.responseQuery === "string" ? extra.responseQuery : query;
  const eventId = await logAiSearchEvent({
    query,
    surface: "api_search",
    status: "blocked",
    code,
    resultCount: 0,
    sourceCount: 0,
    appointmentOptionCount: 0,
    disclaimer: true,
    phiCategories: extra.phiCategories || null,
  });

  return NextResponse.json(
    {
      ok: false,
      query: responseQuery,
      results: [],
      ai: {
        ...buildAiError(error, code),
        eventId: eventId || "",
      },
      error,
    },
    { status }
  );
}

export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      query: "",
      results: [],
      error: "Use POST for search requests.",
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
    const rateLimit = await checkRateLimit(getRateLimitIdentity(request, "api-search"), SEARCH_RATE_LIMIT);
    if (!rateLimit.ok) {
      const limiterUnavailable = rateLimit.unavailable === true;
      const message = limiterUnavailable
        ? "Search is temporarily unavailable. Please try again soon."
        : "Too many search requests. Please wait a moment and try again.";
      return NextResponse.json(
        {
          ok: false,
          query: "",
          results: [],
          ai: buildAiError(message, limiterUnavailable ? "rate_limit_unavailable" : "rate_limited"),
          error: message,
        },
        {
          status: limiterUnavailable ? 503 : 429,
          headers: getRateLimitHeaders(rateLimit),
        }
      );
    }

    const body = await request.json().catch(() => ({}));
    const rawQuery = String(body?.query ?? body?.q ?? "");
    const query = normalizePublicSearchQuery(rawQuery);
    const pageContext = body?.pageContext && typeof body.pageContext === "object"
      ? body.pageContext
      : null;

    if (query.length < PUBLIC_SEARCH_MIN_CHARACTERS) {
      return await buildInvalidSearchResponse(
        `Query must be at least ${PUBLIC_SEARCH_MIN_CHARACTERS} characters`,
        400,
        "query_too_short",
        query
      );
    }

    if (hasPotentialPhi(query)) {
      const phiRisk = getPhiRisk(query);
      return await buildInvalidSearchResponse(getNoPhiError("AI search"), 400, "potential_phi", query, {
        phiCategories: phiRisk.categories,
        responseQuery: "",
      });
    }

    if (query.length > PUBLIC_SEARCH_MAX_CHARACTERS) {
      return await buildInvalidSearchResponse(
        "Query is too long. Please keep your question under 300 characters.",
        400,
        "query_too_long",
        query,
        {
          responseQuery: "",
        }
      );
    }

    const [siteResult, aiResult] = await Promise.allSettled([
      searchSite(query, {
        perTypeLimit: 4,
        totalLimit: 8,
      }),
      runAiSearch(query, { limit: 8, pageContext }),
    ]);

    const results =
      siteResult.status === "fulfilled" && Array.isArray(siteResult.value?.results)
        ? siteResult.value.results
        : [];

    const ai =
      aiResult.status === "fulfilled"
        ? {
            ok: Boolean(aiResult.value?.ok),
            code: aiResult.value?.code || "",
            answer: aiResult.value?.answer || "",
            sources: Array.isArray(aiResult.value?.sources) ? aiResult.value.sources : [],
            confidence: Number(aiResult.value?.confidence || 0),
            aiConfidence: aiResult.value?.aiConfidence || "low",
            grounded: aiResult.value?.grounded === true,
            citations: Array.isArray(aiResult.value?.citations) ? aiResult.value.citations : [],
            disclaimer: aiResult.value?.disclaimer === true,
            appointmentOptions: Array.isArray(aiResult.value?.appointmentOptions)
              ? aiResult.value.appointmentOptions
              : [],
            appointmentMeta: aiResult.value?.appointmentMeta || null,
            error: aiResult.value?.error || "",
          }
        : {
            ok: false,
            code: "ai_search_failed",
            answer: "",
            sources: [],
            confidence: 0,
            aiConfidence: "low",
            grounded: false,
            citations: [],
            disclaimer: true,
            appointmentOptions: [],
            appointmentMeta: null,
            error: "AI search failed",
        };

    const requestOk = siteResult.status === "fulfilled" || ai.ok;
    const eventId = await logAiSearchEvent({
      query,
      surface: "api_search",
      status: ai.ok ? "answered" : requestOk ? "degraded" : "failed",
      code: ai.code || "",
      resultCount: results.length,
      sourceCount: ai.sources.length,
      appointmentOptionCount: ai.appointmentOptions.length,
      aiConfidence: ai.aiConfidence,
      grounded: ai.grounded,
      disclaimer: ai.disclaimer,
      latencyMs: Date.now() - startedAt,
    });
    const aiWithEvent = {
      ...ai,
      eventId: eventId || "",
    };

    return NextResponse.json(
      {
        ok: requestOk,
        query,
        results,
        ai: aiWithEvent,
        error: requestOk ? "" : "Search services are temporarily unavailable",
      },
      { status: requestOk ? 200 : 500 }
    );
  } catch (error) {
    console.error("Search API POST error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Failed to process search",
        results: [],
        ai: null,
      },
      { status: 500 }
    );
  }
}
