import Link from "next/link";
import { Clock3, Layers3, MapPin } from "../admin-icons";
import { prisma } from "../../../lib/prisma";
import { SERVICE_SELECT } from "../../../lib/services";
import ServiceActions from "./service-actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function groupServicesByCategory(services) {
  return services.reduce((groups, service) => {
    const category = service.category || "General Care";
    const existingGroup = groups.find((group) => group.category === category);

    if (existingGroup) {
      existingGroup.services.push(service);
      return groups;
    }

    groups.push({
      category,
      services: [service],
    });

    return groups;
  }, []);
}

export default async function AdminServicesPage() {
  const [services, locations] = await Promise.all([
    prisma.service.findMany({
      orderBy: [{ category: "asc" }, { title: "asc" }],
      select: SERVICE_SELECT,
    }),
    prisma.location.findMany({
      orderBy: { title: "asc" },
      select: {
        slug: true,
        title: true,
        serviceIds: true,
      },
    }),
  ]);

  const locationTitlesByServiceId = locations.reduce((assigned, location) => {
    for (const serviceId of location.serviceIds || []) {
      assigned[serviceId] = [...(assigned[serviceId] || []), location.title || location.slug];
    }

    return assigned;
  }, {});
  const groupedServices = groupServicesByCategory(services);
  const activeServices = services.filter((service) => service.isActive).length;
  const assignedServiceCount = services.filter(
    (service) => (locationTitlesByServiceId[service.id] || []).length > 0
  ).length;

  return (
    <>
      <header className="admin-top">
        <div>
          <span className="admin-kicker">Service library</span>
          <h1 className="admin-title">Services</h1>
          <p className="admin-subtitle">
            Manage reusable service cards and assign existing services to each location.
          </p>
        </div>
        <Link className="builder-button admin-primary-cta" href="/admin/services/new">
          Add service
        </Link>
      </header>

      <section className="admin-content-grid">
        <div className="admin-panel">
          <div className="admin-panel-header">
            <div>
              <h2>Shared services</h2>
              <p>Locations can select from this library; service content is edited here.</p>
            </div>
            <span className="admin-pill">{services.length} total</span>
          </div>

          {services.length === 0 ? (
            <div className="admin-empty">
              No services yet. Create shared services before assigning them to locations.
            </div>
          ) : (
            <div className="admin-record-list">
              {groupedServices.map((group) => (
                <section key={group.category} className="admin-location-group">
                  <div className="admin-location-group-trigger" aria-expanded="true">
                    <div className="admin-location-group-identity">
                      <div className="admin-location-group-icon">
                        <Layers3 />
                      </div>
                      <div>
                        <p className="admin-location-group-label">{group.category}</p>
                        <p className="admin-location-group-meta">
                          {group.services.length} service{group.services.length === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="admin-location-group-body">
                    {group.services.map((service) => {
                      const assignedLocationTitles = locationTitlesByServiceId[service.id] || [];

                      return (
                        <article key={service.id} className="admin-record">
                          <div className="admin-record-header">
                            <div className="admin-record-identity">
                              <div className="admin-record-avatar admin-record-avatar-icon">
                                <Layers3 />
                              </div>
                              <div>
                                <h3 className="admin-record-title">{service.title}</h3>
                                <p className="admin-record-path">{service.category}</p>
                                <p className="admin-record-secondary">{service.description}</p>
                              </div>
                            </div>
                            <span
                              className={`admin-badge ${
                                service.isActive ? "is-positive" : "is-neutral"
                              }`}
                            >
                              {service.isActive ? "Visible" : "Hidden"}
                            </span>
                          </div>

                          <div className="admin-record-meta">
                            <span>
                              <MapPin />
                              {assignedLocationTitles.length} location
                              {assignedLocationTitles.length === 1 ? "" : "s"}
                            </span>
                            <span>
                              <Clock3 />
                              Updated {dateFormatter.format(service.updatedAt)}
                            </span>
                          </div>

                          {assignedLocationTitles.length > 0 ? (
                            <div className="location-preview-chip-row">
                              {assignedLocationTitles.map((locationTitle) => (
                                <span className="admin-pill" key={`${service.id}-${locationTitle}`}>
                                  {locationTitle}
                                </span>
                              ))}
                            </div>
                          ) : null}

                          <ServiceActions
                            id={service.id}
                            editHref={`/admin/services/${service.id}`}
                          />
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        <aside className="admin-side-stack">
          <article className="admin-panel admin-side-metric">
            <span className="admin-kicker">Visible</span>
            <p className="admin-side-value">{activeServices}</p>
            <p className="admin-side-copy">
              {services.length - activeServices} services are hidden from public location pages.
            </p>
          </article>

          <article className="admin-panel admin-side-metric">
            <span className="admin-kicker">Assigned</span>
            <p className="admin-side-value">{assignedServiceCount}</p>
            <p className="admin-side-copy">
              Services currently selected by one or more locations.
            </p>
          </article>

          <article className="admin-panel admin-side-metric">
            <span className="admin-kicker">Workflow</span>
            <div className="admin-side-list">
              <p>Create and edit service content here.</p>
              <p>Assign existing services inside each location editor.</p>
              <p>Order is controlled per location, not in the shared service library.</p>
              <p>Hidden services stay editable but are removed from public pages.</p>
            </div>
          </article>
        </aside>
      </section>
    </>
  );
}
