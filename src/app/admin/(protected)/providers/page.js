import Link from "next/link";
import { prisma } from "../../../lib/prisma";
import { formatProviderList } from "../../../lib/providers";
import ProviderActions from "./provider-actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminProvidersPage() {
  const providers = await prisma.provider.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      title: true,
      linkUrl: true,
      locations: true,
      languages: true,
      updatedAt: true,
    },
  });

  return (
    <>
      <header className="admin-top">
        <div>
          <h1 className="admin-title">Providers</h1>
          <p className="admin-subtitle">Create and manage providers for the public directory.</p>
        </div>
        <Link className="builder-button" href="/admin/providers/new">
          New provider
        </Link>
      </header>

      <section className="admin-card">
        <h3>Directory entries</h3>
        {providers.length === 0 ? (
          <p>No providers yet.</p>
        ) : (
          <div className="provider-admin-list">
            {providers.map((provider) => (
              <div key={provider.id} className="provider-admin-item">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                  <div style={{ display: "grid", gap: 6 }}>
                    <strong>{provider.name}</strong>
                    <div className="admin-subtitle">{provider.title}</div>
                    <div className="admin-subtitle">/providers/{provider.slug}</div>
                  </div>
                  <div className="builder-row" style={{ alignItems: "flex-start" }}>
                    <Link className="builder-button secondary" href={`/admin/providers/${provider.id}/edit`}>
                      Edit
                    </Link>
                    <Link className="builder-button secondary" href={`/providers/${provider.slug}`}>
                      View live
                    </Link>
                  </div>
                </div>
                <div className="admin-subtitle">
                  Locations: {formatProviderList(provider.locations) || "None"}
                </div>
                <div className="admin-subtitle">
                  Languages: {formatProviderList(provider.languages) || "None"}
                </div>
                <div className="admin-subtitle">
                  Button link: {provider.linkUrl || "Not set"}
                </div>
                <div className="admin-subtitle">
                  Updated {new Date(provider.updatedAt).toLocaleString()}
                </div>
                <ProviderActions id={provider.id} />
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
