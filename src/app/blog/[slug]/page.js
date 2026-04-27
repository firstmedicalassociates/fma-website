import Link from "next/link";
import { notFound } from "next/navigation";
import SiteFooter from "../../components/site-footer";
import SiteHeader from "../../components/site-header";
import { isDatabaseConfigured, prisma } from "../../lib/prisma";
import styles from "../blog.module.css";

export const runtime = "nodejs";
export const revalidate = 60;
export const dynamicParams = true;

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

function formatDate(value) {
  if (!value) return "Recently published";

  try {
    return dateFormatter.format(new Date(value));
  } catch {
    return "Recently published";
  }
}

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

function extractPostBody(contentHtml = "") {
  return String(contentHtml || "")
    .replace(/^<article>/i, "")
    .replace(/<\/article>\s*$/i, "")
    .replace(/^\s*<img\b[^>]*>\s*/i, "")
    .replace(/<header>[\s\S]*?<\/header>\s*/i, "")
    .replace(/\s*<footer>[\s\S]*?<\/footer>\s*$/i, "")
    .replace(/<p class="page-title">[\s\S]*?<\/p>/i, "");
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
        createdAt: true,
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

  const publishedLabel = formatDate(post.publishedAt || post.createdAt);
  const cleanedHtml = extractPostBody(post.contentHtml);

  return (
    <>
      <SiteHeader />
      <main className={styles.page}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <div className={styles.postShell}>
          <Link className={styles.backLink} href="/blog">
            Back to all posts
          </Link>

          <article className={styles.postArticle}>
            <header className={styles.postHeader}>
              <p className={styles.cardMeta}>{publishedLabel}</p>
              <h1 className={styles.postTitle}>{post.title}</h1>
              {post.excerpt ? <p className={styles.postLead}>{post.excerpt}</p> : null}
            </header>

            {post.coverImageUrl ? (
              <div className={styles.postCoverWrap}>
                <img
                  src={post.coverImageUrl}
                  alt={post.coverImageAlt || post.title}
                  className={styles.postCover}
                  loading="eager"
                />
              </div>
            ) : null}

            <div
              className={styles.postContent}
              dangerouslySetInnerHTML={{ __html: cleanedHtml }}
            />
          </article>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
