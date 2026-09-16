import { NextResponse } from "next/server";
import { requireAdminRequest, adminError } from "../../../../lib/admin-auth";
import { parseAnalyticsQuery } from "../../../../lib/ai-dashboard-query.mjs";
import { loadEstimatedSpending } from "../../../../lib/ai-dashboard";
import { loadReportedCosts } from "../../../../lib/openai-costs.mjs";
import { prisma } from "../../../../lib/prisma";
export const runtime = "nodejs";
export async function GET(request) {
  const auth = await requireAdminRequest(request);
  if (!auth.ok) return auth.response;
  const params = new URL(request.url).searchParams;
  let query;
  try {
    query = parseAnalyticsQuery(params);
  } catch (error) {
    return adminError(error.message);
  }
  try {
    const data =
      params.get("reported") === "1"
        ? await loadReportedCosts(query, { db: prisma })
        : await loadEstimatedSpending(query);
    return NextResponse.json({ ok: true, ...data });
  } catch (error) {
    console.error("Spending query failed:", error.code || error.name);
    return adminError("Spending could not be loaded. Please retry.", 503);
  }
}
