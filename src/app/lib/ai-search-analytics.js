import crypto from "crypto";
import { prisma } from "./prisma.js";
import {
  getPhiRisk,
  getPublicContentPhiRisk,
  normalizePublicSearchQuery,
} from "./no-phi-guard.js";
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
  const dedicatedSecret = process.env.AI_SEARCH_EVENT_SECRET?.trim() || "";
  if (dedicatedSecret) return dedicatedSecret;

  const adminSecret = process.env.ADMIN_AUTH_SECRET?.trim() || "";
  if (!adminSecret) return "";

  return crypto
    .createHmac("sha256", adminSecret)
    .update("fma-ai-search-event-hashing-v1")
    .digest("hex");
}

function hashQuery(query) {
  const secret = getHashSecret();
  if (!secret) return null;

  const normalized = normalizePublicSearchQuery(query).toLowerCase();
  if (!normalized) return null;

  return crypto.createHmac("sha256", secret).update(normalized).digest("hex");
}

function hashAnswer(answer) {
  const secret = getHashSecret();
  if (!secret) return null;

  const normalized = normalizePublicSearchQuery(answer).slice(0, 4000);
  if (!normalized) return null;

  return crypto
    .createHmac("sha256", secret)
    .update(`answer:${normalized}`)
    .digest("hex");
}

export function createAiSearchFeedbackHashes({ query = "", answer = "" } = {}) {
  return {
    queryHash: hashQuery(query),
    answerHash: hashAnswer(answer),
  };
}

function hashesMatch(first = "", second = "") {
  const firstBuffer = Buffer.from(String(first || ""));
  const secondBuffer = Buffer.from(String(second || ""));
  return (
    firstBuffer.length > 0 &&
    firstBuffer.length === secondBuffer.length &&
    crypto.timingSafeEqual(firstBuffer, secondBuffer)
  );
}

function limitSnapshot(value = "", maxLength = 0) {
  const normalized = normalizePublicSearchQuery(value);
  if (!normalized || maxLength <= 0) return "";
  return normalized.slice(0, maxLength);
}

export function buildFeedbackSnapshotUpdate({
  event = {},
  rating = "",
  query = "",
  answer = "",
} = {}) {
  if (rating !== "not_helpful") {
    return {
      feedbackQuerySnapshot: null,
      feedbackAnswerSnapshot: null,
      feedbackSnapshotStatus: "not_requested",
      feedbackReviewStatus: "not_required",
    };
  }

  if (Array.isArray(event.phiCategories) && event.phiCategories.length > 0) {
    return {
      feedbackQuerySnapshot: null,
      feedbackAnswerSnapshot: null,
      feedbackSnapshotStatus: "withheld_phi",
      feedbackReviewStatus: "pending",
    };
  }

  const safeQuery = limitSnapshot(query, 300);
  const safeAnswer = limitSnapshot(answer, 4000);
  if (!safeQuery || !safeAnswer || !event.queryHash || !event.answerHash) {
    return {
      feedbackQuerySnapshot: null,
      feedbackAnswerSnapshot: null,
      feedbackSnapshotStatus: "unavailable",
      feedbackReviewStatus: "pending",
    };
  }

  if (
    !hashesMatch(event.queryHash, hashQuery(safeQuery)) ||
    !hashesMatch(event.answerHash, hashAnswer(safeAnswer))
  ) {
    return {
      feedbackQuerySnapshot: null,
      feedbackAnswerSnapshot: null,
      feedbackSnapshotStatus: "mismatch",
      feedbackReviewStatus: "pending",
    };
  }

  const queryRisk = getPhiRisk(safeQuery);
  const answerRisk = getPublicContentPhiRisk(safeAnswer);
  if (queryRisk.hasPotentialPhi || answerRisk.hasPotentialPhi) {
    return {
      feedbackQuerySnapshot: null,
      feedbackAnswerSnapshot: null,
      feedbackSnapshotStatus: "withheld_phi",
      feedbackReviewStatus: "pending",
    };
  }

  return {
    feedbackQuerySnapshot: safeQuery,
    feedbackAnswerSnapshot: safeAnswer,
    feedbackSnapshotStatus: "stored",
    feedbackReviewStatus: "pending",
  };
}

export function inferAiSearchIntent(query = "") {
  return classifyAiSearchIntent(query).intent;
}

function canUseAiSearchEventModel() {
  return Boolean(
    prisma?.aiSearchEvent?.create &&
      prisma?.aiSearchEvent?.findUnique &&
      prisma?.aiSearchEvent?.updateMany
  );
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
  searchRoute = "",
  promptVersion = "",
  modelVersion = "",
  knowledgeVersion = "",
  sourceRefs = [],
  retrievalScore = null,
  answer = "",
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
        answerHash: isPotentialPhiEvent ? null : hashAnswer(answer),
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
        searchRoute: searchRoute ? String(searchRoute).slice(0, 80) : null,
        promptVersion: promptVersion ? String(promptVersion).slice(0, 80) : null,
        modelVersion: modelVersion ? String(modelVersion).slice(0, 80) : null,
        knowledgeVersion: knowledgeVersion ? String(knowledgeVersion).slice(0, 80) : null,
        sourceRefs: Array.isArray(sourceRefs)
          ? [...new Set(sourceRefs.map((value) => String(value || "").trim()).filter(Boolean))].slice(0, 8)
          : [],
        retrievalScore: Number.isFinite(Number(retrievalScore))
          ? Math.min(Math.max(Number(retrievalScore), 0), 1)
          : null,
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

export async function recordAiSearchFeedback({
  eventId,
  rating,
  tags = [],
  query = "",
  answer = "",
} = {}) {
  if (feedbackLoggingDisabled) return { ok: false, reason: "disabled" };
  if (!canUseAiSearchEventModel()) return { ok: false, reason: "unavailable" };

  const safeEventId = String(eventId || "").trim();
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(safeEventId)) {
    return { ok: false, reason: "invalid_event" };
  }
  if (!ALLOWED_FEEDBACK_RATINGS.has(rating)) {
    return { ok: false, reason: "invalid_rating" };
  }

  try {
    const event = await prisma.aiSearchEvent.findUnique({
      where: { id: safeEventId },
      select: {
        id: true,
        queryHash: true,
        answerHash: true,
        phiCategories: true,
      },
    });
    if (!event) return { ok: false, reason: "not_found" };

    const snapshotUpdate = buildFeedbackSnapshotUpdate({
      event,
      rating,
      query,
      answer,
    });
    const result = await prisma.aiSearchEvent.updateMany({
      where: { id: safeEventId },
      data: {
        feedbackRating: rating,
        feedbackTags: tags,
        feedbackCreatedAt: new Date(),
        ...snapshotUpdate,
      },
    });
    if (result.count !== 1) return { ok: false, reason: "not_found" };

    return {
      ok: true,
      snapshotStatus: snapshotUpdate.feedbackSnapshotStatus,
    };
  } catch (error) {
    if (isMissingAnalyticsTableError(error)) {
      feedbackLoggingDisabled = true;
    } else {
      console.error("AI search feedback logging skipped:", error?.message || error);
    }
    return { ok: false, reason: "unavailable" };
  }
}
