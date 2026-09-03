import { pageUrl } from "./lib/config/site";
import { VISIBLE_LOCATION_WHERE } from "./lib/locations";
import { isDatabaseConfigured, prisma } from "./lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function createStaticRoute(pathname, changeFrequency, priority) {
  return {
    url: pageUrl(pathname),
    changeFrequency,
    priority,
  };
}

export function dedupeSitemapEntries(entries = []) {
  return [...new Map(entries.map((entry) => [entry.url, entry])).values()];
}

function withLastModified(route, value) {
  return value ? { ...route, lastModified: value } : route;
}

export default async function sitemap() {
  const staticRoutes = [
    createStaticRoute("/", "weekly", 1),
    createStaticRoute("/locations", "weekly", 0.9),
    createStaticRoute("/providers", "weekly", 0.8),
    createStaticRoute("/services", "weekly", 0.8),
    createStaticRoute("/blog", "weekly", 0.7),
    createStaticRoute("/about", "monthly", 0.6),
    createStaticRoute("/about/careers", "monthly", 0.6),
    createStaticRoute("/about/mission", "monthly", 0.5),
    createStaticRoute("/about/partners", "monthly", 0.5),
    createStaticRoute("/contact", "monthly", 0.6),
    createStaticRoute("/patient-resources", "monthly", 0.7),
    createStaticRoute("/patient-resources/education", "monthly", 0.5),
    createStaticRoute("/patient-resources/faq", "monthly", 0.5),
    createStaticRoute("/patient-resources/insurance", "monthly", 0.7),
    createStaticRoute("/patient-resources/patients", "monthly", 0.5),
    createStaticRoute("/patient-resources/press", "monthly", 0.5),
    createStaticRoute("/privacy-policy", "yearly", 0.3),
    createStaticRoute("/hipaa-notice", "yearly", 0.3),
    createStaticRoute("/accessibility", "yearly", 0.3),
    createStaticRoute("/terms", "yearly", 0.3),
  ];

  if (!isDatabaseConfigured) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("DATABASE_URL is required to generate the complete production sitemap.");
    }

    return dedupeSitemapEntries(staticRoutes);
  }

  let posts = [];
  let providers = [];
  let locations = [];
  let services = [];

  try {
    [posts, providers, locations, services] = await Promise.all([
      prisma.blogPost.findMany({
        where: { status: "PUBLISHED" },
        select: { slug: true, updatedAt: true, publishedAt: true },
        orderBy: { publishedAt: "desc" },
      }),
      prisma.provider.findMany({
        where: { isActive: true },
        select: { slug: true, updatedAt: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
      prisma.location.findMany({
        where: VISIBLE_LOCATION_WHERE,
        select: { slug: true, updatedAt: true },
        orderBy: { title: "asc" },
      }),
      prisma.service.findMany({
        where: { isActive: true },
        select: { slug: true, updatedAt: true },
        orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { title: "asc" }],
      }),
    ]);
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      throw error;
    }

    console.error("Failed to build dynamic sitemap entries; using static routes in development.", error);
    return dedupeSitemapEntries(staticRoutes);
  }

  const postRoutes = posts.map((post) =>
    withLastModified(
      {
        url: pageUrl(`/blog/${post.slug}`),
        changeFrequency: "monthly",
        priority: 0.7,
      },
      post.updatedAt || post.publishedAt
    )
  );

  const providerRoutes = providers.map((provider) =>
    withLastModified(
      {
        url: pageUrl(`/providers/${provider.slug}`),
        changeFrequency: "monthly",
        priority: 0.7,
      },
      provider.updatedAt
    )
  );

  const locationRoutes = locations.map((location) =>
    withLastModified(
      {
        url: pageUrl(location.slug),
        changeFrequency: "monthly",
        priority: 0.8,
      },
      location.updatedAt
    )
  );

  const serviceRoutes = services.map((service) =>
    withLastModified(
      {
        url: pageUrl(`/service/${service.slug}`),
        changeFrequency: "monthly",
        priority: 0.7,
      },
      service.updatedAt
    )
  );

  return dedupeSitemapEntries([
    ...staticRoutes,
    ...postRoutes,
    ...providerRoutes,
    ...locationRoutes,
    ...serviceRoutes,
  ]);
}
