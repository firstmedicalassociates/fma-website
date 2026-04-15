import Link from "next/link";
import { Clock3, Layers3, MapPin, Users } from "../admin-icons";
import { prisma } from "../../../lib/prisma";
import LocationRowActions from "./location-row-actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export default async function AdminLocationsPage() {
  const [locations, providers] = await Promise.all([
    prisma.location.findMany({
      orderBy: { title: "asc" },
      select: {
        id: true,
        slug: true,
        title: true,
        displayAddress: true,
        phone: true,
        serviceIds: true,
        updatedAt: true,
      },
    }),
    prisma.provider.findMany({
      select: {
        locations: true,
        isActive: true,
      },
    }),
  ]);

  const providerCountByLocation = providers.reduce((counts, provider) => {
    for (const locationSlug of provider.locations || []) {
      counts[locationSlug] = (counts[locationSlug] || 0) + 1;
    }
    return counts;
  }, {});

  const activeProviderCountByLocation = providers.reduce((counts, provider) => {
    if (!provider.isActive) return counts;

    for (const locationSlug of provider.locations || []) {
      counts[locationSlug] = (counts[locationSlug] || 0) + 1;
    }
    return counts;
  }, {});

  return (
    <>
      <header className="admin-top">
        <div>
          <span className="admin-kicker">Location landing pages</span>
          <h1 className="admin-title">Locations</h1>
          <p className="admin-subtitle">
            Each location route powers the landing page layout and the doctors tab for assigned providers.
          </p>
        </div>
        <Link className="builder-button admin-primary-cta" href="/admin/locations/new">
          Add location
        </Link>
      </header>

      <section className="admin-content-grid">
        <div className="admin-panel">
          <div className="admin-panel-header">
            <div>
              <h2>Live routes</h2>
              <p>Provider assignments are based on the exact saved route for each location.</p>
            </div>
            <span className="admin-pill">{locations.length} total</span>
          </div>

          {locations.length === 0 ? (
            <div className="admin-empty">No locations yet. Create your first location landing page.</div>
          ) : (
            <div className="admin-record-list">
              {locations.map((location) => {
                const totalAssignedProviders = providerCountByLocation[location.slug] || 0;
                const activeAssignedProviders = activeProviderCountByLocation[location.slug] || 0;

                return (
                  <article key={location.id} className="admin-record">
                    <div className="admin-record-header">
                      <div className="admin-record-identity">
                        <div className="admin-record-avatar admin-record-avatar-icon">
                          <MapPin />
                        </div>
                        <div>
                          <h3 className="admin-record-title">{location.title}</h3>
                          <p className="admin-record-path">{location.slug}</p>
                          <p className="admin-record-secondary">
                            {location.displayAddress || "Add a display address"}
                          </p>
                        </div>
                      </div>
                      <span className="admin-badge is-positive">{activeAssignedProviders} live providers</span>
                    </div>

                    <div className="admin-record-meta">
                      <span>
                        <Users />
                        {totalAssignedProviders} assigned total
                      </span>
                      <span>
                        <Layers3 />
                        {(location.serviceIds || []).length} assigned services
                      </span>
                      <span>
                        <Clock3 />
                        Updated {dateFormatter.format(location.updatedAt)}
                      </span>
                    </div>

                    <LocationRowActions id={location.id} liveHref={location.slug} />
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <aside className="admin-side-stack">
          <article className="admin-panel admin-side-metric">
            <span className="admin-kicker">Routes</span>
            <p className="admin-side-value">{locations.length}</p>
            <p className="admin-side-copy">Each saved slug becomes a live location landing page.</p>
          </article>

          <article className="admin-panel admin-side-metric">
            <span className="admin-kicker">Assigned providers</span>
            <p className="admin-side-value">
              {providers.filter((provider) => provider.isActive).length}
            </p>
            <p className="admin-side-copy">Active providers populate the doctors tab automatically.</p>
          </article>

          <article className="admin-panel admin-side-metric">
            <span className="admin-kicker">Checklist</span>
            <div className="admin-side-list">
              <p>Save the location route first.</p>
              <p>Assign providers to the same route inside the provider editor.</p>
              <p>Assign shared services to complete the three-tab landing page.</p>
            </div>
          </article>
        </aside>
      </section>
    </>
  );
}
