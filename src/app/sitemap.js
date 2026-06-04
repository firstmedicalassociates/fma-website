import { getSiteUrl } from "./lib/config/site";
import { isDatabaseConfigured, prisma } from "./lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function createStaticRoute(siteUrl, pathname, changeFrequency, priority) {
  return {
    url: `${siteUrl}${pathname}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
  };
}

export default async function sitemap() {
  const siteUrl = getSiteUrl();
  const staticRoutes = [
    createStaticRoute(siteUrl, "/", "weekly", 1),
    createStaticRoute(siteUrl, "/locations", "weekly", 0.9),
    createStaticRoute(siteUrl, "/providers", "weekly", 0.8),
    createStaticRoute(siteUrl, "/services", "weekly", 0.8),
    createStaticRoute(siteUrl, "/blog", "weekly", 0.7),
    createStaticRoute(siteUrl, "/about", "monthly", 0.6),
    createStaticRoute(siteUrl, "/about/careers", "monthly", 0.6),
    createStaticRoute(siteUrl, "/about/leadership", "monthly", 0.5),
    createStaticRoute(siteUrl, "/about/mission", "monthly", 0.5),
    createStaticRoute(siteUrl, "/about/partners", "monthly", 0.5),
    createStaticRoute(siteUrl, "/contact", "monthly", 0.6),
    createStaticRoute(siteUrl, "/patient-resources", "monthly", 0.7),
    createStaticRoute(siteUrl, "/patient-resources/education", "monthly", 0.5),
    createStaticRoute(siteUrl, "/patient-resources/faq", "monthly", 0.5),
    createStaticRoute(siteUrl, "/patient-resources/insurance", "monthly", 0.7),
    createStaticRoute(siteUrl, "/patient-resources/patients", "monthly", 0.5),
    createStaticRoute(siteUrl, "/patient-resources/press", "monthly", 0.5),
    createStaticRoute(siteUrl, "/privacy-policy", "yearly", 0.3),
    createStaticRoute(siteUrl, "/hipaa-notice", "yearly", 0.3),
    createStaticRoute(siteUrl, "/accessibility", "yearly", 0.3),
    createStaticRoute(siteUrl, "/terms", "yearly", 0.3),
  ];

  if (!isDatabaseConfigured) {
    return staticRoutes;
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
    console.error("Failed to build the dynamic sitemap entries, returning static routes only.", error);
    return staticRoutes;
  }

  const postRoutes = posts.map((post) => ({
    url: `${siteUrl}/blog/${post.slug}`,
    lastModified: post.updatedAt || post.publishedAt || new Date(),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const providerRoutes = providers.map((provider) => ({
    url: `${siteUrl}/providers/${provider.slug}`,
    lastModified: provider.updatedAt || new Date(),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const locationRoutes = locations.map((location) => ({
    url: `${siteUrl}${location.slug}`,
    lastModified: location.updatedAt || new Date(),
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const serviceRoutes = services.map((service) => ({
    url: `${siteUrl}/service/${service.slug}`,
    lastModified: service.updatedAt || new Date(),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...postRoutes, ...providerRoutes, ...locationRoutes, ...serviceRoutes];
}
