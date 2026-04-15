"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useMemo, useState } from "react";
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

  return String(location.address || "")
    .split(/,\s*/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export default function LocationPageShell({ location, providers, serviceGroups }) {
  const [activeTab, setActiveTab] = useState("location");

  const addressLines = useMemo(() => formatAddressLines(location), [location]);

  return (
    <div className={styles.page}>
      <header className={styles.siteHeader}>
        <div className={styles.headerInner}>
          <div className={styles.brandBlock}>
            <span className={styles.brandMark}>F</span>
            <div>
              <p className={styles.brandName}>First Medical Associates</p>
              <p className={styles.brandTag}>Primary care locations</p>
            </div>
          </div>

          <nav className={styles.utilityNav} aria-label="Utility navigation">
            <Link href="/providers">Providers</Link>
            <Link href="/blog">Blog</Link>
          </nav>

          <div className={styles.headerActions}>
            {location.phone ? (
              <a className={styles.secondaryCta} href={`tel:${location.phone.replace(/[^\d+]/g, "")}`}>
                Call {location.phone}
              </a>
            ) : null}
            {location.bookingUrl ? (
              <a className={styles.primaryCta} href={location.bookingUrl} target="_blank" rel="noreferrer">
                Book Appointment
              </a>
            ) : null}
          </div>
        </div>
      </header>

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
                        {location.officeHours.length > 0 ? (
                          location.officeHours.map((hours) => <p key={hours}>{hours}</p>)
                        ) : (
                          <p>Office hours are currently unavailable.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className={styles.parkingCard}>
                  <p className={styles.parkingKicker}>Arrival</p>
                  <h3>{location.parkingTitle}</h3>
                  <p>{location.parkingDescription}</p>
                  <button className={styles.inlineTabCta} type="button" onClick={() => setActiveTab("doctors")}>
                    Next: Meet Providers
                  </button>
                </div>
              </div>

              <div className={styles.locationMedia}>
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
              <div className={styles.panelIntro}>
                <p className={styles.stageLabel}>Stage 03: Expert Medical Solutions</p>
                <h2>Services Available at {location.title}</h2>
                <p>Browse the services currently available at this location.</p>
              </div>

              {serviceGroups.length === 0 ? (
                <div className={styles.emptyState}>
                  No services have been added to this location yet.
                </div>
              ) : (
                <div className={styles.serviceGroupStack}>
                  {serviceGroups.map((group) => (
                    <section key={group.category} className={styles.serviceGroup}>
                      <div className={styles.serviceGroupHeader}>
                        <span>{group.category}</span>
                        <div className={styles.serviceDivider} />
                      </div>

                      <div className={styles.serviceGrid}>
                        {group.items.map((service) => (
                          <article key={`${group.category}-${service.title}`} className={styles.serviceCard}>
                            <p className={styles.serviceCategory}>{group.category}</p>
                            <h3>{service.title}</h3>
                            <p>{service.description}</p>
                          </article>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}

              <div className={styles.primaryBanner}>
                <div>
                  <p className={styles.stageLabel}>Ready to schedule?</p>
                  <h2>Visit {location.title}</h2>
                </div>
                <div className={styles.bannerActions}>
                  {location.bookingUrl ? (
                    <a href={location.bookingUrl} target="_blank" rel="noreferrer">
                      Book Your Visit
                    </a>
                  ) : null}
                  {location.phone ? (
                    <a href={`tel:${location.phone.replace(/[^\d+]/g, "")}`}>Call {location.phone}</a>
                  ) : null}
                </div>
              </div>
            </section>
          ) : null}
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <p>{new Date().getFullYear()} First Medical Associates. All rights reserved.</p>
          <div className={styles.footerMeta}>
            <span>HIPAA mindful workflow</span>
            <span>Secure scheduling</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
