import Link from "next/link";
import SiteFooter from "../components/site-footer";
import SiteHeader from "../components/site-header";
import { isDatabaseConfigured, prisma } from "../lib/prisma";
import styles from "./blog.module.css";

export const runtime = "nodejs";
export const revalidate = 60;
export const metadata = {
  title: "Blog",
  description: "Articles, updates, and insights from First Medical Associates.",
};

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

function summarizePost(post) {
  return (
    post.excerpt ||
    post.metaDescription ||
    "Read practical guidance and clinical insights from our care team."
  );
}

export default async function BlogIndexPage() {
  let posts = [];

  if (isDatabaseConfigured) {
    try {
      posts = await prisma.blogPost.findMany({
        where: { status: "PUBLISHED" },
        orderBy: { publishedAt: "desc" },
        select: {
          id: true,
          title: true,
          slug: true,
          coverImageUrl: true,
          coverImageAlt: true,
          excerpt: true,
          metaDescription: true,
          publishedAt: true,
        },
      });
    } catch (error) {
      console.error("Failed to load blog posts during render, showing an empty state instead.", error);
    }
  }

  return (
    <>
      <SiteHeader />
      <main className={styles.page}>
        <div className={styles.shell}>
          <section className={styles.hero}>
            <p className={styles.kicker}>Insights</p>
            <h1 className={styles.heroTitle}>Blog &amp; Health Perspectives</h1>
            <p className={styles.heroCopy}>
              Explore updates from our clinicians, patient resources, and practical guidance for
              everyday health decisions.
            </p>
          </section>

          {posts.length === 0 ? (
            <section className={styles.emptyState}>
              <h2>No posts published yet</h2>
              <p>New articles will appear here as soon as they are published.</p>
            </section>
          ) : (
            <section className={styles.grid} aria-label="Blog posts">
              {posts.map((post, index) => (
                <article
                  key={post.id}
                  className={`${styles.postCard} ${index === 0 ? styles.postCardFeatured : ""}`}
                >
                  {post.coverImageUrl ? (
                    <Link className={styles.cardImageWrap} href={`/blog/${post.slug}`}>
                      <img
                        src={post.coverImageUrl}
                        alt={post.coverImageAlt || post.title}
                        className={styles.cardImage}
                        loading={index === 0 ? "eager" : "lazy"}
                      />
                    </Link>
                  ) : null}

                  <div className={styles.cardBody}>
                    <p className={styles.cardMeta}>{formatDate(post.publishedAt)}</p>
                    <h2 className={styles.cardTitle}>
                      <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                    </h2>
                    <p className={styles.cardSummary}>{summarizePost(post)}</p>
                    <Link className={styles.cardLink} href={`/blog/${post.slug}`}>
                      Read article
                    </Link>
                  </div>
                </article>
              ))}
            </section>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
