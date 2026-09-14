import { NextResponse } from "next/server";
import { requireAdminRequest, adminError } from "../../../../lib/admin-auth";
import { hasPermission } from "../../../../lib/admin-permissions.mjs";
import { parseAnalyticsQuery } from "../../../../lib/ai-dashboard-query.mjs";
import {
  loadOverview,
  loadActivity,
  loadEventDetail,
} from "../../../../lib/ai-dashboard";
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
    const id = params.get("eventId");
    if (id) {
      if (!/^[\w-]{8,80}$/.test(id))
        return adminError("Invalid event identifier.");
      const event = await loadEventDetail(
        id,
        hasPermission(auth.session, "spending.view"),
      );
      return event
        ? NextResponse.json({ ok: true, event })
        : adminError("Event not found.", 404);
    }
    const section = params.get("section") || "overview";
    const data =
      section === "overview"
        ? await loadOverview(query)
        : ["activity", "feedback"].includes(section)
          ? await loadActivity(query, section === "feedback")
          : null;
    return data
      ? NextResponse.json({ ok: true, ...data })
      : adminError("Unknown analytics section.");
  } catch (error) {
    console.error("AI dashboard query failed:", error.code || error.name);
    return adminError("Analytics could not be loaded. Please retry.", 503);
  }
}
