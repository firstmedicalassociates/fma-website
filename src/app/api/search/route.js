import { NextResponse } from "next/server";
import { runAiSearch } from "../../lib/ai-search";
import { normalizeSearchQuery, searchSite } from "../../lib/site-search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";
  const { results } = await searchSite(query, {
    perTypeLimit: 4,
    totalLimit: 8,
  });

  return NextResponse.json({
    ok: true,
    query,
    results,
  });
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const query = normalizeSearchQuery(body?.query ?? body?.q ?? "");

    if (query.length < 2) {
      return NextResponse.json(
        {
          ok: false,
          error: "Query must be at least 2 characters",
          query,
          results: [],
          ai: null,
        },
        { status: 400 }
      );
    }

    const [siteResult, aiResult] = await Promise.allSettled([
      searchSite(query, {
        perTypeLimit: 4,
        totalLimit: 8,
      }),
      runAiSearch(query, { limit: 8 }),
    ]);

    const results =
      siteResult.status === "fulfilled" && Array.isArray(siteResult.value?.results)
        ? siteResult.value.results
        : [];

    const ai =
      aiResult.status === "fulfilled"
        ? {
            ok: Boolean(aiResult.value?.ok),
            answer: aiResult.value?.answer || "",
            sources: Array.isArray(aiResult.value?.sources) ? aiResult.value.sources : [],
            confidence: Number(aiResult.value?.confidence || 0),
            error: aiResult.value?.error || "",
          }
        : {
            ok: false,
            answer: "",
            sources: [],
            confidence: 0,
            error: aiResult.reason?.message || "AI search failed",
          };

    const requestOk = siteResult.status === "fulfilled" || ai.ok;

    return NextResponse.json(
      {
        ok: requestOk,
        query,
        results,
        ai,
        error: requestOk ? "" : "Search services are temporarily unavailable",
      },
      { status: requestOk ? 200 : 500 }
    );
  } catch (error) {
    console.error("Search API POST error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: error.message || "Failed to process search",
        results: [],
        ai: null,
      },
      { status: 500 }
    );
  }
}
