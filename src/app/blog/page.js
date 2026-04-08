import Link from "next/link";
import { prisma } from "../lib/prisma";

export const runtime = "nodejs";
export const revalidate = 60;
export const metadata = {
  title: "Blog",
  description: "Articles, updates, and insights from our team.",
};

export default async function BlogIndexPage() {
  const posts = await prisma.blogPost.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      coverImageUrl: true,
      excerpt: true,
      publishedAt: true,
    },
  });

  return (
    <main style={{ maxWidth: 860, margin: "72px auto", padding: "0 16px" }}>
      <h1 style={{ marginBottom: 24 }}>Blog</h1>
      {posts.length === 0 ? (
        <p>No posts yet.</p>
      ) : (
        <div style={{ display: "grid", gap: 20 }}>
          {posts.map((post) => (
            <article
              key={post.id}
              style={{
                border: "1px solid #e4ddd2",
                borderRadius: 16,
                padding: 16,
                background: "#fff",
              }}
            >
              {post.coverImageUrl ? (
                <img
                  src={post.coverImageUrl}
                  alt={post.title}
                  style={{ width: "100%", borderRadius: 12, marginBottom: 12 }}
                />
              ) : null}
              <h2 style={{ margin: "0 0 8px" }}>{post.title}</h2>
              {post.excerpt ? <p>{post.excerpt}</p> : null}
              <Link href={`/blog/${post.slug}`}>Read more</Link>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
