import { prisma } from "./prisma.js";
import { GENERAL_BOOK_APPOINTMENT_URL, normalizeInternalPageHref } from "./config/site.js";
import { VISIBLE_LOCATION_WHERE } from "./locations.js";
import {
  AI_SEARCH_CORE_STOPWORDS,
  AI_SEARCH_PATTERNS,
  compactSearchText,
  normalizeSearchText,
  tokenizeSearchText,
} from "./ai-search-vocabulary.js";
import {
  isNearProviderTokenMatch,
  resolveProviderSearch,
} from "./ai-search-provider-resolution.js";

const GRAPH_CACHE_TTL_MS = 5 * 60 * 1000;
const PROVIDER_RESULT_LIMIT = 6;
const SERVICE_CATALOG_LIMIT = 10;
const SOURCE_LIMIT = 3;
const TOKEN_STOPWORDS = new Set([
  ...AI_SEARCH_CORE_STOPWORDS,
  "care",
  "primary",
  "someone",
]);

let graphCache = null;

function normalizeText(value = "") {
  return normalizeSearchText(value);
}

function compactText(value = "") {
  return compactSearchText(value);
}

function textTokens(value = "") {
  return tokenizeSearchText(value, { stopwords: TOKEN_STOPWORDS });
}

function cleanPath(value = "") {
  const text = String(value || "").trim();
  if (!text) return "";
  if (/^https?:\/\//i.test(text)) return text;
  return `/${text.replace(/^\/+/, "")}`.replace(/\/{2,}/g, "/");
}

function normalizeLocationPath(value = "") {
  const path = cleanPath(value);
  if (!path || /^https?:\/\//i.test(path)) return path;
  const normalized = path.replace(/^\/+/, "");
  if (normalized.startsWith("location/")) return normalizeInternalPageHref(`/${normalized}`);
  if (normalized.startsWith("locations/")) {
    return normalizeInternalPageHref(`/${normalized.replace(/^locations\//, "location/")}`);
  }
  return normalizeInternalPageHref(`/location/${normalized}`);
}

function normalizeServicePath(value = "") {
  const path = cleanPath(value);
  if (!path || /^https?:\/\//i.test(path)) return path;
  const normalized = path.replace(/^\/+/, "");
  if (normalized.startsWith("service/")) return normalizeInternalPageHref(`/${normalized}`);
  if (normalized.startsWith("services/")) {
    return normalizeInternalPageHref(`/${normalized.replace(/^services\//, "service/")}`);
  }
  return normalizeInternalPageHref(`/service/${normalized}`);
}

function locationKey(value = "") {
  const path = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/[^/]+/i, "")
    .replace(/^\/+|\/+$/g, "");
  if (!path) return "";

  const parts = path.split("/").filter(Boolean);
  if (parts[0] === "location" || parts[0] === "locations") return parts[1] || "";
  return parts[0] || "";
}

function readableLocationFallback(value = "") {
  return String(value || "")
    .replace(/^\/?locations?\//i, "")
    .replace(/^\/+/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\bmd\b/gi, "MD")
    .trim();
}

function addAlias(index, alias, value) {
  const normalized = normalizeText(alias);
  if (!normalized || normalized.length < 3 || normalized === "md") return;
  const key = compactText(normalized);
  if (!key || key.length < 3) return;
  if (!index.has(key)) index.set(key, []);
  index.get(key).push(value);
}

function addLocationAliases(index, location) {
  const titleWithoutState = String(location.title || "").replace(/,\s*MD$/i, "");
  const slugPart = locationKey(location.slug);
  const aliases = [
    location.slug,
    slugPart,
    titleWithoutState,
    location.title,
    location.addressCity,
    `${location.addressCity || ""} ${location.addressState || ""}`,
  ];

  for (const alias of aliases) addAlias(index, alias, location);
}

function addServiceAliases(index, service) {
  const aliases = [
    service.slug,
    service.title,
    service.category,
    normalizeText(service.title).replace(/\s+and\s+/g, " "),
  ];

  if (normalizeText(service.title).includes("same day")) aliases.push("same day", "same-day");
  if (normalizeText(service.title).includes("primary care")) aliases.push("primary doctor", "pcp");
  if (normalizeText(service.title).includes("telehealth")) aliases.push("virtual visit", "online visit");

  for (const alias of aliases) addAlias(index, alias, service);
}

function dedupeBy(items = [], getKey = (item) => item?.id || item?.slug || item?.name) {
  const seen = new Set();
  const results = [];
  for (const item of items) {
    const key = getKey(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    results.push(item);
  }
  return results;
}

function matchAliases(query, aliasIndex) {
  const compactQuery = compactText(query);
  const matches = [];

  for (const [alias, values] of aliasIndex.entries()) {
    if (alias.length < 3 || !compactQuery.includes(alias)) continue;
    matches.push(...values);
  }

  return dedupeBy(matches);
}

function formatAddress(location = {}) {
  const address = location.displayAddress || location.address;
  const fallback = [location.addressCity, location.addressState].filter(Boolean).join(", ");
  return String(address || fallback || "")
    .replace(/\s*\n+\s*/g, ", ")
    .trim();
}

function formatLocationLabel(location = {}) {
  const address = formatAddress(location);
  return address ? `${location.title} (${address})` : location.title;
}

function resolveProviderLocations(provider, locationByAlias) {
  const values = Array.isArray(provider.locations) ? provider.locations : [];
  const resolved = values.map((value) => {
    const key = compactText(locationKey(value) || value);
    const directMatch = locationByAlias.get(key);
    if (directMatch) return directMatch;

    return {
      id: "",
      slug: normalizeLocationPath(value),
      title: readableLocationFallback(value),
      addressCity: readableLocationFallback(value),
      addressState: "",
      displayAddress: "",
      address: "",
      serviceIds: [],
      bookingUrl: "",
    };
  });

  return dedupeBy(resolved, (location) => location.slug || location.title);
}

function providerMatchesLanguage(provider, languages) {
  if (languages.length === 0) return [];
  const providerLanguages = Array.isArray(provider.languages) ? provider.languages : [];
  return languages.filter((language) =>
    providerLanguages.some((value) => normalizeText(value) === normalizeText(language))
  );
}

function providerMatchesLocation(provider, locations) {
  if (locations.length === 0) return [];
  const providerLocations = Array.isArray(provider.locationRecords) ? provider.locationRecords : [];
  const locationKeys = new Set(
    locations.flatMap((location) => [
      compactText(location.slug),
      compactText(locationKey(location.slug)),
      compactText(location.title),
      compactText(location.addressCity),
    ])
  );

  return providerLocations.filter((location) =>
    [location.slug, locationKey(location.slug), location.title, location.addressCity].some((value) =>
      locationKeys.has(compactText(value))
    )
  );
}

function isPrimaryCareService(service = {}) {
  return /\b(primary care|family medicine|pcp)\b/i.test(`${service.title || ""} ${service.category || ""}`);
}

function providerMatchesService(provider, services) {
  if (services.length === 0) return [];

  const providerText = normalizeText(`${provider.title} ${provider.bio}`);
  return services.filter((service) => {
    if (isPrimaryCareService(service)) return true;
    const serviceTokens = textTokens(`${service.title} ${service.category}`);
    return serviceTokens.some((token) => providerText.includes(token));
  });
}

function getProviderScore(provider, criteria) {
  let score = 0;
  const languageMatches = providerMatchesLanguage(provider, criteria.languages);
  const locationMatches = providerMatchesLocation(provider, criteria.locations);
  const serviceMatches = providerMatchesService(provider, criteria.services);

  const providerNameCompact = compactText(provider.name);
  const hasProviderNameMatch = providerNameCompact && compactText(criteria.query).includes(providerNameCompact);
  const queryTokens = textTokens(criteria.query);
  const providerNameTokens = textTokens(provider.name);
  const providerTokenMatches = providerNameTokens.filter((providerToken) =>
    queryTokens.some((queryToken) => isNearProviderTokenMatch(queryToken, providerToken))
  ).length;
  const hasNearProviderNameMatch =
    providerNameTokens.length > 0 && providerTokenMatches >= Math.min(2, providerNameTokens.length);
  const hasCriteria =
    criteria.languages.length > 0 ||
    criteria.locations.length > 0 ||
    criteria.services.length > 0 ||
    criteria.unsupportedCriteria.length > 0 ||
    criteria.asksAcceptingNewPatients;

  if (!hasProviderNameMatch && !hasNearProviderNameMatch && !hasCriteria) {
    return {
      score: 0,
      languageMatches,
      locationMatches,
      serviceMatches,
    };
  }

  if (hasProviderNameMatch) score += 160;
  if (hasNearProviderNameMatch) score += 132;
  if (criteria.languages.length > 0) score += languageMatches.length > 0 ? 60 : -1000;
  if (criteria.locations.length > 0) score += locationMatches.length > 0 ? 70 : -1000;
  if (criteria.services.length > 0) score += serviceMatches.length > 0 ? 35 : -1000;
  if (criteria.providerSearch) score += 20;
  if (score > 0 && provider.linkUrl) score += 4;

  return {
    score,
    languageMatches,
    locationMatches,
    serviceMatches,
  };
}

function detectsProviderSearch(query) {
  AI_SEARCH_PATTERNS.providerSearch.lastIndex = 0;
  return AI_SEARCH_PATTERNS.providerSearch.test(query);
}

function extractCriteria(query, graph) {
  const normalized = normalizeText(query);
  const languages = graph.languages.filter((language) =>
    compactText(normalized).includes(compactText(language))
  );
  const locations = matchAliases(query, graph.locationAliases);
  const services = matchAliases(query, graph.serviceAliases);
  const unsupportedCriteria = [];
  const asksServiceCatalog =
    /\b(what|which|list|show)\b.{0,40}\bservices?\b/i.test(query) ||
    /\bservices?\b.{0,30}\b(available|offered|offer|provide|provided)\b/i.test(query);

  if (/\b(female|male|woman doctor|women doctors|lady doctor|man doctor)\b/i.test(query)) {
    unsupportedCriteria.push("gender");
  }

  const asksAcceptingNewPatients =
    /\b(accepting|taking)\s+(?:new\s+)?patients\b|\bnew\s+patients\b/i.test(query);

  return {
    query,
    normalized,
    providerSearch: detectsProviderSearch(query),
    languages,
    locations,
    services,
    asksServiceCatalog,
    unsupportedCriteria,
    asksAcceptingNewPatients,
  };
}

async function buildDomainGraph() {
  const now = Date.now();
  if (graphCache?.expiresAt > now) return graphCache.value;

  const [providers, locations, services] = await Promise.all([
    prisma.provider.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        title: true,
        bio: true,
        linkUrl: true,
        athenaProviderId: true,
        athenaDepartmentId: true,
        athenaSchedulingName: true,
        locations: true,
        languages: true,
      },
    }),
    prisma.location.findMany({
      where: VISIBLE_LOCATION_WHERE,
      orderBy: { title: "asc" },
      select: {
        id: true,
        slug: true,
        title: true,
        address: true,
        displayAddress: true,
        addressCity: true,
        addressState: true,
        phone: true,
        bookingUrl: true,
        serviceIds: true,
      },
    }),
    prisma.service.findMany({
      where: { isActive: true },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { title: "asc" }],
      select: {
        id: true,
        slug: true,
        title: true,
        category: true,
        description: true,
      },
    }),
  ]);

  const locationAliases = new Map();
  for (const location of locations) addLocationAliases(locationAliases, location);

  const locationByAlias = new Map();
  for (const [alias, values] of locationAliases.entries()) {
    if (values[0]) locationByAlias.set(alias, values[0]);
  }

  const serviceAliases = new Map();
  for (const service of services) addServiceAliases(serviceAliases, service);

  const providerNodes = providers.map((provider) => ({
    ...provider,
    type: "provider",
    url: normalizeInternalPageHref(`/providers/${provider.slug}`),
    locationRecords: resolveProviderLocations(provider, locationByAlias),
    schedulingMapped: Boolean(provider.athenaProviderId || provider.athenaSchedulingName),
  }));

  const graph = {
    providers: providerNodes,
    locations,
    services,
    languages: [...new Set(providerNodes.flatMap((provider) => provider.languages || []))]
      .filter(Boolean)
      .sort((first, second) => first.localeCompare(second, undefined, { sensitivity: "base" })),
    locationAliases,
    serviceAliases,
  };

  graphCache = {
    expiresAt: now + GRAPH_CACHE_TTL_MS,
    value: graph,
  };

  return graph;
}

function rankProviderMatches(graph, criteria, providerResolution = null) {
  const resolverScores = new Map(
    (providerResolution?.scoredEntries || []).map((entry) => [
      entry.provider.slug || entry.provider.name,
      entry.score,
    ])
  );
  const scored = graph.providers
    .map((provider) => {
      const scoredProvider = getProviderScore(provider, criteria);
      const resolverScore = resolverScores.get(provider.slug || provider.name) || 0;
      return {
        provider,
        ...scoredProvider,
        score: Math.max(scoredProvider.score, resolverScore),
      };
    })
    .filter((match) => match.score > 0)
    .sort((first, second) => {
      if (second.score !== first.score) return second.score - first.score;
      return first.provider.name.localeCompare(second.provider.name, undefined, { sensitivity: "base" });
    });

  return scored.slice(0, PROVIDER_RESULT_LIMIT);
}

function rankLocationMatches(graph, criteria) {
  if (criteria.locations.length > 0) return criteria.locations.slice(0, PROVIDER_RESULT_LIMIT);
  if (criteria.services.length === 0) return [];

  const serviceIds = new Set(criteria.services.map((service) => service.id));
  return graph.locations
    .filter((location) => (location.serviceIds || []).some((serviceId) => serviceIds.has(serviceId)))
    .slice(0, PROVIDER_RESULT_LIMIT);
}

function rankServiceMatches(graph, criteria) {
  if (criteria.services.length > 0) return criteria.services.slice(0, PROVIDER_RESULT_LIMIT);
  if (criteria.asksServiceCatalog) {
    return [...graph.services]
      .sort((first, second) => {
        const firstPrimary = isPrimaryCareService(first) ? 0 : 1;
        const secondPrimary = isPrimaryCareService(second) ? 0 : 1;
        if (firstPrimary !== secondPrimary) return firstPrimary - secondPrimary;
        return first.title.localeCompare(second.title, undefined, { sensitivity: "base" });
      })
      .slice(0, SERVICE_CATALOG_LIMIT);
  }
  return [];
}

function hasDomainGraphSignal(criteria, providerMatches, locationMatches, serviceMatches) {
  return Boolean(
    criteria.languages.length > 0 ||
      criteria.locations.length > 0 ||
      criteria.services.length > 0 ||
      criteria.asksServiceCatalog ||
      criteria.unsupportedCriteria.length > 0 ||
      criteria.asksAcceptingNewPatients ||
      providerMatches.length > 0 ||
      locationMatches.length > 0 ||
      serviceMatches.length > 0
  );
}

export async function findFmaDomainGraphContext(query, options = {}) {
  const graph = await buildDomainGraph();
  const criteria = extractCriteria(query, graph);
  const providerResolution = resolveProviderSearch(query, graph.providers, { limit: PROVIDER_RESULT_LIMIT });
  const providerMatches = rankProviderMatches(graph, criteria, providerResolution);
  const locationMatches = rankLocationMatches(graph, criteria);
  const serviceMatches = rankServiceMatches(graph, criteria);
  const hasSignal = hasDomainGraphSignal(criteria, providerMatches, locationMatches, serviceMatches);
  const shouldAnswer = Boolean(
    hasSignal &&
      ((criteria.providerSearch &&
        (providerMatches.length > 0 ||
          criteria.languages.length > 0 ||
          criteria.locations.length > 0 ||
          criteria.services.length > 0 ||
          criteria.unsupportedCriteria.length > 0 ||
          criteria.asksAcceptingNewPatients)) ||
        criteria.asksServiceCatalog)
  );

  return {
    hasSignal,
    shouldAnswer,
    criteria,
    providerResolution,
    providerMatches: providerMatches.slice(0, Number(options.providerLimit) || PROVIDER_RESULT_LIMIT),
    locationMatches,
    serviceMatches,
  };
}

function formatProviderLine(match) {
  const provider = match.provider;
  const locations = (provider.locationRecords || []).map((location) => location.title).filter(Boolean).join(", ");
  const languages = Array.isArray(provider.languages) && provider.languages.length > 0
    ? provider.languages.join(", ")
    : "not listed";
  const booking = provider.linkUrl || GENERAL_BOOK_APPOINTMENT_URL;

  return [
    `Provider: ${provider.name}`,
    provider.title ? `Title: ${provider.title}` : "",
    locations ? `Locations: ${locations}` : "",
    `Languages: ${languages}`,
    `Booking URL: ${booking}`,
    `Online scheduling mapping: ${provider.schedulingMapped ? "configured" : "not explicitly mapped"}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function formatFmaDomainGraphContext(result = {}) {
  if (!result.hasSignal) return "No FMA domain graph records matched this query.";

  const criteria = result.criteria || {};
  const lines = [
    "This section is a deterministic graph of public FMA provider, location, service, and scheduling relationships.",
    "Use these graph facts before vector search when answering provider-finding questions.",
    "Do not infer gender or accepting-new-patient status unless explicitly listed here.",
    criteria.languages?.length ? `Requested languages: ${criteria.languages.join(", ")}` : "",
    criteria.locations?.length
      ? `Requested locations: ${criteria.locations.map((location) => location.title).join(", ")}`
      : "",
    criteria.services?.length
      ? `Requested services: ${criteria.services.map((service) => service.title).join(", ")}`
      : "",
    criteria.asksServiceCatalog ? "Requested service catalog: yes" : "",
    criteria.unsupportedCriteria?.includes("gender")
      ? "Unsupported requested criterion: provider gender is not stored in the FMA provider directory."
      : "",
    criteria.asksAcceptingNewPatients
      ? "Unsupported requested criterion: accepting-new-patient status is not stored as a verified provider field; tell users to confirm through booking or by phone."
      : "",
  ].filter(Boolean);

  const providerText = (result.providerMatches || [])
    .map(formatProviderLine)
    .join("\n\n---\n\n");
  const locationText = (result.locationMatches || [])
    .map((location) => `Location: ${location.title}\nAddress: ${formatAddress(location)}\nURL: ${normalizeLocationPath(location.slug)}`)
    .join("\n\n---\n\n");
  const serviceText = (result.serviceMatches || [])
    .map(
      (service) =>
        `Service: ${service.title}\nCategory: ${service.category}\nURL: ${normalizeServicePath(service.slug)}\nDescription: ${service.description || ""}`
    )
    .join("\n\n---\n\n");

  return [
    lines.join("\n"),
    providerText ? `\nProvider matches:\n${providerText}` : "",
    locationText ? `\nLocation matches:\n${locationText}` : "",
    serviceText ? `\nService matches:\n${serviceText}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function describeCriteria(criteria = {}) {
  const parts = [];
  if (criteria.languages?.length) parts.push(`language: ${criteria.languages.join(", ")}`);
  if (criteria.locations?.length) parts.push(`location: ${criteria.locations.map((location) => location.title).join(", ")}`);
  if (criteria.services?.length) parts.push(`service: ${criteria.services.map((service) => service.title).join(", ")}`);
  return parts.length ? parts.join("; ") : "your search";
}

function formatProviderAnswerItem(match) {
  const provider = match.provider;
  const locations = (provider.locationRecords || []).map((location) => location.title).filter(Boolean).join(", ");
  const languages = Array.isArray(provider.languages) && provider.languages.length > 0
    ? provider.languages.join(", ")
    : "";
  const details = [provider.title, locations ? `locations: ${locations}` : "", languages ? `languages: ${languages}` : ""]
    .filter(Boolean)
    .join("; ");

  return details ? `${provider.name} (${details})` : provider.name;
}

function formatProviderCard(match) {
  const provider = match.provider;
  const locations = (provider.locationRecords || []).map((location) => location.title).filter(Boolean);
  const languages = Array.isArray(provider.languages) ? provider.languages.filter(Boolean) : [];

  return {
    type: "provider",
    title: provider.name,
    subtitle: provider.title || "FMA provider",
    href: normalizeInternalPageHref(`/providers/${provider.slug}`),
    actionLabel: "View profile",
    bookingUrl: provider.linkUrl || GENERAL_BOOK_APPOINTMENT_URL,
    details: [
      locations.length ? `Locations: ${locations.join(", ")}` : "",
      languages.length ? `Languages: ${languages.join(", ")}` : "",
    ].filter(Boolean),
    badges: [
      ...locations.slice(0, 2),
      ...languages.slice(0, 2),
    ].slice(0, 4),
  };
}

function formatLocationCard(location) {
  return {
    type: "location",
    title: location.title,
    subtitle: formatAddress(location) || "FMA location",
    href: normalizeLocationPath(location.slug),
    actionLabel: "View location",
    bookingUrl: location.bookingUrl || GENERAL_BOOK_APPOINTMENT_URL,
    details: [location.phone ? `Phone: ${location.phone}` : ""].filter(Boolean),
    badges: [location.addressCity, location.addressState].filter(Boolean).slice(0, 3),
  };
}

function formatServiceCard(service) {
  return {
    type: "service",
    title: service.title,
    subtitle: service.category || "FMA service",
    href: normalizeServicePath(service.slug),
    actionLabel: "View service",
    details: [service.description || ""].filter(Boolean).slice(0, 1),
    badges: [service.category].filter(Boolean),
  };
}

export function formatFmaDomainGraphCards(result = {}) {
  return [
    ...(result.providerMatches || []).map(formatProviderCard),
    ...(result.locationMatches || []).map(formatLocationCard),
    ...(result.serviceMatches || []).map(formatServiceCard),
  ].slice(0, PROVIDER_RESULT_LIMIT);
}

export function formatFmaDomainGraphSources(result = {}) {
  const sources = [];
  for (const match of result.providerMatches || []) {
    sources.push({
      title: match.provider.name,
      url: normalizeInternalPageHref(`/providers/${match.provider.slug}`),
      type: "provider",
      category: null,
    });
  }
  for (const location of result.locationMatches || []) {
    sources.push({
      title: location.title,
      url: normalizeLocationPath(location.slug),
      type: "location",
      category: null,
    });
  }
  for (const service of result.serviceMatches || []) {
    sources.push({
      title: service.title,
      url: normalizeServicePath(service.slug),
      type: "service",
      category: service.category || null,
    });
  }

  return dedupeBy(sources, (source) => source.url).slice(0, SOURCE_LIMIT);
}

export function buildFmaDomainGraphAnswer(result = {}) {
  if (!result.shouldAnswer) return null;

  const criteria = result.criteria || {};
  const sources = formatFmaDomainGraphSources(result);
  const structuredCards = formatFmaDomainGraphCards(result);
  const providerMatches = result.providerMatches || [];
  const caveats = [];

  if (criteria.unsupportedCriteria?.includes("gender")) {
    caveats.push("I do not have a reliable gender filter in the public provider data.");
  }
  if (criteria.asksAcceptingNewPatients) {
    caveats.push("I do not have a verified accepting-new-patients flag by provider.");
  }

  if (providerMatches.length > 0) {
    const providerList = providerMatches.map(formatProviderAnswerItem).join("; ");
    const confirmation = criteria.asksAcceptingNewPatients
      ? "Please use online booking or call 301-515-2901 to confirm current new-patient availability."
      : "Use the provider profile or booking link to confirm current availability.";
    const prefix = caveats.length > 0 ? `${caveats.join(" ")} Based on the FMA provider directory, ` : "I found ";
    const answer = `${prefix}${providerMatches.length} provider${providerMatches.length === 1 ? "" : "s"} matching ${describeCriteria(
      criteria
    )}: ${providerList}. ${confirmation}`;

    return {
      ok: true,
      code: "directory_match",
      answer,
      sources,
      confidence: 0.9,
      aiConfidence: caveats.length > 0 ? "medium" : "high",
      grounded: true,
      citations: ["FMA provider directory"],
      disclaimer: caveats.length > 0,
      structuredCards,
    };
  }

  if (criteria.asksServiceCatalog && result.serviceMatches?.length > 0) {
    const services = result.serviceMatches
      .map((service) => `${service.title}${service.category ? ` (${service.category})` : ""}`)
      .join("; ");
    return {
      ok: true,
      code: "service_catalog_match",
      answer: `First Medical Associates lists services in the public service catalog including: ${services}. For a specific service or location, use the Services page or call 301-515-2901.`,
      sources,
      confidence: 0.9,
      aiConfidence: "high",
      grounded: true,
      citations: ["FMA service catalog"],
      disclaimer: false,
      structuredCards,
    };
  }

  if (criteria.languages?.length || criteria.locations?.length || criteria.services?.length) {
    const answer = `I did not find a provider matching ${describeCriteria(
      criteria
    )} in the FMA provider directory. Please use the Providers page or call 301-515-2901 so the team can confirm the best match.`;

    return {
      ok: true,
      code: "directory_no_provider_match",
      answer,
      sources:
        sources.length > 0
          ? sources
          : [{ title: "Providers", url: "/providers/", type: "provider", category: null }],
      confidence: 0.7,
      aiConfidence: "medium",
      grounded: true,
      citations: ["FMA provider directory"],
      disclaimer: true,
      structuredCards,
    };
  }

  return null;
}
