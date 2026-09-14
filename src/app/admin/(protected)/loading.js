export default function Loading() {
  return (
    <section className="admin-panel admin-loading" role="status">
      <span className="admin-kicker">Loading</span>
      <div className="admin-skeleton" />
      <div className="admin-skeleton" />
      <p>Loading your dashboard…</p>
    </section>
  );
}
