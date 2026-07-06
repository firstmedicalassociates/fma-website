import { prisma } from "./prisma.js";

const PROVIDER_CONTEXT_QUERY_PATTERN =
  /\b(this|that|the)\s+(provider|doctor|physician|clinician)\b|\b(their|his|her)\s+(availability|available|appointments?|openings?|schedule|times?)\b|\bwhat\s+times?\b|\bwhen\s+can\s+i\s+(see|visit|book|schedule)\b|\b(available|availability|openings?|slots?|appointments?|schedule|booking)\b/i;

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

export function buildContextualSearchQuery(query, pageContext = null) {
  const text = String(query || "").trim();
  if (!text || pageContext?.type !== "provider" || !pageContext.provider?.name) {
    return text;
  }

  if (!PROVIDER_CONTEXT_QUERY_PATTERN.test(text)) {
    return text;
  }

  return `${text} ${pageContext.provider.name}`;
}
