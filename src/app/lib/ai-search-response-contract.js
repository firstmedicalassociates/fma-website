export const AI_SEARCH_RESPONSE_STATUS = Object.freeze({
  ANSWERED: "answered",
  NO_RESULTS: "no_results",
  NEEDS_INPUT: "needs_input",
  BLOCKED: "blocked",
  FAILED: "failed",
  UNAVAILABLE: "unavailable",
});

export function getAppointmentResponseStatus(availabilityStatus = "") {
  if (availabilityStatus === "open_slots_found") return AI_SEARCH_RESPONSE_STATUS.ANSWERED;
  if (availabilityStatus === "no_open_slots") return AI_SEARCH_RESPONSE_STATUS.NO_RESULTS;
  if (availabilityStatus === "provider_match_needed" || availabilityStatus === "appointment_scope_needed") {
    return AI_SEARCH_RESPONSE_STATUS.NEEDS_INPUT;
  }
  if (availabilityStatus === "unavailable") return AI_SEARCH_RESPONSE_STATUS.UNAVAILABLE;
  return AI_SEARCH_RESPONSE_STATUS.ANSWERED;
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

export function buildAiSearchResponse({
  ok = true,
  status = AI_SEARCH_RESPONSE_STATUS.ANSWERED,
  code = "",
  intent = "unknown",
  query = "",
  answer = "",
  error = "",
  sources = [],
  cards = [],
  appointmentOptions = [],
  providerMatches = [],
  locationMatches = [],
  recoveryActions = [],
  meta = {},
  confidence = 0,
  aiConfidence = "low",
  grounded = false,
  citations = [],
  disclaimer = false,
  resolution = null,
} = {}) {
  const safeCards = normalizeArray(cards);
  const appointmentMeta = meta?.appointment || meta?.appointmentMeta || null;

  return {
    ok: ok === true,
    status,
    code,
    intent,
    query,
    answer,
    error,
    sources: normalizeArray(sources),
    cards: safeCards,
    appointmentOptions: normalizeArray(appointmentOptions),
    providerMatches: normalizeArray(providerMatches),
    locationMatches: normalizeArray(locationMatches),
    recoveryActions: normalizeArray(recoveryActions),
    meta: meta && typeof meta === "object" ? meta : {},
    confidence: Number(confidence || 0),
    aiConfidence,
    grounded: grounded === true,
    citations: normalizeArray(citations),
    disclaimer: disclaimer === true,
    resolution,

    // Backward-compatible fields consumed by the existing API/UI.
    structuredCards: safeCards,
    appointmentMeta,
  };
}
