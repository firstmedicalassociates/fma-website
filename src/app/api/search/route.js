import { NextResponse } from "next/server";
import { searchSite } from "../../lib/site-search";

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
