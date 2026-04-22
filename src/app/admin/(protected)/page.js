import Link from "next/link";
import {
  Activity,
  FileText,
  Layers3,
  MapPin,
  UserPlus,
  Users,
} from "./admin-icons";
import {
  ADMIN_NAV_SECTIONS,
  ADMIN_PRIMARY_LINK_BY_KEY,
} from "../../lib/config/admin-navigation.mjs";
import { prisma } from "../../lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const numberFormatter = new Intl.NumberFormat("en-US");

function formatRelativeTime(date) {
  const now = Date.now();
  const diffInMinutes = Math.max(1, Math.round((now - date.getTime()) / 60000));

  if (diffInMinutes < 60) return `${diffInMinutes} min ago`;

  const diffInHours = Math.round(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours === 1 ? "" : "s"} ago`;

  const diffInDays = Math.round(diffInHours / 24);
  return `${diffInDays} day${diffInDays === 1 ? "" : "s"} ago`;
}

export default async function AdminDashboardPage() {
  const postsAdminLink = ADMIN_PRIMARY_LINK_BY_KEY.posts;
  const locationsAdminLink = ADMIN_PRIMARY_LINK_BY_KEY.locations;
  const providersAdminLink = ADMIN_PRIMARY_LINK_BY_KEY.providers;

  const dashboardShortcutSections = ADMIN_NAV_SECTIONS.map((section) => ({
    ...section,
    links:
      section.id === "overview"
        ? section.links.filter((link) => link.key !== "dashboard")
        : section.links,
  })).filter((section) => section.links.length > 0);

  const [
    totalPosts,
    publishedPosts,
    totalLocations,
    totalProviders,
    activeProviders,
    recentPosts,
    recentLocations,
    recentProviders,
  ] = await Promise.all([
    prisma.blogPost.count(),
    prisma.blogPost.count({ where: { status: "PUBLISHED" } }),
    prisma.location.count(),
    prisma.provider.count(),
    prisma.provider.count({ where: { isActive: true } }),
    prisma.blogPost.findMany({
      orderBy: { updatedAt: "desc" },
      take: 4,
      select: {
        id: true,
        title: true,
        status: true,
        updatedAt: true,
      },
    }),
    prisma.location.findMany({
      orderBy: { updatedAt: "desc" },
      take: 4,
      select: {
        id: true,
        title: true,
        slug: true,
        updatedAt: true,
      },
    }),
    prisma.provider.findMany({
      orderBy: { updatedAt: "desc" },
      take: 4,
      select: {
        id: true,
        name: true,
        title: true,
        isActive: true,
        updatedAt: true,
      },
    }),
  ]);

  const draftPosts = Math.max(totalPosts - publishedPosts, 0);
  const hiddenProviders = Math.max(totalProviders - activeProviders, 0);

  const recentActivity = [
    ...recentPosts.map((post) => ({
      id: `post-${post.id}`,
      title: `Post updated: "${post.title}"`,
      detail: post.status === "PUBLISHED" ? "Published article" : "Draft in progress",
      href: postsAdminLink.href,
      timestamp: post.updatedAt,
      type: "post",
    })),
    ...recentLocations.map((location) => ({
      id: `location-${location.id}`,
      title: `Location updated: ${location.title}`,
      detail: location.slug,
      href: locationsAdminLink.href,
      timestamp: location.updatedAt,
      type: "location",
    })),
    ...recentProviders.map((provider) => ({
      id: `provider-${provider.id}`,
      title: `Provider updated: ${provider.name}`,
      detail: provider.isActive ? provider.title : `${provider.title} • hidden`,
      href: providersAdminLink.href,
      timestamp: provider.updatedAt,
      type: "provider",
    })),
  ]
    .sort((left, right) => right.timestamp.getTime() - left.timestamp.getTime())
    .slice(0, 5);

  const statCards = [
    {
      label: "Total Posts",
      value: numberFormatter.format(totalPosts),
      detail:
        totalPosts === 0
          ? "Start drafting stories and landing pages."
          : `${numberFormatter.format(draftPosts)} still in draft review.`,
      trend: `${numberFormatter.format(publishedPosts)} live`,
      Icon: FileText,
    },
    {
      label: "Published Posts",
      value: numberFormatter.format(publishedPosts),
      detail:
        publishedPosts === 0
          ? "Nothing is live yet."
          : "Your live editorial inventory is ready to review.",
      trend: `${numberFormatter.format(draftPosts)} drafts`,
      Icon: Activity,
    },
    {
      label: "Locations",
      value: numberFormatter.format(totalLocations),
      detail:
        totalLocations === 0
          ? "Add locations to launch the new landing pages."
          : "Location pages now power assigned provider tabs.",
      trend: "Landing pages",
      Icon: MapPin,
    },
    {
      label: "Active Providers",
      value: numberFormatter.format(activeProviders),
      detail:
        activeProviders === 0
          ? "Add profiles to populate provider directories."
          : `${numberFormatter.format(hiddenProviders)} profiles currently hidden.`,
      trend: `${numberFormatter.format(totalProviders)} total`,
      Icon: Users,
    },
  ];

  return (
    <>
      <header className="admin-top">
        <div>
          <span className="admin-kicker">Control center</span>
          <h1 className="admin-title">Dashboard</h1>
          <p className="admin-subtitle">Quick snapshot of your content system.</p>
        </div>
        <span className="admin-pill admin-live-pill">Live</span>
      </header>

      <section className="admin-dashboard-grid">
        <div className="admin-stat-stack">
          {statCards.map(({ label, value, detail, trend, Icon }) => (
            <article key={label} className="admin-stat-card">
              <div className="admin-stat-header">
                <div className="admin-icon-chip">
                  <Icon />
                </div>
                <span className="admin-trend">{trend}</span>
              </div>
              <div>
                <h2 className="admin-stat-label">{label}</h2>
                <p className="admin-stat-value">{value}</p>
              </div>
              <p className="admin-stat-copy">{detail}</p>
            </article>
          ))}
        </div>

        <div className="admin-dashboard-column">
          <section className="admin-panel">
            <div className="admin-panel-header">
              <div>
                <h2>Recent Activity</h2>
                <p>Latest changes across publishing, locations, and provider management.</p>
              </div>
              <Link className="admin-filter-button" href={postsAdminLink.href}>
                Open posts
              </Link>
            </div>

            {recentActivity.length === 0 ? (
              <div className="admin-empty">
                No updates yet. New posts, locations, and providers will appear here.
              </div>
            ) : (
              <div className="admin-activity-list">
                {recentActivity.map((item) => (
                  <article key={item.id} className="admin-activity-item">
                    <div className="admin-activity-icon-wrap">
                      {item.type === "post" ? (
                        <FileText />
                      ) : item.type === "location" ? (
                        <MapPin />
                      ) : (
                        <UserPlus />
                      )}
                    </div>
                    <div className="admin-activity-copy">
                      <p className="admin-activity-title">{item.title}</p>
                      <p className="admin-activity-meta">
                        <span>{item.detail}</span>
                        <span>{formatRelativeTime(item.timestamp)}</span>
                      </p>
                    </div>
                    <Link className="admin-activity-link" href={item.href}>
                      Open
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="admin-panel">
            <div className="admin-panel-header">
              <div>
                <h2>Shortcuts</h2>
                <p>Sidebar and dashboard links now share the same route config.</p>
              </div>
            </div>

            <div className="admin-shortcut-stack">
              {dashboardShortcutSections.map((section) => (
                <div key={section.id} className="admin-shortcut-group">
                  <p className="admin-shortcut-label">{section.label}</p>
                  <div className="admin-shortcut-grid">
                    {section.links.map((link) => (
                      <Link key={link.href} className="admin-filter-button" href={link.href}>
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="admin-panel admin-side-metric">
            <span className="admin-kicker">Coverage</span>
            <div className="admin-side-list">
              <p>
                <Layers3 /> Location-driven landing pages are live in the CMS model.
              </p>
              <p>
                <UserPlus /> Providers can be assigned to one or many location tabs.
              </p>
              <p>
                <MapPin /> Every location page can now surface its own provider roster.
              </p>
            </div>
          </section>
        </div>
      </section>
    </>
  );
}
