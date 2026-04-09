import { prisma } from "./lib/prisma";

export const runtime = "nodejs";

function getSiteUrl() {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  const normalized = envUrl ? envUrl.trim().replace(/\/+$/, "") : "";
  return normalized || "http://localhost:3000";
}

export default async function sitemap() {
  const siteUrl = getSiteUrl();

  const [posts, providers] = await Promise.all([
    prisma.blogPost.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true, publishedAt: true },
      orderBy: { publishedAt: "desc" },
    }),
    prisma.provider.findMany({
      select: { slug: true, updatedAt: true },
      orderBy: { name: "asc" },
    }),
  ]);

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
  ];

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

  return [...staticRoutes, ...postRoutes, ...providerRoutes];
}
