import { prisma } from "./prisma.js";

const PROVIDER_CONTEXT_QUERY_PATTERN =
  /\b(this|that|the)\s+(provider|doctor|physician|clinician)\b|\b(their|his|her)\s+(availability|available|appointments?|openings?|schedule|times?)\b|\bwhat\s+times?\b|\bwhen\s+can\s+i\s+(see|visit|book|schedule)\b|\b(available|availability|openings?|slots?|appointments?|schedule|booking)\b/i;
const FOLLOW_UP_CONTEXT_QUERY_PATTERN =
  /\b(this|that|same|them|their|they|he|she|his|her|provider|doctor|physician|clinician|there|that location|same office)\b|\b(what|how)\s+about\b|\b(next|this)\s+(week|month|available|opening|slot|appointment)\b|\b(any|more)\s+(times?|openings?|slots?|appointments?)\b|\b(earliest|soonest|tomorrow|today)\b/i;
const SESSION_CONTEXT_LIMIT = 3;

function cleanSlug(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export function normalizeAiSearchPageContext(value = null) {
  if (!value || typeof value !== "object") return null;

  const type = String(value.type || "").trim().toLowerCase();
  if (type !== "provider") return null;

  const slug = cleanSlug(value.slug);
  if (!slug) return null;

  return { type: "provider", slug };
}

export async function resolveAiSearchPageContext(value = null) {
  const normalized = normalizeAiSearchPageContext(value);
  if (!normalized) return null;

  const provider = await prisma.provider.findFirst({
    where: {
      slug: normalized.slug,
      isActive: true,
    },
    select: {
      slug: true,
      name: true,
      title: true,
      linkUrl: true,
      athenaProviderId: true,
      athenaDepartmentId: true,
      athenaSchedulingName: true,
    },
  });

  if (!provider) return null;

  return {
    type: "provider",
    provider,
  };
}

export async function resolveAiSearchSessionContext(value = null) {
  if (!value || typeof value !== "object") return null;

  const providerSlugs = Array.isArray(value.providerSlugs)
    ? value.providerSlugs.map(cleanSlug).filter(Boolean).slice(0, SESSION_CONTEXT_LIMIT)
    : [];
  const providerNames = Array.isArray(value.providerNames)
    ? value.providerNames
        .map((name) => String(name || "").trim())
        .filter((name) => name.length >= 2 && name.length <= 120)
        .slice(0, SESSION_CONTEXT_LIMIT)
    : [];

  if (providerSlugs.length === 0 && providerNames.length === 0) return null;

  const providers = await prisma.provider.findMany({
    where: {
      isActive: true,
      OR: [
        ...(providerSlugs.length > 0 ? [{ slug: { in: providerSlugs } }] : []),
        ...providerNames.map((name) => ({ name: { equals: name, mode: "insensitive" } })),
      ],
    },
    select: {
      slug: true,
      name: true,
      title: true,
      linkUrl: true,
      athenaProviderId: true,
      athenaDepartmentId: true,
      athenaSchedulingName: true,
    },
    take: SESSION_CONTEXT_LIMIT,
  });

  if (providers.length === 0) return null;

  return {
    providerNames: providers.map((provider) => provider.name),
    providerSlugs: providers.map((provider) => provider.slug),
    providers,
    lastIntent: String(value.lastIntent || "").slice(0, 80),
    lastAvailabilityStatus: String(value.lastAvailabilityStatus || "").slice(0, 80),
  };
}

function appendProviderContext(text, providers = []) {
  const providerNames = providers.map((provider) => provider.name).filter(Boolean);
  if (providerNames.length === 0) return text;

  return `${text} ${providerNames.slice(0, SESSION_CONTEXT_LIMIT).join(" ")}`;
}

export function buildContextualSearchQuery(query, pageContext = null, sessionContext = null) {
  const text = String(query || "").trim();
  if (!text) {
    return text;
  }

  if (pageContext?.type === "provider" && pageContext.provider?.name && PROVIDER_CONTEXT_QUERY_PATTERN.test(text)) {
    return `${text} ${pageContext.provider.name}`;
  }

  if (sessionContext?.providers?.length && FOLLOW_UP_CONTEXT_QUERY_PATTERN.test(text)) {
    return appendProviderContext(text, sessionContext.providers);
  }

  return text;
}
