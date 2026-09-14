import Link from "next/link";
import { requireAdminPage } from "../../lib/admin-page-auth";
import { hasPermission } from "../../lib/admin-permissions.mjs";
import {
  ADMIN_NAV_SECTIONS,
  canSeeAdminLink,
} from "../../lib/config/admin-navigation.mjs";
import { prisma } from "../../lib/prisma";
import { VISIBLE_LOCATION_WHERE } from "../../lib/locations";
export const dynamic = "force-dynamic";
export default async function AdminDashboardPage() {
  const user = await requireAdminPage();
  const sections = [
    {
      key: "posts",
      label: "Posts",
      model: prisma.blogPost,
      title: "title",
      where: {},
    },
    {
      key: "locations",
      label: "Locations",
      model: prisma.location,
      title: "title",
      where: VISIBLE_LOCATION_WHERE,
    },
    {
      key: "services",
      label: "Services",
      model: prisma.service,
      title: "title",
      where: {},
    },
    {
      key: "providers",
      label: "Providers",
      model: prisma.provider,
      title: "name",
      where: {},
    },
  ].filter(({ key }) => hasPermission(user, `${key}.view`));
  const cards = await Promise.all(
    sections.map(async ({ key, label, model, title, where }) => {
      const [count, recent] = await Promise.all([
        model.count({ where }),
        model.findMany({
          where,
          take: 4,
          orderBy: { updatedAt: "desc" },
          select: { id: true, [title]: true, updatedAt: true },
        }),
      ]);
      return {
        key,
        label,
        count,
        recent: recent.map((item) => ({ ...item, title: item[title] })),
      };
    }),
  );
  const links = ADMIN_NAV_SECTIONS.flatMap((section) => section.links).filter(
    (link) => link.key !== "dashboard" && canSeeAdminLink(user, link),
  );
  return (
    <>
      <header className="admin-top">
        <div>
          <span className="admin-kicker">Content system</span>
          <h1 className="admin-title">Dashboard</h1>
          <p className="admin-subtitle">
            Manage your content and review recent updates.
          </p>
        </div>
      </header>
      <div className="admin-stat-stack ai-search-stat-grid">
        {cards.map((card) => (
          <article className="admin-stat-card" key={card.key}>
            <h2 className="admin-stat-label">{card.label}</h2>
            <p className="admin-stat-value">{card.count}</p>
            <Link href={`/admin/${card.key}`}>
              View {card.label.toLowerCase()}
            </Link>
          </article>
        ))}
      </div>
      <section className="admin-panel">
        <div className="admin-panel-header">
          <h2>Quick access</h2>
        </div>
        <div className="admin-shortcut-grid">
          {links.map((link) => (
            <Link
              className="builder-button secondary"
              key={link.key}
              href={link.href}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </section>
      {cards.length ? (
        <section className="admin-panel">
          <div className="admin-panel-header">
            <h2>Recent updates</h2>
          </div>
          <div className="admin-record-list">
            {cards
              .flatMap((card) =>
                card.recent.map((item) => ({ ...item, key: card.key })),
              )
              .sort((a, b) => b.updatedAt - a.updatedAt)
              .slice(0, 8)
              .map((item) => (
                <article
                  className="admin-record"
                  key={`${item.key}-${item.id}`}
                >
                  <Link href={`/admin/${item.key}/${item.id}`}>
                    {item.title}
                  </Link>
                  <span className="admin-record-secondary">
                    {item.updatedAt.toLocaleDateString("en-US", {
                      timeZone: "UTC",
                    })}
                  </span>
                </article>
              ))}
          </div>
        </section>
      ) : (
        <p className="admin-notice">
          Your available sections are listed above. A full admin can assign
          additional access.
        </p>
      )}
    </>
  );
}
