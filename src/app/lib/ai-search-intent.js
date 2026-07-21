import { getPhiRisk, normalizePublicSearchQuery } from "./no-phi-guard.js";
import { AI_SEARCH_PATTERNS } from "./ai-search-vocabulary.js";

export const AI_SEARCH_INTENTS = Object.freeze({
  APPOINTMENT_AVAILABILITY: "appointment_availability",
  BOOKING_HELP: "booking_help",
  PROVIDER_SEARCH: "provider_search",
  SERVICE_QUESTION: "service_question",
  LOCATION_QUESTION: "location_question",
  INSURANCE_QUESTION: "insurance_question",
  BILLING_QUESTION: "billing_question",
  POLICY_QUESTION: "policy_question",
  PATIENT_RESOURCES: "patient_resources",
  CONTACT_QUESTION: "contact_question",
  PRIVACY_BLOCKED: "privacy_blocked",
  UNKNOWN: "unknown",
});

function has(pattern, value) {
  pattern.lastIndex = 0;
  return pattern.test(value);
}

export function classifyAiSearchIntent(query = "", options = {}) {
  const normalized = normalizePublicSearchQuery(query).toLowerCase();
  const phiRisk = options.phiRisk || getPhiRisk(normalized);

  if (options.hasPotentialPhi === true || phiRisk.hasPotentialPhi) {
    return {
      intent: AI_SEARCH_INTENTS.PRIVACY_BLOCKED,
      confidence: "high",
      phiCategories: phiRisk.categories || [],
    };
  }

  if (!normalized) {
    return { intent: AI_SEARCH_INTENTS.UNKNOWN, confidence: "low", phiCategories: [] };
  }

  const providerAppointmentPattern = AI_SEARCH_PATTERNS.providerAppointment;
  const appointmentPattern =
    /\b(schedules?|next\s+week|this\s+week|book\s+with|when\s+can\s+i\s+see|can\s+i\s+(?:see|visit|book|schedule)|see\s+(?:a\s+)?(?:doctor|provider|physician|clinician)|visit\s+(?:a\s+)?(?:doctor|provider|physician|clinician))\b/i;
  const bookingHelpPattern =
    /\b(how|where|can|could)\b.{0,40}\b(book|schedule|make)\b.{0,40}\b(appointment|appt|visit)\b|\b(book|schedule)\s+(?:an?\s+)?(?:appointment|appt)\b/;
  const billingPattern =
    /\b(billing|bill|payment|pay|invoice|cost|fee|fees|charge|charges|charged|copay|self-pay|self pay)\b/;
  const policyPattern =
    /\b(polic(?:y|ies)|rules?|requirements?|no[-\s]?shows?|missed appointments?|grace period|late arrivals?|arriv(?:e|al|ing)|same[-\s]?day cancellations?|cancell?(?:ation|ations|ed|ing)?|reschedul(?:e|ed|ing)|do(?:n't| not)\s+show(?:\s+up)?|fail(?:ed|ing)?\s+to\s+show|attendance)\b/;

  // Policy and billing language must win over generic appointment vocabulary.
  // Otherwise phrases such as "no-show fee for my scheduled appointment" are
  // incorrectly sent to the live appointment-availability route.
  if (has(billingPattern, normalized)) {
    return { intent: AI_SEARCH_INTENTS.BILLING_QUESTION, confidence: "high", phiCategories: [] };
  }

  if (has(policyPattern, normalized)) {
    return { intent: AI_SEARCH_INTENTS.POLICY_QUESTION, confidence: "high", phiCategories: [] };
  }

  if (has(providerAppointmentPattern, normalized)) {
    return { intent: AI_SEARCH_INTENTS.APPOINTMENT_AVAILABILITY, confidence: "high", phiCategories: [] };
  }

  if (has(/\b(what|which|list|show)\b.{0,40}\bservices?\b|\bservices?\b.{0,30}\b(available|offered|offer|provide|provided)\b/, normalized)) {
    return { intent: AI_SEARCH_INTENTS.SERVICE_QUESTION, confidence: "high", phiCategories: [] };
  }

  if (has(/\b(what|which|show|list)\b.{0,40}\blocations?\b|\blocations?\b.{0,30}\b(available|near|located|open)\b/, normalized)) {
    return { intent: AI_SEARCH_INTENTS.LOCATION_QUESTION, confidence: "high", phiCategories: [] };
  }

  if (has(/\b(what|which)\b.{0,40}\binsurance\b|\binsurance\b.{0,30}\b(accept|accepted|available|take)\b/, normalized)) {
    return { intent: AI_SEARCH_INTENTS.INSURANCE_QUESTION, confidence: "high", phiCategories: [] };
  }

  if (
    has(AI_SEARCH_PATTERNS.appointmentTerm, normalized) ||
    has(AI_SEARCH_PATTERNS.fastAppointment, normalized) ||
    has(appointmentPattern, normalized)
  ) {
    const bookingOnly =
      has(bookingHelpPattern, normalized) &&
      !/\b(available|availability|availabilities|openings?|slots?|times?|soonest|earliest|today|tomorrow|next\s+week|this\s+week|mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b/.test(
        normalized
      );
    return {
      intent: bookingOnly ? AI_SEARCH_INTENTS.BOOKING_HELP : AI_SEARCH_INTENTS.APPOINTMENT_AVAILABILITY,
      confidence: bookingOnly ? "medium" : "high",
      phiCategories: [],
    };
  }

  if (
    has(/\b(who|speaks?|language|tell me about|learn more about|bio|biography|profile|credentials|specialt(?:y|ies)|provider|providers|doctor|doctors|physician|physicians|clinician|clinicians|pa|np|nurse practitioner|accepting new patients)\b/, normalized)
  ) {
    return { intent: AI_SEARCH_INTENTS.PROVIDER_SEARCH, confidence: "high", phiCategories: [] };
  }

  if (has(/\b(location|locations|located|office|offices|address|directions|hours|parking|near|city)\b/, normalized)) {
    return { intent: AI_SEARCH_INTENTS.LOCATION_QUESTION, confidence: "high", phiCategories: [] };
  }

  if (has(/\b(service|services|primary care|same-day|same day|telehealth|telemedicine|physical|wellness)\b/, normalized)) {
    return { intent: AI_SEARCH_INTENTS.SERVICE_QUESTION, confidence: "high", phiCategories: [] };
  }

  if (has(/\b(insurance|medicare|medicaid|payer|coverage|accept|accepted|copay|self-pay|self pay)\b/, normalized)) {
    return { intent: AI_SEARCH_INTENTS.INSURANCE_QUESTION, confidence: "high", phiCategories: [] };
  }

  if (has(/\b(portal|records|forms|medical records|hipaa|privacy|resources)\b/, normalized)) {
    return { intent: AI_SEARCH_INTENTS.PATIENT_RESOURCES, confidence: "medium", phiCategories: [] };
  }

  if (has(/\b(contact|phone|email|fax|call)\b/, normalized)) {
    return { intent: AI_SEARCH_INTENTS.CONTACT_QUESTION, confidence: "medium", phiCategories: [] };
  }

  return { intent: AI_SEARCH_INTENTS.UNKNOWN, confidence: "low", phiCategories: [] };
}

export function toLegacyAiSearchIntent(intent = "") {
  if (intent === AI_SEARCH_INTENTS.APPOINTMENT_AVAILABILITY || intent === AI_SEARCH_INTENTS.BOOKING_HELP) {
    return "appointment";
  }
  if (intent === AI_SEARCH_INTENTS.PROVIDER_SEARCH) return "provider";
  if (intent === AI_SEARCH_INTENTS.SERVICE_QUESTION) return "service";
  if (intent === AI_SEARCH_INTENTS.LOCATION_QUESTION) return "location";
  if (intent === AI_SEARCH_INTENTS.INSURANCE_QUESTION) return "insurance";
  if (intent === AI_SEARCH_INTENTS.BILLING_QUESTION) return "billing";
  if (intent === AI_SEARCH_INTENTS.POLICY_QUESTION) return "policy";
  if (intent === AI_SEARCH_INTENTS.PATIENT_RESOURCES) return "patient_resources";
  if (intent === AI_SEARCH_INTENTS.CONTACT_QUESTION) return "contact";
  if (intent === AI_SEARCH_INTENTS.PRIVACY_BLOCKED) return "privacy_blocked";
  return "general";
}
