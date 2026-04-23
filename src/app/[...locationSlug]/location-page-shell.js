"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useMemo, useState } from "react";
import SiteFooter from "../components/site-footer";
import SiteHeader from "../components/site-header";
import { PATIENT_PORTAL_URL } from "../lib/config/site";
import { buildDisplayAddress, formatOfficeHoursForDisplay, resolveLocationAddressParts } from "../lib/locations";
import { normalizeServiceIcon } from "../lib/services";
import styles from "./location-page.module.css";

const TABS = [
  { id: "location", label: "01. Location" },
  { id: "doctors", label: "02. Doctors" },
  { id: "services", label: "03. Services" },
];

function formatAddressLines(location) {
  const displayAddress = String(location.displayAddress || "").trim();
  if (displayAddress) {
    return displayAddress.split(/\n+/).filter(Boolean);
  }

  const generatedDisplayAddress = buildDisplayAddress(resolveLocationAddressParts(location));
  if (generatedDisplayAddress) {
    return generatedDisplayAddress.split(/\n+/).filter(Boolean);
  }

  return String(location.address || "")
    .split(/,\s*/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function isTelehealthService(service = {}) {
  const category = String(service.category || "").toLowerCase();
  const title = String(service.title || "").toLowerCase();
  return category.includes("tele") || title.includes("tele");
}

export default function LocationPageShell({ location, providers, serviceGroups }) {
  const [activeTab, setActiveTab] = useState("location");
  const [serviceQuery, setServiceQuery] = useState("");
  const [serviceFilter, setServiceFilter] = useState("all");

  const addressLines = useMemo(() => formatAddressLines(location), [location]);
  const officeHourRows = useMemo(
    () => formatOfficeHoursForDisplay(location.officeHours),
    [location.officeHours]
  );
  const serviceEntries = useMemo(() => {
    return (Array.isArray(serviceGroups) ? serviceGroups : []).flatMap((group) => {
      const category = String(group?.category || "General Care").trim() || "General Care";
      const items = Array.isArray(group?.items) ? group.items : [];
      return items.map((service) => ({
        ...service,
        category,
      }));
    });
  }, [serviceGroups]);
  const serviceFilters = useMemo(() => {
    const seen = new Set();
    const ordered = [];
    for (const service of serviceEntries) {
      const category = String(service.category || "").trim();
      if (!category) continue;
      const normalized = category.toLowerCase();
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      ordered.push(category);
    }
    return ordered;
  }, [serviceEntries]);
  const filteredServices = useMemo(() => {
    const query = serviceQuery.trim().toLowerCase();
    return serviceEntries.filter((service) => {
      const matchesFilter =
        serviceFilter === "all" ||
        String(service.category || "").toLowerCase() === serviceFilter;

      if (!matchesFilter) return false;
      if (!query) return true;

      return (
        String(service.title || "").toLowerCase().includes(query) ||
        String(service.description || "").toLowerCase().includes(query) ||
        String(service.category || "").toLowerCase().includes(query)
      );
    });
  }, [serviceEntries, serviceFilter, serviceQuery]);
  const publicPhone = location.publicPhone || "";
  const patientPortalUrl = PATIENT_PORTAL_URL;
  const hasPatientPortalLink = Boolean(patientPortalUrl && patientPortalUrl !== "#");

  return (
    <div className={styles.page}>
      <SiteHeader />
      <main className={styles.main}>
        <section className={styles.tabShell}>
          <div className={styles.tabNavWrap}>
            <div className={styles.tabNav} role="tablist" aria-label="Location content tabs">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  className={`${styles.tabButton} ${activeTab === tab.id ? styles.tabButtonActive : ""}`}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {activeTab === "location" ? (
            <section className={styles.locationPanel}>
              <div className={styles.locationCopy}>
                <div className={styles.locationIntro}>
                  <p className={styles.stageLabel}>{location.eyebrow || "Stage 01: Visit Our Hub"}</p>
                  <h1 className={styles.locationTitle}>{location.title}</h1>
                  <p className={styles.locationAccent}>
                    {location.accent || location.intro || "Personalized primary care close to home."}
                  </p>
                </div>

                <div className={styles.infoStack}>
                  <div className={styles.infoCard}>
                    <div className={styles.infoIcon}>01</div>
                    <div>
                      <h2>Clinic Address</h2>
                      <div className={styles.addressBlock}>
                        {addressLines.length > 0 ? (
                          addressLines.map((line) => <p key={line}>{line}</p>)
                        ) : (
                          <p>Address information is currently unavailable.</p>
                        )}
                      </div>
                      {location.directionsUrl ? (
                        <a href={location.directionsUrl} target="_blank" rel="noreferrer">
                          Get Directions
                        </a>
                      ) : null}
                    </div>
                  </div>

                  <div className={styles.infoCard}>
                    <div className={styles.infoIcon}>02</div>
                    <div>
                      <h2>Patient Hours</h2>
                      <div className={styles.hoursList}>
                        {officeHourRows.length > 0 ? (
                          officeHourRows.map((hours) => <p key={hours}>{hours}</p>)
                        ) : (
                          <p>Office hours are currently unavailable.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className={styles.infoCard}>
                  <div className={styles.infoIcon}>03</div>
                  <div>
                    <h2>Resources</h2>
                    <div className={styles.resourceLinks}>
                      {location.bookingUrl ? (
                        <a className={`${styles.resourceLink} ${styles.resourceLinkPrimary}`} href={location.bookingUrl} target="_blank" rel="noreferrer">
                          Book Appointment
                        </a>
                      ) : (
                        <span className={`${styles.resourceLink} ${styles.resourceLinkPrimary} ${styles.resourceLinkDisabled}`}>
                          Book Appointment
                        </span>
                      )}
                      {hasPatientPortalLink ? (
                        <a
                          className={`${styles.resourceLink} ${styles.resourceLinkSecondary}`}
                          href={patientPortalUrl}
                          target={patientPortalUrl.startsWith("http") ? "_blank" : undefined}
                          rel={patientPortalUrl.startsWith("http") ? "noreferrer" : undefined}
                        >
                          Patient Portal
                        </a>
                      ) : (
                        <span className={`${styles.resourceLink} ${styles.resourceLinkSecondary} ${styles.resourceLinkDisabled}`}>
                          Patient Portal
                        </span>
                      )}
                      {location.reviewUrl ? (
                        <a className={`${styles.resourceLink} ${styles.resourceLinkSecondary}`} href={location.reviewUrl} target="_blank" rel="noreferrer">
                          Leave a Review
                        </a>
                      ) : (
                        <span className={`${styles.resourceLink} ${styles.resourceLinkSecondary} ${styles.resourceLinkDisabled}`}>
                          Leave a Review
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.locationMedia}>
                <div className={styles.locationMediaCard}>
                  {location.imageUrl ? (
                    <img
                      className={styles.mediaImage}
                      src={location.imageUrl}
                      alt={location.mapImageAlt}
                    />
                  ) : (
                    <div className={styles.mediaPlaceholder}>Location image is currently unavailable.</div>
                  )}
                </div>
              </div>
            </section>
          ) : null}

          {activeTab === "doctors" ? (
            <section className={styles.doctorsPanel}>
              <div className={styles.panelIntro}>
                <p className={styles.stageLabel}>Stage 02: Our Specialists</p>
                <h2>Providers at {location.title}</h2>
                <p>Meet the providers currently available at this location.</p>
              </div>

              {providers.length === 0 ? (
                <div className={styles.emptyState}>
                  No providers are assigned to this location yet.
                </div>
              ) : (
                <div className={styles.providerGrid}>
                  {providers.map((provider) => (
                    <article key={provider.slug} className={styles.providerCard}>
                      <div className={styles.providerAvatarWrap}>
                        <img
                          className={styles.providerAvatar}
                          src={provider.imageUrl}
                          alt={provider.imageAlt}
                        />
                      </div>
                      <h3>{provider.name}</h3>
                      <p>{provider.title}</p>
                      <div className={styles.providerActions}>
                        <Link href={provider.profileHref}>View Profile</Link>
                        <a
                          href={provider.ctaHref}
                          target={provider.ctaHref.startsWith("http") ? "_blank" : undefined}
                          rel={provider.ctaHref.startsWith("http") ? "noreferrer" : undefined}
                        >
                          {provider.ctaLabel}
                        </a>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              <div className={styles.panelFooter}>
                <button className={styles.inlineTabCta} type="button" onClick={() => setActiveTab("services")}>
                  Next: Explore Services
                </button>
              </div>
            </section>
          ) : null}

          {activeTab === "services" ? (
            <section className={styles.servicesPanel}>
              <div className={styles.servicesHero}>
                <div className={styles.servicesHeroPrimary}>
                  <p className={styles.servicesHeroKicker}>Interactive Portal</p>
                  <h2 className={styles.servicesHeroTitle}>
                    Service Finder
                    <br />
                    Dashboard.
                  </h2>
                </div>
                <div className={styles.servicesHeroSecondary}>
                  <p>
                    Seamlessly navigate our clinical offerings at {location.title}. Use the
                    dashboard below to search, filter, and discover the exact care you need.
                  </p>
                  <div className={styles.servicesHeroLines}>
                    <span />
                    <span />
                  </div>
                </div>
              </div>

              {serviceEntries.length === 0 ? (
                <div className={styles.emptyState}>
                  No services have been added to this location yet.
                </div>
              ) : (
                <>
                  <div className={styles.servicesToolbar}>
                    <div className={styles.servicesSearchWrap}>
                      <span className={`material-symbols-outlined ${styles.servicesSearchIcon}`}>
                        search
                      </span>
                      <input
                        className={styles.servicesSearchInput}
                        type="search"
                        placeholder="Search services (e.g., Diabetes, Telemedicine)"
                        value={serviceQuery}
                        onChange={(event) => setServiceQuery(event.target.value)}
                        aria-label="Search services"
                      />
                    </div>

                    <div className={styles.servicesFilterRow}>
                      <span className={styles.servicesFilterLabel}>Filter By:</span>
                      <button
                        type="button"
                        className={`${styles.servicesFilterPill} ${serviceFilter === "all" ? styles.servicesFilterPillActive : ""}`}
                        onClick={() => setServiceFilter("all")}
                      >
                        All Services
                      </button>
                      {serviceFilters.map((category) => {
                        const value = category.toLowerCase();
                        return (
                          <button
                            key={category}
                            type="button"
                            className={`${styles.servicesFilterPill} ${serviceFilter === value ? styles.servicesFilterPillActive : ""}`}
                            onClick={() => setServiceFilter(value)}
                          >
                            {category}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {filteredServices.length === 0 ? (
                    <div className={styles.emptyState}>
                      No services match your search. Try a different term or filter.
                    </div>
                  ) : (
                    <div className={styles.serviceFinderGrid}>
                      {filteredServices.map((service) => {
                        const telehealth = isTelehealthService(service);
                        return (
                          <article
                            key={`${service.category}-${service.title}`}
                            className={`${styles.serviceFinderCard} ${telehealth ? styles.serviceFinderCardHighlight : ""}`}
                          >
                            <div>
                              <div className={styles.serviceFinderCardHeader}>
                                <span className={`material-symbols-outlined ${styles.serviceFinderIcon}`}>
                                  {normalizeServiceIcon(service.icon)}
                                </span>
                                <p className={styles.serviceFinderCategory}>{service.category}</p>
                              </div>
                              <h3>{service.title}</h3>
                              <p>{service.description}</p>
                            </div>
                            <div className={styles.serviceFinderAction}>
                              {telehealth ? "Launch Visit" : "Learn More"}
                              <span className="material-symbols-outlined">arrow_forward</span>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              <div className={styles.primaryBanner}>
                <div>
                  <p className={styles.stageLabel}>Need immediate clinical assistance?</p>
                  <h2>Connect with the care team at {location.title}.</h2>
                </div>
                <div className={styles.bannerActions}>
                  {location.bookingUrl ? (
                    <a href={location.bookingUrl} target="_blank" rel="noreferrer">
                      Book Your Visit
                    </a>
                  ) : null}
                  {publicPhone ? (
                    <a href={`tel:${publicPhone.replace(/[^\d+]/g, "")}`}>Call {publicPhone}</a>
                  ) : null}
                </div>
              </div>
            </section>
          ) : null}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
