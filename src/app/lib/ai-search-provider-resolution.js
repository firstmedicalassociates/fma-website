import {
  AI_SEARCH_CORE_STOPWORDS,
  compactSearchText,
  normalizeSearchText,
} from "./ai-search-vocabulary.js";

const PROVIDER_CREDENTIAL_STOPWORDS = new Set(["c", "d", "do", "fnp", "m", "md", "np", "pa", "pac"]);
const PROVIDER_INTENT_STOPWORDS = new Set([
  ...AI_SEARCH_CORE_STOPWORDS,
  "about",
  "anything",
  "bio",
  "biography",
  "care",
  "education",
  "fma",
  "free",
  "hours",
  "info",
  "information",
  "insurance",
  "learn",
  "location",
  "locations",
  "more",
  "next",
  "office",
  "primary",
  "profile",
  "resource",
  "resources",
  "service",
  "services",
  "specializes",
  "specialty",
  "something",
  "visits",
  "why",
]);

export function getProviderIntentTokens(query = "") {
  return normalizeSearchText(query)
    .split(/\s+/)
    .filter((token) => token.length > 2 && !PROVIDER_INTENT_STOPWORDS.has(token));
}

export function isNearProviderTokenMatch(queryToken = "", providerToken = "") {
  if (!queryToken || !providerToken) return false;
  if (queryToken === providerToken) return true;
  if (
    queryToken.length >= 4 &&
    providerToken.length >= 4 &&
    (providerToken.startsWith(queryToken) || queryToken.startsWith(providerToken))
  ) {
    return true;
  }

  if (queryToken.length < 4 || providerToken.length < 4) return false;
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

export function queryHasProviderToken(queryTokens = [], providerToken = "") {
  return queryTokens.some((queryToken) => isNearProviderTokenMatch(queryToken, providerToken));
}

function getProviderRecord(item = {}) {
  return item.provider || item;
}

function getProviderAliases(item = {}) {
  const provider = getProviderRecord(item);
  return [
    provider.name,
    provider.athenaSchedulingName,
    provider.schedulingName,
    provider.schedulingname,
    provider.displayname,
  ].filter(Boolean);
}

function getProviderNameTokens(provider = {}) {
  return normalizeSearchText(provider.name)
    .split(/\s+/)
    .filter(Boolean);
}

export function buildProviderResolverEntries(items = []) {
  const providers = items.map(getProviderRecord);
  const firstNameCounts = new Map();
  const lastNameCounts = new Map();

  for (const provider of providers) {
    const nameTokens = getProviderNameTokens(provider);
    const firstName = nameTokens[0] || "";
    const lastName = nameTokens[nameTokens.length - 1] || "";
    if (firstName) firstNameCounts.set(firstName, (firstNameCounts.get(firstName) || 0) + 1);
    if (lastName) lastNameCounts.set(lastName, (lastNameCounts.get(lastName) || 0) + 1);
  }

  return items
    .map((item) => {
      const provider = getProviderRecord(item);
      const aliases = getProviderAliases(item);
      const nameTokens = getProviderNameTokens(provider);
      const tokens = [
        ...new Set(
          aliases
            .flatMap((value) => normalizeSearchText(value).split(/\s+/))
            .filter((token) => token.length > 1 && !PROVIDER_CREDENTIAL_STOPWORDS.has(token))
        ),
      ];
      const keys = aliases.map((value) => compactSearchText(value)).filter(Boolean);
      const firstName = nameTokens[0] || "";
      const lastName = nameTokens[nameTokens.length - 1] || "";

      return {
        item,
        provider,
        key: keys[0] || "",
        keys,
        tokens,
        firstName,
        lastName,
        firstNameUnique: Boolean(firstName && firstNameCounts.get(firstName) === 1),
        lastNameUnique: Boolean(lastName && lastNameCounts.get(lastName) === 1),
      };
    })
    .filter((entry) => entry.keys.length > 0 && entry.tokens.length > 0);
}

export function getProviderCandidate(entry = {}, fallbackScore = 0) {
  const provider = entry.provider || {};
  return {
    name: provider.name || "",
    slug: provider.slug || "",
    title: provider.title || "",
    locations: Array.isArray(provider.locations) ? provider.locations.slice(0, 2) : [],
    score: Number(entry.score || fallbackScore || 0),
    provider,
  };
}

function scoreProviderEntry(entry, queryTokens, compactQuery) {
  const tokenMatchCount = entry.tokens.filter((token) => queryHasProviderToken(queryTokens, token)).length;
  const firstNameMatched = entry.firstName ? queryHasProviderToken(queryTokens, entry.firstName) : false;
  const lastNameMatched = entry.lastName ? queryHasProviderToken(queryTokens, entry.lastName) : false;
  let score = 0;

  if (entry.keys.some((key) => key.length >= 5 && compactQuery.includes(key))) {
    score = Math.max(score, 170);
  }
  if (firstNameMatched && lastNameMatched) score = Math.max(score, 150);
  if (lastNameMatched && tokenMatchCount >= 2) score = Math.max(score, 132);
  if (lastNameMatched && entry.lastNameUnique) score = Math.max(score, 110);
  if (tokenMatchCount >= Math.min(3, entry.tokens.length)) score = Math.max(score, 118);
  if (firstNameMatched && entry.firstNameUnique && queryTokens.length <= 1) {
    score = Math.max(score, 92);
  }

  return {
    ...entry,
    score,
    firstNameMatched,
    lastNameMatched,
    tokenMatchCount,
  };
}

export function resolveProviderSearch(query = "", itemsOrEntries = [], options = {}) {
  const entries = options.entries ? itemsOrEntries : buildProviderResolverEntries(itemsOrEntries);
  const queryTokens = getProviderIntentTokens(query);
  const compactQuery = compactSearchText(query);
  const providerLikeQuery = queryTokens.length > 0;
  const scoredEntries =
    queryTokens.length === 0
      ? []
      : entries
          .map((entry) => scoreProviderEntry(entry, queryTokens, compactQuery))
          .filter((entry) => entry.score >= Number(options.minimumScore || 90))
          .sort((first, second) => {
            if (second.score !== first.score) return second.score - first.score;
            return String(first.provider.name || "").localeCompare(String(second.provider.name || ""));
          })
          .slice(0, Number(options.limit || 4));

  const resolvedEntries =
    scoredEntries.length === 1
      ? [scoredEntries[0]]
      : scoredEntries.length > 1 &&
          scoredEntries[0].score >= 130 &&
          scoredEntries[0].score - scoredEntries[1].score >= 35
        ? [scoredEntries[0]]
        : [];
  const candidates = scoredEntries.map((entry) => getProviderCandidate(entry));

  return {
    scope: resolvedEntries.length > 0 ? "provider" : "unknown",
    resolvedProviders: resolvedEntries.map((entry) => entry.provider),
    resolvedEntries,
    scoredEntries,
    providerCandidates: candidates,
    confidence:
      resolvedEntries.length > 0
        ? resolvedEntries[0].score >= 120
          ? "high"
          : "medium"
        : scoredEntries.length > 0
          ? "low"
          : "low",
    shouldAllowGlobalFallback: false,
    providerLikeQuery,
    monitoringCode:
      resolvedEntries.length > 0
        ? ""
        : scoredEntries.length > 1
          ? "provider_ambiguous"
          : providerLikeQuery
            ? "provider_like_unresolved"
            : "",
  };
}

export function queryMentionsKnownProvider(query = "", providerEntries = []) {
  const resolution = resolveProviderSearch(query, providerEntries, { entries: true, minimumScore: 90 });
  return resolution.resolvedProviders.length > 0 || resolution.providerCandidates.length > 0;
}
