import Link from "next/link";
import { SITE_NAME } from "./lib/config/site";
import { prisma } from "./lib/prisma";

export const runtime = "nodejs";
export const revalidate = 60;

export default async function Home() {
  const [locations, providers, posts, locationAssignments] = await Promise.all([
    prisma.location.findMany({
      orderBy: { title: "asc" },
      take: 3,
      select: {
        id: true,
        slug: true,
        title: true,
        accent: true,
        intro: true,
        displayAddress: true,
        phone: true,
      },
    }),
    prisma.provider.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      take: 4,
      select: {
        id: true,
        slug: true,
        name: true,
        title: true,
      },
    }),
    prisma.blogPost.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      take: 2,
      select: {
        id: true,
        slug: true,
        title: true,
        metaDescription: true,
        excerpt: true,
      },
    }),
    prisma.provider.findMany({
      where: { isActive: true },
      select: {
        locations: true,
      },
    }),
  ]);

  const providerCountByLocation = locationAssignments.reduce((counts, provider) => {
    for (const locationSlug of provider.locations || []) {
      counts[locationSlug] = (counts[locationSlug] || 0) + 1;
    }

    return counts;
  }, {});

  const featuredLocation = locations[0] || null;

  return (
    <div className="home-page">
      <main className="home-shell">
        <section className="home-hero">
          <div className="home-hero-copy">
            <p className="home-kicker">Locations, providers, and care information</p>
            <h1>Modern primary care with location-first navigation.</h1>
            <p className="home-lead">
              {SITE_NAME} brings together location details, provider profiles, and recent health
              resources in one place.
            </p>

            <div className="home-hero-actions">
              <Link className="home-primary-cta" href={featuredLocation?.slug || "/providers"}>
                {featuredLocation ? `Visit ${featuredLocation.title}` : "Explore providers"}
              </Link>
              <Link className="home-secondary-cta" href="/providers">
                Provider directory
              </Link>
            </div>

            <div className="home-stat-grid">
              <article className="home-stat-card">
                <strong>{locations.length}</strong>
                <span>featured locations</span>
              </article>
              <article className="home-stat-card">
                <strong>{providers.length}</strong>
                <span>featured providers</span>
              </article>
              <article className="home-stat-card">
                <strong>{posts.length}</strong>
                <span>recent articles</span>
              </article>
            </div>
          </div>

          <div className="home-hero-panel">
            <div className="home-hero-orb" aria-hidden="true" />
            <article className="home-feature-card">
              <p className="home-card-kicker">Featured location</p>
              <h2>{featuredLocation?.title || "Location information unavailable"}</h2>
              <p>
                {featuredLocation?.accent ||
                  featuredLocation?.intro ||
                  "Location information is currently unavailable."}
              </p>
              <div className="home-feature-meta">
                <div>
                  <span>Address</span>
                  <strong>{featuredLocation?.displayAddress || "No address saved yet"}</strong>
                </div>
                <div>
                  <span>Phone</span>
                  <strong>{featuredLocation?.phone || "No phone saved yet"}</strong>
                </div>
                <div>
                  <span>Assigned providers</span>
                  <strong>
                    {featuredLocation ? providerCountByLocation[featuredLocation.slug] || 0 : 0}
                  </strong>
                </div>
              </div>
              {featuredLocation ? (
                <Link className="home-inline-link" href={featuredLocation.slug}>
                  Open location page
                </Link>
              ) : (
                <span className="home-secondary-cta">Currently unavailable</span>
              )}
            </article>
          </div>
        </section>

        <section className="home-section">
          <div className="home-section-header">
            <div>
              <p className="home-kicker">Locations</p>
              <h2>Location details and office information</h2>
            </div>
            {featuredLocation ? (
              <Link className="home-text-link" href={featuredLocation.slug}>
                View featured location
              </Link>
            ) : null}
          </div>

          {locations.length === 0 ? (
            <div className="home-empty-card">
              Location details are currently unavailable.
            </div>
          ) : (
            <div className="home-location-grid">
              {locations.map((location) => (
                <Link key={location.id} href={location.slug} className="home-location-card">
                  <p className="home-card-kicker">Location page</p>
                  <h3>{location.title}</h3>
                  <p>
                    {location.accent ||
                      location.intro ||
                      "Provider and service details are currently unavailable."}
                  </p>
                  <div className="home-location-meta">
                    <span>{location.displayAddress || "Address pending"}</span>
                    <strong>{providerCountByLocation[location.slug] || 0} providers</strong>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="home-section">
          <div className="home-section-header">
            <div>
              <p className="home-kicker">Providers</p>
              <h2>Providers available across our locations</h2>
            </div>
            <Link className="home-text-link" href="/providers">
              Open directory
            </Link>
          </div>

          {providers.length === 0 ? (
            <div className="home-empty-card">
              Provider information is currently unavailable.
            </div>
          ) : (
            <div className="home-provider-grid">
              {providers.map((provider) => (
                <Link key={provider.id} href={`/providers/${provider.slug}`} className="home-provider-card">
                  <p className="home-card-kicker">Provider profile</p>
                  <h3>{provider.name}</h3>
                  <p>{provider.title}</p>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="home-section">
          <div className="home-section-header">
            <div>
              <p className="home-kicker">Editorial</p>
              <h2>Recent articles</h2>
            </div>
            <Link className="home-text-link" href="/blog">
              Browse blog
            </Link>
          </div>

          {posts.length === 0 ? (
            <div className="home-empty-card">
              Articles are currently unavailable.
            </div>
          ) : (
            <div className="home-post-grid">
              {posts.map((post) => (
                <Link key={post.id} href={`/blog/${post.slug}`} className="home-post-card">
                  <p className="home-card-kicker">Published post</p>
                  <h3>{post.title}</h3>
                  <p>{post.metaDescription || post.excerpt || "Open the article to read more."}</p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
