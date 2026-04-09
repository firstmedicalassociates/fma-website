import Link from "next/link";
import { prisma } from "../../lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [postCount, providerCount] = await Promise.all([
    prisma.blogPost.count(),
    prisma.provider.count(),
  ]);

  return (
    <>
      <header className="admin-top">
        <div>
          <h1 className="admin-title">Dashboard</h1>
          <p className="admin-subtitle">Quick snapshot of your content system.</p>
        </div>
        <span className="admin-pill">Live</span>
      </header>

      <section className="admin-grid">
        <article className="admin-card">
          <h3>Posts</h3>
          <p>{postCount} total posts. Start drafting new stories and publish when ready.</p>
        </article>
        <article className="admin-card">
          <h3>Providers</h3>
          <p>{providerCount} providers in the directory and ready for location pages.</p>
          <Link href="/admin/providers" style={{ display: "inline-block", marginTop: 12 }}>
            Manage providers
          </Link>
        </article>
      </section>
    </>
  );
}
