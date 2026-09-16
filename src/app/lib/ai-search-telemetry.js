import { NextResponse } from "next/server";
import { logAiSearchEvent } from "./ai-search-analytics.js";
import { withUsageCapture, persistUsage } from "./ai-usage.mjs";
import { buildInteractionTargets } from "./ai-interactions.mjs";
import crypto from "node:crypto";
const SURFACES = new Set(["home_hero", "search_modal", "search_page"]);
export function classifySearchOutcome(
  ai = {},
  httpStatus = 200,
  hasFallback = false,
) {
  const availability = ai.appointmentMeta?.availabilityStatus;
  if (
    httpStatus === 429 ||
    [
      "potential_phi",
      "blocked_prompt_injection",
      "query_too_short",
      "query_too_long",
    ].includes(ai.code) ||
    ai.status === "blocked"
  )
    return "blocked";
  if (
    [
      "no_open_slots",
      "provider_match_needed",
      "appointment_scope_needed",
    ].includes(availability) ||
    ai.status === "no_results" ||
    ai.status === "needs_input"
  )
    return "no_results";
  if (
    httpStatus >= 500 ||
    ["failed", "unavailable"].includes(ai.status) ||
    availability === "unavailable"
  )
    return hasFallback ? "degraded" : "failed";
  return ai.ok ? "answered" : hasFallback ? "degraded" : "failed";
}
export async function withSearchTelemetry(request, defaultSurface, handler) {
  const started = Date.now();
  const input = await request
    .clone()
    .json()
    .catch(() => ({}));
  const surface = SURFACES.has(input?.surface) ? input.surface : defaultSurface;
  return withUsageCapture("search", async (context) => {
    let response;
    try {
      response = await handler(request);
    } catch (error) {
      console.error("Search request failed:", error.code || error.name);
      response = NextResponse.json(
        {
          ok: false,
          error: "Search is temporarily unavailable.",
          code: "search_failed",
        },
        { status: 500 },
      );
    }
    try {
      const data = await response
        .clone()
        .json()
        .catch(() => null);
      if (!data) {
        await persistUsage(context.records);
        return response;
      }
      const ai = data.ai || data;
      const eventId = crypto.randomUUID();
      const targets = buildInteractionTargets(
        eventId,
        ai,
        data.results || [],
        surface === "search_modal" || surface === "home_hero",
      );
      const loggedId = await logAiSearchEvent({
        id: eventId,
        query:
          typeof input?.query === "string"
            ? input.query
            : typeof input?.q === "string"
              ? input.q
              : "",
        surface,
        status: classifySearchOutcome(
          ai,
          response.status,
          Array.isArray(data.results) && data.results.length > 0,
        ),
        code:
          ai.appointmentMeta?.providerResolution?.monitoringCode ||
          ai.code ||
          (response.status >= 500 ? "search_failed" : ""),
        resultCount: data.results?.length || 0,
        sourceCount: ai.sources?.length || 0,
        appointmentOptionCount: ai.appointmentOptions?.length || 0,
        aiConfidence: ai.aiConfidence,
        grounded: ai.grounded,
        disclaimer: ai.disclaimer,
        intent: ai.intent,
        latencyMs: Date.now() - started,
        searchRoute: ai.meta?.route,
        modelVersion: ai.meta?.modelVersion,
        promptVersion: ai.meta?.promptVersion,
        knowledgeVersion: ai.meta?.knowledgeVersion,
        sourceRefs: (ai.sources || []).map(
          (source) =>
            source.id || `${source.type || "source"}:${source.url || ""}`,
        ),
        retrievalScore: ai.confidence,
        answer: ai.answer,
        availabilityStatus: ai.appointmentMeta?.availabilityStatus,
        telemetryVersion: 1,
        bookingTargetCount: targets.filter(
          (target) => target.type === "booking",
        ).length,
      });
      await persistUsage(context.records, loggedId);
      const tracking = {
        eventId: loggedId || "",
        interactionTargets: loggedId
          ? targets.map(({ url, token }) => ({ url, token }))
          : [],
      };
      if (data.ai) data.ai = { ...data.ai, ...tracking };
      else Object.assign(data, tracking);
      return NextResponse.json(data, {
        status: response.status,
        headers: response.headers,
      });
    } catch (error) {
      console.error(
        "Search telemetry enrichment skipped:",
        error.code || error.name,
      );
      return response;
    }
  });
}
