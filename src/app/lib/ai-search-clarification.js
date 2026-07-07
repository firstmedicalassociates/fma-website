import { prisma } from "./prisma.js";
import { AI_SEARCH_INTENTS } from "./ai-search-intent.js";

const PROVIDER_STOPWORDS = new Set([
  "about",
  "appointment",
  "appointments",
  "available",
  "availability",
  "availabilities",
  "book",
  "can",
  "could",
  "doctor",
  "does",
  "dr",
  "find",
  "have",
  "i",
  "me",
  "near",
  "open",
  "openings",
  "provider",
  "schedule",
  "see",
  "show",
  "slots",
  "tell",
  "times",
  "visit",
  "what",
  "when",
  "where",
  "which",
  "with",
]);

const DATE_OR_RANGE_PATTERN =
  /\b(today|tomorrow|this\s+week|next\s+week|next\s+\d{1,3}\s+days?|mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?|\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?|jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i;
const LOCATION_PATTERN =
  /\b(germantown|german town|gaithersburg|rockville|columbia|bowie|nottingham|frederick|annapolis|silver spring|crofton|greenbelt|laurel|lutherville|glen burnie)\b/i;
const FAST_APPOINTMENT_PATTERN = /\b(first available|quickest|earliest|soonest|asap|next available)\b/i;
const VAGUE_APPOINTMENT_PATTERN =
  /\b(what|which|show|list)\b.{0,35}\b(times?|appointments?|openings?|slots?|availability|availabilities)\b/i;

function normalizeText(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function compactText(value = "") {
  return normalizeText(value).replace(/\s+/g, "");
}

function getQueryTokens(query = "") {
  return normalizeText(query)
    .split(/\s+/)
    .filter((token) => token.length > 1 && !PROVIDER_STOPWORDS.has(token));
}

function getProviderTokens(provider = {}) {
  return normalizeText(provider.name)
    .split(/\s+/)
    .filter((token) => token.length > 1 && !["c", "d", "do", "fnp", "m", "md", "np", "pa"].includes(token));
}

function isNearTokenMatch(queryToken, providerToken) {
  if (!queryToken || !providerToken) return false;
  if (queryToken === providerToken) return true;
  if (
    queryToken.length >= 4 &&
    providerToken.length >= 4 &&
    (providerToken.startsWith(queryToken) || queryToken.startsWith(providerToken))
  ) {
    return true;
  }

  if (queryToken.length < 5 || providerToken.length < 5) return false;
  if (Math.abs(queryToken.length - providerToken.length) > 1) return false;

  let edits = 0;
  let queryIndex = 0;
  let providerIndex = 0;
  while (queryIndex < queryToken.length && providerIndex < providerToken.length) {
    if (queryToken[queryIndex] === providerToken[providerIndex]) {
      queryIndex += 1;
      providerIndex += 1;
      continue;
    }

    edits += 1;
    if (edits > 1) return false;

    if (queryToken.length > providerToken.length) {
      queryIndex += 1;
    } else if (providerToken.length > queryToken.length) {
      providerIndex += 1;
    } else {
      queryIndex += 1;
      providerIndex += 1;
    }
  }

  return true;
}

function hasProviderSignal(queryTokens, providerTokens) {
  return providerTokens.some((providerToken) =>
    queryTokens.some((queryToken) => isNearTokenMatch(queryToken, providerToken))
  );
}

function scoreProviderMatch(query, queryTokens, provider) {
  const compactQuery = compactText(query);
  const compactProviderName = compactText(provider.name);
  const providerTokens = getProviderTokens(provider);
  const firstName = providerTokens[0] || "";
  const lastName = providerTokens[providerTokens.length - 1] || "";
  const firstNameMatched = firstName
    ? queryTokens.some((token) => isNearTokenMatch(token, firstName))
    : false;
  const lastNameMatched = lastName
    ? queryTokens.some((token) => isNearTokenMatch(token, lastName))
    : false;
  const tokenMatches = providerTokens.filter((providerToken) =>
    queryTokens.some((queryToken) => isNearTokenMatch(queryToken, providerToken))
  ).length;

  let score = 0;
  if (compactProviderName.length >= 5 && compactQuery.includes(compactProviderName)) score = 220;
  if (firstNameMatched && lastNameMatched) score = Math.max(score, 180);
  if (lastNameMatched) score = Math.max(score, 120);
  if (firstNameMatched) score = Math.max(score, 90);
  if (tokenMatches >= 2) score = Math.max(score, 110 + tokenMatches * 20);

  return {
    provider,
    score,
    tokenMatches,
    providerTokens,
  };
}

async function findProviderClarification(query, intent) {
  const queryTokens = getQueryTokens(query);
  if (queryTokens.length === 0) return null;

  const providers = await prisma.provider.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      name: true,
      slug: true,
      title: true,
      locations: true,
    },
  });

  const scored = providers
    .map((provider) => scoreProviderMatch(query, queryTokens, provider))
    .filter((match) => match.score >= 90 && hasProviderSignal(queryTokens, match.providerTokens))
    .sort((first, second) => {
      if (second.score !== first.score) return second.score - first.score;
      return first.provider.name.localeCompare(second.provider.name, undefined, { sensitivity: "base" });
    });

  if (scored.length < 2) return null;
  if (scored[0].score >= 200 && scored[0].score - scored[1].score > 30) return null;

  const topScore = scored[0].score;
  const choices = scored
    .filter((match) => topScore - match.score <= 45)
    .slice(0, 4)
    .map(({ provider }) => {
      const appointmentIntent = intent === AI_SEARCH_INTENTS.APPOINTMENT_AVAILABILITY;
      return {
        type: "query",
        label: provider.name,
        value: provider.slug,
        description: [provider.title, Array.isArray(provider.locations) ? provider.locations[0] : ""]
          .filter(Boolean)
          .join(" | "),
        query: appointmentIntent
          ? `${query} ${provider.name}`
          : `tell me about ${provider.name}`,
      };
    });

  if (choices.length < 2) return null;

  return {
    type: "provider",
    question: "Which provider did you mean?",
    pendingIntent: intent || AI_SEARCH_INTENTS.UNKNOWN,
    choices,
  };
}

function hasDateLocationOrFastSignal(query) {
  return (
    DATE_OR_RANGE_PATTERN.test(query) ||
    LOCATION_PATTERN.test(query) ||
    FAST_APPOINTMENT_PATTERN.test(query)
  );
}

function buildVagueAppointmentClarification(query, intent) {
  if (intent !== AI_SEARCH_INTENTS.APPOINTMENT_AVAILABILITY) return null;
  if (!VAGUE_APPOINTMENT_PATTERN.test(query)) return null;
  if (hasDateLocationOrFastSignal(query)) return null;
  if (getQueryTokens(query).length >= 2) return null;

  return {
    type: "appointment_scope",
    question: "What appointment search should I run?",
    pendingIntent: intent,
    choices: [
      {
        type: "query",
        label: "First available",
        value: "first_available",
        description: "Search all locations for the soonest online times.",
        query: "show first available appointments",
      },
      {
        type: "query",
        label: "Today",
        value: "today",
        description: "Check online appointment times for today.",
        query: "show available appointments today",
      },
      {
        type: "query",
        label: "This week",
        value: "this_week",
        description: "Check online appointment times this week.",
        query: "show available appointments this week",
      },
      {
        type: "link",
        label: "Choose location",
        value: "locations",
        description: "Open the locations page.",
        href: "/locations",
      },
    ],
  };
}

export async function buildAiSearchClarification(query = "", options = {}) {
  const intent = options.intent || AI_SEARCH_INTENTS.UNKNOWN;
  const providerClarification = await findProviderClarification(query, intent);
  if (providerClarification) return providerClarification;

  return buildVagueAppointmentClarification(query, intent);
}
