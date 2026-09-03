/* eslint-disable react/no-unescaped-entities, @next/next/no-img-element */
import Link from "next/link";
import { ArrowRight, ChevronRight, Clock } from "lucide-react";
import { buildStaticMetadata } from "../../lib/seo";
import { isDatabaseConfigured, prisma } from "../../lib/prisma";
import {
  BLOG_CATEGORY_OPTIONS,
  findBlogCategoryOption,
  getBlogCategoryFromSlug,
  inferBlogCategory,
  normalizeBlogCategory,
} from "../../lib/blog-categories";

export const runtime = "nodejs";
export const revalidate = 60;

export const metadata = buildStaticMetadata({
  title: "Patient Education | First Medical Associates",
  description:
    "Browse patient education guides and wellness resources from First Medical Associates.",
  pathname: "/patient-resources/education",
});

const fallbackImage = "/assets/drs-first-primary-care.jpg";

function stripHtml(value = "") {
  return String(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function summarizePost(post) {
  return (
    post.excerpt ||
    post.metaDescription ||
    "Read practical guidance and clinical insights from the First Medical Associates care team."
  );
}

function estimateReadTime(post) {
  const text = stripHtml(post.contentHtml || `${post.title || ""} ${summarizePost(post)}`);
  const wordCount = text ? text.split(/\s+/).length : 0;
  const minutes = Math.max(3, Math.ceil(wordCount / 225));

  return `${minutes} min read`;
}

function preparePost(post) {
  const storedCategory = findBlogCategoryOption(post.category);
  const category = storedCategory?.value || normalizeBlogCategory(inferBlogCategory(post));

  return {
    ...post,
    category,
    summary: summarizePost(post),
    readTime: estimateReadTime(post),
    href: post.slug ? `/blog/${post.slug}/` : "/blog/",
    coverImageUrl: post.coverImageUrl || fallbackImage,
    coverImageAlt: post.coverImageAlt || post.title || "Patient education article",
  };
}

function getFallbackPost(categoryOption) {
  return preparePost({
    id: `fallback-${categoryOption.slug}`,
    title: `${categoryOption.value} Articles`,
    slug: "",
    category: categoryOption.value,
    excerpt: categoryOption.description,
    metaDescription: categoryOption.description,
    contentHtml: categoryOption.description,
    coverImageUrl: fallbackImage,
    coverImageAlt: `${categoryOption.value} patient education`,
    publishedAt: null,
  });
}

async function loadPublishedPosts() {
  if (!isDatabaseConfigured) return [];

  if (await hasBlogCategoryColumn()) {
    try {
      return await prisma.$queryRaw`
        SELECT
          "id",
          "title",
          "slug",
          "category",
          "excerpt",
          "metaDescription",
          "contentHtml",
          "coverImageUrl",
          "coverImageAlt",
          "publishedAt"
        FROM "BlogPost"
        WHERE "status" = 'PUBLISHED'
        ORDER BY "publishedAt" DESC NULLS LAST, "updatedAt" DESC
      `;
    } catch {
      // Fall through to the legacy Prisma query when the category column is not ready.
    }
  }

  try {
    return await prisma.blogPost.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        metaDescription: true,
        contentHtml: true,
        coverImageUrl: true,
        coverImageAlt: true,
        publishedAt: true,
      },
    });
  } catch (error) {
    console.error("Failed to load blog posts for education page.", error);
    return [];
  }
}

async function hasBlogCategoryColumn() {
  try {
    const rows = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'BlogPost'
          AND column_name = 'category'
      ) AS "exists"
    `;

    return Boolean(rows?.[0]?.exists);
  } catch {
    return false;
  }
}

export default async function EducationPage({ searchParams }) {
  const params = await searchParams;
  const selectedCategory = getBlogCategoryFromSlug(params?.category);
  const posts = (await loadPublishedPosts()).map(preparePost);
  const selectedPosts = posts.filter((post) => post.category === selectedCategory.value);
  const categoryPosts = selectedPosts.length ? selectedPosts : [getFallbackPost(selectedCategory)];
  const featuredPost = categoryPosts[0];
  const relatedPosts = categoryPosts.slice(1, 3);

  return (
    <div className="education-content">
      <style>{`
        .education-content { width: 100%; display: flex; flex-direction: column; gap: 1.5rem; padding-bottom: 4rem; }

        .cat-hero-row {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 1.25rem;
          margin-top: 0;
          margin-bottom: 0.5rem;
        }
        .edu-cat-card {
           background: #f1f5f9;
           padding: 1.5rem;
           border: 1px solid transparent;
           border-radius: 12px;
           text-align: left;
           display: flex;
           flex-direction: column;
           gap: 0.5rem;
           transition: background 0.2s, border-color 0.2s, box-shadow 0.2s, transform 0.2s;
        }
        .edu-cat-card:hover {
          background: #eaf2ff;
          border-color: rgba(0, 28, 85, 0.14);
          transform: translateY(-1px);
        }
        .edu-cat-card.is-active {
          background: #e8f0fe;
          border-color: rgba(0, 22, 137, 0.24);
          box-shadow: 0 14px 30px rgba(0, 22, 137, 0.08);
        }
        .edu-cat-card span { font-size: 0.625rem; font-weight: 800; color: #0b4f96; letter-spacing: 0.08em; }
        .edu-cat-card h5 { font-size: 0.875rem; font-weight: 800; color: #001c55; display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; }

        .grid-main {
          display: grid;
          grid-template-columns: minmax(0, 1.45fr) minmax(360px, 0.95fr);
          gap: 2.5rem;
          align-items: start;
        }

        .main-feat {
           background: white;
           border-radius: 24px;
           display: flex;
           flex-direction: column;
        }
        .feat-img-box {
           height: 400px;
           position: relative;
           border-radius: 20px;
           overflow: hidden;
           border: 1px solid rgba(19, 36, 73, 0.08);
        }
        .feat-img-box img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .feat-badge {
           position: absolute; top: 1.5rem; left: 1.5rem;
           background: #001c55; color: white; padding: 0.4rem 0.75rem;
           border-radius: 6px; font-size: 0.6875rem; font-weight: 800;
           letter-spacing: 0.04em;
        }
        .feat-body { padding: 2.5rem 0; }
        .feat-body h3 { font-size: 2.25rem; font-weight: 800; color: #001c55; line-height: 1.1; margin-bottom: 1.5rem; }
        .feat-body p { color: #475569; font-size: 1rem; line-height: 1.6; margin-bottom: 2rem; }
        .feat-footer { display: flex; flex-wrap: wrap; gap: 2rem; align-items: center; }
        .feat-btn,
        .side-link {
          width: fit-content;
          min-height: 40px;
          padding: 0 15px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.45rem;
          font-size: 0.74rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          cursor: pointer;
          transition:
            transform 180ms ease,
            box-shadow 180ms ease,
            border-color 180ms ease,
            background-color 180ms ease,
            color 180ms ease;
        }
        .feat-btn {
          border: 1px solid transparent;
          background: linear-gradient(135deg, #0d2c72 0%, #1d5fa8 100%);
          color: #ffffff;
          box-shadow: 0 14px 30px rgba(13, 44, 114, 0.2);
        }
        .feat-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 18px 34px rgba(13, 44, 114, 0.24);
        }
        .feat-time { color: #64748b; font-size: 0.875rem; display: flex; align-items: center; gap: 0.5rem; }

        .side-col { display: flex; flex-direction: column; gap: 1.5rem; }
        .related-card,
        .empty-related-card {
           background: white;
           border: 1px solid #dfe8f3;
           border-radius: 24px;
           padding: 2.15rem 2rem;
           box-shadow: 0 16px 34px rgba(10, 24, 69, 0.035);
        }
        .related-card {
           display: grid;
           grid-template-columns: 140px minmax(0, 1fr);
           gap: 1.5rem;
           align-items: center;
           min-height: 276px;
        }
        .related-card > a {
          width: 140px;
          height: 140px;
          display: block;
          align-self: center;
        }
        .related-img {
          width: 140px;
          height: 140px;
          border-radius: 16px;
          object-fit: cover;
          object-position: center;
          display: block;
        }
        .related-body {
          min-width: 0;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }
        .related-meta {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          margin-bottom: 0.9rem;
        }
        .related-meta span {
          font-size: 0.625rem;
          font-weight: 800;
          letter-spacing: 0.02em;
          line-height: 1;
          text-transform: uppercase;
        }
        .related-category { color: #006eff; }
        .related-time { color: #64748b; white-space: nowrap; }
        .related-card h4,
        .empty-related-card h4 {
          font-size: 1.15rem;
          font-weight: 800;
          color: #001c55;
          margin: 0 0 1rem;
          line-height: 1.22;
          letter-spacing: 0;
        }
        .related-card h4 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .related-card p,
        .empty-related-card p {
          font-size: 0.875rem;
          color: #64748b;
          line-height: 1.45;
          margin: 0 0 1.35rem;
        }
        .related-card p {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .side-link {
          border: 1px solid rgba(19, 36, 73, 0.12);
          background: rgba(255, 255, 255, 0.84);
          color: #0d2c72;
          margin-top: auto;
        }
        .side-link:hover {
          transform: translateY(-1px);
          border-color: rgba(13, 44, 114, 0.28);
          box-shadow: 0 12px 26px rgba(13, 44, 114, 0.12);
        }
        .feat-btn:focus-visible,
        .side-link:focus-visible,
        .edu-cat-card:focus-visible {
          outline: 2px solid rgba(13, 44, 114, 0.45);
          outline-offset: 2px;
        }

        .search-full-width {
          background: #001c55; border-radius: 24px; padding: 4rem; margin-top: 2rem;
          color: white; display: flex; flex-direction: column; gap: 1rem; text-align: left;
        }
        .search-full-width h2 { font-size: 2.25rem; font-weight: 800; }
        .search-full-width p { opacity: 0.7; font-size: 1.125rem; max-width: 500px; }
        .search-bar-row {
           display: grid; grid-template-columns: 1fr auto; gap: 1rem; margin-top: 1rem;
           background: rgba(255,255,255,0.1); padding: 0.5rem; border-radius: 16px;
           border: 1px solid rgba(255,255,255,0.2);
        }
        .search-bar-row input { background: transparent; border: none; outline: none; color: white; padding: 0.75rem 1.5rem; font-size: 1.125rem; }
        .search-bar-row input::placeholder { color: rgba(255,255,255,0.4); }
        .search-bar-row button {
          background: white;
          color: #001c55;
          padding: 0.75rem 2.5rem;
          border-radius: 12px;
          font-weight: 800;
          border: 0;
          cursor: pointer;
          font: inherit;
          transition: transform 180ms ease, box-shadow 180ms ease;
        }
        .search-bar-row button:hover { transform: translateY(-1px); box-shadow: 0 12px 24px rgba(2, 14, 49, 0.2); }

        @media (max-width: 1100px) {
          .cat-hero-row { grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); }
          .grid-main { grid-template-columns: 1fr; }
        }

        @media (max-width: 640px) {
          .education-content { padding-bottom: 3rem; }
          .feat-img-box { height: 280px; }
          .feat-body { padding: 2rem 0; }
          .feat-body h3 { font-size: 1.85rem; }
          .related-card { grid-template-columns: 1fr; padding: 1.5rem; }
          .related-card > a { width: 100%; height: 180px; }
          .related-img { width: 100%; height: 180px; }
          .related-meta { align-items: flex-start; flex-direction: column; gap: 0.35rem; }
          .search-full-width { padding: 2rem; }
          .search-full-width h2 { font-size: 1.75rem; }
          .search-bar-row { grid-template-columns: 1fr; }
          .search-bar-row button { width: 100%; }
        }
      `}</style>

      <div className="cat-hero-row" aria-label="Blog categories">
        {BLOG_CATEGORY_OPTIONS.map((category) => (
          <Link
            key={category.slug}
            className={`edu-cat-card ${
              category.value === selectedCategory.value ? "is-active" : ""
            }`}
            href={`/patient-resources/education/?category=${category.slug}`}
          >
            <span>{category.label}</span>
            <h5>
              {category.navTitle}
              <ChevronRight size={14} color="#64748b" />
            </h5>
          </Link>
        ))}
      </div>

      <div className="grid-main">
        <article className="main-feat">
          <Link className="feat-img-box" href={featuredPost.href}>
            <img
              src={featuredPost.coverImageUrl}
              alt={featuredPost.coverImageAlt}
              loading="eager"
            />
            <span className="feat-badge">{selectedCategory.label}</span>
          </Link>
          <div className="feat-body">
            <h3>{featuredPost.title}</h3>
            <p>{featuredPost.summary}</p>
            <div className="feat-footer">
              <Link className="feat-btn" href={featuredPost.href}>
                Read Guide <ArrowRight size={18} />
              </Link>
              <span className="feat-time">
                <Clock size={16} /> {featuredPost.readTime}
              </span>
            </div>
          </div>
        </article>

        <div className="side-col">
          {relatedPosts.length ? (
            relatedPosts.map((post) => (
              <article key={post.id} className="related-card">
                <Link href={post.href}>
                  <img className="related-img" src={post.coverImageUrl} alt={post.coverImageAlt} />
                </Link>
                <div className="related-body">
                  <div className="related-meta">
                    <span className="related-category">{post.category}</span>
                    <span className="related-time">{post.readTime}</span>
                  </div>
                  <h4>{post.title}</h4>
                  <p>{post.summary}</p>
                  <Link className="side-link" href={post.href}>
                    Read Guide <ArrowRight size={16} />
                  </Link>
                </div>
              </article>
            ))
          ) : (
            <article className="empty-related-card">
              <h4>More {selectedCategory.value} articles coming soon</h4>
              <p>
                New posts assigned to this blog category will appear here as soon as they are
                published.
              </p>
              <Link className="side-link" href="/blog/">
                View All Articles <ArrowRight size={16} />
              </Link>
            </article>
          )}
        </div>
      </div>

      <div className="search-full-width">
        <h2>Can't find a specific guide?</h2>
        <p>Search our entire database of peer-reviewed articles and patient education materials.</p>
        <div className="search-bar-row">
          <input type="text" placeholder="e.g. Hypertension, Diet, Back Pain..." />
          <button>Search</button>
        </div>
      </div>
    </div>
  );
}
