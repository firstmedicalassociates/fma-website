export const AI_SEARCH_VOCABULARY = Object.freeze({
  appointment: [
    "appointment",
    "appointments",
    "appt",
    "appts",
    "availability",
    "availabilities",
    "available",
    "opening",
    "openings",
    "slot",
    "slots",
    "time",
    "times",
  ],
  provider: [
    "doctor",
    "doctors",
    "dr",
    "provider",
    "providers",
    "clinician",
    "clinicians",
    "physician",
    "physicians",
  ],
  booking: [
    "book",
    "booking",
    "schedule",
    "scheduling",
    "see",
    "visit",
  ],
  fastAppointment: [
    "quick",
    "quickest",
    "fast",
    "fastest",
    "earliest",
    "soonest",
    "asap",
    "first available",
  ],
  globalAppointment: [
    "first available",
    "any doctor",
    "any provider",
    "any clinician",
    "all locations",
    "all providers",
    "all doctors",
    "soonest",
    "earliest",
    "quickest",
    "asap",
    "who has openings",
    "who has opening",
    "who is available",
    "show available appointments",
    "available appointments",
    "available appts",
    "available times",
    "openings today",
    "openings tomorrow",
  ],
  locationAliases: [
    "germantown",
    "german town",
    "gaithersburg",
    "rockville",
    "columbia",
    "bowie",
    "nottingham",
    "frederick",
    "annapolis",
    "silver spring",
    "crofton",
    "greenbelt",
    "laurel",
    "lutherville",
    "glen burnie",
  ],
});

export const AI_SEARCH_CORE_STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "any",
  "are",
  "at",
  "can",
  "could",
  "do",
  "does",
  "for",
  "from",
  "get",
  "give",
  "have",
  "how",
  "i",
  "in",
  "is",
  "list",
  "me",
  "near",
  "need",
  "of",
  "on",
  "or",
  "please",
  "show",
  "the",
  "there",
  "to",
  "want",
  "what",
  "when",
  "where",
  "which",
  "who",
  "with",
  "you",
  ...AI_SEARCH_VOCABULARY.appointment,
  ...AI_SEARCH_VOCABULARY.provider,
  ...AI_SEARCH_VOCABULARY.booking,
  ...AI_SEARCH_VOCABULARY.fastAppointment,
  ...AI_SEARCH_VOCABULARY.locationAliases,
  "today",
  "tomorrow",
  "week",
  "weekly",
  "month",
  "monthly",
  "jan",
  "january",
  "feb",
  "february",
  "mar",
  "march",
  "apr",
  "april",
  "may",
  "jun",
  "june",
  "jul",
  "july",
  "aug",
  "august",
  "sep",
  "sept",
  "september",
  "oct",
  "october",
  "nov",
  "november",
  "dec",
  "december",
]);

function escapeRegExp(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function normalizeSearchText(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function compactSearchText(value = "") {
  return normalizeSearchText(value).replace(/\s+/g, "");
}

export function tokenizeSearchText(value = "", options = {}) {
  const stopwords = options.stopwords || AI_SEARCH_CORE_STOPWORDS;
  return normalizeSearchText(value)
    .split(/\s+/)
    .filter((token) => token.length > 2 && !stopwords.has(token));
}

export function buildVocabularyPattern(terms = []) {
  const body = [...new Set(terms)]
    .filter(Boolean)
    .sort((first, second) => second.length - first.length)
    .map((term) => escapeRegExp(term).replace(/\s+/g, "\\s+"))
    .join("|");

  return new RegExp(`\\b(?:${body})\\b`, "i");
}

export const AI_SEARCH_PATTERNS = Object.freeze({
  appointmentTerm: buildVocabularyPattern(AI_SEARCH_VOCABULARY.appointment),
  providerTerm: buildVocabularyPattern(AI_SEARCH_VOCABULARY.provider),
  bookingTerm: buildVocabularyPattern(AI_SEARCH_VOCABULARY.booking),
  fastAppointment: buildVocabularyPattern(AI_SEARCH_VOCABULARY.fastAppointment),
  globalAppointment: buildVocabularyPattern(AI_SEARCH_VOCABULARY.globalAppointment),
  locationAlias: buildVocabularyPattern(AI_SEARCH_VOCABULARY.locationAliases),
  providerSearch:
    /\b(who|find|tell me about|learn more about|bio|biography|profile|doctor|doctors|provider|providers|physician|physicians|clinician|clinicians|speaks?|language|near|at|in|accepting|taking|appointments?|appts?|availability|times?|openings?)\b/i,
  providerAppointment:
    /\b(?:what|which)\s+(?:available\s+)?(?:times?|appointments?|appts?|openings?|slots?|availabilit(?:y|ies))\s+(?:does|do)\s+(?!(?:you|fma|first medical|first medical associates|office|clinic|location|locations)\b)[a-z0-9 .'-]+\s+(?:have|show|offer|take|accept)\b|\b(?:appointments?|appts?|openings?|slots?)\b.{0,30}\b(?:for|with)\s+(?!(?:you|fma|first medical|first medical associates|office|clinic|location|locations)\b)[a-z0-9 .'-]+\b/i,
});

export function hasVocabularySignal(pattern, value = "") {
  pattern.lastIndex = 0;
  return pattern.test(String(value || ""));
}
