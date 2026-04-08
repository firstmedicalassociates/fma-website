export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function AdminDashboardPage() {
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
          <p>Start drafting new stories and publish when ready.</p>
        </article>
        <article className="admin-card">
          <h3>Audience</h3>
          <p>Connect analytics to track engagement and growth.</p>
        </article>
        <article className="admin-card">
          <h3>Team</h3>
          <p>Invite editors and manage permissions securely.</p>
        </article>
      </section>
    </>
  );
}
