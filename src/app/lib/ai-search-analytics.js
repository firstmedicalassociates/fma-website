import crypto from "crypto";
import { prisma } from "./prisma.js";
import { getPhiRisk, normalizePublicSearchQuery } from "./no-phi-guard.js";
import { classifyAiSearchIntent } from "./ai-search-intent.js";

const ALLOWED_FEEDBACK_RATINGS = new Set(["helpful", "not_helpful"]);
const ALLOWED_FEEDBACK_TAGS = new Set([
  "good_match",
  "wrong_info",
  "missing_info",
  "confusing",
  "outdated",
  "too_generic",
  "booking_issue",
  "source_issue",
  "privacy_concern",
]);

let eventLoggingDisabled = false;
let feedbackLoggingDisabled = false;

function getHashSecret() {
  return process.env.AI_SEARCH_EVENT_SECRET?.trim() || "";
}

function hashQuery(query) {
  const secret = getHashSecret();
  if (!secret) return null;

  const normalized = normalizePublicSearchQuery(query).toLowerCase();
  if (!normalized) return null;

  return crypto.createHmac("sha256", secret).update(normalized).digest("hex");
}

export function inferAiSearchIntent(query = "") {
  return classifyAiSearchIntent(query).intent;
}

function canUseAiSearchEventModel() {
  return Boolean(prisma?.aiSearchEvent?.create && prisma?.aiSearchEvent?.updateMany);
}

function isMissingAnalyticsTableError(error) {
  const message = String(error?.message || "").toLowerCase();
  return error?.code === "P2021" || error?.code === "P2022" || message.includes("aisearchevent");
}

export async function logAiSearchEvent({
  query = "",
  surface = "api",
  status = "unknown",
  code = "",
  resultCount = 0,
  sourceCount = 0,
  appointmentOptionCount = 0,
  aiConfidence = "",
  grounded = false,
  disclaimer = false,
  latencyMs = null,
  phiCategories = null,
  intent = "",
} = {}) {
  if (eventLoggingDisabled) return null;
  if (!canUseAiSearchEventModel()) return null;

  const normalizedQuery = normalizePublicSearchQuery(query);
  const phiRisk = phiCategories ? { categories: phiCategories } : getPhiRisk(normalizedQuery);
  const isPotentialPhiEvent =
    code === "potential_phi" ||
    (Array.isArray(phiRisk.categories) && phiRisk.categories.length > 0);

  try {
    const event = await prisma.aiSearchEvent.create({
      data: {
        queryHash: isPotentialPhiEvent ? null : hashQuery(normalizedQuery),
        queryLength: isPotentialPhiEvent ? 0 : normalizedQuery.length,
        surface: String(surface || "api").slice(0, 40),
        intent: isPotentialPhiEvent ? "privacy_blocked" : String(intent || inferAiSearchIntent(normalizedQuery)).slice(0, 80),
        status: String(status || "unknown").slice(0, 40),
        code: code ? String(code).slice(0, 80) : null,
        resultCount: Math.max(Number(resultCount) || 0, 0),
        sourceCount: Math.max(Number(sourceCount) || 0, 0),
        appointmentOptionCount: Math.max(Number(appointmentOptionCount) || 0, 0),
        aiConfidence: aiConfidence ? String(aiConfidence).slice(0, 20) : null,
        grounded: grounded === true,
        disclaimer: disclaimer === true,
        latencyMs: Number.isFinite(Number(latencyMs)) ? Math.max(Number(latencyMs), 0) : null,
        phiCategories: Array.isArray(phiRisk.categories) ? phiRisk.categories.slice(0, 8) : [],
      },
      select: {
        id: true,
      },
    });

    return event.id;
  } catch (error) {
    if (isMissingAnalyticsTableError(error)) {
      eventLoggingDisabled = true;
    } else {
      console.error("AI search event logging skipped:", error?.message || error);
    }
    return null;
  }
}

export function normalizeFeedbackPayload(payload = {}) {
  const rating = String(payload?.rating || "").trim();
  const tags = Array.isArray(payload?.tags) ? payload.tags : [];

  return {
    rating: ALLOWED_FEEDBACK_RATINGS.has(rating) ? rating : "",
    tags: [
      ...new Set(
        tags
          .map((tag) => String(tag || "").trim())
          .filter((tag) => ALLOWED_FEEDBACK_TAGS.has(tag))
      ),
    ].slice(0, 5),
  };
}

export async function recordAiSearchFeedback({ eventId, rating, tags = [] } = {}) {
  if (feedbackLoggingDisabled) return false;
  if (!canUseAiSearchEventModel()) return false;

  const safeEventId = String(eventId || "").trim();
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(safeEventId)) return false;
  if (!ALLOWED_FEEDBACK_RATINGS.has(rating)) return false;

  try {
    await prisma.aiSearchEvent.updateMany({
      where: { id: safeEventId },
      data: {
        feedbackRating: rating,
        feedbackTags: tags,
        feedbackCreatedAt: new Date(),
      },
    });
    return true;
  } catch (error) {
    if (isMissingAnalyticsTableError(error)) {
      feedbackLoggingDisabled = true;
    } else {
      console.error("AI search feedback logging skipped:", error?.message || error);
    }
    return false;
  }
}
