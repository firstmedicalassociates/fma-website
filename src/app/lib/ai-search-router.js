import { AI_SEARCH_INTENTS } from "./ai-search-intent.js";

export const AI_SEARCH_ROUTES = Object.freeze({
  APPOINTMENT_AVAILABILITY: "appointment_availability",
  PROVIDER_SEARCH: "provider_search",
  LOCATION_SEARCH: "location_search",
  SERVICE_SEARCH: "service_search",
  GENERAL_FMA_ANSWER: "general_fma_answer",
  BLOCKED: "blocked",
});

export function isAppointmentAvailabilityIntent(intent = "") {
  return intent === AI_SEARCH_INTENTS.APPOINTMENT_AVAILABILITY;
}

export function buildAiSearchRoute({ intent = "", appointmentRouteRequired = false } = {}) {
  if (intent === AI_SEARCH_INTENTS.PRIVACY_BLOCKED) {
    return {
      route: AI_SEARCH_ROUTES.BLOCKED,
      reason: "privacy_blocked",
      allowGenericFallback: false,
    };
  }

  if (appointmentRouteRequired || isAppointmentAvailabilityIntent(intent)) {
    return {
      route: AI_SEARCH_ROUTES.APPOINTMENT_AVAILABILITY,
      reason: appointmentRouteRequired ? "appointment_signal" : "appointment_intent",
      allowGenericFallback: false,
    };
  }

  if (intent === AI_SEARCH_INTENTS.PROVIDER_SEARCH) {
    return {
      route: AI_SEARCH_ROUTES.PROVIDER_SEARCH,
      reason: "provider_intent",
      allowGenericFallback: true,
    };
  }

  if (intent === AI_SEARCH_INTENTS.LOCATION_QUESTION) {
    return {
      route: AI_SEARCH_ROUTES.LOCATION_SEARCH,
      reason: "location_intent",
      allowGenericFallback: true,
    };
  }

  if (intent === AI_SEARCH_INTENTS.SERVICE_QUESTION) {
    return {
      route: AI_SEARCH_ROUTES.SERVICE_SEARCH,
      reason: "service_intent",
      allowGenericFallback: true,
    };
  }

  return {
    route: AI_SEARCH_ROUTES.GENERAL_FMA_ANSWER,
    reason: "general_intent",
    allowGenericFallback: true,
  };
}
