/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { Clock3, MapPin, UserPlus, Users } from "../admin-icons";
import { prisma } from "../../../lib/prisma";
import {
  buildLocationTitleMap,
  formatProviderList,
  resolveLocationTitles,
} from "../../../lib/providers";
import ProviderActions from "./provider-actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export default async function AdminProvidersPage() {
  const [providers, locations] = await Promise.all([
    prisma.provider.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        title: true,
        imageUrl: true,
        locations: true,
        languages: true,
        sortOrder: true,
        isActive: true,
        updatedAt: true,
      },
    }),
    prisma.location.findMany({
      orderBy: { title: "asc" },
      select: {
        slug: true,
        title: true,
      },
    }),
  ]);

  const locationTitleBySlug = buildLocationTitleMap(locations);

  const locationGroups = locations.map((location) => ({
    ...location,
    providers: providers.filter((provider) => provider.locations.includes(location.slug)),
  }));

  const unassignedProviders = providers.filter(
    (provider) =>
      provider.locations.length === 0 ||
      provider.locations.every((slug) => !locationTitleBySlug[slug])
  );

  const activeProviders = providers.filter((provider) => provider.isActive).length;

  return (
    <>
      <header className="admin-top">
        <div>
          <span className="admin-kicker">Provider directory</span>
          <h1 className="admin-title">Providers</h1>
          <p className="admin-subtitle">
            Manage provider profiles, assign them to location pages, and control public visibility.
          </p>
        </div>
        <Link className="builder-button admin-primary-cta" href="/admin/providers/new">
          Add provider
        </Link>
      </header>

      <section className="admin-content-grid">
        <div className="admin-panel">
          <div className="admin-panel-header">
            <div>
              <h2>Assignments by location</h2>
              <p>Every assigned provider will automatically appear in that location page&apos;s doctors tab.</p>
            </div>
            <span className="admin-pill">{providers.length} total</span>
          </div>

          {providers.length === 0 ? (
            <div className="admin-empty">No providers yet. Add a provider after creating at least one location.</div>
          ) : (
            <div className="admin-record-list">
              {locationGroups.map((group) => (
                <section key={group.slug} className="admin-location-group">
                  <div className="admin-location-group-trigger" aria-expanded="true">
                    <div className="admin-location-group-identity">
                      <div className="admin-location-group-icon">
                        <MapPin />
                      </div>
                      <div>
                        <p className="admin-location-group-label">{group.title}</p>
                        <p className="admin-location-group-meta">
                          {group.slug} • {group.providers.length} assigned
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="admin-location-group-body">
                    {group.providers.length === 0 ? (
                      <div className="admin-empty">
                        No providers are assigned to this location yet.
                      </div>
                    ) : (
                      group.providers.map((provider) => {
                        const locationTitles = resolveLocationTitles(
                          provider.locations,
                          locationTitleBySlug
                        );

                        return (
                          <article key={`${group.slug}-${provider.id}`} className="admin-record">
                            <div className="admin-record-header">
                              <div className="admin-record-identity">
                                <div className="admin-record-avatar">
                                  <img src={provider.imageUrl} alt={provider.name} />
                                </div>
                                <div>
                                  <h3 className="admin-record-title">{provider.name}</h3>
                                  <p className="admin-record-path">/providers/{provider.slug}</p>
                                  <p className="admin-record-secondary">{provider.title}</p>
                                </div>
                              </div>
                              <span
                                className={`admin-badge ${
                                  provider.isActive ? "is-positive" : "is-neutral"
                                }`}
                              >
                                {provider.isActive ? "Visible" : "Hidden"}
                              </span>
                            </div>

                            <div className="admin-record-meta">
                              <span>
                                <MapPin />
                                {formatProviderList(locationTitles) || "No matching locations"}
                              </span>
                              <span>
                                <Users />
                                {formatProviderList(provider.languages) || "No languages"}
                              </span>
                              <span>
                                <Clock3 />
                                Updated {dateFormatter.format(provider.updatedAt)}
                              </span>
                            </div>

                            <div className="admin-record-meta">
                              <span>
                                <UserPlus />
                                Sort order {provider.sortOrder}
                              </span>
                            </div>

                            <ProviderActions
                              id={provider.id}
                              editHref={`/admin/providers/${provider.id}`}
                              liveHref={`/providers/${provider.slug}`}
                            />
                          </article>
                        );
                      })
                    )}
                  </div>
                </section>
              ))}

              {unassignedProviders.length > 0 ? (
                <section className="admin-location-group">
                  <div className="admin-location-group-trigger" aria-expanded="true">
                    <div className="admin-location-group-identity">
                      <div className="admin-location-group-icon">
                        <Users />
                      </div>
                      <div>
                        <p className="admin-location-group-label">Needs reassignment</p>
                        <p className="admin-location-group-meta">
                          Providers linked to missing or removed location paths
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="admin-location-group-body">
                    {unassignedProviders.map((provider) => (
                      <article key={`unassigned-${provider.id}`} className="admin-record">
                        <div className="admin-record-header">
                          <div className="admin-record-identity">
                            <div className="admin-record-avatar">
                              <img src={provider.imageUrl} alt={provider.name} />
                            </div>
                            <div>
                              <h3 className="admin-record-title">{provider.name}</h3>
                              <p className="admin-record-path">/providers/{provider.slug}</p>
                              <p className="admin-record-secondary">{provider.title}</p>
                            </div>
                          </div>
                        </div>
                        <div className="admin-record-meta">
                          <span>
                            <MapPin />
                            {formatProviderList(provider.locations) || "No saved location paths"}
                          </span>
                        </div>
                        <ProviderActions
                          id={provider.id}
                          editHref={`/admin/providers/${provider.id}`}
                          liveHref={`/providers/${provider.slug}`}
                        />
                      </article>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          )}
        </div>

        <aside className="admin-side-stack">
          <article className="admin-panel admin-side-metric">
            <span className="admin-kicker">Visible</span>
            <p className="admin-side-value">{activeProviders}</p>
            <p className="admin-side-copy">
              {providers.length - activeProviders} profiles are currently hidden from the public site.
            </p>
          </article>

          <article className="admin-panel admin-side-metric">
            <span className="admin-kicker">Locations</span>
            <p className="admin-side-value">{locations.length}</p>
            <p className="admin-side-copy">Provider assignments are grouped by these live location pages.</p>
          </article>

          <article className="admin-panel admin-side-metric">
            <span className="admin-kicker">Publishing</span>
            <div className="admin-side-list">
              <p>Providers inherit their location placement from assigned location slugs.</p>
              <p>Hidden providers stay editable in the CMS but are removed from public directories.</p>
              <p>Create locations first so providers can be assigned cleanly.</p>
            </div>
          </article>
        </aside>
      </section>
    </>
  );
}
