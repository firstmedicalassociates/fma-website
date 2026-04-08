import Link from "next/link";
import { prisma } from "../../../lib/prisma";
import PostActions from "./post-actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminPostsPage() {
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

  return (
    <>
      <header className="admin-top">
        <div>
          <h1 className="admin-title">Posts</h1>
          <p className="admin-subtitle">Create and manage your blog content.</p>
        </div>
        <Link className="builder-button" href="/admin/posts/new">
          New post
        </Link>
      </header>

      <section className="admin-card">
        <h3>Drafts & published</h3>
        {posts.length === 0 ? (
          <p>No posts yet.</p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {posts.map((post) => (
              <div
                key={post.id}
                style={{
                  display: "grid",
                  gap: 8,
                  padding: 12,
                  border: "1px solid #e4ddd2",
                  borderRadius: 12,
                  background: "#fff",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <strong>{post.title}</strong>
                    <div className="admin-subtitle">/{post.slug}</div>
                  </div>
                  <span className="admin-pill">
                    {post.status === "PUBLISHED" ? "Published" : "Draft"}
                  </span>
                </div>
                <div className="admin-subtitle">
                  Updated {new Date(post.updatedAt).toLocaleString()}{" "}
                  {post.publishedAt ? `• Published ${new Date(post.publishedAt).toLocaleDateString()}` : ""}
                </div>
                <PostActions id={post.id} />
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
