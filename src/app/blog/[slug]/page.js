import { notFound } from "next/navigation";
import SiteFooter from "../../components/site-footer";
import SiteHeader from "../../components/site-header";
import { isDatabaseConfigured, prisma } from "../../lib/prisma";

export const runtime = "nodejs";
export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
  if (!isDatabaseConfigured) {
    return [];
  }

  try {
    const posts = await prisma.blogPost.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true },
    });
    return posts.map((post) => ({ slug: post.slug }));
  } catch (error) {
    console.error("Failed to generate blog static params, skipping prerendered blog posts.", error);
    return [];
  }
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  if (!slug || !isDatabaseConfigured) return {};

  let post = null;

  try {
    post = await prisma.blogPost.findUnique({
      where: { slug },
      select: {
        title: true,
        metaTitle: true,
        metaDescription: true,
        excerpt: true,
        coverImageUrl: true,
        coverImageAlt: true,
      },
    });
  } catch (error) {
    console.error("Failed to load blog metadata, falling back to default metadata.", error);
    return {};
  }

  if (!post) return {};

  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}/blog/${slug}`;
  const ogImageUrl = post.coverImageUrl
    ? post.coverImageUrl.startsWith("http")
      ? post.coverImageUrl
      : `${siteUrl}${post.coverImageUrl}`
    : undefined;
  const ogImageAlt = post.coverImageAlt || post.title;
  const title = post.metaTitle || post.title;
  const description = post.metaDescription || post.excerpt || undefined;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: "article",
      url: canonicalUrl,
      title,
      description,
      images: ogImageUrl ? [{ url: ogImageUrl, alt: ogImageAlt }] : undefined,
    },
    twitter: {
      card: post.coverImageUrl ? "summary_large_image" : "summary",
      title,
      description,
      images: ogImageUrl ? [{ url: ogImageUrl, alt: ogImageAlt }] : undefined,
    },
  };
}

function getSiteUrl() {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  const normalized = envUrl ? envUrl.trim().replace(/\/+$/, "") : "";
  return normalized || "http://localhost:3000";
}

export default async function BlogPostPage({ params }) {
  const { slug } = await params;
  if (!slug || !isDatabaseConfigured) {
    notFound();
  }

  let post = null;

  try {
    post = await prisma.blogPost.findUnique({
      where: { slug },
      select: {
        title: true,
        metaTitle: true,
        metaDescription: true,
        excerpt: true,
        contentHtml: true,
        coverImageUrl: true,
        coverImageAlt: true,
        status: true,
        publishedAt: true,
        updatedAt: true,
      },
    });
  } catch (error) {
    console.error("Failed to load a blog post, returning 404 instead.", error);
    notFound();
  }

  if (!post || post.status !== "PUBLISHED") {
    notFound();
  }

  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}/blog/${slug}`;
  const imageUrl = post.coverImageUrl
    ? post.coverImageUrl.startsWith("http")
      ? post.coverImageUrl
      : `${siteUrl}${post.coverImageUrl}`
    : undefined;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.metaTitle || post.title,
    description: post.metaDescription || post.excerpt || undefined,
    image: imageUrl ? [imageUrl] : undefined,
    datePublished: post.publishedAt
      ? new Date(post.publishedAt).toISOString()
      : undefined,
    dateModified: post.updatedAt ? new Date(post.updatedAt).toISOString() : undefined,
    mainEntityOfPage: canonicalUrl,
  };

  const cleanedHtml = String(post.contentHtml || "")
    .replace(/^<article>/i, "")
    .replace(/<\/article>\s*$/i, "")
    .replace(/<p class="page-title">.*?<\/p>/i, "");

  return (
    <>
      <SiteHeader />
      <main style={{ maxWidth: 760, margin: "72px auto", padding: "0 16px" }}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <article dangerouslySetInnerHTML={{ __html: cleanedHtml }} />
      </main>
      <SiteFooter />
    </>
  );
}
