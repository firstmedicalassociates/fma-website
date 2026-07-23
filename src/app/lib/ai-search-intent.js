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
    /\b(billing|bill|payment|pay|invoice|cost|price|prices|pricing|rate|rates|cash|fee|fees|charge|charges|charged|copay|self-pay|self pay)\b/;
  const policyPattern =
    /\b(polic(?:y|ies)|rules?|requirements?|no[-\s]?shows?|missed appointments?|grace period|late arrivals?|arriv(?:e|al|ing)|same[-\s]?day cancellations?|cancell?(?:ation|ations|ed|ing)?|reschedul(?:e|ed|ing)|do(?:n't| not)\s+show(?:\s+up)?|fail(?:ed|ing)?\s+to\s+show|attendance|fmla|disability forms?|glp[-\s]?1|wegovy|zepbound|ozempic|mounjaro|weight loss medications?|prior authorizations?)\b/;
  const gracePolicyScenarioPattern =
    /\b(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten)[-\s]+minutes?\s+grace\b|\bnew patients?\b.{0,30}\bgrace\b|\bgrace\b.{0,30}\bnew patients?\b/;
  const lateArrivalScenarioPattern =
    /\b(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|twenty|thirty)\s+minutes?\s+late\b|\b(?:forgot|forgotten|miss|missed|missing)\b.{0,40}\b(?:appointment|appt|visit)\b|\b(?:haven't|hasn't|hadn't|have not|has not|not)\s+been\s+seen\b.{0,40}\b(?:\d+|one|two|three|four|five)\s+(?:years?|months?)\b|\b(?:am i|are they|would i be|will i be|considered|count(?:ed)? as)\b.{0,40}\bnew patient\b/;
  const medicationPolicyScenarioPattern =
    /\b(?:temporary|one[-\s]?time|30[-\s]?day|bridge)\b.{0,80}\b(?:refill|prescription)\b|\b(?:refill|prescription)\b.{0,80}\b(?:finding|transition(?:ing)? to)\b.{0,30}\b(?:a\s+)?specialist\b/;
  const hoursPattern =
    /\b(office|offices|clinic|clinics|location|locations)\b.{0,50}\b(hours|open|closed|close|weekends?|saturday|sunday|24\/?7|always open|after hours|midnight|overnight)\b|\b(hours|open|closed|close|weekends?|saturday|sunday|24\/?7|always open|after hours|midnight|overnight)\b.{0,50}\b(office|offices|clinic|clinics|location|locations)\b|\b(?:see|reach|call|contact|phone)\b.{0,35}\b(?:(?:a\s+)?(?:provider|doctor|fma)\b.{0,20}\b24\/?7|after hours|midnight|overnight)\b/;
  const serviceScopePattern =
    /\b(walk[-\s]?ins?|walk(?:ing)? into|without an appointment|urgent care (?:center|clinic)|vaccines?|vaccinations?|immunizations?|flu shots?|tetanus boosters?|treat children|see children|pediatrics?|minimum patient age|minimum age|under 18|1[0-7][-\s]?year[-\s]?old)\b|\bneed\b.{0,25}\bappointment\b.{0,35}\bsame[-\s]?day\b|\bsame[-\s]?day\b.{0,40}\b(guaranteed|guarantee|always available|definite|definitely)\b|\b(?:two|2)\s+hours?\b.{0,30}\bnotice\b|\bnotice\b.{0,30}\b(?:two|2)\s+hours?\b|\b(?:call|contact|notify)\b.{0,30}\b(?:two|2)\s+hours?\b.{0,40}\bsame[-\s]?day\b|\bsame[-\s]?day\b.{0,40}\b(?:call|contact|notify)\b.{0,30}\b(?:two|2)\s+hours?\b|\b(schedule|book|appointment|visit|clinic|office|fma)\b.{0,50}\bemergenc(?:y|ies)\b|\bemergenc(?:y|ies)\b.{0,50}\b(schedule|book|appointment|visit|clinic|office|fma)\b/;
  const explicitInsurancePattern =
    /\b(insurance|cigna|unitedhealthcare|united healthcare|uhc|medicare|medicaid|aetna|carefirst|blue cross|blue choice|humana|johns hopkins health|kaiser|tricare|oscar|magellan|beacon)\b/;
  const locationFacilityPattern =
    /\b(all|every|each)\b.{0,30}\b(office|offices|clinic|clinics|location|locations)\b.{0,30}\b(labs?|laborator(?:y|ies))\b|\b(labs?|laborator(?:y|ies))\b.{0,30}\b(all|every|each|on site|onsite)\b.{0,30}\b(office|offices|clinic|clinics|location|locations)\b/;

  // Policy and billing language must win over generic appointment vocabulary.
  // Otherwise phrases such as "no-show fee for my scheduled appointment" are
  // incorrectly sent to the live appointment-availability route.
  if (has(billingPattern, normalized)) {
    return { intent: AI_SEARCH_INTENTS.BILLING_QUESTION, confidence: "high", phiCategories: [] };
  }

  if (
    has(policyPattern, normalized) ||
    has(gracePolicyScenarioPattern, normalized) ||
    has(lateArrivalScenarioPattern, normalized) ||
    has(medicationPolicyScenarioPattern, normalized)
  ) {
    return { intent: AI_SEARCH_INTENTS.POLICY_QUESTION, confidence: "high", phiCategories: [] };
  }

  if (has(explicitInsurancePattern, normalized)) {
    return { intent: AI_SEARCH_INTENTS.INSURANCE_QUESTION, confidence: "high", phiCategories: [] };
  }

  if (
    has(/\b(fax|email address|main email|contact email|main phone|main telephone)\b/, normalized) &&
    !has(/\b(encrypted|medical|records?|fee|cost|price)\b/, normalized)
  ) {
    return { intent: AI_SEARCH_INTENTS.CONTACT_QUESTION, confidence: "high", phiCategories: [] };
  }

  if (has(/\b(ceo|chief executive|chief executive officer)\b/, normalized)) {
    return { intent: AI_SEARCH_INTENTS.CONTACT_QUESTION, confidence: "high", phiCategories: [] };
  }

  if (has(hoursPattern, normalized)) {
    return { intent: AI_SEARCH_INTENTS.LOCATION_QUESTION, confidence: "high", phiCategories: [] };
  }

  if (has(locationFacilityPattern, normalized)) {
    return { intent: AI_SEARCH_INTENTS.LOCATION_QUESTION, confidence: "high", phiCategories: [] };
  }

  if (has(serviceScopePattern, normalized)) {
    return { intent: AI_SEARCH_INTENTS.SERVICE_QUESTION, confidence: "high", phiCategories: [] };
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
