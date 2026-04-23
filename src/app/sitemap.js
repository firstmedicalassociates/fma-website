import { isDatabaseConfigured, prisma } from "./lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSiteUrl() {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  const normalized = envUrl ? envUrl.trim().replace(/\/+$/, "") : "";
  return normalized || "http://localhost:3000";
}

export default async function sitemap() {
  const siteUrl = getSiteUrl();
  const staticRoutes = [
    {
      url: `${siteUrl}/`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/providers`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/services`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/location`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  if (!isDatabaseConfigured) {
    return staticRoutes;
  }

  let posts = [];
  let providers = [];
  let locations = [];

  try {
    [posts, providers, locations] = await Promise.all([
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

  return [...staticRoutes, ...postRoutes, ...providerRoutes, ...locationRoutes];
}
