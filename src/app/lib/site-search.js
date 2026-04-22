import { prisma } from "./prisma";
import { buildLocationTitleMap, formatProviderList, resolveLocationTitles } from "./providers";

function cleanText(value = "") {
  return String(value || "").trim();
}

export function normalizeSearchQuery(value = "") {
  return cleanText(value).replace(/\s+/g, " ").slice(0, 80);
}

function normalizeMatchText(value = "") {
  return cleanText(value).toLowerCase();
}

function scoreField(query, value = "", weights = {}) {
  const normalizedValue = normalizeMatchText(value);
  if (!normalizedValue) return 0;

  if (normalizedValue === query) return weights.exact || 100;
  if (normalizedValue.startsWith(query)) return weights.startsWith || 72;
  if (normalizedValue.split(/\s+/).some((token) => token.startsWith(query))) {
    return weights.word || 54;
  }
  if (normalizedValue.includes(query)) return weights.includes || 36;

  return 0;
}

function buildResultScore(query, primaryText = "", secondaryText = "") {
  return Math.max(
    scoreField(query, primaryText, {
      exact: 120,
      startsWith: 92,
      word: 78,
      includes: 60,
    }),
    scoreField(query, secondaryText, {
      exact: 58,
      startsWith: 44,
      word: 34,
      includes: 24,
    })
  );
}

export async function searchSite(rawQuery, options = {}) {
  const query = normalizeSearchQuery(rawQuery);
  const normalizedQuery = normalizeMatchText(query);
  const perTypeLimit = Math.min(Math.max(Number(options.perTypeLimit) || 5, 1), 12);
  const totalLimit = Math.min(Math.max(Number(options.totalLimit) || 10, 1), 24);

  if (normalizedQuery.length < 2) {
    return {
      query,
      results: [],
    };
  }

  const [providers, locations, posts] = await Promise.all([
    prisma.provider.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { title: { contains: query, mode: "insensitive" } },
          { bio: { contains: query, mode: "insensitive" } },
        ],
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      take: perTypeLimit,
      select: {
        slug: true,
        name: true,
        title: true,
        bio: true,
        locations: true,
      },
    }),
    prisma.location.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { accent: { contains: query, mode: "insensitive" } },
          { intro: { contains: query, mode: "insensitive" } },
          { address: { contains: query, mode: "insensitive" } },
          { displayAddress: { contains: query, mode: "insensitive" } },
          { addressCity: { contains: query, mode: "insensitive" } },
          { addressState: { contains: query, mode: "insensitive" } },
          { postalCode: { contains: query, mode: "insensitive" } },
        ],
      },
      orderBy: { title: "asc" },
      take: perTypeLimit,
      select: {
        slug: true,
        title: true,
        accent: true,
        intro: true,
        address: true,
        displayAddress: true,
        addressCity: true,
        addressState: true,
      },
    }),
    prisma.blogPost.findMany({
      where: {
        status: "PUBLISHED",
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { excerpt: { contains: query, mode: "insensitive" } },
          { metaDescription: { contains: query, mode: "insensitive" } },
        ],
      },
      orderBy: { publishedAt: "desc" },
      take: perTypeLimit,
      select: {
        slug: true,
        title: true,
        excerpt: true,
        metaDescription: true,
      },
    }),
  ]);

  const providerLocationSlugs = [...new Set(providers.flatMap((provider) => provider.locations || []))];
  const providerLocationTitles = providerLocationSlugs.length
    ? await prisma.location.findMany({
        where: {
          slug: {
            in: providerLocationSlugs,
          },
        },
        select: {
          slug: true,
          title: true,
        },
      })
    : [];
  const locationTitleBySlug = buildLocationTitleMap(providerLocationTitles);

  const providerResults = providers.map((provider) => {
    const locationTitles = resolveLocationTitles(provider.locations, locationTitleBySlug);
    const description = [provider.title, formatProviderList(locationTitles)].filter(Boolean).join(" | ");

    return {
      kind: "provider",
      categoryLabel: "Provider",
      title: provider.name,
      href: `/providers/${provider.slug}`,
      description: description || cleanText(provider.bio),
      score:
        buildResultScore(normalizedQuery, provider.name, `${provider.title} ${provider.bio}`) + 300,
    };
  });

  const locationResults = locations.map((location) => {
    const locationMeta = [
      cleanText(location.displayAddress).replace(/\n+/g, ", "),
      cleanText(location.address),
      [cleanText(location.addressCity), cleanText(location.addressState)].filter(Boolean).join(", "),
      cleanText(location.accent),
      cleanText(location.intro),
    ].find(Boolean);

    return {
      kind: "location",
      categoryLabel: "Location",
      title: location.title,
      href: location.slug,
      description: locationMeta || "View this clinic location.",
      score:
        buildResultScore(
          normalizedQuery,
          location.title,
          `${location.accent || ""} ${location.intro || ""} ${location.address || ""}`
        ) + 200,
    };
  });

  const articleResults = posts.map((post) => ({
    kind: "article",
    categoryLabel: "Article",
    title: post.title,
    href: `/blog/${post.slug}`,
    description: cleanText(post.excerpt) || cleanText(post.metaDescription) || "Read the full article.",
    score:
      buildResultScore(normalizedQuery, post.title, `${post.excerpt || ""} ${post.metaDescription || ""}`) +
      100,
  }));

  const results = [...providerResults, ...locationResults, ...articleResults]
    .sort((first, second) => {
      if (second.score !== first.score) {
        return second.score - first.score;
      }

      return first.title.localeCompare(second.title, undefined, { sensitivity: "base" });
    })
    .slice(0, totalLimit)
    .map(({ score, ...result }) => result);

  return {
    query,
    results,
  };
}
