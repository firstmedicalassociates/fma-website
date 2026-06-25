import Link from "next/link";
import { Activity, Clock3, FileText } from "../admin-icons";
import { isBlogCategoryCompatibilityError } from "../../../lib/blog-categories";
import { prisma } from "../../../lib/prisma";
import PostActions from "./post-actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

async function loadPosts() {
  try {
    return await prisma.blogPost.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        category: true,
        slug: true,
        status: true,
        updatedAt: true,
        publishedAt: true,
      },
    });
  } catch (error) {
    if (!isBlogCategoryCompatibilityError(error)) throw error;
  }

  const posts = await prisma.blogPost.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      updatedAt: true,
      publishedAt: true,
    },
  });

  return posts.map((post) => ({ ...post, category: "Uncategorized" }));
}

export default async function AdminPostsPage() {
  const [posts, totalPosts, publishedPosts] = await Promise.all([
    loadPosts(),
    prisma.blogPost.count(),
    prisma.blogPost.count({ where: { status: "PUBLISHED" } }),
  ]);

  const draftPosts = Math.max(totalPosts - publishedPosts, 0);
  return (
    <>
      <header className="admin-top">
        <div>
          <span className="admin-kicker">Editorial library</span>
          <h1 className="admin-title">Posts</h1>
          <p className="admin-subtitle">Create and manage your blog content.</p>
        </div>
        <Link className="builder-button admin-primary-cta" href="/admin/posts/new">
          New post
        </Link>
      </header>

      <section className="admin-content-grid">
        <div className="admin-panel">
          <div className="admin-panel-header">
            <div>
              <h2>Drafts & published</h2>
              <p>Review the latest changes and jump into new content quickly.</p>
            </div>
            <span className="admin-pill">{totalPosts} total</span>
          </div>

          {posts.length === 0 ? (
            <div className="admin-empty">No posts yet. Create your first post to get started.</div>
          ) : (
            <div className="admin-record-list">
              {posts.map((post) => (
                <article key={post.id} className="admin-record">
                  <div className="admin-record-header">
                    <div className="admin-record-identity">
                      <div className="admin-record-avatar admin-record-avatar-icon">
                        <FileText />
                      </div>
                      <div>
                        <h3 className="admin-record-title">{post.title}</h3>
                        <p className="admin-record-path">/{post.slug} - {post.category}</p>
                      </div>
                    </div>
                    <span
                      className={`admin-badge ${
                        post.status === "PUBLISHED" ? "is-positive" : "is-neutral"
                      }`}
                    >
                      {post.status === "PUBLISHED" ? "Published" : "Draft"}
                    </span>
                  </div>

                  <div className="admin-record-meta">
                    <span>
                      <Clock3 />
                      Updated {dateTimeFormatter.format(post.updatedAt)}
                    </span>
                    <span>
                      <Activity />
                      {post.publishedAt
                        ? `Published ${dateFormatter.format(post.publishedAt)}`
                        : "Awaiting publish"}
                    </span>
                  </div>

                  <PostActions id={post.id} slug={post.slug} postStatus={post.status} />
                </article>
              ))}
            </div>
          )}
        </div>

        <aside className="admin-side-stack">
          <article className="admin-panel admin-side-metric">
            <span className="admin-kicker">Collection</span>
            <p className="admin-side-value">{totalPosts}</p>
            <p className="admin-side-copy">Total posts currently stored in the CMS.</p>
          </article>
          <article className="admin-panel admin-side-metric">
            <span className="admin-kicker">Live now</span>
            <p className="admin-side-value">{publishedPosts}</p>
            <p className="admin-side-copy">{draftPosts} posts are still waiting for publish.</p>
          </article>
        </aside>
      </section>
    </>
  );
}
